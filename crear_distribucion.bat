@echo off
echo ========================================================
echo Preparando tu carpeta final de produccion...
echo ========================================================

set DIST_DIR=RouteKids_Produccion

:: Creamos la carpeta si no existe
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

echo.
echo Copiando aplicacion de escritorio (Frontend)...
xcopy /E /I /Y "frontend\build\windows\x64\runner\Release\*" "%DIST_DIR%\" >nul

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
