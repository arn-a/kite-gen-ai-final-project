"""
Kite Image Transformation Evaluation
=====================================
Evaluates the Gemini image transformation pipeline by comparing original
product photos with their AI-transformed versions across 4 dimensions.

Uses GPT-4o-mini Vision as the evaluator.

Run from backend directory:
    venv\\Scripts\\python.exe image_eval.py
"""

import os
import json
import base64
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = "gpt-4o-mini"

UPLOADS_DIR = "uploads"
GENERATED_DIR = "generated"
DB_FILE = "db.json"


def load_image_pairs():
    """Find original-transformed image pairs from db.json"""
    if not os.path.exists(DB_FILE):
        print("[ERROR] db.json not found. Run from backend directory.")
        return []
    
    with open(DB_FILE) as f:
        db = json.load(f)
    
    pairs = []
    for post_id, post in db.get("posts", {}).items():
        original = post.get("original_image", "")
        transformed = post.get("image_path", "")
        if original and transformed and original != transformed:
            if os.path.exists(original) and os.path.exists(transformed):
                pairs.append({
                    "post_id": post_id,
                    "original": original,
                    "transformed": transformed,
                    "post_type": post.get("post_type", "Unknown")
                })
    
    return pairs


def encode_image(path):
    """Encode image as base64 for vision API"""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def get_mime(path):
    ext = path.rsplit(".", 1)[-1].lower()
    if ext in ["jpg", "jpeg"]:
        return "image/jpeg"
    return f"image/{ext}"


def evaluate_pair(original_path, transformed_path):
    """Use GPT-4o-mini Vision to compare original and transformed images"""
    
    orig_b64 = encode_image(original_path)
    trans_b64 = encode_image(transformed_path)
    orig_mime = get_mime(original_path)
    trans_mime = get_mime(transformed_path)
    
    prompt = """You are evaluating an AI-generated transformation of a clothing product photo.

The FIRST image is the ORIGINAL raw product photo.
The SECOND image is the AI-TRANSFORMED version (transformed using Gemini 3.1 Flash Image).

Score the transformation on these 4 dimensions (1-5 scale, where 5 is best):

SCORING IS STRICT. Most outputs should score 3-4. A 5 requires PERFECTION with zero issues. A 4 means minor noticeable issues. Be critical.

1. GARMENT_PRESERVATION: Is the EXACT same garment in both images?
   - 5 = Pixel-perfect preservation, ALL details (embroidery patterns, stitching, fabric texture, color shade) identical
   - 4 = Same garment but slight variations in some detail (subtle color shift, slight pattern change)
   - 3 = Recognizably same garment with several altered details
   - 2 = Significant changes, garment partially modified
   - 1 = Different garment

2. BACKGROUND_QUALITY: Is the new background editorial-quality for a LUXURY brand specifically?
   - 5 = Magazine-cover quality, premium aesthetic
   - 4 = Good but not exceptional
   - 3 = Acceptable, generic stock-photo feel
   - 2 = Poor or mismatched aesthetic
   - 1 = Distracting or amateur

3. NO_TEXT_ARTIFACTS: ANY text, even partial or blurry, drops this score.
   - 5 = Zero text/branding/watermarks
   - 3 = Subtle artifacts, partial text fragments
   - 1 = Visible fake brand names or text

4. PROP_PLACEMENT: Strict spatial check.
   - 5 = Props enhance composition, garment fully unobstructed
   - 4 = Props present but minor visual competition
   - 3 = Props slightly compete with garment for attention
   - 1 = Props block parts of garment

Return ONLY a valid JSON object with this exact structure:
{"garment_preservation": <1-5>, "background_quality": <1-5>, "no_text_artifacts": <1-5>, "prop_placement": <1-5>, "reasoning": "<one sentence explanation>"}"""
    
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{orig_mime};base64,{orig_b64}"}},
                {"type": "image_url", "image_url": {"url": f"data:{trans_mime};base64,{trans_b64}"}},
            ]
        }],
        max_tokens=400,
        temperature=0.2
    )
    
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    
    try:
        return json.loads(raw)
    except Exception as e:
        print(f"  [Parse error: {e}]")
        return {
            "garment_preservation": 0, "background_quality": 0,
            "no_text_artifacts": 0, "prop_placement": 0,
            "reasoning": f"Parse error: {raw[:100]}"
        }


