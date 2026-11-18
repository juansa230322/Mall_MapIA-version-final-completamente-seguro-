import { forwardRef } from 'react';
import { TIPOS, etiquetaNodo } from '../tipos.js';

export function Leyenda() {
  return (
    <section className="leyenda" aria-labelledby="titulo-leyenda">
      <h3 id="titulo-leyenda">Leyenda</h3>
      <ul>
        {Object.entries(TIPOS).map(([clave, t]) => (
          <li key={clave}>
            <span className="leyenda__icono" style={{ background: t.color, color: t.texto }} aria-hidden="true">{t.letra}</span>
            {t.etiqueta}
          </li>
        ))}
        <li>
          <span className="leyenda__ruta" aria-hidden="true" />
          Ruta calculada (tramo del piso que estás viendo)
        </li>
      </ul>
    </section>
  );
}

// Lista de opciones agrupada por piso para los selectores de origen y destino.
function Opciones({ puntos }) {
  return [1, 2, 3].map((piso) => (
    <optgroup key={piso} label={`Piso ${piso}`}>
      {puntos.filter((n) => n.piso === piso).map((n) => (
        <option key={n.id} value={n.id}>{etiquetaNodo(n)}</option>
      ))}
    </optgroup>
  ));
}

export const Planificador = forwardRef(function Planificador(
  { puntos, origen, destino, evitarEscaleras, calculando, onCambiarOrigen, onCambiarDestino, onCambiarEvitar, onTrazar, onIntercambiar },
  origenRef,
) {
  return (
    <section className="tarjeta planificador" aria-labelledby="titulo-planificador">
      <h2 id="titulo-planificador">Planifica tu ruta</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onTrazar();
        }}
        noValidate
      >
        <label htmlFor="sel-origen">Punto de partida</label>
        <select id="sel-origen" ref={origenRef} value={origen} onChange={(e) => onCambiarOrigen(e.target.value)}>
          <option value="">— Elige dónde estás —</option>
          <Opciones puntos={puntos} />
        </select>

        <button type="button" className="boton-texto" onClick={onIntercambiar} disabled={!origen && !destino}>
          ⇅ Intercambiar
        </button>

        <label htmlFor="sel-destino">Destino</label>
        <select id="sel-destino" value={destino} onChange={(e) => onCambiarDestino(e.target.value)}>
          <option value="">— Elige a dónde vas —</option>
          <Opciones puntos={puntos} />
        </select>

        <label className="casilla" htmlFor="chk-escaleras">
          <input id="chk-escaleras" type="checkbox" checked={evitarEscaleras} onChange={(e) => onCambiarEvitar(e.target.checked)} />
          <span>
            Evitar escaleras
            <small>Usa solo ascensores para cambiar de piso.</small>
          </span>
        </label>

        <button type="submit" className="boton-principal" disabled={calculando}>
          {calculando ? 'Calculando…' : 'Trazar ruta'}
        </button>
      </form>
      <p className="pista">También puedes tocar un punto del mapa y elegir «Salir de aquí» o «Ir aquí».</p>
    </section>
  );
});

export function Seleccion({ nodo, ofertas, onOrigen, onDestino, onCerrar }) {
  if (!nodo) return null;
  const propias = ofertas.filter((o) => o.nodoId === nodo.id);
  return (
    <section className="seleccion" aria-live="polite" aria-label="Punto seleccionado">
      <div>
        <strong>{nodo.nombre}</strong>
        <span className="seleccion__meta">
          {nodo.tipo === 'local' ? `Local ${nodo.id} · ${nodo.categoria ?? ''} · ` : ''}Piso {nodo.piso}
        </span>
        {propias.length > 0 && (
          <span className="seleccion__ofertas">{propias.length} oferta{propias.length > 1 ? 's' : ''}: {propias.map((o) => o.titulo).join(', ')}</span>
        )}
      </div>
      <div className="seleccion__acciones">
        <button type="button" onClick={() => onOrigen(nodo.id)}>Salir de aquí</button>
        <button type="button" className="boton-principal" onClick={() => onDestino(nodo.id)}>Ir aquí</button>
        <button type="button" className="boton-texto" onClick={onCerrar} aria-label="Cerrar selección">✕</button>
      </div>
    </section>
  );
}

