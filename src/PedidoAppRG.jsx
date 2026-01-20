// src/PedidoAppRG.jsx - APP CORE BiBi (SaaS) - Optimizado con manejo robusto de logos
import React, { useEffect, useState } from "react";
import Select from "react-select";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./styles.css";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxusgksD7YkdTw1zcCydJyUZnXQQOgMVDKiijeeKP8M5rzeOJAwdDsLHyws2X0MwVTI/exec";
const LOGO_TIMEOUT = 3000; // 3 segundos para cargar logo

// ============ UTILIDADES ============

function normalizeHeader(h) {
  if (!h && h !== 0) return "";
  return h.toString().trim().toUpperCase().replace(/\s+/g, "_").replace(/-+/g, "_").replace(/[^\w_]/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getField(obj, names) {
  if (!obj) return undefined;
  for (const n of names) {
    if (n === undefined || n === null) continue;
    if (obj[n] !== undefined && obj[n] !== "") return obj[n];
    const nn = normalizeHeader(n);
    if (obj[nn] !== undefined && obj[nn] !== "") return obj[nn];
  }
  return undefined;
}

function parseCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(cur); cur = ""; } else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function csvToJson(csv) {
  if (!csv) return [];
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const rawHeaders = parseCsvLine(lines[0]).map((h) => (h ?? "").toString().trim());
  const normalizedHeaders = rawHeaders.map((h) => normalizeHeader(h));
  return lines.slice(1).map((line) => {
    const data = parseCsvLine(line);
    const obj = {};
    rawHeaders.forEach((header, i) => {
      const value = (data[i] ?? "").toString().trim();
      obj[header] = value;
      obj[normalizedHeaders[i]] = value;
    });
    return obj;
  });
}

// ============ UTILIDADES DE LOGO ============

// Convierte URL de imagen a base64 (para PDF)
async function urlToBase64(url) {
  if (!url) return "";
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Error convirtiendo imagen a base64:", err);
    return "";
  }
}

// Carga una imagen y devuelve base64, con timeout
async function cargarLogoConTimeout(url, timeout = LOGO_TIMEOUT) {
  if (!url) return { success: false, base64: "" };
  
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve({ success: false, base64: "" });
    }, timeout);
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL("image/png");
        resolve({ success: true, base64 });
      } catch (err) {
        resolve({ success: false, base64: "" });
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve({ success: false, base64: "" });
    };
    
    img.src = url;
  });
}

// ============ COMPONENTE DE LOGO ============

function LogoDisplay({ url, nombre, empresaId, maxWidth = 110, className = "" }) {
  const [estado, setEstado] = useState("loading"); // loading, loaded, error
  const [imgSrc, setImgSrc] = useState("");
  
  useEffect(() => {
    if (!url) {
      setEstado("error");
      return;
    }
    
    // Primero verificar si hay base64 en localStorage
    if (empresaId) {
      const cachedBase64 = localStorage.getItem(`logo_empresa_b64_${empresaId}`);
      if (cachedBase64) {
        setImgSrc(cachedBase64);
        setEstado("loaded");
        return;
      }
    }
    
    setEstado("loading");
    
    const timeoutId = setTimeout(() => {
      setEstado("error");
    }, LOGO_TIMEOUT);
    
    // Cargar imagen y convertir a base64
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      clearTimeout(timeoutId);
      
      // Convertir a base64
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL("image/png");
        
        setImgSrc(base64);
        setEstado("loaded");
        
        // Guardar base64 en localStorage
        if (empresaId) {
          try {
            localStorage.setItem(`logo_empresa_b64_${empresaId}`, base64);
          } catch (e) {
            console.warn("Error guardando logo en localStorage:", e);
          }
        }
      } catch (e) {
        // Si falla la conversión a base64, usar URL directa
        setImgSrc(url);
        setEstado("loaded");
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      setEstado("error");
    };
    
    img.src = url;
    
    return () => clearTimeout(timeoutId);
  }, [url, empresaId]);
  
  if (estado === "loading") {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ minWidth: maxWidth, minHeight: 40 }}>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-yellow-500"></div>
      </div>
    );
  }
  
  if (estado === "error" || !imgSrc) {
    return (
      <div className={`font-bold text-lg text-black ${className}`} style={{ maxWidth }}>
        {nombre || ""}
      </div>
    );
  }
  
  return (
    <img 
      src={imgSrc} 
      alt="Logo" 
      className={className}
      style={{ maxWidth, height: "auto" }} 
    />
  );
}

// ============ VALIDACIÓN TOKEN ============

async function validarTokenWithTimeout(token, timeoutMs = 15000, maxRetries = 3) {
  for (let intento = 1; intento <= maxRetries; intento++) {
    const controller = new AbortController();
    const signal = controller.signal;
    const url = `${APPS_SCRIPT_URL}?action=validateToken&token=${encodeURIComponent(token)}`;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const res = await fetch(url, { signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`Intento ${intento}/${maxRetries} falló:`, err.message);
      
      // Si es el último intento, lanzar error
      if (intento === maxRetries) {
        throw new Error("No se pudo conectar. Verifica tu conexión e intenta de nuevo.");
      }
      
      // Esperar antes de reintentar (1s, 2s, 3s...)
      await new Promise(resolve => setTimeout(resolve, intento * 1000));
    }
  }
}

