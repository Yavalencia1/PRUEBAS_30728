# Guía de Desarrollo: Compilación, Pruebas Cypress y Mapa en Tiempo Real

¡Hola equipo! Esta guía contiene las instrucciones necesarias para levantar, compilar y expandir la aplicación **RouteKids** con su nuevo frontend en React, además de recomendaciones técnicas para implementar las pruebas de Cypress y lograr que el autobús se mueva de forma fluida por el mapa (efecto Google Maps).

---

## 🔄 Mapeo Técnico: Migración de Flutter a React

Para facilitar la transición, aquí tienen un mapa de equivalencias de cómo se tradujeron los conceptos y servicios originales de Flutter (Dart) al nuevo frontend en React (JavaScript/HTML/CSS):

| Concepto | En Flutter (Código Original) | En React (Código Nuevo) | Cómo se realizó la traducción |
| :--- | :--- | :--- | :--- |
| **Lenguaje de Programación** | **Dart** (fuertemente tipado, clases orientadas a objetos). | **JavaScript / JSX** (flexible, basado en funciones y componentes). | Tradujimos todas las clases de Flutter a funciones puras de React y archivos de scripts JavaScript (`.js` y `.jsx`). |
| **Diseño y Maquetación (UI)** | Widgets de Material (`Scaffold`, `Row`, `Column`, `Card`, `DataTable`). | **HTML5 Semántico** (`aside`, `header`, `div`, `table`) + **Vanilla CSS**. | Tradujimos los widgets a HTML semántico y definimos los estilos y responsividad en el archivo centralizado `index.css`. |
| **Modelado de Datos** | Clases con deserializadores nativos (ej. `PagoModelo.fromJson(...)`). | **Objetos JSON estándar** de JavaScript. | En JS no se requieren clases estrictas; consumimos los objetos JSON directamente usando `response.json()`. |
| **Gestión de Estado** | **Riverpod** (`FutureProvider`, `StateNotifierProvider`). | **React Hooks** (`useState`, `useEffect` y `useRef`). | Mapeamos el ciclo de vida de los datos utilizando `useEffect` al montar los componentes para cargar APIs en estados locales de React. |
| **Enrutamiento y Vistas** | Navegación imperativa (`Navigator.push`) y condicional en `main.dart`. | **Enrutamiento Condicional** en `App.jsx` + `MainLayout.jsx`. | El layout de navegación lateral se adapta dinámicamente según el rol en sesión (`dueno`, `conductor`, `admin`, `padre`). |
| **Peticiones HTTP (API)** | Librería `http` de Dart. | **Fetch API nativo** encapsulado en `api.js`. | Creamos un envoltorio `fetchApi` que gestiona el token Bearer en `localStorage` y formatea las peticiones. |
| **Mapas Interactivos** | Plugin `flutter_map` con OpenStreetMap. | **Leaflet nativo** inicializado en contenedores HTML. | Inicializamos mapas de OSM con marcadores interactivos mediante la API de Leaflet (`L.map`, `L.marker`). |
| **GPS en Tiempo Real** | Librería `web_socket_channel` en Dart. | **WebSocket API nativa** del navegador. | Conectamos a los WebSockets del backend con `new WebSocket(...)` para el envío y lectura asíncrona de geolocalizaciones. |

---

## 💻 1. Cómo compilar y levantar el proyecto localmente

Para que cualquier integrante del equipo pueda levantar el proyecto en su máquina, deben seguir estos pasos:

### Requisitos previos
Asegúrate de tener instalado:
1. **Node.js** (Versión 18 o superior).
2. **Python** (Versión 3.10 o superior).
3. **Docker Desktop** (para levantar la base de datos de PostgreSQL y la API en contenedores).

### Pasos para levantar en Desarrollo (con Hot-Reload)
1. Abre Docker Desktop.
2. Abre la consola en la carpeta raíz del proyecto `PRUEBAS_30728`.
3. Navega a la carpeta `frontend-web/` e instala las dependencias de Node:
   ```bash
   cd frontend-web
   npm install
   cd ..
   ```
4. Ejecuta el archivo script **`start_app.bat`** de la carpeta raíz. Este script levantará la base de datos y la API en Docker, iniciará el servidor de desarrollo de Vite en el puerto `3000` y abrirá tu navegador automáticamente en `http://localhost:3000`.

### Pasos para compilar y empaquetar para Producción
Si necesitan compilar los archivos estáticos finales y generar el paquete distribuible:
1. Dale doble clic al archivo **`crear_distribucion.bat`** en la carpeta raíz.
2. Este script compilará el frontend web de React (`npm run build`) y creará la carpeta consolidada **`RouteKids_Produccion`** con el compilado web listo, el backend y los scripts.
3. Para probar la carpeta de producción, entra a ella y ejecuta su respectivo `start_app.bat` (servirá los archivos estáticos con Python en el puerto 3000).

---

## 🧪 2. Guía para Pruebas con Cypress

Cypress nos permitirá automatizar y validar las funcionalidades clave del sistema web.