export function Recorrido({ ruta, pisoActivo, onVerPiso }) {
  if (!ruta) return null;
  const varios = ruta.pisos.length > 1;
  return (
    <section className="tarjeta recorrido" aria-labelledby="titulo-recorrido" data-testid="recorrido">
      <h2 id="titulo-recorrido">Tu recorrido</h2>
      <p className="recorrido__resumen">
        {varios ? `De Piso ${ruta.pisos[0]} a Piso ${ruta.pisos.at(-1)}` : `En el Piso ${ruta.pisos[0]}`}
        {' · '}costo {Math.round(ruta.costoTotal)} <abbr title="unidades del plano SVG; no son metros">u.</abbr>
      </p>
      {varios && (
        <div className="recorrido__pisos" role="group" aria-label="Pisos de este recorrido">
          {ruta.pisos.map((p) => (
            <button key={p} type="button" aria-pressed={p === pisoActivo} onClick={() => onVerPiso(p)}>
              Ver Piso {p}
            </button>
          ))}
        </div>
      )}
      <ol className="recorrido__pasos">
        {ruta.instrucciones.map((texto, i) => <li key={i}>{texto}</li>)}
      </ol>
      {ruta.evitarEscaleras && (
        <p className="nota">
          Filtro «Evitar escaleras» activo: la ruta se calculó sin los enlaces marcados como escalera en el grafo.
          La accesibilidad física del recorrido se debe verificar en el centro comercial.
        </p>
      )}
    </section>
  );
}

function fechaLarga(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Ofertas({ ofertas, onIrAlLocal }) {
  if (ofertas.length === 0) {
    return <p className="vacio">No hay ofertas vigentes en este momento. Vuelve más tarde.</p>;
  }
  return (
    <ul className="ofertas" aria-label="Ofertas vigentes">
      {ofertas.map((o) => (
        <li key={o.id} className="oferta" data-testid="oferta">
          <div className="oferta__cabecera">
            <span className="oferta__tienda">{o.nombreTienda}</span>
            {o.porcentaje && <span className="oferta__descuento">-{Number(o.porcentaje)}%</span>}
          </div>
          <h3>{o.titulo}</h3>
          {o.descripcion && <p>{o.descripcion}</p>}
          <p className="oferta__meta">
            Local {o.numeroLocal} · Piso {o.piso} · válida hasta el {fechaLarga(o.fechaFin)}
          </p>
          <p className="oferta__etiqueta">{o.origen.startsWith('importador') ? 'Importada de fuente de muestra' : 'Dato de demostración'}</p>
          <button type="button" className="boton-principal" onClick={() => onIrAlLocal(o)}>
            Ir al local
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Alcance() {
  return (
    <section className="tarjeta alcance">
      <h2>Alcance de este prototipo</h2>
      <ul>
        <li><strong>Sector piloto:</strong> eje central-sur de los pisos 1, 2 y 3 (marcado en el mapa con línea punteada). El resto del plano se ve, pero no tiene rutas.</li>
        <li><strong>Planos:</strong> se usan los tres SVG originales sin cambios. Los puntos y conexiones se anotaron a mano sobre sus marcas de color.</li>
        <li><strong>Cambios de piso:</strong> la correspondencia de ascensores y escaleras entre pisos es un supuesto de demostración. Falta confirmarla en sitio.</li>
        <li><strong>Escaleras:</strong> el plano no distingue escaleras fijas de eléctricas; se usa un tipo genérico «escalera».</li>
        <li><strong>Costos:</strong> están en unidades del plano, no en metros. El ascensor suma un costo fijo que representa la espera.</li>
        <li><strong>Tiendas y ofertas:</strong> nombres y promociones son de demostración. No son datos oficiales ni promociones vigentes reales.</li>
        <li><strong>Ubicación:</strong> no hay posicionamiento automático. Tú eliges el punto de partida.</li>
        <li><strong>Pendiente:</strong> cuentas de usuario, favoritos, notificaciones y extracción automática con IA.</li>
      </ul>
    </section>
  );
}

export function Estado({ tipo = 'info', children, onReintentar }) {
  return (
    <div className={`estado estado--${tipo}`} role={tipo === 'error' || tipo === 'aviso' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onReintentar && (
        <button type="button" onClick={onReintentar}>Reintentar</button>
      )}
    </div>
  );
}
