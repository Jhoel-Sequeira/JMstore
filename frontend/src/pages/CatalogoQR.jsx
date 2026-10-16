import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { getTheme } from '../services/theme';

const money = (value) => `C$ ${Number(value || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CatalogoQRPage() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [quoteProduct, setQuoteProduct] = useState(null);
  const [quoteCost, setQuoteCost] = useState('');
  const [quoteShippingCost, setQuoteShippingCost] = useState('0');
  const [quoteMargin, setQuoteMargin] = useState('30');
  const [quoteQuantity, setQuoteQuantity] = useState('1');
  const [quoteCustomer, setQuoteCustomer] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteCreatedAt, setQuoteCreatedAt] = useState(new Date());
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [theme, setTheme] = useState(getTheme);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/catalogo-qr/'), api.get('/inventario/marcas')])
      .then(([catalog, brandResult]) => { setProducts(catalog.data); setBrands(brandResult.data); })
      .catch(() => setError('No se pudo cargar el catálogo. Comprueba la conexión con la API y Supabase.'));
  }, []);

  useEffect(() => {
    const handleThemeChange = (event) => setTheme(event.detail || getTheme());
    window.addEventListener('jmstore-theme-change', handleThemeChange);
    return () => window.removeEventListener('jmstore-theme-change', handleThemeChange);
  }, []);

  const visible = useMemo(() => products.filter((p) => {
    const matchesBrand = !brandId || String(p.marca_id) === brandId;
    const term = search.trim().toLowerCase();
    const matchesTerm = !term || [p.nombre, p.sku, p.marca_nombre].some((v) => String(v || '').toLowerCase().includes(term));
    return matchesBrand && matchesTerm;
  }), [products, brandId, search]);

  const unitCost = Math.max(0, Number(quoteCost) || 0) + Math.max(0, Number(quoteShippingCost) || 0);
  const margin = Math.max(0, Number(quoteMargin) || 0);
  const quantity = Math.max(1, Number.parseInt(quoteQuantity, 10) || 1);
  const quotePrice = Math.round((unitCost * (1 + margin / 100) + Number.EPSILON) * 100) / 100;

  const openQuote = (product) => {
    setQuoteProduct(product);
    setQuoteCost(product.costo_nio ?? '');
    setQuoteShippingCost(product.costo_envio_nio ?? 0);
    setQuoteMargin(product.margen_utilidad_pct ?? 30);
    setQuoteQuantity('1');
    setQuoteCustomer('');
    setQuotePhone('');
    setQuoteCreatedAt(new Date());
    setShowQuotePreview(false);
    setError('');
  };

  const saveAndPrintQuote = async (event) => {
    event.preventDefault();
    if (!quoteProduct) return;
    if (quoteCost === '' || Number(quoteCost) < 0 || Number(quoteShippingCost) < 0 || Number(quoteMargin) < 0) {
      setError('Ingresa un costo y una utilidad válidos.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/inventario/${quoteProduct.id}`, {
        costo_nio: Number(quoteCost),
        costo_envio_nio: Number(quoteShippingCost),
        margen_utilidad_pct: Number(quoteMargin),
      });
      setProducts((current) => current.map((product) => product.id === data.id ? { ...product, ...data } : product));
      setQuoteProduct((current) => ({ ...current, ...data }));
      setShowQuotePreview(true);
    } catch (saveError) {
      setError(saveError.response?.data?.detail || 'No se pudo guardar el costo y la utilidad.');
    } finally {
      setSaving(false);
    }
  };

  const sendQuoteWhatsApp = () => {
    const digits = quotePhone.replace(/\D/g, '');
    const phone = digits.length === 8 ? `505${digits}` : digits.startsWith('00') ? digits.slice(2) : digits;
    if (phone.length < 10 || phone.length > 15) {
      setError('Ingresa un número válido con código de país, por ejemplo +505 8888 8888.');
      return;
    }
    const date = new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short' }).format(quoteCreatedAt);
    const message = [
      `Hola${quoteCustomer.trim() ? ` ${quoteCustomer.trim()}` : ''}, te comparto tu cotización de ${theme.brandName || 'nuestra tienda'}:`,
      '',
      `Producto: ${quoteProduct.nombre}`,
      `Marca: ${quoteProduct.marca_nombre || '—'}`,
      `Cantidad: ${quantity}`,
      `Precio por unidad: ${money(quotePrice)}`,
      `Total: ${money(quotePrice * quantity)}`,
      `Fecha: ${date}`,
      theme.quoteFooter || 'Gracias por tu preferencia.',
    ].join('\n');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const downloadQr = (product) => {
    const link = document.createElement('a');
    link.href = `${api.defaults.baseURL}/catalogo-qr/${product.id}/qr`;
    link.download = `${product.sku || `producto-${product.id}`}-qr.png`;
    document.body.appendChild(link); link.click(); link.remove();
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-indigo-600">Productos listos para consultar</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Catálogo y códigos QR</h1><p className="mt-1 text-sm text-slate-500">Consulta tus productos, descarga su QR y prepara cotizaciones personalizadas.</p></div>
      {error && !quoteProduct && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto o SKU…" className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Todas las marcas</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nombre_marca}</option>)}</select>
      </div>
      {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">{products.length ? 'No hay productos para esos filtros.' : 'El catálogo aparecerá cuando registres compras de productos.'}</div> :
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.map((product) => <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex h-44 items-center justify-center bg-slate-50 p-4">{product.imagen_url ? <img src={product.imagen_url} alt={product.nombre} className="h-full max-w-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span className="material-symbols-outlined text-5xl text-slate-300">inventory_2</span>}</div>
          <div className="space-y-2 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{product.marca_nombre || 'Marca'}</p><h2 className="line-clamp-2 min-h-12 font-bold text-slate-900">{product.nombre}</h2><div className="flex justify-between gap-2 text-sm"><span className="truncate font-mono text-slate-500">{product.sku || product.codigo_qr}</span><span className="shrink-0 font-semibold text-slate-800">{money(product.precio)}</span></div><div className="flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs text-slate-500">Stock: {product.stock}</span><div className="flex gap-2"><button onClick={() => openQuote(product)} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"><span className="material-symbols-outlined text-base">request_quote</span>Cotizar</button><button onClick={() => downloadQr(product)} title="Descargar QR" aria-label={`Descargar QR de ${product.nombre}`} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"><span className="material-symbols-outlined text-base">qr_code_2</span>QR</button></div></div></div>
        </article>)}</div>}
      <p className="text-right text-xs text-slate-400">{visible.length} productos</p>

      {quoteProduct && <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuoteProduct(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby={showQuotePreview ? 'quote-preview-title' : 'quote-title'} className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          {showQuotePreview && <div>
            <div className="flex items-start justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Vista previa</p><h2 id="quote-preview-title" className="mt-1 text-xl font-bold text-slate-900">Revisa tu cotización</h2><p className="mt-1 text-sm text-slate-500">Así verá la propuesta tu cliente.</p></div><button type="button" onClick={() => setQuoteProduct(null)} aria-label="Cerrar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><span className="material-symbols-outlined">close</span></button></div>
            <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                <header className="flex items-center justify-between gap-4 bg-gradient-to-r from-indigo-700 via-purple-600 to-pink-500 p-5 text-white"><div className="flex min-w-0 items-center gap-3">{theme.logo && <img src={theme.logo} alt="" className="h-12 w-14 shrink-0 rounded-lg bg-white object-contain p-1" />}<div className="min-w-0"><p className="truncate font-extrabold">{theme.brandName || 'Tu negocio'}</p><p className="mt-0.5 text-xs text-white/80">{theme.quoteTagline || 'Cotización personalizada'}</p></div></div><div className="shrink-0 text-right"><p className="text-xs font-bold tracking-widest text-amber-200">COTIZACIÓN</p><p className="mt-1 text-[10px] text-white/80">{new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(quoteCreatedAt)}</p><p className="text-[10px] text-white/80">{new Intl.DateTimeFormat('es-NI', { timeStyle: 'short' }).format(quoteCreatedAt)}</p></div></header>
                <div className="h-1.5 bg-gradient-to-r from-amber-300 via-teal-300 to-pink-400" />
                <div className="space-y-4 p-5 sm:p-6"><div><p className="text-[10px] font-bold tracking-[.2em] text-pink-600">PROPUESTA PARA TI</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">{quoteProduct.nombre}</h3><p className="text-xs text-slate-500">{quoteProduct.marca_nombre || 'Perfumería'} · {quoteProduct.sku || quoteProduct.codigo_qr}</p></div>
                  {theme.quoteShowImage !== false && <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-teal-50 p-3">{quoteProduct.imagen_url ? <img src={quoteProduct.imagen_url} alt={quoteProduct.nombre} className="h-full max-w-full object-contain" /> : <span className="material-symbols-outlined text-5xl text-indigo-500">flair</span>}</div>}
                  {quoteCustomer.trim() && <div className="rounded-r-lg border-l-4 border-pink-500 bg-pink-50 px-3 py-2"><p className="text-[10px] font-bold tracking-wider text-pink-700">PREPARADA PARA</p><p className="mt-1 text-sm font-semibold text-slate-800">{quoteCustomer.trim()}</p></div>}
                  <div className="flex items-center justify-between border-b border-slate-100 py-3 text-sm"><span className="text-slate-600">{quantity} {quantity === 1 ? 'unidad' : 'unidades'} <span className="block text-xs text-slate-400">{money(quotePrice)} por unidad</span></span><strong className="text-slate-800">{money(quotePrice * quantity)}</strong></div><div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-700 to-fuchsia-600 p-4 text-white"><span className="text-sm font-semibold">Total de la cotización</span><strong className="text-xl text-amber-200">{money(quotePrice * quantity)}</strong></div><p className="text-center text-xs italic text-slate-500">{theme.quoteFooter || 'Fragancias para cada momento'}</p>
                </div>
              </article>
              <label className="block text-sm font-semibold text-slate-700">Número de WhatsApp del cliente<input type="tel" autoComplete="tel" value={quotePhone} onChange={(event) => setQuotePhone(event.target.value)} placeholder="+505 8888 8888" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /><span className="mt-1 block text-xs font-normal text-slate-500">Puedes ingresar los 8 dígitos locales de Nicaragua o incluir el código de país.</span></label>
              {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 bg-slate-50 p-4"><button type="button" onClick={() => setShowQuotePreview(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Editar cotización</button><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><span className="material-symbols-outlined text-lg">print</span>Imprimir / PDF</button><button type="button" onClick={sendQuoteWhatsApp} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"><span className="material-symbols-outlined text-lg">chat</span>Enviar por WhatsApp</button></div></div>
          </div>}
          <form hidden={showQuotePreview} onSubmit={saveAndPrintQuote}>
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Cotización de producto</p><h2 id="quote-title" className="mt-1 text-xl font-bold text-slate-900">{quoteProduct.nombre}</h2><p className="mt-1 text-sm text-slate-500">{quoteProduct.marca_nombre} · {quoteProduct.sku || quoteProduct.codigo_qr}</p></div>
              <button type="button" onClick={() => setQuoteProduct(null)} aria-label="Cerrar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">Costo del producto (C$)<input required type="number" min="0" step="0.01" value={quoteCost} onChange={(e) => setQuoteCost(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Envío por unidad (C$)<input required type="number" min="0" step="0.01" value={quoteShippingCost} onChange={(e) => setQuoteShippingCost(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Utilidad (%)<input required type="number" min="0" step="0.01" value={quoteMargin} onChange={(e) => setQuoteMargin(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Cliente (opcional)<input value={quoteCustomer} onChange={(e) => setQuoteCustomer(e.target.value)} maxLength="120" placeholder="Nombre del cliente" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Cantidad<input required type="number" min="1" step="1" value={quoteQuantity} onChange={(e) => setQuoteQuantity(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
              <div className="sm:col-span-2 rounded-xl bg-indigo-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-slate-600">Precio cotizado por unidad</span><strong className="text-lg text-indigo-800">{money(quotePrice)}</strong></div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-indigo-100 pt-2 text-sm"><span className="text-slate-600">Total por {quantity} {quantity === 1 ? 'unidad' : 'unidades'}</span><strong className="text-lg text-slate-900">{money(quotePrice * quantity)}</strong></div>
                <p className="mt-2 text-xs text-slate-500">El costo y el porcentaje de utilidad se guardan en el producto. El precio cotizado no modifica el precio de venta del punto de venta.</p>
              </div>
              {error && <div role="alert" className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
              <button type="button" onClick={() => setQuoteProduct(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"><span className="material-symbols-outlined text-lg">visibility</span>{saving ? 'Guardando…' : 'Guardar y ver cotización'}</button>
            </div>
          </form>
        </section>

        <div className="quote-print-root" aria-hidden="true">
          <div className="quote-print-sheet" data-quote-style={theme.quoteStyle || 'vibrante'} style={{ fontFamily: `'${theme.font}', sans-serif` }}>
            <header className="quote-header">
              <div className="quote-brand"><img src={theme.logo} alt={`Logo ${theme.brandName}`} /><div><strong>{theme.brandName}</strong><span>{theme.quoteTagline || 'Perfumería · Cotización personalizada'}</span></div></div>
              <div className="quote-label"><span>COTIZACIÓN</span><small>{new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(quoteCreatedAt)}</small><small>{new Intl.DateTimeFormat('es-NI', { timeStyle: 'short' }).format(quoteCreatedAt)}</small></div>
            </header>
            <div className="quote-accent" />
            <main className="quote-body">
              <p className="quote-eyebrow">PROPUESTA PARA TI</p>
              <h1>{quoteProduct.nombre}</h1>
              <p className="quote-brand-name">{quoteProduct.marca_nombre || 'Perfumería'} <span>·</span> {quoteProduct.sku || quoteProduct.codigo_qr}</p>
              <div className={`quote-product-card ${theme.quoteShowImage === false ? 'quote-product-no-image' : ''}`}>
                {theme.quoteShowImage !== false && <div className="quote-product-image">{quoteProduct.imagen_url ? <img src={quoteProduct.imagen_url} alt={quoteProduct.nombre} /> : <span>JM</span>}</div>}
                <div className="quote-product-info"><span className="quote-chip">PRODUCTO SELECCIONADO</span><h2>{quoteProduct.nombre}</h2><p>{quoteProduct.marca_nombre || 'Fragancia seleccionada'}</p></div>
              </div>
              {quoteCustomer.trim() && <div className="quote-customer"><span>PREPARADA PARA</span><strong>{quoteCustomer.trim()}</strong></div>}
              <div className="quote-items-heading"><span>DETALLE</span><span>IMPORTE</span></div>
              <div className="quote-line"><span>{quantity} {quantity === 1 ? 'unidad' : 'unidades'} <small>{money(quotePrice)} por unidad</small></span><strong>{money(quotePrice * quantity)}</strong></div>
              <div className="quote-total"><span>Total de la cotización</span><strong>{money(quotePrice * quantity)}</strong></div>
              <p className="quote-thanks">Gracias por elegirnos. Será un placer ayudarte a encontrar tu próxima fragancia.</p>
            </main>
            <footer className="quote-footer"><span>{theme.brandName} · {theme.quoteFooter || 'Fragancias para cada momento'}</span><span>{new Intl.DateTimeFormat('es-NI', { dateStyle: 'long', timeStyle: 'short' }).format(quoteCreatedAt)}</span></footer>
          </div>
        </div>
      </div>}
      <style>{`@media print { @page { size: A4; margin: 0; } body * { visibility: hidden !important; } .quote-print-root, .quote-print-root * { visibility: visible !important; } .quote-print-root { position: fixed !important; inset: 0 !important; z-index: 99999 !important; display: block !important; width: 100% !important; min-height: 100vh !important; background: #fff !important; } .quote-print-sheet { box-sizing: border-box; width: 100%; min-height: 100vh; margin: 0 auto; color: #142033; background: white; font-family: Arial, sans-serif; } .quote-header { display:flex; align-items:center; justify-content:space-between; padding:32px 48px 26px; background:#111c35; color:white; } .quote-brand { display:flex; align-items:center; gap:16px; } .quote-brand img { width:76px; height:58px; object-fit:contain; border-radius:8px; background:white; padding:4px; } .quote-brand strong { display:block; font-size:22px; letter-spacing:.04em; } .quote-brand span { display:block; margin-top:5px; color:#d0d8eb; font-size:11px; letter-spacing:.04em; } .quote-label { display:flex; flex-direction:column; align-items:flex-end; gap:5px; } .quote-label span { color:#e9bd78; font-size:12px; font-weight:700; letter-spacing:.18em; } .quote-label small { color:#d0d8eb; font-size:10px; } .quote-accent { height:6px; background:linear-gradient(90deg,#d6a962,#f0d8aa,#6574a4); } .quote-body { max-width:760px; margin:0 auto; padding:42px 48px 30px; } .quote-eyebrow { color:#aa7d3c !important; font-size:10px; font-weight:700; letter-spacing:.2em; } .quote-body h1 { margin:10px 0 7px; color:#142033; font-family:Georgia,serif; font-size:32px; line-height:1.15; } .quote-brand-name { margin:0 !important; color:#64748b !important; font-size:13px; } .quote-brand-name span { padding:0 4px; color:#c49a5b; } .quote-product-card { display:flex; align-items:center; gap:24px; margin:28px 0 26px; padding:18px; border:1px solid #e7e9ef; border-radius:14px; background:#faf9f6; } .quote-product-image { display:flex; flex:0 0 150px; align-items:center; justify-content:center; width:150px; height:155px; overflow:hidden; border-radius:10px; background:#f0eee9; color:#b38a4c; font-family:Georgia,serif; font-size:32px; } .quote-product-image img { width:100%; height:100%; object-fit:contain; } .quote-product-info { flex:1; } .quote-chip { display:inline-block; padding:6px 9px; border-radius:20px; background:#eee8dc; color:#8b6a38; font-size:8px; font-weight:700; letter-spacing:.12em; } .quote-product-info h2 { margin:12px 0 5px; color:#18243b; font-family:Georgia,serif; font-size:20px; } .quote-product-info p { margin:0 !important; color:#64748b !important; font-size:12px; } .quote-customer { margin:20px 0 !important; padding:12px 15px; border-left:3px solid #c49a5b; background:#faf9f6; } .quote-customer span { display:block; color:#8b6a38; font-size:8px; font-weight:700; letter-spacing:.14em; } .quote-customer strong { display:block; margin-top:5px; color:#26334a; font-size:13px; } .quote-items-heading { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #dfe3eb; color:#8992a2; font-size:9px; font-weight:700; letter-spacing:.14em; } .quote-line { display:flex; justify-content:space-between; align-items:center; padding:17px 0; color:#26334a; font-size:13px; } .quote-line small { display:block; margin-top:5px; color:#8992a2; font-size:10px; } .quote-line strong { font-size:14px; } .quote-total { display:flex; justify-content:space-between; align-items:center; margin-top:6px; padding:17px 18px; border-radius:10px; background:#18243b; color:white; font-size:13px; } .quote-total strong { color:#f0d8aa; font-size:21px; } .quote-thanks { margin:28px 0 0 !important; color:#64748b !important; font-family:Georgia,serif; font-size:12px; font-style:italic; text-align:center; } .quote-footer { display:flex; justify-content:space-between; gap:10px; margin-top:22px; padding:16px 48px; border-top:1px solid #e7e9ef; color:#8992a2; font-size:9px; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .quote-header { position:relative; overflow:hidden; background:linear-gradient(118deg,#3924a8 0%,#7838d6 52%,#d8369a 100%) !important; } .quote-header:after { content:''; position:absolute; width:250px; height:250px; right:135px; top:-170px; border:1px solid rgba(255,255,255,.25); border-radius:50%; box-shadow:0 0 0 24px rgba(255,255,255,.06),0 0 0 52px rgba(255,255,255,.05); } .quote-brand img { position:relative; z-index:1; width:82px; height:66px; border:2px solid rgba(255,255,255,.65); box-shadow:0 6px 18px rgba(20,10,70,.24); } .quote-brand div,.quote-label { position:relative; z-index:1; } .quote-label span { padding:8px 11px; border:1px solid rgba(255,255,255,.35); border-radius:20px; background:rgba(255,255,255,.14); color:#fff1b8; } .quote-accent { height:8px; background:linear-gradient(90deg,#ffb84a,#ffe17b,#28d7cb,#7f67ff,#ff65b6) !important; } .quote-eyebrow { display:inline-block; padding:8px 12px; border-radius:20px; background:#fff0f7; color:#c02685 !important; } .quote-body h1 { color:#26145b; } .quote-product-card { border:1px solid #e6d9ff; background:linear-gradient(115deg,#f5f0ff 0%,#fff4f9 55%,#effcff 100%) !important; box-shadow:0 12px 28px rgba(77,50,145,.09); } .quote-product-image { border:1px solid #e4d9fa; background:linear-gradient(145deg,#fff,#f0eaff 60%,#e3fbfa) !important; color:#7446c7; } .quote-chip { background:#6d3acb; color:white; } .quote-product-info h2 { color:#38206f; } .quote-customer { border-left-color:#e43d9d; border-radius:0 10px 10px 0; background:linear-gradient(90deg,#fff0f8,#fffafd) !important; } .quote-customer span { color:#c02685; } .quote-total { background:linear-gradient(105deg,#3824a8,#7438d2 55%,#c92e91) !important; box-shadow:0 8px 18px rgba(82,43,157,.2); } .quote-total strong { color:#fff0a8; } .quote-thanks { color:#6c3aba !important; } .quote-footer { margin-top:26px; border-top:0; background:linear-gradient(90deg,#f1ebff,#fff0f8,#edfffd); color:#594188; } } @media screen { .quote-print-root { display: none; } }`}</style>
      <style>{`@media print { .quote-header { background:linear-gradient(118deg,var(--jm-primary),color-mix(in srgb,var(--jm-primary) 72%,var(--jm-secondary)),color-mix(in srgb,var(--jm-primary) 55%,var(--jm-accent))) !important; } .quote-total { background:linear-gradient(105deg,var(--jm-primary),color-mix(in srgb,var(--jm-primary) 70%,var(--jm-secondary)),color-mix(in srgb,var(--jm-primary) 50%,var(--jm-accent))) !important; } .quote-print-sheet[data-quote-style="elegante"] .quote-header { background:linear-gradient(120deg,#172033,#344256 58%,#8b6a3e) !important; } .quote-print-sheet[data-quote-style="elegante"] .quote-accent { background:linear-gradient(90deg,#8b6a3e,#e6d2a8,#8b6a3e) !important; } .quote-print-sheet[data-quote-style="elegante"] .quote-total { background:linear-gradient(110deg,#172033,#344256) !important; } .quote-print-sheet[data-quote-style="elegante"] .quote-chip { background:#8b6a3e !important; } .quote-print-sheet[data-quote-style="minimalista"] .quote-header { background:#fff !important; color:#172033 !important; border-bottom:2px solid var(--jm-primary); } .quote-print-sheet[data-quote-style="minimalista"] .quote-brand span,.quote-print-sheet[data-quote-style="minimalista"] .quote-label small { color:#64748b !important; } .quote-print-sheet[data-quote-style="minimalista"] .quote-label span { color:var(--jm-primary) !important; border-color:var(--jm-primary); } .quote-print-sheet[data-quote-style="minimalista"] .quote-accent { height:3px !important; background:var(--jm-primary) !important; } .quote-print-sheet[data-quote-style="minimalista"] .quote-product-card { background:#fff !important; box-shadow:none !important; border-color:#dce1e8 !important; } .quote-print-sheet[data-quote-style="minimalista"] .quote-total { background:var(--jm-primary) !important; box-shadow:none !important; } .quote-print-sheet[data-quote-style="minimalista"] .quote-chip { background:#eef0f4 !important; color:#344256 !important; } .quote-product-no-image .quote-product-info { padding:12px; } }`}</style>
    </div>
  );
}
