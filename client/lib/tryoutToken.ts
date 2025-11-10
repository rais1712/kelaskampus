// ============================================
// TRYOUT TOKENIZATION SYSTEM
// ============================================

export interface TryoutAccessToken {
  token: string;
  tryout_id: string;
  user_id: string;
  issued_at: number;
  expires_at: number;
  session_id: string;
  attempt_number: number;
}

export interface TryoutSession {
  session_id: string;
  tryout_id: string;
  user_id: string;
  started_at: number;
  expires_at: number;
  duration_minutes: number;
  time_left: number;
  is_active: boolean;
  answers: Record<number, string>;
  flagged_questions: Record<number, boolean>;
  current_question: number;
}

export interface SubmissionToken {
  token: string;
  session_id: string;
  tryout_id: string;
  user_id: string;
  answers: Record<number, string>;
  time_spent: number;
  submitted_at: number;
}

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate access token untuk entry gate tryout
 */
export const generateAccessToken = (
  tryoutId: string,
  userId: string,
  attemptNumber: number = 1
): TryoutAccessToken => {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + (60 * 60 * 1000); // Valid for 1 hour
  const sessionId = `sess-${userId}-${tryoutId}-${issuedAt}`;

  const tokenData = {
    tryout_id: tryoutId,
    user_id: userId,
    issued_at: issuedAt,
    expires_at: expiresAt,
    session_id: sessionId,
    attempt_number: attemptNumber,
  };

  // Encode token (Base64 untuk MVP, production pakai JWT)
  const token = btoa(JSON.stringify(tokenData));

  console.log('✅ Access token generated:', { tryoutId, userId, sessionId });

  return {
    token,
    ...tokenData,
  };
};

/**
 * Verify access token validity
 */
export const verifyAccessToken = (token: string): TryoutAccessToken | null => {
  try {
    const decoded = JSON.parse(atob(token));

    // Check required fields
    if (!decoded.tryout_id || !decoded.user_id || !decoded.session_id) {
      console.error('❌ Token missing required fields');
      return null;
    }

    // Check expiration
    if (decoded.expires_at < Date.now()) {
      console.error('❌ Token expired');
      return null;
    }

    console.log('✅ Access token verified');
    return {
      token,
      ...decoded,
    };
  } catch (error) {
    console.error('❌ Invalid token format:', error);
    return null;
  }
};

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Create tryout session
 */
export const createTryoutSession = (
  accessToken: TryoutAccessToken,
  durationMinutes: number
): TryoutSession => {
  const startedAt = Date.now();
  const expiresAt = startedAt + durationMinutes * 60 * 1000;

  const session: TryoutSession = {
    session_id: accessToken.session_id,
    tryout_id: accessToken.tryout_id,
    user_id: accessToken.user_id,
    started_at: startedAt,
    expires_at: expiresAt,
    duration_minutes: durationMinutes,
    time_left: durationMinutes * 60,
    is_active: true,
    answers: {},
    flagged_questions: {},
    current_question: 1,
  };

  // Save to localStorage
  const storageKey = `tryout_session_${accessToken.tryout_id}`;
  localStorage.setItem(storageKey, JSON.stringify(session));

  console.log('✅ Session created:', session);

  return session;
};

/**
 * Get active session
 */
export const getSession = (tryoutId: string): TryoutSession | null => {
  try {
    const storageKey = `tryout_session_${tryoutId}`;
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      console.log('⚠️ No session found');
      return null;
    }

    const session: TryoutSession = JSON.parse(stored);
    return session;
  } catch (error) {
    console.error('❌ Error getting session:', error);
    return null;
  }
};

/**
 * Verify session validity
 */
export const verifySession = (
  sessionId: string,
  tryoutId: string
): TryoutSession | null => {
  try {
    const session = getSession(tryoutId);

    if (!session) {
      console.error('❌ Session not found');
      return null;
    }

    // Check session ID match
    if (session.session_id !== sessionId) {
      console.error('❌ Session ID mismatch');
      return null;
    }

    // Check if expired
    if (session.expires_at < Date.now()) {
      console.error('❌ Session expired');
      return null;
    }

    // Check if active
    if (!session.is_active) {
      console.error('❌ Session not active');
      return null;
    }

    console.log('✅ Session verified');
    return session;
  } catch (error) {
    console.error('❌ Error verifying session:', error);
    return null;
  }
};

/**
 * Update session data
 */
export const updateSession = (
  tryoutId: string,
  updates: Partial<TryoutSession>
): boolean => {
  try {
    const session = getSession(tryoutId);
    if (!session) return false;

    const updatedSession = { ...session, ...updates };
    const storageKey = `tryout_session_${tryoutId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedSession));

    return true;
  } catch (error) {
    console.error('❌ Error updating session:', error);
    return false;
  }
};

/**
 * Invalidate session (after submit)
 */
export const invalidateSession = (tryoutId: string): void => {
  try {
    const session = getSession(tryoutId);
    if (session) {
      session.is_active = false;
      const storageKey = `tryout_session_${tryoutId}`;
      localStorage.setItem(storageKey, JSON.stringify(session));
      console.log('✅ Session invalidated');
    }
  } catch (error) {
    console.error('❌ Error invalidating session:', error);
  }
};

/**
 * Clear session completely
 */
export const clearSession = (tryoutId: string): void => {
  const storageKey = `tryout_session_${tryoutId}`;
  localStorage.removeItem(storageKey);
  localStorage.removeItem(`tryout_access_${tryoutId}`);
  console.log('✅ Session cleared');
};

// ============================================
// SUBMISSION TOKEN
// ============================================

/**
 * Generate submission token
 */
export const generateSubmissionToken = (
  sessionId: string,
  tryoutId: string,
  userId: string,
  answers: Record<number, string>,
  timeSpent: number
): SubmissionToken => {
  const submittedAt = Date.now();

  const submissionData = {
    session_id: sessionId,
    tryout_id: tryoutId,
    user_id: userId,
    answers,
    time_spent: timeSpent,
    submitted_at: submittedAt,
  };

  const token = btoa(JSON.stringify(submissionData));

  console.log('✅ Submission token generated');

  return {
    token,
    ...submissionData,
  };
};

/**
 * Verify submission token
 */
export const verifySubmissionToken = (token: string): SubmissionToken | null => {
  try {
    const decoded = JSON.parse(atob(token));

    // Validate required fields
    if (!decoded.session_id || !decoded.tryout_id || !decoded.answers) {
      console.error('❌ Submission token missing required fields');
      return null;
    }

    console.log('✅ Submission token verified');

    return {
      token,
      ...decoded,
    };
  } catch (error) {
    console.error('❌ Invalid submission token:', error);
    return null;
  }
};

// ============================================
// HELPER UTILITIES
// ============================================

/**
 * Check if user has active session
 */
export const hasActiveSession = (tryoutId: string): boolean => {
  const session = getSession(tryoutId);
  return session !== null && session.is_active && session.expires_at > Date.now();
};

/**
 * Get remaining time in session
 */
export const getSessionTimeLeft = (tryoutId: string): number => {
  const session = getSession(tryoutId);
  if (!session) return 0;

  const timeElapsed = Math.floor((Date.now() - session.started_at) / 1000);
  const totalTime = session.duration_minutes * 60;
  const timeLeft = totalTime - timeElapsed;

  return Math.max(0, timeLeft);
};

/**
 * Format time for display (seconds to MM:SS)
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
