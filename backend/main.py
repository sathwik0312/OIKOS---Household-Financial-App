import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import text
from database import Base, engine
from routers import plaid, household, auth as auth_router, chat as chat_router, trip as trip_router

load_dotenv()

# Create all tables
Base.metadata.create_all(bind=engine)

# Non-destructive migration: add demo_scenario column if it doesn't exist yet
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE households ADD COLUMN demo_scenario VARCHAR"))
        conn.commit()
    except Exception:
        pass  # Column already exists — safe to ignore

app = FastAPI(title="OIKOS API", version="1.0.0")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plaid.router)
app.include_router(household.router)
app.include_router(auth_router.router)
app.include_router(chat_router.router)
app.include_router(trip_router.router)


@app.get("/")
def root():
    return {"status": "OIKOS API running"}


@app.get("/health")
def health():
    return {"status": "ok"}
