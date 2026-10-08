import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

//const LOGO_URL = 'https://bzogrntiodvcrluxetwp.supabase.co/storage/v1/object/public/imagenes/logo.png';
const LOGO_URL = 'https://lh3.googleusercontent.com/d/1BjZBopvdyYJLvUbcvLZo_3tLYbtBsPX-=w1000?authuser=0';
// 1. Esquema SQL convertido a JavaScript
export const SCHEMA_TABLES = {
  clientes: ['id', 'nombre_cliente', 'telefono', 'correo'],
  cuentas: ['id', 'marca_id', 'banco', 'no_cuenta'],
  detalle_retiro: ['detalle_id', 'retiro_id', 'producto_id', 'Cantidad'],
  estados: ['id', 'modulo', 'nombre', 'descripcion'],
  ingreso_detalles: ['id', 'ingreso_id', 'producto_id', 'cantidad', 'precio_ingreso'],
  ingresos: ['id', 'marca_id', 'usuario_id', 'tipo_carga', 'observaciones', 'estado_id', 'fecha_ingreso'],
  kardex: ['id', 'producto_id', 'usuario_id', 'tipo_movimiento', 'cantidad', 'referencia_id', 'motivo', 'fecha'],
  liquidacion_detalles: ['id', 'liquidacion_id', 'producto_id', 'cantidad_vendida', 'monto_efectivo', 'monto_tarjeta', 'comision_pos', 'subtotal_neto'],
  liquidaciones: ['id', 'marca_id', 'periodo_inicio', 'periodo_fin', 'total_bruto', 'total_comision_pos', 'total_neto_pagar', 'estado_id', 'pdf_url', 'fecha_generacion'],
  marcas: ['id', 'nombre_marca', 'contacto_nombre', 'telefono', 'email', 'categoria', 'ciudad_pais', 'razon_social', 'redes_sociales', 'cargo', 'nombre_representante', 'tiempo_estancia', 'fecha_ingreso', 'catalogo', 'estado_id', 'cuentas', 'fecha_registro', 'codigo', 'logo'],
  metodo_pago: ['id', 'metodo_pago'],
  pagos_venta: ['id', 'venta_id', 'metodo_pago', 'monto', 'comision_porcentaje', 'monto_comision'],
  productos: ['id', 'marca_id', 'codigo_qr', 'sku', 'nombre', 'descripcion', 'precio', 'stock_critico', 'imagen_url', 'estado_id'],
  renta: ['id', 'marca_id', 'fecha_pago', 'monto'],
  renta_pago: ['pago_id', 'renta_id', 'monto_pagado', 'fecha_pago', 'comentario'],
  retiros: ['id', 'marca_id', 'usuario_id', 'fecha_retiro', 'motivo', 'estado_id'],
  usuarios: ['id', 'nombre', 'email', 'usuario', 'pass', 'rol', 'estado_id', 'creado_en'],
  venta_detalles: ['id', 'venta_id', 'producto_id', 'cantidad', 'precio_unitario', 'descuento', 'subtotal'],
  ventas: ['id', 'usuario_id', 'cliente_id', 'metodo_pago_id', 'total', 'comision_pos', 'estado_id', 'fecha_venta']
};

// 2. Botón para crear las tablas en Google Sheets
export const GoogleSheetInitButton = () => {
  const [loading, setLoading] = useState(false);

  // Reemplaza esta URL con la que te dé tu Google Apps Script
  const GOOGLE_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwksVY9wO9ZAk5J99V_JsNS3U1K9oWlokqMig_o3HSVRj1v7hinj1rK2xSrxAv6Y4PPmQ/exec';

  const handleCrearTablas = async () => {
    if (!window.confirm('¿Deseas inicializar las 19 tablas en Google Sheets?')) return;

    setLoading(true);
    try {
      await fetch(GOOGLE_SCRIPT_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: SCHEMA_TABLES }),
      });
      alert('¡Listo! Revisa tu Google Sheet, las pestañas se están creando.');
    } catch (error) {
      console.error(error);
      alert('Error al conectar con Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCrearTablas}
      disabled={loading}
      type="button"
      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-[16px]">
        {loading ? 'sync' : 'table_view'}
      </span>
      <span>{loading ? 'Creando...' : 'Crear Tablas en Sheets'}</span>
    </button>
  );
};

