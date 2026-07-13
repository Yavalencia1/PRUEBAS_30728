import os
import re

target_dirs = [
    r"c:\Users\Anahi\PRUEBAS_30728\frontend\lib\presentation\screens",
    r"c:\Users\Anahi\PRUEBAS_30728\frontend\lib\controlador"
]

patterns = [
    (r"Uri\.parse\('\$_baseUrl/recorridos'\)", r"Uri.parse('$_baseUrl/recorridos/')"),
    (r"Uri\.parse\('\$_baseUrl/paradas'\)", r"Uri.parse('$_baseUrl/paradas/')"),
    (r"Uri\.parse\('\$_baseUrl/rutas'\)", r"Uri.parse('$_baseUrl/rutas/')"),
    (r"Uri\.parse\('\$_baseUrl/alumnos'\)", r"Uri.parse('$_baseUrl/alumnos/')"),
    (r"Uri\.parse\('\$_baseUrl/notificaciones'\)", r"Uri.parse('$_baseUrl/notificaciones/')"),
    (r"Uri\.parse\('\$_baseUrl/\$endpoint'\)", r"Uri.parse('$_baseUrl/$endpoint/')"),
]

for d in target_dirs:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.dart'):
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8') as file:
                        c = file.read()
                    nc = c
                    for o, n in patterns:
                        nc = re.sub(o, n, nc)
                    if nc != c:
                        with open(path, 'w', encoding='utf-8') as file:
                            file.write(nc)
                        print(f"Updated {path}")
                except Exception as e:
                    print(f"Error reading {path}: {e}")
print("Done")
