"""Importador de promociones de MallMapAI.

Lee dos fuentes HTML de DEMOSTRACIÓN, normaliza las ofertas y las envía a la API
(POST /api/v1/admin/ofertas/importar) con el token de administración.
La API hace un "upsert": repetir la carga actualiza las ofertas y no las duplica.

Uso (PowerShell, con el servidor encendido):
    python importer\\importar_promociones.py
    python importer\\importar_promociones.py --solo-mostrar      (no envía nada)

Variables usadas (se leen del archivo .env si existe):
    ADMIN_TOKEN   token de administración
    PORT          puerto del servidor (por defecto 3000)
    MALLMAPAI_API URL base de la API (opcional; por defecto http://localhost:PORT/api/v1)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from datetime import date, datetime
from pathlib import Path

from bs4 import BeautifulSoup

CARPETA = Path(__file__).resolve().parent
RAIZ = CARPETA.parent


@dataclass
class Oferta:
    numeroLocal: str
    titulo: str
    descripcion: str | None
    porcentaje: float | None
    fechaInicio: str
    fechaFin: str


def cargar_env(ruta: Path = RAIZ / ".env") -> None:
    """Lee KEY=VALUE del .env sin depender de librerías externas."""
    if not ruta.exists():
        return
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, valor = linea.split("=", 1)
        os.environ.setdefault(clave.strip(), valor.strip())


def a_porcentaje(texto: str | None) -> float | None:
    """'33%' -> 33.0, '25 %' -> 25.0, '' -> None."""
    if not texto:
        return None
    m = re.search(r"\d+(?:[.,]\d+)?", texto)
    return float(m.group().replace(",", ".")) if m else None


def fecha_dd_mm_aaaa(texto: str) -> str:
    """'18/11/2026' -> '2026-11-18'. Si no es válida se deja tal cual y la API la rechaza."""
    try:
        return datetime.strptime(texto.strip(), "%d/%m/%Y").date().isoformat()
    except ValueError:
        return texto.strip()


def leer_fuente_a(html: str) -> list[Oferta]:
    """Fuente A: tarjetas <article class="oferta" data-local="...">.
    Selectores: article.oferta[data-local], .oferta__titulo, .oferta__detalle,
    .oferta__descuento (opcional), time.oferta__inicio[datetime], time.oferta__fin[datetime]."""
    sopa = BeautifulSoup(html, "html.parser")
    ofertas = []
    for art in sopa.select("article.oferta[data-local]"):
        titulo = art.select_one(".oferta__titulo")
        inicio = art.select_one("time.oferta__inicio")
        fin = art.select_one("time.oferta__fin")
        if not (titulo and inicio and fin):
            continue  # tarjeta incompleta: se ignora
        detalle = art.select_one(".oferta__detalle")
        descuento = art.select_one(".oferta__descuento")
        ofertas.append(Oferta(
            numeroLocal=art["data-local"].strip(),
            titulo=titulo.get_text(strip=True),
            descripcion=detalle.get_text(strip=True) if detalle else None,
            porcentaje=a_porcentaje(descuento.get_text() if descuento else None),
            fechaInicio=inicio.get("datetime", "").strip(),
            fechaFin=fin.get("datetime", "").strip(),
        ))
    return ofertas


def leer_fuente_b(html: str) -> list[Oferta]:
    """Fuente B: tabla #tabla-promos. Columnas: Local, Promoción, Condiciones, % Desc., Desde, Hasta.
    Fechas en formato DD/MM/AAAA."""
    sopa = BeautifulSoup(html, "html.parser")
    ofertas = []
    for fila in sopa.select("table#tabla-promos tbody tr"):
        celdas = [td.get_text(strip=True) for td in fila.find_all("td")]
        if len(celdas) != 6:
            continue
        local, titulo, condiciones, pct, desde, hasta = celdas
        ofertas.append(Oferta(
            numeroLocal=local,
            titulo=titulo,
            descripcion=condiciones or None,
            porcentaje=a_porcentaje(pct),
            fechaInicio=fecha_dd_mm_aaaa(desde),
            fechaFin=fecha_dd_mm_aaaa(hasta),
        ))
    return ofertas


FUENTES = {
    "fuente_a": (CARPETA / "fuentes" / "fuente_a.html", leer_fuente_a),
    "fuente_b": (CARPETA / "fuentes" / "fuente_b.html", leer_fuente_b),
}


def enviar(api: str, token: str, origen: str, ofertas: list[Oferta]) -> dict:
    cuerpo = json.dumps({"origen": origen, "ofertas": [asdict(o) for o in ofertas]}).encode("utf-8")
    peticion = urllib.request.Request(
        f"{api}/admin/ofertas/importar", data=cuerpo, method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(peticion, timeout=15) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detalle = e.read().decode("utf-8", "replace")
        raise SystemExit(f"La API respondió {e.code}: {detalle}") from None
    except urllib.error.URLError as e:
        raise SystemExit(f"No se pudo conectar con la API en {api} ({e.reason}). ¿Está encendido el servidor (npm.cmd start)?") from None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Importa promociones de las fuentes HTML de demostración.")
    parser.add_argument("--solo-mostrar", action="store_true", help="Solo muestra lo que se leyó; no envía nada.")
    args = parser.parse_args(argv)

    cargar_env()
    api = os.environ.get("MALLMAPAI_API") or f"http://localhost:{os.environ.get('PORT', '3000')}/api/v1"
    token = os.environ.get("ADMIN_TOKEN", "")

    total = {"insertadas": 0, "actualizadas": 0, "rechazadas": 0}
    print(f"Importación de promociones — {date.today().isoformat()}")
    for origen, (ruta, lector) in FUENTES.items():
        ofertas = lector(ruta.read_text(encoding="utf-8"))
        print(f"\n[{origen}] {ruta.name}: {len(ofertas)} ofertas leídas")
        if args.solo_mostrar:
            for o in ofertas:
                print("  -", json.dumps(asdict(o), ensure_ascii=False))
            continue
        if len(token) < 16:
            raise SystemExit("Falta ADMIN_TOKEN (mínimo 16 caracteres) en el archivo .env.")
        r = enviar(api, token, origen, ofertas)
        print(f"  insertadas: {r['insertadas']} | actualizadas: {r['actualizadas']} | rechazadas: {len(r['rechazadas'])}")
        for rech in r["rechazadas"]:
            campos = "; ".join(f"{d['campo']}: {d['mensaje']}" for d in (rech.get("detalles") or []))
            print(f"  ! rechazada '{rech.get('titulo')}': {rech['motivo']} {campos}".rstrip())
        total["insertadas"] += r["insertadas"]
        total["actualizadas"] += r["actualizadas"]
        total["rechazadas"] += len(r["rechazadas"])
    if not args.solo_mostrar:
        print(f"\nTOTAL -> insertadas: {total['insertadas']} | actualizadas: {total['actualizadas']} | rechazadas: {total['rechazadas']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
