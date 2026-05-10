# Guía de Producción: RouteKids App

Este documento es un resumen de la configuración de producción para tu aplicación RouteKids.

## 1. Persistencia de la Base de Datos
Tu archivo `docker-compose.yml` está configurado para guardar los datos de PostgreSQL localmente. 
* El volumen está apuntando a la carpeta `./postgres_data`.
* **IMPORTANTE:** Nunca borres la carpeta `postgres_data` de tu carpeta de Producción, o perderás todos los usuarios registrados y la información de la aplicación.

## 2. Orquestador de Arranque (`start_app.bat`)
Creamos un archivo llamado `start_app.bat`. Este script hace el trabajo pesado:
1. Levanta Docker Compose de manera silenciosa.
2. Espera a que el puerto de la base de datos (5433) esté listo.
3. Abre el ejecutable de tu aplicación Flutter automáticamente.

## 3. ¿Cómo hacer cambios en el código?
Recuerda que **NUNCA** debes modificar el código dentro de la carpeta `RouteKids_Produccion`.
Si quieres hacer cambios, sigue estos pasos:
1. Modifica el código en tu proyecto principal (`PRUEBAS_30728`) desde VS Code.
2. Prueba tus cambios en modo Debug local.
3. Abre la terminal en la carpeta `frontend` y ejecuta:
   `flutter build windows`
4. Ve a la carpeta principal (`PRUEBAS_30728`) y dale doble clic al archivo **`crear_distribucion.bat`**.
5. ¡Listo! Tu carpeta `RouteKids_Produccion` se habrá actualizado automáticamente con los nuevos cambios (y sin borrar tu base de datos).

## 4. Diferencia entre Entornos (ApiConfig)
Creamos una clase en `frontend/lib/core/config/api_config.dart`.
Esta clase detecta automáticamente si estás trabajando en tu computadora (Debug) o si el cliente ya está usando la app terminada (Release).
* Las URLs de tu código usan `${ApiConfig.baseUrl}` en lugar de `localhost`.
