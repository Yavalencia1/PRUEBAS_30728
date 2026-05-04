# Manual colaborativo de integración y uso - RouteKids

Este documento sirve como guía para que todo el equipo pueda levantar, conectar, probar y ampliar el backend de RouteKids sin romper la estructura del proyecto.

## 1. Objetivo del trabajo en equipo

El proyecto está dividido en 3 fases de entrega:

1. Aplicación de escritorio local.
2. Publicación web cuando la lógica local esté estable.
3. Publicación móvil.

La recomendación es que primero todos trabajen contra el entorno local con Docker, porque así el backend, la base de datos y los tests corren igual en todas las máquinas.

## 2. Tecnologías del proyecto

### Backend

- FastAPI
- SQLAlchemy 2.x con soporte asíncrono
- asyncpg
- Alembic
- Pydantic v2
- JWT con `python-jose`
- Hash de contraseñas con `passlib[bcrypt]`

### Frontend desktop

- Flutter
- Riverpod
- HTTP
- WebSocket channel
- Flutter Map

### Base de datos

- PostgreSQL 15

## 3. Instalaciones necesarias

### Para todo el equipo

- Git
- Docker Desktop
- Docker Compose
- Visual Studio Code

### Para Backend Core y quien ejecute el servidor local sin Docker

- Python 3.11 o superior
- `pip`

### Para Frontend Desktop

- Flutter SDK
- Android Studio o el SDK correspondiente si van a compilar para móvil después
- Para escritorio: habilitar soporte de Windows, macOS o Linux según el sistema

## 4. Variables y conexiones del backend

El proyecto ya está configurado para trabajar con estas rutas y credenciales locales:

- API base local: `http://localhost:9000/api/v1`
- Documentación Swagger: `http://localhost:9000/docs`
- Redoc: `http://localhost:9000/redoc`
- PostgreSQL local: `localhost:5433`
- Usuario DB: `postgres`
- Clave DB: `admin`
- Base de datos: `routekids`

### Variables importantes

- `DATABASE_URL=postgresql+asyncpg://postgres:admin@db:5432/routekids` dentro de Docker
- `SECRET_KEY=voncho`
- `ALGORITHM=HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES=30`
- `REFRESH_TOKEN_EXPIRE_DAYS=7`
- `JWT_ISSUER=routekids`
- `JWT_AUDIENCE=routekids-web`
- `API_V1_PREFIX=/api/v1`
- `CORS_ORIGINS=http://localhost:3000,http://localhost:5000,http://127.0.0.1:3000,http://localhost:9000`

## 5. Cómo levantar el proyecto

### Opción recomendada: Docker

Desde la raíz del proyecto:

```bash
docker-compose up -d --build
```

Eso levanta:

- API en `http://localhost:9000`
- Base de datos en `localhost:5433`

### Verificar estado

```bash
docker-compose ps
```

### Aplicar migraciones

Si hace falta actualizar la base de datos:

```bash
docker-compose exec api alembic upgrade head
```

## 6. Dependencias que debe instalar cada rol

### Backend Core y pruebas de API

Instalar dentro de `backend/` o en el contenedor Docker:

- `fastapi`
- `uvicorn[standard]`
- `sqlalchemy[asyncio]`
- `asyncpg`
- `alembic`
- `pydantic`
- `pydantic-settings`
- `python-dotenv`
- `python-jose[cryptography]`
- `passlib[bcrypt]`
- `bcrypt==3.2.2`
- `email-validator`
- `python-multipart`

### Frontend Desktop

Dentro de `frontend/`:

```bash
flutter pub get
```

Las dependencias clave del frontend son:

- `http`
- `flutter_riverpod`
- `web_socket_channel`
- `flutter_map`
- `latlong2`

## 7. Mapa de rutas del backend

Todas las rutas REST principales están bajo `/api/v1`.

### Autenticación

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

### Usuarios

- `GET /api/v1/usuarios`
- `POST /api/v1/usuarios`
- `GET /api/v1/usuarios/{id}`
- `PUT /api/v1/usuarios/{id}`
- `DELETE /api/v1/usuarios/{id}`

### Recorridos

