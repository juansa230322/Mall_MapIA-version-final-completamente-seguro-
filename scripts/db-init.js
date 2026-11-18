// Crea las tablas y carga los datos iniciales: npm run db:init
// Usa la DATABASE_URL del archivo .env (o de la variable de entorno).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../server/config.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

if (!config.databaseUrl) {
  console.error('ERROR: falta DATABASE_URL. Copia .env.example como .env y escribe la URI de tu base.');
  process.exit(1);
}

const cliente = new pg.Client({ connectionString: config.databaseUrl, ssl: config.ssl, connectionTimeoutMillis: 8000 });
try {
  await cliente.connect();
  await cliente.query(readFileSync(path.join(raiz, 'db', 'schema.sql'), 'utf8'));
  await cliente.query(readFileSync(path.join(raiz, 'db', 'seed.sql'), 'utf8'));
  const { rows } = await cliente.query(`
    SELECT (SELECT count(*) FROM piso)::int AS pisos, (SELECT count(*) FROM nodo)::int AS nodos,
           (SELECT count(*) FROM conexion)::int AS conexiones, (SELECT count(*) FROM tienda)::int AS tiendas,
           (SELECT count(*) FROM promocion)::int AS promociones, (SELECT count(*) FROM promocion_vigente)::int AS vigentes`);
  const r = rows[0];
  console.log('Base de datos lista.');
  console.log(`  pisos: ${r.pisos} | nodos: ${r.nodos} | conexiones: ${r.conexiones} | tiendas: ${r.tiendas} | promociones: ${r.promociones} (vigentes: ${r.vigentes})`);
} catch (err) {
  console.error('ERROR al inicializar la base de datos:', err.message);
  if (err.code === 'ECONNREFUSED') console.error('  ¿Está encendido PostgreSQL? Revisa el host y el puerto de DATABASE_URL.');
  if (err.code === '28P01') console.error('  La contraseña de DATABASE_URL no es correcta.');
  if (err.code === '3D000') console.error('  La base de datos indicada no existe. Créala primero.');
  process.exitCode = 1;
} finally {
  await cliente.end().catch(() => {});
}
