// Módulo independiente con el algoritmo de Dijkstra.
// Lo usa el servidor para calcular rutas y lo prueban las pruebas unitarias.
// No depende de la base de datos ni de React.

export class ErrorRuta extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.codigo = codigo;
  }
}

// Cola de prioridad simple (montículo binario) para no recorrer
// todos los nodos en cada paso.
class ColaPrioridad {
  constructor() {
    this.datos = [];
  }
  get tamano() {
    return this.datos.length;
  }
  agregar(id, prioridad) {
    this.datos.push({ id, prioridad });
    let i = this.datos.length - 1;
    while (i > 0) {
      const padre = Math.floor((i - 1) / 2);
      if (this.datos[padre].prioridad <= this.datos[i].prioridad) break;
      [this.datos[padre], this.datos[i]] = [this.datos[i], this.datos[padre]];
      i = padre;
    }
  }
  sacar() {
    const primero = this.datos[0];
    const ultimo = this.datos.pop();
    if (this.datos.length > 0) {
      this.datos[0] = ultimo;
      let i = 0;
      for (;;) {
        const izq = 2 * i + 1;
        const der = izq + 1;
        let menor = i;
        if (izq < this.datos.length && this.datos[izq].prioridad < this.datos[menor].prioridad) menor = izq;
        if (der < this.datos.length && this.datos[der].prioridad < this.datos[menor].prioridad) menor = der;
        if (menor === i) break;
        [this.datos[menor], this.datos[i]] = [this.datos[i], this.datos[menor]];
        i = menor;
      }
    }
    return primero;
  }
}

/**
 * Construye la lista de adyacencia.
 * Una conexión bidireccional se agrega en los dos sentidos.
 * Una conexión de un solo sentido solo se agrega de origen a destino.
 * Los tipos en `excluirTipos` (por ejemplo "escalera") se quitan ANTES de calcular.
 */
export function construirAdyacencia(conexiones, { excluirTipos = [] } = {}) {
  const adyacencia = new Map();
  const agregar = (desde, hacia, costo, tipo, conexionId) => {
    if (!adyacencia.has(desde)) adyacencia.set(desde, []);
    adyacencia.get(desde).push({ hacia, costo, tipo, conexionId });
  };
  for (const c of conexiones) {
    if (excluirTipos.includes(c.tipo)) continue;
    const costo = Number(c.costo);
    if (!Number.isFinite(costo) || costo < 0) {
      throw new ErrorRuta('COSTO_INVALIDO', `La conexión ${c.origen} -> ${c.destino} tiene un costo inválido.`);
    }
    agregar(c.origen, c.destino, costo, c.tipo, c.id);
    if (c.bidireccional !== false) agregar(c.destino, c.origen, costo, c.tipo, c.id);
  }
  return adyacencia;
}

/**
 * Calcula el camino de menor costo entre dos nodos.
 * @param {{nodos: Iterable<string>, conexiones: Array}} grafo
 * @param {string} origen
 * @param {string} destino
 * @param {{evitarEscaleras?: boolean}} opciones
 * @returns {{costo: number, camino: string[], aristas: Array}}
 */
export function dijkstra(grafo, origen, destino, opciones = {}) {
  const nodos = new Set(grafo.nodos);
  if (!origen || !destino) {
    throw new ErrorRuta('DATOS_INCOMPLETOS', 'Debes indicar el origen y el destino.');
  }
  if (!nodos.has(origen)) throw new ErrorRuta('NODO_INEXISTENTE', `El origen "${origen}" no existe en el mapa.`);
  if (!nodos.has(destino)) throw new ErrorRuta('NODO_INEXISTENTE', `El destino "${destino}" no existe en el mapa.`);

  if (origen === destino) return { costo: 0, camino: [origen], aristas: [] };

  const excluirTipos = opciones.evitarEscaleras ? ['escalera'] : [];
  const adyacencia = construirAdyacencia(grafo.conexiones, { excluirTipos });

  const distancia = new Map([[origen, 0]]);
  const anterior = new Map();
  const visitados = new Set();
  const cola = new ColaPrioridad();
  cola.agregar(origen, 0);

  while (cola.tamano > 0) {
    const { id: actual, prioridad } = cola.sacar();
    if (visitados.has(actual)) continue;
    visitados.add(actual);
    if (actual === destino) break;
    for (const vecino of adyacencia.get(actual) ?? []) {
      const nueva = prioridad + vecino.costo;
      if (nueva < (distancia.get(vecino.hacia) ?? Infinity)) {
        distancia.set(vecino.hacia, nueva);
        anterior.set(vecino.hacia, { desde: actual, arista: vecino });
        cola.agregar(vecino.hacia, nueva);
      }
    }
  }

  if (!distancia.has(destino)) {
    const motivo = opciones.evitarEscaleras
      ? 'No hay una ruta sin escaleras entre esos puntos.'
      : 'No hay una ruta conectada entre esos puntos.';
    throw new ErrorRuta('RUTA_NO_ENCONTRADA', motivo);
  }

  const camino = [destino];
  const aristas = [];
  let paso = destino;
  while (paso !== origen) {
    const { desde, arista } = anterior.get(paso);
    aristas.unshift({ desde, hacia: paso, tipo: arista.tipo, costo: arista.costo });
    camino.unshift(desde);
    paso = desde;
  }
  return { costo: Math.round(distancia.get(destino) * 100) / 100, camino, aristas };
}
