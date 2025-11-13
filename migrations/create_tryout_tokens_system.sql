-- migrations/create_tryout_tokens_system.sql
-- Token system untuk tryout package quota
-- Run di Supabase SQL Editor

-- ========================================
-- 1. CREATE TABLES
-- ========================================

-- Token budget (alokasi dari package yang dibeli)
CREATE TABLE IF NOT EXISTS tryout_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255) NOT NULL UNIQUE,
  total_tokens INT NOT NULL CHECK (total_tokens > 0),
  remaining_tokens INT NOT NULL CHECK (remaining_tokens >= 0),
  used_tokens INT NOT NULL DEFAULT 0 CHECK (used_tokens >= 0),
  package_id VARCHAR(255) NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint: total_tokens = remaining_tokens + used_tokens
ALTER TABLE tryout_tokens
ADD CONSTRAINT check_token_sum 
CHECK (total_tokens = remaining_tokens + used_tokens);

-- Token usage history (audit trail)
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_budget_id UUID NOT NULL REFERENCES tryout_tokens(id) ON DELETE CASCADE,
  tryout_id VARCHAR(255) NOT NULL,
  kategori_id VARCHAR(255),
  session_id UUID,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. CREATE INDEXES
-- ========================================

-- Untuk query cepat user's tokens
CREATE INDEX IF NOT EXISTS idx_tryout_tokens_user_id ON tryout_tokens(user_id);

-- Untuk query active budgets
CREATE INDEX IF NOT EXISTS idx_tryout_tokens_active ON tryout_tokens(user_id) 
WHERE remaining_tokens > 0;

-- Untuk quick lookup by transaction
CREATE INDEX IF NOT EXISTS idx_tryout_tokens_transaction ON tryout_tokens(transaction_id);

-- Untuk token usage queries
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_budget ON token_usage(token_budget_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_tryout ON token_usage(tryout_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_date ON token_usage(used_at DESC);

-- ========================================
-- 3. ENABLE RLS (Row Level Security)
-- ========================================

-- RLS untuk tryout_tokens
ALTER TABLE tryout_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens"
  ON tryout_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert tokens"
  ON tryout_tokens FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only system can update tokens"
  ON tryout_tokens FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

-- RLS untuk token_usage
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON token_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert usage records"
  ON token_usage FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ========================================
-- 4. CREATE USEFUL VIEWS
-- ========================================

-- View untuk token summary per user
CREATE OR REPLACE VIEW user_token_summary AS
SELECT 
  user_id,
  COUNT(*) as total_packages,
  SUM(total_tokens) as total_allocated,
  SUM(remaining_tokens) as total_remaining,
  SUM(used_tokens) as total_used,
  MIN(purchased_at) as first_purchase,
  MAX(updated_at) as last_activity
FROM tryout_tokens
WHERE (expires_at IS NULL OR expires_at > NOW())
GROUP BY user_id;

-- View untuk active tokens only
CREATE OR REPLACE VIEW active_token_budgets AS
SELECT *
FROM tryout_tokens
WHERE remaining_tokens > 0
  AND (expires_at IS NULL OR expires_at > NOW());

-- ========================================
-- 5. CREATE FUNCTIONS
-- ========================================

-- Function: Get total remaining tokens untuk user
CREATE OR REPLACE FUNCTION get_user_remaining_tokens(user_uuid UUID)
RETURNS INT AS $$
BEGIN
  RETURN COALESCE(
    SUM(remaining_tokens), 
    0
  )
  FROM active_token_budgets
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has available token
CREATE OR REPLACE FUNCTION user_has_available_token(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_remaining_tokens(user_uuid) >= 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Consume token (deduct dari remaining)
CREATE OR REPLACE FUNCTION consume_user_token(
  user_uuid UUID,
  tryout_uuid VARCHAR(255),
  kategori_uuid VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE(
  usage_id UUID,
  tokens_remaining INT,
  status VARCHAR
) AS $$
DECLARE
  v_budget_id UUID;
  v_usage_id UUID;
  v_remaining INT;
BEGIN
  -- Get first available budget
  SELECT id INTO v_budget_id
  FROM active_token_budgets
  WHERE user_id = user_uuid
  LIMIT 1;

  IF v_budget_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0, 'NO_BUDGET'::VARCHAR;
    RETURN;
  END IF;

  -- Create usage record
  INSERT INTO token_usage (user_id, token_budget_id, tryout_id, kategori_id)
  VALUES (user_uuid, v_budget_id, tryout_uuid, kategori_uuid)
  RETURNING id INTO v_usage_id;

  -- Deduct from budget
  UPDATE tryout_tokens
  SET 
    remaining_tokens = remaining_tokens - 1,
    used_tokens = used_tokens + 1,
    updated_at = NOW()
  WHERE id = v_budget_id
  RETURNING remaining_tokens INTO v_remaining;

  RETURN QUERY SELECT v_usage_id, v_remaining, 'OK'::VARCHAR;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Refund token
CREATE OR REPLACE FUNCTION refund_token(
  usage_uuid UUID,
  budget_uuid UUID
)
RETURNS TABLE(
  status VARCHAR,
  message VARCHAR,
  tokens_remaining INT
) AS $$
DECLARE
  v_remaining INT;
BEGIN
  -- Update usage status
  UPDATE token_usage
  SET status = 'refunded'
  WHERE id = usage_uuid;

  -- Refund to budget
  UPDATE tryout_tokens
  SET 
    remaining_tokens = remaining_tokens + 1,
    used_tokens = used_tokens - 1,
    updated_at = NOW()
  WHERE id = budget_uuid
  RETURNING remaining_tokens INTO v_remaining;

  RETURN QUERY SELECT 'OK'::VARCHAR, 'Token refunded'::VARCHAR, v_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. SAMPLE DATA (untuk testing)
-- ========================================

-- Uncomment untuk insert test data
/*
-- Insert test user tokens (ganti user_id dengan real UUID)
INSERT INTO tryout_tokens (
  user_id,
  transaction_id,
  total_tokens,
  remaining_tokens,
  used_tokens,
  package_id,
  purchased_at,
  expires_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::UUID, -- Change this UUID
  'TXN_TEST_001',
  20,
  20,
  0,
  'pkg_20',
  NOW(),
  NOW() + INTERVAL '12 months'
);

-- Test consuming token
SELECT * FROM consume_user_token(
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  'tryout_123'
);
*/

-- ========================================
-- 7. GRANTS (untuk aplikasi client)
-- ========================================

-- Grant permissions ke authenticated users
GRANT SELECT ON user_token_summary TO authenticated;
GRANT SELECT ON active_token_budgets TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_remaining_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_available_token TO authenticated;
GRANT EXECUTE ON FUNCTION consume_user_token TO authenticated;
GRANT EXECUTE ON FUNCTION refund_token TO authenticated;
