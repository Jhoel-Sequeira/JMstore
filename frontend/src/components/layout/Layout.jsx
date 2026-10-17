import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { applyTheme, getTheme } from '../../services/theme';

const mainNavItems = [
  { name: 'Dashboard', path: '/', icon: 'dashboard' },
  { name: 'Administración', path: '/admin', icon: 'admin_panel_settings' },
  { name: 'Proveedores', path: '/marcas', icon: 'loyalty' },
  { name: 'Clientes', path: '/clientes', icon: 'group' },
];

const inventarioItems = [
  { name: 'Inventario', path: '/inventario', icon: 'inventory_2' },
  { name: 'Catálogo', path: '/catalogo-qr', icon: 'qr_code_2' },
  { name: 'Compras', path: '/compras', icon: 'shopping_bag' },
];

const posCajaItems = [
  { name: 'Punto de Venta', path: '/pos', icon: 'point_of_sale' },
];

const NavItem = ({ item, isSubItem = false, onClick, theme }) => {
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      style={({ isActive }) => isActive ? {
        backgroundColor: '#3C507D',
        color: '#FFFFFF',
      } : undefined}
      className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${isActive ? 'font-semibold shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'} ${isSubItem ? 'ml-1' : ''}`}
    >
      {({ isActive }) => (
        <>
          <span className="material-symbols-outlined text-[19px] transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
          <span className="truncate">{item.name}</span>
          {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#E0C58F' }} />}
        </>
      )}
    </NavLink>
  );
};

const NavSection = ({ title, items, onItemClick, theme }) => (
  <div className="pt-5">
    <div className="mb-2 flex items-center gap-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-white/50">
      <span>{title}</span>
      <span className="h-px flex-1 bg-white/15" />
    </div>
    <div className="flex flex-col gap-1">
      {items.map((item) => (
        <NavItem key={item.path} item={item} isSubItem onClick={onItemClick} theme={theme} />
      ))}
    </div>
  </div>
);

const BrandLogo = ({ src, name, color }) => {
  const [failed, setFailed] = useState(false);
  const initials = (name || 'JM').trim().slice(0, 2).toUpperCase();

  return (
    <div className="flex h-28 w-full max-w-52 shrink-0 items-center justify-center">
      {src && !failed
        ? <img key={src} src={src} alt={`Logo ${name || 'del negocio'}`} referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" onError={() => setFailed(true)} />
        : <span className="text-3xl font-black tracking-tight" style={{ color }}>{initials}</span>}
    </div>
  );
};

const Sidebar = ({ isOpen, onClose, theme, user }) => (
  <>
    {isOpen && <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm transition-opacity lg:hidden" />}
    <aside
      style={{ backgroundColor: '#112250' }}
      className={`fixed bottom-0 left-0 top-0 z-50 flex w-[280px] flex-col border-r border-white/10 shadow-[8px_0_32px_rgba(15,23,42,.12)] transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="relative overflow-hidden px-5 pb-6 pt-6">
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: '#3C507D' }} />
          <div className="relative flex flex-col items-center gap-3 pt-10 text-center">
            <div className="flex w-full flex-col items-center gap-3">
              <BrandLogo key={theme.logo} src={theme.logo} name={theme.brandName} color={theme.primary} />
              <div className="w-full min-w-0 px-2">
                <p className="break-words text-lg font-extrabold tracking-tight text-white">{theme.brandName || 'JMscents'}</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.2em] text-white/55">Perfumería · Gestión</p>
              </div>
            </div>
            <button onClick={onClose} className="absolute right-0 top-0 rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden" aria-label="Cerrar menú">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>
        <nav className="flex flex-col px-3 pb-5 pt-1">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-white/50">Principal</p>
          {mainNavItems.filter((item) => item.path !== '/admin' || user?.rol === 'administrador').map((item) => <NavItem key={item.path} item={item} onClick={onClose} theme={theme} />)}
          <NavSection title="Inventario" items={inventarioItems} onItemClick={onClose} theme={theme} />
          <NavSection title="POS y Caja" items={posCajaItems} onItemClick={onClose} theme={theme} />
        </nav>
      </div>
      <div className="m-3 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#E0C58F' }} />
        <span className="material-symbols-outlined text-sm text-white/60">verified_user</span>
        <span className="text-[10px] font-semibold tracking-wide text-white/70">Panel administrativo</span>
      </div>
    </aside>
  </>
);
const Header = ({ onToggleSidebar, theme, user, onLogout }) => {
  const initials = (user?.nombre || user?.usuario || 'U').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <header style={{ backgroundColor: '#FFFFFF' }} className="fixed left-0 right-0 top-0 z-30 flex h-[76px] items-center justify-between gap-3 border-b border-slate-200/70 px-4 backdrop-blur-xl sm:px-7 lg:left-[280px]">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} type="button" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none lg:hidden" aria-label="Abrir menú">
          <span className="material-symbols-outlined text-[21px]">menu</span>
        </button>
        <div className="hidden sm:block">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Panel de control</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-700">Resumen de tu negocio</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/80 py-1.5 pl-1.5 pr-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${theme.primary}, color-mix(in srgb, ${theme.primary} 62%, ${theme.accent}))` }}>{initials}</div>
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-36 truncate text-xs font-bold text-slate-800">{user?.nombre || user?.usuario}</p>
            <p className="text-[10px] capitalize text-slate-400">{user?.rol}</p>
          </div>
        </div>
        <button type="button" onClick={onLogout} className="group inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" title="Salir">
          <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5">logout</span>
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
};
export const Layout = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => {
    applyTheme(theme);
    const handleThemeChange = (event) => setTheme(event.detail || getTheme());
    const handleStorageChange = () => setTheme(getTheme());
    window.addEventListener('jmstore-theme-change', handleThemeChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('jmstore-theme-change', handleThemeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [theme]);

  return (
    <div style={{ backgroundColor: '#FFFFFF', fontFamily: `'${theme.font}', sans-serif` }} className="min-h-screen flex flex-col">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} theme={theme} user={user} />

      <div className="lg:pl-[280px] flex flex-col flex-1">
        <Header theme={theme} user={user} onLogout={onLogout} onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="w-full min-w-0 flex-1 bg-white px-4 pb-6 pt-[96px] sm:px-7 sm:pb-8 sm:pt-[104px]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
