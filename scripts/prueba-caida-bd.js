// Prueba manual de aceptación: detiene PostgreSQL de verdad con el servidor encendido.
// Uso (PowerShell, con `npm.cmd start` corriendo en otra ventana y Docker Desktop):
//   $env:BD_DETENER="docker compose stop db"; $env:BD_INICIAR="docker compose start db"; node scripts/prueba-caida-bd.js
// Con PostgreSQL de Windows (PowerShell como administrador):
//   $env:BD_DETENER="net stop postgresql-x64-16"; $env:BD_INICIAR="net start postgresql-x64-16"; node scripts/prueba-caida-bd.js
import { execSync } from 'node:child_process';

const API = process.env.MALLMAPAI_API || `http://localhost:${process.env.PORT || 3000}/api/v1`;
const DETENER = process.env.BD_DETENER || 'docker compose stop db';
const INICIAR = process.env.BD_INICIAR || 'docker compose start db';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function estado(ruta, opciones) {
  const inicio = Date.now();
  const r = await fetch(API + ruta, opciones);
  const cuerpo = await r.json().catch(() => null);
  return { http: r.status, ms: Date.now() - inicio, codigo: cuerpo?.error?.codigo ?? cuerpo?.estado ?? (Array.isArray(cuerpo) ? `${cuerpo.length} ofertas` : '') };
}
const ruta = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ origen: 'P1-E01', destino: 'P3-L10' }) };
const registrar = (paso, r) => console.log(`${new Date().toISOString()}  ${paso.padEnd(34)} HTTP ${r.http}  ${String(r.ms).padStart(5)} ms  ${r.codigo}`);

let fallos = 0;
const comprobar = (condicion, texto) => { if (!condicion) { fallos++; console.log(`  ✗ ${texto}`); } else console.log(`  ✓ ${texto}`); };

console.log(`API: ${API}`);
let r = await estado('/ofertas'); registrar('1. Antes: GET /ofertas', r); comprobar(r.http === 200, 'responde 200 con la base encendida');

console.log(`\n> ${DETENER}`); execSync(DETENER, { stdio: 'inherit' }); await esperar(1500);
r = await estado('/ofertas'); registrar('2. Base detenida: GET /ofertas', r); comprobar(r.http === 503 && r.codigo === 'BD_NO_DISPONIBLE', 'responde 503 BD_NO_DISPONIBLE');
r = await estado('/rutas', ruta); registrar('3. Base detenida: POST /rutas', r); comprobar(r.http === 503, 'la ruta también responde 503 controlado');
r = await estado('/salud'); registrar('4. Base detenida: GET /salud', r); comprobar(r.http === 503, 'salud informa degradado');
comprobar(r.ms < 5000, 'responde en menos de 5 s (no se queda colgada)');

console.log(`\n> ${INICIAR}`); execSync(INICIAR, { stdio: 'inherit' });
let recuperada = false;
for (let i = 0; i < 20 && !recuperada; i++) {
  await esperar(1000);
  r = await estado('/salud');
  recuperada = r.http === 200;
}
registrar('5. Base reiniciada: GET /salud', r); comprobar(recuperada, 'la API se recupera sin reiniciar el servidor');
r = await estado('/ofertas'); registrar('6. Después: GET /ofertas', r); comprobar(r.http === 200, 'vuelve a responder 200');
r = await estado('/rutas', ruta); registrar('7. Después: POST /rutas', r); comprobar(r.http === 200, 'vuelve a calcular rutas');

console.log(fallos === 0 ? '\nRESULTADO: APROBADA' : `\nRESULTADO: FALLIDA (${fallos} comprobaciones)`);
process.exitCode = fallos === 0 ? 0 : 1;
