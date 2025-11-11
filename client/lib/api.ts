// src/lib/api.ts
// ✅ IMPROVED VERSION - Combined best practices from old + new code

import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 
                import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 
                'http://localhost:54321/functions/v1';

console.log('🔗 API URL:', API_URL);

// ============================================
// CACHE SYSTEM
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class APICache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      console.log(`📦 Cache MISS for key: ${key}`);
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const isExpired = age > this.CACHE_DURATION;

    if (isExpired) {
      console.log(`⏰ Cache EXPIRED for key: ${key} (age: ${age}ms)`);
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ Cache HIT for key: ${key} (age: ${age}ms)`);
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    console.log(`💾 Cache SET for key: ${key}`);
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ Cache INVALIDATED for key: ${key}`);
  }

  clear(): void {
    this.cache.clear();
    console.log('🧹 Cache CLEARED');
  }
}

const cache = new APICache();

// ============================================
// TIMEOUT WRAPPER (from old code)
// ============================================

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
  operation: string = 'Operation'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${operation} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle);
    throw error;
  }
}

// ============================================
// SESSION MANAGEMENT (from old code - IMPROVED)
// ============================================

async function getValidSession() {
  // ✅ Step 1: Try to get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  console.log('🔐 Session status:', session ? 'EXISTS' : 'MISSING');
  
  if (sessionError) {
    console.error('❌ Session error:', sessionError);
    throw new Error('Failed to get session');
  }
  
  // ✅ Step 2: If no session, try to refresh
  if (!session) {
    console.warn('⚠️ No session found, attempting refresh...');
    
    const { data: { session: refreshedSession }, error: refreshError } = 
      await supabase.auth.refreshSession();
    
    if (refreshError || !refreshedSession) {
      console.error('❌ Failed to refresh session:', refreshError);
      throw new Error('Not authenticated. Please login again.');
    }
    
    console.log('✅ Session refreshed successfully');
    return refreshedSession;
  }
  
  // ✅ Step 3: Validate session has access token
  if (!session.access_token) {
    console.error('❌ No access token found');
    throw new Error('Not authenticated');
  }
  
  return session;
}

// ============================================
// API CALL FUNCTIONS (DUAL APPROACH from old code)
// ============================================

/**
 * ✅ API Call for TRYOUT endpoints (/tryouts prefix)
 */
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<T> {
  try {
    // ✅ Get valid session with auto-refresh
    const session = await getValidSession();
    
    // ✅ Add /tryouts prefix for tryout endpoints
    const url = `${API_URL}/tryouts${endpoint}`;
    
    console.log('🔄 API Call:', url);
    console.log('🔑 Token (first 20 chars):', session.access_token.substring(0, 20) + '...');
    
    // ✅ Use timeout wrapper
    const response = await withTimeout(
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          ...options.headers,
        },
      }),
      timeoutMs,
      `API Call ${endpoint}`
    );

    console.log('📊 Response status:', response.status);

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error Response:', data);
      console.error('❌ Status:', response.status);
      throw new Error(data.message || `API call failed (${response.status})`);
    }

    console.log('✅ API Response:', data);
    return data;
    
  } catch (error: any) {
    console.error('❌ API Call Failed:', error);
    
    if (error.message.includes('timeout')) {
      throw new Error('Server lambat. Coba refresh halaman.');
    }
    
    if (error.message === 'Failed to fetch') {
      throw new Error('Tidak dapat terhubung ke server. Pastikan Edge Function sudah di-deploy.');
    }
    
    if (error.message.includes('Not authenticated')) {
      window.location.href = '/signin';
      throw new Error('Sesi berakhir. Silakan login kembali.');
    }
    
    throw error;
  }
}

/**
 * ✅ API Call for NON-TRYOUT endpoints (NO prefix)
 * For: kampus, program-studi, dashboard, user-targets, etc.
 */
