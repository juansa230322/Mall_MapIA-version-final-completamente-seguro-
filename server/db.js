// Pool de conexiones a PostgreSQL. Todas las consultas usan parámetros ($1, $2...).
import pg from 'pg';
import { config } from './config.js';
import { ErrorApi } from './errores.js';

// DATE se devuelve como texto 'AAAA-MM-DD' para evitar corrimientos por zona horaria.
pg.types.setTypeParser(1082, (v) => v);
// NUMERIC se devuelve como número.
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

let pool;

export function obtenerPool() {
  if (!pool) {
    if (!config.databaseUrl) {
      throw new ErrorApi(500, 'CONFIGURACION', 'Falta la variable DATABASE_URL en el archivo .env.');
    }
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: config.ssl,
      max: 5,
      connectionTimeoutMillis: 3000, // si la base no responde, falla rápido
      idleTimeoutMillis: 10000,
    });
    // Un error en una conexión inactiva (por ejemplo, la base se detuvo) no debe tumbar el servidor.
    pool.on('error', (err) => console.error('[bd] conexión inactiva con error:', err.message));
  }
  return pool;
}

// Códigos de error de red o de PostgreSQL que significan "la base no está disponible".
const CODIGOS_SIN_BD = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE',
  '57P01', '57P02', '57P03', '08000', '08001', '08003', '08006', '53300',
]);

export function esErrorDeConexion(err) {
  if (!err) return false;
  if (CODIGOS_SIN_BD.has(err.code)) return true;
  const msg = String(err.message || '');
  return /timeout|Connection terminated|connect ECONNREFUSED|terminating connection/i.test(msg);
}

export async function consultar(sql, parametros = []) {
  try {
    return await obtenerPool().query(sql, parametros);
  } catch (err) {
    if (esErrorDeConexion(err)) {
      throw new ErrorApi(503, 'BD_NO_DISPONIBLE', 'La base de datos no está disponible en este momento. Intenta de nuevo en unos segundos.');
    }
    throw err;
  }
}

export async function transaccion(trabajo) {
  let cliente;
  try {
    cliente = await obtenerPool().connect();
  } catch (err) {
    if (esErrorDeConexion(err)) {
      throw new ErrorApi(503, 'BD_NO_DISPONIBLE', 'La base de datos no está disponible en este momento. Intenta de nuevo en unos segundos.');
    }
    throw err;
  }
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    if (esErrorDeConexion(err)) {
      throw new ErrorApi(503, 'BD_NO_DISPONIBLE', 'La base de datos no está disponible en este momento. Intenta de nuevo en unos segundos.');
    }
    throw err;
  } finally {
    cliente.release();
  }
}

export async function cerrarPool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
