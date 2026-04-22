import requests
import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

INSTAGRAM_ACCESS_TOKEN = os.getenv("INSTAGRAM_ACCESS_TOKEN")
INSTAGRAM_ACCOUNT_ID = os.getenv("INSTAGRAM_ACCOUNT_ID")

cloudinary.config(
    cloud_name="dfknmhfgv",
    api_key="867911997743741",
    api_secret="DP0qduWSkjCgISj5pZ5unolJeMc"
)

# Step 1: Upload to Cloudinary
print("Uploading to Cloudinary...")
result = cloudinary.uploader.upload("uploads/test_image.jpg")
public_url = result["secure_url"]
print(f"Public URL: {public_url}")

# Step 2: Create Instagram container
print("Creating Instagram container...")
container = requests.post(
    f"https://graph.instagram.com/v21.0/{INSTAGRAM_ACCOUNT_ID}/media",
    params={
        "image_url": public_url,
        "caption": "Elegance redefined. Our latest piece speaks for itself. #AmyrahLuxe #TestPost",
        "access_token": INSTAGRAM_ACCESS_TOKEN
    },
    timeout=120
)
container_data = container.json()
print(f"Container: {container_data}")

if "id" in container_data:
    print("Publishing...")
    publish = requests.post(
        f"https://graph.instagram.com/v21.0/{INSTAGRAM_ACCOUNT_ID}/media_publish",
        params={
            "creation_id": container_data["id"],
            "access_token": INSTAGRAM_ACCESS_TOKEN
        },
        timeout=120
    )
    print(f"Published: {publish.json()}")
else:
    print("Container creation failed!")