// src/lib/api.ts

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
// HELPER FUNCTIONS
// ============================================

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || localStorage.getItem('auth_token');
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout = 10000,
  useCache = true
): Promise<T> {
  const cacheKey = `${endpoint}:${JSON.stringify(options)}`;

  // Check cache for GET requests
  if (options.method === 'GET' || !options.method) {
    if (useCache) {
      const cached = cache.get<T>(cacheKey);
      if (cached) return cached;
    }
  }

  const token = await getAuthToken();
  const url = `${API_URL}/tryouts${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // Cache successful GET responses
    if ((options.method === 'GET' || !options.method) && useCache) {
      cache.set(cacheKey, data);
    }

    console.log(`✅ API Success: ${endpoint}`);
    return data;

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error(`⏱️ API Timeout: ${endpoint}`);
      throw new Error('Request timeout. Please try again.');
    }

    console.error(`❌ API Error: ${endpoint}`, error);
    throw error;
  }
}

// Direct Supabase call (bypassing edge functions)
async function apiCallDirect<T>(
  table: string,
  options: any = {},
  timeout = 5000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

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

    clearTimeout(timeoutId);

    if (error) throw error;
    return data as T;

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`❌ Direct DB Error: ${table}`, error);
    throw error;
  }
}

// ============================================
// API OBJECT - ALL ENDPOINTS
// ============================================

export const api = {
  // ==========================================
  // TRYOUT ENDPOINTS (Existing)
  // ==========================================

  getTryouts: async (params?: { kategori?: string; status?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.kategori) queryParams.append('kategori', params.kategori);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return apiCall<{ tryouts: any[] }>(`/available${query ? `?${query}` : ''}`);
  },

  getTryoutDetail: async (tryoutId: string) => {
    return apiCall<{ tryout: any }>(`/${tryoutId}/detail`);
  },

  // ==========================================
  // NEW: SUBTEST ENDPOINTS
  // ==========================================

  getTryoutSubtests: async (tryoutId: string) => {
    return apiCall<{ subtests: any[] }>(`/${tryoutId}/subtests`, {}, 5000);
  },

  getSubtestDetail: async (subtestId: string) => {
    return apiCall<{ subtest: any }>(`/subtests/${subtestId}`, {}, 5000);
  },

  // ==========================================
  // NEW: QUESTION ENDPOINTS
  // ==========================================

  getSubtestQuestions: async (subtestId: string, randomize: boolean = true) => {
    return apiCall<{ questions: any[] }>(
      `/subtests/${subtestId}/questions?randomize=${randomize}`,
      {},
      8000,
      false // Don't cache randomized questions
    );
  },

  getTryoutTotalQuestions: async (tryoutId: string) => {
    return apiCall<{ total: number }>(`/${tryoutId}/total-questions`, {}, 5000);
  },

  // ==========================================
  // NEW: ATTEMPT ENDPOINTS
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
  // NEW: PACKAGE & ACCESS CONTROL
  // ==========================================

  checkUserPackageAccess: async () => {
    return apiCall<{ hasAccess: boolean; packages: any[] }>(
      '/user-packages/check',
      {},
      5000
    );
  },

  getUserPackages: async () => {
    return apiCall<{ packages: any[] }>('/user-packages', {}, 5000);
  },

  // ==========================================
  // SESSION ENDPOINTS (Existing)
  // ==========================================

  startSession: async (tryoutId: string) => {
    return apiCall(`/${tryoutId}/sessions/start`, {
      method: 'POST',
    }, 5000);
  },

  getActiveSession: async (tryoutId: string) => {
    return apiCall(`/${tryoutId}/sessions/active`, {}, 5000);
  },

  endSession: async (tryoutId: string, sessionId: string) => {
    return apiCall(`/${tryoutId}/sessions/${sessionId}/end`, {
      method: 'POST',
    }, 5000);
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
  // DIRECT DB ACCESS (Fallback)
  // ==========================================

  direct: {
    getTryouts: async (filters?: any) => {
      return apiCallDirect<any[]>('tryouts', {
        select: '*',
        order: { column: 'tanggal_ujian', ascending: false },
        ...filters
      });
    },

    getSubtests: async (tryoutId: string) => {
      return apiCallDirect<any[]>('subtest', {
        select: '*',
        eq: { tryout_id: tryoutId },
        order: { column: 'urutan', ascending: true }
      });
    },

    getQuestions: async (subtestId: string) => {
      return apiCallDirect<any[]>('soal', {
        select: '*',
        eq: { subtest_id: subtestId },
        order: { column: 'nomor_soal', ascending: true }
      });
    },

    getUserAttempts: async (userId: string, tryoutId: string) => {
      return apiCallDirect<any[]>('user_tryout_attempts', {
        select: '*',
        eq: { user_id: userId, tryout_id: tryoutId },
        order: { column: 'started_at', ascending: false }
      });
    },

    getAttemptById: async (attemptId: string) => {
      const results = await apiCallDirect<any[]>('user_tryout_attempts', {
        select: '*',
        eq: { id: attemptId },
        limit: 1
      });
      return results[0] || null;
    },
  },
};

export default api;
