import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { applyTheme, BRAND_PALETTE, DEFAULT_THEME, getTheme, saveTheme } from '../services/theme';

const roles = [
  ['administrador', 'Administrador'],
  ['supervisor', 'Supervisor'],
  ['cajero', 'Cajero'],
  ['inventario', 'Inventario'],
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('apariencia');
  const [theme, setTheme] = useState(getTheme);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [previewDocument, setPreviewDocument] = useState('cotizacion');
  const [users, setUsers] = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  const [userForm, setUserForm] = useState({ nombre: '', email: '', usuario: '', password: '', rol: 'cajero' });

  useEffect(() => { applyTheme(theme); }, [theme]);


  const updateTheme = (field, value) => {
    setTheme((current) => {
      const next = { ...current, [field]: value };
      applyTheme(next);
      window.dispatchEvent(new CustomEvent('jmstore-theme-change', { detail: next }));
      return next;
    });
    setSaved(false);
  };

  const loadUsers = async (event) => {
    event?.preventDefault();
    setUsersLoading(true);
    setUserError('');
    setUserSuccess('');
    try {
      const response = await api.get('/admin/usuarios');
      setUsers(response.data);
      setUsersLoaded(true);
    } catch (error) {
      setUsersLoaded(false);
      setUserError(error.response?.data?.detail || 'No se pudieron cargar los usuarios.');
    } finally {
      setUsersLoading(false);
    }
  };

  const createUser = async (event) => {
    event.preventDefault();
    setUsersLoading(true);
    setUserError('');
    setUserSuccess('');
    try {
      await api.post('/admin/usuarios', userForm);
      setUserForm({ nombre: '', email: '', usuario: '', password: '', rol: 'cajero' });
      await loadUsers();
      setUserSuccess('Usuario creado. La contraseña se guardó protegida y no se muestra en el listado.');
    } catch (error) {
      setUserError(error.response?.data?.detail || 'No se pudo crear el usuario.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const selectLogo = (event) => {
    const file = event.target.files?.[0];
    setLogoError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('Selecciona un archivo de imagen.');
      return;
    }
    if (file.size > 1_500_000) {
      setLogoError('La imagen debe pesar menos de 1.5 MB para guardarse en este navegador.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateTheme('logo', String(reader.result));
    reader.onerror = () => setLogoError('No se pudo leer el archivo.');
    reader.readAsDataURL(file);
  };

  const resetTheme = () => {
    setTheme({ ...DEFAULT_THEME });
    saveTheme({ ...DEFAULT_THEME });
    setSaved(true);
    setLogoError('');
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-800 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/20 shadow-[0_0_0_25px_rgba(255,255,255,.06),0_0_0_55px_rgba(255,255,255,.04)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[.16em]"><span className="material-symbols-outlined text-base">admin_panel_settings</span> Administración</span><h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Personaliza tu espacio</h1><p className="mt-2 max-w-2xl text-sm text-indigo-100">Define la identidad visual del sistema y administra las credenciales del equipo.</p></div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur"><img src={theme.logo} alt="Vista previa del logo" className="h-11 w-14 rounded-lg bg-white object-contain p-1" /><span className="font-semibold">{theme.brandName || 'Tu negocio'}</span></div>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Secciones administrativas">
        <TabButton active={activeTab === 'apariencia'} onClick={() => setActiveTab('apariencia')} icon="palette">Tema y apariencia</TabButton>
        <TabButton active={activeTab === 'usuarios'} onClick={() => setActiveTab('usuarios')} icon="manage_accounts">Usuarios y credenciales</TabButton>
      </nav>

      {activeTab === 'apariencia' ? <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6"><h2 className="text-lg font-bold text-slate-900">Identidad visual</h2><p className="mt-1 text-sm text-slate-500">Los cambios se aplican a los módulos de esta aplicación en este navegador.</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Nombre del negocio<input value={theme.brandName} onChange={(e) => updateTheme('brandName', e.target.value)} maxLength="60" placeholder="JMscents" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
            <div className="sm:col-span-2"><p className="text-sm font-semibold text-slate-700">Paleta fija del negocio</p><p className="mt-1 text-xs text-slate-500">Estos colores se aplican al sistema y a los documentos; no se pueden modificar.</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">{[
              ['Azul zafiro', BRAND_PALETTE.primary], ['Azul real', BRAND_PALETTE.secondary], ['Arena', BRAND_PALETTE.accent], ['Marfil', BRAND_PALETTE.surface], ['Piedra', BRAND_PALETTE.border],
            ].map(([name, color]) => <div key={name} className="overflow-hidden rounded-xl border border-slate-200"><div className="h-12 border-b border-black/5" style={{ backgroundColor: color }} /><div className="p-2"><p className="text-xs font-semibold text-slate-700">{name}</p><p className="font-mono text-[10px] text-slate-500">{color}</p></div></div>)}</div></div>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Tipografía<select value={theme.font} onChange={(e) => updateTheme('font', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">{['Arial', 'Trebuchet MS', 'Verdana', 'Tahoma', 'Georgia', 'system-ui'].map((font) => <option key={font} value={font}>{font}</option>)}</select></label>
            <div className="sm:col-span-2"><label className="text-sm font-semibold text-slate-700">Logo del negocio</label><div className="mt-1.5 flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-slate-300 p-4"><img src={theme.logo} alt="Logo seleccionado" className="h-16 w-24 rounded-lg border border-slate-200 bg-white object-contain p-2" /><label className="cursor-pointer rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"><span className="material-symbols-outlined mr-1 inline-block align-middle text-lg">upload</span>Subir imagen<input type="file" accept="image/*" onChange={selectLogo} className="sr-only" /></label><span className="text-xs text-slate-500">PNG, JPG o SVG · máximo 1.5 MB</span></div>{logoError && <p className="mt-2 text-sm text-rose-600">{logoError}</p>}<label className="mt-3 block text-xs font-medium text-slate-500">O pega el enlace de una imagen<input value={theme.logo.startsWith('data:') ? '' : theme.logo} onChange={(e) => updateTheme('logo', e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-indigo-500" /></label></div>
            <div className="sm:col-span-2 mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="mb-4"><h3 className="font-bold text-slate-900">Plantillas de cotización y factura</h3><p className="mt-1 text-sm text-slate-500">Ajusta la apariencia y revisa ambos documentos en la vista previa.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Texto bajo el nombre<input value={theme.quoteTagline ?? DEFAULT_THEME.quoteTagline} onChange={(e) => updateTheme('quoteTagline', e.target.value)} maxLength="100" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Pie de cotización<input value={theme.quoteFooter ?? DEFAULT_THEME.quoteFooter} onChange={(e) => updateTheme('quoteFooter', e.target.value)} maxLength="120" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
                <label className="text-sm font-semibold text-slate-700">Pie de factura<input value={theme.invoiceFooter ?? DEFAULT_THEME.invoiceFooter} onChange={(e) => updateTheme('invoiceFooter', e.target.value)} maxLength="120" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
              </div>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5"><button type="button" onClick={resetTheme} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Restaurar valores iniciales</button><button type="button" onClick={() => { saveTheme(theme); setSaved(true); }} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"><span className="material-symbols-outlined text-lg">save</span>{saved ? 'Cambios guardados' : 'Guardar tema'}</button></div>
        </div>

        <aside className="space-y-4">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="font-bold text-slate-900">Vista previa del documento</h3><p className="mt-1 text-sm text-slate-500">Ejemplo de cómo lo recibirá tu cliente.</p></div>
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button type="button" onClick={() => setPreviewDocument('cotizacion')} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${previewDocument === 'cotizacion' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Cotización</button>
                  <button type="button" onClick={() => setPreviewDocument('factura')} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${previewDocument === 'factura' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Factura</button>
                </div>
              </div>
              <div className="mt-4"><DocumentPreview type={previewDocument} theme={theme} /></div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5"><div className="flex items-start gap-3"><span className="material-symbols-outlined rounded-lg bg-white p-2 text-indigo-600">devices</span><div><h3 className="font-bold text-indigo-950">Guardado en este navegador</h3><p className="mt-1 text-sm leading-relaxed text-indigo-800">La paleta, tipografía y logo se conservan aquí al recargar. Para verla en otro equipo, vuelve a configurarla allí.</p></div></div></div>
          </div>
        </aside>
      </section> : <UsersSection
        users={users}
        usersLoaded={usersLoaded}
        usersLoading={usersLoading}
        userError={userError}
        userSuccess={userSuccess}
        userForm={userForm}
        setUserForm={setUserForm}
        loadUsers={loadUsers}
        createUser={createUser}
      />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }) {
  return <button type="button" onClick={onClick} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}><span className="material-symbols-outlined text-lg">{icon}</span>{children}</button>;
}

function DocumentPreview({ type, theme }) {
  const isQuote = type === 'cotizacion';
  const now = new Date();
  const date = new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(now);
  const time = new Intl.DateTimeFormat('es-NI', { timeStyle: 'short' }).format(now);

  if (isQuote) {
    return (
      <article className="border border-slate-200 bg-white p-4 text-slate-900" style={{ fontFamily: `'${theme.font}', sans-serif` }}>
        <header className="flex items-center justify-between gap-2 border-b-2 border-[#112250] pb-3">
          <div className="flex min-w-0 items-center gap-2">{theme.logo && <img src={theme.logo} alt="Logo" className="h-9 w-12 object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}<div className="min-w-0"><p className="truncate text-xs font-bold text-[#112250]">{theme.brandName || 'Tu negocio'}</p><p className="truncate text-[9px] text-[#3C507D]">{theme.quoteTagline || 'Perfumería'}</p></div></div>
          <div className="shrink-0 text-right"><p className="text-[9px] font-bold uppercase text-[#112250]">Cotización</p><p className="mt-1 text-[8px] text-[#3C507D]">{date} · {time}</p></div>
        </header>
        <section className="grid grid-cols-2 gap-2 border-b border-slate-200 py-3 text-[9px]"><p><span className="text-slate-500">Cliente:</span> Cliente de ejemplo</p><p><span className="text-slate-500">Teléfono:</span> +505 8888 8888</p></section>
        <table className="w-full text-left text-[9px]"><thead className="border-y border-slate-200 bg-slate-50 uppercase text-slate-500"><tr><th className="py-1.5">Producto</th><th className="py-1.5 text-right">Cant.</th><th className="py-1.5 text-right">Precio</th><th className="py-1.5 text-right">Desc.</th><th className="py-1.5 text-right">Importe</th></tr></thead><tbody><tr className="border-b border-slate-100"><td className="py-2">Club de Nuit Urban Elixir<small className="block text-slate-400">CAT-8</small></td><td className="py-2 text-right">1</td><td className="py-2 text-right">C$ 1,450.00</td><td className="py-2 text-right">C$ 0.00</td><td className="py-2 text-right font-semibold">C$ 1,450.00</td></tr><tr className="border-b border-slate-100"><td className="py-2">9 AM Dive<small className="block text-slate-400">CAT-24</small></td><td className="py-2 text-right">2</td><td className="py-2 text-right">C$ 1,207.80</td><td className="py-2 text-right">C$ 0.00</td><td className="py-2 text-right font-semibold">C$ 2,415.60</td></tr></tbody></table>
        <div className="ml-auto mt-3 max-w-[180px] rounded-lg bg-[#112250] px-3 py-2.5 text-white"><PreviewAmount label="Total" value="C$ 3,865.60" strong color="#fff" /></div>
        <p className="mt-4 border-t border-slate-200 pt-2 text-center text-[8px] text-slate-500">{theme.quoteFooter || 'Gracias por tu preferencia.'}</p>
      </article>
    );
  }

  return (
    <article className="border border-slate-200 bg-white p-4 text-slate-900" style={{ fontFamily: `'${theme.font}', sans-serif` }}>
      <header className="flex items-center justify-between gap-2 border-b-2 border-[#112250] pb-3">
        <div className="flex min-w-0 items-center gap-2">{theme.logo && <img src={theme.logo} alt="Logo" className="h-9 w-12 object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}<div className="min-w-0"><p className="truncate text-xs font-bold text-[#112250]">{theme.brandName || 'Tu negocio'}</p><p className="truncate text-[9px] text-[#3C507D]">{theme.quoteTagline || 'Perfumería'}</p></div></div>
        <div className="shrink-0 text-right"><p className="text-[9px] font-bold uppercase text-[#112250]">Factura #0001</p><p className="mt-1 text-[8px] text-[#3C507D]">{date} · {time}</p></div>
      </header>
      <section className="grid grid-cols-2 gap-2 border-b border-slate-200 py-3 text-[9px]"><p><span className="text-slate-500">Cliente:</span> Cliente de ejemplo</p><p><span className="text-slate-500">Teléfono:</span> +505 8888 8888</p><p><span className="text-slate-500">Correo:</span> cliente@ejemplo.com</p><p><span className="text-slate-500">Estado de pago:</span> Parcial</p></section>
      <table className="w-full text-left text-[9px]"><thead className="border-y border-slate-200 bg-slate-50 uppercase text-slate-500"><tr><th className="py-1.5">Producto</th><th className="py-1.5 text-right">Cant.</th><th className="py-1.5 text-right">Precio</th><th className="py-1.5 text-right">Desc.</th><th className="py-1.5 text-right">Importe</th></tr></thead><tbody><tr className="border-b border-slate-100"><td className="py-2">Club de Nuit Urban Elixir<small className="block text-slate-400">CAT-8</small></td><td className="py-2 text-right">1</td><td className="py-2 text-right">C$ 1,450.00</td><td className="py-2 text-right">C$ 0.00</td><td className="py-2 text-right font-semibold">C$ 1,450.00</td></tr></tbody></table>
      <div className="ml-auto mt-3 max-w-[160px] border-t border-slate-200 pt-2"><PreviewAmount label="Total" value="C$ 1,450.00" strong color="#112250" /><PreviewAmount label="Abonado" value="C$ 800.00" /><PreviewAmount label="Saldo pendiente" value="C$ 650.00" strong /></div>
      <p className="mt-4 border-t border-slate-200 pt-2 text-center text-[8px] text-slate-500">{theme.invoiceFooter || 'Gracias por tu compra.'}</p>
    </article>
  );
}

function PreviewAmount({ label, value, strong = false, color }) {
  return <div className={`flex items-center justify-between text-[10px] ${strong ? 'font-bold' : 'text-slate-500'}`}><span>{label}</span><span style={color ? { color } : undefined}>{value}</span></div>;
}
function UsersSection({ users, usersLoaded, usersLoading, userError, userSuccess, userForm, setUserForm, loadUsers, createUser }) {
  return <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">Equipo y accesos</h2><p className="mt-1 text-sm text-slate-500">Crea cuentas con rol y contraseña protegida.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Contraseñas cifradas</span></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">Sesión autenticada como administrador.</p><button type="button" onClick={loadUsers} disabled={usersLoading} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{usersLoading ? "Cargando..." : "Actualizar lista"}</button></div>
      </div>
      {userError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{userError}</div>}
      {userSuccess && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{userSuccess}</div>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h3 className="font-bold text-slate-900">Usuarios registrados</h3><p className="mt-1 text-xs text-slate-500">{usersLoaded ? `${users.length} cuentas` : "Cargando usuarios..."}</p></div><span className="material-symbols-outlined text-2xl text-indigo-500">groups</span></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Correo</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{usersLoaded && users.map((user) => <tr key={user.id}><td className="px-4 py-3"><p className="font-semibold text-slate-800">{user.nombre}</p><p className="text-xs text-slate-400">@{user.usuario}</p></td><td className="px-4 py-3 text-slate-600">{user.email}</td><td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-700">{user.rol}</span></td><td className="px-4 py-3"><span className="text-xs text-slate-500">Estado {user.estado_id}</span></td></tr>)}{usersLoaded && !users.length && <tr><td colSpan="4" className="px-4 py-10 text-center text-slate-500">Todavía no hay usuarios creados.</td></tr>}{!usersLoaded && <tr><td colSpan="4" className="px-4 py-10 text-center text-slate-500">No se pudo cargar la lista de usuarios.</td></tr>}</tbody></table></div></div>
    </div>

    <form onSubmit={createUser} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><span className="material-symbols-outlined rounded-xl bg-indigo-50 p-2.5 text-indigo-600">person_add</span><div><h2 className="font-bold text-slate-900">Crear usuario</h2><p className="text-xs text-slate-500">Datos de acceso de la cuenta nueva</p></div></div><UserField label="Nombre completo" value={userForm.nombre} onChange={(value) => setUserForm({ ...userForm, nombre: value })} required maxLength="255" autoComplete="name" /><UserField label="Correo electrónico" type="email" value={userForm.email} onChange={(value) => setUserForm({ ...userForm, email: value })} required maxLength="255" autoComplete="email" /><UserField label="Nombre de usuario" value={userForm.usuario} onChange={(value) => setUserForm({ ...userForm, usuario: value })} required minLength="3" maxLength="100" autoComplete="username" pattern="[A-Za-z0-9._-]+" /><label className="block text-sm font-semibold text-slate-700">Rol<select required value={userForm.rol} onChange={(e) => setUserForm({ ...userForm, rol: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><UserField label="Contraseña temporal" type="password" value={userForm.password} onChange={(value) => setUserForm({ ...userForm, password: value })} required minLength="10" maxLength="72" autoComplete="new-password" /><p className="-mt-2 text-xs text-slate-500">Mínimo 10 caracteres. Se almacena como hash y no se puede recuperar desde el listado.</p><button type="submit" disabled={usersLoading || !usersLoaded} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><span className="material-symbols-outlined text-lg">add_moderator</span>{usersLoading ? 'Procesando…' : 'Crear credenciales'}</button>{!usersLoaded && <p className="text-center text-xs text-amber-700">Primero valida el token para habilitar la creación.</p>}</form>
  </section>;
}

function UserField({ label, type = 'text', value, onChange, ...props }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} {...props} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>;
}
