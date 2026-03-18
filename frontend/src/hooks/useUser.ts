import { useState, useEffect, createContext, useContext } from 'react';
import { useLogto } from '@logto/react';
import client from '../api/client';

interface UserData {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  roles: string[];
}

interface UserContextValue {
  user: UserData | null;
  loading: boolean;
  isPremium: boolean;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  isPremium: false,
});

export { UserContext };
export type { UserContextValue };

export function useUser() {
  return useContext(UserContext);
}

export function useUserLoader(): UserContextValue {
  const { isAuthenticated } = useLogto();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      // Dev mode (no auth) — still fetch user info
      client
        .get('/api/users/me')
        .then((res) => setUser(res.data))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
      return;
    }

    // Small delay to let AuthSync set the token first
    const timer = setTimeout(() => {
      client
        .get('/api/users/me')
        .then((res) => setUser(res.data))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  const isPremium = user?.roles?.includes('premium') ?? false;

  return { user, loading, isPremium };
}
