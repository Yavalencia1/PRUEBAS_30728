# RouteKids Mobile — Frontend React Native (Expo)

Carpeta del frontend móvil migrado de Flutter a React Native con Expo.

## Estructura del Proyecto

```
frontend-mobile/
└── src/
    ├── screens/
    │   ├── ConductorScreen.jsx    ← DEV 4 (Voncho) ✅
    │   ├── LoginScreen.jsx        ← DEV 1 (Carlos) - pendiente
    │   ├── RegisterScreen.jsx     ← DEV 1 (Carlos) - pendiente
    │   ├── DashboardScreen.jsx    ← DEV 2 (Jerson) - pendiente
    │   ├── ProfileScreen.jsx      ← DEV 2 (Jerson) - pendiente
    │   └── MapTrackingScreen.jsx  ← DEV 3 (Anahi) - pendiente
    │
    ├── services/
    │   ├── websocket.js           ← DEV 4 (Voncho) ✅
    │   ├── backgroundLocation.js  ← DEV 4 (Voncho) ✅
    │   └── api.js                 ← DEV 1 (Carlos) - pendiente
    │
    ├── context/
    │   └── AuthContext.js         ← DEV 1 (Carlos) - pendiente
    │
    ├── navigation/
    │   └── AppNavigator.jsx       ← DEV 2 (Jerson) - pendiente
    │
    ├── components/
    │   └── MapMarker.jsx          ← DEV 3 (Anahi) - pendiente
    │
    └── hooks/
        └── useLerp.js             ← DEV 3 (Anahi) - pendiente
```

## Dependencias a Instalar (proyecto Expo)

```bash
# Crear proyecto (Dev 1 - Carlos)
npx create-expo-app@latest frontend-mobile --template blank

# GPS en segundo plano (Dev 4 - Voncho)
npx expo install expo-location expo-task-manager

# Mapas OSM (Dev 3 - Anahi)
npx expo install react-native-maps

# Navegación (Dev 2 - Jerson)
npx expo install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs

# Almacenamiento seguro de tokens (Dev 1 - Carlos)
npx expo install expo-secure-store
```

## Archivos del Desarrollador 4 (Voncho)

### `src/services/websocket.js`
Gestor del canal WebSocket del conductor.
- Se conecta a `ws://IP:8000/ws/conductor/{sesion_id}?token=JWT`
- Reconexión automática con backoff exponencial
- `ConductorWebSocket.connect(sesionId, token, callbacks)` — conectar
- `ConductorWebSocket.sendLocation(lat, lng)` — enviar coordenadas GPS
- `ConductorWebSocket.disconnect()` — desconectar al terminar la ruta

### `src/services/backgroundLocation.js`
Servicio GPS persistente (funciona con pantalla bloqueada).
- `startBackgroundLocation()` — iniciar GPS en segundo plano
- `stopBackgroundLocation()` — detener GPS
- `getCurrentPosition()` — obtener posición actual (una sola vez)
- Requiere permisos `ACCESS_BACKGROUND_LOCATION` (Android) / `UIBackgroundModes: location` (iOS)

### `src/screens/ConductorScreen.jsx`
Panel principal del conductor.
- Selección de ruta (chips horizontales)
- Botón "Comenzar Ruta" → crea sesión en backend + conecta WebSocket + inicia GPS
- Botón "Terminar Recorrido" → termina sesión + limpia todo
- Indicadores en tiempo real: WebSocket OK / GPS Activo
- Coordenadas GPS en tiempo real (lat, lng)
- Botón "Simulador de Viaje" para probar en emulador
- Lista de alumnos con botones Subida/Bajada

## Integración entre Desarrolladores

### Dev 4 → Dev 1 (Carlos)
Cuando `AuthContext.js` esté listo, en `ConductorScreen.jsx` reemplazar:
```js
// Línea 50: Mock temporal (borrar)
const useAuth = () => ({ usuario: null, token: null });
```
Por:
```js
import { useAuth } from '../context/AuthContext';
```

### Dev 4 → Dev 2 (Jerson)
En `AppNavigator.jsx`, registrar la pantalla del conductor con guardia de rol:
```jsx
// Solo conductores pueden acceder a ConductorScreen
import ConductorScreen from '../screens/ConductorScreen';

// En el navigator, con guardia de rol:
{usuario?.rol === 'conductor' && (
  <Stack.Screen name="Conductor" component={ConductorScreen} />
)}
```

### Dev 4 → Dev 3 (Anahi)
Los datos GPS enviados por `ConductorScreen.jsx` son los mismos que recibe
`MapTrackingScreen.jsx` via WebSocket en `/ws/gps/{sesion_id}`.
El formato del payload es `{ lat, lng, timestamp }`.

## Prueba de Bloqueo de Pantalla (GPS en Segundo Plano)

1. Iniciar la app como conductor
2. Presionar "Comenzar Ruta"
3. Verificar que el badge "🛰 GPS Activo" aparece
4. Bloquear la pantalla del teléfono
5. En la app del padre (Dev 3), verificar que el bus sigue moviéndose en el mapa

**Android**: El SO muestra una notificación persistente "RouteKids — GPS Activo"
**iOS**: Requiere que en app.json se configure `UIBackgroundModes: ["location"]`

## Compatibilidad con el Backend Existente

Los archivos del Dev 4 son 100% compatibles con el backend FastAPI actual:
- Endpoint WebSocket: `/ws/conductor/{sesion_id}?token={JWT}` ✅
- Payload GPS: `{ lat, lng, timestamp }` (parseado por `_parsear_gps()`) ✅
- API REST: mismos endpoints que el frontend web (`/sesiones/`, `/rutas`, etc.) ✅
