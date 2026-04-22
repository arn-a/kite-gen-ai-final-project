import requests
import os
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
account_id = os.getenv("INSTAGRAM_ACCOUNT_ID")

url = f"https://graph.instagram.com/v21.0/{account_id}"
params = {
    "fields": "id,username",
    "access_token": token
}

response = requests.get(url, params=params)
print(response.json())