- `GET /api/v1/recorridos`
- `POST /api/v1/recorridos`
- `GET /api/v1/recorridos/{id}`
- `PUT /api/v1/recorridos/{id}`
- `DELETE /api/v1/recorridos/{id}`

### Alumnos

- `GET /api/v1/alumnos`
- `POST /api/v1/alumnos`
- `GET /api/v1/alumnos/{id}`
- `PUT /api/v1/alumnos/{id}`
- `DELETE /api/v1/alumnos/{id}`

### Rutas

- `GET /api/v1/rutas`
- `POST /api/v1/rutas`
- `GET /api/v1/rutas/{id}`
- `PUT /api/v1/rutas/{id}`
- `DELETE /api/v1/rutas/{id}`

### Sesiones

- `GET /api/v1/sesiones`
- `POST /api/v1/sesiones`
- `GET /api/v1/sesiones/{id}`
- `PUT /api/v1/sesiones/{id}`
- `DELETE /api/v1/sesiones/{id}`
- `POST /api/v1/sesiones/{id}/completar`

### Pagos

- `GET /api/v1/pagos`
- `POST /api/v1/pagos`
- `GET /api/v1/pagos/{id}`
- `PUT /api/v1/pagos/{id}`
- `DELETE /api/v1/pagos/{id}`
- `POST /api/v1/pagos/{id}/marcar-pagado`
- `GET /api/v1/pagos/resumen`
- `GET /api/v1/pagos/por-estado`

### Asistencias

- `GET /api/v1/asistencias`
- `POST /api/v1/asistencias`
- `GET /api/v1/asistencias/{id}`
- `PUT /api/v1/asistencias/{id}`
- `DELETE /api/v1/asistencias/{id}`
- `POST /api/v1/asistencias/{id}/marcar-subida`
- `POST /api/v1/asistencias/{id}/marcar-bajada`

### Paradas

- `GET /api/v1/paradas`
- `POST /api/v1/paradas`
- `GET /api/v1/paradas/{id}`
- `PUT /api/v1/paradas/{id}`
- `DELETE /api/v1/paradas/{id}`

### Notificaciones

- `GET /api/v1/notificaciones`
- `POST /api/v1/notificaciones`
- `GET /api/v1/notificaciones/{id}`
- `PUT /api/v1/notificaciones/{id}`
- `DELETE /api/v1/notificaciones/{id}`
- `POST /api/v1/notificaciones/{id}/marcar-leida`
- `GET /api/v1/notificaciones/stats/sin-leer`

### Ubicaciones GPS

- `GET /api/v1/ubicaciones-gps`
- `POST /api/v1/ubicaciones-gps`
- `GET /api/v1/ubicaciones-gps/{id}`
- `PUT /api/v1/ubicaciones-gps/{id}`
- `DELETE /api/v1/ubicaciones-gps/{id}`
- `GET /api/v1/ubicaciones-gps/sesion/{id}/ruta`
- `GET /api/v1/ubicaciones-gps/sesion/{id}/ultimo-punto`

### Dashboard

- `GET /api/v1/dashboard/...`

### WebSockets

- `ws://localhost:9000/ws/gps/{sesion_id}?token=JWT`
- `ws://localhost:9000/ws/notificaciones/{usuario_id}?token=JWT`

## 8. Reglas de acceso por rol

### Rol 1: Frontend Desktop

Este rol no toca la lógica del backend, pero debe consumirlo correctamente.

Debe conocer:

- URL base del backend
- Cómo enviar el token JWT en cada request
- Cómo conectarse a WebSockets con `token` en query string
- Cómo mostrar errores JSON estándar

### Rol 2: Backend Core

Responsable de:

- autenticación JWT
- filtros por rol
- paginación
- integridad de base de datos
- manejo uniforme de errores

### Rol 3: Real-Time & GPS

Responsable de:

- WebSockets seguros
- guardado de `UbicacionGPS`
- reconexión automática en Flutter
- actualización fluida del bus en el mapa

### Rol 4: Gestión

Responsable de:

- Pagos
- Asistencias
- Notificaciones
- relación de estos módulos con alumnos, sesiones y usuarios

