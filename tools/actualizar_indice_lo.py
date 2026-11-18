"""Abre un DOCX en LibreOffice (UNO), actualiza la tabla de contenido y exporta DOCX + PDF.
Uso: python tools/actualizar_indice_lo.py archivo.docx"""
import os, subprocess, sys, time
import uno
from com.sun.star.beans import PropertyValue

def prop(n, v):
    p = PropertyValue(); p.Name = n; p.Value = v; return p

ruta = os.path.abspath(sys.argv[1])
proc = subprocess.Popen(["soffice", "--headless", "--invisible", "--norestore",
                         "--accept=socket,host=127.0.0.1,port=2002;urp;"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
ctx = None
local = uno.getComponentContext()
resolver = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
for _ in range(60):
    try:
        ctx = resolver.resolve("uno:socket,host=127.0.0.1,port=2002;urp;StarOffice.ComponentContext"); break
    except Exception:
        time.sleep(0.5)
escritorio = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
doc = escritorio.loadComponentFromURL(uno.systemPathToFileUrl(ruta), "_blank", 0, (prop("Hidden", True),))
indices = doc.getDocumentIndexes()
total = indices.getCount()
for i in range(indices.getCount()):
    indices.getByIndex(i).update()
doc.refresh()
for i in range(indices.getCount()):
    indices.getByIndex(i).update()
doc.storeToURL(uno.systemPathToFileUrl(ruta), (prop("FilterName", "MS Word 2007 XML"),))
doc.storeToURL(uno.systemPathToFileUrl(ruta[:-5] + ".pdf"), (prop("FilterName", "writer_pdf_Export"),))
doc.close(True)
try:
    escritorio.terminate()
except Exception:
    pass
proc.wait(timeout=20)
print("índices actualizados:", total)
