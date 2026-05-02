#!/usr/bin/env python3
"""
Script de prueba completo para todos los endpoints del backend
Incluye pruebas de rutas, sesiones, pagos y asistencias
"""

import requests
import json
import os
from datetime import date, timedelta

# Detectar si estamos en Docker o localmente
if os.path.exists("/.dockerenv"):
    # Estamos en Docker
    BASE_URL = "http://localhost:8000/api/v1"
    print(f"✅ Detectado Docker - Usando {BASE_URL}")
else:
    # Estamos localmente
    BASE_URL = "http://localhost:9000/api/v1"
    print(f"✅ Usando URL local: {BASE_URL}")

# Tokens globales para usar en las pruebas
tokens = {}
usuarios = {}

def separador(titulo):
    """Imprime un separador visual"""
    print("\n" + "=" * 60)
    print(f"  {titulo}")
    print("=" * 60)

def prueba_login():
    """Probar login y obtener tokens para cada rol"""
    global tokens, usuarios
    
    separador("PASO 1: LOGIN Y OBTENER TOKENS")
    
    roles_credenciales = {
        "padre": ("padre@test.com", "password123"),
        "conductor": ("conductor@test.com", "password123"),
        "dueno": ("dueno@test.com", "password123"),
        "admin": ("admin@test.com", "password123"),
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
                print(f"✅ {rol.upper()}: Token obtenido")
            else:
                print(f"❌ {rol.upper()}: {data.get('error', {}).get('mensaje', 'Error desconocido')}")
        else:
            print(f"❌ {rol.upper()}: Error HTTP {resp.status_code}")

def get_headers(rol="dueno"):
    """Obtener headers con el token del rol especificado"""
    return {"Authorization": f"Bearer {tokens[rol]}"}

def prueba_rutas():
    """Probar endpoints de rutas"""
    separador("PASO 2: PRUEBAS DE RUTAS")
    
    # Listar rutas (dueno)
    print("\n--- Listar rutas (DUENO) ---")
    resp = requests.get(f"{BASE_URL}/rutas", headers=get_headers("dueno"))
    if resp.status_code == 200:
        data = resp.json()
        total = data['data']['pagination']['total'] if 'pagination' in data['data'] else 0
        print(f"✅ Acceso permitido - Total rutas: {total}")
    else:
        print(f"❌ Error: {resp.status_code}")
    
    # Crear ruta (dueno)
    print("\n--- Crear ruta (DUENO) ---")
    
    # Primero obtener un recorrido del dueno
    resp = requests.get(f"{BASE_URL}/recorridos", headers=get_headers("dueno"))
    recorridos = resp.json()["data"]["items"]
    
    if recorridos:
        recorrido_id = recorridos[0]["id"]
        nueva_ruta = {
            "nombre": "Ruta Prueba 1",
            "descripcion": "Ruta de prueba creada automáticamente",
            "tipo": "ida_vuelta",
            "recorrido_id": recorrido_id
        }
        
        resp = requests.post(
            f"{BASE_URL}/rutas",
            headers=get_headers("dueno"),
            json=nueva_ruta
        )
        
        if resp.status_code == 201:
            ruta_data = resp.json()["data"]
            print(f"✅ Ruta creada: {ruta_data['id']} - {ruta_data['nombre']}")
            return ruta_data["id"]
        else:
            print(f"❌ Error al crear ruta: {resp.status_code}")
    else:
        print("⚠️  No hay recorridos disponibles para crear una ruta")
    
    return None

def prueba_sesiones(ruta_id):
    """Probar endpoints de sesiones"""
    separador("PASO 3: PRUEBAS DE SESIONES")
    
    if not ruta_id:
        print("⚠️  No se puede crear sesión sin ruta_id")
        return None
    
    # Crear sesión
    print("\n--- Crear sesión (DUENO) ---")
    
    # Usar el conductor de prueba
    conductor_id = usuarios["conductor"]["id"]
    
    nueva_sesion = {
        "ruta_id": ruta_id,
        "conductor_id": conductor_id
    }
    
    resp = requests.post(
        f"{BASE_URL}/sesiones",
        headers=get_headers("dueno"),
        json=nueva_sesion
    )
    
    if resp.status_code == 201:
        sesion_data = resp.json()["data"]
        print(f"✅ Sesión creada: {sesion_data['id']} - Estado: {sesion_data['estado']}")
        
        # Listar sesiones como conductor
        print("\n--- Listar sesiones (CONDUCTOR) ---")
        resp = requests.get(f"{BASE_URL}/sesiones", headers=get_headers("conductor"))
        if resp.status_code == 200:
            sesiones = resp.json()["data"]["items"]
            print(f"✅ Conductor ve {len(sesiones)} sesiones")
        
        return sesion_data["id"]
    else:
        print(f"❌ Error al crear sesión: {resp.status_code}")
    
    return None

def prueba_pagos():
    """Probar endpoints de pagos"""
    separador("PASO 4: PRUEBAS DE PAGOS")
    
    padre_id = usuarios["padre"]["id"]
    
    # Obtener un alumno del padre
    print("\n--- Obtener alumnos del padre ---")
    resp = requests.get(f"{BASE_URL}/alumnos", headers=get_headers("padre"))
    alumnos = resp.json()["data"]["items"]
    
    if not alumnos:
        print("⚠️  El padre no tiene alumnos asignados")
        return None
    
    alumno_id = alumnos[0]["id"]
    print(f"✅ Usando alumno: {alumno_id}")
    
    # Crear pago
    print("\n--- Crear pago (DUENO) ---")
    
    nuevo_pago = {
        "alumno_id": alumno_id,
        "padre_id": padre_id,
        "monto": 50.00,
        "fecha_vencimiento": str(date.today() + timedelta(days=30)),
        "estado": "pendiente"
    }
    
    resp = requests.post(
        f"{BASE_URL}/pagos",
        headers=get_headers("dueno"),
        json=nuevo_pago
    )
    
    if resp.status_code == 201:
        pago_data = resp.json()["data"]
        print(f"✅ Pago creado: {pago_data['id']} - Estado: {pago_data['estado']}")
        
        # Ver pago como padre
        print("\n--- Ver pago como PADRE ---")
        resp = requests.get(f"{BASE_URL}/pagos/{pago_data['id']}", headers=get_headers("padre"))
        if resp.status_code == 200:
            print(f"✅ Padre puede ver el pago")
        
        # Marcar como pagado
        print("\n--- Marcar pago como pagado (PADRE) ---")
        resp = requests.post(
            f"{BASE_URL}/pagos/{pago_data['id']}/marcar-pagado",
            headers=get_headers("padre"),
            params={"referencia": "TRANS-12345"}
        )
        
        if resp.status_code == 200:
            print(f"✅ Pago marcado como pagado")
        
        return pago_data["id"]
    else:
        print(f"❌ Error al crear pago: {resp.status_code}")
    
    return None

def prueba_asistencias(sesion_id):
    """Probar endpoints de asistencias"""
    separador("PASO 5: PRUEBAS DE ASISTENCIAS")
    
    if not sesion_id:
        print("⚠️  No se puede crear asistencia sin sesion_id")
        return
    
    # Obtener un alumno
    resp = requests.get(f"{BASE_URL}/alumnos", headers=get_headers("padre"))
    alumnos = resp.json()["data"]["items"]
    
    if not alumnos:
        print("⚠️  No hay alumnos disponibles")
        return
    
    alumno_id = alumnos[0]["id"]
    
    # Crear asistencia
    print("\n--- Crear asistencia (CONDUCTOR) ---")
    
    nueva_asistencia = {
        "sesion_id": sesion_id,
        "alumno_id": alumno_id,
        "estado": "ausente"
    }
    
    resp = requests.post(
        f"{BASE_URL}/asistencias",
        headers=get_headers("conductor"),
        json=nueva_asistencia
    )
    
    if resp.status_code == 201:
        asistencia_data = resp.json()["data"]
        print(f"✅ Asistencia creada: {asistencia_data['id']} - Estado: {asistencia_data['estado']}")
        
        # Marcar subida
        print("\n--- Marcar subida (CONDUCTOR) ---")
        resp = requests.post(
            f"{BASE_URL}/asistencias/{asistencia_data['id']}/marcar-subida",
            headers=get_headers("conductor")
        )
        
        if resp.status_code == 200:
            print(f"✅ Subida marcada")
        
        # Marcar bajada
        print("\n--- Marcar bajada (CONDUCTOR) ---")
        resp = requests.post(
            f"{BASE_URL}/asistencias/{asistencia_data['id']}/marcar-bajada",
            headers=get_headers("conductor")
        )
        
        if resp.status_code == 200:
            print(f"✅ Bajada marcada")
    else:
        print(f"❌ Error al crear asistencia: {resp.status_code}")

def prueba_permisos():
    """Probar restricciones de permisos"""
    separador("PASO 6: PRUEBAS DE PERMISOS")
    
    # Padre intentando acceder a rutas
    print("\n--- Padre intenta acceder a rutas (debe fallar) ---")
    resp = requests.get(f"{BASE_URL}/rutas", headers=get_headers("padre"))
    if resp.status_code == 403:
        print(f"✅ Acceso denegado correctamente")
    else:
        print(f"❌ Debería estar denegado pero obtuvo {resp.status_code}")
    
    # Conductor intentando acceder a usuarios
    print("\n--- Conductor intenta acceder a usuarios (debe fallar) ---")
    resp = requests.get(f"{BASE_URL}/usuarios", headers=get_headers("conductor"))
    if resp.status_code == 403:
        print(f"✅ Acceso denegado correctamente")
    else:
        print(f"❌ Debería estar denegado pero obtuvo {resp.status_code}")

if __name__ == "__main__":
    print("\n" + "█" * 60)
    print("PRUEBAS COMPLETAS DEL BACKEND - ROUTEKIDS")
    print("█" * 60)
    
    try:
        # Ejecutar pruebas en orden
        prueba_login()
        ruta_id = prueba_rutas()
        sesion_id = prueba_sesiones(ruta_id)
        pago_id = prueba_pagos()
        prueba_asistencias(sesion_id)
        prueba_permisos()
        
        separador("✅ PRUEBAS COMPLETADAS EXITOSAMENTE")
        
    except Exception as e:
        print(f"\n❌ Error durante las pruebas: {str(e)}")
        import traceback
        traceback.print_exc()
