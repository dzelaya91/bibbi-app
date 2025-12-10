// src/PedidoAppRG.jsx
import React, { useEffect, useState } from "react";
import Select from "react-select";

const COMPANY_NAME = "SUPER GALO MALL DEL SOL";
const LOGO_URL = "src=/assets/logo.jpg"

// URL del Apps Script desplegado (reemplaza por tu URL /exec si es distinta)
const APPS_SCRIPT_ORDERS_URL = "https://script.google.com/macros/s/AKfycbwZ9zFBBNtj-9TnbpmOqV5-eOtDkmu2KUIxP4_cazpmF9G2hrUPlPk0Vn0hM5wvg38n6g/exec";
const APPS_SCRIPT_URL = APPS_SCRIPT_ORDERS_URL; // para validar token y ping

const CLIENTES_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRHnuv04zDvqsj7FjTkegYte9SPKrwV3NPy7GiuxEKdjFuiI5YeHmr6Keb9Uzws76fNaZ476erXukSg/pub?gid=0&single=true&output=csv";

const PRODUCTOS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRHnuv04zDvqsj7FjTkegYte9SPKrwV3NPy7GiuxEKdjFuiI5YeHmr6Keb9Uzws76fNaZ476erXukSg/pub?gid=1713107757&single=true&output=csv";

const NOMBRES_VENDEDORES = [
  "Vendedor 1",
  "Vendedor 2",
  "Vendedor 3",
  "Vendedor 4",
  "Vendedor 5"
];

/* -----------------------
   Utilities CSV + helpers
   ----------------------- */
function normalizeHeader(h) {
  if (!h && h !== 0) return "";
  return h
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/[^\w_]/g, "_");
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
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function csvToJson(csv) {
  if (!csv) return [];
  const lines = csv.trim().split("\n").filter(Boolean);
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

/* -----------------------
   Token validation helper
   ----------------------- */
async function validarTokenWithTimeout(token, timeoutMs = 8000) {
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
    throw err;
  }
}

/* -----------------------
   Componente
   ----------------------- */
