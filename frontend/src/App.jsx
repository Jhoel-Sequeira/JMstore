import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import DashboardPage from './pages/Dashboard';
import AdminPage from './pages/Admin';
import MarcasPage from './pages/Marcas';
import ClientesPage from './pages/Clientes';
import InventarioPage from './pages/Inventario';
import CatalogoQRPage from './pages/CatalogoQR';
import RecepcionPage from './pages/Recepcion';
import BajasRetirosPage from './pages/BajasRetiros';
import POSPage from './pages/POS';
import CierreCajaPage from './pages/CierreCaja';
import LiquidacionesPage from './pages/Liquidaciones';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/marcas" element={<MarcasPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/inventario" element={<InventarioPage />} />
        <Route path="/catalogo-qr" element={<CatalogoQRPage />} />
        <Route path="/recepcion" element={<RecepcionPage />} />
        <Route path="/bajas-retiros" element={<BajasRetirosPage />} />
        <Route path="/pos" element={<POSPage />} />
        <Route path="/cierre-caja" element={<CierreCajaPage />} />
        <Route path="/liquidaciones" element={<LiquidacionesPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
