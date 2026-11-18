// Cliente de la API con tiempo límite y mensajes de error comprensibles.
export class ErrorDeApi extends Error {
  constructor(mensaje, { estado = 0, codigo = 'SIN_CONEXION' } = {}) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
  }
}

async function pedir(ruta, opciones = {}) {
  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), 10000);
  let respuesta;
  try {
    respuesta = await fetch(`/api/v1${ruta}`, {
      ...opciones,
      headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) },
      signal: control.signal,
    });
  } catch (err) {
    const mensaje = err.name === 'AbortError'
      ? 'El servidor tardó demasiado en responder.'
      : 'No hay conexión con el servidor de MallMapAI.';
    throw new ErrorDeApi(mensaje);
  } finally {
    clearTimeout(limite);
  }
  const texto = await respuesta.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { /* respuesta no JSON */ }
  if (!respuesta.ok) {
    throw new ErrorDeApi(datos?.error?.mensaje || `Error ${respuesta.status} del servidor.`, {
      estado: respuesta.status,
      codigo: datos?.error?.codigo || 'ERROR',
    });
  }
  return datos;
}

export const obtenerMapa = () => pedir('/mapa');
export const obtenerOfertas = () => pedir('/ofertas');
export const calcularRuta = (origen, destino, evitarEscaleras) =>
  pedir('/rutas', { method: 'POST', body: JSON.stringify({ origen, destino, evitarEscaleras }) });