### Instalación de Cypress
Instala Cypress en el directorio `frontend-web/` como dependencia de desarrollo:
```bash
cd frontend-web
npm install cypress --save-dev
```

### Inicialización y Estructura
Abre la interfaz de Cypress por primera vez para crear la estructura de carpetas por defecto:
```bash
npx cypress open
```

### Recomendación de Flujos de Prueba
Recomendamos escribir pruebas de Cypress (`e2e`) para verificar los siguientes flujos clave:
1. **Autenticación:** Probar el registro de usuarios y el inicio de sesión exitoso, verificando que el Token JWT se almacene en `localStorage` y se redirija al layout correcto según el rol.
2. **Creación de Entidades (Dueño):** Crear un Recorrido, luego crear una Ruta y añadir Paradas en el mapa haciendo clicks interactivos.
3. **Flujo de Viaje (Simulación):** Iniciar sesión como conductor, seleccionar una ruta, dar clic en "Iniciar Ruta" y validar que se abra el WebSocket.

### Ejemplo de Test de Cypress (`login.cy.js`)
Pueden tomar este fragmento como base para el test de login:
```javascript
describe('Pruebas de Autenticación RouteKids', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000')
  })

  it('Debería mostrar error con credenciales incorrectas', () => {
    cy.get('input[type="email"]').type('incorrecto@routekids.com')
    cy.get('input[type="password"]').type('password123')
    cy.get('button[type="submit"]').click()
    cy.contains('Credenciales inválidas').should('be.visible')
  })

  it('Debería iniciar sesión correctamente como dueño', () => {
    cy.get('input[type="email"]').type('dueno@routekids.com') // Usa una credencial válida
    cy.get('input[type="password"]').type('admin') 
    cy.get('button[type="submit"]').click()
    cy.contains('¡Bienvenido!').should('be.visible')
    cy.url().should('include', '/dashboard') // O comprobar que carga el Dashboard
  })
})
```

---

## 📍 3. Cómo lograr el movimiento fluido del autobús en el mapa (Efecto Google Maps)

Actualmente, el conductor transmite su ubicación GPS cada 3 segundos por WebSockets, y el cliente que rastrea (`MapaTracking.jsx`) actualiza la posición del autobús. Al ser lecturas discretas en intervalos de tiempo, el autobús se moverá "dando saltos".

Para hacer que el icono del autobús se desplace de manera suave (deslizamiento continuo) como en Google Maps, hay dos enfoques recomendados:

### Enfoque A: Interpolación de Coordenadas en Leaflet (Recomendado y más simple)
En lugar de reposicionar el marcador instantáneamente con `marker.setLatLng(newPos)` al recibir una nueva ubicación por WebSocket, debemos **animar** la transición calculando puntos intermedios entre la coordenada anterior y la nueva.

#### Algoritmo de implementación en `MapaTracking.jsx`:
1. Almacena la última ubicación conocida del autobús (`prevCoords`) y la nueva recibida (`newCoords`).
2. Define un tiempo de animación (ej. 3000 ms, para coincidir con el intervalo de transmisión).
3. Utiliza la API de `requestAnimationFrame` o una librería de interpolación lineal (LERP) para actualizar la posición en pequeños pasos durante ese lapso.

#### Ejemplo de Código de Interpolación para Leaflet:
```javascript
// Función para interpolar linealmente entre dos números
const lerp = (start, end, amt) => (1 - amt) * start + amt * end;

// Animación del marcador del bus en MapaTracking
const animateMarker = (marker, startPos, endPos, durationMs = 3000) => {
  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / durationMs, 1); // Progreso de 0 a 1

    // Calcular coordenadas intermedias
    const lat = lerp(startPos.lat, endPos.lat, progress);
    const lng = lerp(startPos.lng, endPos.lng, progress);

    // Mover marcador
    marker.setLatLng([lat, lng]);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
};
```
> [!TIP]
> Cuando llegue una nueva coordenada por WebSocket en `MapaTracking.jsx`, simplemente llama a `animateMarker(busMarker, busLocation, newLocation, 3000)` y actualiza la ubicación base en el estado al terminar.

---

### Enfoque B: Rotación del icono e Interpolación de Rutas (Para un efecto ultra premium)
Si quieres llevar el mapa al siguiente nivel:
1. **Rotar el autobús según el sentido de marcha:** Calcula el ángulo de rumbo (bearing) entre la coordenada vieja y la nueva para rotar el icono del autobús en esa dirección:
   $$\text{bearing} = \arctan2(\sin(\Delta \lambda) \cdot \cos(\phi_2), \cos(\phi_1) \cdot \sin(\phi_2) - \sin(\phi_1) \cdot \cos(\phi_2) \cdot \cos(\Delta \lambda))$$
   Luego, aplica una transformación CSS al marcador: `transform: rotate(bearingDeg)`.
2. **Ajuste a la Carretera (Snapping):** Si el autobús se sale del mapa por imprecisiones del GPS, pueden enviar los puntos previos a una API de rutas pública (como OSRM o Google Maps Roads API) para obtener la polilínea exacta de la carretera y animar el marcador *sobre* la carretera, en lugar de en línea recta.
