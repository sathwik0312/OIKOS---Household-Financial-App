# OIKOS — Household Financial AI

The financial nervous system of your household. A conversational AI that knows your family's complete financial reality through Plaid and orchestrates real-world decisions.

---

## Project Structure

```
oikos/
├── frontend/     # Next.js app (React, TypeScript, Tailwind v4)
├── backend/      # FastAPI (Python)
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- API keys: Clerk, Plaid (sandbox)

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Copy `.env` and fill in your API keys:
```bash
# backend/.env
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
PLAID_CLIENT_ID=...
PLAID_SECRET=...       # Use Sandbox secret
PLAID_ENV=sandbox
DATABASE_URL=sqlite:///./oikos.db
FRONTEND_URL=http://localhost:3000
```

Start the backend:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Copy `.env.local` and fill in your keys:
```bash
# frontend/.env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Plaid Sandbox Test Credentials

When Plaid Link opens:
- **Username**: `user_good`
- **Password**: `pass_good`

---

## API Keys Required

| Service | Where to Get |
|---------|-------------|
| Clerk | [clerk.com](https://clerk.com) — Auth |
| Plaid | [dashboard.plaid.com](https://dashboard.plaid.com) — Use Sandbox mode |
| Gemini | [aistudio.google.com](https://aistudio.google.com) — PRD-02 |
| Amadeus | [developers.amadeus.com](https://developers.amadeus.com) — PRD-03 |
| Yelp | [fusion.yelp.com](https://fusion.yelp.com) — PRD-03 |

---

## Build Sections

| # | PRD | Description | Status |
|---|-----|-------------|--------|
| 1 | PRD-01 | Foundation, Auth, Plaid, Dashboard | ✅ Built |
| 2 | PRD-02 | Gemini AI Orchestrator | 🔜 Next |
| 3 | PRD-03 | Trip Planner (Amadeus + Yelp) | 🔜 |
| 4 | PRD-04 | Budget Recovery Mode | 🔜 |
| 5 | PRD-05 | Family Sync (Calendar + Twilio) | 🔜 |
