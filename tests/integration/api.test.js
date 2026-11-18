// Pruebas de integración: API real + PostgreSQL real.
// Usan TEST_DATABASE_URL (una base SEPARADA). La base se borra y se recrea al inicio.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import pg from 'pg';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;
const TOKEN = 'token-de-pruebas-integracion-123456';
const omitir = !URL_PRUEBAS && 'Define TEST_DATABASE_URL para ejecutar las pruebas de integración.';

let servidor;
let baseUrl;
let proxy;
let conexionesProxy = new Set();
let cerrarPool;

// Proxy TCP entre la API y PostgreSQL. Al cerrarlo se simula que la base "se cae".
function abrirProxy(puertoLocal, destino) {
  return new Promise((resolve) => {
    const s = net.createServer((cliente) => {
      const remoto = net.connect(destino.port, destino.hostname);
      conexionesProxy.add(cliente);
      conexionesProxy.add(remoto);
      cliente.pipe(remoto).pipe(cliente);
      const limpiar = () => { cliente.destroy(); remoto.destroy(); };
      cliente.on('error', limpiar);
      remoto.on('error', limpiar);
    });
    s.listen(puertoLocal, '127.0.0.1', () => resolve(s));
  });
}
function cortarProxy() {
  return new Promise((resolve) => {
    for (const c of conexionesProxy) c.destroy();
    conexionesProxy = new Set();
    proxy.close(() => resolve());
  });
}

async function api(metodo, ruta, cuerpo, { admin = false } = {}) {
  const r = await fetch(baseUrl + ruta, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(admin ? { authorization: `Bearer ${TOKEN}` } : {}) },
    body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  return { estado: r.status, cuerpo: texto ? JSON.parse(texto) : null };
}