def main():
    print("=" * 70)
    print("KITE EVALUATION: Image Transformation Quality")
    print("=" * 70)
    
    pairs = load_image_pairs()
    
    if not pairs:
        print("\n[ERROR] No image pairs found in db.json.")
        print("Generate some posts through the app first.")
        return
    
    print(f"\nFound {len(pairs)} image pairs to evaluate")
    print(f"Model: Gemini 3.1 Flash Image (transformation)")
    print(f"Evaluator: GPT-4o-mini Vision (comparison)")
    print(f"Scale: 1-5 (higher is better)\n")
    
    results = []
    
    for i, pair in enumerate(pairs, 1):
        print(f"[{i}/{len(pairs)}] {pair['post_type']}: {os.path.basename(pair['original'])}")
        print(f"  Original:    {pair['original']}")
        print(f"  Transformed: {pair['transformed']}")
        
        try:
            scores = evaluate_pair(pair['original'], pair['transformed'])
            results.append({**pair, **scores})
            avg = sum([scores[k] for k in ['garment_preservation', 'background_quality', 'no_text_artifacts', 'prop_placement']]) / 4
            print(f"  Garment: {scores['garment_preservation']}/5 | "
                  f"Background: {scores['background_quality']}/5 | "
                  f"No-Text: {scores['no_text_artifacts']}/5 | "
                  f"Props: {scores['prop_placement']}/5 | "
                  f"AVG: {avg:.2f}")
            print(f"  Reasoning: {scores.get('reasoning', '')[:100]}\n")
        except Exception as e:
            print(f"  [Error: {e}]\n")
    
    if not results:
        print("\nNo successful evaluations.")
        return
    
    # ════════════════════════════════════════════════════════
    # Aggregate
    # ════════════════════════════════════════════════════════
    
    def avg_score(key):
        values = [r[key] for r in results if r[key] > 0]
        return sum(values) / len(values) if values else 0
    
    garment_avg = avg_score("garment_preservation")
    bg_avg = avg_score("background_quality")
    text_avg = avg_score("no_text_artifacts")
    prop_avg = avg_score("prop_placement")
    overall = (garment_avg + bg_avg + text_avg + prop_avg) / 4
    
    # ════════════════════════════════════════════════════════
    # Print results
    # ════════════════════════════════════════════════════════
    
    print("=" * 70)
    print("RESULTS SUMMARY")
    print("=" * 70)
    print(f"\nDataset size: {len(results)} image pairs")
    print(f"\n┌──────────────────────────┬─────────┬────────────────────────┐")
    print(f"│ Dimension                │ Score   │ Pass Rate (>=4/5)      │")
    print(f"├──────────────────────────┼─────────┼────────────────────────┤")
    
    dimensions = [
        ("Garment Preservation", "garment_preservation", garment_avg),
        ("Background Quality", "background_quality", bg_avg),
        ("No Text Artifacts", "no_text_artifacts", text_avg),
        ("Prop Placement", "prop_placement", prop_avg),
    ]
    
    for name, key, score in dimensions:
        pass_count = sum(1 for r in results if r[key] >= 4)
        pass_rate = (pass_count / len(results)) * 100
        print(f"│ {name:<24} │ {score:.2f}/5  │ {pass_rate:.0f}% ({pass_count}/{len(results)})            │")
    
    print(f"├──────────────────────────┼─────────┼────────────────────────┤")
    print(f"│ OVERALL                  │ {overall:.2f}/5  │                        │")
    print(f"└──────────────────────────┴─────────┴────────────────────────┘")
    
    # Cost estimate
    print(f"\nCOST: ~$0.001-0.002 per pair evaluation (~Rs.0.10-0.20)")
    print(f"Total spent: ~${len(results) * 0.0015:.3f} (~Rs.{len(results) * 0.12:.1f})")
    
    # Save results
    output = {
        "evaluation_date": datetime.now().isoformat(),
        "model_evaluated": "gemini-2.5-flash-image (production)",
        "evaluator": MODEL,
        "dataset_size": len(results),
        "summary": {
            "garment_preservation": round(garment_avg, 2),
            "background_quality": round(bg_avg, 2),
            "no_text_artifacts": round(text_avg, 2),
            "prop_placement": round(prop_avg, 2),
            "overall": round(overall, 2),
        },
        "pass_rates_above_4": {
            name: round(sum(1 for r in results if r[key] >= 4) / len(results) * 100, 1)
            for name, key, _ in dimensions
        },
        "raw_results": results,
    }
    
    with open("image_eval_results.json", "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"\nFull results saved to: image_eval_results.json")
    print("=" * 70)


if __name__ == "__main__":
    main()
