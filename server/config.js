// Lee la configuración desde variables de entorno (archivo .env en desarrollo).
import { readFileSync } from 'node:fs';

function opcionesSsl() {
  const modo = (process.env.DB_SSL || 'off').toLowerCase();
  if (modo === 'off' || modo === 'false') return false;
  if (modo === 'verify') {
    // Verifica el certificado del servidor con el CA indicado (recomendado para Supabase).
    const ca = process.env.DB_SSL_CA_FILE ? readFileSync(process.env.DB_SSL_CA_FILE, 'utf8') : undefined;
    return { rejectUnauthorized: true, ca };
  }
  // "no-verify": cifra la conexión pero no valida el certificado. Solo para pruebas.
  return { rejectUnauthorized: false };
}

export const config = {
  puerto: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  ssl: opcionesSsl(),
  adminToken: process.env.ADMIN_TOKEN || '',
  entorno: process.env.NODE_ENV || 'development',
};