## 9. Qué puede hacer cada rol en el backend

### Administrador

- Ver y administrar casi todo
- Crear y corregir datos de pruebas
- Revisar reportes y estados globales

### Dueño

- Gestionar recorridos, rutas, paradas, sesiones, pagos y notificaciones de su operación
- Ver información filtrada por sus propios datos

### Conductor

- Consultar sus sesiones
- Registrar ubicaciones GPS
- Marcar asistencias durante la operación
- Ver notificaciones asociadas

### Padre

- Consultar sus alumnos, pagos, asistencias y notificaciones propias
- No debe crear rutas, paradas ni sesiones

## 10. Flujo de trabajo recomendado por tarea

### Para el Frontend Desktop

1. Instalar Flutter.
2. Ejecutar `flutter pub get`.
3. Configurar la URL del backend en `http://localhost:9000/api/v1`.
4. Iniciar sesión y guardar el JWT.
5. Enviar el token en el header `Authorization: Bearer <token>`.
6. Consumir listas paginadas usando `page` y `page_size`.

### Para el Backend Core

1. Levantar Docker.
2. Revisar `backend/app/main.py` para confirmar routers.
3. Agregar nuevas rutas siguiendo el patrón de respuesta estándar.
4. Correr migraciones con Alembic.
5. Validar permisos con `require_roles(...)`.

### Para Real-Time & GPS

1. Conectar el WebSocket con token en query string.
2. Validar rol antes de aceptar eventos críticos.
3. Guardar cada posición en `UbicacionGPS`.
4. Reemitir eventos solo a conexiones autorizadas.

### Para Gestión

1. Crear o revisar tablas y endpoints de pagos/asistencias.
2. Validar qué rol puede crear, editar o consultar.
3. Asegurar que las notificaciones reflejen eventos reales.

## 11. Convenciones de integración

### En backend

- Usar respuestas JSON estandarizadas
- No devolver cuerpos en `204 No Content`
- Validar siempre relaciones entre tablas antes de insertar
- Mantener paginación en listados grandes

### En frontend

- No asumir que una lista viene completa
- Respetar `total`, `page`, `page_size`, `total_pages`
- Manejar errores del backend mostrando el mensaje devuelto
- En WebSockets, reconectar si la conexión cae

## 12. Cómo probar que todo funciona

### Prueba rápida del backend

1. Levantar Docker.
2. Verificar `http://localhost:9000/docs`.
3. Hacer login desde Swagger o Postman.
4. Probar un `GET` de cada recurso.
5. Crear datos en este orden si hace falta:
   - recorrido
   - ruta
   - sesión
   - paradas
   - ubicación GPS
   - notificación
   - pago
   - asistencia

### Script de validación

En la raíz del proyecto existe un script de pruebas completo:

- `test_completo.py`

Ese script ya valida:

- login
- recorridos
- rutas
- sesiones
- paradas
- notificaciones
- ubicaciones GPS

## 13. Recomendaciones para el equipo

- Trabajen todos contra el mismo contrato de API.
- Antes de tocar frontend, confirmen que el endpoint devuelve el JSON esperado.
- Antes de tocar backend, revisen si existe una migración pendiente.
- Antes de crear un endpoint nuevo, respeten el patrón de permisos y errores ya usado.
- Si una tarea afecta a más de un rol, anótenla en revisión cruzada con el resto del equipo.

## 14. Nota de entorno

En este repositorio, la clave secreta del backend ya está definida como:

```env
SECRET_KEY=voncho
```

Eso debe mantenerse igual mientras el equipo esté trabajando sobre el entorno compartido actual.

## 15. Archivos clave para revisar

- [backend/app/main.py](backend/app/main.py)
- [docker-compose.yml](docker-compose.yml)
- [backend/requirements.txt](backend/requirements.txt)
- [frontend/pubspec.yaml](frontend/pubspec.yaml)
- [test_completo.py](test_completo.py)

## 16. Siguiente paso sugerido

Si el equipo quiere, el siguiente documento útil sería un manual corto por rol, por ejemplo:

- guía del frontend desktop
- guía del backend core
- guía de WebSockets y GPS
- guía de pagos y asistencias
