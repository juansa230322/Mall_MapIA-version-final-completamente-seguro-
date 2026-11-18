// Convierte el camino de Dijkstra en indicaciones de texto y en tramos por piso.

const TIPOS_VERTICALES = ['ascensor', 'escalera'];

/**
 * @param {string[]} camino ids de nodos en orden
 * @param {Array} aristas aristas devueltas por dijkstra
 * @param {Map<string, {id, piso, nombre, tipo}>} nodosPorId
 */
export function construirRecorrido(camino, aristas, nodosPorId) {
  const nodo = (id) => nodosPorId.get(id);
  const origen = nodo(camino[0]);
  const destino = nodo(camino[camino.length - 1]);

  // Tramos: partes del camino que quedan en el mismo piso (para dibujarlas).
  const tramos = [];
  for (const id of camino) {
    const n = nodo(id);
    const ultimo = tramos[tramos.length - 1];
    if (!ultimo || ultimo.piso !== n.piso) tramos.push({ piso: n.piso, nodos: [id] });
    else ultimo.nodos.push(id);
  }

  if (camino.length === 1) {
    return {
      tramos,
      pisos: [origen.piso],
      instrucciones: [`Ya estás en ${origen.nombre} (Piso ${origen.piso}). No necesitas desplazarte.`],
    };
  }

  const instrucciones = [`Sal desde ${origen.nombre} (Piso ${origen.piso}).`];
  let i = 0;
  while (i < aristas.length) {
    const arista = aristas[i];
    if (TIPOS_VERTICALES.includes(arista.tipo) && nodo(arista.desde).piso !== nodo(arista.hacia).piso) {
      // Junta cambios de piso seguidos del mismo tipo (ej. ascensor 1 -> 2 -> 3).
      const pisoInicial = nodo(arista.desde).piso;
      let j = i;
      while (
        j + 1 < aristas.length &&
        aristas[j + 1].tipo === arista.tipo &&
        nodo(aristas[j + 1].desde).piso !== nodo(aristas[j + 1].hacia).piso
      ) j++;
      const pisoFinal = nodo(aristas[j].hacia).piso;
      const verbo = pisoFinal > pisoInicial ? 'Sube' : 'Baja';
      if (arista.tipo === 'ascensor') {
        instrucciones.push(`Toma el ascensor en el Piso ${pisoInicial} y ${verbo.toLowerCase()} hasta el Piso ${pisoFinal}.`);
      } else {
        instrucciones.push(`${verbo} por las escaleras del Piso ${pisoInicial} al Piso ${pisoFinal}.`);
      }
      i = j + 1;
      continue;
    }
    // Tramo a pie: avanza hasta el próximo cambio de piso o hasta el final.
    let j = i;
    while (j + 1 < aristas.length && !TIPOS_VERTICALES.includes(aristas[j + 1].tipo)) j++;
    // Si el siguiente paso es vertical, la referencia es el punto donde empieza.
    const siguiente = aristas[j + 1];
    const llegada = nodo(aristas[j].hacia);
    const puntos = j - i + 1;
    if (siguiente && TIPOS_VERTICALES.includes(siguiente.tipo)) {
      const conector = nodo(siguiente.desde);
      instrucciones.push(`Camina por el pasillo del Piso ${conector.piso} hasta ${conector.nombre} (${puntos} tramo${puntos > 1 ? 's' : ''}).`);
    } else if (llegada.id !== destino.id || puntos > 1) {
      instrucciones.push(`Camina por el pasillo del Piso ${llegada.piso} hasta ${destino.nombre} (${puntos} tramo${puntos > 1 ? 's' : ''}).`);
    }
    i = j + 1;
  }
  instrucciones.push(`Llegaste a ${destino.nombre} (Piso ${destino.piso}).`);

  // Un piso por el que solo se pasa dentro del ascensor (sin caminar) no se muestra como tramo.
  const tramosVisibles = tramos.filter((t, i) => i === 0 || i === tramos.length - 1 || t.nodos.length > 1);
  const pisos = [...new Set(tramosVisibles.map((t) => t.piso))];
  return { tramos: tramosVisibles, pisos, instrucciones };
}
