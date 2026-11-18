// Acceso a datos. Todas las consultas SQL del servidor están aquí y son parametrizadas.
import { consultar, transaccion } from './db.js';
import { ErrorApi, traducirErrorPg } from './errores.js';

const COLUMNAS_PROMO = `
  p.promocion_id AS id, p.tienda_id AS "tiendaId", t.numero_local AS "numeroLocal",
  t.nombre_tienda AS "nombreTienda", t.nodo_id AS "nodoId", n.piso_id AS piso,
  p.titulo_oferta AS titulo, p.descripcion, p.porcentaje_descuento AS porcentaje,
  p.fecha_inicio AS "fechaInicio", p.fecha_fin AS "fechaFin", p.imagen_url AS "imagenUrl",
  p.es_activa AS "esActiva", p.origen, p.es_demo AS "esDemo",
  (p.es_activa AND (now() AT TIME ZONE 'America/Bogota')::date BETWEEN p.fecha_inicio AND p.fecha_fin) AS vigente`;

export async function verificarConexion() {
  await consultar('SELECT 1');
}

export async function obtenerMapa() {
  const [pisos, nodos, conexiones] = await Promise.all([
    consultar(`SELECT piso_id AS id, numero_nivel AS nivel, nombre_piso AS nombre, svg_url AS "svgUrl",
                      ancho_viewbox AS ancho, alto_viewbox AS alto
               FROM piso ORDER BY numero_nivel`),
    consultar(`SELECT n.nodo_id AS id, n.piso_id AS piso, n.posicion_x AS x, n.posicion_y AS y,
                      n.tipo_nodo AS tipo, COALESCE(t.nombre_tienda, n.nombre) AS nombre,
                      n.es_accesible AS "esAccesible", t.tienda_id AS "tiendaId", t.categoria
               FROM nodo n LEFT JOIN tienda t ON t.nodo_id = n.nodo_id
               ORDER BY n.piso_id, n.nodo_id`),
    consultar(`SELECT conexion_id AS id, nodo_origen_id AS origen, nodo_destino_id AS destino, costo,
                      tipo_conexion AS tipo, es_bidireccional AS bidireccional, es_accesible AS "esAccesible", fuente
               FROM conexion ORDER BY conexion_id`),
  ]);
  return { pisos: pisos.rows, nodos: nodos.rows, conexiones: conexiones.rows };
}

export async function listarTiendas() {
  const r = await consultar(`
    SELECT t.tienda_id AS id, t.nombre_tienda AS nombre, t.numero_local AS "numeroLocal", t.categoria,
           t.nodo_id AS "nodoId", n.piso_id AS piso, t.es_demo AS "esDemo"
    FROM tienda t JOIN nodo n ON n.nodo_id = t.nodo_id
    ORDER BY n.piso_id, t.numero_local`);
  return r.rows;
}

export async function listarPromociones({ soloVigentes = true } = {}) {
  const r = await consultar(`
    SELECT ${COLUMNAS_PROMO}
    FROM promocion p JOIN tienda t ON t.tienda_id = p.tienda_id JOIN nodo n ON n.nodo_id = t.nodo_id
    ${soloVigentes ? `WHERE p.es_activa AND (now() AT TIME ZONE 'America/Bogota')::date BETWEEN p.fecha_inicio AND p.fecha_fin` : ''}
    ORDER BY p.fecha_fin, t.numero_local`);
  return r.rows;
}

export async function obtenerPromocion(id) {
  const r = await consultar(
    `SELECT ${COLUMNAS_PROMO}
     FROM promocion p JOIN tienda t ON t.tienda_id = p.tienda_id JOIN nodo n ON n.nodo_id = t.nodo_id
     WHERE p.promocion_id = $1`,
    [id],
  );
  if (r.rowCount === 0) throw new ErrorApi(404, 'NO_ENCONTRADA', 'La promoción no existe.');
  return r.rows[0];
}

// Busca la tienda por UUID o por número de local. Devuelve el UUID.
async function resolverTienda(ejecutor, { tiendaId, numeroLocal }) {
  const r = tiendaId
    ? await ejecutor.query('SELECT tienda_id FROM tienda WHERE tienda_id = $1', [tiendaId])
    : await ejecutor.query('SELECT tienda_id FROM tienda WHERE numero_local = $1', [numeroLocal]);
  if (r.rowCount === 0) {
    throw new ErrorApi(404, 'TIENDA_NO_ENCONTRADA', `La tienda ${tiendaId ?? numeroLocal} no existe.`);
  }
  return r.rows[0].tienda_id;
}

