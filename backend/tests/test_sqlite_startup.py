import asyncio
import importlib
import os


def test_init_db_creates_tables_and_demo_user(tmp_path):
    db_path = tmp_path / "routekids-test.db"
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"
    os.environ["SECRET_KEY"] = "test-secret"
    os.environ["APP_ENV"] = "test"

    import app.core.config as config_module
    import app.core.database as database_module

    importlib.reload(config_module)
    importlib.reload(database_module)

    from app.core.database import init_db

    asyncio.run(init_db())

    assert db_path.exists()
