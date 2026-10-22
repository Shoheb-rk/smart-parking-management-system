from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database connection URL
# Format: postgresql://username:password@host:port/database_name
# Change 'postgres123' to YOUR PostgreSQL password
DATABASE_URL = "postgresql://postgres:postgres711@localhost:5432/spm"

# Create engine — this is the actual connection to PostgreSQL
# pool_pre_ping=True checks connection is alive before using it
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# SessionLocal — every API request gets its own database session
# autocommit=False means we manually commit changes
# autoflush=False means we control when data is sent to DB
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class — all our database models will inherit from this
Base = declarative_base()

# Dependency function — used in every API endpoint
# It opens a DB session, gives it to the endpoint,
# then closes it automatically when done
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()