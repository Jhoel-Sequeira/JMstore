import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { getTheme } from '../services/theme';

const money = (value) => new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(Number(value || 0));
const fmtDate = (value) => {
  if (!value) return '—';
  const [datePart, timePart = '00:00:00'] = String(value).replace(' ', 'T').split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, second).toLocaleString('es-NI');
};
const toDateTimeLocal = (value) => value ? String(value).replace(' ', 'T').slice(0, 16) : '';
const invoiceNumber = (id) => `FV-${String(id).padStart(6, '0')}`;

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [methods, setMethods] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [cart, setCart] = useState([]);
  const [payments, setPayments] = useState([{ metodo_pago_id: '', monto: '', comision_porcentaje: 0 }]);
  const [term, setTerm] = useState('1');
  const [clientId, setClientId] = useState('');
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('todos');
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [activeTab, setActiveTab] = useState('facturar');
  const [salesFilter, setSalesFilter] = useState('todas');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ nombre_cliente: '', telefono: '', correo: '' });
  const [abono, setAbono] = useState({ metodo_pago_id: '', monto: '', comision_porcentaje: 0 });
  const [paymentDates, setPaymentDates] = useState({});
  const [savingPaymentDate, setSavingPaymentDate] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadAll = async () => {
    const [catalogResult, clientsResult, invoiceResult] = await Promise.all([
      api.get('/pos/catalog'), api.get('/clientes/'), api.get('/pos/?limit=500'),
    ]);
    setProducts(catalogResult.data.productos || []);
    setMethods(catalogResult.data.metodos_pago || []);
    setClients(clientsResult.data || []);
    setInvoices(invoiceResult.data || []);
    const walkIn = clientsResult.data?.find((client) => client.nombre_cliente.toLowerCase() === 'consumidor final');
    if (walkIn) setClientId((current) => current || String(walkIn.id));
  };

  useEffect(() => {
    loadAll().catch((e) => setError(e.response?.data?.detail || 'No se pudieron cargar productos, clientes o métodos de pago.'))
      .finally(() => setLoading(false));
  }, []);

  const subtotal = useMemo(() => Math.round(cart.reduce((sum, row) => sum + Math.max(0, row.product.precio * row.cantidad - Number(row.descuento || 0)), 0) * 100) / 100, [cart]);
  const paidAmount = useMemo(() => payments.reduce((sum, row) => sum + Number(row.monto || 0), 0), [payments]);
  const commission = useMemo(() => payments.reduce((sum, row) => sum + Number(row.monto || 0) * Number(row.comision_porcentaje || 0) / 100, 0), [payments]);
  const balance = Math.round((subtotal - paidAmount) * 100) / 100;
  const installmentAmount = Math.round((subtotal / Math.max(1, Number(term) || 1)) * 100) / 100;
  const pendingInvoices = invoices.filter((invoice) => Number(invoice.saldo_pendiente) > 0).length;
  const outstandingTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.saldo_pendiente || 0), 0);
  const visibleProducts = products.filter((product) => [product.nombre, product.sku, product.marca_nombre]
    .some((value) => String(value || '').toLowerCase().includes(query.trim().toLowerCase()))
    && (stockFilter === 'todos' || Number(product.stock) <= 3));

  useEffect(() => {
    if (payments.length === 1) setPayments((current) => [{ ...current[0], monto: subtotal.toFixed(2) }]);
  }, [subtotal, payments.length]);

  const addToCart = (product) => setCart((current) => {
    const existing = current.find((row) => row.product.id === product.id);
    if (existing) return current.map((row) => row.product.id === product.id && row.cantidad < product.stock ? { ...row, cantidad: row.cantidad + 1 } : row);
    return [...current, { product, cantidad: 1, descuento: 0 }];
  });
  const changeQty = (productId, next) => setCart((current) => current.map((row) => {
    if (row.product.id !== productId) return row;
    const cantidad = Math.max(1, Math.min(row.product.stock, Number(next) || 1));
    return { ...row, cantidad, descuento: Math.min(Number(row.descuento || 0), row.product.precio * cantidad) };
  }));
  const changeDiscount = (productId, next) => setCart((current) => current.map((row) => row.product.id === productId
    ? { ...row, descuento: Math.max(0, Math.min(row.product.precio * row.cantidad, Number(next) || 0)) } : row));
  const removeFromCart = (productId) => setCart((current) => current.filter((row) => row.product.id !== productId));
  const addPayment = () => {
    const due = Math.max(0, subtotal - payments.reduce((sum, row) => sum + Number(row.monto || 0), 0));
    setPayments((current) => [...current, { metodo_pago_id: '', monto: due.toFixed(2), comision_porcentaje: 0 }]);
  };
  const changePayment = (index, key, value) => setPayments((current) => current.map((row, i) => i === index ? { ...row, [key]: value } : row));
  const removePayment = (index) => setPayments((current) => current.filter((_, i) => i !== index));

  const issueInvoice = async () => {
    setError(''); setMessage('');
    if (!cart.length) { setError('Agrega al menos un producto a la factura.'); return; }
    if (!clientId) { setError('Selecciona un cliente.'); return; }
    const validPayments = payments.filter((row) => Number(row.monto) > 0);
    const paid = validPayments.reduce((sum, row) => sum + Number(row.monto), 0);
    if (paid > subtotal + 0.001) { setError('Los abonos no pueden superar el total de la factura.'); return; }
    if (validPayments.some((row) => !row.metodo_pago_id)) { setError('Selecciona un método para cada abono.'); return; }
    const client = clients.find((row) => String(row.id) === String(clientId));
    if (paid < subtotal && client?.nombre_cliente.toLowerCase() === 'consumidor final') {
      setError('Para dejar un saldo pendiente, selecciona o registra el nombre del cliente.'); return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/pos/', {
        cliente_id: Number(clientId),
        items: cart.map((row) => ({ producto_id: row.product.id, cantidad: row.cantidad, descuento: Number(row.descuento || 0) })),
        pagos: validPayments.map((row) => ({ metodo_pago_id: Number(row.metodo_pago_id), monto: Number(row.monto), comision_porcentaje: Number(row.comision_porcentaje || 0) })),
      });
      setSelectedInvoice(data);
      setCart([]);
      setPayments([{ metodo_pago_id: '', monto: '', comision_porcentaje: 0 }]);
      setTerm('1');
      setMessage(`Factura ${invoiceNumber(data.id)} emitida${Number(data.saldo_pendiente) ? ` con saldo de ${money(data.saldo_pendiente)}` : ''}.`);
      await loadAll();
    } catch (e) { setError(e.response?.data?.detail || 'No se pudo emitir la factura.'); }
    finally { setBusy(false); }
  };

  const createClient = async (event) => {
    event.preventDefault(); setError('');
    try {
      const { data } = await api.post('/clientes/', clientForm);
      setClients((current) => [...current, data].sort((a, b) => a.nombre_cliente.localeCompare(b.nombre_cliente, 'es')));
      setClientId(String(data.id)); setNewClientOpen(false); setClientForm({ nombre_cliente: '', telefono: '', correo: '' });
    } catch (e) { setError(e.response?.data?.detail || 'No se pudo registrar el cliente.'); }
  };

  const showInvoice = async (id) => {
    try {
      const { data } = await api.get(`/pos/${id}`);
      setSelectedInvoice(data);
      setPaymentDates(Object.fromEntries((data.pagos || []).map((payment) => [payment.id, toDateTimeLocal(payment.fecha_pago)])));
      setAbono({ metodo_pago_id: String(methods[0]?.id || ''), monto: '', comision_porcentaje: 0 });
    } catch (e) { setError(e.response?.data?.detail || 'No se pudo abrir la factura.'); }
  };

  const savePaymentDate = async (payment) => {
    const fecha = paymentDates[payment.id];
    if (!fecha) return;
    setSavingPaymentDate(payment.id); setError(''); setMessage('');
    try {
      await api.patch(`/pos/abonos/${payment.id}/fecha`, { fecha_pago: fecha });
      const { data } = await api.get(`/pos/${selectedInvoice.id}`);
      setSelectedInvoice(data);
      setPaymentDates(Object.fromEntries((data.pagos || []).map((row) => [row.id, toDateTimeLocal(row.fecha_pago)])));
      setMessage('Fecha del abono actualizada; el dashboard lo contará en ese período.');
      await loadAll();
    } catch (e) { setError(e.response?.data?.detail || 'No se pudo actualizar la fecha del abono.'); }
    finally { setSavingPaymentDate(null); }
  };

  const registerAbono = async (event) => {
    event.preventDefault();
    if (!selectedInvoice || !abono.metodo_pago_id || Number(abono.monto) <= 0) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.post(`/pos/${selectedInvoice.id}/abonos`, {
        metodo_pago_id: Number(abono.metodo_pago_id), monto: Number(abono.monto),
        comision_porcentaje: Number(abono.comision_porcentaje || 0),
      });
      setSelectedInvoice(data);
      setAbono({ metodo_pago_id: String(methods[0]?.id || ''), monto: '', comision_porcentaje: 0 });
      setMessage(`Abono guardado en ${invoiceNumber(data.id)}. Saldo restante: ${money(data.saldo_pendiente)}.`);
      await loadAll();
    } catch (e) { setError(e.response?.data?.detail || 'No se pudo registrar el abono.'); }
    finally { setBusy(false); }
  };

  return <main className="w-full space-y-3 pb-2">
    <style>{`@media (max-width: 767px) { .pos-layout { display: flex !important; flex-direction: column !important; } } @media print { body * { visibility: hidden !important; } .print-invoice, .print-invoice * { visibility: visible !important; } .print-invoice { position: fixed; inset: 0; width: 100%; padding: 24px; background: white; overflow: visible; } .print-invoice, .print-invoice * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .no-print { display: none !important; } }`}</style>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">Ventas y comprobantes</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Facturación</h1><p className="mt-1 text-sm text-slate-500">Registra ventas, cobra en uno o varios abonos y emite la factura.</p></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Facturas" value={invoices.length} />
        <Metric label="Con saldo" value={pendingInvoices} />
        <Metric label="Por cobrar" value={money(outstandingTotal)} accent />
      </div>
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

    <nav className="flex w-fit gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1" aria-label="Facturación y ventas">
      <button onClick={() => setActiveTab('facturar')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === 'facturar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><span className="material-symbols-outlined mr-2 align-middle text-base">point_of_sale</span>Facturar</button>
      <button onClick={() => setActiveTab('cuentas')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === 'cuentas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><span className="material-symbols-outlined mr-2 align-middle text-base">receipt_long</span>Ventas y cuentas</button>
    </nav>

    {activeTab === 'facturar' && <section className="space-y-2">
      <div className="rounded-2xl border border-slate-200 border-l-4 border-l-indigo-600 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Punto de venta</p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">Prepara una nueva venta</h2>
            <p className="mt-0.5 text-xs text-slate-500">Busca productos, elige al cliente y registra el pago.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2">
            <span className="material-symbols-outlined rounded-lg bg-white p-1.5 text-indigo-600">shopping_bag</span>
            <div><p className="text-xs text-slate-500">Artículos en la venta</p><p className="text-lg font-bold text-slate-900">{cart.reduce((sum, row) => sum + row.cantidad, 0)}</p></div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500"><span><b className="mr-1 text-indigo-700">01</b>Productos</span><span><b className="mr-1 text-indigo-700">02</b>Pago</span><span><b className="mr-1 text-indigo-700">03</b>Factura</span></div>
      </div>

      <div className="pos-layout grid min-w-0 items-start gap-3" style={{ marginTop: 8, gridTemplateColumns: 'minmax(0, 1fr) 370px' }}>
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-1.5 border-b border-slate-100 p-2.5 sm:p-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><div className="flex items-center gap-2"><span className="material-symbols-outlined text-indigo-600">auto_awesome</span><h3 className="font-bold text-slate-900">Catálogo de perfumes</h3></div><p className="mt-1 text-sm text-slate-500">{visibleProducts.length} productos disponibles para agregar</p></div>
              <label className="relative w-full sm:max-w-sm"><span className="sr-only">Buscar productos</span><span style={{ position: 'absolute', left: 12, top: 10, pointerEvents: 'none' }} className="material-symbols-outlined z-10 text-lg text-slate-400">search</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nombre, SKU o marca" style={{ paddingLeft: 40 }} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" /></label>
            </div>
            <div className="flex flex-wrap items-center gap-2" aria-label="Filtrar productos por stock">
              {[['todos', 'Todos los disponibles'], ['bajo', 'Stock bajo']].map(([value, label]) => <button key={value} type="button" onClick={() => setStockFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${stockFilter === value ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700'}`}>{label}</button>)}
            </div>
          </div>
          {loading ? <div className="p-8 text-center"><span className="material-symbols-outlined animate-pulse text-2xl text-indigo-400">hourglass_top</span><p className="mt-1 text-sm text-slate-500">Cargando catálogo...</p></div> : !visibleProducts.length ? <div className="p-8 text-center"><span className="material-symbols-outlined text-3xl text-slate-300">inventory_2</span><p className="mt-1 font-semibold text-slate-700">No encontramos productos</p><p className="mt-1 text-xs text-slate-500">Prueba con otro nombre, SKU o marca.</p></div> : <div className="grid grid-cols-1 gap-2 bg-slate-50/60 p-2 sm:grid-cols-2 2xl:grid-cols-3">{visibleProducts.map((product) => <button key={product.id} onClick={() => addToCart(product)} className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2 text-left shadow-sm transition duration-150 hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-100">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-indigo-50">
              {!product.imagen_url && <span className="material-symbols-outlined text-2xl text-indigo-300">local_mall</span>}
              {product.imagen_url && <img src={product.imagen_url} alt={product.nombre} loading="lazy" className="h-full w-full object-contain p-1 transition duration-300 group-hover:scale-105" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-bold uppercase tracking-wide text-indigo-600">{product.marca_nombre || 'Perfume'} <span className="font-normal text-slate-300">|</span> {product.sku || `#${product.id}`}</p>
              <p className="truncate text-xs font-semibold leading-4 text-slate-900">{product.nombre}</p>
              <p className={`mt-0.5 text-[10px] font-medium ${Number(product.stock) <= 3 ? 'text-amber-700' : 'text-slate-500'}`}>{product.stock} en stock</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 pl-1">
              <span className="text-xs font-bold text-slate-950">{money(product.precio)}</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-700"><span>Agregar</span><span className="material-symbols-outlined text-sm">add</span></span>
            </div>
          </button>)}</div>}
        </section>

        <aside className="space-y-2 xl:sticky xl:top-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-2 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Paso 1</p><h3 className="mt-1 font-bold text-slate-900">Cliente</h3></div><button onClick={() => setNewClientOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"><span className="material-symbols-outlined text-base">person_add</span>Nuevo</button></div><select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"><option value="">Seleccionar cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nombre_cliente}{client.telefono ? ` ? ${client.telefono}` : ''}</option>)}</select></section>

          <section style={{ marginTop: 8 }} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2.5"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Paso 2</p><h3 className="mt-1 font-bold text-slate-900">Detalle de la venta</h3><p className="mt-0.5 text-xs text-slate-500">{cart.length} productos seleccionados</p></div><span className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><span className="material-symbols-outlined">receipt_long</span></span></div>
            <div className="max-h-[150px] space-y-2 overflow-y-auto bg-slate-50/60 p-2">{!cart.length ? <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-center"><span className="material-symbols-outlined inline-flex rounded-full bg-indigo-50 p-2 text-xl text-indigo-400">shopping_cart</span><p className="mt-2 text-sm font-semibold text-slate-700">El carrito esta vacio</p><p className="mt-1 text-xs text-slate-500">Selecciona un perfume del catalogo.</p></div> : cart.map((row) => <div key={row.product.id} className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm"><div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50"><span className="material-symbols-outlined text-indigo-500">local_mall</span></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{row.product.nombre}</p><p className="mt-0.5 text-xs text-slate-500">{row.product.marca_nombre || 'Perfume'} · {money(row.product.precio)} c/u</p></div><button onClick={() => removeFromCart(row.product.id)} className="rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Quitar producto"><span className="material-symbols-outlined text-lg">close</span></button></div><div className="mt-1.5 grid grid-cols-[60px_minmax(0,1fr)_auto] items-end gap-1.5 border-t border-slate-100 pt-1.5"><label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cantidad<input type="number" min="1" max={row.product.stock} value={row.cantidad} onChange={(e) => changeQty(row.product.id, e.target.value)} className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" /></label><label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Descuento<input type="number" min="0" step="0.01" value={row.descuento} onChange={(e) => changeDiscount(row.product.id, e.target.value)} className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" /></label><div className="pb-1 text-right"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Importe</p><p className="mt-1 whitespace-nowrap text-sm font-bold text-slate-900">{money(row.product.precio * row.cantidad - row.descuento)}</p></div></div></div>)}</div>
            <div className="space-y-2 border-t border-slate-100 bg-white p-2.5"><div className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-2"><p className="text-xs font-medium text-slate-500">Total de venta</p><p className="text-base font-bold text-slate-950">{money(subtotal)}</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-xs font-medium text-slate-500">Saldo por cobrar</p><p className={`text-base font-bold ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{money(Math.max(0, balance))}</p></div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-bold tracking-tight text-slate-900">Paso 3 · Pago inicial</p><p className="text-[11px] text-slate-500">Puedes dividirlo o dejar saldo.</p></div><button onClick={addPayment} disabled={!subtotal || payments.length >= 5} className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-40"><span className="material-symbols-outlined text-sm">call_split</span>Dividir pago</button></div><div className="space-y-2"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 p-2"><label className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Plazo<select value={term} onChange={(event) => setTerm(event.target.value)} className="mt-1 block w-full rounded-lg border border-indigo-100 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">{Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? "cuota" : "cuotas"}</option>)}</select></label><div className="text-right"><p className="text-[9px] font-bold uppercase tracking-wide text-indigo-600">Cada cuota</p><p className="text-sm font-bold text-slate-900">{money(installmentAmount)}</p><p className="text-[9px] text-slate-500">Sobre el total, sin intereses</p></div></div>{payments.map((payment, index) => <div key={index} className="grid grid-cols-[1fr_.8fr_60px_24px] gap-1.5 rounded-lg border border-slate-100 bg-slate-50 p-1.5"><select value={payment.metodo_pago_id} onChange={(e) => changePayment(index, 'metodo_pago_id', e.target.value)} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"><option value="">Metodo</option>{methods.map((method) => <option key={method.id} value={method.id}>{method.nombre}</option>)}</select><input aria-label="Monto del abono" type="number" min="0" step="0.01" value={payment.monto} onChange={(e) => changePayment(index, 'monto', e.target.value)} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="Monto"/><input aria-label="Comision porcentual" title="Comision POS %" type="number" min="0" max="100" step="0.01" value={payment.comision_porcentaje} onChange={(e) => changePayment(index, 'comision_porcentaje', e.target.value)} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="0"/>{payments.length > 1 ? <button onClick={() => removePayment(index)} className="text-slate-400 hover:text-red-600" aria-label="Quitar pago"><span className="material-symbols-outlined text-base">close</span></button> : <span />}</div>)}</div><div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-medium"><span className="text-slate-500">Recibido {money(paidAmount)}</span><span className="text-slate-500">Comision {money(commission)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-indigo-50"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${subtotal ? Math.min(100, Math.max(0, paidAmount / subtotal * 100)) : 0}%` }} /></div></div>
              <button onClick={issueInvoice} disabled={busy || !cart.length || !methods.length || balance < -0.001} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><span className="material-symbols-outlined text-lg">task_alt</span>{busy ? 'Guardando venta...' : 'Emitir factura'}</button>
              <p className="text-center text-[11px] text-slate-500">La venta se registra y descuenta del inventario al emitir la factura.</p>
            </div>
          </section>
        </aside>
      </div>
    </section>}



    {activeTab === 'cuentas' && <SalesAccounts invoices={invoices} query={invoiceQuery} setQuery={setInvoiceQuery} filter={salesFilter} setFilter={setSalesFilter} onOpen={showInvoice} />}

    {newClientOpen && <Modal title="Registrar cliente" onClose={() => setNewClientOpen(false)}><form onSubmit={createClient} className="space-y-3"><Input label="Nombre completo *" required value={clientForm.nombre_cliente} onChange={(v) => setClientForm({ ...clientForm, nombre_cliente: v })}/><Input label="Teléfono" value={clientForm.telefono} onChange={(v) => setClientForm({ ...clientForm, telefono: v })}/><Input label="Correo" type="email" value={clientForm.correo} onChange={(v) => setClientForm({ ...clientForm, correo: v })}/><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setNewClientOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button><button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Guardar cliente</button></div></form></Modal>}
    {selectedInvoice && <Modal title={`Factura ${invoiceNumber(selectedInvoice.id)}`} onClose={() => setSelectedInvoice(null)} wide><Invoice invoice={selectedInvoice} onPrint={() => window.print()} paymentDates={paymentDates} onPaymentDateChange={(id, value) => setPaymentDates((current) => ({ ...current, [id]: value }))} onSavePaymentDate={savePaymentDate} savingPaymentDate={savingPaymentDate} /><div className="no-print mt-5 border-t border-slate-100 pt-5">{Number(selectedInvoice.saldo_pendiente) > 0 ? <form onSubmit={registerAbono} className="grid gap-3 rounded-xl bg-amber-50 p-4 sm:grid-cols-[1fr_1fr_.7fr_auto] sm:items-end"><div className="sm:col-span-4"><p className="font-bold text-slate-900">Registrar abono</p><p className="text-xs text-slate-600">Saldo actual: {money(selectedInvoice.saldo_pendiente)}</p></div><label className="text-xs font-medium text-slate-600">Método<select required value={abono.metodo_pago_id} onChange={(e) => setAbono({ ...abono, metodo_pago_id: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Seleccionar</option>{methods.map((method) => <option key={method.id} value={method.id}>{method.nombre}</option>)}</select></label><label className="text-xs font-medium text-slate-600">Monto<input required type="number" min="0.01" max={selectedInvoice.saldo_pendiente} step="0.01" value={abono.monto} onChange={(e) => setAbono({ ...abono, monto: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="C$"/></label><label className="text-xs font-medium text-slate-600">Comisión %<input type="number" min="0" max="100" step="0.01" value={abono.comision_porcentaje} onChange={(e) => setAbono({ ...abono, comision_porcentaje: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/></label><button disabled={busy || Number(abono.monto) > Number(selectedInvoice.saldo_pendiente)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar abono'}</button></form> : <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Factura pagada completamente.</p>}</div></Modal>}
  </main>;
}

function SalesAccounts({ invoices, query, setQuery, filter, setFilter, onOpen }) {
  const totalSales = invoices.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const collected = invoices.reduce((sum, sale) => sum + Number(sale.monto_pagado || 0), 0);
  const receivable = invoices.reduce((sum, sale) => sum + Number(sale.saldo_pendiente || 0), 0);
  const debtorsByName = invoices.reduce((groups, sale) => {
    const debt = Number(sale.saldo_pendiente || 0);
    const key = sale.cliente_id || sale.cliente_nombre.toLocaleLowerCase();
    const current = groups.get(key) || { nombre: sale.cliente_nombre, facturas: 0, cuotas: 0, total: 0, pagado: 0, debe: 0 };
    if (debt > 0) current.facturas += 1;
    current.cuotas += Number(sale.cuotas || 0);
    current.total += Number(sale.total || 0);
    current.pagado += Number(sale.monto_pagado || 0);
    current.debe += debt;
    groups.set(key, current);
    return groups;
  }, new Map());
  const debtors = [...debtorsByName.values()].filter((client) => client.debe > 0).sort((a, b) => b.debe - a.debe);
  const filtered = invoices.filter((sale) => {
    const matchesSearch = !query || String(sale.id).includes(query.trim()) || sale.cliente_nombre.toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = filter === 'todas' || (filter === 'pendientes' ? Number(sale.saldo_pendiente) > 0 : Number(sale.saldo_pendiente) <= 0);
    return matchesSearch && matchesStatus;
  });

  return <section className="space-y-5">
    <div><h2 className="text-xl font-bold text-slate-900">Ventas y cuentas por cobrar</h2><p className="mt-1 text-sm text-slate-500">Consulta quién tiene saldo, cuánto ha abonado y el número de cuotas registradas.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><AccountMetric label="Ventas facturadas" value={money(totalSales)} icon="receipt_long"/><AccountMetric label="Total cobrado" value={money(collected)} icon="payments"/><AccountMetric label="Saldo pendiente" value={money(receivable)} icon="account_balance_wallet" amber/><AccountMetric label="Clientes con deuda" value={debtors.length} icon="groups" amber/></div>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><div><h3 className="font-bold text-slate-900">Resumen por cliente</h3><p className="text-sm text-slate-500">Deuda acumulada en facturas pendientes y cuotas ya pagadas.</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3 text-right">Facturas pendientes</th><th className="px-4 py-3 text-right">Cuotas registradas</th><th className="px-4 py-3 text-right">Total vendido</th><th className="px-4 py-3 text-right">Abonado</th><th className="px-4 py-3 text-right">Debe</th></tr></thead><tbody className="divide-y divide-slate-100">{debtors.map((client) => <tr key={client.nombre} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-800">{client.nombre}</td><td className="px-4 py-3 text-right">{client.facturas}</td><td className="px-4 py-3 text-right">{client.cuotas}</td><td className="px-4 py-3 text-right">{money(client.total)}</td><td className="px-4 py-3 text-right">{money(client.pagado)}</td><td className="px-4 py-3 text-right font-bold text-amber-700">{money(client.debe)}</td></tr>)}{!debtors.length && <tr><td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">No hay clientes con deuda pendiente.</td></tr>}</tbody></table></div></div>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h3 className="font-bold text-slate-900">Detalle de ventas</h3><p className="text-sm text-slate-500">{filtered.length} de {invoices.length} facturas</p></div><div className="flex w-full flex-wrap gap-2 sm:w-auto"><div className="flex rounded-lg bg-slate-100 p-1">{[['todas','Todas'],['pendientes','Con saldo'],['pagadas','Pagadas']].map(([key,label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>{label}</button>)}</div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Factura o cliente" className="min-w-[180px] rounded-lg border border-slate-200 px-3 py-2 text-sm"/></div></div><div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Factura / Fecha</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3 text-right">Cuotas</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Abonado</th><th className="px-4 py-3 text-right">Debe</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((sale) => <tr key={sale.id} className="hover:bg-slate-50"><td className="px-4 py-3"><b className="font-mono text-indigo-700">{invoiceNumber(sale.id)}</b><span className="mt-1 block text-xs text-slate-500">{fmtDate(sale.fecha_venta)}</span></td><td className="px-4 py-3 font-medium text-slate-800">{sale.cliente_nombre}</td><td className="px-4 py-3 text-right">{sale.cuotas || 0}</td><td className="px-4 py-3 text-right font-semibold">{money(sale.total)}</td><td className="px-4 py-3 text-right text-emerald-700">{money(sale.monto_pagado)}</td><td className={`px-4 py-3 text-right font-bold ${Number(sale.saldo_pendiente) ? 'text-amber-700' : 'text-slate-500'}`}>{money(sale.saldo_pendiente)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sale.estado_pago === 'Pagada' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{sale.estado_pago}</span></td><td className="px-4 py-3 text-right"><button onClick={() => onOpen(sale.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">{Number(sale.saldo_pendiente) ? 'Ver / abonar' : 'Ver factura'}</button></td></tr>)}{!filtered.length && <tr><td colSpan="8" className="px-4 py-10 text-center text-sm text-slate-500">No se encontraron ventas con estos filtros.</td></tr>}</tbody></table></div></div>
  </section>;
}

function AccountMetric({ label, value, icon, amber = false }) { return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className={`material-symbols-outlined rounded-xl p-2 ${amber ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>{icon}</span><div><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 text-lg font-bold text-slate-900">{value}</p></div></div>; }
function Metric({ label, value, accent = false }) { return <div className="min-w-[105px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"><p className="text-[11px] font-medium text-slate-500">{label}</p><p className={`mt-0.5 text-sm font-bold ${accent ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p></div>; }
function Modal({ title, onClose, children, wide = false }) { return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" className={`my-auto w-full ${wide ? 'max-w-3xl' : 'max-w-md'} overflow-hidden rounded-2xl bg-white shadow-2xl`}><div className="flex items-center justify-between border-b p-4"><h2 className="font-bold text-slate-900">{title}</h2><button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">×</button></div><div className="max-h-[85vh] overflow-y-auto p-5">{children}</div></section></div>; }
function Input({ label, value, onChange, ...props }) { return <label className="block text-sm font-medium text-slate-700">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" {...props}/></label>; }
function Invoice({ invoice, onPrint, paymentDates, onPaymentDateChange, onSavePaymentDate, savingPaymentDate }) {
  const theme = getTheme();
  const style = theme.invoiceStyle || 'minimalista';
  const headerStyle = style === 'minimalista'
    ? { borderColor: theme.primary }
    : style === 'elegante'
      ? { background: 'linear-gradient(120deg,#172033,#344256 62%,#8b6a3e)', color: '#fff' }
      : { background: `linear-gradient(120deg,${theme.primary},color-mix(in srgb,${theme.primary} 62%,${theme.secondary}),color-mix(in srgb,${theme.primary} 48%,${theme.accent}))`, color: '#fff' };
  const mutedClass = style === 'minimalista' ? 'text-slate-500' : 'text-white/75';

  return (
    <div className="print-invoice" data-invoice-style={style} style={{ fontFamily: `'${theme.font || 'Arial'}', sans-serif` }}>
      <div className="no-print mb-4 flex justify-end">
        <button onClick={onPrint} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: theme.primary }}>Imprimir / Guardar PDF</button>
      </div>
      <header className={`flex flex-wrap items-center justify-between gap-4 border-b-2 pb-4 ${style === 'minimalista' ? '' : 'rounded-xl px-4 py-4'}`} style={headerStyle}>
        <div className="flex items-center gap-3">
          {theme.logo && <img src={theme.logo} alt={`Logo ${theme.brandName}`} className="h-14 w-20 object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
          <div><p className="text-base font-extrabold tracking-tight">{theme.brandName || 'JMscents'}</p><p className={`mt-1 text-xs ${style === 'minimalista' ? 'text-slate-500' : 'text-white/75'}`}>{theme.quoteTagline || 'Perfumería · Atención personalizada'}</p></div>
        </div>
        <div className="text-left sm:text-right"><p className="text-xs font-bold uppercase tracking-[.18em]" style={{ color: style === 'minimalista' ? theme.primary : theme.accent }}>Factura {invoiceNumber(invoice.id)}</p><p className={`mt-1 text-xs ${mutedClass}`}>{fmtDate(invoice.fecha_venta)}</p></div>
      </header>
      <section className="grid gap-2 py-4 text-sm sm:grid-cols-2">
        <p><span className="text-slate-500">Cliente:</span> <b>{invoice.cliente_nombre}</b></p>
        <p><span className="text-slate-500">Teléfono:</span> {invoice.cliente_telefono || '—'}</p>
        <p><span className="text-slate-500">Correo:</span> {invoice.cliente_correo || '—'}</p>
        <p><span className="text-slate-500">Estado de pago:</span> <b>{invoice.estado_pago}</b></p>
      </section>
      <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="border-y bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="py-2">Producto</th><th className="py-2 text-right">Cant.</th><th className="py-2 text-right">Precio</th><th className="py-2 text-right">Desc.</th><th className="py-2 text-right">Importe</th></tr></thead><tbody>{invoice.items.map((item, index) => <tr key={`${item.producto_id}-${index}`} className="border-b"><td className="py-2 pr-2">{item.nombre}<div className="text-xs text-slate-400">{item.sku || ''}</div></td><td className="py-2 text-right">{item.cantidad}</td><td className="py-2 text-right">{money(item.precio_unitario)}</td><td className="py-2 text-right">{money(item.descuento)}</td><td className="py-2 text-right font-semibold">{money(item.subtotal)}</td></tr>)}</tbody></table></div>
      <div className="ml-auto mt-4 max-w-md space-y-2">
        <p className="flex justify-between border-t pt-3 text-sm"><span>Total</span><b style={{ color: theme.primary }}>{money(invoice.total)}</b></p>
        <p className="flex justify-between text-sm"><span>Pagado</span><b>{money(invoice.monto_pagado)}</b></p>
        <p className="flex justify-between text-sm"><span>Saldo pendiente</span><b>{money(invoice.saldo_pendiente)}</b></p>
        <p className="pt-2 text-xs font-semibold uppercase text-slate-500">Historial de abonos · puedes corregir la fecha recibida</p>
        {invoice.pagos.length ? invoice.pagos.map((payment, index) => <div key={payment.id || index} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2 text-sm text-slate-600"><span>{payment.metodo_pago}<small className="block text-[11px] text-slate-400">{money(payment.monto)}{payment.comision_porcentaje ? ` · ${Number(payment.comision_porcentaje)}% comisión` : ''}</small></span><div className="no-print flex items-center gap-2"><input aria-label={`Fecha del abono ${payment.id}`} type="datetime-local" value={paymentDates[payment.id] || ''} onChange={(event) => onPaymentDateChange(payment.id, event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs"/><button type="button" onClick={() => onSavePaymentDate(payment)} disabled={savingPaymentDate === payment.id || !paymentDates[payment.id]} className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 disabled:opacity-50">{savingPaymentDate === payment.id ? 'Guardando…' : 'Guardar fecha'}</button></div><span className="print-only text-xs">{fmtDate(payment.fecha_pago)}</span></div>) : <p className="text-sm text-slate-500">Aún no se han registrado abonos.</p>}
      </div>
      <p className="mt-8 border-t pt-4 text-center text-xs text-slate-500">{theme.invoiceFooter || 'Gracias por tu compra.'}</p>
    </div>
  );
}
