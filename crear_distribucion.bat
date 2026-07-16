@echo off
echo ========================================================
echo Preparando tu carpeta final de produccion...
echo ========================================================

set DIST_DIR=RouteKids_Produccion

:: Creamos la carpeta si no existe
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

echo.
echo Compilando aplicacion web (Frontend React)...
cd frontend-web
call npm run build
cd ..
if not exist "%DIST_DIR%\frontend-web" mkdir "%DIST_DIR%\frontend-web"
xcopy /E /I /Y "frontend-web\dist\*" "%DIST_DIR%\frontend-web\" >nul

echo.
echo Copiando servidor (Backend) y Docker...
xcopy /E /I /Y "backend" "%DIST_DIR%\backend" >nul
copy /Y "docker-compose.yml" "%DIST_DIR%\" >nul
copy /Y "start_app.bat" "%DIST_DIR%\" >nul

echo.
echo ========================================================
echo EXITOSO: Distribucion completada!
echo ========================================================
echo.
echo Puedes encontrar tu aplicacion completa y lista para 
echo compartir en la nueva carpeta llamada: RouteKids_Produccion
echo.
pause
