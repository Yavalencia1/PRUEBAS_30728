# c:\Users\Anahi\PRUEBAS_30728\backend\check_databases.py
import asyncio

import asyncpg


async def main() -> None:
    conn = await asyncpg.connect("postgresql://postgres:admin@localhost:5433/postgres")
    rows = await conn.fetch("SELECT datname FROM pg_database ORDER BY datname")
    print("Bases:", ", ".join(row["datname"] for row in rows))
    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
