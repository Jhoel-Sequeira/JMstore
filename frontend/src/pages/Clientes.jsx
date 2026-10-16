import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const money = (value) => new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleDateString('es-NI') : '—';
const invoiceNumber = (id) => `FV-${String(id).padStart(6, '0')}`;

export default function ClientesPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/clientes/historial')
      .then(({ data }) => setClients(data))
      .catch((e) => setError(e.response?.data?.detail || 'No se pudo cargar el historial de clientes.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((client) => !term || [client.nombre_cliente, client.telefono, client.correo]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [clients, search]);

  const totalSales = clients.reduce((sum, client) => sum + Number(client.total_comprado || 0), 0);
  const totalInvoices = clients.reduce((sum, client) => sum + Number(client.facturas || 0), 0);
  const totalOwed = clients.reduce((sum, client) => sum + Number(client.saldo_pendiente || 0), 0);

  return (
    <main className="w-full min-w-0 space-y-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Relación con compradores</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Clientes</h1><p className="mt-1 text-sm text-slate-500">Personas con compras registradas y su historial de ventas.</p></div>
        <Link to="/pos" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><span className="material-symbols-outlined text-lg">point_of_sale</span>Ir a ventas</Link>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Clientes compradores" value={clients.length} icon="groups" />
        <Metric label="Ventas registradas" value={totalInvoices} icon="receipt_long" />
        <Metric label="Saldo por cobrar" value={money(totalOwed)} icon="account_balance_wallet" amber={totalOwed > 0} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div><h2 className="font-bold text-slate-900">Historial de compradores</h2><p className="mt-0.5 text-sm text-slate-500">{clients.length} clientes · {money(totalSales)} en ventas</p></div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre, teléfono o correo…" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 sm:max-w-72" />
        </div>

        {loading ? <div className="p-12 text-center text-sm text-slate-500">Cargando historial…</div> : !filtered.length ? <div className="px-5 py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><span className="material-symbols-outlined">person_search</span></div><p className="mt-3 font-semibold text-slate-700">{clients.length ? 'No hay coincidencias' : 'Todavía no hay compras registradas'}</p><p className="mt-1 text-sm text-slate-500">{clients.length ? 'Prueba con otro nombre o dato de contacto.' : 'Las personas aparecerán aquí cuando se registre una venta.'}</p></div> : <div className="divide-y divide-slate-100">
          {filtered.map((client) => <article key={client.id} className="px-5 py-4 transition hover:bg-slate-50/70">
            <button type="button" onClick={() => setExpanded((current) => current === client.id ? null : client.id)} className="flex w-full flex-wrap items-center justify-between gap-3 text-left">
              <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700">{client.nombre_cliente.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{client.nombre_cliente}</p><p className="mt-0.5 truncate text-xs text-slate-500">{[client.telefono, client.correo].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</p></div></div>
              <div className="flex items-center gap-5"><div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Última compra</p><p className="mt-0.5 text-sm font-medium text-slate-700">{date(client.ultima_compra)}</p></div><div className="text-right"><p className="font-bold text-slate-900">{money(client.total_comprado)}</p><p className="text-[11px] text-slate-500">{client.facturas} {client.facturas === 1 ? 'venta' : 'ventas'}</p></div><span className={`material-symbols-outlined text-slate-400 transition-transform ${expanded === client.id ? 'rotate-180' : ''}`}>expand_more</span></div>
            </button>
            {expanded === client.id && <div className="mt-4 overflow-hidden rounded-xl border border-slate-200"><div className="grid gap-3 bg-slate-50 px-4 py-3 text-xs sm:grid-cols-3"><Info label="Total abonado" value={money(client.total_abonado)} /><Info label="Saldo pendiente" value={money(client.saldo_pendiente)} amber={Number(client.saldo_pendiente) > 0} /><Info label="Contacto" value={client.telefono || client.correo || 'Sin datos'} /></div><div className="divide-y divide-slate-100">{client.historial.map((sale) => <div key={sale.venta_id ?? sale.registro_id} className="grid grid-cols-2 gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_1fr_1fr_1fr_1fr]"><div><p className="font-mono font-semibold text-indigo-700">{sale.origen === 'importada' ? 'Venta histórica' : invoiceNumber(sale.venta_id)}</p><p className="text-xs text-slate-500">{date(sale.fecha)}{sale.origen === 'importada' ? ' · ' + (sale.producto || 'Producto') : ''}</p></div><Info label="Total" value={money(sale.total)} /><Info label="Abonado" value={money(sale.abonado)} /><Info label="Saldo" value={money(sale.saldo)} amber={Number(sale.saldo) > 0} /><Info label={sale.origen === 'importada' ? 'Registro' : 'Abonos'} value={sale.origen === 'importada' ? 'Importado' : sale.abonos} /></div>)}</div></div>}
          </article>)}
        </div>}
      </section>
    </main>
  );
}

function Metric({ label, value, icon, amber = false }) { return <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${amber ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}><span className="material-symbols-outlined">{icon}</span></div><div><p className="text-sm text-slate-500">{label}</p><p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p></div></div>; }
function Info({ label, value, amber = false }) { return <div><p className="text-[11px] text-slate-500">{label}</p><p className={`mt-0.5 font-semibold ${amber ? 'text-amber-700' : 'text-slate-800'}`}>{value}</p></div>; }
