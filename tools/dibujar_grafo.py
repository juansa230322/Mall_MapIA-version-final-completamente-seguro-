"""Dibuja el grafo anotado encima de cada plano SVG original (para revisar y documentar).
Uso: python tools/dibujar_grafo.py   -> crea docs/grafo/pisoN-grafo.svg (ábrelo en el navegador)."""
import json, os, re
RAIZ = os.path.join(os.path.dirname(__file__), "..")
g = json.load(open(os.path.join(RAIZ, "data", "grafo-sector.json"), encoding="utf-8"))
idx = {n["id"]: n for n in g["nodos"]}
COLOR = {"pasillo": "#000", "local": "#d00", "bano": "#90f", "entrada": "#06f", "ascensor": "#0b3", "escalera": "#cc0"}
for p in (1, 2, 3):
    svg = open(os.path.join(RAIZ, "client", "public", "planos", f"piso{p}.svg"), encoding="utf-8").read()
    x1, y1, x2, y2 = g["sector"]["bbox"][str(p)]
    capa = []
    for c in g["conexiones"]:
        a, b = idx[c["origen"]], idx[c["destino"]]
        if a["piso"] == p and b["piso"] == p:
            capa.append(f'<line x1="{a["x"]}" y1="{a["y"]}" x2="{b["x"]}" y2="{b["y"]}" stroke="#0a84ff" stroke-width="1.6" opacity=".85"/>')
    for n in g["nodos"]:
        if n["piso"] == p:
            capa.append(f'<circle cx="{n["x"]}" cy="{n["y"]}" r="5" fill="none" stroke="{COLOR[n["tipo"]]}" stroke-width="1.5"/>'
                        f'<text x="{n["x"]+5}" y="{n["y"]-5}" font-size="6.5" font-family="sans-serif" fill="#023">{n["id"][3:]}</text>')
    capa.append(f'<text x="{x1+4}" y="{y2-6}" font-size="10" font-family="sans-serif" fill="#0b5d6b">Piso {p} · nodos anotados (círculos) y conexiones (azul) · coordenadas del viewBox</text>')
    svg = svg.replace("</svg>", "".join(capa) + "</svg>")
    svg = re.sub(r'viewBox="[^"]+"', f'viewBox="{x1} {y1} {x2-x1} {y2-y1}"', svg, count=1)
    svg = re.sub(r'width="\d+" height="\d+"', f'width="1400" height="{int(1400*(y2-y1)/(x2-x1))}"', svg, count=1)
    open(os.path.join(RAIZ, "docs", "grafo", f"piso{p}-grafo.svg"), "w", encoding="utf-8").write(svg)
print("listo: docs/grafo/piso1-3-grafo.svg")
