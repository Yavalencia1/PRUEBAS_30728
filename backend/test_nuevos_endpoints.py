#!/usr/bin/env python3
"""
Script completo de pruebas para TODOS los nuevos endpoints
Incluye: Paradas, Notificaciones, Ubicaciones GPS
"""

import requests
import json
import os
from datetime import date, timedelta

# Detectar si estamos en Docker
if os.path.exists("/.dockerenv"):
    BASE_URL = "http://127.0.0.1:8000/api/v1"
    print(f"✅ Detectado Docker - Usando {BASE_URL}")
else:
    BASE_URL = "http://localhost:9000/api/v1"
    print(f"✅ Usando URL local: {BASE_URL}")

tokens = {}
usuarios = {}
recursos_creados = {}

def separador(titulo):
    """Imprime un separador visual"""
    print("\n" + "=" * 60)
    print(f"  {titulo}")
    print("=" * 60)

def login():
    """Login para todos los roles"""
    global tokens, usuarios
    
    separador("LOGIN Y AUTENTICACIÓN")
    
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
                print(f"✅ {rol.upper()}: Autenticado")

def get_headers(rol="dueno"):
    return {"Authorization": f"Bearer {tokens[rol]}"}

def test_paradas():
    """Probar endpoint de paradas"""
    separador("PRUEBAS DE PARADAS")
    
    # Obtener una ruta primero
    print("\n--- Obtener rutas disponibles ---")
    resp = requests.get(f"{BASE_URL}/rutas", headers=get_headers("dueno"))
    rutas = resp.json()["data"]["items"]
    
    if not rutas:
        print("⚠️  No hay rutas disponibles para crear paradas")
        return False
    
    ruta_id = rutas[0]["id"]
    print(f"✅ Usando ruta: {ruta_id}")
    
    # Crear parada
    print("\n--- Crear parada ---")
    nueva_parada = {
        "ruta_id": ruta_id,
        "nombre": "Parada Principal",
        "latitud": 4.7110,
        "longitud": -74.0721,
        "orden": 1
    }
    
    resp = requests.post(
        f"{BASE_URL}/paradas",
        headers=get_headers("dueno"),
        json=nueva_parada
    )
    
    if resp.status_code == 201:
        parada = resp.json()["data"]
        recursos_creados["parada_id"] = parada["id"]
        print(f"✅ Parada creada: {parada['id']} - {parada['nombre']}")
        
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
        
        return True
    else:
        print(f"❌ Error: {resp.status_code}")
    
    return False

def test_notificaciones():
    """Probar endpoint de notificaciones"""
    separador("PRUEBAS DE NOTIFICACIONES")
    
    padre_id = usuarios["padre"]["id"]
    
    # Crear notificación
    print("\n--- Crear notificación ---")
    nueva_notif = {
        "usuario_id": padre_id,
        "titulo": "El bus está en camino",
        "mensaje": "Tu hijo será recoger en 10 minutos",
        "tipo": "llegada"
    }
    
    resp = requests.post(
        f"{BASE_URL}/notificaciones",
        headers=get_headers("dueno"),
        json=nueva_notif
    )
    
    if resp.status_code == 201:
        notif = resp.json()["data"]
        recursos_creados["notif_id"] = notif["id"]
        print(f"✅ Notificación creada: {notif['id']}")
        
        # Listar notificaciones como padre
        print("\n--- Listar notificaciones (PADRE) ---")
        resp = requests.get(
            f"{BASE_URL}/notificaciones",
            headers=get_headers("padre")
        )
        if resp.status_code == 200:
            notifs = resp.json()["data"]["items"]
            print(f"✅ Total notificaciones sin leer: {len(notifs)}")
        
        # Marcar como leída
        print("\n--- Marcar notificación como leída ---")
        resp = requests.post(
            f"{BASE_URL}/notificaciones/{notif['id']}/marcar-leida",
            headers=get_headers("padre")
        )
        if resp.status_code == 200:
            print(f"✅ Notificación marcada como leída")
        
        return True
    else:
        print(f"❌ Error: {resp.status_code}")
    
    return False