function PedidoAppRG() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState("");
  const [listaSeleccionada, setListaSeleccionada] = useState("1");
  const [pedidoItems, setPedidoItems] = useState([]);
  const [comentarios, setComentarios] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [distrito, setDistrito] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [token, setToken] = useState("");
  const [tokenValido, setTokenValido] = useState(false);
  const [vendedor, setVendedor] = useState(null);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [validandoToken, setValidandoToken] = useState(false);

  // cerrar sesión
  const cerrarSesion = () => {
    try {
      localStorage.removeItem("session_valid");
      localStorage.removeItem("session_user");
      localStorage.removeItem("session_expires");
    } catch (e) {}
    setTokenValido(false);
    setVendedor(null);
    setToken("");
  };

  useEffect(() => {
    // pre-warm apps script to reduce cold start
    fetch(`${APPS_SCRIPT_URL}?action=ping`).catch(() => {});

    // verificar sesión guardada en localStorage (UX)
    try {
      const valid = localStorage.getItem("session_valid");
      const exp = parseInt(localStorage.getItem("session_expires") || "0", 10);
      const user = localStorage.getItem("session_user");
      if (valid === "1" && exp > Date.now()) {
        setTokenValido(true);
        if (user) setVendedor(user);
      } else {
        localStorage.removeItem("session_valid");
        localStorage.removeItem("session_user");
        localStorage.removeItem("session_expires");
      }
    } catch (err) {
      console.warn("error leyendo session", err);
    }

    setLoadingClientes(true);
    fetch(CLIENTES_CSV_URL)
      .then((res) => res.text())
      .then((data) => setClientes(csvToJson(data)))
      .catch((err) => {
        console.error("Error cargando clientes", err);
        setClientes([]);
      })
      .finally(() => setLoadingClientes(false));

    setLoadingProductos(true);
    fetch(PRODUCTOS_CSV_URL)
      .then((res) => res.text())
      .then((data) => setProductos(csvToJson(data)))
      .catch((err) => {
        console.error("Error cargando productos", err);
        setProductos([]);
      })
      .finally(() => setLoadingProductos(false));
  }, []);

  // opciones clientes
  const opcionesClientes = clientes.map((c) => {
    const codigo = getField(c, ["Codigo Cliente", "CODIGO_CLIENTE", "Codigo", "CODIGO", "CodigoCliente", "Codigo_cliente"]) ?? "";
    const nombre = getField(c, ["Cliente", "CLIENTE", "NOMBRE", "NOMBRE NEGOCIO", "Nombre negocio"]) ?? "Sin Nombre";
    return { value: codigo, label: `${nombre} - ${codigo}` };
  });

  // productos y precios
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

  const opcionesProductos = productos.map((producto) => {
    const p1keys = ["PRECIO-01", "PRECIO_01", "PRECIO01", "PRECIO1", "PRECIO UNIDAD", "PRECIO", "PRECIO UNITARIO", "PRECIO-1", "PRECIO_1"];
    const p2keys = ["PRECIO-02", "PRECIO_02", "PRECIO02", "PRECIO2", "PRECIO-2", "PRECIO_2"];
    const p3keys = ["PRECIO-03", "PRECIO_03", "PRECIO03", "PRECIO3", "PRECIO-3", "PRECIO_3"];

    const precio1 = parsePriceFromProduct(producto, p1keys);
    const precio2 = parsePriceFromProduct(producto, p2keys);
    const precio3 = parsePriceFromProduct(producto, p3keys);

    const finalP1 = !isNaN(precio1) ? precio1 : 0;
    const finalP2 = !isNaN(precio2) ? precio2 : finalP1;
    const finalP3 = !isNaN(precio3) ? precio3 : finalP1;

    const nombreProducto = getField(producto, ["PRODUCTO", "PRODUCT", "PRODUCT_NAME", "PRODUCTO_NOMBRE", "PRODUCTO"]) ?? "Producto";
    const codigoProducto = getField(producto, ["CODIGO", "COD", "CODE"]) ?? nombreProducto;

    return {
      value: codigoProducto,
      label: `${nombreProducto} | $${finalP1.toFixed(2)}`,
      precio1: finalP1,
      precio2: finalP2,
      precio3: finalP3,
      raw: producto
    };
  });

  function precioUnitarioSeleccionado(prodObj, lista) {
    if (!prodObj) return 0;
    if (lista === "1") return prodObj.precio1 ?? 0;
    if (lista === "2") return prodObj.precio2 ?? prodObj.precio1 ?? 0;
    if (lista === "3") return prodObj.precio3 ?? prodObj.precio1 ?? 0;
    return prodObj.precio1 ?? 0;
  }

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
    const yaExiste = pedidoItems.find((item) => item.value === productoSeleccionado.value && item.lista === listaSeleccionada);
    if (yaExiste) {
      alert("Producto ya agregado (misma lista). Si quieres cambiar cantidad edítala en el resumen.");
      return;
    }

    const precioUnitario = precioUnitarioSeleccionado(productoSeleccionado, listaSeleccionada);

    setPedidoItems([
      ...pedidoItems,
      {
        ...productoSeleccionado,
        cantidad,
        lista: listaSeleccionada,
        precio: precioUnitario
      }
    ]);
    setProductoSeleccionado(null);
    setCantidadSeleccionada("");
  };

  const actualizarCantidad = (index, nuevaCantidad) => {
    const cantidad = parseInt(nuevaCantidad) || 0;
    if (cantidad < 0) return;
    const nuevosItems = [...pedidoItems];
    nuevosItems[index].cantidad = cantidad;
    setPedidoItems(nuevosItems);
  };

  const eliminarProducto = (index) => {
    const nuevosItems = pedidoItems.filter((_, i) => i !== index);
    setPedidoItems(nuevosItems);
  };

  const calcularTotal = () => {
    return pedidoItems.reduce((total, item) => total + (Number(item.precio) || 0) * (Number(item.cantidad) || 0), 0);
  };

  const enviarPedido = async () => {
    if (!clienteSeleccionado || pedidoItems.length === 0 || !vendedor) {
      alert("Completa cliente, productos y vendedor primero");
      return;
    }

    const pedido = {
      cliente: clienteSeleccionado.label,
      vendedor,
      comentarios,
      municipio,
      departamento,
      distrito,
      items: pedidoItems.map((item) => ({
        codigo: item.value,
        producto: item.label.split(" | ")[0],
        cantidad: item.cantidad,
        precioUnitario: item.precio,
        lista: item.lista,
        total: (item.precio * item.cantidad).toFixed(2)
      })),
      total: calcularTotal().toFixed(2)
    };

    // Enviar una fila por item (saveOrderRow)
    const results = [];
    for (let i = 0; i < pedido.items.length; i++) {
      const it = pedido.items[i];
      const params = new URLSearchParams({
        action: "saveOrderRow",
        cliente: pedido.cliente,
        cod_producto: it.codigo,
        producto: it.producto,
        cantidad: String(it.cantidad),
        lista: String(it.lista || "1"),
        precio_01: it.lista === "1" ? String(Number(it.precioUnitario || 0).toFixed(2)) : "",
        precio_02: it.lista === "2" ? String(Number(it.precioUnitario || 0).toFixed(2)) : "",
        precio_03: it.lista === "3" ? String(Number(it.precioUnitario || 0).toFixed(2)) : "",
        total_item: it.total,
        total_pedi: pedido.total,
        vendedor: pedido.vendedor,
        comentario: pedido.comentarios,
        municipio: pedido.municipio,
        departamento: pedido.departamento,
        distrito: pedido.distrito
      });

      try {
        const res = await fetch(`${APPS_SCRIPT_ORDERS_URL}?${params.toString()}`, { method: "GET" });
        const data = await res.json().catch(() => null);
        results.push({ ok: res.ok, status: res.status, data });
      } catch (err) {
        results.push({ ok: false, error: String(err) });
      }
    }

    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      setMensajeExito("✅ Pedido enviado correctamente");
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
      }, 2000);
    } else {
      console.error("Errores en envío:", failed);
      alert(`❌ Fallaron ${failed.length} items al enviar. Revisa consola.`);
    }
  };

  // Render screens

  if (!tokenValido) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-6 rounded shadow-md w-full max-w-sm text-center">
          <img src={LOGO_URL} alt="Logo" className="mx-auto mb-3" style={{ maxWidth: 140, height: "auto" }} />
          <h1 className="text-lg font-bold mb-1">{COMPANY_NAME}</h1>
          <h2 className="text-md font-semibold mb-4">Ingrese Token</h2>

          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token..."
            className="w-full px-3 py-2 border rounded mb-3"
          />
          <button
            onClick={async () => {
              const t = token.trim();
              if (!t) return alert("Ingresa token");
              setValidandoToken(true);
              try {
                const r = await validarTokenWithTimeout(t, 8000); // 8s timeout
                if (r.status === "success") {
                  localStorage.setItem("session_valid", "1");
                  localStorage.setItem("session_user", r.usuario || "");
                  localStorage.setItem("session_expires", String(Date.now() + 1000 * 60 * 60 * 8)); // 8 horas
                  setTokenValido(true);
                  if (r.usuario) setVendedor(r.usuario);
                } else if (r.status === "invalid") {
                  alert("Token inválido");
                } else {
                  alert("Error validando token: " + (r.message || "intenta de nuevo"));
                }
              } catch (err) {
                if (err.name === "AbortError") {
                  alert("La validación tardó demasiado. Intenta de nuevo.");
                } else {
                  console.error("Error validando token:", err);
                  alert("Error validando token: " + (err.message || String(err)));
                }
              } finally {
                setValidandoToken(false);
              }
            }}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            disabled={validandoToken}
          >
            {validandoToken ? "Validando..." : "Validar"}
          </button>
        </div>

        {/* footer */} 
        <div className="text-center text-xs text-gray-500 mt-4">
          Desarrollado por SmartData 5.0® - 2025
        </div>
      </div>
    );
  }

  if (!vendedor) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-6 rounded shadow-md w-full max-w-sm text-center">
          <img src={LOGO_URL} alt="Logo" className="mx-auto mb-3" style={{ maxWidth: 120, height: "auto" }} />
          <h1 className="text-lg font-bold mb-1">{COMPANY_NAME}</h1>
          <h2 className="text-md font-semibold mb-4">¿Quién toma el pedido?</h2>

          <Select
            options={NOMBRES_VENDEDORES.map((nombre) => ({ label: nombre, value: nombre }))}
            onChange={(e) => setVendedor(e.value)}
            placeholder="Seleccionar nombre..."
          />
        </div>

        {/* footer */}
        <div className="text-center text-xs text-gray-500 mt-4">
          Desarrollado por SmartData 5.0® - 2025
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-4">
      {/* Overlay de éxito full-screen */}
      {mensajeExito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm text-center mx-4">
            <div className="text-3xl mb-2">✅</div>
            <div className="font-semibold mb-2">{mensajeExito}</div>
            <div className="text-xs text-gray-600">Pedido enviado correctamente.</div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-2xl font-bold uppercase">TOMA PEDIDOS</h2>
            <p className="text-sm text-gray-600">{COMPANY_NAME}</p>
            <p className="text-xs text-gray-500 mt-1">Vendedor: <strong>{vendedor}</strong></p>
          </div>

          {/* BOTÓN CERRAR SESIÓN y logo */}
          <div className="flex flex-col items-end">
            <button
              onClick={cerrarSesion}
              className="text-xs text-red-600 underline hover:text-red-800 mb-2"
            >
              Cerrar sesión
            </button>

            <img src={LOGO_URL} alt="Logo" style={{ maxWidth: 110, height: "auto" }} />
          </div>
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Seleccionar Cliente:</label>
          {loadingClientes ? (
            <div className="text-xs text-gray-500">Cargando clientes...</div>
          ) : (
            <Select
              options={opcionesClientes}
              value={clienteSeleccionado}
              onChange={(opt) => {
                setClienteSeleccionado(opt);

                // buscar cliente original por código
                const clienteObj = clientes.find((c) => {
                  const cCodigo = getField(c, ["Codigo Cliente", "CODIGO_CLIENTE", "Codigo", "CODIGO", "Codigo Cliente", "CodigoCliente", "Codigo_cliente"]);
                  return (cCodigo ?? "") == (opt?.value ?? "");
                });

                if (clienteObj) {
                  const muni = getField(clienteObj, ["Municipio", "MUNICIPIO", "municipio", "Municipio"]);
                  const dept = getField(clienteObj, ["Departamento", "DEPARTAMENTO", "departamento", "Departamento"]);
                  const dist = getField(clienteObj, ["Distrito", "DISTRITO", "distrito", "Distrito"]);
                  if (muni) setMunicipio(muni);
                  if (dept) setDepartamento(dept);
                  if (dist) setDistrito(dist);
                } else {
                  if (!opt) {
                    setMunicipio("");
                    setDepartamento("");
                    setDistrito("");
                  }
                }
              }}
              placeholder="Buscar cliente..."
              isClearable
            />
          )}
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Seleccionar Producto:</label>
          {loadingProductos ? (
            <div className="text-xs text-gray-500">Cargando productos...</div>
          ) : (
            <>
              <Select
                options={opcionesProductos}
                value={productoSeleccionado}
                onChange={(opt) => {
                  setProductoSeleccionado(opt);
                  setListaSeleccionada("1");
                }}
                placeholder="Buscar producto..."
                isClearable
              />

              {productoSeleccionado && (
                <div className="flex items-center mt-2 space-x-3">
                  <label className="text-sm">Lista:</label>
                  <select
                    value={listaSeleccionada}
                    onChange={(e) => setListaSeleccionada(e.target.value)}
                    className="px-2 py-1 border rounded"
                  >
                    <option value="1">Lista 1</option>
                    <option value="2">Lista 2</option>
                    <option value="3">Lista 3</option>
                  </select>

                  <div className="text-sm text-gray-700">
                    Precio unit: ${precioUnitarioSeleccionado(productoSeleccionado, listaSeleccionada).toFixed(2)}
                  </div>
                </div>
              )}

              <div className="flex items-center mt-2">
                <input
                  type="number"
                  min="1"
                  value={cantidadSeleccionada}
                  onChange={(e) => setCantidadSeleccionada(e.target.value)}
                  className="w-24 px-2 py-1 border rounded mr-4"
                  placeholder="Cantidad"
                />
                <button
                  onClick={agregarProducto}
                  className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Agregar
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Comentarios:</label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Notas adicionales sobre el pedido..."
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        {/* Municipio, Distrito y Departamento (editables) */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <label className="block mb-1 font-medium text-sm">Municipio:</label>
            <input
              type="text"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              placeholder="Municipio"
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">Distrito:</label>
            <input
              type="text"
              value={distrito}
              onChange={(e) => setDistrito(e.target.value)}
              placeholder="Distrito"
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-sm">Departamento:</label>
            <input
              type="text"
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              placeholder="Departamento"
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
        </div>

        {pedidoItems.length > 0 ? (
          <div className="border rounded p-4 bg-gray-50 text-sm">
            <h4 className="font-semibold text-lg mb-3 text-center">Resumen del Pedido</h4>
            <ul className="mb-3 space-y-2">
              {pedidoItems.map((item, index) => (
                <li key={index} className="flex justify-between items-center text-xs">
                  <div className="w-1/2">{item.label.split(" | ")[0]}</div>
                  <div className="flex items-center space-x-3">
                    <div className="text-xs">Lista: <strong>{item.lista}</strong></div>
                    <div className="text-xs">Unit: ${Number(item.precio).toFixed(2)}</div>
                    <div className="flex items-center">
                      <span className="mr-1 text-xs">Cant:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) => actualizarCantidad(index, e.target.value)}
                        className="w-16 px-1 border rounded"
                      />
                    </div>
                    <div className="text-xs">Total: ${(Number(item.precio) * Number(item.cantidad)).toFixed(2)}</div>
                    <button onClick={() => eliminarProducto(index)} className="text-red-600 hover:underline text-xs">Borrar</button>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mb-3 font-bold text-center text-base">Total Pedido: ${calcularTotal().toFixed(2)}</p>

            <div className="text-center">
              {mensajeExito && (
                <div className="mb-2 p-2 text-green-800 bg-green-100 border border-green-300 rounded text-sm inline-block">
                  {mensajeExito}
                </div>
              )}

              <button
                onClick={() => {
                  if (window.confirm("¿Estás seguro de enviar este pedido?")) {
                    enviarPedido();
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Enviar Pedido
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-gray-500">Agrega productos para ver el resumen del pedido</div>
        )}
      </div>

      {/* footer */}
      <div className="text-center text-xs text-gray-500 mt-4">
        Desarrollado por SmartData 5.0® - 2025
      </div>
    </div>
  );
}

export default PedidoAppRG;
