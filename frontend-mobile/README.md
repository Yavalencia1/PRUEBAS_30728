# RouteKids Mobile — Frontend React Native (Expo)

Carpeta del frontend móvil migrado de Flutter a React Native con Expo.

> **Estado actual:** Expo **SDK 54** (React 19 / React Native 0.78). Cliente HTTP con **Axios** + refresco automático de JWT, tokens en **expo-secure-store**, y tema de diseño centralizado en `src/theme/theme.js`. El host del backend se auto-detecta (IP LAN en Expo Go) desde `src/config.js`.

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

## Dependencias (Expo SDK 54)

Todas las dependencias ya están en `package.json`. Solo instala:

```bash
npm install
```

Paquetes clave: `expo` (SDK 54), `axios`, `expo-secure-store`, `expo-location`,
`expo-task-manager`, `react-native-maps`, `@react-navigation/native`,
`@react-navigation/native-stack`, `@react-navigation/bottom-tabs`.

Para levantar:

```bash
npm start   # Expo Go (escanea el QR)
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
