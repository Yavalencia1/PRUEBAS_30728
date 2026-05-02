import requests
import json
from typing import Dict, Any

# Detectar si está dentro de Docker o en local
import socket
try:
    socket.create_connection(("127.0.0.1", 9000), timeout=1)
    BASE_URL = "http://localhost:9000/api/v1"
except:
    # Dentro del contenedor, usar el nombre del servicio
    BASE_URL = "http://api:8000/api/v1"

def print_response(title: str, response: requests.Response, show_full=False):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")
    try:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return data
    except:
        print(f"Status: {response.status_code}")
        print(f"Content: {response.text[:200]}")
        return None

def test_authentication():
    """Prueba el sistema de autenticación con diferentes roles"""
    
    users = [
        {"nombre": "Carlos", "apellido": "García", "email": "padre@test.com", "password": "password123", "rol": "padre"},
        {"nombre": "Miguel", "apellido": "López", "email": "conductor@test.com", "password": "password123", "rol": "conductor"},
        {"nombre": "Ana", "apellido": "Rodríguez", "email": "dueno@test.com", "password": "password123", "rol": "dueno"},
    ]
    
    tokens = {}
    
    # 1. REGISTRAR USUARIOS
    print("\n" + "█"*60)
    print("PASO 1: REGISTRAR USUARIOS")
    print("█"*60)
    
    for user in users:
        resp = requests.post(f"{BASE_URL}/auth/registro", json=user)
        data = print_response(f"Registrar {user['rol'].upper()}", resp)
        if data and data.get("ok"):
            print(f"✅ {user['rol'].upper()} registrado exitosamente")
    
    # 2. LOGIN Y OBTENER TOKENS
    print("\n" + "█"*60)
    print("PASO 2: LOGIN Y OBTENER TOKENS")
    print("█"*60)
    
    for user in users:
        login_data = {"email": user["email"], "password": user["password"]}
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        data = print_response(f"Login {user['rol'].upper()}", resp)
        if data and data.get("ok"):
            tokens[user["rol"]] = data["data"]["tokens"]["access_token"]
            print(f"✅ Token obtenido para {user['rol'].upper()}")
    
    # 3. PROBAR ACCESO A ENDPOINTS CON DIFERENTES ROLES
    print("\n" + "█"*60)
    print("PASO 3: PROBAR ACCESO A ENDPOINTS")
    print("█"*60)
    
    # Test endpoint de USUARIOS (solo admin/dueño)
    print("\n--- Acceso a /usuarios ---")
    for rol, token in tokens.items():
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/usuarios/", headers=headers)
        status = "✅" if resp.status_code == 200 else "❌"
        data = resp.json()
        if data.get("ok"):
            print(f"{status} {rol.upper()}: Acceso permitido ({data['data'].get('pagination', {}).get('total', 0)} usuarios)")
        else:
            print(f"{status} {rol.upper()}: {data['error']['mensaje']}")
    
    # Test endpoint de ALUMNOS (filtrado por rol)
    print("\n--- Acceso a /alumnos ---")
    for rol, token in tokens.items():
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/alumnos/", headers=headers)
        data = resp.json()
        status = "✅" if data.get("ok") else "❌"
        if data.get("ok"):
            print(f"{status} {rol.upper()}: Acceso permitido ({data['data'].get('pagination', {}).get('total', 0)} alumnos)")
        else:
            print(f"{status} {rol.upper()}: {data['error']['mensaje']}")
    
    # Test endpoint de RECORRIDOS
    print("\n--- Acceso a /recorridos ---")
    for rol, token in tokens.items():
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/recorridos/", headers=headers)
        data = resp.json()
        status = "✅" if data.get("ok") else "❌"
        if data.get("ok"):
            print(f"{status} {rol.upper()}: Acceso permitido ({data['data'].get('pagination', {}).get('total', 0)} recorridos)")
        else:
            print(f"{status} {rol.upper()}: {data['error']['mensaje']}")
    
    # Test endpoint de DASHBOARD (solo admin/dueño)
    print("\n--- Acceso a /dashboard/resumen ---")
    for rol, token in tokens.items():
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/dashboard/resumen", headers=headers)
        data = resp.json()
        status = "✅" if data.get("ok") else "❌"
        if data.get("ok"):
            print(f"{status} {rol.upper()}: Acceso permitido")
            print(f"   - Alumnos activos: {data['data']['total_alumnos_activos']}")
            print(f"   - Recorridos activos: {data['data']['recorridos_activos']}")
        else:
            print(f"{status} {rol.upper()}: {data['error']['mensaje']}")
    
    # 4. PRUEBA SIN TOKEN (debe fallar)
    print("\n" + "█"*60)
    print("PASO 4: PRUEBA SIN TOKEN (debe fallar)")
    print("█"*60)
    
    resp = requests.get(f"{BASE_URL}/usuarios/")
    data = resp.json()
    print(f"❌ Acceso sin token: {data['error']['mensaje']}")
    
    print("\n" + "█"*60)
    print("✅ PRUEBAS COMPLETADAS")
    print("█"*60)

if __name__ == "__main__":
    test_authentication()
