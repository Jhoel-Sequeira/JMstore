import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import DashboardPage from './pages/Dashboard';
import AdminPage from './pages/Admin';
import MarcasPage from './pages/Marcas';
import ClientesPage from './pages/Clientes';
import InventarioPage from './pages/Inventario';
import CatalogoQRPage from './pages/CatalogoQR';
import ComprasPage from './pages/Compras';
import POSPage from './pages/POS';
import LoginPage from './pages/Login';
import { AUTH_STORAGE_KEY } from './services/api';

export default function App() {
  return <BrowserRouter><AuthenticatedApp /></BrowserRouter>;
}

function AuthenticatedApp() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Require a fresh login whenever the app is opened or reloaded.
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setAuthReady(true);
  }, []);

  useEffect(() => {
    const expireSession = () => {
      setUser(null);
      navigate('/login', { replace: true });
    };
    window.addEventListener('jmstore-session-expired', expireSession);
    return () => window.removeEventListener('jmstore-session-expired', expireSession);
  }, [navigate]);

  const handleAuthenticated = useCallback((authenticatedUser, destination = '/') => {
    setUser(authenticatedUser);
    setAuthReady(true);
    navigate(destination, { replace: true });
  }, [navigate]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  if (!authReady) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Verificando sesión…</div>;

  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage onAuthenticated={handleAuthenticated} />} />
    <Route path="/*" element={user ? <Layout user={user} onLogout={logout}><Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/admin" element={user.rol === 'administrador' ? <AdminPage /> : <Navigate to="/" replace />} />
      <Route path="/marcas" element={<MarcasPage />} />
      <Route path="/clientes" element={<ClientesPage />} />
      <Route path="/inventario" element={<InventarioPage />} />
      <Route path="/catalogo-qr" element={<CatalogoQRPage />} />
      <Route path="/compras" element={<ComprasPage />} />
      <Route path="/pos" element={<POSPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Layout> : <Navigate to="/login" replace />} />
  </Routes>;
}
