import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TIPOS, tipoVisible, etiquetaNodo } from '../tipos.js';

const ZOOM_MIN = 60; // ancho mínimo visible (unidades del plano)

function ajustar(caja, margen, proporcion) {
  // Agrega margen y respeta la proporción del contenedor para que nada se deforme.
  let { x, y, w, h } = { x: caja.x - margen, y: caja.y - margen, w: caja.w + 2 * margen, h: caja.h + 2 * margen };
  if (w / h > proporcion) {
    const nh = w / proporcion;
    y -= (nh - h) / 2;
    h = nh;
  } else {
    const nw = h * proporcion;
    x -= (nw - w) / 2;
    w = nw;
  }
  return { x, y, w, h };
}

/**
 * Mapa de un piso: plano SVG original + marcadores + tramo de ruta.
 * Zoom con rueda, pellizco o botones; desplazamiento arrastrando o con flechas.
 */
export default function Mapa({ piso, nodos, sector, tramo, origen, destino, seleccionado, onSeleccionar, enfoque }) {
  const svgRef = useRef(null);
  const contRef = useRef(null);
  const [proporcion, setProporcion] = useState(1.6);
  const [anchoPx, setAnchoPx] = useState(800);
  const cajaSector = useMemo(() => {
    const [x1, y1, x2, y2] = sector;
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }, [sector]);
  const vistaInicial = useCallback(() => ajustar(cajaSector, 10, proporcion), [cajaSector, proporcion]);
  const [vista, setVista] = useState(() => ajustar(cajaSector, 10, 1.6));
  const punteros = useRef(new Map());
  const arrastre = useRef({ movido: false });

  // Mide el contenedor para mantener la proporción (útil en celular).
  useEffect(() => {
    const el = contRef.current;
    if (!el) return undefined;
    const medir = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setProporcion(r.width / r.height);
        setAnchoPx(r.width);
      }
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Al cambiar de piso, de tamaño o de ruta, encuadra el sector o el tramo de la ruta.
  useEffect(() => {
    if (enfoque) {
      // Un tramo muy corto no debe quedar demasiado ampliado: mínimo 220 x 160 unidades.
      const w = Math.max(enfoque.w, 220);
      const h = Math.max(enfoque.h, 160);
      const caja = { x: enfoque.x - (w - enfoque.w) / 2, y: enfoque.y - (h - enfoque.h) / 2, w, h };
      setVista(ajustar(caja, 25, proporcion));
    }
    else setVista(vistaInicial());
  }, [piso.id, proporcion, enfoque, vistaInicial]);

  const zoom = useCallback((factor, cx, cy) => {
    setVista((v) => {
      const w = Math.min(Math.max(v.w * factor, ZOOM_MIN), piso.ancho * 1.5);
      const h = w / (v.w / v.h);
      const px = cx ?? v.x + v.w / 2;
      const py = cy ?? v.y + v.h / 2;
      return { x: px - ((px - v.x) * w) / v.w, y: py - ((py - v.y) * h) / v.h, w, h };
    });
  }, [piso.ancho]);

  const mover = useCallback((dx, dy) => setVista((v) => ({ ...v, x: v.x + dx * v.w, y: v.y + dy * v.h })), []);

  // Convierte coordenadas de pantalla a coordenadas del plano.
  const aPlano = useCallback((clientX, clientY) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: vista.x + ((clientX - r.left) / r.width) * vista.w, y: vista.y + ((clientY - r.top) / r.height) * vista.h };
  }, [vista]);

  // La rueda necesita un listener no pasivo para evitar que la página se desplace.
  useEffect(() => {
    const svg = svgRef.current;
    const alGirar = (e) => {
      e.preventDefault();
      const p = aPlano(e.clientX, e.clientY);
      zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    };
    svg.addEventListener('wheel', alGirar, { passive: false });
    return () => svg.removeEventListener('wheel', alGirar);
  }, [aPlano, zoom]);

  const alPresionar = (e) => {
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    arrastre.current = { movido: false, inicio: { x: e.clientX, y: e.clientY } };
  };
  const alMover = (e) => {
    const previo = punteros.current.get(e.pointerId);
    if (!previo) return;
    const r = svgRef.current.getBoundingClientRect();
    if (punteros.current.size === 2) {
      // Pellizco con dos dedos.
      const [a, b] = [...punteros.current.values()];
      const antes = Math.hypot(a.x - b.x, a.y - b.y);
      punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [c, d] = [...punteros.current.values()];
      const despues = Math.hypot(c.x - d.x, c.y - d.y);
      if (antes > 0 && despues > 0) {
        const centro = aPlano((c.x + d.x) / 2, (c.y + d.y) / 2);
        zoom(antes / despues, centro.x, centro.y);
      }
      arrastre.current.movido = true;
      return;
    }
    const dx = e.clientX - previo.x;
    const dy = e.clientY - previo.y;
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ini = arrastre.current.inicio;
    if (ini && Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > 5) {
      if (!arrastre.current.movido) svgRef.current.setPointerCapture?.(e.pointerId);
      arrastre.current.movido = true;
    }
    if (arrastre.current.movido) {
      setVista((v) => ({ ...v, x: v.x - (dx / r.width) * v.w, y: v.y - (dy / r.height) * v.h }));
    }
  };
  const alSoltar = (e) => {
    punteros.current.delete(e.pointerId);
  };

  const alTeclado = (e) => {
    const acciones = {
      ArrowLeft: () => mover(-0.1, 0), ArrowRight: () => mover(0.1, 0),
      ArrowUp: () => mover(0, -0.1), ArrowDown: () => mover(0, 0.1),
      '+': () => zoom(1 / 1.25), '=': () => zoom(1 / 1.25), '-': () => zoom(1.25), 0: () => setVista(vistaInicial()),
    };
    if (e.target !== svgRef.current) return; // las teclas de un marcador las maneja el marcador
    const accion = acciones[e.key];
    if (accion) {
      e.preventDefault();
      accion();
    }
  };

  const visibles = nodos.filter((n) => tipoVisible(n));
  // Radio del marcador en unidades del plano para que mida unos 11 px en pantalla.
  const radio = Math.max(1.5, Math.min(16, (vista.w / anchoPx) * 11));
  const puntosTramo = tramo?.map((n) => `${n.x},${n.y}`).join(' ');

  const seleccionar = (n) => {
    if (arrastre.current.movido) return;
    onSeleccionar(n);
  };

  return (
    <div className="mapa">
      <div className="mapa__controles" role="toolbar" aria-label="Controles del mapa">
        <button type="button" onClick={() => zoom(1 / 1.3)} aria-label="Acercar">+</button>
        <button type="button" onClick={() => zoom(1.3)} aria-label="Alejar">−</button>
        <button type="button" onClick={() => setVista(vistaInicial())}>Restablecer</button>
        <button type="button" onClick={() => setVista(ajustar({ x: 0, y: 0, w: piso.ancho, h: piso.alto }, 0, proporcion))}>
          Plano completo
        </button>
      </div>
      <div className="mapa__lienzo" ref={contRef}>
        <svg
          ref={svgRef}
          className="mapa__svg"
          viewBox={`${vista.x} ${vista.y} ${vista.w} ${vista.h}`}
          role="application"
          aria-roledescription="mapa"
          aria-label={`Plano del ${piso.nombre}. Usa las flechas para desplazarte, + y − para acercar o alejar, 0 para restablecer. Tab recorre los puntos.`}
          tabIndex={0}
          onKeyDown={alTeclado}
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onPointerLeave={alSoltar}
          data-testid="mapa-svg"
        >
          {/* Plano original sin modificar, en sus coordenadas de viewBox. */}
          <image href={piso.svgUrl} x="0" y="0" width={piso.ancho} height={piso.alto} preserveAspectRatio="none" />
          <rect className="mapa__sector" x={cajaSector.x} y={cajaSector.y} width={cajaSector.w} height={cajaSector.h}
            strokeWidth={radio / 3} strokeDasharray={`${radio} ${radio / 1.5}`} />
          <text className="mapa__sector-texto" x={cajaSector.x + 4} y={cajaSector.y + radio * 2} fontSize={radio * 1.6}>
            Sector piloto
          </text>
          {tramo && tramo.length > 1 && (
            <g data-testid="ruta-dibujada">
              <polyline points={puntosTramo} className="mapa__ruta-borde" strokeWidth={radio * 1.6} />
              <polyline points={puntosTramo} className="mapa__ruta" strokeWidth={radio * 0.9} />
            </g>
          )}
          {visibles.map((n) => {
            const t = TIPOS[tipoVisible(n)];
            const esOrigen = n.id === origen;
            const esDestino = n.id === destino;
            const marcado = seleccionado === n.id;
            const r = esOrigen || esDestino ? radio * 1.35 : radio;
            return (
              <g
                key={n.id}
                className={`marcador${marcado ? ' marcador--activo' : ''}`}
                transform={`translate(${n.x} ${n.y})`}
                role="button"
                tabIndex={0}
                aria-label={`${etiquetaNodo(n)}${esOrigen ? ', punto de partida' : ''}${esDestino ? ', destino' : ''}`}
                data-nodo={n.id}
                onClick={() => seleccionar(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSeleccionar(n);
                  }
                }}
              >
                {(esOrigen || esDestino) && (
                  <circle r={r * 1.55} className={esOrigen ? 'marcador__halo-origen' : 'marcador__halo-destino'} />
                )}
                <circle r={r} fill={t.color} stroke="#111" strokeWidth={r / 6} />
                <text textAnchor="middle" dy={r * 0.36} fontSize={r * 1.05} fill={t.texto} fontWeight="700">
                  {t.letra}
                </text>
                <title>{etiquetaNodo(n)}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
