"""Pruebas del importador (lectura de las fuentes HTML). Ejecutar: python -m unittest discover tests/importer"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "importer"))
import importar_promociones as imp  # noqa: E402


class PruebasLectores(unittest.TestCase):
    def test_PY01_fuente_a_lee_tarjetas(self):
        ofertas = imp.leer_fuente_a((imp.CARPETA / "fuentes" / "fuente_a.html").read_text(encoding="utf-8"))
        self.assertEqual(len(ofertas), 4)
        self.assertEqual(ofertas[0].numeroLocal, "P3-L02")
        self.assertEqual(ofertas[0].porcentaje, 33.0)
        self.assertEqual(ofertas[1].porcentaje, 25.0)
        self.assertIsNone(ofertas[2].porcentaje)
        self.assertEqual(ofertas[3].fechaInicio, "2026-02-30")  # la API la rechaza

    def test_PY02_fuente_b_convierte_fechas(self):
        ofertas = imp.leer_fuente_b((imp.CARPETA / "fuentes" / "fuente_b.html").read_text(encoding="utf-8"))
        self.assertEqual(len(ofertas), 3)
        self.assertEqual(ofertas[0].fechaInicio, "2026-11-18")
        self.assertEqual(ofertas[0].porcentaje, 20.0)
        self.assertIsNone(ofertas[1].porcentaje)

    def test_PY03_porcentaje_y_fechas_raras(self):
        self.assertEqual(imp.a_porcentaje("12,5 %"), 12.5)
        self.assertIsNone(imp.a_porcentaje("sin dato"))
        self.assertEqual(imp.fecha_dd_mm_aaaa("31/02/2026"), "31/02/2026")


if __name__ == "__main__":
    unittest.main()
