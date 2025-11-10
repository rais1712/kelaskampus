import { supabase } from './supabase';
import { toast } from 'sonner';

export interface UserPackage {
  package_id: string;
  package_name: string;
  tryout_quota: number;
  tryout_used: number;
  purchased_at: string;
  expired_at: string;
  status: 'active' | 'expired';
}

/**
 * Check if user has access to tryout
 */
export const checkTryoutAccess = async (
  tryoutId: string,
  userId: string
): Promise<{ hasAccess: boolean; reason?: string }> => {
  try {
    // ✅ Check if tryout is free
    const { data: tryoutData } = await supabase
      .from('tryouts')
      .select('is_free, required_package')
      .eq('id', tryoutId)
      .single();

    if (tryoutData?.is_free) {
      console.log('✅ Tryout is free');
      return { hasAccess: true };
    }

    // ✅ Check user's active packages
    const userPackages = await getUserActivePackages(userId);

    if (userPackages.length === 0) {
      return {
        hasAccess: false,
        reason: 'Anda belum memiliki paket aktif. Beli paket terlebih dahulu.',
      };
    }

    // ✅ Check if any package has quota
    const hasQuota = userPackages.some(
      (pkg) => pkg.tryout_used < pkg.tryout_quota && pkg.status === 'active'
    );

    if (!hasQuota) {
      return {
        hasAccess: false,
        reason: 'Kuota tryout Anda sudah habis. Beli paket baru untuk melanjutkan.',
      };
    }

    console.log('✅ User has access');
    return { hasAccess: true };
  } catch (error) {
    console.error('Error checking access:', error);
    return {
      hasAccess: false,
      reason: 'Gagal memverifikasi akses. Silakan coba lagi.',
    };
  }
};

/**
 * Get user's active packages
 */
export const getUserActivePackages = async (
  userId: string
): Promise<UserPackage[]> => {
  try {
    // Mock data for development
    const mockPackages = JSON.parse(
      localStorage.getItem('user_active_packages') || '[]'
    );

    if (mockPackages.length > 0) {
      return mockPackages;
    }

    // Real API call (production)
    const { data, error } = await supabase
      .from('user_packages')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('expired_at', new Date().toISOString());

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching packages:', error);
    return [];
  }
};

/**
 * Deduct tryout quota after starting
 */
export const deductTryoutQuota = async (
  userId: string,
  tryoutId: string
): Promise<boolean> => {
  try {
    // Mock: Update localStorage
    const packages = JSON.parse(
      localStorage.getItem('user_active_packages') || '[]'
    );

    const updated = packages.map((pkg: UserPackage) => {
      if (pkg.tryout_used < pkg.tryout_quota && pkg.status === 'active') {
        return { ...pkg, tryout_used: pkg.tryout_used + 1 };
      }
      return pkg;
    });

    localStorage.setItem('user_active_packages', JSON.stringify(updated));

    // Real API (production)
    /*
    const { error } = await supabase.rpc('deduct_tryout_quota', {
      p_user_id: userId,
      p_tryout_id: tryoutId
    });

    if (error) throw error;
    */

    console.log('✅ Quota deducted');
    return true;
  } catch (error) {
    console.error('❌ Error deducting quota:', error);
    return false;
  }
};

/**
 * Check if user already attempted tryout
 */
export const checkExistingAttempt = async (
  userId: string,
  tryoutId: string
): Promise<{ hasAttempt: boolean; attemptNumber: number }> => {
  try {
    // Check localStorage for attempts
    const attempts = JSON.parse(
      localStorage.getItem(`tryout_attempts_${userId}_${tryoutId}`) || '[]'
    );

    return {
      hasAttempt: attempts.length > 0,
      attemptNumber: attempts.length + 1,
    };
  } catch (error) {
    console.error('Error checking attempts:', error);
    return { hasAttempt: false, attemptNumber: 1 };
  }
};

/**
 * Log access attempt (audit trail)
 */
export const logAccessAttempt = (
  userId: string,
  tryoutId: string,
  action: 'access' | 'start' | 'submit' | 'expire',
  success: boolean,
  reason?: string
): void => {
  const log = {
    user_id: userId,
    tryout_id: tryoutId,
    action,
    success,
    reason,
    timestamp: Date.now(),
    user_agent: navigator.userAgent,
  };

  // Save to localStorage (for demo)
  const logs = JSON.parse(localStorage.getItem('tryout_access_logs') || '[]');
  logs.push(log);
  localStorage.setItem('tryout_access_logs', JSON.stringify(logs));

  console.log(`📝 Access log: ${action} - ${success ? 'SUCCESS' : 'FAILED'}`);
};
