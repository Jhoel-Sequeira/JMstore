import React from 'react';

export default function DashboardPage() {
  return (
    <div className="flex flex-col w-full gap-space-xl">
      {/* Page Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">Dashboard General</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary mr-1.5 animate-pulse"></span>En Vivo
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Métricas consolidadas de ventas multimarca y operaciones en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="relative inline-flex items-center bg-surface-container-low rounded-lg px-3 py-1.5 cursor-pointer hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-outline text-[18px] mr-2">calendar_today</span>
            <span className="font-label-md text-label-md text-on-surface">Hoy: 14 Octubre 2024</span>
            <span className="material-symbols-outlined text-outline text-[18px] ml-1.5">expand_more</span>
          </div>
          <button className="inline-flex items-center gap-2 bg-surface-container-low text-on-surface font-label-md text-label-md px-3.5 py-1.5 rounded-lg hover:bg-surface-container active:scale-98 transition-all" type="button">
            <span className="material-symbols-outlined text-outline text-[18px]">download</span>
            <span>Exportar Resumen</span>
          </button>
          <button className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Actualizar datos" type="button">
            <span className="material-symbols-outlined text-[18px]">sync</span>
          </button>
        </div>
      </div>

      {/* 4 Key Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-lg">
        {/* Stat 1: Ventas del Día */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Ventas del Día</span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold mt-1 tracking-tight">$4,850.00 <span className="font-label-md text-label-md text-outline font-normal">USD</span></span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between bg-surface-container-low/50 px-2.5 py-1 rounded">
            <div className="inline-flex items-center text-secondary font-label-sm text-label-sm font-semibold">
              <span className="material-symbols-outlined text-[16px] mr-0.5">trending_up</span>
              <span>+14.2%</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant font-normal ml-1">vs ayer</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">38 transacciones</span>
          </div>
        </div>

        {/* Stat 2: Ganancia Comisión Tienda */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Ganancia Comisión Tienda</span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold mt-1 tracking-tight">$970.00 <span className="font-label-md text-label-md text-outline font-normal">USD</span></span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[22px]">percent</span>
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between bg-surface-container-low/50 px-2.5 py-1 rounded">
            <span className="font-label-sm text-label-sm text-primary font-medium">Tasa promedio consolidada</span>
            <span className="font-label-md text-label-md text-on-surface font-bold">20.0%</span>
          </div>
        </div>

        {/* Stat 3: Liquidaciones Pendientes */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Liquidaciones Pendientes</span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold mt-1 tracking-tight">$12,430.00 <span className="font-label-md text-label-md text-outline font-normal">USD</span></span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[22px]">pending_actions</span>
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between bg-surface-container-low/50 px-2.5 py-1 rounded">
            <div className="inline-flex items-center text-tertiary font-label-sm text-label-sm font-semibold">
              <span className="material-symbols-outlined text-[16px] mr-1">schedule</span>
              <span>8 marcas por liquidar</span>
            </div>
            <span className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer">Ver detalle</span>
          </div>
        </div>

        {/* Stat 4: Total Stock Unidades */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Total Stock Unidades</span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold mt-1 tracking-tight">3,420 <span className="font-label-md text-label-md text-outline font-normal">uds</span></span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-secondary-fixed flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between bg-surface-container-low/50 px-2.5 py-1 rounded">
            <span className="font-label-sm text-label-sm text-on-surface-variant">12 marcas activas</span>
            <span className="inline-flex items-center text-error font-label-sm text-label-sm font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-error mr-1"></span>4 alertas stock bajo
            </span>
          </div>
        </div>
      </div>

      {/* Main Section (7fr / 5fr Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Column: Ventas por Marca */}
        <div className="lg:col-span-7 flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Ventas por Marca</h2>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Rendimiento y volumen acumulado · Top 6 del Mes</span>
            </div>
            <div className="inline-flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded text-on-surface-variant font-label-sm text-label-sm">
              <span>Mes en curso</span>
              <span className="material-symbols-outlined text-[16px]">tune</span>
            </div>
          </div>

          {/* Financial Snapshot Summary Row */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-surface-container-low/70 rounded-lg">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Ventas Brutas Top 6</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">$26,150</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Comisión Retenida</span>
              <span className="font-headline-sm text-headline-sm text-primary font-bold mt-0.5">$5,230</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Margen Tienda</span>
              <span className="font-headline-sm text-headline-sm text-secondary font-bold mt-0.5">20.0%</span>
            </div>
          </div>

          {/* Multi-brand Progress Bars */}
          <div className="flex flex-col gap-4 mt-2">
            <BrandBar name="Nordic Home" category="Hogar & Deco" percent={32} amount="$8,450.00" color="bg-primary-container" />
            <BrandBar name="Vera Studio" category="Moda & Textil" percent={24} amount="$6,200.00" color="bg-primary" />
            <BrandBar name="Aura Botanics" category="Cosmética" percent={16} amount="$4,120.00" color="bg-secondary" />
            <BrandBar name="Loom & Thread" category="Accesorios" percent={13} amount="$3,280.00" color="bg-surface-tint" />
            <BrandBar name="Siena Leather" category="Marroquinería" percent={9} amount="$2,450.00" color="bg-tertiary" />
            <BrandBar name="Komorebi Crafts" category="Cerámica" percent={6} amount="$1,650.00" color="bg-outline" />
          </div>

          {/* Chart */}
          <div className="mt-2 pt-3 bg-surface-container-low/40 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
              <span>Distribución de Ventas por Turno (Hoy)</span>
              <span className="font-semibold text-primary">Pico: 11:30 AM ($1,120)</span>
            </div>
            <div className="h-14 w-full">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 50">
                <defs>
                  <linearGradient id="brandGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3"></stop>
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0"></stop>
                  </linearGradient>
                </defs>
                <path d="M0,45 L40,38 L80,42 L130,25 L180,30 L230,12 L280,18 L330,8 L380,22 L430,15 L470,28 L500,20 L500,50 L0,50 Z" fill="url(#brandGradient)"></path>
                <path d="M0,45 L40,38 L80,42 L130,25 L180,30 L230,12 L280,18 L330,8 L380,22 L430,15 L470,28 L500,20" fill="none" stroke="#4f46e5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                <circle cx="330" cy="8" fill="#3525cd" r="4"></circle>
                <circle cx="330" cy="8" fill="#3525cd" fillOpacity="0.25" r="7"></circle>
              </svg>
            </div>
            <div className="flex items-center justify-between font-label-sm text-label-sm text-outline">
              <span>09:00 AM</span>
              <span>11:00 AM</span>
              <span>01:00 PM</span>
              <span>03:00 PM</span>
              <span>05:00 PM</span>
            </div>
          </div>
        </div>

        {/* Right Column: Últimas Ventas en Vivo */}
        <div className="lg:col-span-5 flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Últimas Ventas en Vivo</h2>
                <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Transacciones registradas en caja</span>
            </div>
            <span className="bg-surface-container font-label-sm text-label-sm text-primary px-2 py-0.5 rounded font-semibold">Terminal POS #1</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <SaleItem ticket="#TK-9841" brand="Nordic Home" brandBg="bg-primary-fixed text-on-primary-fixed-variant" amount="$145.00" product="Lámpara Cerámica Nórdica" method="credit_card" methodLabel="Tarjeta" time="10:42 AM" />
            <SaleItem ticket="#TK-9840" brand="Aura Botanics" brandBg="bg-secondary-fixed text-on-secondary-fixed-variant" amount="$78.50" product="Set Serum Facial 50ml" method="payments" methodLabel="Efectivo" time="10:35 AM" />
            <SaleItem ticket="#TK-9839" brand="Vera Studio" brandBg="bg-surface-variant text-primary" amount="$220.00" product="Chaqueta Lino Natural (M)" method="account_balance" methodLabel="Transferencia" time="10:18 AM" />
            <SaleItem ticket="#TK-9838" brand="Loom & Thread" brandBg="bg-surface-container text-on-surface-variant" amount="$42.00" product="Cojín Bordado Terciopelo" method="credit_card" methodLabel="Tarjeta" time="09:55 AM" />
            <SaleItem ticket="#TK-9837" brand="Siena Leather" brandBg="bg-tertiary-fixed text-on-tertiary-fixed-variant" amount="$65.00" product="Billetera Cuero Café" method="credit_card" methodLabel="Tarjeta" time="09:30 AM" />
          </div>

          <a className="mt-2 inline-flex items-center justify-center gap-1.5 text-primary font-label-md text-label-md hover:underline py-1.5 text-center" href="#">
            <span>Ver historial completo de tickets</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </a>
        </div>
      </div>

      {/* Alertas Operativas Rápidas */}
      <div className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">notifications_active</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Alertas Operativas Rápidas</h3>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant">3 tareas prioritarias</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <AlertCard icon="move_to_inbox" iconBg="bg-surface-container-high text-primary" title="Recepción pendiente" subtitle="2 guías de Nordic Home" action="Recibir" actionClass="bg-surface-container text-primary hover:bg-primary hover:text-on-primary" />
          <AlertCard icon="payments" iconBg="bg-secondary-fixed text-secondary" title="Arqueo de caja" subtitle="65% alcanzado de la meta diaria" action="Revisar" actionClass="bg-surface-container text-on-surface hover:bg-surface-container-high" />
          <AlertCard icon="assignment_turned_in" iconBg="bg-tertiary-fixed text-tertiary" title="Liquidación quincenal" subtitle="Lista para autorizar y desembolso" action="Autorizar" actionClass="bg-primary text-on-primary hover:bg-primary-container" />
        </div>
      </div>
    </div>
  );
}

function BrandBar({ name, category, percent, amount, color }) {
  const dotColor = color.replace('bg-', 'bg-');
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
          <span className="font-label-md text-label-md text-on-surface font-semibold">{name}</span>
          <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm px-1.5 py-0.5 rounded">{category}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-body-sm text-body-sm text-on-surface-variant">{percent}% cuota</span>
          <span className="font-label-md text-label-md text-on-surface font-bold">{amount}</span>
        </div>
      </div>
      <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

function SaleItem({ ticket, brand, brandBg, amount, product, method, methodLabel, time }) {
  return (
    <div className="p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-label-sm font-semibold text-primary">{ticket}</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded ${brandBg} font-label-sm text-label-sm`}>{brand}</span>
        </div>
        <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{amount}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-body-sm text-body-sm text-on-surface font-medium truncate max-w-[210px]">{product}</span>
        <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[14px]">{method}</span>
          <span>{methodLabel}</span>
          <span>·</span>
          <span>{time}</span>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ icon, iconBg, title, subtitle, action, actionClass }) {
  return (
    <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between gap-space-md hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex-shrink-0 flex items-center justify-center`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-md text-label-md text-on-surface font-semibold leading-tight">{title}</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{subtitle}</span>
        </div>
      </div>
      <button className={`${actionClass} font-label-sm text-label-sm px-2.5 py-1.5 rounded transition-all whitespace-nowrap`} type="button">
        {action}
      </button>
    </div>
  );
}
