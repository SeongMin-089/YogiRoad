import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { DashboardPage } from '../pages/DashboardPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { MapPage } from '../pages/MapPage';
import { MyPage } from '../pages/MyPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { SalesPage } from '../pages/SalesPage';

function LoadingScreen() {
  return (
    <main className="app-loading" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>로그인 정보를 확인하고 있습니다.</p>
    </main>
  );
}

function ProtectedLayout() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <AppShell />;
}

function LoginRoute() {
  const { user, initializing } = useAuth();
  if (initializing) return <LoadingScreen />;
  return user ? <Navigate to="/" replace /> : <LoginPage />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<HomePage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="my" element={<MyPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
