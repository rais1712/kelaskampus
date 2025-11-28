// client/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  // Auth endpoints
  signup: async (username: string, email: string, password: string, namaLengkap: string) => {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, nama_lengkap: namaLengkap }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }
    return response.json();
  },

  signin: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signin failed');
    }
    return response.json();
  },

  getMe: async (token: string) => {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to get user');
    return response.json();
  },

  // Tryout endpoints
  getTryouts: async () => {
    const response = await fetch(`${API_URL}/api/tryouts`);
    if (!response.ok) throw new Error('Failed to fetch tryouts');
    return response.json();
  },

  getTryoutById: async (id: string) => {
    const response = await fetch(`${API_URL}/api/tryouts/${id}`);
    if (!response.ok) throw new Error('Failed to fetch tryout');
    return response.json();
  },

  // Session endpoints
  createSession: async (data: {
    tryout_id: string;
    kategori_id?: string;
    target_kampus?: string;
    target_jurusan?: string;
  }) => {
    const response = await fetch(`${API_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  },

  updateSession: async (sessionId: string, data: any) => {
    const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update session');
    return response.json();
  },

  getSession: async (sessionId: string) => {
    const response = await fetch(`${API_URL}/api/sessions/${sessionId}`);
    if (!response.ok) throw new Error('Failed to fetch session');
    return response.json();
  },

  // Questions endpoints
  getQuestions: async (tryoutId: string, kategoriId?: string) => {
    const url = kategoriId 
      ? `${API_URL}/api/questions?tryout_id=${tryoutId}&kategori_id=${kategoriId}`
      : `${API_URL}/api/questions?tryout_id=${tryoutId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch questions');
    return response.json();
  },

  // Kampus endpoints (Google API)
  getKampusList: async () => {
    const response = await fetch(`${API_URL}/api/kampus`);
    if (!response.ok) throw new Error('Failed to fetch kampus list');
    return response.json();
  },

  getProgramStudiList: async (kampusId: string) => {
    const response = await fetch(`${API_URL}/api/kampus/${kampusId}/prodi`);
    if (!response.ok) throw new Error('Failed to fetch program studi');
    return response.json();
  },

  // Target endpoints
  saveUserTarget: async (data: {
    tryout_id: string;
    kampus_name: string;
    prodi_name: string;
  }) => {
    const response = await fetch(`${API_URL}/api/user-target`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to save user target');
    return response.json();
  },

  getUserTarget: async (tryoutId: string) => {
    const response = await fetch(`${API_URL}/api/user-target/${tryoutId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch user target');
    }
    return response.json();
  },

  // ============================================
  // ✅ NEW: IRT & RECOMMENDATIONS API
  // ============================================

  /**
   * Calculate IRT score for a completed session
   */
  calculateIRTScore: async (sessionId: string, userId: string) => {
    const response = await fetch(`${API_URL}/api/irt/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to calculate IRT score');
    }

    return response.json();
  },

  /**
   * Get IRT report for a session
   */
  getIRTReport: async (sessionId: string) => {
    const response = await fetch(`${API_URL}/api/irt/report/${sessionId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('IRT report not found');
      }
      throw new Error('Failed to fetch IRT report');
    }

    return response.json();
  },

  /**
   * Get student abilities
   */
  getStudentAbilities: async (userId: string) => {
    const response = await fetch(`${API_URL}/api/irt/ability/${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch student abilities');
    }

    return response.json();
  },

  /**
   * Test IRT with sample data
   */
  testIRT: async () => {
    const response = await fetch(`${API_URL}/api/irt/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('IRT test failed');
    }

    return response.json();
  },

  /**
   * Generate recommendations for a user
   */
  generateRecommendations: async (userId: string) => {
    const response = await fetch(`${API_URL}/api/recommendations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate recommendations');
    }

    return response.json();
  },

  /**
   * Get recommendations for a user
   */
  getRecommendations: async (userId: string) => {
    const response = await fetch(`${API_URL}/api/recommendations/${userId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, recommendations: [] };
      }
      throw new Error('Failed to fetch recommendations');
    }

    return response.json();
  },

  /**
   * Get student preferences
   */
  getStudentPreferences: async (userId: string) => {
    const response = await fetch(`${API_URL}/api/student-preferences/${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch preferences');
    }

    return response.json();
  },

  /**
   * Save student preferences
   */
  saveStudentPreferences: async (userId: string, preferences: any) => {
    const response = await fetch(`${API_URL}/api/student-preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...preferences }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save preferences');
    }

    return response.json();
  },
};
