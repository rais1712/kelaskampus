// Mock user packages untuk testing tokenization
export const mockUserPackages = [
  {
    package_id: 'pkg-premium',
    package_name: 'Premium Package',
    tryout_quota: 10,
    tryout_used: 2,
    purchased_at: '2025-11-01T00:00:00Z',
    expired_at: '2025-12-31T23:59:59Z',
    status: 'active' as const,
  },
];

// Initialize mock packages in localStorage
export const initMockPackages = (userId: string) => {
  const key = 'user_active_packages';
  const existing = localStorage.getItem(key);

  if (!existing) {
    localStorage.setItem(key, JSON.stringify(mockUserPackages));
    console.log('✅ Mock packages initialized');
  }
};
