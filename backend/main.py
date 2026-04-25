from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from openai import OpenAI
from google import genai
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
import os
import json
import uuid
import shutil
import base64
import requests as req
from datetime import datetime
from typing import List
from pathlib import Path
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()

# AI Clients
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
GPT_MODEL = "gpt-4o-mini"
GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image"

# Instagram
INSTAGRAM_ACCESS_TOKEN = os.getenv("INSTAGRAM_ACCESS_TOKEN")
INSTAGRAM_ACCOUNT_ID = os.getenv("INSTAGRAM_ACCOUNT_ID")

# Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)
print(f"[CLOUDINARY] Using cloud={os.getenv('CLOUDINARY_CLOUD_NAME')} key={os.getenv('CLOUDINARY_API_KEY')}")

os.makedirs("uploads", exist_ok=True)
os.makedirs("generated", exist_ok=True)


# ══════════════════════════════════════
# JSON FILE STORAGE (persists across restarts)
# ══════════════════════════════════════

DB_FILE = Path("db.json")

def load_db():
    if DB_FILE.exists():
        try:
            data = json.loads(DB_FILE.read_text())
            return data.get("products", {}), data.get("posts", {}), data.get("schedule", {})
        except:
            return {}, {}, {}
    return {}, {}, {}

def save_db():
    DB_FILE.write_text(json.dumps({
        "products": products_db,
        "posts": posts_db,
        "schedule": schedule_db
    }, default=str, indent=2))

products_db, posts_db, schedule_db = load_db()
print(f"[DB] Loaded {len(products_db)} products, {len(posts_db)} posts, {len(schedule_db)} scheduled")


BRAND_INFO = """
Brand: Amyrah Luxe - The Collective
Type: Luxury clothing brand specializing in premium ethnic and fusion wear for women.
Tone: Elegant, aspirational, feminine, sophisticated. Never loud or salesy.
Target Audience: Women aged 18-35 who love fashion, appreciate quality fabric and craftsmanship.
Voice: Speak like a fashion editor at Vogue India - refined, warm, knowledgeable.
"""

IMAGE_TRANSFORM_PROMPT = """Transform this into a premium fashion brand product photograph ready for Instagram. 

CRITICAL RULES:
- Keep the EXACT same garment with all details, embroidery, color and fabric preserved perfectly
- Do NOT add any text, watermarks, brand names, labels, logos, or business cards to the image
- Do NOT place any props ON TOP of or overlapping the garment. All props must be placed BESIDE or AROUND the garment with clear separation
- The garment must be fully visible with no parts hidden or covered

STYLING:
- If it is a kurta or long garment, show it hanging elegantly on a minimal wooden hanger against a clean warm-toned backdrop
- If it is a co-ord set or separates, style as a flat-lay with pieces neatly arranged
- Background: clean, warm, minimal - soft cream wall, natural linen, or light marble
- Lighting: soft natural window light with gentle shadows
- Props: place ONE or TWO small items like dried botanicals or a small ceramic BESIDE the garment, never on top
- No clutter, no text, no branding
- Commercial quality, editorial feel, Instagram-ready"""


# ══════════════════════════════════════
# AUTO-SCHEDULER
# ══════════════════════════════════════

def check_and_publish_scheduled():
    now = datetime.now()
    now_str = now.strftime("%Y-%m-%dT%H:%M")
    
    for post_id, sched in list(schedule_db.items()):
        if sched["status"] != "scheduled":
            continue
        if post_id not in posts_db:
            continue
            
        post = posts_db[post_id]
        if post["status"] != "approved":
            continue
            
        scheduled_time = sched["scheduled_for"][:16]
        
        if scheduled_time <= now_str:
            print(f"[AUTO-PUBLISH] Time to publish post {post_id}!")
            try:
                result = do_publish(post_id)
                if result:
                    print(f"[AUTO-PUBLISH] Successfully published {post_id}!")
                    save_db()
                else:
                    print(f"[AUTO-PUBLISH] Failed to publish {post_id}")
            except Exception as e:
                print(f"[AUTO-PUBLISH] Error publishing {post_id}: {e}")