export async function crearPromocion(datos, registradoPor) {
  try {
    const id = await transaccion(async (cliente) => {
      const tiendaId = await resolverTienda(cliente, datos);
      const r = await cliente.query(
        `INSERT INTO promocion (tienda_id, titulo_oferta, descripcion, porcentaje_descuento,
                                fecha_inicio, fecha_fin, imagen_url, es_activa, origen, registrado_por, es_demo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'manual', $9, TRUE)
         RETURNING promocion_id`,
        [tiendaId, datos.titulo, datos.descripcion, datos.porcentaje, datos.fechaInicio, datos.fechaFin,
          datos.imagenUrl, datos.esActiva, registradoPor],
      );
      return r.rows[0].promocion_id;
    });
    return obtenerPromocion(id);
  } catch (err) {
    throw traducirErrorPg(err);
  }
}

export async function actualizarPromocion(id, datos) {
  try {
    await transaccion(async (cliente) => {
      const tiendaId = await resolverTienda(cliente, datos);
      const r = await cliente.query(
        `UPDATE promocion SET tienda_id = $2, titulo_oferta = $3, descripcion = $4, porcentaje_descuento = $5,
                fecha_inicio = $6, fecha_fin = $7, imagen_url = $8, es_activa = $9, updated_at = now()
         WHERE promocion_id = $1`,
        [id, tiendaId, datos.titulo, datos.descripcion, datos.porcentaje, datos.fechaInicio, datos.fechaFin,
          datos.imagenUrl, datos.esActiva],
      );
      if (r.rowCount === 0) throw new ErrorApi(404, 'NO_ENCONTRADA', 'La promoción no existe.');
    });
    return obtenerPromocion(id);
  } catch (err) {
    throw traducirErrorPg(err);
  }
}

export async function eliminarPromocion(id) {
  const r = await consultar('DELETE FROM promocion WHERE promocion_id = $1', [id]);
  if (r.rowCount === 0) throw new ErrorApi(404, 'NO_ENCONTRADA', 'La promoción no existe.');
}

/**
 * Importación idempotente: si ya existe (tienda, título, fecha de inicio) se actualiza; si no, se inserta.
 * Repetir la misma carga no duplica ofertas. Cada oferta se procesa sola para que una mala no frene las demás.
 */
export async function importarPromociones(origen, ofertas, validar) {
  const resultado = { insertadas: 0, actualizadas: 0, rechazadas: [] };
  await transaccion(async (cliente) => {
    for (const [indice, oferta] of ofertas.entries()) {
      let datos;
      try {
        datos = validar(oferta);
        await cliente.query('SAVEPOINT oferta');
        const tiendaId = await resolverTienda(cliente, datos);
        const r = await cliente.query(
          `INSERT INTO promocion (tienda_id, titulo_oferta, descripcion, porcentaje_descuento,
                                  fecha_inicio, fecha_fin, imagen_url, es_activa, origen, registrado_por, es_demo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $8, TRUE)
           ON CONFLICT (tienda_id, titulo_oferta, fecha_inicio) DO UPDATE SET
             descripcion = EXCLUDED.descripcion,
             porcentaje_descuento = EXCLUDED.porcentaje_descuento,
             fecha_fin = EXCLUDED.fecha_fin,
             imagen_url = EXCLUDED.imagen_url,
             origen = EXCLUDED.origen,
             updated_at = now()
           RETURNING (xmax = 0) AS insertada`,
          [tiendaId, datos.titulo, datos.descripcion, datos.porcentaje, datos.fechaInicio, datos.fechaFin,
            datos.imagenUrl, `importador:${origen}`],
        );
        await cliente.query('RELEASE SAVEPOINT oferta');
        if (r.rows[0].insertada) resultado.insertadas++;
        else resultado.actualizadas++;
      } catch (err) {
        if (datos) await cliente.query('ROLLBACK TO SAVEPOINT oferta').catch(() => {});
        const e = traducirErrorPg(err);
        if (!(e instanceof ErrorApi) || e.estado === 503) throw e;
        resultado.rechazadas.push({ indice, titulo: oferta?.titulo ?? null, motivo: e.message, detalles: e.detalles });
      }
    }
  });
  return resultado;
}
