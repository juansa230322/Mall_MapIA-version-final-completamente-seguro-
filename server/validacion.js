// Validaciones de entrada de la API. Devuelven una lista de errores por campo.
import { ErrorApi } from './errores.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function esUuid(valor) {
  return typeof valor === 'string' && UUID.test(valor);
}

// Comprueba formato AAAA-MM-DD y que la fecha exista en el calendario (no 2026-02-30).
export function esFechaValida(valor) {
  if (typeof valor !== 'string' || !FECHA.test(valor)) return false;
  const [a, m, d] = valor.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

function textoOpcional(valor, campo, max, errores) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') {
    errores.push({ campo, mensaje: 'Debe ser texto.' });
    return null;
  }
  if (valor.length > max) errores.push({ campo, mensaje: `Máximo ${max} caracteres.` });
  return valor.trim();
}

/**
 * Valida el cuerpo de creación o actualización de una promoción.
 * La tienda se puede indicar con `tiendaId` (UUID) o con `numeroLocal`.
 */
export function validarPromocion(cuerpo) {
  const errores = [];
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    throw new ErrorApi(400, 'CUERPO_INVALIDO', 'El cuerpo de la petición debe ser un objeto JSON.');
  }
  const { tiendaId, numeroLocal, titulo, descripcion, porcentaje, fechaInicio, fechaFin, imagenUrl, esActiva } = cuerpo;

  if (tiendaId === undefined && numeroLocal === undefined) {
    errores.push({ campo: 'tiendaId', mensaje: 'Indica la tienda (tiendaId o numeroLocal).' });
  }
  if (tiendaId !== undefined && !esUuid(tiendaId)) {
    errores.push({ campo: 'tiendaId', mensaje: 'Debe ser un UUID válido.' });
  }
  if (numeroLocal !== undefined && (typeof numeroLocal !== 'string' || numeroLocal.trim() === '')) {
    errores.push({ campo: 'numeroLocal', mensaje: 'Debe ser un texto no vacío.' });
  }

  if (typeof titulo !== 'string' || titulo.trim() === '') {
    errores.push({ campo: 'titulo', mensaje: 'El título es obligatorio.' });
  } else if (titulo.trim().length > 150) {
    errores.push({ campo: 'titulo', mensaje: 'Máximo 150 caracteres.' });
  }

  const desc = textoOpcional(descripcion, 'descripcion', 1000, errores);
  const imagen = textoOpcional(imagenUrl, 'imagenUrl', 500, errores);

  let pct = null;
  if (porcentaje !== undefined && porcentaje !== null && porcentaje !== '') {
    if (typeof porcentaje !== 'number' || !Number.isFinite(porcentaje)) {
      errores.push({ campo: 'porcentaje', mensaje: 'Debe ser un número.' });
    } else if (porcentaje <= 0 || porcentaje > 100) {
      errores.push({ campo: 'porcentaje', mensaje: 'Debe estar entre 0 (sin incluir) y 100.' });
    } else pct = porcentaje;
  }

  if (!esFechaValida(fechaInicio)) errores.push({ campo: 'fechaInicio', mensaje: 'Usa una fecha real con formato AAAA-MM-DD.' });
  if (!esFechaValida(fechaFin)) errores.push({ campo: 'fechaFin', mensaje: 'Usa una fecha real con formato AAAA-MM-DD.' });
  if (esFechaValida(fechaInicio) && esFechaValida(fechaFin) && fechaFin < fechaInicio) {
    errores.push({ campo: 'fechaFin', mensaje: 'La fecha final no puede ser anterior a la inicial.' });
  }

  if (esActiva !== undefined && typeof esActiva !== 'boolean') {
    errores.push({ campo: 'esActiva', mensaje: 'Debe ser verdadero o falso.' });
  }

  if (errores.length > 0) {
    throw new ErrorApi(422, 'VALIDACION', 'Hay datos inválidos en la promoción.', errores);
  }
  return {
    tiendaId: tiendaId ?? null,
    numeroLocal: numeroLocal?.trim() ?? null,
    titulo: titulo.trim(),
    descripcion: desc,
    porcentaje: pct,
    fechaInicio,
    fechaFin,
    imagenUrl: imagen,
    esActiva: esActiva ?? true,
  };
}

export function validarPeticionRuta(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object') {
    throw new ErrorApi(400, 'CUERPO_INVALIDO', 'El cuerpo de la petición debe ser un objeto JSON.');
  }
  const errores = [];
  const { origen, destino, evitarEscaleras } = cuerpo;
  if (typeof origen !== 'string' || origen.trim() === '') errores.push({ campo: 'origen', mensaje: 'Elige un punto de partida.' });
  if (typeof destino !== 'string' || destino.trim() === '') errores.push({ campo: 'destino', mensaje: 'Elige un destino.' });
  if (evitarEscaleras !== undefined && typeof evitarEscaleras !== 'boolean') {
    errores.push({ campo: 'evitarEscaleras', mensaje: 'Debe ser verdadero o falso.' });
  }
  if (errores.length > 0) throw new ErrorApi(400, 'DATOS_INCOMPLETOS', errores.map((e) => e.mensaje).join(' '), errores);
  return { origen: origen.trim(), destino: destino.trim(), evitarEscaleras: evitarEscaleras === true };
}