async function apiCallDirect<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 5000
): Promise<T> {
  try {
    // ✅ Get valid session with auto-refresh
    const session = await getValidSession();
    
    // ✅ NO /tryouts prefix - direct to endpoint
    const url = `${API_URL}${endpoint}`;
    
    console.log('🔄 API Call (Direct):', url);
    console.log('🔑 Token (first 20 chars):', session.access_token.substring(0, 20) + '...');
    
    // ✅ Use timeout wrapper
    const response = await withTimeout(
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          ...options.headers,
        },
      }),
      timeoutMs,
      `API Call ${endpoint}`
    );

    console.log('📊 Response status:', response.status);

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error Response:', data);
      console.error('❌ Status:', response.status);
      throw new Error(data.message || `API call failed (${response.status})`);
    }

    console.log('✅ API Response:', data);
    return data;
    
  } catch (error: any) {
    console.error('❌ API Call Failed:', error);
    
    if (error.message.includes('timeout')) {
      throw new Error('Server lambat. Coba refresh halaman.');
    }
    
    if (error.message === 'Failed to fetch') {
      throw new Error('Tidak dapat terhubung ke server. Pastikan Edge Function sudah di-deploy.');
    }
    
    if (error.message.includes('Not authenticated')) {
      window.location.href = '/signin';
      throw new Error('Sesi berakhir. Silakan login kembali.');
    }
    
    throw error;
  }
}

// ============================================
// DIRECT SUPABASE ACCESS (Fallback)
// ============================================

