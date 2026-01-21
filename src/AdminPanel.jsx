// src/AdminPanel.jsx - Panel de Administración SMARTDATA v6 - Dashboard Ejecutivo
import React, { useEffect, useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import * as XLSX from 'xlsx';
import "./styles.css";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxusgksD7YkdTw1zcCydJyUZnXQQOgMVDKiijeeKP8M5rzeOJAwdDsLHyws2X0MwVTI/exec";
const SESSION_TIMEOUT = 10 * 60 * 1000;

// Tema claro - Alta legibilidad (textos negros)
const COLORS = {
  primary: "#84cc16",
  primaryDark: "#65a30d",
  primaryLight: "#ecfccb",
  accent: "#0ea5e9",
  accentLight: "#e0f2fe",
  text: "#000000",
  textSecondary: "#374151",
  darkBg: "#f8fafc",
  cardBg: "#ffffff",
  border: "#d1d5db",
  inputBg: "#f9fafb",
  white: "#ffffff",
  success: "#16a34a",
  successLight: "#dcfce7",
  warning: "#d97706",
  warningLight: "#fef3c7",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  fundador: "#7c3aed",
  fundadorLight: "#ede9fe",
  info: "#2563eb",
  infoLight: "#dbeafe"
};

const PRECIOS_DEFAULT = {
  REGULAR: { precioBase: 39, precioVendedorExtra: 7, vendedoresIncluidos: 4 },
  FUNDADOR: { precioBase: 29, precioVendedorExtra: 5, vendedoresIncluidos: 4 }
};

// Spinner
const Spinner = ({ size = "md", color = COLORS.primary }) => {
  const sizes = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" };
  return <div className={`animate-spin rounded-full border-4 border-gray-200 ${sizes[size]}`} style={{ borderTopColor: color }}></div>;
};

// Toast
const Toast = ({ message, type = "success", onClose }) => {
  const styles = {
    success: { bg: COLORS.successLight, border: COLORS.success },
    error: { bg: COLORS.dangerLight, border: COLORS.danger },
    warning: { bg: COLORS.warningLight, border: COLORS.warning }
  };
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4" style={{ backgroundColor: styles[type].bg, borderColor: styles[type].border }}>
        <span className="font-semibold" style={{ color: COLORS.text }}>{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-70 text-xl">&times;</button>
      </div>
    </div>
  );
};

// Loading Modal
const LoadingModal = ({ message }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
      <Spinner size="lg" />
      <p className="text-lg font-semibold" style={{ color: COLORS.text }}>{message}</p>
    </div>
  </div>
);

function AdminPanel() {
  // Estados
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [vista, setVista] = useState("dashboard");
  const [cargando, setCargando] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const [modalCrearEmpresa, setModalCrearEmpresa] = useState(false);
  const [modalEditarEmpresa, setModalEditarEmpresa] = useState(false);
  const [modalCrearToken, setModalCrearToken] = useState(false);
  const [modalTokens, setModalTokens] = useState(false);
  const [modalDetalleEstado, setModalDetalleEstado] = useState(null);
  const [cargandoTokens, setCargandoTokens] = useState(false);
  const [empresaCargando, setEmpresaCargando] = useState(null);
  const [tokenMensaje, setTokenMensaje] = useState(null);
  const [busquedaEmpresa, setBusquedaEmpresa] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [formEmpresa, setFormEmpresa] = useState({
    empresa_id: "", nombre: "", plan: "PLAN PYME", spreadsheetId: "",
    sheetPedidosNombre: "Pedidos+", activa: true, direccion: "", telefono: "", 
    email: "", clientesCsvUrl: "", productosCsvUrl: "", fechaInicio: "", 
    fechaVencimiento: "", tipoPago: "MENSUAL", tipoCliente: "REGULAR", 
    precioBase: 39, precioVendedorExtra: 7, vendedoresIncluidos: 4, descuento: 0
  });
  const [formToken, setFormToken] = useState({ vendedor: "", empresa_id: "", activo: true });

  // API
  const apiCall = async (action, extraParams = {}) => {
    const params = new URLSearchParams({ action, user: adminUser, pass: adminPass, ...extraParams });
    const res = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
    return await res.json();
  };

  const showToast = (message, type = "success") => setToast({ message, type });

  // Auth
  const handleLogin = async () => {
    setError(""); setLoadingMessage("Verificando..."); setCargando(true);
    try {
      const params = new URLSearchParams({ action: "adminLogin", user: usuario, pass: password });
      const res = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
      const data = await res.json();
      if (data.status === "success") {
        setAdminUser(usuario); setAdminPass(password); setAutenticado(true);
        sessionStorage.setItem("admin_session", JSON.stringify({ user: usuario, pass: password, lastActivity: Date.now() }));
        showToast("Bienvenido", "success");
      } else setError(data.message || "Error");
    } catch (err) { setError("Error de conexión"); }
    finally { setCargando(false); setLoadingMessage(""); }
  };

  const handleLogout = () => {
    setAutenticado(false); setAdminUser(""); setAdminPass(""); setUsuario(""); setPassword("");
    sessionStorage.removeItem("admin_session");
  };

  // Data loading
  const cargarDashboard = async () => {
    setCargando(true); setLoadingMessage("Cargando métricas...");
    try {
      const data = await apiCall("adminDashboard");
      if (data.status === "success") setMetrics(data.metrics);
    } catch (err) { console.error(err); }
    finally { setCargando(false); setLoadingMessage(""); }
  };

  const cargarEmpresas = async () => {
    try {
      const data = await apiCall("adminGetEmpresas");
      if (data.status === "success") setEmpresas(data.empresas);
    } catch (err) { console.error(err); }
  };

  const cargarTokensEmpresa = async (empresaId) => {
    setCargandoTokens(true);
    try {
      const data = await apiCall("adminGetTokens", { empresa_id: empresaId });
      if (data.status === "success") setTokens(data.tokens);
    } catch (err) { console.error(err); }
    finally { setCargandoTokens(false); }
  };

  // CRUD
  const crearEmpresa = async () => {
    setLoadingMessage("Creando empresa..."); setCargando(true);
    try {
      const data = await apiCall("adminCreateEmpresa", { datos: JSON.stringify(formEmpresa) });
      if (data.status === "success") {
        setModalCrearEmpresa(false); await cargarEmpresas(); await cargarDashboard(); resetFormEmpresa();
        showToast("✓ Empresa creada exitosamente", "success");
      } else showToast("Error: " + data.message, "error");
    } catch (err) { showToast("Error de conexión", "error"); }
    finally { setCargando(false); setLoadingMessage(""); }
  };

  const actualizarEmpresa = async () => {
    setLoadingMessage("Guardando cambios..."); setCargando(true);
    try {
      const data = await apiCall("adminUpdateEmpresa", { empresa_id: empresaSeleccionada.empresa_id, datos: JSON.stringify(formEmpresa) });
      if (data.status === "success") {
        setModalEditarEmpresa(false); await cargarEmpresas(); await cargarDashboard();
        showToast("✓ Cambios guardados", "success");
      } else showToast("Error: " + data.message, "error");
    } catch (err) { showToast("Error de conexión", "error"); }
    finally { setCargando(false); setLoadingMessage(""); }
  };

  const toggleActivaEmpresa = async (empresa) => {
    setEmpresaCargando(empresa.empresa_id);
    try {
      const data = await apiCall("adminUpdateEmpresa", { empresa_id: empresa.empresa_id, datos: JSON.stringify({ activa: !empresa.activa }) });
      if (data.status === "success") {
        setEmpresas(prev => prev.map(e => e.empresa_id === empresa.empresa_id ? { ...e, activa: !empresa.activa } : e));
        showToast(empresa.activa ? "Empresa desactivada" : "Empresa activada", "success");
      }
    } catch (err) { showToast("Error", "error"); }
    finally { setEmpresaCargando(null); }
  };

  const crearToken = async () => {
    setLoadingMessage("Creando token..."); setCargando(true);
    try {
      const data = await apiCall("adminCreateToken", { datos: JSON.stringify({ ...formToken, empresa_id: empresaSeleccionada.empresa_id }) });
      if (data.status === "success") {
        setTokens(prev => [...prev, { token: data.token, vendedor: formToken.vendedor, empresa_id: empresaSeleccionada.empresa_id, activo: true }]);
        setModalCrearToken(false); setFormToken({ vendedor: "", activo: true });
        showToast("Token: " + data.token, "success");
      }
    } catch (err) { showToast("Error", "error"); }
    finally { setCargando(false); setLoadingMessage(""); }
  };

  const toggleActivoToken = async (token) => {
    const nuevo = !token.activo;
    setTokens(prev => prev.map(t => t.token === token.token ? { ...t, activo: nuevo } : t));
    try { await apiCall("adminUpdateToken", { token: token.token, datos: JSON.stringify({ activo: nuevo }) }); }
    catch (err) { setTokens(prev => prev.map(t => t.token === token.token ? { ...t, activo: !nuevo } : t)); }
  };

  const eliminarToken = async (token) => {
    if (!window.confirm("¿Eliminar token de " + token.vendedor + "?")) return;
    setTokens(prev => prev.filter(t => t.token !== token.token));
    try { await apiCall("adminDeleteToken", { token: token.token }); showToast("Token eliminado", "success"); }
    catch (err) { cargarTokensEmpresa(empresaSeleccionada.empresa_id); }
  };

  // Helpers
  const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
  const formatTelefono = (v) => { const n = v.replace(/\D/g, '').slice(0, 8); return n.length > 4 ? n.slice(0, 4) + '-' + n.slice(4) : n; };
  const handleTelefonoChange = (v) => setFormEmpresa(p => ({ ...p, telefono: formatTelefono(v) }));
  
  const calcularFechaVencimiento = (inicio, tipo) => {
    if (!inicio) return "";
    const f = new Date(inicio);
    tipo === "ANUAL" ? f.setFullYear(f.getFullYear() + 1) : f.setMonth(f.getMonth() + 1);
    return f.toISOString().split('T')[0];
  };

  const handleTipoPagoChange = (t) => setFormEmpresa(p => ({ ...p, tipoPago: t, fechaVencimiento: calcularFechaVencimiento(p.fechaInicio, t) }));
  const handleFechaInicioChange = (f) => setFormEmpresa(p => ({ ...p, fechaInicio: f, fechaVencimiento: calcularFechaVencimiento(f, p.tipoPago) }));
  const handleTipoClienteChange = (t) => { const pr = PRECIOS_DEFAULT[t]; setFormEmpresa(p => ({ ...p, tipoCliente: t, precioBase: pr.precioBase, precioVendedorExtra: pr.precioVendedorExtra, vendedoresIncluidos: pr.vendedoresIncluidos })); };

  const resetFormEmpresa = () => {
    const hoy = new Date().toISOString().split('T')[0];
    setFormEmpresa({ empresa_id: "", nombre: "", plan: "PLAN PYME", spreadsheetId: "", sheetPedidosNombre: "Pedidos+", activa: true, direccion: "", telefono: "", email: "", clientesCsvUrl: "", productosCsvUrl: "", fechaInicio: hoy, fechaVencimiento: calcularFechaVencimiento(hoy, "MENSUAL"), tipoPago: "MENSUAL", tipoCliente: "REGULAR", precioBase: 39, precioVendedorExtra: 7, vendedoresIncluidos: 4, descuento: 0 });
  };

  const abrirEditarEmpresa = (e) => {
    setEmpresaSeleccionada(e);
    setFormEmpresa({ nombre: e.nombre || "", plan: e.plan || "PLAN PYME", spreadsheetId: e.spreadsheetId || "", sheetPedidosNombre: e.sheetPedidosNombre || "Pedidos+", activa: e.activa, direccion: e.direccion || "", telefono: e.telefono || "", email: e.email || "", clientesCsvUrl: e.clientesCsvUrl || "", productosCsvUrl: e.productosCsvUrl || "", fechaInicio: e.fechaInicio ? new Date(e.fechaInicio).toISOString().split('T')[0] : "", fechaVencimiento: e.fechaVencimiento ? new Date(e.fechaVencimiento).toISOString().split('T')[0] : "", tipoPago: e.tipoPago || "MENSUAL", tipoCliente: e.tipoCliente || "REGULAR", precioBase: e.precioBase ?? PRECIOS_DEFAULT[e.tipoCliente || "REGULAR"].precioBase, precioVendedorExtra: e.precioVendedorExtra ?? PRECIOS_DEFAULT[e.tipoCliente || "REGULAR"].precioVendedorExtra, vendedoresIncluidos: e.vendedoresIncluidos ?? 4, descuento: e.descuento || 0 });
    setModalEditarEmpresa(true);
  };

  const abrirTokensEmpresa = (e) => { setEmpresaSeleccionada(e); setTokens([]); setModalTokens(true); cargarTokensEmpresa(e.empresa_id); };

  // Export
  const exportarExcel = (datos, nombre) => {
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, `${nombre}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast("Exportado", "success");
  };

  // Styles
  const getEstadoStyle = (e) => {
    if (e === "AL_DIA") return { bg: COLORS.successLight, text: COLORS.success, label: "Al Día" };
    if (e === "GRACIA") return { bg: COLORS.warningLight, text: COLORS.warning, label: "En Gracia" };
    if (e === "VENCIDO") return { bg: COLORS.dangerLight, text: COLORS.danger, label: "Vencido" };
    return { bg: "#f3f4f6", text: "#6b7280", label: e };
  };
  const getTipoStyle = (t) => t === "FUNDADOR" ? { bg: COLORS.fundadorLight, text: COLORS.fundador } : { bg: "#f3f4f6", text: COLORS.textSecondary };

  // Memos
  const empresasFiltradas = useMemo(() => empresas.filter(e => {
    const matchB = !busquedaEmpresa || e.nombre?.toLowerCase().includes(busquedaEmpresa.toLowerCase()) || e.empresa_id?.toLowerCase().includes(busquedaEmpresa.toLowerCase());
    const matchF = filtroEstado === "todos" || (filtroEstado === "activas" && e.activa) || (filtroEstado === "vencidas" && e.estadoPago === "VENCIDO") || (filtroEstado === "gracia" && e.estadoPago === "GRACIA") || (filtroEstado === "fundadores" && e.tipoCliente === "FUNDADOR");
    return matchB && matchF;
  }), [empresas, busquedaEmpresa, filtroEstado]);

  const totalIngresosFiltrados = useMemo(() => empresasFiltradas.reduce((s, e) => s + (metrics?.empresasConVendedores?.find(m => m.empresa_id === e.empresa_id)?.ingresoEstimado || 0), 0), [empresasFiltradas, metrics]);
  
  const empresasPorEstado = useMemo(() => ({
    porVencer: empresas.filter(e => e.activa && e.diasRestantes >= 0 && e.diasRestantes <= 15),
    enGracia: empresas.filter(e => e.estadoPago === "GRACIA"),
    vencidas: empresas.filter(e => e.estadoPago === "VENCIDO")
  }), [empresas]);

  const kpis = useMemo(() => {
    if (!metrics) return null;
    const activas = metrics.empresasActivas || 0;
    const mrr = metrics.ingresoMensualActual || 0;
    return {
      mrr, arr: mrr * 12,
      arpu: activas > 0 ? mrr / activas : 0,
      vendProm: activas > 0 ? (metrics.totalVendedoresActivos || 0) / activas : 0,
      tasaAct: metrics.totalEmpresas > 0 ? (activas / metrics.totalEmpresas * 100) : 0,
      churn: metrics.totalEmpresas > 0 ? ((metrics.vencidas || 0) / metrics.totalEmpresas * 100) : 0
    };
  }, [metrics]);

  // Effects
  useEffect(() => {
    const s = sessionStorage.getItem("admin_session");
    if (s) {
      try {
        const { user, pass, lastActivity } = JSON.parse(s);
        if (Date.now() - lastActivity > SESSION_TIMEOUT) { sessionStorage.removeItem("admin_session"); return; }
        setAdminUser(user); setAdminPass(pass); setAutenticado(true);
      } catch (e) { sessionStorage.removeItem("admin_session"); }
    }
  }, []);

  useEffect(() => { if (autenticado) { cargarDashboard(); cargarEmpresas(); } }, [autenticado]);

  // Styles
  const inputStyle = { backgroundColor: COLORS.inputBg, border: `2px solid ${COLORS.border}`, color: COLORS.text, fontSize: '15px' };
  const inputClass = "w-full rounded-lg px-3 py-2.5 focus:outline-none focus:border-lime-500";
  const labelClass = "block text-sm font-bold mb-1";

  // Precios Section Component
  const PreciosSection = () => (
    <div className="rounded-xl p-4 mt-4" style={{ backgroundColor: COLORS.primaryLight, border: `2px solid ${COLORS.primary}` }}>
      <h4 className="text-base font-bold mb-3" style={{ color: COLORS.text }}>💰 Configuración de Precios {formEmpresa.tipoCliente === "FUNDADOR" && <span className="ml-2 px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: COLORS.fundador, color: COLORS.white }}>FUNDADOR</span>}</h4>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div><label className={labelClass} style={{ color: COLORS.text }}>Tipo Cliente</label><select value={formEmpresa.tipoCliente} onChange={e => handleTipoClienteChange(e.target.value)} className={inputClass} style={inputStyle}><option value="REGULAR">REGULAR ($39)</option><option value="FUNDADOR">FUNDADOR ($29)</option></select></div>
        <div><label className={labelClass} style={{ color: COLORS.text }}>Vendedores Incluidos</label><input type="number" value={formEmpresa.vendedoresIncluidos} onChange={e => setFormEmpresa({ ...formEmpresa, vendedoresIncluidos: parseInt(e.target.value) || 4 })} className={inputClass} style={inputStyle} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><label className={labelClass} style={{ color: COLORS.text }}>Precio Base ($)</label><input type="number" value={formEmpresa.precioBase} onChange={e => setFormEmpresa({ ...formEmpresa, precioBase: parseFloat(e.target.value) || 0 })} className={inputClass} style={inputStyle} /></div>
        <div><label className={labelClass} style={{ color: COLORS.text }}>Extra ($)</label><input type="number" value={formEmpresa.precioVendedorExtra} onChange={e => setFormEmpresa({ ...formEmpresa, precioVendedorExtra: parseFloat(e.target.value) || 0 })} className={inputClass} style={inputStyle} /></div>
        <div><label className={labelClass} style={{ color: COLORS.text }}>Descuento ($)</label><input type="number" value={formEmpresa.descuento} onChange={e => setFormEmpresa({ ...formEmpresa, descuento: parseFloat(e.target.value) || 0 })} className={inputClass} style={{ ...inputStyle, borderColor: COLORS.primary }} /></div>
      </div>
    </div>
  );

  // LOGIN
  if (!autenticado) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4" style={{ backgroundColor: COLORS.darkBg }}>
        {cargando && <LoadingModal message={loadingMessage} />}
        <div className="p-8 rounded-2xl shadow-xl w-full max-w-sm text-center border-2" style={{ backgroundColor: COLORS.cardBg, borderColor: COLORS.primary }}>
          <img src="/assets/logo2.png" alt="SMARTDATA" className="mx-auto mb-6" style={{ maxWidth: 180 }} />
          <h1 className="text-2xl font-bold mb-1" style={{ color: COLORS.text }}>Admin Panel</h1>
          <p className="text-base mb-6" style={{ color: COLORS.textSecondary }}>BiBBi APP SaaS</p>
          {error && <div className="mb-4 p-3 rounded-lg text-sm font-semibold" style={{ backgroundColor: COLORS.dangerLight, color: COLORS.danger }}>{error}</div>}
          <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="Usuario" className={inputClass + " mb-3"} style={inputStyle} />
          <div className="relative mb-4">
            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Contraseña" className={inputClass + " pr-10"} style={inputStyle} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2" style={{ color: COLORS.textSecondary }}>👁</button>
          </div>
          <button onClick={handleLogin} className="w-full py-3 rounded-lg font-bold text-lg" style={{ backgroundColor: COLORS.primary, color: COLORS.text }}>Ingresar</button>
        </div>
      </div>
    );
  }

  // MAIN
  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.darkBg }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {cargando && loadingMessage && <LoadingModal message={loadingMessage} />}

      {/* Header */}
      <header className="shadow-sm border-b-2" style={{ backgroundColor: COLORS.cardBg, borderColor: COLORS.primary }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img src="/assets/logo2.png" alt="SMARTDATA" style={{ maxWidth: 120 }} />
            <div><h1 className="text-xl font-bold" style={{ color: COLORS.text }}>Admin Panel</h1><p className="text-sm" style={{ color: COLORS.textSecondary }}>BiBBi APP SaaS</p></div>
          </div>
          <button onClick={handleLogout} className="text-sm font-bold px-4 py-2 rounded-lg border-2" style={{ borderColor: COLORS.primary, color: COLORS.text, backgroundColor: COLORS.primaryLight }}>Cerrar sesión</button>
        </div>
      </header>

      {/* Nav */}
      <nav className="border-b shadow-sm" style={{ backgroundColor: COLORS.cardBg, borderColor: COLORS.border }}>
        <div className="max-w-7xl mx-auto px-4 flex space-x-1">
          {["dashboard", "empresas"].map(tab => (
            <button key={tab} onClick={() => setVista(tab)} className="py-3 px-6 font-bold text-base" style={vista === tab ? { borderBottom: `3px solid ${COLORS.primary}`, color: COLORS.text, backgroundColor: COLORS.primaryLight } : { borderBottom: "3px solid transparent", color: COLORS.textSecondary }}>
              {tab === "dashboard" ? "📊 Dashboard" : "🏢 Empresas"}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* DASHBOARD */}
        {vista === "dashboard" && metrics && kpis && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl p-5 shadow-sm border-l-4" style={{ backgroundColor: COLORS.cardBg, borderColor: COLORS.primary }}>
                <p className="text-sm font-bold" style={{ color: COLORS.textSecondary }}>MRR (Mensual)</p>
                <p className="text-3xl font-bold" style={{ color: COLORS.text }}>{formatCurrency(kpis.mrr)}</p>
              </div>
              <div className="rounded-xl p-5 shadow-sm border-l-4" style={{ backgroundColor: COLORS.cardBg, borderColor: COLORS.accent }}>
                <p className="text-sm font-bold" style={{ color: COLORS.textSecondary }}>ARR (Anual)</p>
                <p className="text-3xl font-bold" style={{ color: COLORS.text }}>{formatCurrency(kpis.arr)}</p>
              </div>
              <div className="rounded-xl p-5 shadow-sm border-l-4" style={{ backgroundColor: COLORS.cardBg, borderColor: COLORS.fundador }}>
                <p className="text-sm font-bold" style={{ color: COLORS.textSecondary }}>ARPU</p>
                <p className="text-3xl font-bold" style={{ color: COLORS.text }}>{formatCurrency(kpis.arpu)}</p>
              </div>
              <div className="rounded-xl p-5 shadow-sm border-l-4" style={{ backgroundColor: COLORS.cardBg, borderColor: COLORS.info }}>
                <p className="text-sm font-bold" style={{ color: COLORS.textSecondary }}>Vendedores</p>
                <p className="text-3xl font-bold" style={{ color: COLORS.text }}>{metrics.totalVendedoresActivos}</p>
                <p className="text-xs" style={{ color: COLORS.textSecondary }}>Prom: {kpis.vendProm.toFixed(1)}/emp</p>
              </div>
            </div>

            {/* Alertas clickeables */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: COLORS.successLight }}>
                <p className="text-4xl font-bold" style={{ color: COLORS.success }}>{metrics.empresasActivas}</p>
                <p className="text-sm font-bold" style={{ color: COLORS.text }}>Empresas Activas</p>
                <p className="text-xs" style={{ color: COLORS.textSecondary }}>de {metrics.totalEmpresas} ({kpis.tasaAct.toFixed(0)}%)</p>
              </div>
              <button onClick={() => setModalDetalleEstado('porVencer')} className="rounded-xl p-4 shadow-sm text-left hover:shadow-lg transition-shadow" style={{ backgroundColor: COLORS.warningLight }}>
                <p className="text-4xl font-bold" style={{ color: COLORS.warning }}>{metrics.porVencer}</p>
                <p className="text-sm font-bold" style={{ color: COLORS.text }}>Por Vencer (15d)</p>
                <p className="text-xs underline" style={{ color: COLORS.warning }}>Ver detalle →</p>
              </button>
              <button onClick={() => setModalDetalleEstado('enGracia')} className="rounded-xl p-4 shadow-sm text-left hover:shadow-lg transition-shadow" style={{ backgroundColor: COLORS.warningLight }}>
                <p className="text-4xl font-bold" style={{ color: COLORS.warning }}>{metrics.enGracia}</p>
                <p className="text-sm font-bold" style={{ color: COLORS.text }}>En Gracia</p>
                <p className="text-xs underline" style={{ color: COLORS.warning }}>Ver detalle →</p>
              </button>
              <button onClick={() => setModalDetalleEstado('vencidas')} className="rounded-xl p-4 shadow-sm text-left hover:shadow-lg transition-shadow" style={{ backgroundColor: COLORS.dangerLight }}>
                <p className="text-4xl font-bold" style={{ color: COLORS.danger }}>{metrics.vencidas}</p>
                <p className="text-sm font-bold" style={{ color: COLORS.text }}>Vencidas</p>
                <p className="text-xs underline" style={{ color: COLORS.danger }}>Ver detalle →</p>
              </button>
            </div>

            {/* Más métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: COLORS.cardBg }}><p className="text-sm font-bold" style={{ color: COLORS.textSecondary }}>Descuentos</p><p className="text-2xl font-bold" style={{ color: COLORS.danger }}>{formatCurrency(metrics.totalDescuentos)}</p></div>
              <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: COLORS.cardBg }}><p className="text-sm font-bold" style={{ color: COLORS.textSecondary }}>Churn Rate</p><p className="text-2xl font-bold" style={{ color: kpis.churn > 10 ? COLORS.danger : COLORS.text }}>{kpis.churn.toFixed(1)}%</p></div>
              <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: COLORS.fundadorLight }}><p className="text-sm font-bold" style={{ color: COLORS.textSecondary }}>Fundadores</p><p className="text-2xl font-bold" style={{ color: COLORS.fundador }}>{metrics.porTipoCliente?.FUNDADOR || 0}</p></div>
              <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: COLORS.cardBg }}><p className="text-sm font-bold" style={{ color: COLORS.textSecondary }}>Regulares</p><p className="text-2xl font-bold" style={{ color: COLORS.text }}>{metrics.porTipoCliente?.REGULAR || 0}</p></div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: COLORS.cardBg }}>
                <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.text }}>Por Estado</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={[{ name: 'Al Día', value: metrics.alDia || 0 }, { name: 'En Gracia', value: metrics.enGracia || 0 }, { name: 'Vencidas', value: metrics.vencidas || 0 }].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"><Cell fill={COLORS.success} /><Cell fill={COLORS.warning} /><Cell fill={COLORS.danger} /></Pie><Tooltip /><Legend /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: COLORS.cardBg }}>
                <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.text }}>Ingresos vs Descuentos</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[{ name: 'MRR', valor: kpis.mrr }, { name: 'Descuentos', valor: metrics.totalDescuentos }]}><XAxis dataKey="name" tick={{ fill: COLORS.text }} /><YAxis tick={{ fill: COLORS.text }} /><Tooltip formatter={(v) => formatCurrency(v)} /><Bar dataKey="valor" fill={COLORS.primary} radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla ingresos */}
            <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: COLORS.cardBg }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold" style={{ color: COLORS.text }}>Ingresos por Empresa</h3>
                <button onClick={() => exportarExcel(metrics.empresasConVendedores || [], "ingresos")} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold" style={{ backgroundColor: COLORS.primaryLight, color: COLORS.text }}>📥 Exportar</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full"><thead><tr className="border-b-2" style={{ borderColor: COLORS.primary }}>
                  <th className="text-left py-3 px-4 text-sm font-bold" style={{ color: COLORS.text }}>Empresa</th>
                  <th className="text-center py-3 px-4 text-sm font-bold" style={{ color: COLORS.text }}>Tipo</th>
                  <th className="text-center py-3 px-4 text-sm font-bold" style={{ color: COLORS.text }}>Vendedores</th>
                  <th className="text-center py-3 px-4 text-sm font-bold" style={{ color: COLORS.text }}>Base</th>
                  <th className="text-center py-3 px-4 text-sm font-bold" style={{ color: COLORS.text }}>Extras</th>
                  <th className="text-center py-3 px-4 text-sm font-bold" style={{ color: COLORS.text }}>Desc</th>
                  <th className="text-right py-3 px-4 text-sm font-bold" style={{ color: COLORS.primary }}>Ingreso</th>
                </tr></thead><tbody>
                  {metrics.empresasConVendedores?.slice(0, 10).map((emp) => {
                    const ts = getTipoStyle(emp.tipoCliente);
                    return (<tr key={emp.empresa_id} className="border-b hover:bg-gray-50" style={{ borderColor: COLORS.border }}>
                      <td className="py-3 px-4"><div className="font-bold" style={{ color: COLORS.text }}>{emp.nombre}</div><div className="text-xs" style={{ color: COLORS.textSecondary }}>{emp.empresa_id}</div></td>
                      <td className="py-3 px-4 text-center"><span className="px-2 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: ts.bg, color: ts.text }}>{emp.tipoCliente || "REGULAR"}</span></td>
                      <td className="py-3 px-4 text-center"><span className="font-bold" style={{ color: COLORS.text }}>{emp.vendedoresActivos}</span><span className="text-xs" style={{ color: COLORS.textSecondary }}>/{emp.vendedoresIncluidos}</span></td>
                      <td className="py-3 px-4 text-center" style={{ color: COLORS.text }}>${emp.precioBase}</td>
                      <td className="py-3 px-4 text-center">{emp.vendedoresExtra > 0 ? <span style={{ color: COLORS.warning }}>{emp.vendedoresExtra}×${emp.precioVendedorExtra}</span> : "-"}</td>
                      <td className="py-3 px-4 text-center">{emp.descuento > 0 ? <span style={{ color: COLORS.danger }}>-${emp.descuento}</span> : "-"}</td>
                      <td className="py-3 px-4 text-right font-bold text-lg" style={{ color: COLORS.primary }}>{formatCurrency(emp.ingresoEstimado)}</td>
                    </tr>);
                  })}
                </tbody><tfoot><tr style={{ backgroundColor: COLORS.primaryLight }}><td colSpan="6" className="py-3 px-4 text-right font-bold text-lg" style={{ color: COLORS.text }}>TOTAL MRR:</td><td className="py-3 px-4 text-right font-bold text-xl" style={{ color: COLORS.primary }}>{formatCurrency(kpis.mrr)}</td></tr></tfoot></table>
              </div>
            </div>

            {/* Futuras métricas */}
            <div className="rounded-xl p-6 shadow-sm border-2 border-dashed" style={{ backgroundColor: COLORS.cardBg, borderColor: COLORS.border }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: COLORS.text }}>📈 Métricas Futuras</h3>
              <p className="text-sm mb-4" style={{ color: COLORS.textSecondary }}>Disponibles cuando agregues más datos:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["CAC", "LTV", "Margen", "Costo Op."].map(m => (<div key={m} className="p-3 rounded-lg" style={{ backgroundColor: COLORS.darkBg }}><p className="text-sm font-bold" style={{ color: COLORS.textSecondary }}>{m}</p><p className="text-lg" style={{ color: COLORS.text }}>--</p></div>))}
              </div>
            </div>
          </div>
        )}

        {/* EMPRESAS */}
        {vista === "empresas" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-bold" style={{ color: COLORS.text }}>Gestión de Empresas</h2>
              <div className="flex gap-2">
                <button onClick={() => exportarExcel(empresasFiltradas.map(e => ({ ID: e.empresa_id, Nombre: e.nombre, Tipo: e.tipoCliente, Estado: e.estadoPago, Activa: e.activa ? "SI" : "NO" })), "empresas")} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold" style={{ backgroundColor: COLORS.accentLight, color: COLORS.accent }}>📥 Excel</button>
                <button onClick={() => { resetFormEmpresa(); setModalCrearEmpresa(true); }} className="px-4 py-2 rounded-lg font-bold" style={{ backgroundColor: COLORS.primary, color: COLORS.text }}>+ Nueva</button>
              </div>
            </div>

            {/* Búsqueda y filtros */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2">🔍</span>
                <input type="text" placeholder="Buscar nombre o ID..." value={busquedaEmpresa} onChange={e => setBusquedaEmpresa(e.target.value)} className={inputClass + " pl-10"} style={inputStyle} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[{ k: "todos", l: "Todos" }, { k: "activas", l: "Activas" }, { k: "vencidas", l: "Vencidas" }, { k: "gracia", l: "Gracia" }, { k: "fundadores", l: "Fundadores" }].map(f => (
                  <button key={f.k} onClick={() => setFiltroEstado(f.k)} className="px-3 py-2 rounded-lg text-sm font-bold" style={filtroEstado === f.k ? { backgroundColor: COLORS.primary, color: COLORS.text } : { backgroundColor: COLORS.cardBg, color: COLORS.textSecondary, border: `1px solid ${COLORS.border}` }}>{f.l}</button>
                ))}
              </div>
            </div>

            {/* Tabla con scroll horizontal */}
            <div className="rounded-xl shadow-sm" style={{ backgroundColor: COLORS.cardBg }}>
              <div className="overflow-x-auto">
                <table className="w-full"><thead style={{ backgroundColor: COLORS.darkBg }}><tr>
                  <th className="px-4 py-3 text-left text-sm font-bold whitespace-nowrap" style={{ color: COLORS.text }}>Empresa</th>
                  <th className="px-4 py-3 text-center text-sm font-bold whitespace-nowrap" style={{ color: COLORS.text }}>Tipo</th>
                  <th className="px-4 py-3 text-center text-sm font-bold whitespace-nowrap" style={{ color: COLORS.text }}>Estado</th>
                  <th className="px-4 py-3 text-center text-sm font-bold whitespace-nowrap" style={{ color: COLORS.text }}>Vencimiento</th>
                  <th className="px-4 py-3 text-center text-sm font-bold whitespace-nowrap" style={{ color: COLORS.text }}>Ingreso</th>
                  <th className="px-4 py-3 text-center text-sm font-bold whitespace-nowrap" style={{ color: COLORS.text }}>Activa</th>
                  <th className="px-4 py-3 text-right text-sm font-bold whitespace-nowrap" style={{ color: COLORS.text }}>Acciones</th>
                </tr></thead><tbody>
                  {empresasFiltradas.length === 0 ? (<tr><td colSpan="7" className="px-4 py-8 text-center" style={{ color: COLORS.textSecondary }}>Sin resultados</td></tr>) : empresasFiltradas.map((e) => {
                    const es = getEstadoStyle(e.estadoPago);
                    const ts = getTipoStyle(e.tipoCliente);
                    const ing = metrics?.empresasConVendedores?.find(m => m.empresa_id === e.empresa_id)?.ingresoEstimado || 0;
                    return (<tr key={e.empresa_id} className="border-b hover:bg-gray-50" style={{ borderColor: COLORS.border }}>
                      <td className="px-4 py-4 whitespace-nowrap"><div className="font-bold" style={{ color: COLORS.text }}>{e.nombre}</div><div className="text-xs" style={{ color: COLORS.textSecondary }}>{e.empresa_id}</div></td>
                      <td className="px-4 py-4 text-center whitespace-nowrap"><span className="px-2 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: ts.bg, color: ts.text }}>{e.tipoCliente || "REGULAR"}</span></td>
                      <td className="px-4 py-4 text-center whitespace-nowrap"><span className="px-2 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: es.bg, color: es.text }}>{es.label}</span></td>
                      <td className="px-4 py-4 text-center whitespace-nowrap" style={{ color: COLORS.text }}>{e.fechaVencimiento ? new Date(e.fechaVencimiento).toLocaleDateString() : "-"}{e.diasRestantes >= 0 && e.diasRestantes <= 15 && <span className="ml-1 text-xs font-bold" style={{ color: COLORS.warning }}>({e.diasRestantes}d)</span>}</td>
                      <td className="px-4 py-4 text-center font-bold whitespace-nowrap" style={{ color: e.activa ? COLORS.primary : COLORS.textSecondary }}>{formatCurrency(ing)}</td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">{empresaCargando === e.empresa_id ? <Spinner size="sm" /> : <button onClick={() => toggleActivaEmpresa(e)} className="relative w-12 h-6 rounded-full" style={{ backgroundColor: e.activa ? COLORS.primary : COLORS.border }}><span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow" style={{ left: e.activa ? '28px' : '4px' }}></span></button>}</td>
                      <td className="px-4 py-4 text-right whitespace-nowrap"><div className="flex justify-end gap-2"><button onClick={() => abrirEditarEmpresa(e)} className="text-sm font-bold px-2 py-1 rounded hover:bg-gray-100" style={{ color: COLORS.accent }}>Editar</button><button onClick={() => abrirTokensEmpresa(e)} className="text-sm font-bold px-2 py-1 rounded" style={{ color: COLORS.text, backgroundColor: COLORS.primaryLight }}>Tokens</button></div></td>
                    </tr>);
                  })}
                </tbody><tfoot><tr style={{ backgroundColor: COLORS.primaryLight }}><td colSpan="4" className="px-4 py-3 text-right font-bold" style={{ color: COLORS.text }}>Total ({empresasFiltradas.length}):</td><td className="px-4 py-3 text-center font-bold text-lg" style={{ color: COLORS.primary }}>{formatCurrency(totalIngresosFiltrados)}</td><td colSpan="2"></td></tr></tfoot></table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALES */}
      {/* Modal Detalle Estado */}
      {modalDetalleEstado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" style={{ backgroundColor: COLORS.cardBg }}>
            <div className="p-6 border-b-2 flex justify-between items-center" style={{ borderColor: COLORS.primary }}>
              <h3 className="text-xl font-bold" style={{ color: COLORS.text }}>{modalDetalleEstado === 'porVencer' ? '⚠️ Por Vencer' : modalDetalleEstado === 'enGracia' ? '⏰ En Gracia' : '🚫 Vencidas'}</h3>
              <button onClick={() => setModalDetalleEstado(null)} className="text-2xl">&times;</button>
            </div>
            <div className="p-6">{empresasPorEstado[modalDetalleEstado]?.length === 0 ? <p className="text-center py-8" style={{ color: COLORS.textSecondary }}>Sin empresas</p> : empresasPorEstado[modalDetalleEstado]?.map(e => (
              <div key={e.empresa_id} className="flex justify-between items-center p-4 rounded-lg mb-3" style={{ backgroundColor: COLORS.darkBg }}>
                <div><p className="font-bold" style={{ color: COLORS.text }}>{e.nombre}</p><p className="text-sm" style={{ color: COLORS.textSecondary }}>Vence: {e.fechaVencimiento ? new Date(e.fechaVencimiento).toLocaleDateString() : '-'} <span className="font-bold" style={{ color: e.diasRestantes < 0 ? COLORS.danger : COLORS.warning }}>({e.diasRestantes}d)</span></p></div>
                <button onClick={() => { setModalDetalleEstado(null); abrirEditarEmpresa(e); }} className="px-3 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: COLORS.primary, color: COLORS.text }}>Ver</button>
              </div>
            ))}</div>
          </div>
        </div>
      )}

      {/* Modal Crear Empresa */}
      {modalCrearEmpresa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: COLORS.cardBg }}>
            <div className="p-6 border-b-2" style={{ borderColor: COLORS.primary }}><h3 className="text-xl font-bold" style={{ color: COLORS.text }}>Nueva Empresa</h3></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass} style={{ color: COLORS.text }}>ID (opcional)</label><input type="text" value={formEmpresa.empresa_id} onChange={e => setFormEmpresa({ ...formEmpresa, empresa_id: e.target.value })} placeholder="EMP-XXX" className={inputClass} style={inputStyle} /></div>
                <div><label className={labelClass} style={{ color: COLORS.text }}>Nombre *</label><input type="text" value={formEmpresa.nombre} onChange={e => setFormEmpresa({ ...formEmpresa, nombre: e.target.value })} className={inputClass} style={inputStyle} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass} style={{ color: COLORS.text }}>Plan</label><select value={formEmpresa.plan} onChange={e => setFormEmpresa({ ...formEmpresa, plan: e.target.value })} className={inputClass} style={inputStyle}><option value="PLAN PYME">PLAN PYME</option></select></div>
                <div><label className={labelClass} style={{ color: COLORS.text }}>Tipo Pago</label><select value={formEmpresa.tipoPago} onChange={e => handleTipoPagoChange(e.target.value)} className={inputClass} style={inputStyle}><option value="MENSUAL">MENSUAL</option><option value="ANUAL">ANUAL</option></select></div>
              </div>
              <div><label className={labelClass} style={{ color: COLORS.text }}>Spreadsheet ID</label><input type="text" value={formEmpresa.spreadsheetId} onChange={e => setFormEmpresa({ ...formEmpresa, spreadsheetId: e.target.value })} className={inputClass} style={inputStyle} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass} style={{ color: COLORS.text }}>Email</label><input type="email" value={formEmpresa.email} onChange={e => setFormEmpresa({ ...formEmpresa, email: e.target.value })} className={inputClass} style={inputStyle} /></div>
                <div><label className={labelClass} style={{ color: COLORS.text }}>Teléfono</label><input type="text" value={formEmpresa.telefono} onChange={e => handleTelefonoChange(e.target.value)} placeholder="2222-2222" maxLength={9} className={inputClass} style={inputStyle} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass} style={{ color: COLORS.text }}>Fecha Inicio</label><input type="date" value={formEmpresa.fechaInicio} onChange={e => handleFechaInicioChange(e.target.value)} className={inputClass} style={inputStyle} /></div>
                <div><label className={labelClass} style={{ color: COLORS.text }}>Vencimiento (auto)</label><input type="date" value={formEmpresa.fechaVencimiento} onChange={e => setFormEmpresa({ ...formEmpresa, fechaVencimiento: e.target.value })} className={inputClass} style={{ ...inputStyle, backgroundColor: COLORS.primaryLight }} /></div>
              </div>
              <PreciosSection />
              <div className="flex items-center"><input type="checkbox" checked={formEmpresa.activa} onChange={e => setFormEmpresa({ ...formEmpresa, activa: e.target.checked })} className="w-5 h-5" style={{ accentColor: COLORS.primary }} /><label className="ml-2 font-bold" style={{ color: COLORS.text }}>Activa</label></div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3" style={{ borderColor: COLORS.border }}>
              <button onClick={() => setModalCrearEmpresa(false)} className="px-4 py-2 rounded-lg font-bold" style={{ border: `2px solid ${COLORS.border}`, color: COLORS.textSecondary }}>Cancelar</button>
              <button onClick={crearEmpresa} className="px-6 py-2 rounded-lg font-bold" style={{ backgroundColor: COLORS.primary, color: COLORS.text }}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Empresa */}
      {modalEditarEmpresa && empresaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: COLORS.cardBg }}>
            <div className="p-6 border-b-2" style={{ borderColor: COLORS.primary }}><h3 className="text-xl font-bold" style={{ color: COLORS.text }}>Editar: {empresaSeleccionada.nombre}</h3><p className="text-sm" style={{ color: COLORS.textSecondary }}>{empresaSeleccionada.empresa_id}</p></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass} style={{ color: COLORS.text }}>Nombre *</label><input type="text" value={formEmpresa.nombre} onChange={e => setFormEmpresa({ ...formEmpresa, nombre: e.target.value })} className={inputClass} style={inputStyle} /></div>
                <div><label className={labelClass} style={{ color: COLORS.text }}>Plan</label><select value={formEmpresa.plan} onChange={e => setFormEmpresa({ ...formEmpresa, plan: e.target.value })} className={inputClass} style={inputStyle}><option value="PLAN PYME">PLAN PYME</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass} style={{ color: COLORS.text }}>Tipo Pago</label><select value={formEmpresa.tipoPago} onChange={e => handleTipoPagoChange(e.target.value)} className={inputClass} style={inputStyle}><option value="MENSUAL">MENSUAL</option><option value="ANUAL">ANUAL</option></select></div>
                <div><label className={labelClass} style={{ color: COLORS.text }}>Spreadsheet ID</label><input type="text" value={formEmpresa.spreadsheetId} onChange={e => setFormEmpresa({ ...formEmpresa, spreadsheetId: e.target.value })} className={inputClass} style={inputStyle} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass} style={{ color: COLORS.text }}>Email</label><input type="email" value={formEmpresa.email} onChange={e => setFormEmpresa({ ...formEmpresa, email: e.target.value })} className={inputClass} style={inputStyle} /></div>
                <div><label className={labelClass} style={{ color: COLORS.text }}>Teléfono</label><input type="text" value={formEmpresa.telefono} onChange={e => handleTelefonoChange(e.target.value)} placeholder="2222-2222" maxLength={9} className={inputClass} style={inputStyle} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass} style={{ color: COLORS.text }}>Fecha Inicio</label><input type="date" value={formEmpresa.fechaInicio} onChange={e => handleFechaInicioChange(e.target.value)} className={inputClass} style={inputStyle} /></div>
                <div><label className={labelClass} style={{ color: COLORS.text }}>Vencimiento</label><input type="date" value={formEmpresa.fechaVencimiento} onChange={e => setFormEmpresa({ ...formEmpresa, fechaVencimiento: e.target.value })} className={inputClass} style={{ ...inputStyle, backgroundColor: COLORS.primaryLight }} /></div>
              </div>
              <PreciosSection />
              <div className="flex items-center"><input type="checkbox" checked={formEmpresa.activa} onChange={e => setFormEmpresa({ ...formEmpresa, activa: e.target.checked })} className="w-5 h-5" style={{ accentColor: COLORS.primary }} /><label className="ml-2 font-bold" style={{ color: COLORS.text }}>Activa</label></div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3" style={{ borderColor: COLORS.border }}>
              <button onClick={() => setModalEditarEmpresa(false)} className="px-4 py-2 rounded-lg font-bold" style={{ border: `2px solid ${COLORS.border}`, color: COLORS.textSecondary }}>Cancelar</button>
              <button onClick={actualizarEmpresa} className="px-6 py-2 rounded-lg font-bold" style={{ backgroundColor: COLORS.primary, color: COLORS.text }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tokens */}
      {modalTokens && empresaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: COLORS.cardBg }}>
            <div className="p-6 border-b-2 flex justify-between items-center" style={{ borderColor: COLORS.primary }}>
              <div><h3 className="text-xl font-bold" style={{ color: COLORS.text }}>Tokens</h3><p className="text-sm" style={{ color: COLORS.textSecondary }}>{empresaSeleccionada.nombre}</p></div>
              <button onClick={() => setModalCrearToken(true)} className="px-3 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: COLORS.primary, color: COLORS.text }}>+ Nuevo</button>
            </div>
            <div className="p-6">{cargandoTokens ? <div className="flex flex-col items-center py-8"><Spinner /><p className="mt-3" style={{ color: COLORS.textSecondary }}>Cargando...</p></div> : tokens.length === 0 ? <p className="text-center py-8" style={{ color: COLORS.textSecondary }}>Sin tokens</p> : tokens.map((t) => (
              <div key={t.token} className="flex justify-between items-center p-4 rounded-lg mb-3" style={{ backgroundColor: COLORS.darkBg }}>
                <div><p className="font-bold" style={{ color: COLORS.text }}>{t.vendedor}</p><p className="text-xs font-mono" style={{ color: COLORS.textSecondary }}>{t.token}</p></div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => toggleActivoToken(t)} className="relative w-10 h-5 rounded-full" style={{ backgroundColor: t.activo ? COLORS.primary : COLORS.border }}><span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow" style={{ left: t.activo ? '22px' : '2px' }}></span></button>
                  <button onClick={() => eliminarToken(t)} className="text-red-500 hover:text-red-700">🗑️</button>
                </div>
              </div>
            ))}</div>
            <div className="p-6 border-t" style={{ borderColor: COLORS.border }}><button onClick={() => setModalTokens(false)} className="w-full px-4 py-2 rounded-lg font-bold" style={{ border: `2px solid ${COLORS.border}`, color: COLORS.textSecondary }}>Cerrar</button></div>
          </div>
        </div>
      )}

      {/* Modal Crear Token */}
      {modalCrearToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-xl w-full max-w-md" style={{ backgroundColor: COLORS.cardBg }}>
            <div className="p-6 border-b-2" style={{ borderColor: COLORS.primary }}><h3 className="text-xl font-bold" style={{ color: COLORS.text }}>Nuevo Token</h3><p className="text-sm" style={{ color: COLORS.textSecondary }}>{empresaSeleccionada?.nombre}</p></div>
            <div className="p-6 space-y-4">
              <div><label className={labelClass} style={{ color: COLORS.text }}>Vendedor *</label><input type="text" value={formToken.vendedor} onChange={e => setFormToken({ ...formToken, vendedor: e.target.value })} placeholder="Nombre vendedor" className={inputClass} style={inputStyle} /></div>
              <div className="flex items-center"><input type="checkbox" checked={formToken.activo} onChange={e => setFormToken({ ...formToken, activo: e.target.checked })} className="w-5 h-5" style={{ accentColor: COLORS.primary }} /><label className="ml-2 font-bold" style={{ color: COLORS.text }}>Activo</label></div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3" style={{ borderColor: COLORS.border }}>
              <button onClick={() => { setModalCrearToken(false); setFormToken({ vendedor: "", activo: true }); }} className="px-4 py-2 rounded-lg font-bold" style={{ border: `2px solid ${COLORS.border}`, color: COLORS.textSecondary }}>Cancelar</button>
              <button onClick={crearToken} disabled={!formToken.vendedor.trim()} className="px-6 py-2 rounded-lg font-bold disabled:opacity-50" style={{ backgroundColor: COLORS.primary, color: COLORS.text }}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
