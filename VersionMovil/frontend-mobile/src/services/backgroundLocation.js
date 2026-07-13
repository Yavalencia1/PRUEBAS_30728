/**
 * backgroundLocation.js — Desarrollador 4 (Voncho)
 * ==================================================
 * Servicio de GPS persistente para RouteKids Mobile.
 *
 * Utiliza expo-location y expo-task-manager para registrar una
 * tarea de fondo que captura coordenadas GPS incluso con la pantalla
 * bloqueada y las transmite via WebSocket al backend FastAPI.
 *
 * DEPENDENCIAS REQUERIDAS (instalar en el proyecto Expo):
 *   npx expo install expo-location expo-task-manager
 *
 * PERMISOS (agregar en app.json):
 *   Android: "ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION", "FOREGROUND_SERVICE"
 *   iOS: "NSLocationWhenInUseUsageDescription", "NSLocationAlwaysUsageDescription"
 *        "UIBackgroundModes": ["location"]
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import ConductorWebSocket from './websocket';

// Nombre unico de la tarea de fondo registrada con TaskManager
const BACKGROUND_LOCATION_TASK = 'ROUTEKIDS_BACKGROUND_LOCATION';

// Intervalo minimo entre actualizaciones GPS en segundo plano (metros)
const DISTANCE_INTERVAL = 10; // metros

// Intervalo de tiempo minimo entre actualizaciones (ms)
const TIME_INTERVAL = 3000; // 3 segundos

// ─── Registro de la tarea de fondo ───────────────────────────────────────────
// IMPORTANTE: Esta definicion DEBE estar en el nivel superior del modulo
// (fuera de cualquier componente o funcion), para que TaskManager pueda
// registrarla correctamente antes de que la app se inicialice.

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  if (error) {
    console.error('[GPS BG] Error en tarea de fondo:', error.message);
    return;
  }

  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[locations.length - 1]; // Tomar la mas reciente
      const { latitude, longitude } = location.coords;

      console.log(`[GPS BG] Nueva coordenada: lat=${latitude}, lng=${longitude}`);

      // Enviar via WebSocket al backend
      const sent = ConductorWebSocket.sendLocation(latitude, longitude);
      if (!sent) {
        console.warn('[GPS BG] WebSocket no conectado, coordenada no enviada.');
      }
    }
  }
});

// ─── Funciones de gestion de permisos ────────────────────────────────────────

/**
 * Solicita todos los permisos necesarios de ubicacion.
 * Primero solicita permisos en primer plano, luego en segundo plano.
 *
 * @returns {Promise<boolean>} true si se obtuvieron TODOS los permisos
 */
async function requestLocationPermissions() {
  // Paso 1: Solicitar permiso en primer plano (requerido antes del background)
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();

  if (fgStatus !== 'granted') {
    console.warn('[GPS] Permiso de ubicacion en primer plano denegado.');
    return false;
  }

  // Paso 2: Solicitar permiso en segundo plano
  // En iOS esto abre un dialogo adicional preguntando "Siempre permitir"
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

  if (bgStatus !== 'granted') {
    console.warn(
      '[GPS] Permiso de ubicacion en segundo plano denegado. ' +
      'El GPS puede detenerse al bloquear la pantalla.'
    );
    // En este caso seguimos, pero con limitaciones
    return false;
  }

  console.log('[GPS] Permisos de ubicacion concedidos (primer plano + segundo plano).');
  return true;
}

/**
 * Verifica si ya se tienen los permisos necesarios sin pedirlos.
 * @returns {Promise<{foreground: boolean, background: boolean}>}
 */
async function checkLocationPermissions() {
  const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
  const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();

  return {
    foreground: fgStatus === 'granted',
    background: bgStatus === 'granted',
  };
}

// ─── Control del servicio GPS ─────────────────────────────────────────────────

/**
 * Inicia el servicio de GPS persistente en segundo plano.
 *
 * Flujo:
 * 1. Verifica/solicita permisos de ubicacion
 * 2. Detiene cualquier tarea previa (si existe)
 * 3. Inicia la tarea de fondo con expo-location
 *
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function startBackgroundLocation() {
  try {
    // Verificar permisos
    const permisos = await checkLocationPermissions();

    if (!permisos.foreground) {
      const granted = await requestLocationPermissions();
      if (!granted) {
        return {
          success: false,
          error:
            'No se pudieron obtener los permisos de ubicacion necesarios. ' +
            'Ve a Configuracion > Aplicaciones > RouteKids > Permisos > Ubicacion y selecciona "Siempre".',
        };
      }
    }

    // Detener tarea previa si ya estaba corriendo
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
      .catch(() => false);

    if (isRunning) {
      console.log('[GPS] Tarea de fondo ya activa, reiniciando...');
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }

    // Iniciar actualizaciones de ubicacion en segundo plano
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: DISTANCE_INTERVAL,
      timeInterval: TIME_INTERVAL,
      // Android: muestra una notificacion persistente (requerido por el SO)
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'RouteKids — GPS Activo',
        notificationBody: 'Transmitiendo ubicacion del bus escolar en tiempo real.',
        notificationColor: '#4F46E5', // Color indigo del tema RouteKids
      },
      // iOS: opciones de actividad
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: false,
    });

    console.log('[GPS] Servicio de ubicacion en segundo plano INICIADO.');
    return { success: true, error: null };
  } catch (err) {
    console.error('[GPS] Error al iniciar servicio de fondo:', err);
    return { success: false, error: err.message || 'Error desconocido al iniciar GPS.' };
  }
}

/**
 * Detiene el servicio de GPS en segundo plano.
 * Llamar cuando el conductor termina la ruta.
 *
 * @returns {Promise<void>}
 */
async function stopBackgroundLocation() {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
      .catch(() => false);

    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('[GPS] Servicio de ubicacion en segundo plano DETENIDO.');
    } else {
      console.log('[GPS] El servicio ya estaba detenido.');
    }
  } catch (err) {
    console.error('[GPS] Error al detener servicio de fondo:', err);
  }
}

/**
 * Verifica si el servicio de GPS en segundo plano esta activo.
 * @returns {Promise<boolean>}
 */
async function isBackgroundLocationRunning() {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

/**
 * Obtiene la posicion GPS actual del dispositivo (una sola vez).
 * Util para obtener la ubicacion inicial antes de iniciar el servicio de fondo.
 *
 * @returns {Promise<{lat: number, lng: number}|null>}
 */
async function getCurrentPosition() {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };
  } catch (err) {
    console.error('[GPS] Error obteniendo posicion actual:', err);
    return null;
  }
}

// ─── Exportaciones ────────────────────────────────────────────────────────────

export {
  BACKGROUND_LOCATION_TASK,
  startBackgroundLocation,
  stopBackgroundLocation,
  isBackgroundLocationRunning,
  requestLocationPermissions,
  checkLocationPermissions,
  getCurrentPosition,
};
