export const DEMO_AUTH_DISABLED = import.meta.env.VITE_DEMO_AUTH_DISABLED === 'true';

export const DEMO_USER = {
  id: import.meta.env.VITE_DEMO_USER_ID || '00000000-0000-4000-8000-000000000001',
  email: import.meta.env.VITE_DEMO_USER_EMAIL || 'demo@arilottery.local',
  created_at: '2026-07-06T00:00:00.000Z',
  app_metadata: {
    role: 'demo',
  },
  user_metadata: {
    name: 'ARI Lottery Demo User',
  },
  is_demo: true,
};
