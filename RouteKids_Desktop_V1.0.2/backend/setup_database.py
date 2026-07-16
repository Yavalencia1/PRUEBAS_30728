#!/usr/bin/env python3
# setup_database.py - Crear base de datos routekids

import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import StaticPool

async def create_database():
    # Conectar a postgres (base de datos por defecto)
    database_url = "postgresql+asyncpg://postgres:admin@localhost:5433/postgres"
    
    engine = create_async_engine(
        database_url,
        echo=False,
        poolclass=StaticPool,
        isolation_level="AUTOCOMMIT",  # Necesario para CREATE DATABASE
    )
    
    try:
        async with engine.connect() as conn:
            # Verificar si la base de datos ya existe
            result = await conn.execute(
                text("SELECT datname FROM pg_database WHERE datname = 'routekids'")
            )
            exists = result.scalar() is not None
            
            if exists:
                print("✅ Base de datos 'routekids' ya existe")
            else:
                print("Creando base de datos 'routekids'...")
                await conn.execute(text("CREATE DATABASE routekids"))
                print("✅ Base de datos 'routekids' creada correctamente")
            
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    resultado = asyncio.run(create_database())
    exit(0 if resultado else 1)
