"""Convierte los documentos Markdown de docs/ a DOCX (editable) y PDF.
Requiere pandoc, LibreOffice y python-docx. Uso: python tools/generar_documentos.py"""
import os, subprocess, sys, tempfile
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS = [("docs/informe/informe-tecnico.md", True), ("docs/manual/manual-de-usuario.md", False),
        ("docs/sustentacion/guion-sustentacion.md", False)]
TEAL = RGBColor(0x0B, 0x5D, 0x6B)

def referencia(ruta):
    subprocess.run(["pandoc", "-o", ruta, "--print-default-data-file", "reference.docx"], check=True)
    d = Document(ruta)
    estilos = {e.name: e for e in d.styles}
    for nombre in ("Normal", "Body Text", "First Paragraph", "Compact"):
        try:
            s = estilos[nombre]; s.font.name = "Arial"; s.font.size = Pt(11)
        except KeyError:
            pass
    for nombre, tam in (("Title", 22), ("Subtitle", 14), ("Heading 1", 16), ("Heading 2", 13), ("Heading 3", 12)):
        s = estilos[nombre]; s.font.name = "Arial"; s.font.size = Pt(tam); s.font.color.rgb = TEAL; s.font.bold = True
    for sec in d.sections:
        sec.page_width, sec.page_height = Cm(21), Cm(29.7)
        sec.left_margin = sec.right_margin = Cm(2.5); sec.top_margin = sec.bottom_margin = Cm(2.5)
    d.save(ruta)

def bordes_tablas(ruta):
    d = Document(ruta)
    for t in d.tables:
        tblPr = t._tbl.tblPr
        b = OxmlElement("w:tblBorders")
        for lado in ("top", "left", "bottom", "right", "insideH", "insideV"):
            e = OxmlElement(f"w:{lado}"); e.set(qn("w:val"), "single"); e.set(qn("w:sz"), "4"); e.set(qn("w:color"), "9AA6B0"); b.append(e)
        tblPr.append(b)
        for celda in t.rows[0].cells:
            tcPr = celda._tc.get_or_add_tcPr(); sh = OxmlElement("w:shd")
            sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), "E8F3F5"); tcPr.append(sh)
            for p in celda.paragraphs:
                for r in p.runs: r.font.bold = True
        for fila in t.rows:
            for celda in fila.cells:
                for p in celda.paragraphs:
                    for r in p.runs: r.font.size = Pt(9.5)
    d.save(ruta)

with tempfile.TemporaryDirectory() as tmp:
    ref = os.path.join(tmp, "ref.docx"); referencia(ref)
    for md, toc in DOCS:
        origen = os.path.join(RAIZ, md); carpeta = os.path.dirname(origen)
        destino = origen[:-3] + ".docx"
        args = ["pandoc", os.path.basename(origen), "-o", destino, f"--reference-doc={ref}", "--resource-path=."]
        if toc: args += ["--toc", "--toc-depth=2", "-M", "toc-title=Tabla de contenido"]
        subprocess.run(args, cwd=carpeta, check=True)
        bordes_tablas(destino)
        if toc:  # LibreOffice rellena la tabla de contenido y exporta el PDF
            subprocess.run([sys.executable, os.path.join(RAIZ, "tools", "actualizar_indice_lo.py"), destino], check=True)
        else:
            subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", carpeta, destino], check=True, capture_output=True)
        print("ok:", os.path.relpath(destino, RAIZ), "+ pdf")
