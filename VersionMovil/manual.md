Manual de ejecución del proyecto RouteKids

1. Requisitos previos

Antes de ejecutar el proyecto, verificar que cada integrante tenga instalado:

Backend
Docker Desktop
Docker Compose
Python 3.12+ (opcional, solo si se ejecuta fuera de Docker)
Aplicación móvil
Node.js 18+
npm
Android Studio
Android SDK
React Native CLI / Expo (según configuración del proyecto)

Además, todos los dispositivos deben estar conectados a la misma red local si se desea probar desde un celular físico.

2. Clonar el repositorio

Descargar el proyecto:

git clone <URL_DEL_REPOSITORIO>

Ingresar al proyecto:

cd Routekids_V3.0.1

La estructura esperada es:

Routekids_V3.0.1
│
├── backend
│
└── mobile 3. Configuración del Backend

Ingresar a la carpeta backend:

cd backend

Crear o verificar el archivo .env.

Ejemplo:

APP_NAME=RouteKids
APP_ENV=development
APP_DEBUG=true

SECRET_KEY=JADE2307

DATABASE_URL=postgresql+asyncpg://postgres:admin@db:5432/routekids 4. Levantar servicios con Docker

Desde la carpeta donde está el docker-compose.yml ejecutar:

docker compose up --build

Se levantarán:

PostgreSQL
API FastAPI

Cuando termine correctamente, el backend estará disponible en:

http://localhost:8000

o desde otros dispositivos de la red:

http://IP_DEL_EQUIPO:8000 5. Configuración de IP del Backend (IMPORTANTE)

La aplicación móvil consume el backend mediante una IP fija.

Actualmente está configurada como:

http://192.168.100.11:8000/api/v1

Si otro integrante ejecuta el backend desde su computador, debe cambiar esta dirección.

Archivo:

mobile/src/services/api.js

Modificar:

const API_BASE_URL = 'http://192.168.100.11:8000/api/v1';

Por la IP del computador donde corre Docker:

Ejemplo:

const API_BASE_URL = 'http://192.168.1.50:8000/api/v1';

Para conocer la IP:

Windows:

ipconfig

Buscar:

Dirección IPv4 6. Probar conexión del Backend

Desde un navegador ingresar:

http://IP_DEL_EQUIPO:8000/docs

Ejemplo:

http://192.168.100.11:8000/docs

Debe aparecer Swagger UI de FastAPI.

Si no carga:

Revisar que Docker esté ejecutándose.
Revisar que ambos equipos estén en la misma red.
Revisar firewall de Windows. 7. Ejecutar aplicación móvil

Ingresar:

cd mobile

Instalar dependencias:

npm install

Limpiar caché:

npm start -- --reset-cache

o:

npx react-native start --reset-cache 8. Ejecutar en Android

Con un emulador:

npx react-native run-android

Con dispositivo físico:

Activar:

Opciones de desarrollador.
Depuración USB.

Luego:

adb devices

Verificar que aparezca el dispositivo.

Ejecutar:

npx react-native run-android 9. Base de datos

Para ingresar a PostgreSQL:

Ver contenedores:

docker ps

Ingresar:

docker exec -it <nombre_contenedor_db> psql -U postgres -d routekids

Credenciales:

Usuario:
postgres

Contraseña:
admin

Base:
routekids
