# MallMapAI

Mapa interior 2D y cálculo de rutas para Unicentro Bogotá. Prototipo académico del curso Taller de Programación (Universidad Manuela Beltrán).

- **Sector piloto:** eje central-sur de los pisos 1, 2 y 3. Ahí están el ascensor y las escaleras que aparecen en los tres planos.
- **Datos:** los nombres de tiendas y las promociones son **de demostración**. No son oficiales.
- **Tecnologías:** React + Vite, SVG, Node.js 24 + Express, PostgreSQL, Python, Playwright.

Esta guía usa **Windows PowerShell**. Cada paso dice qué debes ver si todo salió bien.

---

## 1. Preparar la carpeta

1. Haz clic derecho sobre `MallMapAI-entrega-completa.zip` → **Extraer todo…** → **Extraer**.
2. Entra a la carpeta extraída y luego a `mallmapai`. Es la carpeta que tiene el archivo `package.json`.
3. Haz clic en la barra de direcciones del Explorador, escribe `powershell` y pulsa Enter. Se abre PowerShell en esa carpeta.

Comprueba que estás en el lugar correcto:

```powershell
Test-Path .\package.json
```

**Debes ver:** `True`. Si ves `False`, no estás en la carpeta `mallmapai`.

## 2. Instalar Node.js 24

1. Descarga el instalador **LTS 24** desde <https://nodejs.org/> y ejecútalo con las opciones por defecto.
2. Cierra PowerShell y ábrelo otra vez en la carpeta `mallmapai`.

```powershell
node -v
npm.cmd -v
```

**Debes ver:** algo como `v24.x.x` y un número de versión de npm.

> Usamos `npm.cmd` en vez de `npm` porque en algunos equipos PowerShell bloquea `npm.ps1` por la política de scripts.

## 3. Instalar dependencias

```powershell
npm.cmd ci
```

**Debes ver:** al final, `added ... packages` sin errores (`ERR!`). Se crea la carpeta `node_modules`.

## 4. Crear el archivo `.env`

```powershell
Copy-Item .env.example .env
notepad .env
```

En el Bloc de notas:

1. Deja activa **una sola** línea `DATABASE_URL=` (la de la opción de base de datos que vayas a usar, ver paso 5). Las demás deben empezar con `#`.
2. Cambia `ADMIN_TOKEN` por un texto largo. Puedes generarlo así:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```

3. Guarda y cierra.

**Nunca subas `.env` a GitHub.** Ya está en `.gitignore`.

## 5. Elegir y encender PostgreSQL

Elige **una** de las tres opciones.

### Opción A — Docker Desktop

1. Instala y abre Docker Desktop. Espera a que diga *Engine running*.
2. En `.env` usa:

   ```
   DATABASE_URL=postgresql://mallmapai:cambia_esta_clave@localhost:55432/mallmapai
   POSTGRES_PASSWORD=cambia_esta_clave
   ```

   Si cambias la clave, cámbiala en las dos líneas.
3. Enciende la base:

   ```powershell
   docker compose up -d db
   ```

   **Debes ver:** `Container mallmapai-db Started`.
4. Espera a que acepte conexiones:

   ```powershell
   docker compose exec db pg_isready -U mallmapai -d mallmapai
   ```

   **Debes ver:** `/var/run/postgresql:5432 - accepting connections`. Si dice `no response`, espera unos segundos y repite.

El puerto en tu PC es **55432** (está en `compose.yaml`). Así no choca con un PostgreSQL instalado en Windows.

### Opción B — PostgreSQL instalado en Windows

1. Descarga el instalador de PostgreSQL 16 desde <https://www.postgresql.org/download/windows/>.
2. Durante la instalación anota la **contraseña** del usuario `postgres` y deja el **puerto 5432**.
3. Al final aparece **Stack Builder**. Puedes cerrarlo: MallMapAI no lo necesita, tampoco `PEM-HTTPD`.
4. Verifica que el servicio esté iniciado:

   ```powershell
   Get-Service postgresql*
   ```

   **Debes ver:** `Running`. Si dice `Stopped`, ábrelo con `services.msc` y pulsa **Iniciar**, o ejecuta PowerShell como administrador y usa `Start-Service postgresql-x64-16`.
5. Crea la base (te pedirá la contraseña):

   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE mallmapai;"
   ```

   **Debes ver:** `CREATE DATABASE`.
6. En `.env`:

   ```
   DATABASE_URL=postgresql://postgres:TU_CLAVE@localhost:5432/mallmapai
   ```

### Opción C — Supabase (remota)

1. En <https://supabase.com/> crea un proyecto y guarda la contraseña de la base.
2. En el proyecto pulsa **Connect** (arriba). En **Connection string** elige **Session pooler** (funciona con IPv4; la conexión directa puede requerir IPv6).
3. Copia la URI tal como aparece (el host empieza por `aws-0-` o `aws-1-` según la región). Se ve así:

   ```
   postgresql://postgres.abcdefghijk:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
   ```

