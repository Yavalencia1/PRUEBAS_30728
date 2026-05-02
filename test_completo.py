#!/usr/bin/env python3
"""
Script de pruebas completo con creación de datos
"""

import requests
import json
import os

BASE_URL = "http://localhost:9000/api/v1"
tokens = {}
usuarios = {}

def get_headers(rol="dueno"):
    return {"Authorization": f"Bearer {tokens[rol]}"}

def separador(titulo):
    print("\n" + "=" * 60)
    print(f"  {titulo}")
    print("=" * 60)

def login():
    """Login para todos los roles"""
    global tokens, usuarios
    
    separador("LOGIN")
    
    roles_credenciales = {
        "padre": ("padre@test.com", "password123"),
        "conductor": ("conductor@test.com", "password123"),
        "dueno": ("dueno@test.com", "password123"),
    }
    
    for rol, (email, password) in roles_credenciales.items():
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": password}
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok"):
                tokens[rol] = data["data"]["tokens"]["access_token"]
                usuarios[rol] = data["data"]["usuario"]
                print(f"✅ {rol.upper()}")

def crear_recorrido():
    """Crear un recorrido primero"""
    print("\n--- Crear recorrido ---")
    dueno_id = usuarios["dueno"]["id"]
    resp = requests.post(
        f"{BASE_URL}/recorridos",
        headers=get_headers("dueno"),
        json={"nombre": "Recorrido Test", "dueno_id": dueno_id}
    )
    if resp.status_code in [200, 201]:
        recorrido_id = resp.json()["data"]["id"]
        print(f"✅ Recorrido: {recorrido_id}")
        return recorrido_id
    else:
        print(f"❌ Error: {resp.status_code} - {resp.json()}")
        return None

def crear_ruta(recorrido_id):
    """Crear una ruta"""
    print("\n--- Crear ruta ---")
    resp = requests.post(
        f"{BASE_URL}/rutas",
        headers=get_headers("dueno"),
        json={
            "recorrido_id": recorrido_id,
            "nombre": "Ruta Morning",
            "tipo": "ida"
        }
    )
    try:
        if resp.status_code in [200, 201]:
            ruta_id = resp.json()["data"]["id"]
            print(f"✅ Ruta: {ruta_id}")
            return ruta_id
        else:
            print(f"❌ Error: {resp.status_code}")
            if resp.text:
                print(f"   {resp.text[:200]}")
            return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def crear_sesion(ruta_id, conductor_id):
    """Crear una sesión"""
    print("\n--- Crear sesión ---")
    resp = requests.post(
        f"{BASE_URL}/sesiones",
        headers=get_headers("dueno"),
        json={
            "ruta_id": ruta_id,
            "conductor_id": conductor_id
        }
    )
    if resp.status_code in [200, 201]:
        sesion_id = resp.json()["data"]["id"]
        print(f"✅ Sesión: {sesion_id}")
        return sesion_id
    else:
        print(f"❌ Error: {resp.status_code} - {resp.json()}")
        return None

def test_paradas(ruta_id):
    """Probar paradas"""
    separador("PRUEBAS DE PARADAS")
    
    # Crear parada
    print("\n--- Crear parada 1 ---")
    resp = requests.post(
        f"{BASE_URL}/paradas",
        headers=get_headers("dueno"),
        json={
            "ruta_id": ruta_id,
            "nombre": "Parada Principal",
            "latitud": 4.7110,
            "longitud": -74.0721,
            "orden": 1
        }
    )
    if resp.status_code == 201:
        parada1 = resp.json()["data"]
        print(f"✅ Parada 1: {parada1['id']}")
    else:
        print(f"❌ Error: {resp.status_code}")
        return False
    
    # Crear parada 2
    print("\n--- Crear parada 2 ---")
    resp = requests.post(
        f"{BASE_URL}/paradas",
        headers=get_headers("dueno"),
        json={
            "ruta_id": ruta_id,
            "nombre": "Parada Secundaria",
            "latitud": 4.7200,
            "longitud": -74.0850,
            "orden": 2
        }
    )
    if resp.status_code == 201:
        parada2 = resp.json()["data"]
        print(f"✅ Parada 2: {parada2['id']}")
    else:
        print(f"❌ Error: {resp.status_code}")
        return False
    
    # Listar paradas
    print("\n--- Listar paradas ---")
    resp = requests.get(
        f"{BASE_URL}/paradas",
        headers=get_headers("dueno"),
        params={"ruta_id": ruta_id}
    )
    if resp.status_code == 200:
        paradas = resp.json()["data"]["items"]
        print(f"✅ Total paradas: {len(paradas)}")
        for p in paradas:
            print(f"   - {p['nombre']} (orden {p['orden']})")
        return True
    else:
        print(f"❌ Error: {resp.status_code}")
        return False

