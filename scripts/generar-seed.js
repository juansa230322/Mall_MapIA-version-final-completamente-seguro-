// Genera db/seed.sql a partir de los archivos de data/.
// Así la carga inicial se puede ejecutar con `npm run db:init` o pegando el SQL en Supabase.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (archivo) => JSON.parse(readFileSync(path.join(raiz, 'data', archivo), 'utf8'));

const grafo = leer('grafo-sector.json');
const tiendas = leer('tiendas-demo.json');
const promociones = leer('promociones-demo.json');

const texto = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const num = (v) => (v === null || v === undefined ? 'NULL' : String(v));

const pisos = [
  [1, 'Piso 1', '/planos/piso1.svg', 1388, 731],
  [2, 'Piso 2', '/planos/piso2.svg', 1427, 766],
  [3, 'Piso 3', '/planos/piso3.svg', 1303, 745],
];
const nodos = new Map(grafo.nodos.map((n) => [n.id, n]));

// Costo horizontal = distancia euclidiana en unidades del viewBox (no son metros).
// Costo vertical = valor fijo de demostración definido en grafo-sector.json.
function costo(c) {
  if (c.tipo !== 'pasillo') return grafo.costosVerticales[c.tipo];
  const a = nodos.get(c.origen);
  const b = nodos.get(c.destino);
  return Math.max(0.01, Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 100) / 100);
}

const lineas = [];
lineas.push('-- MallMapAI - Carga inicial (GENERADO por scripts/generar-seed.js, no editar a mano)');
lineas.push('-- Sector piloto: eje central-sur de los pisos 1, 2 y 3.');
lineas.push('-- Nombres de tiendas y promociones: DATOS DE DEMOSTRACIÓN, no oficiales.');
lineas.push('BEGIN;');
lineas.push('INSERT INTO piso (piso_id, numero_nivel, nombre_piso, svg_url, ancho_viewbox, alto_viewbox) VALUES');
lineas.push(pisos.map((p) => `  (${p[0]}, ${p[0]}, ${texto(p[1])}, ${texto(p[2])}, ${p[3]}, ${p[4]})`).join(',\n') + ';');

lineas.push('INSERT INTO nodo (nodo_id, piso_id, posicion_x, posicion_y, tipo_nodo, nombre, es_transicion, es_accesible) VALUES');
lineas.push(
  grafo.nodos
    .map((n) => {
      const transicion = n.tipo === 'ascensor' || n.tipo === 'escalera';
      return `  (${texto(n.id)}, ${n.piso}, ${n.x}, ${n.y}, ${texto(n.tipo)}, ${texto(n.nombre)}, ${transicion}, ${n.tipo !== 'escalera'})`;
    })
    .join(',\n') + ';',
);

lineas.push('INSERT INTO conexion (nodo_origen_id, nodo_destino_id, costo, tipo_conexion, es_bidireccional, es_accesible, fuente) VALUES');
lineas.push(
  grafo.conexiones
    .map((c) => {
      const fuente = c.tipo === 'pasillo' ? 'anotada_svg' : 'supuesta_demo';
      return `  (${texto(c.origen)}, ${texto(c.destino)}, ${costo(c)}, ${texto(c.tipo)}, ${c.bidireccional}, ${c.tipo !== 'escalera'}, ${texto(fuente)})`;
    })
    .join(',\n') + ';',
);

lineas.push('INSERT INTO tienda (nodo_id, nombre_tienda, numero_local, categoria, es_demo) VALUES');
lineas.push(
  tiendas.map((t) => `  (${texto(t.nodo)}, ${texto(t.nombre)}, ${texto(t.numeroLocal)}, ${texto(t.categoria)}, TRUE)`).join(',\n') + ';',
);

// Las fechas son relativas al día de la carga para que la demo siempre tenga ofertas vigentes.
lineas.push('INSERT INTO promocion (tienda_id, titulo_oferta, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, origen, registrado_por, es_demo)');
lineas.push(
  promociones
    .map(
      (p) =>
        `SELECT tienda_id, ${texto(p.titulo)}, ${texto(p.descripcion)}, ${num(p.porcentaje)}, CURRENT_DATE + (${p.diasInicio}), CURRENT_DATE + (${p.diasFin}), 'semilla', 'carga_inicial', TRUE FROM tienda WHERE numero_local = ${texto(p.numeroLocal)}`,
    )
    .join('\nUNION ALL\n') + ';',
);
lineas.push('COMMIT;');

writeFileSync(path.join(raiz, 'db', 'seed.sql'), lineas.join('\n') + '\n');
console.log(`db/seed.sql generado: ${grafo.nodos.length} nodos, ${grafo.conexiones.length} conexiones, ${tiendas.length} tiendas, ${promociones.length} promociones.`);
