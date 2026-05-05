from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import text
from database import Base, engine
from routers import plaid, household, auth as auth_router, chat as chat_router, trip as trip_router, calendar as calendar_router, notify as notify_router, trip_builder as trip_builder_router

load_dotenv()

# Create all tables
Base.metadata.create_all(bind=engine)

# Non-destructive migrations for SQLite (ALTER TABLE is idempotent via try/except)
_MIGRATIONS = [
    "ALTER TABLE households ADD COLUMN demo_scenario VARCHAR",
    "ALTER TABLE users ADD COLUMN phone_number VARCHAR",
    "ALTER TABLE users ADD COLUMN notify_via VARCHAR",
]
with engine.connect() as conn:
    for stmt in _MIGRATIONS:
        try:
            conn.execute(text(stmt))
            conn.commit()
        except Exception:
            pass  # Column already exists — safe to ignore

app = FastAPI(title="OIKOS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plaid.router)
app.include_router(household.router)
app.include_router(auth_router.router)
app.include_router(chat_router.router)
app.include_router(trip_router.router)
app.include_router(calendar_router.router)
app.include_router(notify_router.router)
app.include_router(trip_builder_router.router)


@app.get("/")
def root():
    return {"status": "OIKOS API running"}


@app.get("/health")
def health():
    return {"status": "ok"}
