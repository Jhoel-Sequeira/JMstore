import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { getTheme } from '../services/theme';

const money = (value) => `C$ ${Number(value || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CatalogoQRPage() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [states, setStates] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({ marca_id: '', nombre: '', sku: '', codigo_qr: '', descripcion: '', precio: '', costo_nio: '0', costo_envio_nio: '0', margen_utilidad_pct: '30', imagen_url: '', estado_id: '' });
  const [savingProduct, setSavingProduct] = useState(false);
  const [brandId, setBrandId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [quoteProduct, setQuoteProduct] = useState(null);
  const [quoteItems, setQuoteItems] = useState([]);
  const [productsToAdd, setProductsToAdd] = useState([]);
  const [selectedCatalogProducts, setSelectedCatalogProducts] = useState([]);
  const [uploadingProductId, setUploadingProductId] = useState(null);
  const [quoteCustomer, setQuoteCustomer] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteCreatedAt, setQuoteCreatedAt] = useState(new Date());
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [theme, setTheme] = useState(getTheme);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/catalogo-qr/'), api.get('/inventario/marcas'), api.get('/inventario/estados')])
      .then(([catalog, brandResult, stateResult]) => { setProducts(catalog.data); setBrands(brandResult.data); setStates(stateResult.data); })
      .catch(() => setError('No se pudo cargar el catálogo. Comprueba la conexión con la API y Supabase.'));
  }, []);

  const openNewProduct = () => {
    const defaultState = states.find((state) => state.nombre.toLowerCase() === 'activo') || states[0];
    setEditingProductId(null);
    setProductForm({ marca_id: '', nombre: '', sku: '', codigo_qr: '', descripcion: '', precio: '', costo_nio: '0', costo_envio_nio: '0', margen_utilidad_pct: '30', imagen_url: '', estado_id: defaultState ? String(defaultState.id) : '' });
    setShowProductForm(true);
    setError('');
  };

  const openEditProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({ marca_id: String(product.marca_id), nombre: product.nombre || '', sku: product.sku || '', codigo_qr: product.codigo_qr || '', descripcion: product.descripcion || '', precio: String(product.precio ?? ''), costo_nio: String(product.costo_nio ?? 0), costo_envio_nio: String(product.costo_envio_nio ?? 0), margen_utilidad_pct: String(product.margen_utilidad_pct ?? 30), imagen_url: product.imagen_url || '', estado_id: String(product.estado_id) });
    setShowProductForm(true);
    setError('');
  };

  const saveCatalogProduct = async (event) => {
    event.preventDefault();
    setSavingProduct(true);
    setError('');
    const payload = { ...productForm, marca_id: Number(productForm.marca_id), estado_id: Number(productForm.estado_id), precio: Number(productForm.precio), costo_nio: Number(productForm.costo_nio || 0), costo_envio_nio: Number(productForm.costo_envio_nio || 0), margen_utilidad_pct: Number(productForm.margen_utilidad_pct || 0), stock: 0, stock_critico: 5 };
    payload.sku = payload.sku.trim() || null;
    payload.codigo_qr = payload.codigo_qr.trim() || payload.sku || null;
    payload.descripcion = payload.descripcion.trim() || null;
    payload.imagen_url = payload.imagen_url.trim() || null;
    try {
      const { data } = editingProductId
        ? await api.put(`/catalogo-qr/${editingProductId}`, payload)
        : await api.post('/catalogo-qr/', payload);
      setProducts((current) => editingProductId
        ? current.map((product) => product.id === editingProductId ? data : product)
        : [...current, data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      setShowProductForm(false);
    } catch (saveError) {
      setError(saveError.response?.data?.detail || 'No se pudo guardar el producto.');
    } finally {
      setSavingProduct(false);
    }
  };

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

  const quoteLines = quoteItems.map((item) => {
    const unitCost = Math.max(0, Number(item.cost) || 0) + Math.max(0, Number(item.shipping) || 0);
    const margin = Math.max(0, Number(item.margin) || 0);
    const price = Math.round((unitCost * (1 + margin / 100) + Number.EPSILON) * 100) / 100;
    const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
    return { ...item, price, quantity, total: price * quantity };
  });
  const quoteTotal = quoteLines.reduce((sum, item) => sum + item.total, 0);

  const makeQuoteItem = (product) => ({
    product,
    cost: product.costo_nio ?? '',
    shipping: product.costo_envio_nio ?? 0,
    margin: product.margen_utilidad_pct ?? 30,
    quantity: 1,
  });

  const openQuoteProducts = (selectedProducts) => {
    if (!selectedProducts.length) return;
    setSelectedCatalogProducts([]);
    setQuoteProduct(selectedProducts[0]);
    setQuoteItems(selectedProducts.map(makeQuoteItem));
    setProductsToAdd([]);
    setQuoteCustomer('');
    setQuotePhone('');
    setQuoteCreatedAt(new Date());
    setShowQuotePreview(false);
    setError('');
  };

  const openQuote = (product) => openQuoteProducts([product]);

  const toggleCatalogProduct = (productId) => {
    setSelectedCatalogProducts((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId]);
  };

  const openSelectedCatalogQuote = () => {
    const selected = products.filter((product) => selectedCatalogProducts.includes(product.id));
    openQuoteProducts(selected);
    setSelectedCatalogProducts([]);
  };

  const saveAndPrintQuote = async (event) => {
    event.preventDefault();
    if (!quoteItems.length) return;
    if (quoteItems.some((item) => item.cost === '' || Number(item.cost) < 0 || Number(item.shipping) < 0 || Number(item.margin) < 0 || Number(item.quantity) < 1)) {
      setError('Ingresa un costo y una utilidad válidos.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updatedItems = await Promise.all(quoteItems.map(async (item) => {
        const { data } = await api.put(`/inventario/${item.product.id}`, {
          costo_nio: Number(item.cost),
          costo_envio_nio: Number(item.shipping),
          margen_utilidad_pct: Number(item.margin),
        });
        return { ...item, product: { ...item.product, ...data } };
      }));
      setQuoteItems(updatedItems);
      setProducts((current) => current.map((product) => updatedItems.find((item) => item.product.id === product.id)?.product || product));
      setQuoteProduct(updatedItems[0].product);
      setShowQuotePreview(true);
    } catch (saveError) {
      setError(saveError.response?.data?.detail || 'No se pudo guardar el costo y la utilidad.');
    } finally {
      setSaving(false);
    }
  };

  const addQuoteProducts = () => {
    const selected = products.filter((product) => productsToAdd.includes(String(product.id)) && !quoteItems.some((item) => item.product.id === product.id));
    if (!selected.length) return;
    const nextItems = [...quoteItems, ...selected.map(makeQuoteItem)];
    setQuoteItems(nextItems);
    setQuoteProduct(nextItems[0].product);
    setProductsToAdd([]);
  };

  const uploadProductImage = async (product, file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('La imagen debe estar en formato PNG o JPG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5 MB.');
      return;
    }
    setUploadingProductId(product.id);
    setError('');
    const imagePayload = new FormData();
    imagePayload.append('file', file);
    try {
      const { data } = await api.post(`/inventario/${product.id}/imagen`, imagePayload);
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, ...data } : item));
    } catch (uploadError) {
      setError(uploadError.response?.data?.detail || 'No se pudo subir la imagen del producto.');
    } finally {
      setUploadingProductId(null);
    }
  };

  const updateQuoteItem = (productId, field, value) => {
    setQuoteItems((current) => current.map((item) => item.product.id === productId ? { ...item, [field]: value } : item));
  };

  const removeQuoteItem = (productId) => {
    const nextItems = quoteItems.filter((item) => item.product.id !== productId);
    setQuoteItems(nextItems);
    setQuoteProduct(nextItems[0]?.product || null);
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
      ...quoteLines.flatMap((item) => [
        `Producto: ${item.product.nombre}`,
        `Marca: ${item.product.marca_nombre || '—'}`,
        `Cantidad: ${item.quantity}`,
        `Precio por unidad: ${money(item.price)}`,
        `Subtotal: ${money(item.total)}`,
        '',
      ]),
      `Total: ${money(quoteTotal)}`,
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
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-indigo-600">Productos listos para consultar</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Catálogo y códigos QR</h1><p className="mt-1 text-sm text-slate-500">Administra productos, descarga su QR y prepara cotizaciones.</p></div><button type="button" onClick={openNewProduct} className="inline-flex items-center gap-2 rounded-xl bg-[#112250] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3C507D]"><span className="material-symbols-outlined text-lg">add</span>Agregar producto</button></div>
      {error && !quoteProduct && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto o SKU…" className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Todas las marcas</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nombre_marca}</option>)}</select>
      </div>
      {selectedCatalogProducts.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#3C507D]/20 bg-white px-4 py-3 shadow-sm"><p className="text-sm font-medium text-[#112250]">{selectedCatalogProducts.length} producto{selectedCatalogProducts.length === 1 ? '' : 's'} seleccionado{selectedCatalogProducts.length === 1 ? '' : 's'} para cotizar</p><button type="button" onClick={openSelectedCatalogQuote} className="inline-flex items-center gap-2 rounded-lg bg-[#112250] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3C507D]"><span className="material-symbols-outlined text-lg">request_quote</span>Cotizar seleccionados</button></div>}
      {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">{products.length ? 'No hay productos para esos filtros.' : 'El catálogo aparecerá cuando registres compras de productos.'}</div> :
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.map((product) => <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative flex h-44 items-center justify-center bg-slate-50 p-4">{product.imagen_url ? <img src={product.imagen_url} alt={product.nombre} className="h-full max-w-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span className="material-symbols-outlined text-5xl text-slate-300">inventory_2</span>}<label className="absolute left-3 top-3 flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2 text-xs font-semibold text-[#112250] shadow-sm"><input type="checkbox" checked={selectedCatalogProducts.includes(product.id)} onChange={() => toggleCatalogProduct(product.id)} className="h-4 w-4 rounded border-slate-300 text-[#112250] focus:ring-[#112250]" /><span>Agregar a cotización</span></label></div>
          <div className="space-y-2 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{product.marca_nombre || 'Marca'}</p><h2 className="line-clamp-2 min-h-12 font-bold text-slate-900">{product.nombre}</h2><div className="flex justify-between gap-2 text-sm"><span className="truncate font-mono text-slate-500">{product.sku || product.codigo_qr}</span><span className="shrink-0 font-semibold text-slate-800">{money(product.precio)}</span></div><div className="flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs text-slate-500">Stock: {product.stock}</span><div className="flex gap-2"><button onClick={() => openEditProduct(product)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><span className="material-symbols-outlined text-base">edit</span>Editar</button><button onClick={() => openQuote(product)} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"><span className="material-symbols-outlined text-base">request_quote</span>Cotizar</button><button onClick={() => downloadQr(product)} title="Descargar QR" aria-label={`Descargar QR de ${product.nombre}`} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"><span className="material-symbols-outlined text-base">qr_code_2</span>QR</button></div></div><label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#3C507D]/30 bg-white px-3 py-2 text-xs font-semibold text-[#112250] hover:bg-slate-50 ${uploadingProductId === product.id ? 'pointer-events-none opacity-60' : ''}`}><span className="material-symbols-outlined text-base">add_photo_alternate</span>{uploadingProductId === product.id ? 'Subiendo foto…' : product.imagen_url ? 'Cambiar foto' : 'Subir foto del perfume'}<input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" className="sr-only" disabled={uploadingProductId === product.id} onChange={(event) => { uploadProductImage(product, event.target.files?.[0]); event.target.value = ''; }} /></label></div>
        </article>)}</div>}
      <p className="text-right text-xs text-slate-400">{visible.length} productos</p>

      {showProductForm && <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingProduct) setShowProductForm(false); }}><form onSubmit={saveCatalogProduct} className="my-auto max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Catálogo independiente</p><h2 className="mt-1 text-xl font-bold text-slate-900">{editingProductId ? 'Editar producto' : 'Agregar producto'}</h2><p className="mt-1 text-sm text-slate-500">Los datos de existencias se administran desde compras e inventario.</p></div><button type="button" onClick={() => setShowProductForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">✕</button></div>{error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}<label className="block text-sm font-medium text-slate-700">Marca *<select required value={productForm.marca_id} onChange={(event) => setProductForm((current) => ({ ...current, marca_id: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Seleccionar marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.nombre_marca}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><CatalogField label="Nombre *" required maxLength="255" value={productForm.nombre} onChange={(value) => setProductForm((current) => ({ ...current, nombre: value }))} /><CatalogField label="SKU" value={productForm.sku} onChange={(value) => setProductForm((current) => ({ ...current, sku: value }))} /><CatalogField label="Código QR" value={productForm.codigo_qr} onChange={(value) => setProductForm((current) => ({ ...current, codigo_qr: value }))} /><CatalogField label="Precio de venta *" required type="number" min="0" step="0.01" value={productForm.precio} onChange={(value) => setProductForm((current) => ({ ...current, precio: value }))} /><CatalogField label="Costo" type="number" min="0" step="0.01" value={productForm.costo_nio} onChange={(value) => setProductForm((current) => ({ ...current, costo_nio: value }))} /><CatalogField label="Costo de envío" type="number" min="0" step="0.01" value={productForm.costo_envio_nio} onChange={(value) => setProductForm((current) => ({ ...current, costo_envio_nio: value }))} /><CatalogField label="Margen de utilidad %" type="number" min="0" step="0.01" value={productForm.margen_utilidad_pct} onChange={(value) => setProductForm((current) => ({ ...current, margen_utilidad_pct: value }))} /><label className="text-sm font-medium text-slate-700">Estado<select value={productForm.estado_id} onChange={(event) => setProductForm((current) => ({ ...current, estado_id: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5">{states.map((state) => <option key={state.id} value={state.id}>{state.nombre}</option>)}</select></label></div><label className="block text-sm font-medium text-slate-700">Descripción<textarea rows="3" value={productForm.descripcion} onChange={(event) => setProductForm((current) => ({ ...current, descripcion: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="block text-sm font-medium text-slate-700">URL de imagen<input type="url" value={productForm.imagen_url} onChange={(event) => setProductForm((current) => ({ ...current, imagen_url: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="https://…" /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={savingProduct} onClick={() => setShowProductForm(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button><button disabled={savingProduct || !brands.length || !states.length} className="rounded-lg bg-[#112250] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingProduct ? 'Guardando…' : editingProductId ? 'Guardar cambios' : 'Agregar al catálogo'}</button></div></form></div>}

      {quoteProduct && <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuoteProduct(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby={showQuotePreview ? 'quote-preview-title' : 'quote-title'} className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          {showQuotePreview && <div>
            <div className="flex items-start justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Vista previa</p><h2 id="quote-preview-title" className="mt-1 text-xl font-bold text-slate-900">Revisa tu cotización</h2><p className="mt-1 text-sm text-slate-500">Así verá la propuesta tu cliente.</p></div><button type="button" onClick={() => setQuoteProduct(null)} aria-label="Cerrar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><span className="material-symbols-outlined">close</span></button></div>
            <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
              <article className="border border-slate-200 bg-white p-5 text-slate-900">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#112250] pb-4">
                  <div className="flex items-center gap-3">{theme.logo && <img src={theme.logo} alt="Logo" className="h-12 w-16 object-contain" />}<div><p className="font-bold text-[#112250]">{theme.brandName || 'Tu negocio'}</p><p className="mt-1 text-xs text-[#3C507D]">{theme.quoteTagline || 'Perfumería'}</p></div></div>
                  <div className="text-right"><p className="text-xs font-bold uppercase tracking-wide text-[#112250]">Cotización</p><p className="mt-1 text-xs text-[#3C507D]">{new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short' }).format(quoteCreatedAt)}</p></div>
                </header>
                <section className="grid gap-2 border-b border-slate-200 py-4 text-xs sm:grid-cols-2"><p><span className="text-slate-500">Cliente:</span> <strong>{quoteCustomer.trim() || '—'}</strong></p><p><span className="text-slate-500">Teléfono:</span> {quotePhone || '—'}</p></section>
                <div className="overflow-x-auto"><table className="w-full min-w-[440px] text-left text-xs"><thead className="border-y border-slate-200 bg-slate-50 uppercase text-slate-500"><tr><th className="py-2">Producto</th><th className="py-2 text-right">Cant.</th><th className="py-2 text-right">Precio</th><th className="py-2 text-right">Desc.</th><th className="py-2 text-right">Importe</th></tr></thead><tbody>{quoteLines.map((item) => <tr key={item.product.id} className="border-b border-slate-100"><td className="py-2 pr-2"><span className="font-medium">{item.product.nombre}</span><small className="block text-slate-400">{item.product.sku || item.product.codigo_qr}</small></td><td className="py-2 text-right">{item.quantity}</td><td className="py-2 text-right">{money(item.price)}</td><td className="py-2 text-right">{money(0)}</td><td className="py-2 text-right font-semibold">{money(item.total)}</td></tr>)}</tbody></table></div>
                <div className="ml-auto mt-4 flex max-w-xs justify-between rounded-lg bg-[#112250] px-4 py-3 text-sm font-bold text-white"><span>Total</span><span>{money(quoteTotal)}</span></div>
                <footer className="mt-6 border-t border-slate-200 pt-3 text-center text-xs text-slate-500">{theme.quoteFooter || 'Gracias por tu preferencia.'}</footer>
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
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-end gap-3"><div className="min-w-[260px] flex-1 rounded-xl border border-slate-200 p-3"><p className="text-sm font-semibold text-slate-700">Agregar varios productos</p><div className="mt-2 max-h-36 space-y-1 overflow-y-auto">{products.filter((product) => !quoteItems.some((item) => item.product.id === product.id)).map((product) => <label key={product.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={productsToAdd.includes(String(product.id))} onChange={(event) => setProductsToAdd((current) => event.target.checked ? [...current, String(product.id)] : current.filter((id) => id !== String(product.id)))} className="rounded border-slate-300 text-[#112250] focus:ring-[#112250]" /><span className="min-w-0 flex-1 truncate">{product.nombre} · {product.marca_nombre || 'Marca'}</span></label>)}</div><button type="button" onClick={addQuoteProducts} disabled={!productsToAdd.length} className="mt-2 rounded-lg bg-[#112250] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Agregar seleccionados ({productsToAdd.length})</button></div><label className="min-w-[220px] flex-1 text-sm font-semibold text-slate-700">Cliente (opcional)<input value={quoteCustomer} onChange={(e) => setQuoteCustomer(e.target.value)} maxLength="120" placeholder="Nombre del cliente" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label></div>
              <div className="space-y-3">{quoteLines.map((item) => <article key={item.product.id} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><p className="font-semibold text-[#112250]">{item.product.nombre}</p><p className="text-xs text-slate-500">{item.product.marca_nombre || 'Marca'} · {item.product.sku || item.product.codigo_qr}</p></div><button type="button" disabled={quoteItems.length === 1} onClick={() => removeQuoteItem(item.product.id)} className="text-xs font-semibold text-slate-500 hover:text-red-600 disabled:opacity-30">Quitar</button></div><div className="grid gap-3 sm:grid-cols-4"><label className="text-xs font-semibold text-slate-600">Costo C$<input required type="number" min="0" step="0.01" value={item.cost} onChange={(event) => updateQuoteItem(item.product.id, 'cost', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">Envío C$<input required type="number" min="0" step="0.01" value={item.shipping} onChange={(event) => updateQuoteItem(item.product.id, 'shipping', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">Utilidad %<input required type="number" min="0" step="0.01" value={item.margin} onChange={(event) => updateQuoteItem(item.product.id, 'margin', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">Cantidad<input required type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateQuoteItem(item.product.id, 'quantity', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal" /></label></div><p className="mt-3 text-right text-sm text-[#3C507D]">{item.quantity} × {money(item.price)} = <strong className="text-[#112250]">{money(item.total)}</strong></p></article>)}</div>
              <div className="flex justify-between rounded-lg bg-[#112250] px-4 py-3 text-sm font-bold text-white"><span>Total de la cotización</span><span>{money(quoteTotal)}</span></div>
              <p className="text-xs text-slate-500">El costo y la utilidad se guardan en cada producto. El precio cotizado no modifica el precio del punto de venta.</p>
              {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
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
              <div className="quote-brand">{theme.logo && <img src={theme.logo} alt={`Logo ${theme.brandName}`} />}<div><strong>{theme.brandName}</strong><span>{theme.quoteTagline || 'Perfumería · Cotización personalizada'}</span></div></div>
              <div className="quote-label"><span>COTIZACIÓN</span><small>{new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(quoteCreatedAt)}</small><small>{new Intl.DateTimeFormat('es-NI', { timeStyle: 'short' }).format(quoteCreatedAt)}</small></div>
            </header>
            <main className="quote-body">
              <section className="quote-customer"><p><span>Cliente:</span> <strong>{quoteCustomer.trim() || '—'}</strong></p><p><span>Teléfono:</span> <strong>{quotePhone || '—'}</strong></p></section>
              <table className="quote-table"><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Desc.</th><th>Importe</th></tr></thead><tbody>{quoteLines.map((item) => <tr key={item.product.id}><td>{item.product.nombre}<small>{item.product.sku || item.product.codigo_qr}</small></td><td>{item.quantity}</td><td>{money(item.price)}</td><td>{money(0)}</td><td>{money(item.total)}</td></tr>)}</tbody></table>
              <div className="quote-total"><span>Total</span><strong>{money(quoteTotal)}</strong></div>
            </main>
            <footer className="quote-footer"><span>{theme.brandName} · {theme.quoteFooter || 'Fragancias para cada momento'}</span><span>{new Intl.DateTimeFormat('es-NI', { dateStyle: 'long', timeStyle: 'short' }).format(quoteCreatedAt)}</span></footer>
          </div>
        </div>
      </div>}
      <style>{`@media print { @page { size: A4; margin: 0; } body * { visibility: hidden !important; } .quote-print-root, .quote-print-root * { visibility: visible !important; } .quote-print-root { position: fixed !important; inset: 0 !important; z-index: 99999 !important; display: block !important; width: 100% !important; min-height: 100vh !important; background: #fff !important; } .quote-print-sheet { box-sizing: border-box; width: 100%; min-height: 100vh; margin: 0 auto; color: #142033; background: white; font-family: Arial, sans-serif; } .quote-header { display:flex; align-items:center; justify-content:space-between; padding:32px 48px 26px; background:#111c35; color:white; } .quote-brand { display:flex; align-items:center; gap:16px; } .quote-brand img { width:76px; height:58px; object-fit:contain; border-radius:8px; background:white; padding:4px; } .quote-brand strong { display:block; font-size:22px; letter-spacing:.04em; } .quote-brand span { display:block; margin-top:5px; color:#d0d8eb; font-size:11px; letter-spacing:.04em; } .quote-label { display:flex; flex-direction:column; align-items:flex-end; gap:5px; } .quote-label span { color:#e9bd78; font-size:12px; font-weight:700; letter-spacing:.18em; } .quote-label small { color:#d0d8eb; font-size:10px; } .quote-accent { height:6px; background:linear-gradient(90deg,#d6a962,#f0d8aa,#6574a4); } .quote-body { max-width:760px; margin:0 auto; padding:42px 48px 30px; } .quote-eyebrow { color:#aa7d3c !important; font-size:10px; font-weight:700; letter-spacing:.2em; } .quote-body h1 { margin:10px 0 7px; color:#142033; font-family:Georgia,serif; font-size:32px; line-height:1.15; } .quote-brand-name { margin:0 !important; color:#64748b !important; font-size:13px; } .quote-brand-name span { padding:0 4px; color:#c49a5b; } .quote-product-card { display:flex; align-items:center; gap:24px; margin:28px 0 26px; padding:18px; border:1px solid #e7e9ef; border-radius:14px; background:#faf9f6; } .quote-product-image { display:flex; flex:0 0 150px; align-items:center; justify-content:center; width:150px; height:155px; overflow:hidden; border-radius:10px; background:#f0eee9; color:#b38a4c; font-family:Georgia,serif; font-size:32px; } .quote-product-image img { width:100%; height:100%; object-fit:contain; } .quote-product-info { flex:1; } .quote-chip { display:inline-block; padding:6px 9px; border-radius:20px; background:#eee8dc; color:#8b6a38; font-size:8px; font-weight:700; letter-spacing:.12em; } .quote-product-info h2 { margin:12px 0 5px; color:#18243b; font-family:Georgia,serif; font-size:20px; } .quote-product-info p { margin:0 !important; color:#64748b !important; font-size:12px; } .quote-customer { margin:20px 0 !important; padding:12px 15px; border-left:3px solid #c49a5b; background:#faf9f6; } .quote-customer span { display:block; color:#8b6a38; font-size:8px; font-weight:700; letter-spacing:.14em; } .quote-customer strong { display:block; margin-top:5px; color:#26334a; font-size:13px; } .quote-items-heading { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #dfe3eb; color:#8992a2; font-size:9px; font-weight:700; letter-spacing:.14em; } .quote-line { display:flex; justify-content:space-between; align-items:center; padding:17px 0; color:#26334a; font-size:13px; } .quote-line small { display:block; margin-top:5px; color:#8992a2; font-size:10px; } .quote-line strong { font-size:14px; } .quote-total { display:flex; justify-content:space-between; align-items:center; margin-top:6px; padding:17px 18px; border-radius:10px; background:#18243b; color:white; font-size:13px; } .quote-total strong { color:#f0d8aa; font-size:21px; } .quote-thanks { margin:28px 0 0 !important; color:#64748b !important; font-family:Georgia,serif; font-size:12px; font-style:italic; text-align:center; } .quote-footer { display:flex; justify-content:space-between; gap:10px; margin-top:22px; padding:16px 48px; border-top:1px solid #e7e9ef; color:#8992a2; font-size:9px; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .quote-header { position:relative; overflow:hidden; background:linear-gradient(118deg,#3924a8 0%,#7838d6 52%,#d8369a 100%) !important; } .quote-header:after { content:''; position:absolute; width:250px; height:250px; right:135px; top:-170px; border:1px solid rgba(255,255,255,.25); border-radius:50%; box-shadow:0 0 0 24px rgba(255,255,255,.06),0 0 0 52px rgba(255,255,255,.05); } .quote-brand img { position:relative; z-index:1; width:82px; height:66px; border:2px solid rgba(255,255,255,.65); box-shadow:0 6px 18px rgba(20,10,70,.24); } .quote-brand div,.quote-label { position:relative; z-index:1; } .quote-label span { padding:8px 11px; border:1px solid rgba(255,255,255,.35); border-radius:20px; background:rgba(255,255,255,.14); color:#fff1b8; } .quote-accent { height:8px; background:linear-gradient(90deg,#ffb84a,#ffe17b,#28d7cb,#7f67ff,#ff65b6) !important; } .quote-eyebrow { display:inline-block; padding:8px 12px; border-radius:20px; background:#fff0f7; color:#c02685 !important; } .quote-body h1 { color:#26145b; } .quote-product-card { border:1px solid #e6d9ff; background:linear-gradient(115deg,#f5f0ff 0%,#fff4f9 55%,#effcff 100%) !important; box-shadow:0 12px 28px rgba(77,50,145,.09); } .quote-product-image { border:1px solid #e4d9fa; background:linear-gradient(145deg,#fff,#f0eaff 60%,#e3fbfa) !important; color:#7446c7; } .quote-chip { background:#6d3acb; color:white; } .quote-product-info h2 { color:#38206f; } .quote-customer { border-left-color:#e43d9d; border-radius:0 10px 10px 0; background:linear-gradient(90deg,#fff0f8,#fffafd) !important; } .quote-customer span { color:#c02685; } .quote-total { background:linear-gradient(105deg,#3824a8,#7438d2 55%,#c92e91) !important; box-shadow:0 8px 18px rgba(82,43,157,.2); } .quote-total strong { color:#fff0a8; } .quote-thanks { color:#6c3aba !important; } .quote-footer { margin-top:26px; border-top:0; background:linear-gradient(90deg,#f1ebff,#fff0f8,#edfffd); color:#594188; } } @media screen { .quote-print-root { display: none; } }`}</style>
      <style>{`@media print { .quote-header { background:linear-gradient(118deg,var(--jm-primary),color-mix(in srgb,var(--jm-primary) 72%,var(--jm-secondary)),color-mix(in srgb,var(--jm-primary) 55%,var(--jm-accent))) !important; } .quote-total { background:linear-gradient(105deg,var(--jm-primary),color-mix(in srgb,var(--jm-primary) 70%,var(--jm-secondary)),color-mix(in srgb,var(--jm-primary) 50%,var(--jm-accent))) !important; } .quote-print-sheet[data-quote-style="elegante"] .quote-header { background:linear-gradient(120deg,#172033,#344256 58%,#8b6a3e) !important; } .quote-print-sheet[data-quote-style="elegante"] .quote-accent { background:linear-gradient(90deg,#8b6a3e,#e6d2a8,#8b6a3e) !important; } .quote-print-sheet[data-quote-style="elegante"] .quote-total { background:linear-gradient(110deg,#172033,#344256) !important; } .quote-print-sheet[data-quote-style="elegante"] .quote-chip { background:#8b6a3e !important; } .quote-print-sheet[data-quote-style="minimalista"] .quote-header { background:#fff !important; color:#172033 !important; border-bottom:2px solid var(--jm-primary); } .quote-print-sheet[data-quote-style="minimalista"] .quote-brand span,.quote-print-sheet[data-quote-style="minimalista"] .quote-label small { color:#64748b !important; } .quote-print-sheet[data-quote-style="minimalista"] .quote-label span { color:var(--jm-primary) !important; border-color:var(--jm-primary); } .quote-print-sheet[data-quote-style="minimalista"] .quote-accent { height:3px !important; background:var(--jm-primary) !important; } .quote-print-sheet[data-quote-style="minimalista"] .quote-product-card { background:#fff !important; box-shadow:none !important; border-color:#dce1e8 !important; } .quote-print-sheet[data-quote-style="minimalista"] .quote-total { background:var(--jm-primary) !important; box-shadow:none !important; } .quote-print-sheet[data-quote-style="minimalista"] .quote-chip { background:#eef0f4 !important; color:#344256 !important; } .quote-product-no-image .quote-product-info { padding:12px; } }`}</style>
      <style>{`@media print { .quote-header { background:#112250 !important; color:#F5F0E9 !important; padding:12px 0 !important; border-bottom:3px solid #E0C58F !important; } .quote-brand img,.quote-accent,.quote-eyebrow,.quote-chip,.quote-thanks { display:none !important; } .quote-brand strong,.quote-brand span,.quote-label span,.quote-label small { color:#F5F0E9 !important; } .quote-brand strong { font-size:16px !important; } .quote-body { padding:20px 0 !important; } .quote-body h1 { font: bold 20px Arial,sans-serif !important; color:#112250 !important; } .quote-product-card { margin:14px 0 !important; padding:0 !important; border:0 !important; border-radius:0 !important; background:#F5F0E9 !important; box-shadow:none !important; } .quote-product-image { flex-basis:90px !important; width:90px !important; height:90px !important; background:#F5F0E9 !important; } .quote-customer { padding:8px 0 !important; border:0 !important; background:#F5F0E9 !important; } .quote-customer span,.quote-customer strong,.quote-product-info h2,.quote-product-info p { color:#112250 !important; } .quote-items-heading { border-color:#D9CBC2 !important; color:#3C507D !important; } .quote-line { padding:10px 0 !important; color:#3C507D !important; } .quote-total { margin-top:0 !important; padding:10px 0 !important; border-radius:0 !important; border-top:1px solid #D9CBC2 !important; background:#F5F0E9 !important; color:#112250 !important; } .quote-total strong { color:#112250 !important; } .quote-footer { margin-top:10px !important; padding:10px 0 !important; border-top:1px solid #D9CBC2 !important; color:#3C507D !important; background:#F5F0E9 !important; } }`}</style>
      <style>{`@media print { .quote-print-sheet { background:#fff !important; color:#112250 !important; } .quote-header,.quote-product-card,.quote-customer,.quote-total,.quote-footer { background:#fff !important; color:#112250 !important; } .quote-header { border-bottom:2px solid #112250 !important; } .quote-brand strong,.quote-brand span,.quote-label span,.quote-label small,.quote-body h1,.quote-product-info h2,.quote-product-info p,.quote-customer span,.quote-customer strong,.quote-line,.quote-total,.quote-total strong,.quote-footer { color:#112250 !important; } .quote-items-heading,.quote-footer { border-color:#3C507D !important; } .quote-line { border-bottom:1px solid #D9CBC2 !important; } }`}</style>
      <style>{`@media print { .quote-header { display:flex !important; align-items:center !important; justify-content:space-between !important; padding:0 0 14px !important; border-bottom:2px solid #112250 !important; background:#fff !important; color:#112250 !important; } .quote-brand { display:flex !important; align-items:center !important; gap:12px !important; } .quote-brand img { display:block !important; width:64px !important; height:48px !important; border:0 !important; border-radius:0 !important; padding:0 !important; background:#fff !important; box-shadow:none !important; } .quote-brand strong { color:#112250 !important; font-size:16px !important; letter-spacing:0 !important; } .quote-brand span,.quote-label small,.quote-label span { color:#3C507D !important; font-size:10px !important; letter-spacing:0 !important; } .quote-label span { padding:0 !important; border:0 !important; background:transparent !important; font-weight:700 !important; } .quote-body { max-width:none !important; padding:16px 0 !important; } .quote-customer { display:grid !important; grid-template-columns:1fr 1fr !important; gap:8px !important; margin:0 !important; padding:12px 0 !important; border:0 !important; border-bottom:1px solid #D9CBC2 !important; border-radius:0 !important; background:#fff !important; } .quote-customer p { margin:0 !important; color:#112250 !important; font-size:12px !important; } .quote-customer span { display:inline !important; color:#3C507D !important; font-weight:400 !important; } .quote-customer strong { display:inline !important; color:#112250 !important; font-size:12px !important; } .quote-table { width:100% !important; border-collapse:collapse !important; color:#112250 !important; font-size:12px !important; } .quote-table th { padding:8px 4px !important; border-top:1px solid #3C507D !important; border-bottom:1px solid #3C507D !important; color:#3C507D !important; text-align:left !important; } .quote-table th:not(:first-child),.quote-table td:not(:first-child) { text-align:right !important; } .quote-table td { padding:8px 4px !important; border-bottom:1px solid #D9CBC2 !important; color:#112250 !important; } .quote-table small { display:block !important; margin-top:3px !important; color:#3C507D !important; font-size:10px !important; } .quote-total { display:flex !important; justify-content:flex-end !important; gap:40px !important; margin:12px 0 0 !important; padding:10px 4px !important; border:0 !important; border-radius:0 !important; background:#fff !important; color:#112250 !important; font-size:13px !important; } .quote-total strong { color:#112250 !important; font-size:13px !important; } .quote-footer { margin:18px 0 0 !important; padding:10px 0 0 !important; border-top:1px solid #D9CBC2 !important; background:#fff !important; color:#3C507D !important; font-size:10px !important; } }`}</style>
      <style>{`@media print { .quote-total { background:#112250 !important; color:#fff !important; padding:10px 12px !important; border:0 !important; border-radius:4px !important; } .quote-total span,.quote-total strong { color:#fff !important; } .quote-print-root { padding:24px !important; } .quote-print-sheet { min-height:auto !important; } }`}</style>
    </div>
  );
}

function CatalogField({ label, value, onChange, ...props }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" {...props} /></label>;
}