def do_publish(post_id: str) -> bool:
    post = posts_db[post_id]
    
    image_url = post.get("cloudinary_url", "")
    if not image_url:
        img_path = post.get("image_path", "")
        if img_path and os.path.exists(img_path):
            try:
                result = cloudinary.uploader.upload(img_path)
                image_url = result["secure_url"]
                posts_db[post_id]["cloudinary_url"] = image_url
            except Exception as e:
                print(f"[PUBLISH] Cloudinary upload failed: {e}")
                return False
        else:
            print(f"[PUBLISH] Image file not found: {img_path}")
            return False

    try:
        container = req.post(
            f"https://graph.instagram.com/v21.0/{INSTAGRAM_ACCOUNT_ID}/media",
            params={
                "image_url": image_url,
                "caption": post["caption"],
                "access_token": INSTAGRAM_ACCESS_TOKEN
            },
            timeout=120
        )
        container_data = container.json()
        
        if "id" not in container_data:
            print(f"Container error: {container_data}")
            return False

        publish = req.post(
            f"https://graph.instagram.com/v21.0/{INSTAGRAM_ACCOUNT_ID}/media_publish",
            params={
                "creation_id": container_data["id"],
                "access_token": INSTAGRAM_ACCESS_TOKEN
            },
            timeout=120
        )
        publish_data = publish.json()
        
        if "id" in publish_data:
            posts_db[post_id]["status"] = "published"
            posts_db[post_id]["instagram_id"] = publish_data["id"]
            schedule_db[post_id]["status"] = "published"
            return True
        else:
            print(f"Publish error: {publish_data}")
            return False
    except Exception as e:
        print(f"Publish exception: {e}")
        return False


scheduler = BackgroundScheduler()
scheduler.add_job(check_and_publish_scheduled, 'interval', seconds=30)


@asynccontextmanager
async def lifespan(app):
    scheduler.start()
    print("[SCHEDULER] Auto-publisher started! Checking every 30 seconds.")
    yield
    scheduler.shutdown()


