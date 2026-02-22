import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from plaid.api import plaid_api
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

configuration = Configuration(
    host="https://sandbox.plaid.com",
    api_key={
        'clientId': os.getenv("PLAID_CLIENT_ID"),
        'secret': os.getenv("PLAID_SECRET"),
    }
)

api_client = ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

access_token = None

@app.post("/create_link_token")
def create_link_token():
    request = LinkTokenCreateRequest(
        user={"client_user_id": "pig-e-user"},
        client_name="Pig.e",
        products=[Products("transactions")],
        country_codes=[CountryCode("US")],
        language="en"
    )
    response = client.link_token_create(request)
    return response.to_dict()

@app.post("/exchange_public_token")
def exchange_public_token(public_token: str):
    global access_token
    exchange_response = client.item_public_token_exchange(
        {"public_token": public_token}
    )
    access_token = exchange_response["access_token"]
    return {"status": "connected"}

@app.get("/transactions")
def get_transactions():
    if not access_token:
        raise HTTPException(status_code=400, detail="Bank not connected")

    response = client.transactions_get({
        "access_token": access_token,
        "start_date": "2023-01-01",
        "end_date": "2025-12-31"
    })

    return response["transactions"]
