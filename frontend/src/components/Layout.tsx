import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useUser } from '../hooks/useUser';

export default function Layout() {
  const { user, loading } = useUser();
  const location = useLocation();

  // Redirect to profile if name not set (but allow /profile and /join pages)
  const nameExemptPaths = ['/profile', '/join'];
  const needsName = !loading && user && !user.name && !nameExemptPaths.includes(location.pathname);

  if (needsName) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 lg:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