def test_ubicaciones_gps():
    """Probar endpoint de ubicaciones GPS"""
    separador("PRUEBAS DE UBICACIONES GPS")
    
    # Obtener una sesión primero
    print("\n--- Obtener sesiones activas ---")
    resp = requests.get(f"{BASE_URL}/sesiones", headers=get_headers("conductor"))
    sesiones = resp.json()["data"]["items"]
    
    if not sesiones:
        print("⚠️  No hay sesiones disponibles")
        return False
    
    sesion_id = sesiones[0]["id"]
    print(f"✅ Usando sesión: {sesion_id}")
    
    # Registrar ubicación GPS
    print("\n--- Registrar ubicación GPS ---")
    nueva_ubicacion = {
        "sesion_id": sesion_id,
        "latitud": 4.7110,
        "longitud": -74.0721
    }
    
    resp = requests.post(
        f"{BASE_URL}/ubicaciones-gps",
        headers=get_headers("conductor"),
        json=nueva_ubicacion
    )
    
    if resp.status_code == 201:
        ubicacion = resp.json()["data"]
        recursos_creados["ubicacion_id"] = ubicacion["id"]
        print(f"✅ Ubicación registrada: {ubicacion['id']}")
        
        # Obtener última ubicación
        print("\n--- Obtener última ubicación (actual del bus) ---")
        resp = requests.get(
            f"{BASE_URL}/ubicaciones-gps/sesion/{sesion_id}/ultimo-punto",
            headers=get_headers("conductor")
        )
        if resp.status_code == 200:
            ultima = resp.json()["data"]
            print(f"✅ Última ubicación: ({ultima['latitud']}, {ultima['longitud']})")
        
        # Obtener ruta completa
        print("\n--- Obtener ruta completa de la sesión ---")
        resp = requests.get(
            f"{BASE_URL}/ubicaciones-gps/sesion/{sesion_id}/ruta",
            headers=get_headers("conductor")
        )
        if resp.status_code == 200:
            ruta = resp.json()["data"]
            print(f"✅ Total puntos en la ruta: {ruta['total_puntos']}")
        
        return True
    else:
        print(f"❌ Error: {resp.status_code}")
    
    return False

def test_permisos():
    """Probar restricciones de permisos"""
    separador("PRUEBAS DE PERMISOS")
    
    # Padre intentando crear paradas
    print("\n--- Padre intenta crear parada (debe fallar) ---")
    resp = requests.post(
        f"{BASE_URL}/paradas",
        headers=get_headers("padre"),
        json={"ruta_id": 1, "nombre": "Test", "latitud": 4.7, "longitud": -74.0, "orden": 1}
    )
    if resp.status_code == 403:
        print(f"✅ Acceso denegado correctamente")
    else:
        print(f"❌ Debería estar denegado pero obtuvo {resp.status_code}")
    
    # Conductor intentando registrar ubicación en sesión ajena
    print("\n--- Conductor intenta ubicación fuera de su sesión (validación) ---")
    print(f"⚠️  Verificación manual necesaria en tests avanzados")

if __name__ == "__main__":
    print("\n" + "█" * 60)
    print("PRUEBAS DE NUEVOS ENDPOINTS - ROUTEKIDS")
    print("█" * 60)
    
    try:
        login()
        
        # Ejecutar pruebas
        paradas_ok = test_paradas()
        notifs_ok = test_notificaciones()
        gps_ok = test_ubicaciones_gps()
        test_permisos()
        
        # Resumen
        separador("RESUMEN DE PRUEBAS")
        print(f"✅ Paradas:        {'PASS' if paradas_ok else 'FAIL'}")
        print(f"✅ Notificaciones: {'PASS' if notifs_ok else 'FAIL'}")
        print(f"✅ Ubicaciones GPS: {'PASS' if gps_ok else 'FAIL'}")
        
        print("\n" + "█" * 60)
        print("✅ PRUEBAS COMPLETADAS")
        print("█" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