4. Reemplaza `[YOUR-PASSWORD]` por tu contraseña. Si tiene caracteres especiales, codifícalos: `@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`, `?` → `%3F`, `%` → `%25`. Puedes obtener la versión codificada así:

   ```powershell
   node -e "console.log(encodeURIComponent('MiClave#2026'))"
   ```

5. En `.env`:

   ```
   DATABASE_URL=postgresql://postgres.abcdefghijk:CLAVE_CODIFICADA@aws-1-us-east-1.pooler.supabase.com:5432/postgres
   DB_SSL=no-verify
   ```

   `no-verify` cifra la conexión, pero no valida el certificado. Para validarlo descarga el certificado en **Project Settings → Database → SSL Configuration**, guárdalo (por ejemplo `C:\certs\prod-ca-2021.crt`) y usa:

   ```
   DB_SSL=verify
   DB_SSL_CA_FILE=C:\certs\prod-ca-2021.crt
   ```

6. Después del paso 6 de esta guía, revisa en Supabase **Table Editor**: deben aparecer `piso`, `nodo`, `conexion`, `tienda` y `promocion`.

## 6. Crear las tablas y cargar los datos

```powershell
npm.cmd run db:init
```

**Debes ver:**

```
Base de datos lista.
  pisos: 3 | nodos: 115 | conexiones: 121 | tiendas: 35 | promociones: 7 (vigentes: 6)
```

> Cuidado: este comando **borra y recrea** las tablas del prototipo. Úsalo solo en la base de MallMapAI.

## 7. Compilar y arrancar

```powershell
npm.cmd run build
npm.cmd start
```

**Debes ver:** `✓ built in ...` y luego `MallMapAI escuchando en http://localhost:3000`.

Abre <http://localhost:3000> en el navegador. Para verlo desde el celular en la misma red Wi-Fi, usa `http://IP-DE-TU-PC:3000` (la IP sale con `ipconfig`) y permite Node.js en el firewall de Windows.

### Ruta de prueba

1. **Punto de partida:** «Plazoleta norte (frente a escaleras)» (Piso 1).
2. **Destino:** «Relojes Tiempo (demo) · local P3-L01» (Piso 3).
3. Pulsa **Trazar ruta**. La ruta usa escaleras.
4. Marca **Evitar escaleras** y vuelve a pulsar **Trazar ruta**. Ahora usa el ascensor del Piso 1 al Piso 3.

También puedes probar la API desde otra ventana de PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/rutas -ContentType "application/json" -Body '{"origen":"P1-C01","destino":"P3-L01","evitarEscaleras":true}' | Select-Object -ExpandProperty instrucciones
```

**Debes ver** las indicaciones, entre ellas `Toma el ascensor en el Piso 1 y sube hasta el Piso 3.`

### Detener el servidor y conservar los datos

- Para detener el servidor: en la ventana donde corre, pulsa **Ctrl + C**.
- Docker: `docker compose stop db` apaga la base **y conserva los datos** en el volumen `mallmapai_datos`. Al día siguiente: abre Docker Desktop y ejecuta `docker compose start db`. No vuelvas a ejecutar `db:init` si quieres conservar lo que creaste.
- `docker compose down` borra el contenedor pero **mantiene** el volumen. `docker compose down -v` **borra también los datos**.

## 8. Importar promociones (Python)

Con el servidor encendido, en otra ventana:

```powershell
python -m pip install -r importer\requirements.txt
python importer\importar_promociones.py
```

**Debes ver:** `TOTAL -> insertadas: 6 | actualizadas: 0 | rechazadas: 1`. La oferta rechazada tiene una fecha imposible a propósito. Si lo ejecutas otra vez verás `insertadas: 0 | actualizadas: 6`: no se duplican.

Las dos fuentes (`importer\fuentes\fuente_a.html` y `fuente_b.html`) son **muestras creadas para la prueba**, no páginas comerciales reales.

**Ejecución semanal (opcional, no quedó configurada):** en PowerShell como administrador, cambiando la ruta:

```powershell
schtasks /Create /SC WEEKLY /D MON /ST 08:00 /TN "MallMapAI-Importar" /TR "python C:\ruta\mallmapai\importer\importar_promociones.py"
```

## 9. Pruebas

| Comando | Qué prueba | Requisito |
|---|---|---|
| `npm.cmd run test:unit` | Dijkstra y validaciones | Nada |
| `npm.cmd run test:integration` | API + PostgreSQL, CRUD, duplicados, importación, caída de la base | `TEST_DATABASE_URL` en `.env` apuntando a una base **separada** (Docker ya crea `mallmapai_test`) |
| `python -m unittest discover tests\importer` | Lectura de las fuentes HTML | Python + beautifulsoup4 |
| `npx.cmd playwright install chromium` y luego `npm.cmd run test:e2e` | Navegador: mapa, ruta, ofertas, móvil 390 px | `npm.cmd run build` y la base inicializada |
| `node scripts\prueba-caida-bd.js` | Detiene PostgreSQL de verdad y verifica la respuesta 503 y la recuperación | Servidor encendido. Ver el comentario al inicio del archivo |

Para las pruebas de integración con PostgreSQL de Windows, crea la base de pruebas:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE mallmapai_test;"
```

## 10. Errores comunes

