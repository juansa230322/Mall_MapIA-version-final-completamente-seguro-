// Pruebas funcionales y de aceptación técnica en el navegador.
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const CARPETA = 'docs/evidencias/capturas';
mkdirSync(CARPETA, { recursive: true });
const captura = (page, nombre, info) => page.screenshot({ path: `${CARPETA}/${info.project.name}-${nombre}.png`, fullPage: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test('E-01 el mapa carga con leyenda escrita, cambio de piso y zoom', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Piso 1' })).toBeVisible();
  for (const texto of ['Entrada de local', 'Baños', 'Entrada al centro comercial', 'Ascensor', 'Escaleras (fija o eléctrica)']) {
    await expect(page.locator('.leyenda')).toContainText(texto);
  }
  const svg = page.getByTestId('mapa-svg');
  const antes = await svg.getAttribute('viewBox');
  await page.getByRole('button', { name: 'Acercar' }).click();
  await expect(svg).not.toHaveAttribute('viewBox', antes);
  await page.getByRole('button', { name: 'Restablecer' }).click();
  await expect(svg).toHaveAttribute('viewBox', antes);
  await captura(page, '01-mapa-principal', info);
  await page.getByRole('group', { name: 'Elegir piso' }).getByRole('button', { name: 'Piso 3' }).click();
  await expect(page.getByRole('heading', { name: 'Piso 3' })).toBeVisible();
  await expect(page.locator('[data-nodo="P3-ASC"]')).toBeVisible();
});

test('E-02 aparece un aviso cuando falta el destino', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Punto de partida', { exact: true }).selectOption('P1-E01');
  await page.getByRole('button', { name: 'Trazar ruta' }).click();
  await expect(page.getByRole('alert')).toContainText('Falta el destino');
});

test('E-03 ruta del piso 1 al piso 3 con «Evitar escaleras» usa ascensores', async ({ page }, info) => {
  await page.goto('/');
  await page.getByLabel('Punto de partida', { exact: true }).selectOption('P1-C01');
  await page.getByLabel('Destino', { exact: true }).selectOption('P3-L01');
  await page.getByRole('button', { name: 'Trazar ruta' }).click();
  const recorrido = page.getByTestId('recorrido');
  await expect(recorrido).toContainText('escaleras'); // sin filtro la ruta más corta usa escaleras

  await page.getByLabel('Evitar escaleras').check();
  await page.getByRole('button', { name: 'Trazar ruta' }).click();
  await expect(recorrido).toContainText('Toma el ascensor en el Piso 1 y sube hasta el Piso 3');
  await expect(recorrido).not.toContainText('por las escaleras');
  await expect(page.getByTestId('ruta-dibujada')).toBeVisible();
  await captura(page, '03-recorrido-piso1', info);
  await recorrido.getByRole('button', { name: 'Ver Piso 3' }).click();
  await expect(page.getByRole('heading', { name: 'Piso 3' })).toBeVisible();
  await expect(page.getByTestId('ruta-dibujada')).toBeVisible();
  await captura(page, '04-recorrido-piso3', info);
});

test('E-04 flujo Oferta → Ir al local → Ruta (pide origen si falta)', async ({ page }, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Ofertas/ }).click();
  const tarjeta = page.getByTestId('oferta').filter({ hasText: '2x1 en revelado de fotos' });
  await expect(tarjeta).toBeVisible();
  await captura(page, '02-ofertas', info);
  await tarjeta.getByRole('button', { name: 'Ir al local' }).click();
  await expect(page.getByRole('alert')).toContainText('primero elige tu punto de partida');
  await expect(page.getByLabel('Punto de partida', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Destino', { exact: true })).toHaveValue('P3-L10');
  await page.getByLabel('Punto de partida', { exact: true }).selectOption('P1-E01');
  await expect(page.getByTestId('recorrido')).toContainText('Llegaste a Fotografía Lente (demo)');

  // Con origen ya elegido, «Ir al local» calcula de inmediato.
  await page.getByRole('button', { name: /^Ofertas/ }).click();
  await page.getByTestId('oferta').filter({ hasText: 'Combo café y postre' }).getByRole('button', { name: 'Ir al local' }).click();
  await expect(page.getByTestId('recorrido')).toContainText('Llegaste a Dulces Momentos (demo)');
  await captura(page, '05-ruta-desde-oferta', info);
});

test('E-05 el destino se elige desde el mapa con teclado', async ({ page }) => {
  test.skip(test.info().project.name === 'movil-390', 'El teclado se prueba en escritorio.');
  await page.goto('/');
  await page.getByLabel('Punto de partida', { exact: true }).selectOption('P1-E02');
  const marcador = page.locator('[data-nodo="P1-L07"]');
  await marcador.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Punto seleccionado')).toContainText('Ruta Deportiva (demo)');
  await expect(page.getByLabel('Punto seleccionado')).toContainText('20% en tenis para correr');
  await page.getByRole('button', { name: 'Ir aquí' }).click();
  await expect(page.getByTestId('recorrido')).toContainText('Llegaste a Ruta Deportiva (demo)');
});

test('E-06 pantalla móvil de 390 px: sin desbordes y con ruta funcional', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil-390', 'Solo en el proyecto móvil.');
  await page.goto('/');
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(ancho).toBeLessThanOrEqual(390);
  await page.getByLabel('Punto de partida', { exact: true }).selectOption('P1-E01');
  await page.getByLabel('Destino', { exact: true }).selectOption('P2-L02');
  await page.getByRole('button', { name: 'Trazar ruta' }).click();
  await expect(page.getByTestId('recorrido')).toContainText('Llegaste a');
  const boton = await page.getByRole('button', { name: 'Trazar ruta' }).boundingBox();
  expect(boton.height).toBeGreaterThanOrEqual(44);
  await page.getByTestId('mapa-svg').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${CARPETA}/movil-390-06-mapa-ruta.png` });
});

test('E-07 error de servidor muestra mensaje y el reintento funciona', async ({ page }, info) => {
  let fallar = true;
  await page.route('**/api/v1/mapa', (route) =>
    fallar
      ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { codigo: 'BD_NO_DISPONIBLE', mensaje: 'La base de datos no está disponible en este momento.' } }) })
      : route.continue());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('No se pudo cargar el mapa');
  await captura(page, '07-error-reintento', info);
  fallar = false;
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('heading', { name: 'Piso 1' })).toBeVisible();
});

test('E-08 sin ofertas vigentes se muestra un estado vacío', async ({ page }) => {
  await page.route('**/api/v1/ofertas', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto('/');
  await page.getByRole('button', { name: /^Ofertas/ }).click();
  await expect(page.getByText('No hay ofertas vigentes en este momento')).toBeVisible();
});
