// Pruebas unitarias de validación de entradas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarPromocion, validarPeticionRuta, esFechaValida } from '../../server/validacion.js';

const base = { numeroLocal: 'P1-L01', titulo: 'Oferta', fechaInicio: '2026-11-01', fechaFin: '2026-11-30' };

test('V-01 acepta una promoción válida y limpia espacios', () => {
  const r = validarPromocion({ ...base, titulo: '  Oferta  ', porcentaje: 20 });
  assert.equal(r.titulo, 'Oferta');
  assert.equal(r.porcentaje, 20);
  assert.equal(r.esActiva, true);
});

test('V-02 rechaza título vacío', () => {
  assert.throws(() => validarPromocion({ ...base, titulo: '   ' }), (e) => e.estado === 422 && e.detalles.some((d) => d.campo === 'titulo'));
});

test('V-03 rechaza fechas que no existen o con otro formato', () => {
  assert.equal(esFechaValida('2026-02-30'), false);
  assert.equal(esFechaValida('30/11/2026'), false);
  assert.equal(esFechaValida('2028-02-29'), true);
  assert.throws(() => validarPromocion({ ...base, fechaInicio: '2026-02-30' }), (e) => e.detalles.some((d) => d.campo === 'fechaInicio'));
});

test('V-04 rechaza fecha final anterior a la inicial', () => {
  assert.throws(() => validarPromocion({ ...base, fechaFin: '2026-10-01' }), (e) => e.detalles.some((d) => d.campo === 'fechaFin'));
});

test('V-05 rechaza tipos incorrectos', () => {
  assert.throws(() => validarPromocion({ ...base, porcentaje: '20' }), (e) => e.detalles.some((d) => d.campo === 'porcentaje'));
  assert.throws(() => validarPromocion({ ...base, porcentaje: 150 }), (e) => e.detalles.some((d) => d.campo === 'porcentaje'));
  assert.throws(() => validarPromocion({ ...base, tiendaId: 'no-es-uuid', numeroLocal: undefined }), (e) => e.detalles.some((d) => d.campo === 'tiendaId'));
  assert.throws(() => validarPromocion([]), (e) => e.estado === 400);
});

test('V-06 ruta sin destino da un aviso claro', () => {
  assert.throws(() => validarPeticionRuta({ origen: 'P1-E01' }), (e) => e.estado === 400 && /destino/i.test(e.message));
  assert.throws(() => validarPeticionRuta({ origen: 'P1-E01', destino: 'P1-L01', evitarEscaleras: 'si' }), (e) => e.estado === 400);
});
