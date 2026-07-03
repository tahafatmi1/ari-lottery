import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Auth from './pages/Auth.jsx';
import BuyTokens from './pages/BuyTokens.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Tokens from './pages/Tokens.jsx';
import Transactions from './pages/Transactions.jsx';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient.js';

function FullPageLoader() {
  return (
    <main className="min-h-screen bg-ink text-white">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-electric" />
      </div>
    </main>
  );
}

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let isMounted = true;

    async function verifyUser() {
      if (!isSupabaseConfigured) {
        setStatus('unauthenticated');
        return;
      }

      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) return;

      setStatus(!error && data?.user ? 'authenticated' : 'unauthenticated');
    }

    verifyUser();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'checking') {
    return <FullPageLoader />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buy"
        element={
          <ProtectedRoute>
            <BuyTokens />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tokens"
        element={
          <ProtectedRoute>
            <Tokens />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <Transactions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
