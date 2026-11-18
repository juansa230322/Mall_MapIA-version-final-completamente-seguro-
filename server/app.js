// Aplicación Express: API REST en /api/v1 y archivos de la interfaz compilada.
import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { ErrorApi } from './errores.js';
import { validarPromocion, validarPeticionRuta, esUuid } from './validacion.js';
import * as repo from './repositorio.js';
import { dijkstra, ErrorRuta } from '../shared/dijkstra.js';
import { construirRecorrido } from '../shared/instrucciones.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Envuelve controladores async para que sus errores lleguen al manejador central.
const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Autorización de administración con un token de servicio (ver README, sección API).
function exigirAdmin(req, _res, next) {
  const cabecera = req.get('authorization') || '';
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : '';
  if (!config.adminToken || config.adminToken.length < 16) {
    return next(new ErrorApi(503, 'ADMIN_DESACTIVADO', 'La administración está desactivada: define ADMIN_TOKEN (mínimo 16 caracteres) en .env.'));
  }
  const a = Buffer.from(token);
  const b = Buffer.from(config.adminToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return next(new ErrorApi(401, 'NO_AUTORIZADO', 'Token de administración ausente o inválido.'));
  }
  next();
}

function exigirUuid(req, _res, next) {
  if (!esUuid(req.params.id)) return next(new ErrorApi(400, 'ID_INVALIDO', 'El identificador debe ser un UUID.'));
  next();
}

export function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));

  const api = express.Router();

  api.get('/salud', asincrono(async (_req, res) => {
    try {
      await repo.verificarConexion();
      res.json({ estado: 'ok', baseDeDatos: 'disponible' });
    } catch (err) {
      res.status(503).json({ estado: 'degradado', baseDeDatos: 'no disponible', mensaje: err.message });
    }
  }));

  api.get('/mapa', asincrono(async (_req, res) => {
    res.json(await repo.obtenerMapa());
  }));

  api.get('/tiendas', asincrono(async (_req, res) => {
    res.json(await repo.listarTiendas());
  }));

  api.get('/ofertas', asincrono(async (_req, res) => {
    res.json(await repo.listarPromociones({ soloVigentes: true }));
  }));

  api.get('/ofertas/:id', exigirUuid, asincrono(async (req, res) => {
    res.json(await repo.obtenerPromocion(req.params.id));
  }));

  api.post('/rutas', asincrono(async (req, res) => {
    const { origen, destino, evitarEscaleras } = validarPeticionRuta(req.body);
    const mapa = await repo.obtenerMapa();
    const nodosPorId = new Map(mapa.nodos.map((n) => [n.id, n]));
    try {
      const resultado = dijkstra({ nodos: nodosPorId.keys(), conexiones: mapa.conexiones }, origen, destino, { evitarEscaleras });
      const recorrido = construirRecorrido(resultado.camino, resultado.aristas, nodosPorId);
      res.json({
        origen,
        destino,
        evitarEscaleras,
        costoTotal: resultado.costo,
        unidadCosto: 'unidades del plano (no son metros)',
        nodos: resultado.camino.map((id) => nodosPorId.get(id)),
        aristas: resultado.aristas,
        ...recorrido,
      });
    } catch (err) {
      if (err instanceof ErrorRuta) {
        const estado = { NODO_INEXISTENTE: 404, RUTA_NO_ENCONTRADA: 422, DATOS_INCOMPLETOS: 400 }[err.codigo] ?? 400;
        throw new ErrorApi(estado, err.codigo, err.message);
      }
      throw err;
    }
  }));

  // ---- Administración (requiere token) ----
  api.get('/admin/ofertas', exigirAdmin, asincrono(async (_req, res) => {
    res.json(await repo.listarPromociones({ soloVigentes: false }));
  }));

  api.post('/admin/ofertas', exigirAdmin, asincrono(async (req, res) => {
    const datos = validarPromocion(req.body);
    res.status(201).json(await repo.crearPromocion(datos, 'admin-token'));
  }));

  api.put('/admin/ofertas/:id', exigirAdmin, exigirUuid, asincrono(async (req, res) => {
    const datos = validarPromocion(req.body);
    res.json(await repo.actualizarPromocion(req.params.id, datos));
  }));

  api.delete('/admin/ofertas/:id', exigirAdmin, exigirUuid, asincrono(async (req, res) => {
    await repo.eliminarPromocion(req.params.id);
    res.status(204).end();
  }));

  api.post('/admin/ofertas/importar', exigirAdmin, asincrono(async (req, res) => {
    const { origen, ofertas } = req.body ?? {};
    if (typeof origen !== 'string' || !/^[a-z0-9_-]{2,30}$/i.test(origen)) {
      throw new ErrorApi(400, 'ORIGEN_INVALIDO', 'Indica el origen de la importación (2 a 30 letras, números, - o _).');
    }
    if (!Array.isArray(ofertas) || ofertas.length === 0 || ofertas.length > 500) {
      throw new ErrorApi(400, 'OFERTAS_INVALIDAS', 'Envía entre 1 y 500 ofertas en el arreglo "ofertas".');
    }
    res.json({ origen, recibidas: ofertas.length, ...(await repo.importarPromociones(origen, ofertas, validarPromocion)) });
  }));

  api.use((_req, _res, next) => next(new ErrorApi(404, 'RUTA_API_INEXISTENTE', 'Ese recurso de la API no existe.')));

  app.use('/api/v1', api);

  // Interfaz compilada por Vite (npm run build).
  const dist = path.join(raiz, 'dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    app.get('/', (_req, res) =>
      res.type('text').send('La interfaz no está compilada. Ejecuta "npm run build" y vuelve a iniciar el servidor.'));
  }

  // Manejador central de errores: siempre responde JSON con un mensaje comprensible.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo no es un JSON válido.' } });
    }
    if (err instanceof ErrorApi) {
      return res.status(err.estado).json({ error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles } });
    }
    console.error('[api] error no controlado:', err);
    res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado en el servidor.' } });
  });

  return app;
}
