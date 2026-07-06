import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_AUTH_DISABLED, DEMO_USER } from '../lib/demoMode.js';
import { supabase } from '../lib/supabaseClient.js';

export default function useCurrentUser() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      // CLIENT DEMO MODE: Supabase Auth is intentionally bypassed.
      // Set VITE_DEMO_AUTH_DISABLED=false to re-enable the real auth session check.
      if (DEMO_AUTH_DISABLED) {
        setUser(DEMO_USER);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !data?.user) {
        navigate('/auth', { replace: true });
        return;
      }

      setUser(data.user);
      setLoading(false);
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return { user, loading };
}
