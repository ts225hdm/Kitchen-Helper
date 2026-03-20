import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ThemeProvider from './components/ThemeProvider';
import ToastProvider from './components/Toast';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import { UserContext, useUserLoader } from './hooks/useUser';
import Dashboard from './pages/Dashboard';
import Kitchen from './pages/Kitchen';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/RecipeDetail';
import Spending from './pages/Spending';
import AdminConsole from './pages/AdminConsole';
import Profile from './pages/Profile';
import JoinHousehold from './pages/JoinHousehold';
import Callback from './pages/Callback';

export default function App() {
  const userCtx = useUserLoader();

  return (
    <UserContext.Provider value={userCtx}>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/callback" element={<Callback />} />
            <Route element={<RequireAuth><Layout /></RequireAuth>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/kitchen" element={<Kitchen />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/recipes/:id" element={<RecipeDetail />} />
              <Route path="/spending" element={<Spending />} />
              <Route path="/admin" element={<AdminConsole />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/join" element={<JoinHousehold />} />
              {/* Redirects for old routes */}
              <Route path="/ai-chef" element={<Navigate to="/recipes" replace />} />
              <Route path="/grocery-trips" element={<Navigate to="/spending" replace />} />
              <Route path="/eating-out" element={<Navigate to="/spending" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
    </UserContext.Provider>
  );
}
