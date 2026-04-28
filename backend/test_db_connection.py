#!/usr/bin/env python3
# test_db_connection.py - Probar conexión a PostgreSQL

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

async def test_connection():
    # Probar puerto 5433 (que vimos en DBeaver)
    database_url = "postgresql+asyncpg://routekids:routekids@localhost:5433/routekids"
    
    try:
        engine = create_async_engine(database_url, echo=True)
        async with engine.connect() as conn:
            result = await conn.execute("SELECT 1")
            print("✅ Conexión exitosa a puerto 5433")
            return True
    except Exception as e:
        print(f"❌ Error en puerto 5433: {e}")
        print("\nIntentando puerto 5432 (PostgreSQL por defecto)...")
        
        # Probar puerto 5432
        database_url = "postgresql+asyncpg://routekids:routekids@localhost:5432/routekids"
        try:
            engine = create_async_engine(database_url, echo=True)
            async with engine.connect() as conn:
                result = await conn.execute("SELECT 1")
                print("✅ Conexión exitosa a puerto 5432")
                return True
        except Exception as e2:
            print(f"❌ Error en puerto 5432: {e2}")
            return False

if __name__ == "__main__":
    resultado = asyncio.run(test_connection())
    exit(0 if resultado else 1)
