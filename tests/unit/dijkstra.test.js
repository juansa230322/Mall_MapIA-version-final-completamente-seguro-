// Pruebas unitarias del módulo Dijkstra (no usan base de datos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dijkstra, construirAdyacencia, ErrorRuta } from '../../shared/dijkstra.js';
import { construirRecorrido } from '../../shared/instrucciones.js';

// Grafo pequeño:   A --1-- B --1-- C
//                  \______ 5 _____/        y  C --1--> D (un solo sentido)
const pequeno = {
  nodos: ['A', 'B', 'C', 'D', 'X'],
  conexiones: [
    { origen: 'A', destino: 'B', costo: 1, tipo: 'pasillo' },
    { origen: 'B', destino: 'C', costo: 1, tipo: 'pasillo' },
    { origen: 'A', destino: 'C', costo: 5, tipo: 'pasillo' },
    { origen: 'C', destino: 'D', costo: 1, tipo: 'pasillo', bidireccional: false },
  ],
};

test('U-01 elige el camino de menor costo y no el de menos saltos', () => {
  const r = dijkstra(pequeno, 'A', 'C');
  assert.deepEqual(r.camino, ['A', 'B', 'C']);
  assert.equal(r.costo, 2);
});

test('U-02 respeta el sentido: C -> D existe, D -> C no', () => {
  assert.deepEqual(dijkstra(pequeno, 'A', 'D').camino, ['A', 'B', 'C', 'D']);
  assert.throws(() => dijkstra(pequeno, 'D', 'A'), (e) => e instanceof ErrorRuta && e.codigo === 'RUTA_NO_ENCONTRADA');
});

test('U-03 origen igual al destino devuelve costo 0', () => {
  const r = dijkstra(pequeno, 'B', 'B');
  assert.deepEqual(r.camino, ['B']);
  assert.equal(r.costo, 0);
});

test('U-04 nodo inexistente produce NODO_INEXISTENTE', () => {
  assert.throws(() => dijkstra(pequeno, 'A', 'Z'), (e) => e.codigo === 'NODO_INEXISTENTE');
  assert.throws(() => dijkstra(pequeno, 'Z', 'A'), (e) => e.codigo === 'NODO_INEXISTENTE');
});

test('U-05 nodo aislado (desconectado) produce RUTA_NO_ENCONTRADA', () => {
  assert.throws(() => dijkstra(pequeno, 'A', 'X'), (e) => e.codigo === 'RUTA_NO_ENCONTRADA');
});

test('U-06 datos vacíos producen DATOS_INCOMPLETOS', () => {
  assert.throws(() => dijkstra(pequeno, '', 'A'), (e) => e.codigo === 'DATOS_INCOMPLETOS');
});

test('U-07 "evitar escaleras" quita las escaleras antes de calcular', () => {
  const g = {
    nodos: ['P1', 'P2', 'ASC1', 'ASC2'],
    conexiones: [
      { origen: 'P1', destino: 'P2', costo: 10, tipo: 'escalera' },
      { origen: 'P1', destino: 'ASC1', costo: 5, tipo: 'pasillo' },
      { origen: 'ASC1', destino: 'ASC2', costo: 20, tipo: 'ascensor' },
      { origen: 'ASC2', destino: 'P2', costo: 5, tipo: 'pasillo' },
    ],
  };
  assert.deepEqual(dijkstra(g, 'P1', 'P2').camino, ['P1', 'P2']);
  assert.deepEqual(dijkstra(g, 'P1', 'P2', { evitarEscaleras: true }).camino, ['P1', 'ASC1', 'ASC2', 'P2']);
  // Si solo hay escaleras, el filtro deja el destino inalcanzable.
  const soloEscalera = { nodos: ['P1', 'P2'], conexiones: [g.conexiones[0]] };
  assert.throws(() => dijkstra(soloEscalera, 'P1', 'P2', { evitarEscaleras: true }), (e) => e.codigo === 'RUTA_NO_ENCONTRADA');
});

test('U-08 costos negativos o inválidos se rechazan', () => {
  assert.throws(() => construirAdyacencia([{ origen: 'A', destino: 'B', costo: -1, tipo: 'pasillo' }]), (e) => e.codigo === 'COSTO_INVALIDO');
});

test('U-09 con el grafo real: piso 1 -> piso 3 usa escaleras sin filtro y ascensor con filtro', () => {
  const datos = JSON.parse(readFileSync(new URL('../../data/grafo-sector.json', import.meta.url)));
  const nodos = new Map(datos.nodos.map((n) => [n.id, n]));
  const conexiones = datos.conexiones.map((c) => {
    const a = nodos.get(c.origen);
    const b = nodos.get(c.destino);
    const costo = c.tipo === 'pasillo' ? Math.hypot(a.x - b.x, a.y - b.y) : datos.costosVerticales[c.tipo];
    return { ...c, costo };
  });
  const g = { nodos: nodos.keys(), conexiones };
  const sinFiltro = dijkstra(g, 'P1-C01', 'P3-L01');
  assert.ok(sinFiltro.aristas.some((a) => a.tipo === 'escalera'));
  const conFiltro = dijkstra({ nodos: nodos.keys(), conexiones }, 'P1-C01', 'P3-L01', { evitarEscaleras: true });
  assert.ok(conFiltro.aristas.every((a) => a.tipo !== 'escalera'));
  assert.equal(conFiltro.aristas.filter((a) => a.tipo === 'ascensor').length, 2);
  assert.equal(nodos.get(conFiltro.camino.at(-1)).piso, 3);
  assert.ok(conFiltro.costo >= sinFiltro.costo, 'el filtro nunca debe dar un costo menor');

  const recorrido = construirRecorrido(conFiltro.camino, conFiltro.aristas, nodos);
  assert.deepEqual(recorrido.pisos, [1, 3]); // el piso 2 solo se cruza dentro del ascensor
  assert.ok(recorrido.instrucciones.some((t) => t.includes('ascensor') && t.includes('Piso 1') && t.includes('Piso 3')));
});

test('U-10 todas las conexiones del grafo apuntan a nodos existentes y no hay nodos sueltos', () => {
  const datos = JSON.parse(readFileSync(new URL('../../data/grafo-sector.json', import.meta.url)));
  const ids = new Set(datos.nodos.map((n) => n.id));
  const usados = new Set();
  for (const c of datos.conexiones) {
    assert.ok(ids.has(c.origen) && ids.has(c.destino), `${c.origen} -> ${c.destino}`);
    usados.add(c.origen);
    usados.add(c.destino);
  }
  for (const id of ids) assert.ok(usados.has(id), `nodo sin conexiones: ${id}`);
});
