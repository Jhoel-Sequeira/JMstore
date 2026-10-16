import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const money = (value) => new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(Number(value || 0));
const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';
const emptyLine = () => ({ producto_id: '', cantidad: 1, costo_unitario_nio: '', nuevo_producto: null });
const apiError = (error) => error.response?.data?.detail || 'No se pudo completar la operación.';

export default function ComprasPage() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState({ cantidad: 0, total_nio: 0, unidades: 0 });
  const [form, setForm] = useState({ marca_id: '', referencia: '', fecha_compra: today(), costo_envio_nio: '', pago_efectivo_nio: '', pago_cuenta_nio: '', observaciones: '', items: [emptyLine()] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [paymentEdits, setPaymentEdits] = useState({});
  const [savingPayment, setSavingPayment] = useState(null);

  const loadData = async () => {
    const [productResponse, brandResponse, purchaseResponse, summaryResponse] = await Promise.all([api.get('/inventario/catalogo'), api.get('/inventario/marcas'), api.get('/compras/'), api.get('/compras/resumen')]);
    setProducts(productResponse.data);
    setBrands(brandResponse.data);
    setPurchases(purchaseResponse.data);
    setSummary(summaryResponse.data);
  };

  useEffect(() => {
    loadData().catch((e) => setError(apiError(e))).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return purchases.filter((purchase) => !term || [purchase.proveedor, purchase.referencia, purchase.id, ...purchase.items.map((item) => item.nombre)]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [purchases, search]);

  const productsCost = form.items.reduce((sum, item) => sum + Number(item.cantidad || 0) * Number(item.costo_unitario_nio || 0), 0);
  const shipping = Number(form.costo_envio_nio || 0);
  const total = productsCost + shipping;
  const units = form.items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
  const supplierProducts = products.filter((product) => String(product.marca_id) === form.marca_id);
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const updateLine = (index, key, value) => setForm((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
  }));

  const selectProduct = (index, productId) => {
    const product = products.find((item) => String(item.id) === productId);
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index
        ? { ...item, producto_id: productId, costo_unitario_nio: product?.costo_nio ?? '', nuevo_producto: productId === 'nuevo' ? { nombre: '', sku: '', codigo_qr: '', precio: '', stock_critico: 5, descripcion: '' } : null }
        : item),
    }));
  };

  const selectSupplier = (brandId) => setForm((current) => ({
    ...current,
    marca_id: brandId,
    items: current.items.map(() => emptyLine()),
  }));

  const removeLine = (index) => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));

  const savePurchase = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    const payload = {
      marca_id: Number(form.marca_id),
      referencia: form.referencia.trim() || null,
      fecha_compra: form.fecha_compra,
      costo_envio_nio: Number(form.costo_envio_nio || 0),
      pago_efectivo_nio: Number(form.pago_efectivo_nio || 0),
      pago_cuenta_nio: Number(form.pago_cuenta_nio || 0),
      observaciones: form.observaciones.trim() || null,
      items: form.items.map((item) => ({
        producto_id: item.producto_id === 'nuevo' ? null : Number(item.producto_id),
        nuevo_producto: item.producto_id === 'nuevo' ? {
          ...item.nuevo_producto,
          precio: item.nuevo_producto.precio ? Number(item.nuevo_producto.precio) : null,
          stock_critico: Number(item.nuevo_producto.stock_critico || 0),
        } : null,
        cantidad: Number(item.cantidad),
        costo_unitario_nio: Number(item.costo_unitario_nio),
      })),
    };
    try {
      const { data } = await api.post('/compras/', payload);
      setMessage(`Compra #${data.id} registrada. Se actualizaron las existencias y costos de los productos.`);
      setForm({ marca_id: '', referencia: '', fecha_compra: today(), costo_envio_nio: '', pago_efectivo_nio: '', pago_cuenta_nio: '', observaciones: '', items: [emptyLine()] });
      await loadData();
    } catch (e) { setError(apiError(e)); }
    finally { setBusy(false); }
  };

  const togglePurchase = (purchase) => {
    setExpanded((current) => current === purchase.id ? null : purchase.id);
    setPaymentEdits((current) => ({ ...current, [purchase.id]: current[purchase.id] || {
      pago_efectivo_nio: Number(purchase.pago_efectivo_nio || 0),
      pago_cuenta_nio: Number(purchase.pago_cuenta_nio || 0),
    } }));
  };

  const savePurchasePayments = async (purchase) => {
    setSavingPayment(purchase.id); setError(''); setMessage('');
    try {
      const edit = paymentEdits[purchase.id] || {};
      await api.patch(`/compras/${purchase.id}/pagos`, {
        pago_efectivo_nio: Number(edit.pago_efectivo_nio || 0),
        pago_cuenta_nio: Number(edit.pago_cuenta_nio || 0),
      });
      setMessage(`Pago de la compra #${purchase.id} actualizado; el dashboard ya refleja el saldo disponible.`);
      await loadData();
    } catch (e) { setError(apiError(e)); }
    finally { setSavingPayment(null); }
  };

  return (
    <main className="w-full min-w-0 space-y-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Abastecimiento e inventario</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Compras</h1><p className="mt-1 text-sm text-slate-500">Registra adquisiciones y actualiza el stock y costo de tus productos.</p></div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3.5 py-2.5 text-xs font-medium text-indigo-800"><span className="material-symbols-outlined text-lg">inventory_2</span>El stock se suma al guardar</div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Compras registradas" value={summary.cantidad} icon="receipt_long" />
        <Metric label="Unidades recibidas" value={summary.unidades} icon="inventory_2" />
        <Metric label="Inversión acumulada" value={money(summary.total_nio)} icon="payments" />
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
        <section className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-indigo-600">Nueva entrada</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Registrar compra</h2>
            <p className="mt-0.5 text-sm text-slate-500">Añade los productos, sus costos y el envío de la compra.</p>
          </div>
          <form onSubmit={savePurchase} className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-600">Marca proveedora *<select value={form.marca_id} onChange={(e) => selectSupplier(e.target.value)} required className={inputClass}><option value="">Selecciona la marca proveedora</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.nombre_marca}</option>)}</select>{!brands.length && <span className="mt-1 block font-normal text-amber-700">Registra primero una marca para usarla como proveedor.</span>}</label>
              <Field label="Fecha de compra *" type="date" value={form.fecha_compra} onChange={(v) => setField('fecha_compra', v)} required />
              <Field label="Factura / referencia" value={form.referencia} onChange={(v) => setField('referencia', v)} maxLength={120} placeholder="N.º de factura o recibo" />
              <Field label="Envío total (C$)" type="number" min="0" step="0.01" value={form.costo_envio_nio} onChange={(v) => setField('costo_envio_nio', v)} placeholder="0.00" />
              <Field label="Pagado en efectivo (C$) *" type="number" min="0" step="0.01" value={form.pago_efectivo_nio} onChange={(v) => setField('pago_efectivo_nio', v)} placeholder="Usa 0 si no aplica" required />
              <Field label="Pagado desde cuenta (C$) *" type="number" min="0" step="0.01" value={form.pago_cuenta_nio} onChange={(v) => setField('pago_cuenta_nio', v)} placeholder="Usa 0 si no aplica" required />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-800">Productos comprados</h3><p className="text-xs text-slate-500">El envío se distribuye entre las líneas según su costo.</p></div><button type="button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, emptyLine()] }))} className="shrink-0 rounded-lg border border-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">+ Agregar producto</button></div>
              <div className="space-y-2">
                {form.items.map((item, index) => {
                  const selected = products.find((product) => String(product.id) === item.producto_id);
                  const availableProducts = supplierProducts.filter((product) => String(product.marca_id) === form.marca_id
                    && (String(product.id) === item.producto_id
                    || !form.items.some((other, otherIndex) => otherIndex !== index && other.producto_id === String(product.id))));
                  return <div key={index} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-[minmax(0,1fr)_88px_118px_34px] sm:items-end">
                    <label className="min-w-0 text-xs font-semibold text-slate-600">Producto<select value={item.producto_id} onChange={(e) => selectProduct(index, e.target.value)} required className={inputClass}><option value="">Selecciona producto</option><option value="nuevo">+ Crear producto nuevo</option>{availableProducts.map((product) => <option key={product.id} value={product.id}>{product.nombre}{product.sku ? ` · ${product.sku}` : ''} ({product.stock} disp.)</option>)}</select>{selected && <span className="mt-1 block truncate text-[11px] font-normal text-slate-400">{selected.marca_nombre || 'Sin marca'} · {selected.stock} en existencia</span>}</label>
                    {item.producto_id === 'nuevo' && <div className="grid gap-2 sm:col-span-4 sm:grid-cols-2"><Field label="Nombre del producto *" value={item.nuevo_producto?.nombre || ''} onChange={(value) => updateLine(index, 'nuevo_producto', { ...item.nuevo_producto, nombre: value })} required maxLength={255} placeholder="Nombre del producto" /><Field label="SKU" value={item.nuevo_producto?.sku || ''} onChange={(value) => updateLine(index, 'nuevo_producto', { ...item.nuevo_producto, sku: value })} maxLength={100} placeholder="Opcional" /><Field label="Precio de venta" type="number" min="0" step="0.01" value={item.nuevo_producto?.precio || ''} onChange={(value) => updateLine(index, 'nuevo_producto', { ...item.nuevo_producto, precio: value })} placeholder="Vacío: costo + 30%" /><Field label="Stock crítico" type="number" min="0" step="1" value={item.nuevo_producto?.stock_critico ?? 5} onChange={(value) => updateLine(index, 'nuevo_producto', { ...item.nuevo_producto, stock_critico: value })} /></div>}
                    <Field label="Cantidad" type="number" min="1" step="1" value={item.cantidad} onChange={(v) => updateLine(index, 'cantidad', v)} required />
                    <Field label="Costo / unidad" type="number" min="0" step="0.01" value={item.costo_unitario_nio} onChange={(v) => updateLine(index, 'costo_unitario_nio', v)} required placeholder="0.00" />
                    <button type="button" disabled={form.items.length === 1} onClick={() => removeLine(index)} aria-label="Quitar producto" className="mb-0.5 flex h-10 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><span className="material-symbols-outlined text-xl">close</span></button>
                  </div>;
                })}
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700">Notas<textarea value={form.observaciones} onChange={(e) => setField('observaciones', e.target.value)} rows="2" className={inputClass} placeholder="Detalles de la compra, condiciones o comentarios" /></label>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3"><Summary label={`Productos · ${units} uds.`} value={money(productsCost)} /><Summary label="Envío" value={money(shipping)} /><Summary label="Total de compra" value={money(total)} emphasis /></div>
              <p className="mt-2 text-[11px] text-slate-500">Pagado: {money(Number(form.pago_efectivo_nio || 0) + Number(form.pago_cuenta_nio || 0))} · pendiente al proveedor: {money(Math.max(0, total - Number(form.pago_efectivo_nio || 0) - Number(form.pago_cuenta_nio || 0)))}</p>
            </div>
            <button type="submit" disabled={busy || !brands.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><span className="material-symbols-outlined text-lg">add_shopping_cart</span>{busy ? 'Guardando compra…' : 'Registrar compra'}</button>
          </form>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-indigo-600">Historial</p><h2 className="mt-1 text-lg font-bold text-slate-900">Compras recientes</h2><p className="mt-0.5 text-sm text-slate-500">{filtered.length} registros</p></div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar proveedor o producto…" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 sm:max-w-64" />
          </div>
          {loading ? <div className="p-10 text-center text-sm text-slate-500">Cargando compras…</div> : !filtered.length ? <div className="px-5 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><span className="material-symbols-outlined">shopping_bag</span></div><p className="mt-3 font-semibold text-slate-700">{purchases.length ? 'No encontramos compras' : 'Aún no hay compras registradas'}</p><p className="mt-1 text-sm text-slate-500">{purchases.length ? 'Prueba con otro proveedor, referencia o producto.' : 'Registra tu primera compra usando el formulario.'}</p></div> : <div className="divide-y divide-slate-100">
            {filtered.map((purchase) => <article key={purchase.id} className="px-5 py-4 transition hover:bg-slate-50/70">
              <button type="button" onClick={() => togglePurchase(purchase)} className="flex w-full items-center justify-between gap-3 text-left">
                <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><span className="material-symbols-outlined">receipt_long</span></div><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{purchase.proveedor}</p><p className="mt-0.5 text-xs text-slate-500">{new Date(`${purchase.fecha_compra.slice(0, 10)}T00:00:00`).toLocaleDateString('es-NI')} · {purchase.items.length} productos{purchase.referencia ? ` · ${purchase.referencia}` : ''}</p></div></div>
                <div className="flex shrink-0 items-center gap-3"><div className="text-right"><p className="font-bold text-slate-900">{money(purchase.total_nio)}</p><p className="text-[11px] text-slate-500">{purchase.items.reduce((sum, item) => sum + Number(item.cantidad), 0)} unidades</p></div><span className={`material-symbols-outlined text-slate-400 transition-transform ${expanded === purchase.id ? 'rotate-180' : ''}`}>expand_more</span></div>
              </button>
              {expanded === purchase.id && <div className="ml-13 mt-3 rounded-xl bg-slate-50 px-3.5 py-3"><div className="space-y-2">{purchase.items.map((item) => <div key={item.producto_id} className="flex items-center justify-between gap-3 text-xs"><div className="min-w-0"><p className="truncate font-medium text-slate-700">{item.nombre}</p><p className="text-slate-400">{item.marca_nombre || 'Sin marca'} · {item.cantidad} × {money(item.costo_unitario_nio)}</p></div><p className="shrink-0 font-semibold text-slate-700">{money(item.subtotal_nio)}</p></div>)}</div><div className="mt-3 flex justify-between border-t border-slate-200 pt-2 text-xs text-slate-500"><span>Productos {money(purchase.costo_productos_nio)} + envío {money(purchase.costo_envio_nio)}</span><span className="font-bold text-slate-800">Total {money(purchase.total_nio)}</span></div><div className="mt-4 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><Field label="Pagado en efectivo (C$)" type="number" min="0" max={purchase.total_nio} step="0.01" value={paymentEdits[purchase.id]?.pago_efectivo_nio ?? 0} onChange={(value) => setPaymentEdits((current) => ({ ...current, [purchase.id]: { ...current[purchase.id], pago_efectivo_nio: value } }))} /><Field label="Pagado desde cuenta (C$)" type="number" min="0" max={purchase.total_nio} step="0.01" value={paymentEdits[purchase.id]?.pago_cuenta_nio ?? 0} onChange={(value) => setPaymentEdits((current) => ({ ...current, [purchase.id]: { ...current[purchase.id], pago_cuenta_nio: value } }))} /><button type="button" disabled={savingPayment === purchase.id} onClick={() => savePurchasePayments(purchase)} className="rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{savingPayment === purchase.id ? 'Guardando…' : 'Guardar pagos'}</button></div><p className="mt-2 text-[11px] text-slate-500">Puedes dividir el pago. La parte no pagada no se descuenta del saldo disponible.</p>{purchase.observaciones && <p className="mt-2 text-xs text-slate-500">{purchase.observaciones}</p>}</div>}
            </article>)}
          </div>}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, icon }) { return <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><span className="material-symbols-outlined">{icon}</span></div><div><p className="text-sm text-slate-500">{label}</p><p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p></div></div>; }
function Summary({ label, value, emphasis = false }) { return <div><p className="text-[11px] text-slate-500">{label}</p><p className={`mt-1 font-bold ${emphasis ? 'text-base text-indigo-700' : 'text-sm text-slate-800'}`}>{value}</p></div>; }
function Field({ label, value, onChange, ...props }) { return <label className="block min-w-0 text-xs font-semibold text-slate-600">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} {...props} /></label>; }