const mainNavItems = [
  { name: 'Dashboard', path: '/', icon: 'dashboard' },
  { name: 'Administración', path: '/admin', icon: 'admin_panel_settings' },
  { name: 'Gestión de Marcas', path: '/marcas', icon: 'loyalty' },
  { name: 'Gestión de Clientes', path: '/clientes', icon: 'group' },
  { name: 'Renta', path: '/renta', icon: 'receipt' },
];

const inventarioItems = [
  { name: 'Catálogo & QR', path: '/catalogo-qr', icon: 'qr_code_2' },
  { name: 'Recepción e Ingreso', path: '/recepcion', icon: 'move_to_inbox' },
  { name: 'Bajas y Retiros', path: '/bajas-retiros', icon: 'outbox' },
];

const posCajaItems = [
  { name: 'Punto de Venta', path: '/pos', icon: 'point_of_sale' },
  { name: 'Cierre de Caja', path: '/cierre-caja', icon: 'lock_clock' },
];

const NavItem = ({ item, isSubItem = false }) => {
  const baseClasses = isSubItem
    ? 'flex items-center gap-2.5 px-3 py-1.5 rounded transition-all text-sm'
    : 'flex items-center gap-3 px-3 py-2 rounded transition-all text-sm';

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `${baseClasses} ${isActive
          ? 'bg-slate-100 text-blue-600 font-semibold border-l-4 border-blue-600 pl-2'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
      <span>{item.name}</span>
    </NavLink>
  );
};

const NavSection = ({ title, items }) => (
  <div className="pt-2">
    <div className="px-3 py-1 flex items-center justify-between text-slate-400 text-xs uppercase tracking-wider font-semibold">
      <span>{title}</span>
    </div>
    <div className="flex flex-col pl-2 gap-0.5 mt-0.5">
      {items.map((item) => (
        <NavItem key={item.path} item={item} isSubItem />
      ))}
    </div>
  </div>
);

const Sidebar = () => (
  <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white z-40 flex flex-col justify-between border-r border-slate-200 overflow-y-auto">
    <div className="flex flex-col">
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <img alt="JMscents" referrerPolicy="no-referrer" className="h-8 w-auto object-contain" src={LOGO_URL} />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-900 tracking-tight font-bold text-lg">JMscents</span>
          </div>
        </div>
      </div>

      <nav className="flex flex-col px-2 gap-1">
        {mainNavItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
        <NavSection title="Inventario" items={inventarioItems} />
        <NavSection title="POS y Caja" items={posCajaItems} />
        <NavItem item={{ name: 'Liquidaciones', path: '/liquidaciones', icon: 'receipt_long' }} />
      </nav>
    </div>
  </aside>
);

const Header = () => (
  <header className="fixed top-0 left-[260px] right-0 h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 z-30 flex items-center justify-between px-6">
    <div className="flex items-center gap-4 w-full max-w-md">
      <input
        className="w-full h-9 px-3 bg-slate-100 rounded text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
        placeholder="Buscar por SKU, marca, cliente..."
        type="text"
      />
    </div>
    <div className="flex items-center gap-3">
      {/* Botón integrado aquí */}
      <GoogleSheetInitButton />

      <NavLink
        to="/pos"
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium shadow-sm"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        <span>Nueva Venta</span>
      </NavLink>
    </div>
  </header>
);

export const Layout = ({ children }) => {
  return (
    <>
      <Sidebar />
      <div className="pl-[260px]">
        <Header />
        <main className="w-full pt-20 px-6 py-6 bg-slate-50 min-h-screen">
          {children}
        </main>
      </div>
    </>
  );
};

// Exportación por defecto para evitar errores sin importar cómo se importe en App.jsx
export default Layout;