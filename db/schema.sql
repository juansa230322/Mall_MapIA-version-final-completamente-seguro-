-- MallMapAI - Esquema relacional (PostgreSQL 13 o superior; probado con 16)
-- Se puede ejecutar varias veces: borra y vuelve a crear las tablas del prototipo.
-- Requiere gen_random_uuid(), incluido en PostgreSQL 13+ (y en Supabase).

DROP VIEW  IF EXISTS promocion_vigente;
DROP TABLE IF EXISTS promocion;
DROP TABLE IF EXISTS tienda;
DROP TABLE IF EXISTS conexion;
DROP TABLE IF EXISTS nodo;
DROP TABLE IF EXISTS piso;

CREATE TABLE piso (
  piso_id        SMALLINT     PRIMARY KEY,
  numero_nivel   SMALLINT     NOT NULL UNIQUE,
  nombre_piso    VARCHAR(50)  NOT NULL,
  svg_url        TEXT         NOT NULL,
  ancho_viewbox  NUMERIC(8,2) NOT NULL CHECK (ancho_viewbox > 0),
  alto_viewbox   NUMERIC(8,2) NOT NULL CHECK (alto_viewbox > 0)
);

CREATE TABLE nodo (
  nodo_id        VARCHAR(20)  PRIMARY KEY,           -- código legible, ej. P1-C03
  piso_id        SMALLINT     NOT NULL REFERENCES piso(piso_id) ON DELETE CASCADE,
  posicion_x     NUMERIC(8,3) NOT NULL,              -- coordenada X del viewBox del SVG
  posicion_y     NUMERIC(8,3) NOT NULL,              -- coordenada Y del viewBox del SVG
  tipo_nodo      VARCHAR(20)  NOT NULL
                 CHECK (tipo_nodo IN ('pasillo','local','bano','entrada','ascensor','escalera')),
  nombre         VARCHAR(100) NOT NULL,
  es_transicion  BOOLEAN      NOT NULL DEFAULT FALSE, -- ascensor o escalera
  es_accesible   BOOLEAN      NOT NULL DEFAULT TRUE   -- según el grafo; no es una certificación física
);
CREATE INDEX idx_nodo_piso ON nodo(piso_id);

CREATE TABLE conexion (
  conexion_id      SERIAL       PRIMARY KEY,
  nodo_origen_id   VARCHAR(20)  NOT NULL REFERENCES nodo(nodo_id) ON DELETE CASCADE,
  nodo_destino_id  VARCHAR(20)  NOT NULL REFERENCES nodo(nodo_id) ON DELETE CASCADE,
  costo            NUMERIC(8,2) NOT NULL CHECK (costo > 0),  -- unidades del plano, NO metros
  tipo_conexion    VARCHAR(20)  NOT NULL CHECK (tipo_conexion IN ('pasillo','ascensor','escalera')),
  es_bidireccional BOOLEAN      NOT NULL DEFAULT TRUE,
  es_accesible     BOOLEAN      NOT NULL DEFAULT TRUE,
  fuente           VARCHAR(30)  NOT NULL DEFAULT 'anotada_svg'
                   CHECK (fuente IN ('anotada_svg','supuesta_demo')),
  CONSTRAINT conexion_distinta CHECK (nodo_origen_id <> nodo_destino_id),
  CONSTRAINT conexion_unica UNIQUE (nodo_origen_id, nodo_destino_id)
);

CREATE TABLE tienda (
  tienda_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nodo_id        VARCHAR(20)  NOT NULL UNIQUE REFERENCES nodo(nodo_id),
  nombre_tienda  VARCHAR(100) NOT NULL,
  numero_local   VARCHAR(20)  NOT NULL UNIQUE,
  categoria      VARCHAR(50),
  logo_url       TEXT,
  es_demo        BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE promocion (
  promocion_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id             UUID          NOT NULL REFERENCES tienda(tienda_id) ON DELETE CASCADE,
  titulo_oferta         VARCHAR(150)  NOT NULL CHECK (length(trim(titulo_oferta)) > 0),
  descripcion           TEXT,
  porcentaje_descuento  NUMERIC(5,2)  CHECK (porcentaje_descuento > 0 AND porcentaje_descuento <= 100),
  fecha_inicio          DATE          NOT NULL,
  fecha_fin             DATE          NOT NULL,
  imagen_url            TEXT,
  es_activa             BOOLEAN       NOT NULL DEFAULT TRUE,
  origen                VARCHAR(40)   NOT NULL DEFAULT 'manual',  -- manual | importador:<fuente>
  registrado_por        VARCHAR(60)   NOT NULL DEFAULT 'admin',
  es_demo               BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT promocion_fechas CHECK (fecha_fin >= fecha_inicio),
  -- Evita duplicados y permite que la importación sea idempotente (ON CONFLICT).
  CONSTRAINT promocion_unica UNIQUE (tienda_id, titulo_oferta, fecha_inicio)
);
CREATE INDEX idx_promocion_vigencia ON promocion(fecha_inicio, fecha_fin);

-- Regla de vigencia: activa y la fecha de hoy en Bogotá está entre inicio y fin (incluidos).
CREATE VIEW promocion_vigente AS
SELECT p.*
FROM promocion p
WHERE p.es_activa
  AND (now() AT TIME ZONE 'America/Bogota')::date BETWEEN p.fecha_inicio AND p.fecha_fin;