| Mensaje | Causa probable | Solución |
|---|---|---|
| `npm : No se puede cargar el archivo ... npm.ps1` | Política de scripts de PowerShell | Usa `npm.cmd` en lugar de `npm` |
| `npm warn install-scripts ...` durante `npm ci` | npm 11 avisa que no ejecutó scripts de instalación | Es solo un aviso. Si `npm.cmd run build` funciona, puedes ignorarlo |
| `npm ERR! ... package.json` | No estás en la carpeta correcta | Abre PowerShell dentro de `mallmapai` (paso 1) |
| `ECONNREFUSED` en `db:init` | PostgreSQL apagado o puerto equivocado | Docker: `docker compose up -d db`. Windows: `Get-Service postgresql*`. Revisa 55432 (Docker) o 5432 (Windows) |
| `password authentication failed` | Clave incorrecta en `DATABASE_URL` | Corrige la clave. En Docker, si cambiaste la clave después de crear el volumen, usa `docker compose down -v` y vuelve a crear |
| `database "mallmapai" does not exist` | No se creó la base | Opción B, paso 5 |
| `self-signed certificate` / error TLS (Supabase) | Falta configurar TLS | `DB_SSL=no-verify` o `DB_SSL=verify` con el certificado |
| `ENOTFOUND ...supabase.co` | Conexión directa solo IPv6 | Usa la URI del **Session pooler** |
| `EADDRINUSE :::3000` | Ya hay algo en el puerto 3000 | Cierra el otro servidor o cambia `PORT=3001` en `.env` |
| La página dice «La interfaz no está compilada» | Falta compilar | `npm.cmd run build` y reinicia |
| En la app: «La base de datos no está disponible» | PostgreSQL se detuvo | Enciéndelo y pulsa **Reintentar**. No hace falta reiniciar el servidor |
| `401 NO_AUTORIZADO` al importar | `ADMIN_TOKEN` distinto o vacío | Revisa `.env` y reinicia el servidor |
| Playwright: `Executable doesn't exist` | Falta Chromium | `npx.cmd playwright install chromium` |

## 11. API (resumen)

Base: `http://localhost:3000/api/v1`. Todas las respuestas son JSON. Los errores tienen la forma `{"error":{"codigo","mensaje","detalles"}}`.

| Método | Ruta | Uso | Auth |
|---|---|---|---|
| GET | `/salud` | Estado del servidor y de la base (200 o 503) | No |
| GET | `/mapa` | Pisos, nodos y conexiones del sector | No |
| GET | `/tiendas` | Tiendas de demostración | No |
| GET | `/ofertas` | Ofertas vigentes hoy (hora de Bogotá) | No |
| GET | `/ofertas/:id` | Una oferta | No |
| POST | `/rutas` | `{origen, destino, evitarEscaleras}` → ruta, tramos e indicaciones | No |
| GET | `/admin/ofertas` | Todas las ofertas, incluidas las vencidas | Token |
| POST | `/admin/ofertas` | Crear oferta | Token |
| PUT | `/admin/ofertas/:id` | Actualizar oferta | Token |
| DELETE | `/admin/ofertas/:id` | Eliminar oferta | Token |
| POST | `/admin/ofertas/importar` | `{origen, ofertas:[...]}` carga idempotente | Token |

**Token:** cabecera `Authorization: Bearer <ADMIN_TOKEN>`. Es un token de servicio único del servidor, no una cuenta de usuario. La propuesta planteaba usuarios con JWT; eso queda pendiente (ver el informe).

Ejemplo para crear una oferta:

```powershell
$h = @{ Authorization = "Bearer TU_TOKEN" }
$b = '{"numeroLocal":"P2-L05","titulo":"Prueba","porcentaje":10,"fechaInicio":"2026-11-18","fechaFin":"2026-12-31"}'
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/admin/ofertas -Headers $h -ContentType "application/json" -Body $b
```

## 12. Subir a GitHub (privado)

El ZIP ya trae el historial de Git (`.git`). Para publicarlo:

1. En GitHub crea un repositorio **privado** vacío llamado `mallmapai` (sin README).
2. En PowerShell, dentro de `mallmapai`:

   ```powershell
   git status
   git remote add origin https://github.com/TU_USUARIO/mallmapai.git
   git branch -M main
   git push -u origin main
   ```

3. Comprueba en GitHub que **no** aparezcan `.env` ni `node_modules`.

## 13. Estructura

```
mallmapai/
├─ client/            interfaz React (src/) y planos SVG originales (public/planos/)
├─ server/            API Express: app, base de datos, validación, repositorio
├─ shared/            Dijkstra e indicaciones (módulos independientes)
├─ db/                schema.sql, seed.sql (generado) y script inicial de Docker
├─ data/              grafo anotado, tiendas y promociones de demostración
├─ importer/          importador Python y fuentes HTML de muestra
├─ scripts/           db-init, generar-seed, prueba de caída de la base
├─ tools/             scripts Python que generan el grafo y las tiendas demo
├─ tests/             unit, integration, e2e (Playwright), importer (Python)
└─ docs/              informe, UML, manual, guion, presupuesto y evidencias
```
