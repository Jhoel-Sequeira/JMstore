import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const money = (value) => new Intl.NumberFormat('es-NI', {
  style: 'currency', currency: 'NIO', maximumFractionDigits: 2,
}).format(Number(value || 0));
const number = (value) => new Intl.NumberFormat('es-NI').format(Number(value || 0));
const date = (value, options = { day: '2-digit', month: 'short' }) => value
  ? new Date(value).toLocaleDateString('es-NI', { ...options, timeZone: 'America/Managua' })
  : '—';
const periodOptions = [
  ['today', 'Hoy'], ['week', 'Últimos 7 días'], ['month', 'Este mes'], ['year', 'Este año'],
];

export default function DashboardPage() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get('/dashboard/', { params: { periodo: period } })
      .then(({ data: response }) => { if (active) setData(response); })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.detail || 'No se pudo cargar el resumen. Intenta actualizar.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period, refresh]);

  const sales = data?.ventas || {};
  const purchases = data?.compras || {};
  const inventory = data?.inventario || {};
  const profit = data?.utilidad || {};
  const purchaseProfitability = data?.rentabilidad_compras || {};
  const receipts = data?.cobros || {};
  const missingCostLines = Number(profit.lineas_sin_costo || 0);
  const variation = sales.variacion_pct;

  return (
    <div className="flex w-full flex-col gap-5 pb-8">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">JMstore · Resumen del negocio</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Ventas, compras, rentabilidad e inventario en un solo lugar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="dashboard-period">Período</label>
          <select id="dashboard-period" value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
            {periodOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={() => setRefresh((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" aria-label="Actualizar resumen">
            <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </header>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setRefresh((value) => value + 1)} className="font-semibold underline">Reintentar</button></div>}

      <section aria-label="Indicadores del período" className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label={`Ventas · ${data?.periodo_label || 'Este mes'}`} value={money(sales.total_nio)} icon="point_of_sale" tone="indigo" loading={loading}>
          <span>{number(sales.facturas)} facturas · Promedio {money(sales.ticket_promedio_nio)}</span>
          {variation !== null && variation !== undefined && <span className={Number(variation) >= 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{Number(variation) >= 0 ? '↑ ' : '↓ '}{Math.abs(Number(variation)).toFixed(1)}% vs período anterior</span>}
          {(variation === null || variation === undefined) && <span>Sin ventas en el período anterior</span>}
        </MetricCard>
        <MetricCard label="Utilidad estimada" value={profit.utilidad_estimada_nio == null ? '—' : money(profit.utilidad_estimada_nio)} icon="trending_up" tone="emerald" loading={loading}>
          {profit.margen_estimado_pct == null ? <span>{missingCostLines ? `${missingCostLines} líneas sin costo registrado` : 'Se calculará al registrar ventas'}</span> : <span>Margen estimado {Number(profit.margen_estimado_pct).toFixed(1)}% · menos comisión POS</span>}
          <span>Usa el costo actual del producto</span>
        </MetricCard>
        <MetricCard label={`Compras · ${data?.periodo_label || 'Este mes'}`} value={money(purchases.total_nio)} icon="shopping_bag" tone="amber" loading={loading}>
          <span>{number(purchases.cantidad)} compras registradas</span>
          <span>{number(purchases.unidades)} unidades recibidas</span>
        </MetricCard>
        <MetricCard label="Inventario disponible" value={`${number(inventory.unidades)} uds.`} icon="inventory_2" tone="blue" loading={loading}>
          <span>{number(inventory.productos)} productos con compras</span>
          <span className={Number(inventory.stock_bajo) ? 'font-semibold text-amber-700' : ''}>{number(inventory.stock_bajo)} alertas de stock bajo</span>
        </MetricCard>
      </section>

      <section aria-label="Resumen financiero e inventario" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniMetric label="Cuentas por cobrar" value={money(data?.cuentas_por_cobrar_nio)} caption="Saldo pendiente de facturas" icon="request_quote" />
        <MiniMetric label="Costo conocido en stock" value={money(inventory.valor_costo_conocido_nio)} caption={inventory.productos_sin_costo ? `${inventory.productos_sin_costo} productos requieren costo` : 'Valor calculado al costo actual'} icon="warehouse" />
        <MiniMetric label="Valor de venta del stock" value={money(inventory.valor_venta_nio)} caption="Precio actual × unidades disponibles" icon="sell" />
        <MiniMetric label="Utilidad potencial conocida" value={money(inventory.utilidad_potencial_conocida_nio)} caption="A precio actual y con costos registrados" icon="payments" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">¿Cuánto debería haber en caja y en cuenta?</h2><p className="mt-1 text-sm text-slate-500">Cobros registrados de ventas de {data?.periodo_label?.toLowerCase() || 'este mes'}</p></div>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <ProfitabilityMetric label="Efectivo disponible estimado" value={money(receipts.efectivo_nio)} tone="text-emerald-700" />
          <ProfitabilityMetric label="En cuenta, neto estimado" value={money(receipts.cuenta_esperada_nio)} tone="text-indigo-700" />
          <ProfitabilityMetric label="Saldo sin pago registrado" value={money(receipts.pendiente_nio)} tone="text-amber-700" />
        </div>
        {receipts.por_metodo?.length > 0 && <div className="border-t border-slate-100 px-5 py-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Desglose por método</p><div className="flex flex-wrap gap-2">{receipts.por_metodo.map((method) => <div key={method.metodo} className="rounded-lg bg-slate-50 px-3 py-2 text-xs"><span className="font-medium text-slate-500">{method.metodo}</span><span className="ml-2 font-bold text-slate-800">{money(method.monto_nio)}</span>{Number(method.comision_nio) > 0 && <span className="ml-1 text-slate-400">(comisión {money(method.comision_nio)})</span>}</div>)}</div></div>}
        <p className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs leading-relaxed text-slate-500">Del efectivo recibido ({money(receipts.efectivo_recibido_nio)}) se restan {money(receipts.efectivo_usado_compras_nio)} pagados en efectivo a proveedores. De los cobros de cuenta se descuentan las comisiones y {money(receipts.cuenta_usada_compras_nio)} usados para compras. No incluye otros gastos, retiros ni depósitos manuales; el saldo cubre el período seleccionado y no es una conciliación bancaria.</p>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h2 className="font-bold text-slate-900">Ritmo de operaciones</h2><p className="mt-1 text-sm text-slate-500">Ventas emitidas y compras registradas · últimos 7 días</p></div>
            <div className="flex gap-3 text-xs font-medium text-slate-500"><Legend color="bg-indigo-500" label="Ventas"/><Legend color="bg-amber-400" label="Compras"/></div>
          </div>
          <TrendChart rows={data?.tendencia_7_dias || []} loading={loading} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Por reponer</h2><p className="mt-1 text-sm text-slate-500">Productos en o debajo del mínimo</p></div><Link to="/inventario" className="shrink-0 text-xs font-semibold text-indigo-700 hover:underline">Ver inventario</Link></div>
          <div className="mt-4 divide-y divide-slate-100">
            {loading ? <LoadingRows /> : inventory.alertas?.length ? inventory.alertas.map((item) => <div key={item.producto_id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{item.nombre}</p><p className="text-xs text-slate-400">{item.sku || 'Sin SKU'} · mínimo {number(item.stock_critico)}</p></div><span className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold ${item.stock === 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{item.stock === 0 ? 'Agotado' : `${number(item.stock)} uds.`}</span></div>) : <EmptyState title="Todo en orden" text="No hay productos por debajo de su mínimo." />}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-bold text-slate-900">Productos destacados</h2><p className="mt-1 text-sm text-slate-500">Mayor venta · {data?.periodo_label?.toLowerCase() || 'este mes'}</p></div><Link to="/pos" className="text-xs font-semibold text-indigo-700 hover:underline">Ver ventas</Link></div>
          {loading ? <LoadingRows /> : data?.productos_destacados?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Producto</th><th className="px-3 py-3 text-right">Unidades</th><th className="px-5 py-3 text-right">Ventas</th></tr></thead><tbody className="divide-y divide-slate-100">{data.productos_destacados.map((product) => <tr key={product.producto_id}><td className="px-5 py-3"><p className="font-semibold text-slate-800">{product.nombre}</p><p className="font-mono text-xs text-slate-400">{product.sku || 'Sin SKU'}</p></td><td className="px-3 py-3 text-right text-slate-600">{number(product.unidades)}</td><td className="px-5 py-3 text-right font-semibold text-slate-800">{money(product.ventas_nio)}</td></tr>)}</tbody></table></div> : <EmptyState title="Sin ventas en este período" text="Los productos aparecerán aquí cuando se emitan facturas." />}
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-bold text-slate-900">Movimientos recientes</h2><p className="mt-1 text-sm text-slate-500">Últimas facturas y compras ingresadas</p></div><Link to="/compras" className="text-xs font-semibold text-indigo-700 hover:underline">Ver compras</Link></div>
          {loading ? <LoadingRows /> : <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0"><MovementList title="Ventas" icon="receipt_long" rows={data?.ventas_recientes || []} /><MovementList title="Compras" icon="shopping_bag" rows={data?.compras_recientes || []} purchases /></div>}
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div><h2 className="font-bold text-slate-900">Utilidad potencial por compra a proveedores</h2><p className="mt-1 text-sm text-slate-500">Compras de {data?.periodo_label?.toLowerCase() || 'este mes'} · proyección al precio actual</p></div>
          <Link to="/compras" className="text-xs font-semibold text-indigo-700 hover:underline">Ver compras</Link>
        </div>
        <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3">
          <ProfitabilityMetric label="Inversión en compras" value={money(purchaseProfitability.inversion_nio)} tone="text-slate-800" />
          <ProfitabilityMetric label="Venta potencial" value={money(purchaseProfitability.venta_potencial_nio)} tone="text-indigo-700" />
          <ProfitabilityMetric label="Ganancia potencial" value={money(purchaseProfitability.utilidad_potencial_nio)} tone={Number(purchaseProfitability.utilidad_potencial_nio) >= 0 ? 'text-emerald-700' : 'text-rose-700'} />
        </div>
        {loading ? <LoadingRows /> : purchaseProfitability.compras?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Proveedor y productos</th><th className="px-3 py-3">Fecha</th><th className="px-3 py-3 text-right">Inversión</th><th className="px-3 py-3 text-right">Venta potencial</th><th className="px-5 py-3 text-right">Ganancia</th></tr></thead><tbody className="divide-y divide-slate-100">{purchaseProfitability.compras.map((purchase) => <tr key={purchase.id}><td className="px-5 py-3"><p className="font-semibold text-slate-800">{purchase.proveedor}</p><p className="max-w-sm truncate text-xs text-slate-400">{purchase.productos?.join(', ') || 'Sin detalle'}{purchase.referencia ? ` · ${purchase.referencia}` : ''}</p></td><td className="px-3 py-3 text-slate-500">{date(purchase.fecha, { day: '2-digit', month: 'short', year: 'numeric' })}</td><td className="px-3 py-3 text-right text-slate-600">{money(purchase.inversion_nio)}</td><td className="px-3 py-3 text-right text-slate-600">{money(purchase.venta_potencial_nio)}</td><td className={`px-5 py-3 text-right font-bold ${Number(purchase.utilidad_potencial_nio) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(purchase.utilidad_potencial_nio)}<span className="mt-0.5 block text-[10px] font-medium text-slate-400">{purchase.margen_potencial_pct == null ? '—' : `${Number(purchase.margen_potencial_pct).toFixed(1)}% margen`}</span></td></tr>)}</tbody></table></div> : <EmptyState title="Sin compras en este período" text="Registra compras con productos para estimar su rentabilidad potencial." />}
        <p className="border-t border-slate-100 bg-amber-50/60 px-5 py-3 text-xs leading-relaxed text-amber-900">Estimación suponiendo que se venden todas las unidades al precio actual de cada producto. Es ganancia potencial, no utilidad realizada; las ventas no están vinculadas a lotes específicos de compra.</p>
      </section>
      <p className="px-1 text-xs leading-relaxed text-slate-400">La utilidad es estimada con el costo actual guardado para cada producto; cambios de costo no reescriben el costo histórico de una venta. Los pedidos pendientes no se suman al inventario hasta registrar la compra recibida.{data?.actualizado_en && <span> Actualizado {new Date(data.actualizado_en).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Managua' })}.</span>}</p>
    </div>
  );
}

function MetricCard({ label, value, icon, tone, loading, children }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700', emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700', blue: 'bg-sky-50 text-sky-700',
  };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900">{loading ? <Skeleton className="h-8 w-36"/> : value}</p></div><span className={`material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span></div><div className="mt-4 flex min-h-8 flex-col gap-1 border-t border-slate-100 pt-3 text-xs text-slate-500">{loading ? <Skeleton className="h-3 w-32"/> : children}</div></div>;
}

function MiniMetric({ label, value, caption, icon }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-500">{label}</p><span className="material-symbols-outlined text-lg text-indigo-500">{icon}</span></div><p className="mt-2 truncate text-lg font-bold text-slate-900">{value}</p><p className="mt-1 text-[11px] text-slate-400">{caption}</p></div>;
}

function ProfitabilityMetric({ label, value, tone }) {
  return <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-1 text-xl font-bold tracking-tight ${tone}`}>{value}</p></div>;
}

function TrendChart({ rows, loading }) {
  const max = Math.max(1, ...rows.flatMap((row) => [Number(row.ventas_nio || 0), Number(row.compras_nio || 0)]));
  if (loading) return <div className="mt-6 flex h-48 items-end gap-3 px-1">{Array.from({ length: 7 }, (_, index) => <div key={index} className="flex flex-1 justify-center gap-1"><Skeleton className={`w-4 rounded-t-md ${['h-20', 'h-32', 'h-16', 'h-24', 'h-36', 'h-28', 'h-16'][index]}`} /><Skeleton className="h-24 w-4 rounded-t-md" /></div>)}</div>;
  return <div className="mt-5"><div className="flex h-44 items-end gap-2 border-b border-slate-100 px-1 sm:gap-3">{rows.map((row) => <div key={row.fecha} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><div className="flex h-full w-full items-end justify-center gap-1"><Bar amount={row.ventas_nio} max={max} color="bg-indigo-500" label={`Ventas ${money(row.ventas_nio)}`} /><Bar amount={row.compras_nio} max={max} color="bg-amber-400" label={`Compras ${money(row.compras_nio)}`} /></div><span className="pb-2 text-[10px] text-slate-400">{new Date(`${row.fecha}T12:00:00`).toLocaleDateString('es-NI', { weekday: 'short', day: 'numeric', timeZone: 'America/Managua' })}</span></div>)}</div>{rows.every((row) => !Number(row.ventas_nio) && !Number(row.compras_nio)) && <p className="mt-3 text-center text-xs text-slate-400">Todavía no hay movimientos en estos días.</p>}</div>;
}

function Bar({ amount, max, color, label }) {
  const value = Number(amount || 0);
  return <div title={label} className={`w-3 rounded-t-md transition-all ${value ? color : 'bg-slate-100'}`} style={{ height: `${value ? Math.max(5, value / max * 100) : 3}%` }} />;
}

function Legend({ color, label }) { return <span className="inline-flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-sm ${color}`} />{label}</span>; }

function MovementList({ title, icon, rows, purchases = false }) {
  return <div className="min-w-0 p-4"><h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400"><span className="material-symbols-outlined text-base text-indigo-500">{icon}</span>{title}</h3>{rows.length ? <div className="space-y-1">{rows.slice(0, 5).map((row) => <div key={row.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-slate-50"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-700">{purchases ? row.proveedor : `Factura #${row.id} · ${row.cliente}`}</p><p className="text-[10px] text-slate-400">{date(row.fecha, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div><span className="shrink-0 text-xs font-bold text-slate-800">{money(row.total_nio)}</span></div>)}</div> : <p className="px-2 py-6 text-center text-xs text-slate-400">Sin movimientos aún.</p>}</div>;
}

function EmptyState({ title, text }) { return <div className="px-5 py-10 text-center"><p className="text-sm font-semibold text-slate-600">{title}</p><p className="mt-1 text-xs text-slate-400">{text}</p></div>; }
function LoadingRows() { return <div className="space-y-3 p-5"><Skeleton className="h-9 w-full"/><Skeleton className="h-9 w-full"/><Skeleton className="h-9 w-4/5"/></div>; }
function Skeleton({ className }) { return <span className={`block animate-pulse rounded bg-slate-100 ${className}`} />; }
