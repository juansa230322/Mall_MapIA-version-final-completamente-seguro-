# Genera data/tiendas-demo.json: nombres FICTICIOS para los locales anotados.
# No son nombres oficiales de Unicentro.
import json, os
base = os.path.join(os.path.dirname(__file__), "..", "data")
g = json.load(open(os.path.join(base, "grafo-sector.json")))
nombres = [
 ("Moda Sabana", "Moda"), ("Calzado Andino", "Calzado"), ("TecnoPunto", "Tecnología"), ("Casa Nogal", "Hogar"),
 ("Café La Ceiba", "Comidas"), ("Brillo Belleza", "Belleza"), ("Ruta Deportiva", "Deportes"), ("Libros del Parque", "Libros"),
 ("Juguetes Cometa", "Juguetes"), ("Óptica Mirador", "Óptica"), ("Joyas Esmeralda", "Joyería"), ("Dulces Momentos", "Comidas"),
 ("Urbano Jeans", "Moda"), ("Paso Firme", "Calzado"), ("Click Hogar", "Hogar"), ("Gamer Zona", "Tecnología"),
 ("Arepa & Más", "Comidas"), ("Piel Natural", "Belleza"), ("Montaña Outdoor", "Deportes"), ("Papelería Trazo", "Papelería"),
 ("Bebés Arrullo", "Infantil"), ("Relojes Tiempo", "Accesorios"), ("Té y Flor", "Comidas"), ("Estilo Ejecutivo", "Moda"),
 ("Sonido Vivo", "Tecnología"), ("Cocina Viva", "Hogar"), ("Mascotas Felices", "Mascotas"), ("Bolsos Viajero", "Accesorios"),
 ("Helados Polar", "Comidas"), ("Farmacia Bienestar", "Salud"), ("Fotografía Lente", "Tecnología"), ("Ropa Interior Suave", "Moda"),
 ("Bicis Ciudad", "Deportes"), ("Flores del Norte", "Regalos"), ("Panadería Trigal", "Comidas"),
]
locales = [n for n in g["nodos"] if n["tipo"] == "local"]
assert len(locales) <= len(nombres), (len(locales), len(nombres))
tiendas = [{"nodo": n["id"], "numeroLocal": n["id"], "nombre": nombres[i][0] + " (demo)", "categoria": nombres[i][1]}
           for i, n in enumerate(locales)]
json.dump(tiendas, open(os.path.join(base, "tiendas-demo.json"), "w"), ensure_ascii=False, indent=1)
print(len(tiendas), "tiendas demo")
