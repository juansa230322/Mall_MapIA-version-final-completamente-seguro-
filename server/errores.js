// Error con código HTTP y un código corto que la interfaz puede interpretar.
export class ErrorApi extends Error {
  constructor(estado, codigo, mensaje, detalles) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

// Traduce errores de PostgreSQL a respuestas comprensibles.
export function traducirErrorPg(err) {
  if (err instanceof ErrorApi) return err;
  switch (err.code) {
    case '23505':
      return new ErrorApi(409, 'DUPLICADO', 'Ya existe una promoción con ese título y fecha de inicio para esta tienda.');
    case '23503':
      return new ErrorApi(422, 'REFERENCIA_INVALIDA', 'La tienda indicada no existe.');
    case '23514':
      return new ErrorApi(422, 'RESTRICCION', 'Los datos no cumplen las reglas de la base (revisa fechas y porcentaje).');
    case '22P02':
    case '22007':
    case '22008':
      return new ErrorApi(400, 'FORMATO_INVALIDO', 'Algún dato tiene un formato inválido.');
    default:
      return err;
  }
}