// ============ GENERACIÓN PDF ============

async function generateOrderPdf(pedido, empresa, logoBase64) {
  let wrapper = null;
  try {
    wrapper = document.createElement("div");
    wrapper.style.cssText = "width:700px;padding:20px;font-family:Arial,sans-serif;color:#333;position:fixed;left:-9999px;background:white";
    
    const itemsHtml = pedido.items.map((it, idx) => 
      `<tr style="background:${idx % 2 === 0 ? '#f9f9f9' : 'white'}">` +
      `<td style="padding:8px 4px;border-bottom:1px solid #e0e0e0;text-align:center">${idx + 1}</td>` +
      `<td style="padding:8px 4px;border-bottom:1px solid #e0e0e0">${it.producto}</td>` +
      `<td style="padding:8px 4px;border-bottom:1px solid #e0e0e0;text-align:right">${it.cantidad}</td>` +
      `<td style="padding:8px 4px;border-bottom:1px solid #e0e0e0;text-align:right">$${Number(it.precioUnitario).toFixed(2)}</td>` +
      `<td style="padding:8px 4px;border-bottom:1px solid #e0e0e0;text-align:right;font-weight:bold">$${Number(it.total).toFixed(2)}</td></tr>`
    ).join("");
    
    const EMPRESA_NOMBRE = empresa?.nombre || "";
    const EMPRESA_DIRECCION = empresa?.direccion || "";
    const EMPRESA_TELEFONO = empresa?.telefono || "";
    const EMPRESA_EMAIL = empresa?.email || "";
    
    // Usar logo base64 si existe, sino mostrar nombre
    const logoHtml = logoBase64 
      ? `<img src="${logoBase64}" alt="Logo" style="max-height:80px;max-width:200px"/>`
      : `<div style="font-size:20px;font-weight:bold;color:#2a2a2a">${EMPRESA_NOMBRE}</div>`;

    wrapper.innerHTML =
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:2px solid #4a4a4a;padding-bottom:15px">
         <div>
           ${logoHtml}
         </div>
         <div style="text-align:right">
           <h2 style="margin:0;color:#2a2a2a;font-size:24px">${EMPRESA_NOMBRE}</h2>
           <div style="font-size:14px;color:#666;margin-top:5px">Copia de Pedido</div>
         </div>
       </div>` +
      `<div style="margin-bottom:20px;background:#f5f5f5;padding:15px;border-radius:8px;border:1px solid #d0d0d0">
         <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">
           <div><strong>Cliente:</strong> ${pedido.cliente}</div>
           <div><strong>Negocio:</strong> ${pedido.nombreNegocio || "-"}</div>
           <div><strong>Sucursal:</strong> ${pedido.sucursal || "Principal"}</div>
           <div><strong>Teléfono:</strong> ${pedido.telefono || "-"}</div>
           <div><strong>Condición:</strong> ${pedido.condicionPago || "-"}</div>
           <div><strong>Vendedor:</strong> ${pedido.vendedor}</div>
         </div>
         ${pedido.comentarios ? `<div style="margin-top:10px;font-size:13px"><strong>Comentarios:</strong> ${pedido.comentarios}</div>` : ``}
       </div>` +
      `<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
         <thead>
           <tr style="background:#4a4a4a;color:white">
             <th style="padding:10px 4px;text-align:center;border:1px solid #3a3a3a;width:40px">N°</th>
             <th style="padding:10px 4px;text-align:left;border:1px solid #3a3a3a">Producto</th>
             <th style="padding:10px 4px;text-align:right;border:1px solid #3a3a3a;width:60px">Cant</th>
             <th style="padding:10px 4px;text-align:right;border:1px solid #3a3a3a;width:80px">P. Unit</th>
             <th style="padding:10px 4px;text-align:right;border:1px solid #3a3a3a;width:90px">Total</th>
           </tr>
         </thead>
         <tbody>${itemsHtml}</tbody>
       </table>` +
      `<div style="text-align:right;margin-bottom:30px;padding:15px;background:#e8e8e8;border-radius:8px;border:1px solid #c0c0c0">
         <div style="font-size:20px;color:#2a2a2a">
           <strong>TOTAL: $${pedido.total}</strong>
         </div>
       </div>` +
      `<div style="margin-top:40px;padding-top:15px;border-top:2px solid #4a4a4a;text-align:center;font-size:11px;color:#666">
         <div style="font-weight:bold;color:#2a2a2a">${EMPRESA_NOMBRE}</div>
         <div>${EMPRESA_DIRECCION}</div>
         <div>Tel: ${EMPRESA_TELEFONO} | Email: ${EMPRESA_EMAIL}</div>
         <div style="margin-top:20px;padding:12px;background:#fafafa;border-radius:6px;font-size:8px;color:#888;line-height:1.4;text-align:justify;max-width:650px;margin-left:auto;margin-right:auto;border:1px solid #e0e0e0">
           <strong>AVISO IMPORTANTE:</strong>
           Este documento es una copia informativa del pedido gestionado con nuestros representantes de venta.
           Las cantidades, precios, condiciones de venta y/o promociones están sujetos a cambios según disponibilidad de inventario,
           políticas comerciales y condiciones vigentes al momento de la facturación.
           Esta copia no constituye factura, orden de compra ni compromiso de entrega por parte de la empresa.
           El cliente reconoce y acepta que el presente documento es únicamente de carácter informativo y no será objeto de reclamos o disputas.
         </div>
       </div>`;
    
    document.body.appendChild(wrapper);
    const canvas = await html2canvas(wrapper, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth() - 40;
    const imgHeight = pdfWidth / (imgProps.width / imgProps.height);
    pdf.addImage(imgData, "PNG", 20, 20, pdfWidth, imgHeight);
    pdf.save(`pedido_${Date.now()}.pdf`);
    document.body.removeChild(wrapper);
    return true;
  } catch (err) {
    console.error("Error PDF:", err);
    if (wrapper?.parentNode) wrapper.parentNode.removeChild(wrapper);
    return null;
  }
}

// ============ COMPONENTE PRINCIPAL ============

function PedidoAppRG() {
  // Ref para scroll automático
  const resumenRef = React.useRef(null);
  
  // Estados de autenticación
  const [token, setToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tokenValido, setTokenValido] = useState(false);
  const [validandoToken, setValidandoToken] = useState(false);
  const [vendedor, setVendedor] = useState(null);
  const [empresa, setEmpresa] = useState(null);

  // Estados de datos
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loadingDatos, setLoadingDatos] = useState(false);

  // Estados del pedido
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState("");
  const [listaSeleccionada, setListaSeleccionada] = useState("1");
  const [pedidoItems, setPedidoItems] = useState([]);
  const [comentarios, setComentarios] = useState("");

  // Estados del cliente seleccionado
  const [condicionPago, setCondicionPago] = useState("");
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
  const [telefono, setTelefono] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [distrito, setDistrito] = useState("");
  const [departamento, setDepartamento] = useState("");

  // Estado de UI
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeGracia, setMensajeGracia] = useState("");
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  
  // Estados de logos
  const [logoEmpresaUrl, setLogoEmpresaUrl] = useState("");
  const [logoEmpresaBase64, setLogoEmpresaBase64] = useState(""); // Para PDF
  const [logoEmpresaCargado, setLogoEmpresaCargado] = useState(false);
  const [logoEmpresaError, setLogoEmpresaError] = useState(false);

  // ============ CARGAR CLIENTES Y PRODUCTOS EN PARALELO ============
  const cargarDatosEmpresa = async (empresaData) => {
    setLoadingDatos(true);
    
    const promesas = [];

    // Cargar clientes
    if (empresaData.clientesCsvUrl) {
      promesas.push(
        fetch(empresaData.clientesCsvUrl)
          .then(r => r.text())
          .then(d => {
            const clientesData = csvToJson(d);
            setClientes(clientesData);
            return { tipo: 'clientes', cantidad: clientesData.length };
          })
          .catch(e => {
            console.error("Error cargando clientes:", e);
            setClientes([]);
            return { tipo: 'clientes', cantidad: 0, error: true };
          })
      );
    } else {
      setClientes([]);
    }

    // Cargar productos
    if (empresaData.productosCsvUrl) {
      promesas.push(
        fetch(empresaData.productosCsvUrl)
          .then(r => r.text())
          .then(d => {
            const productosData = csvToJson(d);
            setProductos(productosData);
            return { tipo: 'productos', cantidad: productosData.length };
          })
          .catch(e => {
            console.error("Error cargando productos:", e);
            setProductos([]);
            return { tipo: 'productos', cantidad: 0, error: true };
          })
      );
    } else {
      setProductos([]);
    }

    // Cargar logo de empresa y convertir a base64 para PDF
    if (empresaData.logoUrl) {
      promesas.push(
        cargarLogoConTimeout(empresaData.logoUrl).then(result => {
          if (result.success) {
            setLogoEmpresaBase64(result.base64);
          }
          return result;
        })
      );
    }

    // Esperar que todos terminen
    await Promise.all(promesas);
    setLoadingDatos(false);
  };

  // ============ CERRAR SESIÓN ============
  const cerrarSesion = () => {
    // Limpiar localStorage
    try {
      localStorage.removeItem("session_valid");
      localStorage.removeItem("session_user");
      localStorage.removeItem("session_empresa");
      localStorage.removeItem("session_expires");
    } catch (e) {
      console.warn("Error limpiando localStorage:", e);
    }

    // Limpiar estados de autenticación
    setTokenValido(false);
    setVendedor(null);
    setEmpresa(null);
    setToken("");

    // Limpiar datos cargados
    setClientes([]);
    setProductos([]);
    setLoadingDatos(false);

    // Limpiar estados del pedido
    setClienteSeleccionado(null);
    setProductoSeleccionado(null);
    setCantidadSeleccionada("");
    setListaSeleccionada("1");
    setPedidoItems([]);
    setComentarios("");

    // Limpiar estados del cliente seleccionado
    setCondicionPago("");
    setNombreNegocio("");
    setSucursalSeleccionada("");
    setSucursalesDisponibles([]);
    setTelefono("");
    setMunicipio("");
    setDistrito("");
    setDepartamento("");

    // Limpiar UI
    setMensajeExito("");
    setMensajeGracia("");
    setLogoEmpresaUrl("");
    setLogoEmpresaBase64("");
  };

  // ============ VALIDAR TOKEN ============
  const handleValidarToken = async () => {
    const t = token.trim();
    if (!t) {
      alert("Ingresa un token");
      return;
    }

    setValidandoToken(true);
    try {
      const data = await validarTokenWithTimeout(t);
      
      // Empresa suspendida por vencimiento
      if (data.status === "suspended") {
        alert(data.message || "Acceso suspendido. Contacta a tu supervisor.");
        return;
      }
      
      if (data.status === "success") {
        // Guardar en estado
        setVendedor(data.vendedor);
        setEmpresa(data.empresa);
        setTokenValido(true);
        
        // Cargar logo de empresa (primero localStorage base64, luego URL)
        const empresaId = data.empresa.empresa_id;
        const cachedLogoBase64 = localStorage.getItem(`logo_empresa_b64_${empresaId}`);
        if (cachedLogoBase64) {
          setLogoEmpresaUrl(cachedLogoBase64);
          setLogoEmpresaCargado(true);
        } else if (data.empresa.logoUrl) {
          setLogoEmpresaUrl(data.empresa.logoUrl);
        }

        // Mostrar mensaje de gracia si aplica
        if (data.empresa.estadoPago === "GRACIA" && data.empresa.estadoPagoMensaje) {
          setMensajeGracia(data.empresa.estadoPagoMensaje);
        }

        // Cargar clientes y productos en paralelo
        cargarDatosEmpresa(data.empresa);

        // Guardar en localStorage para persistencia
        try {
          localStorage.setItem("session_valid", "1");
          localStorage.setItem("session_user", data.vendedor);
          localStorage.setItem("session_empresa", JSON.stringify(data.empresa));
          localStorage.setItem("session_expires", String(Date.now() + 24 * 60 * 60 * 1000));
        } catch (e) {
          console.warn("Error guardando sesión:", e);
        }
      } else {
        alert("❌ " + (data.message || "Token inválido"));
      }
    } catch (err) {
      console.error("Error validando token:", err);
      alert("❌ " + (err.message || "Error de conexión. Verifica tu internet e intenta de nuevo."));
    } finally {
      setValidandoToken(false);
    }
  };

  // ============ EFECTO INICIAL ============
  useEffect(() => {
    // Verificar sesión guardada
    try {
      const valid = localStorage.getItem("session_valid");
      const exp = parseInt(localStorage.getItem("session_expires") || "0", 10);
      const user = localStorage.getItem("session_user");
      const empresaStored = localStorage.getItem("session_empresa");

      if (valid === "1" && exp > Date.now() && user && empresaStored) {
        const empresaData = JSON.parse(empresaStored);
        
        setTokenValido(true);
        setVendedor(user);
        setEmpresa(empresaData);
        
        // Cargar logo de empresa desde localStorage primero (base64)
        const empresaId = empresaData.empresa_id;
        const cachedLogoBase64 = localStorage.getItem(`logo_empresa_b64_${empresaId}`);
        if (cachedLogoBase64) {
          setLogoEmpresaUrl(cachedLogoBase64);
          setLogoEmpresaCargado(true);
        } else if (empresaData.logoUrl) {
          setLogoEmpresaUrl(empresaData.logoUrl);
        }
        
        // Mostrar mensaje de gracia si aplica
        if (empresaData.estadoPago === "GRACIA" && empresaData.estadoPagoMensaje) {
          setMensajeGracia(empresaData.estadoPagoMensaje);
        }
        
        // Cargar clientes y productos en paralelo
        cargarDatosEmpresa(empresaData);
      } else {
        // Limpiar sesión expirada
        localStorage.removeItem("session_valid");
        localStorage.removeItem("session_user");
        localStorage.removeItem("session_empresa");
        localStorage.removeItem("session_expires");
      }
    } catch (err) {
      console.warn("Error recuperando sesión:", err);
      localStorage.removeItem("session_valid");
      localStorage.removeItem("session_user");
      localStorage.removeItem("session_empresa");
      localStorage.removeItem("session_expires");
    }
  }, []);

  // ============ PROCESAMIENTO DE DATOS ============
  
  // Agrupar clientes por código
  const clientesAgrupados = clientes.reduce((acc, cliente) => {
    const codigo = getField(cliente, ["Codigo Cliente", "CODIGO_CLIENTE", "Codigo", "CODIGO"]) ?? "";
    if (!acc[codigo]) acc[codigo] = [];
    acc[codigo].push(cliente);
    return acc;
  }, {});

  // Opciones para Select de clientes
  const opcionesClientes = Object.keys(clientesAgrupados).map(codigo => {
    const clientesGrupo = clientesAgrupados[codigo];
    const nombre = getField(clientesGrupo[0], ["Cliente", "CLIENTE", "NOMBRE"]) ?? "Sin Nombre";
    return { value: codigo, label: `${nombre} - ${codigo}`, data: clientesGrupo };
  });

  // Función para parsear precios de productos
  function parsePriceFromProduct(product, possibleNames) {
    for (const name of possibleNames) {
      const raw = getField(product, [name]);
      if (raw === undefined || raw === null || raw === "") continue;
      const cleaned = raw.toString().replace(/[^0-9.-]/g, "").trim();
      const val = parseFloat(cleaned);
      if (!isNaN(val)) return val;
    }
    return NaN;
  }

  // Opciones para Select de productos
  const opcionesProductos = productos.map(producto => {
    const precio1 = parsePriceFromProduct(producto, ["PRECIO-01", "PRECIO_01", "PRECIO"]);
    const precio2 = parsePriceFromProduct(producto, ["PRECIO-02", "PRECIO_02"]);
    const precio3 = parsePriceFromProduct(producto, ["PRECIO-03", "PRECIO_03"]);
    const finalP1 = !isNaN(precio1) ? precio1 : 0;
    const finalP2 = !isNaN(precio2) ? precio2 : finalP1;
    const finalP3 = !isNaN(precio3) ? precio3 : finalP1;
    const nombreProducto = getField(producto, ["PRODUCTO", "PRODUCT"]) ?? "Producto";
    const codigoProducto = getField(producto, ["CODIGO", "COD"]) ?? nombreProducto;
    return {
      value: codigoProducto,
      label: `${nombreProducto} | $${finalP1.toFixed(2)}`,
      precio1: finalP1,
      precio2: finalP2,
      precio3: finalP3
    };
  });

  // ============ FUNCIONES DE PRECIO ============
  
  function precioUnitarioSeleccionado(prodObj, lista) {
    if (!prodObj) return 0;
    if (lista === "1") return prodObj.precio1 ?? 0;
    if (lista === "2") return prodObj.precio2 ?? 0;
    if (lista === "3") return prodObj.precio3 ?? 0;
    return prodObj.precio1 ?? 0;
  }

  // ============ FUNCIONES DEL PEDIDO ============

  const agregarProducto = () => {
    if (!productoSeleccionado) {
      alert("Selecciona un producto primero");
      return;
    }
    const cantidad = parseInt(cantidadSeleccionada) || 0;
    if (cantidad <= 0) {
      alert("Ingresa una cantidad mayor a 0");
      return;
    }
    const yaExiste = pedidoItems.find(item => item.value === productoSeleccionado.value && item.lista === listaSeleccionada);
    if (yaExiste) {
      alert("Producto ya agregado (misma lista)");
      return;
    }
    const precioUnitario = precioUnitarioSeleccionado(productoSeleccionado, listaSeleccionada);
    setPedidoItems([...pedidoItems, { ...productoSeleccionado, cantidad, lista: listaSeleccionada, precio: precioUnitario }]);
    setProductoSeleccionado(null);
    setCantidadSeleccionada("");
    
    // Scroll automático al resumen después de agregar
    setTimeout(() => {
      if (resumenRef.current) {
        resumenRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const actualizarCantidad = (index, nuevaCantidad) => {
    const cantidad = parseInt(nuevaCantidad) || 0;
    if (cantidad < 0) return;
    const nuevosItems = [...pedidoItems];
    nuevosItems[index].cantidad = cantidad;
    setPedidoItems(nuevosItems);
  };

  const eliminarProducto = index => {
    setPedidoItems(pedidoItems.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    return pedidoItems.reduce((total, item) => total + (Number(item.precio) || 0) * (Number(item.cantidad) || 0), 0);
  };

  // ============ CARGAR DATOS DEL CLIENTE ============

  function cargarDatosCliente(cliente) {
    const condPago = getField(cliente, ["Condicion Pago", "CONDICION_PAGO"]) || "Contado";
    const tel = getField(cliente, ["Telefono", "TELEFONO", "Teléfono"]) || "";
    
    setCondicionPago(condPago);
    setTelefono(tel);
    
    const muni = getField(cliente, ["Municipio", "MUNICIPIO"]);
    const dept = getField(cliente, ["Departamento", "DEPARTAMENTO"]);
    const dist = getField(cliente, ["Distrito", "DISTRITO"]);
    if (muni) setMunicipio(muni);
    if (dept) setDepartamento(dept);
    if (dist) setDistrito(dist);
  }

  // ============ ENVIAR PEDIDO ============

  const enviarPedido = async () => {
    if (!clienteSeleccionado || pedidoItems.length === 0 || !vendedor) {
      alert("Completa cliente, productos y vendedor");
      return;
    }

    if (!empresa?.empresa_id) {
      alert("Empresa no identificada. Cierra sesión y vuelve a ingresar.");
      return;
    }

    if (sucursalesDisponibles.length > 1 && !sucursalSeleccionada) {
      alert("Selecciona una sucursal");
      return;
    }

    setEnviandoPedido(true);

    const pedido = {
      cliente: clienteSeleccionado.label,
      nombreNegocio: nombreNegocio,
      sucursal: sucursalSeleccionada || "Principal",
      telefono: telefono,
      vendedor,
      comentarios,
      municipio,
      departamento,
      distrito,
      condicionPago: condicionPago || "No especificada",
      items: pedidoItems.map(item => ({
        codigo: item.value,
        producto: item.label.split(" | ")[0],
        cantidad: item.cantidad,
        precioUnitario: item.precio,
        lista: item.lista,
        total: (item.precio * item.cantidad).toFixed(2)
      })),
      total: calcularTotal().toFixed(2)
    };

    const params = new URLSearchParams({
      empresa_id: empresa.empresa_id,
      cliente: pedido.cliente,
      nombreNegocio: pedido.nombreNegocio,
      sucursal: pedido.sucursal,
      vendedor: pedido.vendedor,
      comentarios: pedido.comentarios,
      municipio: pedido.municipio || "",
      departamento: pedido.departamento || "",
      distrito: pedido.distrito || "",
      condicionPago: pedido.condicionPago,
      items: JSON.stringify(pedido.items),
      total: pedido.total
    });

    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
      const data = await res.json();
      
      if (data.status === "success" || (data && Object.keys(data).length === 0)) {
        setEnviandoPedido(false);
        setMensajeExito("Pedido enviado correctamente");
        
        // Generar PDF con logo base64
        try {
          await generateOrderPdf(pedido, empresa, logoEmpresaBase64);
        } catch (err) {
          console.warn("Error generando PDF:", err);
        }

        // Limpiar formulario después de 3 segundos
        setTimeout(() => {
          setMensajeExito("");
          setClienteSeleccionado(null);
          setProductoSeleccionado(null);
          setCantidadSeleccionada("");
          setListaSeleccionada("1");
          setPedidoItems([]);
          setComentarios("");
          setMunicipio("");
          setDepartamento("");
          setDistrito("");
          setCondicionPago("");
          setNombreNegocio("");
          setSucursalSeleccionada("");
          setSucursalesDisponibles([]);
          setTelefono("");
        }, 3000);
      } else {
        setEnviandoPedido(false);
        alert("❌ Error: " + (data.message ?? JSON.stringify(data)));
      }
    } catch (err) {
      setEnviandoPedido(false);
      alert("❌ Error: " + err.message);
    }
  };

  // ============ PANTALLA DE LOGIN ============

  if (!tokenValido) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4" style={{ backgroundColor: '#f8fafc' }}>
        <div className="p-8 rounded-2xl shadow-xl w-full max-w-sm text-center border-2" style={{ backgroundColor: '#ffffff', borderColor: '#D4A017' }}>
          {/* Logo de login - hardcodeado */}
          <div className="mb-4 flex justify-center">
            <img 
              src="/assets/logo.png" 
              alt="Logo BiBi APP" 
              style={{ maxWidth: 150, height: "auto" }} 
            />
          </div>
          
          <h1 className="text-xl font-bold mb-1" style={{ color: '#1e293b' }}>Toma de Pedidos</h1>
          <p className="text-sm mb-4" style={{ color: '#000000' }}>Acceso para vendedores</p>
          <p className="text-sm font-semibold mb-3" style={{ color: '#000000' }}>Ingresa tu token</p>
          
          <div className="relative mb-3">
            <input
              type={showPassword ? "text" : "password"}
              value={token}
              onChange={e => setToken(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleValidarToken();
              }}
              placeholder="Token..."
              className="w-full border rounded token-input pr-10"
              disabled={validandoToken}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black hover:text-black focus:outline-none"
              disabled={validandoToken}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          
          <button
            onClick={handleValidarToken}
            disabled={validandoToken}
            className="w-full text-white py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: validandoToken ? '#B8860B' : '#D4A017',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => { if (!validandoToken) e.target.style.backgroundColor = '#B8860B'; }}
            onMouseOut={(e) => { if (!validandoToken) e.target.style.backgroundColor = '#D4A017'; }}
          >
            {validandoToken ? "⏳ Validando..." : "Ingresar"}
          </button>
        </div>
        <div className="text-center text-xs mt-4" style={{ color: '#000000' }}>
          Desarrollado por SmartData 5.0 - 2025
        </div>
      </div>
    );
  }

  // ============ PANTALLA DE CARGA ============

  if (loadingDatos) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4" style={{ backgroundColor: '#f8fafc' }}>
        <div className="p-8 rounded-2xl shadow-xl text-center border-2" style={{ backgroundColor: '#ffffff', borderColor: '#D4A017' }}>
          <div className="mb-4">
            <LogoDisplay 
              url={logoEmpresaUrl} 
              nombre={empresa?.nombre || ""} 
              empresaId={empresa?.empresa_id}
              maxWidth={100}
              className="mx-auto"
            />
          </div>
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200" style={{ borderTopColor: '#D4A017' }}></div>
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#1e293b' }}>Cargando datos...</h2>
          <p className="text-sm" style={{ color: '#000000' }}>Obteniendo clientes y productos</p>
          <p className="text-xs mt-2" style={{ color: '#000000' }}>{empresa?.nombre || ""}</p>
        </div>
      </div>
    );
  }

  // ============ PANTALLA PRINCIPAL DE PEDIDOS ============

  return (
    <div className="flex flex-col justify-center items-center min-h-screen p-4" style={{ backgroundColor: '#f8fafc' }}>
      {/* Banner de mensaje de gracia */}
      {mensajeGracia && (
        <div className="w-full max-w-2xl mb-4 p-3 rounded-lg text-center" style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b' }}>
          <p className="text-sm font-semibold" style={{ color: '#92400e' }}>{mensajeGracia}</p>
        </div>
      )}

      {/* Modal de enviando pedido */}
      {enviandoPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-2xl p-8 shadow-2xl max-w-sm text-center mx-4 border-2" style={{ backgroundColor: '#ffffff', borderColor: '#D4A017' }}>
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200" style={{ borderTopColor: '#D4A017' }}></div>
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#1e293b' }}>Enviando pedido...</h3>
            <p className="text-sm" style={{ color: '#000000' }}>Por favor espera</p>
          </div>
        </div>
      )}

      {/* Modal de éxito */}
      {mensajeExito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-2xl p-8 shadow-2xl max-w-sm text-center mx-4 border-2" style={{ backgroundColor: '#ffffff', borderColor: '#16a34a' }}>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
                <svg className="w-10 h-10" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#1e293b' }}>¡Éxito!</h3>
            <p className="mb-4" style={{ color: '#000000' }}>{mensajeExito}</p>
            <p className="text-xs" style={{ color: '#000000' }}>El PDF se descargará automáticamente</p>
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl shadow-lg w-full max-w-2xl border-2" style={{ backgroundColor: '#ffffff', borderColor: '#D4A017' }}>
        {/* Header - más compacto */}
        <div className="flex justify-between items-start mb-3 pb-2 border-b" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold uppercase" style={{ color: '#1e293b' }}>PEDIDOS</h2>
            <p className="text-sm font-semibold truncate" style={{ color: '#000000' }}>{empresa?.nombre || ""}</p>
            <p className="text-xs" style={{ color: '#000000' }}>
              Vendedor: <strong>{vendedor}</strong>
            </p>
          </div>
          <div className="flex flex-col items-end ml-2">
            <button
              onClick={cerrarSesion}
              className="text-xs font-bold underline mb-1"
              style={{ color: '#dc2626' }}
            >
              Salir
            </button>
            <LogoDisplay 
              url={logoEmpresaUrl} 
              nombre={empresa?.nombre || ""} 
              empresaId={empresa?.empresa_id}
              maxWidth={80}
            />
          </div>
        </div>

        {/* Selección de Cliente */}
        <div className="mb-3">
          <label className="block mb-1 font-bold text-sm">Cliente:</label>
          {clientes.length === 0 ? (
            <div className="text-xs text-red-500">No se encontraron clientes. Verifica la configuración.</div>
          ) : (
            <Select
              options={opcionesClientes}
              value={clienteSeleccionado}
              onChange={opt => {
                setClienteSeleccionado(opt);

                // Limpiar estado del cliente anterior
                setCondicionPago("");
                setNombreNegocio("");
                setTelefono("");
                setMunicipio("");
                setDepartamento("");
                setDistrito("");
                setSucursalSeleccionada("");
                setSucursalesDisponibles([]);

                if (opt && opt.data) {
                  const clientesGrupo = opt.data;
                  const negocio = getField(clientesGrupo[0], ["Nombre negocio", "NOMBRE_NEGOCIO"]) || "";
                  setNombreNegocio(negocio);

                  // Varias sucursales: esperar selección
                  if (clientesGrupo.length > 1) {
                    const sucursales = clientesGrupo.map(c => {
                      const nombreSuc = getField(c, ["Sucursal", "SUCURSAL"]) || "Sucursal";
                      return { value: nombreSuc, label: nombreSuc, data: c };
                    });
                    setSucursalesDisponibles(sucursales);
                  } else {
                    // Una sola sucursal: cargar datos directamente
                    const sucNombre = getField(clientesGrupo[0], ["Sucursal", "SUCURSAL"]) || "Principal";
                    setSucursalSeleccionada(sucNombre);
                    cargarDatosCliente(clientesGrupo[0]);
                  }
                }
              }}
              placeholder="Buscar cliente..."
              isClearable
              styles={{
                control: (base) => ({ ...base, fontSize: '16px', minHeight: '44px' }),
                input: (base) => ({ ...base, fontSize: '16px' }),
                option: (base) => ({ ...base, fontSize: '14px', padding: '10px 12px' })
              }}
            />
          )}

          {/* Selector de sucursales (si hay más de una) */}
          {sucursalesDisponibles.length > 1 && (
            <div className="mt-2">
              <label className="block mb-1 font-bold text-sm">Sucursal:</label>
              <Select
                options={sucursalesDisponibles}
                value={sucursalesDisponibles.find(s => s.value === sucursalSeleccionada)}
                onChange={opt => {
                  if (opt) {
                    setSucursalSeleccionada(opt.value);
                    cargarDatosCliente(opt.data);
                  }
                }}
                placeholder="Elige sucursal..."
                styles={{
                  control: (base) => ({ ...base, fontSize: '16px', minHeight: '44px' }),
                  input: (base) => ({ ...base, fontSize: '16px' }),
                  option: (base) => ({ ...base, fontSize: '14px', padding: '10px 12px' })
                }}
              />
            </div>
          )}

          {/* Info del cliente seleccionado */}
          {clienteSeleccionado && (
            <div className="mt-2 p-2 rounded border text-xs" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div className="font-bold mb-1" style={{ color: '#1e40af' }}>
                💳 Condición de pago: {condicionPago || "Contado"}
              </div>
              <div className="grid grid-cols-2 gap-1" style={{ color: '#000' }}>
                {nombreNegocio && <div><strong>Negocio:</strong> {nombreNegocio}</div>}
                {sucursalSeleccionada && <div><strong>Sucursal:</strong> {sucursalSeleccionada}</div>}
                {telefono && <div><strong>Teléfono:</strong> {telefono}</div>}
                {municipio && <div><strong>Municipio:</strong> {municipio}</div>}
                {departamento && <div><strong>Depto:</strong> {departamento}</div>}
                {distrito && <div><strong>Distrito:</strong> {distrito}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Selección de Producto */}
        <div className="mb-3">
          <label className="block mb-1 font-bold text-sm">Producto:</label>
          {productos.length === 0 ? (
            <div className="text-xs text-red-500">No se encontraron productos. Verifica la configuración.</div>
          ) : (
            <>
              <Select
                options={opcionesProductos}
                value={productoSeleccionado}
                onChange={opt => {
                  setProductoSeleccionado(opt);
                  setListaSeleccionada("1");
                }}
                placeholder="Buscar producto..."
                isClearable
                styles={{
                  control: (base) => ({ ...base, fontSize: '16px' }), // Evita zoom en iOS
                  input: (base) => ({ ...base, fontSize: '16px' })
                }}
              />
              {productoSeleccionado && (
                <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div className="flex gap-3 items-end flex-wrap">
                    <div>
                      <label className="block text-xs font-bold mb-1">Lista</label>
                      <select
                        value={listaSeleccionada}
                        onChange={e => setListaSeleccionada(e.target.value)}
                        className="px-2 py-2 border rounded"
                        style={{ backgroundColor: '#fff', fontSize: '14px', width: '80px' }}
                      >
                        <option value="1">Lista 1</option>
                        <option value="2">Lista 2</option>
                        <option value="3">Lista 3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Precio</label>
                      <div className="px-3 py-2 rounded font-bold" style={{ backgroundColor: '#ecfccb', color: '#166534', fontSize: '14px' }}>
                        ${precioUnitarioSeleccionado(productoSeleccionado, listaSeleccionada).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={cantidadSeleccionada}
                        onChange={e => setCantidadSeleccionada(e.target.value)}
                        className="px-2 py-2 border rounded text-center"
                        placeholder="0"
                        style={{ backgroundColor: '#fff', fontSize: '12px', width: '60px' }}
                      />
                    </div>
                    <button
                      onClick={agregarProducto}
                      className="px-4 py-2 text-white rounded font-bold"
                      style={{ backgroundColor: '#D4A017', fontSize: '14px' }}
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Resumen del Pedido */}
        {pedidoItems.length > 0 ? (
          <div ref={resumenRef} className="border-2 rounded-lg p-3" style={{ backgroundColor: '#fffbeb', borderColor: '#D4A017', maxWidth: '450px', margin: '0 auto' }}>
            <h4 className="font-bold text-base mb-2 text-center">Resumen del Pedido ({pedidoItems.length})</h4>
            
            {/* Encabezados */}
            <div className="flex items-center py-1 border-b text-xs font-bold" style={{ borderColor: '#D4A017', color: '#666' }}>
              <span className="flex-1">Producto</span>
              <span className="text-center" style={{ width: '45px' }}>Cant.</span>
              <span className="text-right" style={{ width: '55px' }}>Total</span>
              <span className="text-right" style={{ width: '40px' }}></span>
            </div>
            
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {pedidoItems.map((item, index) => (
                <div key={index} className="flex items-center py-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex-1 pr-1" style={{ minWidth: 0 }}>
                    <div className="font-medium truncate" style={{ fontSize: '12px' }}>{item.label.split(" | ")[0]}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>${Number(item.precio).toFixed(2)} c/u</div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={e => actualizarCantidad(index, parseInt(e.target.value) || 0)}
                    className="border rounded text-center"
                    style={{ width: '45px', padding: '2px', fontSize: '13px' }}
                  />
                  <span className="font-bold text-right" style={{ width: '55px', fontSize: '12px', color: '#166534' }}>${(Number(item.precio) * Number(item.cantidad)).toFixed(2)}</span>
                  <button onClick={() => eliminarProducto(index)} className="text-right" style={{ width: '40px', fontSize: '11px', color: '#dc2626' }}>Borrar</button>
                </div>
              ))}
            </div>

            <div className="pt-3 mt-2 text-center" style={{ borderTop: '2px solid #D4A017' }}>
              <p className="font-bold text-lg mb-3">Total Pedido: ${calcularTotal().toFixed(2)}</p>
              <div className="mb-3 text-left">
                <label className="block text-sm font-medium mb-1">Comentarios / Notas:</label>
                <textarea value={comentarios} onChange={e => setComentarios(e.target.value)} placeholder="Instrucciones especiales, notas de entrega..." rows={2} className="w-full px-3 py-2 border rounded text-sm" style={{ backgroundColor: '#fff', fontSize: '16px' }} />
              </div>
              <button onClick={() => { if (window.confirm("¿Enviar pedido?")) enviarPedido(); }} disabled={enviandoPedido} className="py-3 px-8 rounded-full font-bold text-sm disabled:opacity-50" style={{ backgroundColor: '#16a34a', color: '#ffffff' }}>{enviandoPedido ? "Enviando..." : "✓ Enviar Pedido"}</button>
            </div>
          </div>
        ) : (
          <div ref={resumenRef} className="text-center text-sm p-3 rounded-lg" style={{ backgroundColor: '#f8fafc', color: '#000000', maxWidth: '450px', margin: '0 auto' }}>
            Agrega productos para ver el resumen
          </div>
        )}
      </div>

      <div className="text-center text-xs mt-4" style={{ color: '#000000' }}>
        Desarrollado por SmartData 5.0 - 2025
      </div>
    </div>
  );
}

export default PedidoAppRG;
