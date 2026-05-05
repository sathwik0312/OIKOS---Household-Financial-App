import os
from datetime import date
from typing import Optional
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.transactions_refresh_request import TransactionsRefreshRequest
from plaid.model.country_code import CountryCode
from plaid.model.products import Products
from dotenv import load_dotenv

load_dotenv()

PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")
PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")

_ENV_MAP = {
    "sandbox": plaid.Environment.Sandbox,
    "production": plaid.Environment.Production,
}

configuration = plaid.Configuration(
    host=_ENV_MAP.get(PLAID_ENV, plaid.Environment.Sandbox),
    api_key={
        "clientId": PLAID_CLIENT_ID,
        "secret": PLAID_SECRET,
    },
)

api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)


def _txn_to_dict(txn) -> dict:
    """
    Plaid v39 returns typed model objects, not plain dicts.
    This normalizes a transaction into a plain dict regardless of type.
    """
    if isinstance(txn, dict):
        return txn
    if hasattr(txn, "to_dict"):
        return txn.to_dict()
    # Fallback: read known attributes directly
    return {
        "transaction_id": getattr(txn, "transaction_id", None),
        "name": getattr(txn, "name", None),
        "amount": getattr(txn, "amount", 0),
        "date": getattr(txn, "date", None),
        "category": getattr(txn, "category", []) or [],
        "transaction_type": getattr(txn, "transaction_type", None),
        "personal_finance_category": getattr(txn, "personal_finance_category", None),
    }


def create_link_token(user_id: str) -> str:
    request = LinkTokenCreateRequest(
        products=[Products("transactions")],
        client_name="OIKOS",
        country_codes=[CountryCode("US")],
        language="en",
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
    )
    response = client.link_token_create(request)
    return response["link_token"]


def exchange_public_token(public_token: str) -> dict:
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(request)
    return {
        "access_token": response["access_token"],
        "item_id": response["item_id"],
    }


def refresh_transactions(access_token: str) -> None:
    """
    Fires Plaid's /transactions/refresh.
    In Sandbox this forces the item to generate realistic transaction data immediately.
    """
    request = TransactionsRefreshRequest(access_token=access_token)
    client.transactions_refresh(request)


def get_transactions(
    access_token: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> list[dict]:
    """
    Returns transactions as plain dicts for the given date range.
    Falls back to last 90 days if no dates provided.
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        from datetime import timedelta
        start_date = end_date - timedelta(days=90)

    all_transactions: list[dict] = []
    offset = 0

    while True:
        request = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date,
            options=TransactionsGetRequestOptions(count=500, offset=offset),
        )
        response = client.transactions_get(request)

        # Normalize: convert Plaid model objects → plain dicts
        batch = [_txn_to_dict(t) for t in response["transactions"]]
        all_transactions.extend(batch)

        total = response["total_transactions"]
        print(f"[Plaid] Fetched {len(all_transactions)}/{total} transactions "
              f"({start_date} → {end_date})")

        if len(all_transactions) >= total:
            break
        offset += len(batch)
        if not batch:
            break

    return all_transactions
