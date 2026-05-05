import os
import httpx
from fastapi import HTTPException, Request, Depends
from jose import jwt as jose_jwt, JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session
from database import get_db
from models.household import User
from dotenv import load_dotenv

load_dotenv()

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")

# Simple in-process JWKS cache keyed by issuer URL
_jwks_cache: dict[str, list] = {}


async def _fetch_jwks(issuer: str) -> list:
    if issuer in _jwks_cache:
        return _jwks_cache[issuer]

    jwks_url = f"{issuer}/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(jwks_url)

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Could not fetch Clerk JWKS")

    keys = resp.json().get("keys", [])
    _jwks_cache[issuer] = keys
    return keys


async def verify_clerk_token(request: Request) -> str:
    """
    Verifies a Clerk session JWT using their JWKS endpoint.
    Returns the Clerk user ID (sub claim).
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.split(" ", 1)[1]

    # Decode header + claims without verification to find issuer and key ID
    try:
        unverified_header = jose_jwt.get_unverified_header(token)
        unverified_claims = jose_jwt.get_unverified_claims(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Malformed token: {e}")

    issuer = unverified_claims.get("iss", "")
    if not issuer:
        raise HTTPException(status_code=401, detail="Token missing issuer (iss)")

    kid = unverified_header.get("kid")
    keys = await _fetch_jwks(issuer)

    # Find the matching key by kid
    signing_key = next((k for k in keys if k.get("kid") == kid), None)
    if not signing_key:
        # Bust cache and retry once (key rotation)
        _jwks_cache.pop(issuer, None)
        keys = await _fetch_jwks(issuer)
        signing_key = next((k for k in keys if k.get("kid") == kid), None)

    if not signing_key:
        raise HTTPException(status_code=401, detail="Signing key not found in JWKS")

    # Verify the JWT
    try:
        payload = jose_jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk doesn't set aud by default
        )
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {e}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing sub claim")

    return user_id


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    user_id = await verify_clerk_token(request)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Call /api/auth/sync-user first.")
    return user
