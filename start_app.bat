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
echo Base de datos y API en linea.
echo ========================================================
echo Abriendo la aplicacion RouteKids...
echo ========================================================

:: Lanza el ejecutable de Flutter si existe. Si estás en modo desarrollo, no hará nada.
if exist "frontend.exe" (
    start "" "frontend.exe"
) else (
    echo [Modo Desarrollo] Backend listo. Ahora puedes ejecutar tu app desde VS Code/Android Studio.
    pause
)
