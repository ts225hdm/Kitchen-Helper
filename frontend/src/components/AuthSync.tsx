import { useEffect } from 'react';
import { useLogto } from '@logto/react';
import { setAuthToken } from '../api/client';

/**
 * Syncs the Logto access token to the API client.
 * Place inside LogtoProvider but wrapping App routes.
 */
export default function AuthSync({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, getAccessToken } = useLogto();

  useEffect(() => {
    if (!isAuthenticated) {
      setAuthToken(null);
      return;
    }

    let cancelled = false;

    const fetchToken = async () => {
      try {
        // Fetch access token for our backend API
        const token = await getAccessToken();
        if (!cancelled && token) {
          setAuthToken(token);
        }
      } catch {
        // Token fetch failed — clear auth
        if (!cancelled) setAuthToken(null);
      }
    };

    fetchToken();

    // Refresh token periodically (every 50 minutes, tokens typically last 60 min)
    const interval = setInterval(fetchToken, 50 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated, getAccessToken]);

  return <>{children}</>;
}
