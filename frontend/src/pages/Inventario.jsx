import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const emptyForm = { marca_id: '', codigo_qr: '', sku: '', nombre: '', descripcion: '', precio: '', costo_nio: 0, costo_envio_nio: 0, margen_utilidad_pct: 30, stock: 0, stock_critico: 5, imagen_url: '', estado_id: '' };
const money = (value) => new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(Number(value || 0));
const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';
const apiError = (error) => error.response?.data?.detail || (error.response?.status === 500
  ? `El backend respondió HTTP 500${error.config?.url ? ` en ${error.config.url}` : ''}. Revisa los logs de Vercel del servicio backend.`
  : 'No se pudo completar la operación.');

export default function InventarioPage() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [states, setStates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [file, setFile] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const productImagePreview = useMemo(() => productImage ? URL.createObjectURL(productImage) : '', [productImage]);
  const [importBrand, setImportBrand] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [importReport, setImportReport] = useState(null);

  const loadData = async () => {
    const [productsResponse, brandsResponse, statesResponse] = await Promise.all([
      api.get('/inventario/'), api.get('/inventario/marcas'), api.get('/inventario/estados'),
    ]);
    setProducts(productsResponse.data);
    setBrands(brandsResponse.data);
    setStates(statesResponse.data);
  };

  useEffect(() => {
    loadData().catch((e) => setError(apiError(e))).finally(() => setLoading(false));
  }, []);

  useEffect(() => () => { if (productImagePreview) URL.revokeObjectURL(productImagePreview); }, [productImagePreview]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesTerm = !term || [product.id, product.nombre, product.descripcion, product.sku, product.codigo_qr, product.marca_nombre]
        .some((value) => String(value || '').toLowerCase().includes(term));
      const matchesBrand = !brandFilter || String(product.marca_id) === brandFilter;
      const matchesState = !stateFilter || String(product.estado_id) === stateFilter;
      const low = Number(product.stock) <= Number(product.stock_critico);
      const matchesStock = stockFilter === 'all' || (stockFilter === 'low' ? low : stockFilter === 'out' ? Number(product.stock) === 0 : !low);
      return matchesTerm && matchesBrand && matchesState && matchesStock;
    });
  }, [products, search, brandFilter, stateFilter, stockFilter]);

  const sortedProducts = useMemo(() => [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc': return Number(a.precio) - Number(b.precio);
      case 'price_desc': return Number(b.precio) - Number(a.precio);
      case 'stock_asc': return Number(a.stock) - Number(b.stock);
      case 'stock_desc': return Number(b.stock) - Number(a.stock);
      case 'newest': return Number(b.id) - Number(a.id);
      default: return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    }
  }), [filtered, sortBy]);
  const hasFilters = Boolean(search || brandFilter || stateFilter || stockFilter !== 'all');
  const clearFilters = () => { setSearch(''); setBrandFilter(''); setStateFilter(''); setStockFilter('all'); setSortBy('name'); };

  const lowStock = products.filter((p) => Number(p.stock) <= Number(p.stock_critico)).length;
  const activeIds = new Set(states.filter((state) => state.nombre.toLowerCase() === 'activo').map((state) => state.id));
  const activeProducts = products.filter((p) => activeIds.has(p.estado_id)).length;
  const costTotal = Number(form.costo_nio || 0) + Number(form.costo_envio_nio || 0);
  const suggestedProfit = costTotal * Number(form.margen_utilidad_pct || 0) / 100;
  const suggestedPrice = costTotal + suggestedProfit;
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setProductImage(null); setShowForm(false); };
  const startCreate = () => {
    const defaultState = states.find((state) => state.modulo?.toLowerCase() === 'inventario') || states[0];
    setForm({ ...emptyForm, estado_id: defaultState ? String(defaultState.id) : '' });
    setProductImage(null); setEditingId(null); setShowForm(true); setError(''); setMessage('');
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    const payload = {
      ...form,
      marca_id: Number(form.marca_id),
      estado_id: Number(form.estado_id || 1),
      precio: Number(form.precio || suggestedPrice),
      costo_nio: Number(form.costo_nio || 0),
      costo_envio_nio: Number(form.costo_envio_nio || 0),
      margen_utilidad_pct: Number(form.margen_utilidad_pct || 0),
      stock: Number(form.stock),
      stock_critico: Number(form.stock_critico),
      codigo_qr: form.codigo_qr.trim() || form.sku.trim() || null,
      sku: form.sku.trim() || null,
      imagen_url: form.imagen_url.trim() || null,
      descripcion: form.descripcion.trim() || null,
    };
    try {
      if (editingId) {
        await api.put(`/inventario/${editingId}`, payload);
        if (productImage) {
          const imagePayload = new FormData();
          imagePayload.append('file', productImage);
          await api.post(`/inventario/${editingId}/imagen`, imagePayload);
        }
        setMessage('Cambios guardados.');
      } else {
        await api.post('/inventario/', payload);
        setMessage('Producto agregado al inventario.');
      }
      resetForm(); await loadData();
    } catch (e) { setError(apiError(e)); }
    finally { setBusy(false); }
  };

  const editProduct = (product) => {
    setEditingId(product.id);
    setForm({ marca_id: String(product.marca_id), codigo_qr: product.codigo_qr || '', sku: product.sku || '', nombre: product.nombre || '', descripcion: product.descripcion || '', precio: String(product.precio), costo_nio: product.costo_nio ?? 0, costo_envio_nio: product.costo_envio_nio ?? 0, margen_utilidad_pct: product.margen_utilidad_pct ?? 30, stock: product.stock, stock_critico: product.stock_critico, imagen_url: product.imagen_url || '', estado_id: String(product.estado_id) });
    setProductImage(null); setShowForm(true); setError(''); setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeProduct = async (product) => {
    if (!window.confirm(`¿Eliminar “${product.nombre}” del inventario?`)) return;
    setError(''); setMessage('');
    try {
      await api.delete(`/inventario/${product.id}`);
      setMessage('Producto eliminado.');
      if (editingId === product.id) resetForm();
      await loadData();
    } catch (e) { setError(apiError(e)); }
  };

  const importProducts = async (event) => {
    event.preventDefault();
    if (!file) { setError('Selecciona un archivo CSV o Excel.'); return; }
    const payload = new FormData(); payload.append('file', file);
    if (importBrand) payload.append('marca_id', importBrand);
    setBusy(true); setError(''); setMessage(''); setImportReport(null);
    try {
      const { data } = await api.post('/inventario/importar', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportReport(data); setMessage(`Importación completada: ${data.creados} nuevos y ${data.actualizados} actualizados.`);
      setFile(null); event.target.reset(); await loadData();
    } catch (e) { setError(apiError(e)); }
    finally { setBusy(false); }
  };

  const downloadTemplate = () => {
    const csv = '\uFEFFmarca,codigo_qr,sku,nombre,descripcion,costo_nio,costo_envio_nio,margen_utilidad_pct,precio,stock,stock_critico,imagen_url,estado_id\nNombre de marca,JM-001,SKU-001,Perfume de ejemplo,100 ml,900,120,35,,10,3,,\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'plantilla-inventario.csv'; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="w-full min-w-0 space-y-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Control de productos</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Inventario</h1><p className="mt-1 text-sm text-slate-500">Agrega productos, edita sus datos y controla las existencias.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={startCreate} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">Agregar producto</button><a href="/compras" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Registrar compra</a></div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Productos registrados" value={products.length} icon="inventory_2" />
        <Metric label="Unidades disponibles" value={products.reduce((sum, p) => sum + Number(p.stock || 0), 0)} icon="stacks" />
        <Metric label="Stock por reponer" value={lowStock} icon="warning" alert={lowStock > 0} />
        <Metric label="Productos activos" value={activeProducts} icon="check_circle" />
      </section>

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) resetForm(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="product-modal-title" className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-indigo-50/60 px-5 py-4 sm:px-6"><div><h2 id="product-modal-title" className="font-bold text-slate-900">{editingId ? 'Editar producto' : 'Agregar producto'}</h2><p className="mt-0.5 text-xs text-slate-500">Completa los campos del producto; los marcados con * son obligatorios.</p></div><button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Cerrar formulario">✕</button></div>
        <form onSubmit={saveProduct} className="grid max-h-[calc(100vh-170px)] gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Nombre del producto *" value={form.nombre} onChange={(v) => setField('nombre', v)} required maxLength={255} placeholder="Ej. Vela aromática" />
          <SelectField label="Marca *" value={form.marca_id} onChange={(v) => setField('marca_id', v)} required><option value="">Seleccionar marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.nombre_marca}</option>)}</SelectField>
          <Field label="Precio de venta (C$)" type="number" min="0" step="0.01" value={form.precio} onChange={(v) => setField('precio', v)} placeholder="Se usará el precio sugerido" />
          <Field label="Costo de compra (C$)" type="number" min="0" step="0.01" value={form.costo_nio} onChange={(v) => setField('costo_nio', v)} placeholder="0.00" />
          <Field label="Costo de envío asignado (C$)" type="number" min="0" step="0.01" value={form.costo_envio_nio} onChange={(v) => setField('costo_envio_nio', v)} placeholder="0.00" />
          <Field label="Utilidad deseada (%)" type="number" min="0" step="0.01" value={form.margen_utilidad_pct} onChange={(v) => setField('margen_utilidad_pct', v)} placeholder="30" />
          <Field label="SKU" value={form.sku} onChange={(v) => setField('sku', v)} maxLength={100} placeholder="Código interno" />
          <Field label="Código QR" value={form.codigo_qr} onChange={(v) => setField('codigo_qr', v)} maxLength={255} placeholder="Vacío para usar el SKU" />
          <SelectField label="Estado *" value={form.estado_id} onChange={(v) => setField('estado_id', v)} required><option value="">Seleccionar estado</option>{states.map((state) => <option key={state.id} value={state.id}>{state.nombre} · {state.modulo}</option>)}</SelectField>
          <Field label="Existencias actuales" type="number" value={form.stock} onChange={() => {}} disabled />
          <Field label="Avisar cuando llegue a *" type="number" min="0" step="1" value={form.stock_critico} onChange={(v) => setField('stock_critico', v)} required />
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600">Imagen del producto (PNG o JPG, máximo 5 MB)
              <input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => setProductImage(event.target.files?.[0] || null)} className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:font-semibold file:text-indigo-700`} />
            </label>
            {productImage && <div className="mt-2 flex items-center gap-3"><img src={productImagePreview} alt="Vista previa" className="h-16 w-16 rounded-lg border border-slate-200 object-cover"/><span className="text-xs text-slate-500">{productImage.name}</span></div>}
            {!productImage && form.imagen_url && <div className="mt-2 flex items-center gap-3"><img src={form.imagen_url} alt="Imagen actual del producto" className="h-16 w-16 rounded-lg border border-slate-200 object-cover"/><span className="text-xs text-slate-500">Imagen actual</span></div>}
          </div>
          <Field label="URL de imagen (opcional)" type="url" value={form.imagen_url} onChange={(v) => setField('imagen_url', v)} placeholder="https://…" />
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">Descripción<textarea value={form.descripcion} onChange={(e) => setField('descripcion', e.target.value)} rows="3" className={inputClass} placeholder="Detalles, presentación o notas del producto" /></label>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 sm:col-span-2"><div className="grid gap-3 sm:grid-cols-4"><Calc label="Precio mínimo" value={costTotal}/><Calc label={`Utilidad (${Number(form.margen_utilidad_pct || 0)}%)`} value={suggestedProfit}/><Calc label="Precio sugerido" value={suggestedPrice} highlight/><div className="flex items-end"><button type="button" onClick={() => setField('precio', suggestedPrice.toFixed(2))} className="w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700">Usar precio sugerido</button></div></div><p className="mt-2 text-xs text-slate-500">El precio mínimo cubre compra y envío sin utilidad. El sugerido suma el porcentaje de utilidad. Puedes ajustar manualmente el precio de venta.</p></div>
          <div className="sticky bottom-0 -mx-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3 sm:col-span-2 sm:-mx-6 sm:px-6"><button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button><button disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear producto'}</button></div>
        </form>
        </section>
      </div>}

      {showImport && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Importar desde archivo</h2><p className="text-sm text-slate-500">Carga varios productos con un CSV o Excel de hasta 10 MB.</p></div><button onClick={downloadTemplate} className="text-sm font-semibold text-indigo-700 hover:underline">Descargar plantilla</button></div><form onSubmit={importProducts} className="grid gap-3 sm:grid-cols-3 sm:items-end"><label className="text-sm font-medium text-slate-700 sm:col-span-2">Archivo<input type="file" accept=".csv,.xlsx,.xlsm" onChange={(e) => setFile(e.target.files?.[0] || null)} className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:font-semibold file:text-indigo-700`} /></label><SelectField label="Marca predeterminada" value={importBrand} onChange={setImportBrand}><option value="">Usar marca del archivo</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.nombre_marca}</option>)}</SelectField><button disabled={busy} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-3 sm:justify-self-end">{busy ? 'Importando…' : 'Importar archivo'}</button></form>{importReport?.errores?.length > 0 && <div className="mt-4 max-h-36 overflow-auto rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><b>Filas con errores:</b>{importReport.errores.map((item) => <p key={item} className="mt-1">{item}</p>)}</div>}</section>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold text-slate-900">Productos</h2><p className="text-sm text-slate-500">Mostrando {sortedProducts.length} de {products.length}</p></div><div className="flex gap-2">{hasFilters && <button onClick={clearFilters} className="rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">Limpiar filtros</button>}<button onClick={() => { setLoading(true); loadData().catch((e) => setError(apiError(e))).finally(() => setLoading(false)); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Actualizar</button></div></div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, ID, descripción, SKU o QR…" className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 sm:col-span-2 xl:col-span-2"/><select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Todas las marcas</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.nombre_marca}</option>)}</select><select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Todos los estados</option>{states.map((state) => <option key={state.id} value={state.id}>{state.nombre} · {state.modulo}</option>)}</select><select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">Cualquier existencia</option><option value="out">Agotados</option><option value="low">En nivel crítico</option><option value="ok">Stock suficiente</option></select><select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm sm:col-span-2 xl:col-span-5"><option value="name">Orden: nombre A–Z</option><option value="newest">Orden: agregados recientemente</option><option value="price_asc">Orden: menor precio</option><option value="price_desc">Orden: mayor precio</option><option value="stock_asc">Orden: menor existencia</option><option value="stock_desc">Orden: mayor existencia</option></select></div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Marca / SKU</th><th className="px-4 py-3">Costo / venta / utilidad</th><th className="px-4 py-3">Existencia</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{sortedProducts.map((product) => { const low = Number(product.stock) <= Number(product.stock_critico); const state = states.find((item) => item.id === product.estado_id); return <tr key={product.id} className="hover:bg-slate-50/80"><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">{product.imagen_url ? <img src={product.imagen_url} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span className="material-symbols-outlined text-xl text-slate-400">inventory_2</span>}</div><div><p className="font-semibold text-slate-900">{product.nombre}</p><p className="max-w-xs truncate text-xs text-slate-500">{product.descripcion || `QR: ${product.codigo_qr}`}</p></div></div></td><td className="px-4 py-3"><p className="font-medium text-slate-700">{product.marca_nombre || '—'}</p><p className="font-mono text-xs text-slate-400">{product.sku || 'Sin SKU'}</p></td><td className="px-4 py-3"><p className="font-semibold text-slate-800">Venta: {money(product.precio)}</p><p className="text-xs text-slate-500">Costo: {money(product.costo_total_nio ?? product.costo_nio)}</p><p className="text-xs font-medium text-emerald-700">Utilidad: {money(product.utilidad_nio)} ({Number(product.margen_utilidad_pct || 0)}%)</p></td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${low ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{product.stock} uds.</span><p className="mt-1 text-[11px] text-slate-400">Mínimo: {product.stock_critico}</p></td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{state?.nombre || `Estado ${product.estado_id}`}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => editProduct(product)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">Editar</button><button onClick={() => removeProduct(product)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Eliminar</button></div></td></tr>; })}{!loading && !sortedProducts.length && <tr><td colSpan="6" className="px-4 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100"><span className="material-symbols-outlined text-slate-400">inventory_2</span></div><p className="mt-3 font-semibold text-slate-700">{products.length ? 'No hay productos para estos filtros' : 'Tu inventario está vacío'}</p><p className="mt-1 text-sm text-slate-500">{products.length ? 'Prueba con otra búsqueda o filtro.' : 'Registra una compra a un proveedor para agregar productos al inventario.'}</p></td></tr>}{loading && <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-500">Cargando inventario…</td></tr>}</tbody></table></div>
      </section>
    </main>
  );
}

function Metric({ label, value, icon, alert = false }) { return <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${alert ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}><span className="material-symbols-outlined">{icon}</span></div><div><p className="text-sm text-slate-500">{label}</p><p className={`mt-0.5 text-2xl font-bold ${alert ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p></div></div>; }
function Calc({ label, value, highlight = false }) { return <div><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-lg font-bold ${highlight ? 'text-indigo-700' : 'text-slate-900'}`}>{money(value)}</p></div>; }
function Field({ label, value, onChange, ...props }) { return <label className="text-sm font-medium text-slate-700">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} {...props} /></label>; }
function SelectField({ label, value, onChange, children, ...props }) { return <label className="text-sm font-medium text-slate-700">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} {...props}>{children}</select></label>; }