before(async () => {
  if (omitir) return;
  // 1) Recrea el esquema y la carga inicial en la base de pruebas.
  const cliente = new pg.Client({ connectionString: URL_PRUEBAS });
  await cliente.connect();
  await cliente.query(readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8'));
  await cliente.query(readFileSync(new URL('../../db/seed.sql', import.meta.url), 'utf8'));
  await cliente.end();

  // 2) La API se conecta a través del proxy para poder simular la caída.
  const destino = new URL(URL_PRUEBAS);
  destino.port ||= '5432';
  const puertoProxy = 46000 + Math.floor(Math.random() * 1000);
  proxy = await abrirProxy(puertoProxy, destino);
  const viaProxy = new URL(URL_PRUEBAS);
  viaProxy.hostname = '127.0.0.1';
  viaProxy.port = String(puertoProxy);

  process.env.DATABASE_URL = viaProxy.toString();
  process.env.ADMIN_TOKEN = TOKEN;
  process.env.DB_SSL = 'off';
  const { crearApp } = await import('../../server/app.js');
  ({ cerrarPool } = await import('../../server/db.js'));
  await new Promise((resolve) => { servidor = crearApp().listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${servidor.address().port}/api/v1`;
});

after(async () => {
  if (omitir) return;
  await cerrarPool?.();
  servidor?.close();
  proxy?.close();
});

test('I-01 salud y mapa responden con los datos del sector', { skip: omitir }, async () => {
  assert.equal((await api('GET', '/salud')).estado, 200);
  const { estado, cuerpo } = await api('GET', '/mapa');
  assert.equal(estado, 200);
  assert.equal(cuerpo.pisos.length, 3);
  assert.equal(cuerpo.nodos.length, 115);
  assert.equal(cuerpo.conexiones.length, 121);
});

test('I-02 /ofertas solo devuelve ofertas vigentes', { skip: omitir }, async () => {
  const { cuerpo } = await api('GET', '/ofertas');
  assert.equal(cuerpo.length, 6);
  assert.ok(cuerpo.every((o) => o.vigente));
  assert.ok(!cuerpo.some((o) => o.titulo.includes('vencida')));
});

test('I-03 ruta piso 1 -> piso 3 con "Evitar escaleras" usa solo ascensores', { skip: omitir }, async () => {
  const sin = await api('POST', '/rutas', { origen: 'P1-C01', destino: 'P3-L01' });
  assert.equal(sin.estado, 200);
  assert.ok(sin.cuerpo.aristas.some((a) => a.tipo === 'escalera'));
  const con = await api('POST', '/rutas', { origen: 'P1-C01', destino: 'P3-L01', evitarEscaleras: true });
  assert.equal(con.estado, 200);
  assert.deepEqual(con.cuerpo.aristas.filter((a) => a.tipo !== 'pasillo').map((a) => a.tipo), ['ascensor', 'ascensor']);
  assert.deepEqual(con.cuerpo.pisos, [1, 3]);
  assert.ok(con.cuerpo.instrucciones.some((t) => /ascensor/.test(t)));
});

test('I-04 errores de ruta: sin destino 400, nodo inexistente 404, mismo punto 200', { skip: omitir }, async () => {
  const sinDestino = await api('POST', '/rutas', { origen: 'P1-E01' });
  assert.equal(sinDestino.estado, 400);
  assert.match(sinDestino.cuerpo.error.mensaje, /destino/i);
  assert.equal((await api('POST', '/rutas', { origen: 'P1-E01', destino: 'NO-EXISTE' })).estado, 404);
  const mismo = await api('POST', '/rutas', { origen: 'P1-E01', destino: 'P1-E01' });
  assert.equal(mismo.estado, 200);
  assert.equal(mismo.cuerpo.costoTotal, 0);
  assert.equal((await api('POST', '/rutas', '{malo')).estado, 400);
});

test('I-05 CRUD de promoción con token', { skip: omitir }, async () => {
  const nueva = { numeroLocal: 'P2-L05', titulo: 'Prueba CRUD', porcentaje: 12, fechaInicio: '2026-01-01', fechaFin: '2099-12-31' };
  assert.equal((await api('POST', '/admin/ofertas', nueva)).estado, 401, 'sin token debe rechazar');

  const creada = await api('POST', '/admin/ofertas', nueva, { admin: true });
  assert.equal(creada.estado, 201);
  const id = creada.cuerpo.id;

  const consultada = await api('GET', `/ofertas/${id}`);
  assert.equal(consultada.estado, 200);
  assert.equal(consultada.cuerpo.titulo, 'Prueba CRUD');

  const actualizada = await api('PUT', `/admin/ofertas/${id}`, { ...nueva, titulo: 'Prueba CRUD editada', porcentaje: 25 }, { admin: true });
  assert.equal(actualizada.estado, 200);
  assert.equal(actualizada.cuerpo.porcentaje, 25);

  assert.equal((await api('DELETE', `/admin/ofertas/${id}`, undefined, { admin: true })).estado, 204);
  assert.equal((await api('GET', `/ofertas/${id}`)).estado, 404);
  assert.equal((await api('DELETE', `/admin/ofertas/${id}`, undefined, { admin: true })).estado, 404);
});

test('I-06 rechaza duplicados (409), fechas inválidas (422), tienda inexistente (404) e id mal formado (400)', { skip: omitir }, async () => {
  const p = { numeroLocal: 'P1-L02', titulo: 'Duplicada', fechaInicio: '2026-11-01', fechaFin: '2026-12-01' };
  assert.equal((await api('POST', '/admin/ofertas', p, { admin: true })).estado, 201);
  const dup = await api('POST', '/admin/ofertas', p, { admin: true });
  assert.equal(dup.estado, 409);
  assert.equal(dup.cuerpo.error.codigo, 'DUPLICADO');

  const fecha = await api('POST', '/admin/ofertas', { ...p, titulo: 'Fecha mala', fechaInicio: '2026-02-30' }, { admin: true });
  assert.equal(fecha.estado, 422);
  const invertida = await api('POST', '/admin/ofertas', { ...p, titulo: 'Invertida', fechaFin: '2026-10-01' }, { admin: true });
  assert.equal(invertida.estado, 422);
  assert.equal((await api('POST', '/admin/ofertas', { ...p, numeroLocal: 'P9-L99' }, { admin: true })).estado, 404);
  assert.equal((await api('GET', '/ofertas/123')).estado, 400);
});

test('I-07 importar dos veces la misma carga no duplica ofertas', { skip: omitir }, async () => {
  const carga = {
    origen: 'prueba',
    ofertas: [
      { numeroLocal: 'P3-L05', titulo: 'Importada A', fechaInicio: '2026-11-01', fechaFin: '2099-01-01', porcentaje: 10 },
      { numeroLocal: 'P3-L06', titulo: 'Importada B', fechaInicio: '2026-11-01', fechaFin: '2099-01-01' },
      { numeroLocal: 'P3-L06', titulo: 'Fecha mala', fechaInicio: '2026-13-01', fechaFin: '2099-01-01' },
    ],
  };
  const contar = async () => (await api('GET', '/admin/ofertas', undefined, { admin: true })).cuerpo.length;
  const antes = await contar();
  const r1 = await api('POST', '/admin/ofertas/importar', carga, { admin: true });
  assert.equal(r1.estado, 200);
  assert.equal(r1.cuerpo.insertadas, 2);
  assert.equal(r1.cuerpo.rechazadas.length, 1);
  const despues1 = await contar();
  const r2 = await api('POST', '/admin/ofertas/importar', carga, { admin: true });
  assert.equal(r2.cuerpo.insertadas, 0);
  assert.equal(r2.cuerpo.actualizadas, 2);
  assert.equal(await contar(), despues1);
  assert.equal(despues1, antes + 2);
});

test('I-08 si PostgreSQL se interrumpe la API responde 503 y se recupera al volver', { skip: omitir }, async () => {
  assert.equal((await api('GET', '/ofertas')).estado, 200);
  const puerto = proxy.address().port;
  await cortarProxy(); // la "base" deja de responder y se cortan las conexiones abiertas

  const caida = await api('GET', '/ofertas');
  assert.equal(caida.estado, 503);
  assert.equal(caida.cuerpo.error.codigo, 'BD_NO_DISPONIBLE');
  assert.equal((await api('POST', '/rutas', { origen: 'P1-E01', destino: 'P1-L01' })).estado, 503);
  assert.equal((await api('GET', '/salud')).estado, 503);

  const destino = new URL(URL_PRUEBAS);
  destino.port ||= '5432';
  proxy = await abrirProxy(puerto, destino); // la base "vuelve"
  const recuperada = await api('GET', '/ofertas');
  assert.equal(recuperada.estado, 200);
  assert.equal((await api('GET', '/salud')).estado, 200);
});