async function apiCallSupabase<T>(
  table: string,
  options: any = {},
  timeout = 5000
): Promise<T> {
  try {
    let query = supabase.from(table).select(options.select || '*');

    if (options.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as T;

  } catch (error: any) {
    console.error(`❌ Direct DB Error: ${table}`, error);
    throw error;
  }
}

// ============================================
// API OBJECT - ALL ENDPOINTS
// ============================================

export const api = {
  // ==========================================
  // STUDENT METHODS - TRYOUT ENDPOINTS
  // ==========================================

  getTryouts: async (params?: { kategori?: string; status?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.kategori) queryParams.append('kategori', params.kategori);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return apiCall<{ data: any[] }>(`/available${query ? `?${query}` : ''}`);
  },

  getTryoutDetail: async (tryoutId: string) => {
    return apiCall<{ tryout: any }>(`/${tryoutId}/detail`);
  },

  getUserProgress: async (tryoutId: string) => {
    return apiCall<{ progress: any }>(`/${tryoutId}/progress`);
  },

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  createSession: async (body: {
    tryout_id: string;
    kategori_id?: string;
    target_kampus: string;
    target_jurusan: string;
  }) => {
    return apiCall('/sessions/create', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getSession: async (sessionId: string) => {
    return apiCall(`/sessions/${sessionId}`);
  },

  getQuestions: async (sessionId: string) => {
    return apiCall(`/sessions/${sessionId}/questions`, {}, 8000);
  },

  // ==========================================
  // ANSWER & SUBMISSION
  // ==========================================

  saveAnswer: async (body: {
    session_id: string;
    question_id: string;
    selected_answer: string;
  }) => {
    return apiCall('/answers', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  updateTimer: async (sessionId: string, timeRemaining: number) => {
    return apiCall(`/sessions/${sessionId}/timer`, {
      method: 'PUT',
      body: JSON.stringify({ time_remaining: timeRemaining }),
    });
  },

  saveBookmarks: async (sessionId: string, bookmarkedQuestions: number[]) => {
    return apiCall(`/sessions/${sessionId}/bookmarks`, {
      method: 'PUT',
      body: JSON.stringify({ bookmarked_questions: bookmarkedQuestions }),
    });
  },

  getBookmarks: async (sessionId: string) => {
    return apiCall(`/sessions/${sessionId}/bookmarks`);
  },

  submitTryout: async (sessionId: string) => {
    return apiCall(`/sessions/${sessionId}/submit`, {
      method: 'POST',
    }, 15000); // ✅ Longer timeout for submission
  },

  // ==========================================
  // SUBTEST ENDPOINTS
  // ==========================================

  getTryoutSubtests: async (tryoutId: string) => {
    return apiCall<{ subtests: any[] }>(`/${tryoutId}/subtests`, {}, 5000);
  },

  getSubtestDetail: async (subtestId: string) => {
    return apiCall<{ subtest: any }>(`/subtests/${subtestId}`, {}, 5000);
  },

  getSubtestQuestions: async (subtestId: string, randomize: boolean = true) => {
    return apiCall<{ questions: any[] }>(
      `/subtests/${subtestId}/questions?randomize=${randomize}`,
      {},
      8000
    );
  },

  // ==========================================
  // ATTEMPT MANAGEMENT
  // ==========================================

  createAttempt: async (body: {
    tryout_id: string;
    subtest_id?: string;
    answers?: Record<string, string>;
    session_data?: any;
  }) => {
    cache.invalidate(`user-attempt:${body.tryout_id}`);
    return apiCall<{ attempt: any }>('/attempts', {
      method: 'POST',
      body: JSON.stringify(body),
    }, 8000);
  },

  updateAttempt: async (attemptId: string, body: {
    answers?: Record<string, string>;
    session_data?: any;
    time_spent?: number;
  }) => {
    return apiCall<{ attempt: any }>(`/attempts/${attemptId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, 8000);
  },

  finishAttempt: async (attemptId: string, body: {
    answers: Record<string, string>;
    time_spent: number;
    correct_answers: number;
    wrong_answers: number;
    unanswered: number;
    score: number;
    irt_theta?: number;
  }) => {
    return apiCall<{ attempt: any }>(`/attempts/${attemptId}/finish`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, 10000);
  },

  getAttemptById: async (attemptId: string) => {
    return apiCall<{ attempt: any }>(`/attempts/${attemptId}`, {}, 5000);
  },

  getUserAttempt: async (tryoutId: string) => {
    return apiCall<{ attempt: any | null }>(`/${tryoutId}/user-attempt`, {}, 5000);
  },

  getUserAttemptHistory: async (tryoutId: string) => {
    return apiCall<{ attempts: any[] }>(`/${tryoutId}/attempts`, {}, 5000);
  },

  // ==========================================
  // KAMPUS/PRODI METHODS (NO /tryouts prefix + CACHE)
  // ==========================================

  /**
   * ✅ Get all kampus (dengan cache)
   */
  getKampusList: async () => {
    const cacheKey = 'kampus_list';
    
    // Check cache first
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    console.log("🔄 Fetching kampus from API (not in cache)...");
    const startTime = Date.now();
    
    const result = await apiCallDirect<any>('/kampus', {}, 5000);
    
    // Cache the result
    cache.set(cacheKey, result);
    
    console.log(`✅ Kampus fetched and cached in ${Date.now() - startTime}ms`);
    return result;
  },

  /**
   * ✅ Get program studi by kampus_id (dengan cache per kampus)
   */
  getProgramStudiList: async (kampusId: string) => {
    const cacheKey = `prodi_${kampusId}`;
    
    // Check cache first
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    console.log(`🔄 Fetching prodi for kampus ${kampusId} from API (not in cache)...`);
    const startTime = Date.now();
    
    const result = await apiCallDirect<any>(`/program-studi?kampus_id=${kampusId}`, {}, 5000);
    
    // Cache the result
    cache.set(cacheKey, result);
    
    console.log(`✅ Prodi fetched and cached in ${Date.now() - startTime}ms`);
    return result;
  },

  /**
   * ✅ Get user target for specific tryout (NO CACHE - always fresh)
   */
  getUserTarget: async (tryoutId: string) => {
    return apiCallDirect<any>(`/user-targets/${tryoutId}`, {}, 5000);
  },

  /**
   * ✅ Save or update user target (NO CACHE - always fresh)
   */
  saveUserTarget: async (body: {
    tryout_id: string;
    kampus_name: string;
    prodi_name: string;
  }) => {
    // Clear cache when saving
    cache.invalidate(`user-target:${body.tryout_id}`);
    
    return apiCallDirect<any>('/user-targets', {
      method: 'POST',
      body: JSON.stringify(body),
    }, 5000);
  },

  /**
   * ✅ Get dashboard statistics
   */
  getDashboardStats: async () => {
    return apiCallDirect<any>('/dashboard/stats', {}, 5000);
  },


  /**
   * ✅ Get recent activities
   */
  getRecentActivities: async () => {
    return apiCallDirect<any>('/dashboard/activities', {}, 5000);
  },

  // ==========================================
  // ADMIN METHODS (✅ RESTORED from old code)
  // ==========================================

  /**
   * ✅ Get all tryouts for admin
   */
  adminGetTryouts: async () => {
    return apiCall<{ data: any[] }>('/tryouts', {}, 10000);
  },

  /**
   * ✅ Get tryout detail for admin
   */
  adminGetTryoutDetail: async (tryoutId: string) => {
    return apiCall<{ data: any }>(`/${tryoutId}`, {}, 10000);
  },

  /**
   * ✅ Get all questions for a tryout
   */
  adminGetTryoutQuestions: async (tryoutId: string) => {
    return apiCall<{ data: any[] }>(`/${tryoutId}/questions`, {}, 10000);
  },

  /**
   * ✅ Create new tryout
   */
  adminCreateTryout: async (body: {
    nama_tryout: string;
    tanggal_ujian: string;
    kategori: string;
    durasi_menit: number;
    status: string;
  }) => {
    cache.clear(); // Clear all cache when creating tryout
    return apiCall<{ data: any }>('/tryouts', {
      method: 'POST',
      body: JSON.stringify(body),
    }, 10000);
  },

  /**
   * ✅ Update existing tryout
   */
  adminUpdateTryout: async (tryoutId: string, body: any) => {
    cache.invalidate(`tryout:${tryoutId}`);
    return apiCall<{ data: any }>(`/tryouts?id=${tryoutId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, 10000);
  },

  /**
   * ✅ Delete tryout
   */
  adminDeleteTryout: async (tryoutId: string) => {
    cache.invalidate(`tryout:${tryoutId}`);
    cache.clear(); // Clear all cache
    return apiCall<{ success: boolean }>(`/tryouts?id=${tryoutId}`, {
      method: 'DELETE',
    }, 10000);
  },

  /**
   * ✅ Bulk insert questions
   */
  adminBulkInsertQuestions: async (questions: any[]) => {
    return apiCall<{ data: any }>('/questions', {
      method: 'POST',
      body: JSON.stringify({ questions }),
    }, 15000); // Longer timeout for bulk operations
  },

  /**
   * ✅ Delete all questions for a tryout
   */
  adminDeleteQuestions: async (tryoutId: string) => {
    return apiCall<{ success: boolean }>(`/questions?tryout_id=${tryoutId}`, {
      method: 'DELETE',
    }, 10000);
  },

  /**
   * ✅ Get user attempts for a tryout (admin monitoring)
   */
  adminGetUserAttempts: async (tryoutId: string) => {
    return apiCall<{ attempts: any[] }>(`/${tryoutId}/user-attempts`, {}, 10000);
  },

  /**
   * ✅ Get statistics for a tryout
   */
  adminGetTryoutStatistics: async (tryoutId: string) => {
    return apiCall<{ statistics: any }>(`/${tryoutId}/statistics`, {}, 10000);
  },

  // ==========================================
  // PACKAGE & ACCESS CONTROL
  // ==========================================

  checkUserPackageAccess: async () => {
    return apiCallDirect<{ hasAccess: boolean; packages: any[] }>(
      '/user-packages/check',
      {},
      5000
    );
  },

  getUserPackages: async () => {
    return apiCallDirect<{ packages: any[] }>('/user-packages', {}, 5000);
  },

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  clearCache: () => {
    cache.clear();
  },

  invalidateCache: (key: string) => {
    cache.invalidate(key);
  },

  // ==========================================
  // DIRECT SUPABASE ACCESS (Fallback)
  // ==========================================

  direct: {
    getTryouts: async (filters?: any) => {
      return apiCallSupabase<any[]>('tryouts', {
        select: '*',
        order: { column: 'tanggal_ujian', ascending: false },
        ...filters
      });
    },

    getSubtests: async (tryoutId: string) => {
      return apiCallSupabase<any[]>('subtest', {
        select: '*',
        eq: { tryout_id: tryoutId },
        order: { column: 'urutan', ascending: true }
      });
    },

    getQuestions: async (subtestId: string) => {
      return apiCallSupabase<any[]>('soal', {
        select: '*',
        eq: { subtest_id: subtestId },
        order: { column: 'nomor_soal', ascending: true }
      });
    },

    getUserAttempts: async (userId: string, tryoutId: string) => {
      return apiCallSupabase<any[]>('user_attempts', {
        select: '*',
        eq: { user_id: userId, tryout_id: tryoutId },
        order: { column: 'started_at', ascending: false }
      });
    },

    getAttemptById: async (attemptId: string) => {
      const results = await apiCallSupabase<any[]>('user_attempts', {
        select: '*',
        eq: { id: attemptId },
        limit: 1
      });
      return results[0] || null;
    },
  },
};

export default api;
