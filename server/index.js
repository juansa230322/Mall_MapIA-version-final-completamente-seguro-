// Punto de entrada del servidor: node --env-file-if-exists=.env server/index.js
import { crearApp } from './app.js';
import { config } from './config.js';
import { cerrarPool } from './db.js';

const app = crearApp();
const servidor = app.listen(config.puerto, () => {
  console.log(`MallMapAI escuchando en http://localhost:${config.puerto}`);
  if (!config.databaseUrl) console.warn('Aviso: falta DATABASE_URL. Copia .env.example como .env y complétalo.');
});

// Cierre ordenado con Ctrl + C.
for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, async () => {
    console.log('\nDeteniendo MallMapAI...');
    servidor.close();
    await cerrarPool().catch(() => {});
    process.exit(0);
  });
}