app = FastAPI(title="Amyrahluxe AI Scheduler", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/generated", StaticFiles(directory="generated"), name="generated")


# ══════════════════════════════════════
# UPLOAD PHOTOS
# ══════════════════════════════════════

@app.post("/api/upload-photos")
async def upload_photos(images: List[UploadFile] = File(...)):
    uploaded = []
    for img in images:
        product_id = str(uuid.uuid4())[:8]
        image_path = f"uploads/{product_id}_{img.filename}"
        with open(image_path, "wb") as f:
            shutil.copyfileobj(img.file, f)
        products_db[product_id] = {
            "id": product_id,
            "name": img.filename,
            "image_path": image_path,
            "uploaded_at": datetime.now().isoformat()
        }
        uploaded.append({"id": product_id, "filename": img.filename, "image_path": image_path})
    save_db()
    return {"message": f"Uploaded {len(uploaded)} photos", "products": uploaded}


# ══════════════════════════════════════
# GENERATE CONTENT PLAN
# ══════════════════════════════════════

@app.post("/api/generate-content-plan")
async def generate_content_plan(
    product_ids: str = Form(...),
    brief: str = Form(""),
    num_posts: int = Form(0),
    month: str = Form("")
):
    pids = json.loads(product_ids)
    if not month:
        month = datetime.now().strftime("%Y-%m")
    if num_posts == 0:
        num_posts = len(pids)
    if not pids:
        return {"message": "No products found.", "posts": []}

    image_data = []

    for pid in pids:
        if pid not in products_db:
            continue
        product = products_db[pid]
        img_path = product["image_path"]

        # STEP 1: Transform with Gemini
        print(f"[1/3] Transforming: {img_path}")
        gen_path = img_path
        cloudinary_url = ""
        try:
            with open(img_path, "rb") as f:
                img_bytes = f.read()
            img_b64 = base64.b64encode(img_bytes).decode()
            ext = img_path.rsplit(".", 1)[-1].lower()
            mime = "image/jpeg" if ext in ["jpg", "jpeg"] else f"image/{ext}"

            fresh_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            r = fresh_client.models.generate_content(
                model=GEMINI_IMAGE_MODEL,
                contents=[
                    {"inline_data": {"mime_type": mime, "data": img_b64}},
                    IMAGE_TRANSFORM_PROMPT
                ],
                config={"response_modalities": ["TEXT", "IMAGE"]}
            )
            img_parts = [p for p in r.candidates[0].content.parts if p.inline_data and p.inline_data.data]
            if img_parts:
                gen_path = f"generated/{pid}_professional.png"
                with open(gen_path, "wb") as f:
                    f.write(img_parts[0].inline_data.data)
                cloud_result = cloudinary.uploader.upload(gen_path)
                cloudinary_url = cloud_result["secure_url"]
                print(f"    Transformed + uploaded to Cloudinary")
        except Exception as e:
            print(f"    Transform error: {e}")

        # STEP 2: Analyze with GPT
        print(f"[2/3] Analyzing: {pid}")
        try:
            with open(gen_path, "rb") as f:
                a_bytes = f.read()
            a_b64 = base64.b64encode(a_bytes).decode()
            a_ext = gen_path.rsplit(".", 1)[-1].lower()
            a_mime = "image/jpeg" if a_ext in ["jpg", "jpeg"] else f"image/{a_ext}"

            analysis = openai_client.chat.completions.create(
                model=GPT_MODEL,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:{a_mime};base64,{a_b64}"}},
                        {"type": "text", "text": "Describe this clothing item: garment type, color, fabric, design details, occasion. 2-3 sentences."}
                    ]
                }],
                max_tokens=200
            )
            description = analysis.choices[0].message.content.strip()
        except Exception as e:
            print(f"    Analysis error: {e}")
            description = "A beautiful clothing item from Amyrah Luxe."

        image_data.append({
            "product_id": pid,
            "filename": product["name"],
            "description": description,
            "original_image": img_path,
            "professional_image": gen_path,
            "cloudinary_url": cloudinary_url
        })

    if not image_data:
        return {"message": "No valid products.", "posts": []}

    # STEP 3: Generate captions
    print(f"[3/3] Generating {num_posts} captions...")
    products_context = "\n".join([
        f"Photo {i+1} ({item['filename']}): {item['description']}"
        for i, item in enumerate(image_data)
    ])

    prompt = f"""You are a caption editor for a luxury Indian clothing brand. ONLY respond to requests about editing Instagram captions, post content, hashtags, tone, or scheduling. If the user asks anything unrelated to social media content, respond with: "I can only help with editing your post content. Please ask me about captions, hashtags, tone, or styling."

Edit this Instagram caption:

{BRAND_INFO}

Products:
{products_context}

Brief: {brief if brief else "Balanced mix of content types"}

Create exactly {num_posts} Instagram posts for {month}.

Return JSON array with objects:
- "photo_index": 1-based
- "post_type": "Product Showcase", "Educational", "Catalogue", "Behind the Scenes", or "Styling Tips"
- "caption": engaging opening + 2-3 sentences + call to action + 5-7 hashtags including #AmyrahLuxe
- "day_of_month": spread across the month, post on Tuesday/Wednesday/Thursday/Saturday for best Indian audience engagement. Avoid posting on consecutive days.
- "time": Use these optimal times for Indian Instagram audience: "10:00" for morning engagement, "13:00" for lunch break scrolling, "18:00" for evening peak (BEST for product posts), "20:00" for night browsing (BEST for educational/styling content). Match time to post type.
- "reasoning": one sentence

Return ONLY valid JSON array."""

    try:
        response = openai_client.chat.completions.create(
            model=GPT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
            temperature=0.8
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        posts_plan = json.loads(raw)
        created_posts = []
        colors = ["gold", "blush", "sage", "rose", "cream", "charcoal"]

        for i, item in enumerate(posts_plan):
            post_id = str(uuid.uuid4())[:8]
            photo_idx = item.get("photo_index", 1) - 1
            if photo_idx < 0 or photo_idx >= len(image_data):
                photo_idx = i % len(image_data)

            img_info = image_data[photo_idx]
            day = item.get("day_of_month", (i + 1) * 3)
            time_str = item.get("time", "10:00")
            scheduled_for = f"{month}-{int(day):02d}T{time_str}:00"

            post = {
                "id": post_id,
                "product_id": img_info["product_id"],
                "post_type": item.get("post_type", "Product Showcase"),
                "caption": item.get("caption", ""),
                "image_path": img_info["professional_image"],
                "original_image": img_info["original_image"],
                "cloudinary_url": img_info.get("cloudinary_url", ""),
                "status": "draft",
                "created_at": datetime.now().isoformat(),
                "scheduled_for": scheduled_for,
                "reasoning": item.get("reasoning", ""),
                "color": colors[i % len(colors)]
            }
            posts_db[post_id] = post
            schedule_db[post_id] = {"post_id": post_id, "scheduled_for": scheduled_for, "status": "scheduled"}
            created_posts.append(post)

        save_db()
        print(f"    Created {len(created_posts)} posts!")
        return {"message": f"Generated {len(created_posts)} posts", "posts": created_posts}

    except json.JSONDecodeError as e:
        print(f"JSON error: {e}")
        return {"message": "AI returned invalid format. Try again.", "posts": []}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════
# POST MANAGEMENT
# ══════════════════════════════════════

@app.post("/api/posts/{post_id}/edit")
async def edit_post(post_id: str, instruction: str = Form(...)):
    if post_id not in posts_db:
        raise HTTPException(status_code=404, detail="Not found")
    post = posts_db[post_id]
    prompt = f"""You are a caption editor for a luxury Indian clothing brand. ONLY respond to requests about editing Instagram captions, post content, hashtags, tone, or scheduling. If the user asks anything unrelated to social media content, respond with: "I can only help with editing your post content. Please ask me about captions, hashtags, tone, or styling."

Edit this Instagram caption:

{BRAND_INFO}

Current: {post['caption']}
Post type: {post['post_type']}
Instruction: {instruction}

Return ONLY the updated caption."""

    response = openai_client.chat.completions.create(
        model=GPT_MODEL, messages=[{"role": "user", "content": prompt}], max_tokens=500
    )
    posts_db[post_id]['caption'] = response.choices[0].message.content.strip()
    save_db()
    return {"post": posts_db[post_id]}


@app.get("/api/posts")
def get_all_posts():
    return {"posts": list(posts_db.values())}

@app.get("/api/posts/{post_id}")
def get_post(post_id: str):
    if post_id not in posts_db:
        raise HTTPException(status_code=404, detail="Not found")
    return {"post": posts_db[post_id]}

@app.delete("/api/posts/{post_id}")
def delete_post(post_id: str):
    if post_id not in posts_db:
        raise HTTPException(status_code=404, detail="Not found")
    del posts_db[post_id]
    schedule_db.pop(post_id, None)
    save_db()
    return {"message": "Deleted"}

@app.put("/api/posts/{post_id}/approve")
def approve_post(post_id: str):
    if post_id not in posts_db:
        raise HTTPException(status_code=404, detail="Not found")
    posts_db[post_id]['status'] = "approved"
    save_db()
    return {"post": posts_db[post_id]}

@app.put("/api/posts/{post_id}/reject")
def reject_post(post_id: str):
    if post_id not in posts_db:
        raise HTTPException(status_code=404, detail="Not found")
    posts_db[post_id]['status'] = "rejected"
    save_db()
    return {"post": posts_db[post_id]}

@app.put("/api/posts/{post_id}/schedule")
async def reschedule_post(post_id: str, scheduled_for: str = Form(...)):
    if post_id not in posts_db:
        raise HTTPException(status_code=404, detail="Not found")
    posts_db[post_id]['scheduled_for'] = scheduled_for
    schedule_db[post_id] = {"post_id": post_id, "scheduled_for": scheduled_for, "status": "scheduled"}
    save_db()
    return {"post": posts_db[post_id]}

@app.get("/api/schedule")
def get_schedule():
    scheduled = []
    for pid, sched in schedule_db.items():
        if pid in posts_db:
            post = posts_db[pid].copy()
            post['schedule_status'] = sched['status']
            scheduled.append(post)
    scheduled.sort(key=lambda x: x.get('scheduled_for', '') or '')
    return {"schedule": scheduled}


# ══════════════════════════════════════
# MANUAL PUBLISH
# ══════════════════════════════════════

@app.post("/api/posts/{post_id}/publish")
async def publish_now(post_id: str):
    if post_id not in posts_db:
        raise HTTPException(status_code=404, detail="Not found")
    
    success = do_publish(post_id)
    if success:
        save_db()
        return {"message": "Published to Instagram!", "instagram_id": posts_db[post_id].get("instagram_id", "")}
    else:
        raise HTTPException(status_code=500, detail="Publishing failed. Check logs.")


@app.get("/")
def health():
    return {
        "status": "running",
        "app": "Amyrahluxe AI Scheduler",
        "scheduler": "active",
        "products": len(products_db),
        "posts": len(posts_db),
        "scheduled": len(schedule_db)
    }