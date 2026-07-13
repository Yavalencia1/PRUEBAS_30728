@echo off
echo ========================================================
echo Iniciando el Entorno Backend de RouteKids...
echo ========================================================

:: Inicia el docker-compose en modo silencioso
docker-compose up -d

echo.
echo Esperando a que la base de datos PostgreSQL este lista en el puerto 5433...
:wait_db
timeout /t 2 /nobreak >nul
netstat -an | find "5433" | find "LISTENING" >nul
if errorlevel 1 (
    goto wait_db
)

echo.
echo Iniciando servidor web para el Frontend...
echo ========================================================

:: Inicia el servidor de desarrollo en modo desarrollo (si existe package.json) o el servidor estático en producción
if exist "frontend\package.json" (
    start "RouteKids Frontend (Dev)" cmd /k "cd frontend && npm run dev"
) else (
    start "RouteKids Frontend (Prod)" cmd /c "python -m http.server 3000 --directory frontend"
)

:: Espera 2 segundos y abre la aplicación en el navegador predeterminado
timeout /t 2 /nobreak >nul
start http://localhost:3000


