import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

export default function useCurrentUser() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
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
