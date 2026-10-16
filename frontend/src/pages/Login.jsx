import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api, { AUTH_STORAGE_KEY } from '../services/api';
import { applyTheme, getTheme } from '../services/theme';

export default function LoginPage({ onAuthenticated }) {
  const [theme] = useState(getTheme);
  const [firstAdmin, setFirstAdmin] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState({ nombre: '', email: '', usuario: '', password: '' });
  const location = useLocation();

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => {
    api.get('/admin/registro-disponible')
      .then(({ data }) => setFirstAdmin(Boolean(data.disponible)))
      .catch(() => setFirstAdmin(false))
      .finally(() => setCheckingSetup(false));
  }, []);

  const finishLogin = async (loginIdentity, loginPassword) => {
    const { data } = await api.post('/auth/login', { usuario: loginIdentity, password: loginPassword });
    sessionStorage.setItem(AUTH_STORAGE_KEY, data.access_token);
    onAuthenticated(data.usuario, location.state?.from || '/');
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await finishLogin(identity, password);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'No se pudo iniciar sesión. Revisa tu conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const registerFirstAdmin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/admin/registro-inicial', { ...form, rol: 'administrador' });
      setFirstAdmin(false);
      await finishLogin(form.usuario, form.password);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'No se pudo crear la primera cuenta. Revisa la conexión y la configuración de la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10';

  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 sm:p-8" style={{ fontFamily: `'${theme.font}', sans-serif`, backgroundColor: theme.surface }}>
    <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:min-h-[620px] lg:grid-cols-[1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex" style={{ background: `linear-gradient(145deg, ${theme.primary}, color-mix(in srgb, ${theme.primary} 58%, ${theme.accent}))` }}>
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full border border-white/20 shadow-[0_0_0_30px_rgba(255,255,255,.06),0_0_0_65px_rgba(255,255,255,.04)]" />
        <div className="relative flex items-center gap-3"><img src={theme.logo} alt={theme.brandName} className="h-14 w-16 rounded-xl bg-white object-contain p-1.5" /><span className="text-xl font-bold tracking-tight">{theme.brandName}</span></div>
        <div className="relative"><span className="material-symbols-outlined text-5xl">{firstAdmin ? 'admin_panel_settings' : 'lock_person'}</span><p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-white/70">{firstAdmin ? 'Configuración inicial' : 'Acceso seguro'}</p><h1 className="mt-3 text-4xl font-bold leading-tight">{firstAdmin ? 'Prepara tu espacio de trabajo.' : 'Todo tu negocio, en un solo lugar.'}</h1><p className="mt-4 max-w-sm text-sm leading-6 text-white/75">{firstAdmin ? 'Crea la cuenta administradora para comenzar.' : 'Inicia sesión con las credenciales asignadas por tu administrador.'}</p></div>
        <p className="relative text-xs text-white/60">{theme.brandName} · Gestión de productos y ventas</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><img src={theme.logo} alt={theme.brandName} className="h-12 w-14 rounded-lg border border-slate-100 object-contain p-1" /><span className="text-lg font-bold text-slate-900">{theme.brandName}</span></div>
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${theme.primary} 10%, white)`, color: theme.primary }}><span className="material-symbols-outlined text-base">{firstAdmin ? 'person_add' : 'verified_user'}</span>{firstAdmin ? 'Primer acceso' : 'Bienvenido de nuevo'}</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{firstAdmin ? 'Crear administrador' : 'Iniciar sesión'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{firstAdmin ? 'Registra la primera cuenta para habilitar el acceso al sistema.' : 'Ingresa tu usuario o correo y contraseña.'}</p>

          {checkingSetup ? <div className="mt-8 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Verificando configuración…</div> : firstAdmin ? <form onSubmit={registerFirstAdmin} className="mt-7 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Nombre completo<input required minLength="2" maxLength="255" autoComplete="name" value={form.nombre} onChange={(e) => updateForm('nombre', e.target.value)} className={inputClass} placeholder="Tu nombre" /></label>
            <label className="block text-sm font-semibold text-slate-700">Correo electrónico<input required type="email" maxLength="255" autoComplete="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} className={inputClass} placeholder="nombre@negocio.com" /></label>
            <label className="block text-sm font-semibold text-slate-700">Nombre de usuario<input required minLength="3" maxLength="100" pattern="[A-Za-z0-9._-]+" autoComplete="username" value={form.usuario} onChange={(e) => updateForm('usuario', e.target.value)} className={inputClass} placeholder="usuario" /></label>
            <label className="block text-sm font-semibold text-slate-700">Contraseña<input required type="password" minLength="10" maxLength="72" autoComplete="new-password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} className={inputClass} placeholder="Mínimo 10 caracteres" /></label>
            <p className="-mt-2 text-xs text-slate-500">La contraseña se guarda como hash. No podrás recuperarla después.</p>
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: theme.primary }}>{loading ? 'Creando cuenta…' : 'Crear administrador y entrar'}</button>
          </form> : <form onSubmit={submitLogin} className="mt-7 space-y-5">
            <label className="block text-sm font-semibold text-slate-700">Usuario o correo electrónico<input required autoComplete="username" value={identity} onChange={(e) => setIdentity(e.target.value)} className={inputClass} placeholder="usuario o correo@negocio.com" /></label>
            <label className="block text-sm font-semibold text-slate-700">Contraseña<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Tu contraseña" /></label>
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: theme.primary }}>{loading ? 'Validando…' : 'Entrar al sistema'}</button>
          </form>}
          <p className="mt-8 text-center text-xs text-slate-400">Acceso privado · {theme.brandName}</p>
        </div>
      </div>
    </section>
  </main>;
}