def test_notificaciones():
    """Probar notificaciones"""
    separador("PRUEBAS DE NOTIFICACIONES")
    
    padre_id = usuarios["padre"]["id"]
    
    # Crear notificación
    print("\n--- Crear notificación 1 ---")
    resp = requests.post(
        f"{BASE_URL}/notificaciones",
        headers=get_headers("dueno"),
        json={
            "usuario_id": padre_id,
            "titulo": "El bus está en camino",
            "mensaje": "Tu hijo será recogido en 10 minutos",
            "tipo": "llegada"
        }
    )
    if resp.status_code == 201:
        notif = resp.json()["data"]
        print(f"✅ Notificación: {notif['id']}")
    else:
        print(f"❌ Error: {resp.status_code}")
        return False
    
    # Crear notificación 2
    print("\n--- Crear notificación 2 ---")
    resp = requests.post(
        f"{BASE_URL}/notificaciones",
        headers=get_headers("conductor"),
        json={
            "usuario_id": padre_id,
            "titulo": "Pago registrado",
            "mensaje": "Tu pago ha sido confirmado",
            "tipo": "pago"
        }
    )
    if resp.status_code == 201:
        notif2 = resp.json()["data"]
        print(f"✅ Notificación: {notif2['id']}")
    else:
        print(f"❌ Error: {resp.status_code}")
        return False
    
    # Listar sin leer (como padre)
    print("\n--- Listar notificaciones sin leer (PADRE) ---")
    resp = requests.get(
        f"{BASE_URL}/notificaciones",
        headers=get_headers("padre"),
        params={"leida": False}
    )
    if resp.status_code == 200:
        notifs = resp.json()["data"]["items"]
        print(f"✅ Notificaciones sin leer: {len(notifs)}")
    else:
        print(f"❌ Error: {resp.status_code}")
        return False
    
    # Marcar como leída
    print("\n--- Marcar notificación como leída ---")
    resp = requests.post(
        f"{BASE_URL}/notificaciones/{notif['id']}/marcar-leida",
        headers=get_headers("padre")
    )
    if resp.status_code == 200:
        print(f"✅ Notificación marcada como leída")
    else:
        print(f"❌ Error: {resp.status_code}")
        return False
    
    # Ver contador de sin leer
    print("\n--- Contador sin leer ---")
    resp = requests.get(
        f"{BASE_URL}/notificaciones/stats/sin-leer",
        headers=get_headers("padre")
    )
    if resp.status_code == 200:
        stats = resp.json()["data"]
        print(f"✅ Sin leer: {stats['sin_leer']}")
        return True
    else:
        print(f"❌ Error: {resp.status_code}")
        return False

def test_ubicaciones_gps(sesion_id):
    """Probar ubicaciones GPS"""
    separador("PRUEBAS DE UBICACIONES GPS")
    
    # Registrar ubicación 1
    print("\n--- Registrar ubicación 1 ---")
    resp = requests.post(
        f"{BASE_URL}/ubicaciones-gps",
        headers=get_headers("conductor"),
        json={
            "sesion_id": sesion_id,
            "latitud": 4.7110,
            "longitud": -74.0721
        }
    )
    if resp.status_code == 201:
        ubicacion1 = resp.json()["data"]
        print(f"✅ Ubicación 1: {ubicacion1['id']}")
    else:
        print(f"❌ Error: {resp.status_code} - {resp.json()}")
        return False
    
    # Registrar ubicación 2
    print("\n--- Registrar ubicación 2 ---")
    resp = requests.post(
        f"{BASE_URL}/ubicaciones-gps",
        headers=get_headers("conductor"),
        json={
            "sesion_id": sesion_id,
            "latitud": 4.7150,
            "longitud": -74.0800
        }
    )
    if resp.status_code == 201:
        ubicacion2 = resp.json()["data"]
        print(f"✅ Ubicación 2: {ubicacion2['id']}")
    else:
        print(f"❌ Error: {resp.status_code}")
        return False
    
    # Obtener última ubicación
    print("\n--- Última ubicación ---")
    resp = requests.get(
        f"{BASE_URL}/ubicaciones-gps/sesion/{sesion_id}/ultimo-punto",
        headers=get_headers("conductor")
    )
    if resp.status_code == 200:
        ultima = resp.json()["data"]
        print(f"✅ Última: ({ultima['latitud']}, {ultima['longitud']})")
    else:
        print(f"❌ Error: {resp.status_code}")
        return False
    
    # Obtener ruta completa
    print("\n--- Ruta completa ---")
    resp = requests.get(
        f"{BASE_URL}/ubicaciones-gps/sesion/{sesion_id}/ruta",
        headers=get_headers("conductor")
    )
    if resp.status_code == 200:
        ruta = resp.json()["data"]
        print(f"✅ Total puntos: {ruta['total_puntos']}")
        for punto in ruta.get("puntos", [])[:3]:
            print(f"   - ({punto['latitud']}, {punto['longitud']})")
        return True
    else:
        print(f"❌ Error: {resp.status_code}")
        return False

if __name__ == "__main__":
    print("\n" + "█" * 60)
    print("PRUEBAS COMPLETAS - ROUTEKIDS")
    print("█" * 60)
    
    try:
        login()
        
        # Crear datos de prueba
        recorrido_id = crear_recorrido()
        if not recorrido_id:
            print("❌ No se puede continuar sin recorrido")
            exit(1)
        
        ruta_id = crear_ruta(recorrido_id)
        if not ruta_id:
            print("❌ No se puede continuar sin ruta")
            exit(1)
        
        conductor_id = usuarios["conductor"]["id"]
        sesion_id = crear_sesion(ruta_id, conductor_id)
        
        # Ejecutar pruebas
        paradas_ok = test_paradas(ruta_id)
        notifs_ok = test_notificaciones()
        gps_ok = test_ubicaciones_gps(sesion_id) if sesion_id else False
        
        # Resumen
        separador("RESUMEN")
        print(f"✅ Paradas:         {'PASS' if paradas_ok else 'FAIL'}")
        print(f"✅ Notificaciones:  {'PASS' if notifs_ok else 'FAIL'}")
        print(f"✅ Ubicaciones GPS: {'PASS' if gps_ok else 'FAIL'}")
        
        print("\n" + "█" * 60)
        print("✅ PRUEBAS COMPLETADAS")
        print("█" * 60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
