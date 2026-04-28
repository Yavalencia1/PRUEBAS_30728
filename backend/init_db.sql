-- c:\Users\Anahi\PRUEBAS_30728\backend\init_db.sql
-- Script para inicializar la base de datos routekids en PostgreSQL
-- Ejecuta TODO esto en la base 'postgres' (no hay dos pasos)

-- Crear rol/usuario si no existe
CREATE USER IF NOT EXISTS routekids WITH PASSWORD 'routekids';

-- Crear base de datos si no existe
CREATE DATABASE routekids OWNER routekids;

-- Otorgar permisos en la conexión
GRANT CONNECT ON DATABASE routekids TO routekids;
GRANT CREATE ON DATABASE routekids TO routekids;

-- Confirmar creación
SELECT 'Base de datos routekids creada correctamente' as resultado;
