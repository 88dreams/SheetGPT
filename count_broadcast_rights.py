from sqlalchemy import create_engine, text
from src.core.config import settings

def count_records():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text('SELECT COUNT(*) FROM broadcast_rights'))
        return result.scalar()

if __name__ == "__main__":
    count = count_records()
    print(f"Total broadcast rights in database: {count}")
