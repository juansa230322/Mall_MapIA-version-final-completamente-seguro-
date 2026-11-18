// Categorías del mapa: color del plano original + letra + texto (no depender solo del color).
export const TIPOS = {
  local: { etiqueta: 'Entrada de local', letra: 'T', color: '#e10600', texto: '#fff' },
  bano: { etiqueta: 'Baños', letra: 'B', color: '#8a00f0', texto: '#fff' },
  entrada: { etiqueta: 'Entrada al centro comercial', letra: 'E', color: '#0a5efa', texto: '#fff' },
  ascensor: { etiqueta: 'Ascensor', letra: 'A', color: '#02b52a', texto: '#fff' },
  escalera: { etiqueta: 'Escaleras (fija o eléctrica)', letra: 'S', color: '#f2e600', texto: '#222' },
  referencia: { etiqueta: 'Punto de referencia en pasillo', letra: 'R', color: '#1b1b1b', texto: '#fff' },
};

// Un nodo de pasillo con nombre propio se usa como punto de referencia elegible.
export function tipoVisible(nodo) {
  if (nodo.tipo !== 'pasillo') return nodo.tipo;
  return nodo.nombre.startsWith('Pasillo ') ? null : 'referencia';
}

export function etiquetaNodo(nodo) {
  const tipo = tipoVisible(nodo);
  if (nodo.tipo === 'local') return `${nodo.nombre} · local ${nodo.id}`;
  return `${nodo.nombre}${tipo === 'referencia' ? '' : ` (${TIPOS[tipo]?.etiqueta.toLowerCase() ?? nodo.tipo})`}`;
}
