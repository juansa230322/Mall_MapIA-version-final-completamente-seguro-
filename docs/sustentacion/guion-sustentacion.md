---
title: "Guion de sustentación — MallMapAI"
subtitle: "3 personas · máximo 5 minutos"
lang: es-CO
---

**Duración total: 4:50** (10 segundos de margen).
**Preparación:** servidor encendido (`npm.cmd start`), navegador en `http://localhost:3000` con la pestaña Mapa abierta, origen y destino vacíos, celular o vista móvil lista. Tener `docs/video/MallMapAI-demo.mp4` abierto por si falla la demo en vivo.

| Tiempo | Persona | Bloque |
|---|---|---|
| 0:00 – 1:20 | María Fernanda | Problema y valor |
| 1:20 – 3:20 | Eduardo | Demostración del mapa y las ofertas |
| 3:20 – 4:50 | Juan Pablo | Tecnologías, pruebas y piloto |

---

# María Fernanda — Problema y valor (0:00 – 1:20)

**[Pantalla: app en la pestaña Mapa, Piso 1.]**

> Buenos días. Somos María Fernanda, Eduardo y Juan Pablo, y les presentamos MallMapAI.
>
> Empezamos con una pregunta: ¿cuánto tiempo pierden buscando un local en un centro comercial grande? En nuestra encuesta de 38 personas, el 81,5 % dijo que pierde entre 5 y 30 minutos. Casi la mitad no sabe en qué piso o pasillo está la tienda. Y el 39,5 % da vueltas buscando escaleras o ascensores.

**[Pantalla: señalar los botones de piso y la leyenda.]**

> MallMapAI es una página web. No hay que instalar nada. Muestra el plano de Unicentro por piso y calcula la ruta más corta hasta un local, un baño o una entrada.
>
> Para el visitante, el valor es llegar más rápido y saber qué ascensor tomar. Para los comercios, el valor es que una oferta ya no es solo un aviso: con un botón, la oferta lleva a la persona hasta la puerta del local. Eso importa porque el 86,6 % de los encuestados desaprovecha ofertas.
>
> Eduardo les muestra cómo funciona.

# Eduardo — Demostración (1:20 – 3:20)

**[Pantalla: pestaña Mapa. Pulsar + dos veces y luego Restablecer.]**

> Este es el plano original del piso 1. Trabajamos un sector piloto: el eje central-sur, que está marcado con la línea punteada. Cada punto tiene color y letra: T es local, A es ascensor, S es escaleras. Así no dependemos solo del color.

**[Pantalla: Punto de partida = «Plazoleta norte (frente a escaleras)»; Destino = «Relojes Tiempo (demo) · local P3-L01». Pulsar Trazar ruta.]**

> Supongamos que estoy en la plazoleta norte del piso 1 y quiero ir a un local del piso 3. Trazo la ruta. Dijkstra elige el camino de menor costo, que aquí sube por las escaleras.

**[Pantalla: marcar «Evitar escaleras» y pulsar Trazar ruta. Señalar el paso 3.]**

> Ahora activo «Evitar escaleras». El sistema quita las escaleras del grafo antes de calcular. La nueva ruta dice: «Toma el ascensor en el Piso 1 y sube hasta el Piso 3». Ojo: esto es sobre el grafo. La accesibilidad física se debe confirmar en el sitio.

**[Pantalla: pulsar «Ver Piso 3».]**

> Con este botón veo el tramo del piso 3, desde el ascensor hasta el local.

**[Pantalla: pestaña Ofertas. Pulsar «Ir al local» en «Combo café y postre».]**

> Ahora las ofertas. Cada tarjeta dice la tienda, el piso y hasta cuándo es válida. Pulso «Ir al local»… y la app abre el mapa y calcula la ruta desde mi punto de partida. Si no lo hubiera elegido, me lo pediría primero.
>
> Las tiendas y ofertas que ven son de demostración. Juan Pablo explica cómo está construido.

# Juan Pablo — Tecnologías, pruebas y piloto (3:20 – 4:50)

**[Pantalla: `docs/uml/04-componentes.png`.]**

> La interfaz está hecha en React con Vite y dibuja sobre los SVG originales. El servidor es Node.js 24 con Express. Los datos están en PostgreSQL: el mapa como nodos y conexiones, y las tiendas y promociones. Dijkstra está en un módulo JavaScript aparte.
>
> Las ofertas pueden cargarse con un importador en Python. Lo probamos con dos páginas de muestra. Si lo ejecutamos dos veces, no duplica ofertas.

**[Pantalla: `docs/evidencias/registros/caida-postgresql-real.txt`.]**

> Hicimos pruebas unitarias, de integración y en navegador, también en una pantalla de celular de 390 píxeles. Una prueba que nos gustó: apagamos la base de datos con el servidor encendido. La API respondió con un error controlado en milisegundos y, al encender la base otra vez, se recuperó sola.

**[Pantalla: app en la pestaña Alcance.]**

> Somos claros con los límites: es un sector piloto, las conexiones entre pisos son supuestas y los costos no están en metros.
>
> Por eso proponemos un piloto: dos visitas a Unicentro para confirmar las conexiones y medir distancias, y luego una prueba con 10 a 15 visitantes que busquen tres locales con y sin la app. Mediremos tiempo y errores. Con esos datos decidimos si ampliar el mapa.
>
> Gracias. Quedamos atentos a sus preguntas.

---

## Plan B

Si falla la demo en vivo, Eduardo reproduce `docs/video/MallMapAI-demo.mp4` (39 s, sin narración, con subtítulos) y narra encima con el mismo texto.
