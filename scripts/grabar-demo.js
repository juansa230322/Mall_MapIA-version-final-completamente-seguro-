// Graba un video de demostración de la app real con Playwright (sin narración; subtítulos en pantalla).
// Uso: con el servidor encendido -> node scripts/grabar-demo.js   (crea docs/video/demo.webm)
// Luego: ffmpeg -i docs/video/demo.webm -c:v libx264 -pix_fmt yuv420p docs/video/MallMapAI-demo.mp4
import { chromium } from '@playwright/test';
import { mkdirSync, renameSync, readdirSync } from 'node:fs';

const URL = process.env.MALLMAPAI_URL || 'http://localhost:3000';
const carpeta = 'docs/video';
mkdirSync(carpeta, { recursive: true });

const navegador = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: carpeta, size: { width: 1280, height: 720 } }, locale: 'es-CO' });
const page = await contexto.newPage();
const pausa = (ms) => page.waitForTimeout(ms);

// Subtítulo fijo en la parte inferior.
async function subtitulo(texto) {
  await page.evaluate((t) => {
    let el = document.getElementById('subtitulo-demo');
    if (!el) {
      el = document.createElement('div');
      el.id = 'subtitulo-demo';
      el.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);max-width:88%;background:rgba(0,0,0,.82);color:#fff;font:600 20px system-ui;padding:10px 18px;border-radius:10px;z-index:9999;text-align:center;pointer-events:none';
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, texto);
}

await page.addInitScript(() => window.localStorage.clear());
await page.goto(URL);
await page.getByRole('heading', { name: 'Piso 1' }).waitFor();
await subtitulo('MallMapAI · Unicentro Bogotá · prototipo con sector piloto y datos de demostración');
await pausa(3500);
await subtitulo('Mapa del Piso 1: plano SVG original, marcadores con letra y leyenda escrita');
await page.getByRole('button', { name: 'Acercar' }).click(); await pausa(700);
await page.getByRole('button', { name: 'Acercar' }).click(); await pausa(1200);
await page.getByRole('button', { name: 'Restablecer' }).click(); await pausa(1500);
await subtitulo('Cambio de piso: Piso 2 y Piso 3');
await page.getByRole('group', { name: 'Elegir piso' }).getByRole('button', { name: 'Piso 2' }).click(); await pausa(1500);
await page.getByRole('group', { name: 'Elegir piso' }).getByRole('button', { name: 'Piso 3' }).click(); await pausa(1500);
await page.getByRole('group', { name: 'Elegir piso' }).getByRole('button', { name: 'Piso 1' }).click(); await pausa(800);

await subtitulo('Ruta: Plazoleta norte (Piso 1) → Relojes Tiempo (Piso 3)');
await page.getByLabel('Punto de partida', { exact: true }).selectOption('P1-C01'); await pausa(900);
await page.getByLabel('Destino', { exact: true }).selectOption('P3-L01'); await pausa(900);
await page.getByRole('button', { name: 'Trazar ruta' }).click(); await pausa(3000);
await subtitulo('Sin filtro, el camino de menor costo usa las escaleras');
await pausa(2500);
await subtitulo('Con «Evitar escaleras» el grafo excluye las escaleras y la ruta usa el ascensor');
await page.getByLabel('Evitar escaleras').check(); await pausa(700);
await page.getByRole('button', { name: 'Trazar ruta' }).click(); await pausa(3500);
await page.getByTestId('recorrido').getByRole('button', { name: 'Ver Piso 3' }).click();
await subtitulo('Tramo del Piso 3 hasta el local de destino');
await pausa(3000);

await subtitulo('Ofertas: tarjetas con el local y el detalle de la promoción');
await page.getByRole('button', { name: /^Ofertas/ }).click(); await pausa(3000);
await subtitulo('«Ir al local» abre el mapa y calcula la ruta desde el origen elegido');
await page.getByTestId('oferta').filter({ hasText: 'Combo café y postre' }).getByRole('button', { name: 'Ir al local' }).click();
await pausa(3500);
await subtitulo('La accesibilidad física y los datos reales se validan en sitio (pendiente)');
await pausa(3000);

await contexto.close();
await navegador.close();
const video = readdirSync(carpeta).find((f) => f.endsWith('.webm') && f !== 'demo.webm');
if (video) renameSync(`${carpeta}/${video}`, `${carpeta}/demo.webm`);
console.log('Video guardado en docs/video/demo.webm');
