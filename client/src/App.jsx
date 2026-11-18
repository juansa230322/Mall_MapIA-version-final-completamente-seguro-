import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Mapa from './components/Mapa.jsx';
import { Alcance, Estado, Leyenda, Ofertas, Planificador, Recorrido, Seleccion } from './components/Paneles.jsx';
import { calcularRuta, obtenerMapa, obtenerOfertas } from './api.js';
import { tipoVisible } from './tipos.js';

// Recuadro del sector piloto en cada piso (coordenadas del viewBox de cada SVG).
const SECTOR = { 1: [530, 360, 910, 615], 2: [470, 385, 880, 600], 3: [430, 440, 850, 605] };

const guardado = {
  leer(clave) {
    try { return window.localStorage.getItem(clave) ?? ''; } catch { return ''; }
  },
  escribir(clave, valor) {
    try { window.localStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ }
  },
};

export default function App() {
  const [vista, setVista] = useState('mapa');
  const [mapa, setMapa] = useState(null);
  const [ofertas, setOfertas] = useState([]);
  const [carga, setCarga] = useState({ estado: 'cargando', mensaje: '' });
  const [errorOfertas, setErrorOfertas] = useState('');
  const [pisoActivo, setPisoActivo] = useState(1);
  const [origen, setOrigen] = useState(() => guardado.leer('mallmapai.origen'));
  const [destino, setDestino] = useState('');
  const [evitarEscaleras, setEvitarEscaleras] = useState(false);
  const [ruta, setRuta] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo, texto, reintentar? }
  const [seleccionado, setSeleccionado] = useState(null);
  const [pendienteOferta, setPendienteOferta] = useState(false);
  const origenRef = useRef(null);
  const zonaMapaRef = useRef(null);

  const cargar = useCallback(async () => {
    setCarga({ estado: 'cargando', mensaje: '' });
    try {
      const datosMapa = await obtenerMapa();
      setMapa(datosMapa);
      setCarga({ estado: 'listo', mensaje: '' });
    } catch (err) {
      setCarga({ estado: 'error', mensaje: err.message });
      return;
    }
    try {
      setOfertas(await obtenerOfertas());
      setErrorOfertas('');
    } catch (err) {
      setErrorOfertas(err.message);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const nodosPorId = useMemo(() => new Map((mapa?.nodos ?? []).map((n) => [n.id, n])), [mapa]);
  const puntos = useMemo(() => (mapa?.nodos ?? []).filter((n) => tipoVisible(n)), [mapa]);

  // Si el origen guardado ya no existe en el mapa, se descarta.
  useEffect(() => {
    if (mapa && origen && !nodosPorId.has(origen)) setOrigen('');
  }, [mapa, origen, nodosPorId]);

  useEffect(() => { guardado.escribir('mallmapai.origen', origen); }, [origen]);

  const trazar = useCallback(async (o = origen, d = destino, evitar = evitarEscaleras) => {
    if (!o && !d) return setAviso({ tipo: 'aviso', texto: 'Elige tu punto de partida y tu destino.' });
    if (!o) {
      origenRef.current?.focus();
      return setAviso({ tipo: 'aviso', texto: 'Falta el punto de partida. Elige dónde estás.' });
    }
    if (!d) return setAviso({ tipo: 'aviso', texto: 'Falta el destino. Elígelo en la lista o tocando un punto del mapa.' });
    setCalculando(true);
    setAviso(null);
    try {
      const r = await calcularRuta(o, d, evitar);
      setRuta(r);
      setPisoActivo(r.pisos[0]);
      if (r.costoTotal === 0) setAviso({ tipo: 'info', texto: 'El punto de partida y el destino son el mismo lugar.' });
      // En celular, lleva la vista al mapa después de calcular.
      zonaMapaRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setRuta(null);
      setAviso({
        tipo: 'error',
        texto: err.message,
        reintentar: err.estado === 0 || err.estado === 503 ? () => trazar(o, d, evitar) : undefined,
      });
    } finally {
      setCalculando(false);
    }
  }, [origen, destino, evitarEscaleras]);

  const cambiarOrigen = (id) => {
    setOrigen(id);
    setRuta(null);
    if (id && pendienteOferta && destino) {
      setPendienteOferta(false);
      trazar(id, destino);
    }
  };
  const cambiarDestino = (id) => {
    setDestino(id);
    setRuta(null);
    setPendienteOferta(false);
    if (id) setPisoActivo(nodosPorId.get(id)?.piso ?? pisoActivo);
  };

  // Flujo «Oferta → Ir al local → Ruta».
  const irAlLocal = (oferta) => {
    setVista('mapa');
    setDestino(oferta.nodoId);
    setRuta(null);
    setSeleccionado(null);
    if (origen) {
      setPendienteOferta(false);
      trazar(origen, oferta.nodoId);
    } else {
      setPendienteOferta(true);
      setPisoActivo(oferta.piso);
      setAviso({ tipo: 'aviso', texto: `Para llegar a ${oferta.nombreTienda}, primero elige tu punto de partida.` });
      setTimeout(() => origenRef.current?.focus(), 50);
    }
  };

  const tramoActivo = ruta?.tramos.find((t) => t.piso === pisoActivo);
  const puntosTramo = tramoActivo?.nodos.map((id) => nodosPorId.get(id));
  const enfoque = useMemo(() => {
    if (!puntosTramo || puntosTramo.length < 2) return null;
    const xs = puntosTramo.map((n) => n.x);
    const ys = puntosTramo.map((n) => n.y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) || 1, h: Math.max(...ys) - Math.min(...ys) || 1 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta, pisoActivo]);

  const piso = mapa?.pisos.find((p) => p.id === pisoActivo);

  return (
    <div className="app">
      <a className="saltar" href="#contenido">Saltar al contenido</a>
      <header className="cabecera">
        <div>
          <h1>MallMapAI</h1>
          <p>Unicentro Bogotá · mapa interior y rutas</p>
        </div>
        <nav aria-label="Secciones">
          {[['mapa', 'Mapa'], ['ofertas', `Ofertas${ofertas.length ? ` (${ofertas.length})` : ''}`], ['alcance', 'Alcance']].map(([id, texto]) => (
            <button key={id} type="button" aria-current={vista === id ? 'page' : undefined} onClick={() => setVista(id)}>
              {texto}
            </button>
          ))}
        </nav>
      </header>
      <p className="banda">
        Prototipo académico · sector piloto (eje central-sur, pisos 1 a 3) · tiendas y ofertas de demostración
      </p>

      <main id="contenido">
        {carga.estado === 'cargando' && <Estado>Cargando el mapa…</Estado>}
        {carga.estado === 'error' && (
          <Estado tipo="error" onReintentar={cargar}>No se pudo cargar el mapa. {carga.mensaje}</Estado>
        )}

        {carga.estado === 'listo' && mapa && vista === 'mapa' && (
          <div className="distribucion">
            <aside className="lateral">
              <Planificador
                ref={origenRef}
                puntos={puntos}
                origen={origen}
                destino={destino}
                evitarEscaleras={evitarEscaleras}
                calculando={calculando}
                onCambiarOrigen={cambiarOrigen}
                onCambiarDestino={cambiarDestino}
                onCambiarEvitar={(v) => { setEvitarEscaleras(v); setRuta(null); }}
                onTrazar={() => trazar()}
                onIntercambiar={() => { setOrigen(destino); setDestino(origen); setRuta(null); }}
              />
              {aviso && (
                <Estado tipo={aviso.tipo} onReintentar={aviso.reintentar}>{aviso.texto}</Estado>
              )}
              <Recorrido ruta={ruta} pisoActivo={pisoActivo} onVerPiso={setPisoActivo} />
            </aside>

            <section className="zona-mapa" ref={zonaMapaRef} aria-labelledby="titulo-mapa">
              <div className="zona-mapa__cabecera">
                <h2 id="titulo-mapa">{piso?.nombre}</h2>
                <div className="selector-piso" role="group" aria-label="Elegir piso">
                  {mapa.pisos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={p.id === pisoActivo}
                      onClick={() => setPisoActivo(p.id)}
                      className={ruta?.pisos.includes(p.id) ? 'en-ruta' : ''}
                    >
                      Piso {p.nivel}
                      {ruta?.pisos.includes(p.id) && <span className="sr-only"> (parte de la ruta)</span>}
                    </button>
                  ))}
                </div>
              </div>
              {piso && (
                <Mapa
                  piso={piso}
                  nodos={mapa.nodos.filter((n) => n.piso === pisoActivo)}
                  sector={SECTOR[pisoActivo]}
                  tramo={puntosTramo}
                  origen={origen}
                  destino={destino}
                  seleccionado={seleccionado?.id}
                  onSeleccionar={setSeleccionado}
                  enfoque={enfoque}
                />
              )}
              <Seleccion
                nodo={seleccionado}
                ofertas={ofertas}
                onOrigen={(id) => { cambiarOrigen(id); setSeleccionado(null); }}
                onDestino={(id) => { cambiarDestino(id); setSeleccionado(null); if (origen) trazar(origen, id); }}
                onCerrar={() => setSeleccionado(null)}
              />
              <Leyenda />
            </section>
          </div>
        )}

        {carga.estado === 'listo' && vista === 'ofertas' && (
          <section aria-labelledby="titulo-ofertas" className="seccion-ofertas">
            <h2 id="titulo-ofertas">Ofertas vigentes</h2>
            {errorOfertas
              ? <Estado tipo="error" onReintentar={cargar}>No se pudieron cargar las ofertas. {errorOfertas}</Estado>
              : <Ofertas ofertas={ofertas} onIrAlLocal={irAlLocal} />}
          </section>
        )}

        {vista === 'alcance' && <Alcance />}
      </main>
      <footer className="pie">
        MallMapAI · Taller de Programación · Universidad Manuela Beltrán · 2026. La accesibilidad física se verifica en sitio.
      </footer>
    </div>
  );
}
