"""
Kite Evaluation Script
======================
Measures caption generation quality with vs without RAG brand context.
Uses GPT-4o-mini as an LLM judge to score captions on multiple dimensions.

Run this from the backend directory:
    venv\Scripts\python.exe evaluation.py
"""

import os
import json
import time
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = "gpt-4o-mini"

# ════════════════════════════════════════════════════════
# Test data: 5 product descriptions to generate captions for
# ════════════════════════════════════════════════════════

TEST_PRODUCTS = [
    "A long mint green kurta with intricate floral embroidery in white and gold thread, knee-length, suitable for festive occasions.",
    "A blush pink sleeveless top with delicate pearl-like embellishments and a charming bow detail at the neckline, casual elegance.",
    "A light blue tunic with intricate floral embroidery, delicate lace trim at hem, versatile for semi-formal events or relaxed gatherings.",
    "A cream silk co-ord set with hand-embroidered gota patti work, three-piece with kurta, dupatta, and trousers, perfect for weddings.",
    "A maroon Anarkali dress with mirror work and zardozi embroidery, full-length flared silhouette, ideal for festive celebrations.",
]

# ════════════════════════════════════════════════════════
# Brand context (RAG)
# ════════════════════════════════════════════════════════

BRAND_INFO = """
Brand: Amyrah Luxe - The Collective
Type: Luxury clothing brand specializing in premium ethnic and fusion wear for women.
Tone: Elegant, aspirational, feminine, sophisticated. Never loud or salesy.
Target Audience: Women aged 18-35 who love fashion, appreciate quality fabric and craftsmanship.
Voice: Speak like a fashion editor at Vogue India - refined, warm, knowledgeable.
"""

# ════════════════════════════════════════════════════════
# Generation functions
# ════════════════════════════════════════════════════════

def generate_with_rag(product_description):
    """Generate caption WITH brand context (RAG)"""
    prompt = f"""You are a social media strategist for a luxury Indian clothing brand.

{BRAND_INFO}

Product: {product_description}

Write an Instagram caption with: engaging opening, 2-3 sentences, call to action, 5-7 hashtags including #AmyrahLuxe.
Return ONLY the caption text."""
    
    start = time.time()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400,
        temperature=0.7
    )
    elapsed = time.time() - start
    return response.choices[0].message.content.strip(), elapsed


def generate_without_rag(product_description):
    """Generate caption WITHOUT brand context (baseline)"""
    prompt = f"""Write an Instagram caption for this clothing product:

Product: {product_description}

Write an Instagram caption with: engaging opening, 2-3 sentences, call to action, 5-7 hashtags.
Return ONLY the caption text."""
    
    start = time.time()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400,
        temperature=0.7
    )
    elapsed = time.time() - start
    return response.choices[0].message.content.strip(), elapsed


# ════════════════════════════════════════════════════════
# Judge function (LLM-as-judge)
# ════════════════════════════════════════════════════════

def judge_caption(caption, product):
    """Score a caption on 4 dimensions using GPT-4o-mini as judge"""
    prompt = f"""You are an expert evaluator of Instagram fashion brand captions for a luxury Indian clothing brand called Amyrah Luxe.

Brand voice should be: elegant, aspirational, feminine, sophisticated, refined like a Vogue India editor. NEVER loud, salesy, or generic.

Product: {product}

Caption to evaluate:
{caption}

Score this caption on these 4 dimensions (1-5 scale, where 5 is best):

1. BRAND_VOICE: Does it match a luxury Indian fashion brand voice (elegant, aspirational, refined)?
2. ENGAGEMENT: Does it have a hook, emotion, and call-to-action that drives engagement?
3. HASHTAGS: Are hashtags relevant, mix of broad and niche, brand-appropriate?
4. SPECIFICITY: Does it reference specific product details (fabric, embroidery, occasion)?

Return ONLY a valid JSON object with this exact structure:
{{"brand_voice": <1-5>, "engagement": <1-5>, "hashtags": <1-5>, "specificity": <1-5>, "reasoning": "<one sentence>"}}"""
    
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
        temperature=0.2
    )
    
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    
    try:
        return json.loads(raw)
    except:
        return {"brand_voice": 0, "engagement": 0, "hashtags": 0, "specificity": 0, "reasoning": "Parse error"}


# ════════════════════════════════════════════════════════
# Run evaluation
# ════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("KITE EVALUATION: Caption Quality with vs without RAG")
    print("=" * 70)
    
    results = {
        "with_rag": [],
        "without_rag": [],
    }
    
    latencies = {"with_rag": [], "without_rag": []}
    
    for i, product in enumerate(TEST_PRODUCTS, 1):
        print(f"\n[{i}/{len(TEST_PRODUCTS)}] Testing: {product[:60]}...")
        
        # Generate with RAG
        print("  Generating WITH RAG...", end=" ")
        cap_rag, lat_rag = generate_with_rag(product)
        latencies["with_rag"].append(lat_rag)
        print(f"({lat_rag:.1f}s)")
        
        # Generate without RAG
        print("  Generating WITHOUT RAG...", end=" ")
        cap_norag, lat_norag = generate_without_rag(product)
        latencies["without_rag"].append(lat_norag)
        print(f"({lat_norag:.1f}s)")
        
        # Judge both
        print("  Judging WITH RAG...", end=" ")
        score_rag = judge_caption(cap_rag, product)
        results["with_rag"].append(score_rag)
        print(f"avg={sum([score_rag[k] for k in ['brand_voice','engagement','hashtags','specificity']])/4:.2f}")
        
        print("  Judging WITHOUT RAG...", end=" ")
        score_norag = judge_caption(cap_norag, product)
        results["without_rag"].append(score_norag)
        print(f"avg={sum([score_norag[k] for k in ['brand_voice','engagement','hashtags','specificity']])/4:.2f}")
    
    # ════════════════════════════════════════════════════════
    # Aggregate results
    # ════════════════════════════════════════════════════════
    
    def avg(lst, key):
        return sum(item[key] for item in lst) / len(lst) if lst else 0
    
    with_rag_avg = {
        "brand_voice": avg(results["with_rag"], "brand_voice"),
        "engagement": avg(results["with_rag"], "engagement"),
        "hashtags": avg(results["with_rag"], "hashtags"),
        "specificity": avg(results["with_rag"], "specificity"),
    }
    with_rag_avg["overall"] = sum(with_rag_avg.values()) / 4
    
    without_rag_avg = {
        "brand_voice": avg(results["without_rag"], "brand_voice"),
        "engagement": avg(results["without_rag"], "engagement"),
        "hashtags": avg(results["without_rag"], "hashtags"),
        "specificity": avg(results["without_rag"], "specificity"),
    }
    without_rag_avg["overall"] = sum(without_rag_avg.values()) / 4
    
    # ════════════════════════════════════════════════════════
    # Print results table
    # ════════════════════════════════════════════════════════
    
    print("\n" + "=" * 70)
    print("EVALUATION RESULTS")
    print("=" * 70)
    print(f"\nDataset: {len(TEST_PRODUCTS)} product descriptions")
    print(f"Model: {MODEL}")
    print(f"Judge: {MODEL} (LLM-as-judge)")
    print(f"Scale: 1-5 (higher is better)")
    
    print("\n┌─────────────────┬───────────────┬──────────────────┬───────────┐")
    print("│ Dimension       │ WITH RAG      │ WITHOUT RAG      │ Improvement │")
    print("├─────────────────┼───────────────┼──────────────────┼───────────┤")
    
    for dim in ["brand_voice", "engagement", "hashtags", "specificity", "overall"]:
        rag_score = with_rag_avg[dim]
        norag_score = without_rag_avg[dim]
        improvement = ((rag_score - norag_score) / norag_score * 100) if norag_score > 0 else 0
        marker = " *" if dim == "overall" else "  "
        print(f"│ {dim:<15} │ {rag_score:.2f}{marker:>10} │ {norag_score:.2f}{marker:>13} │ {improvement:+.1f}%   │")
    
    print("└─────────────────┴───────────────┴──────────────────┴───────────┘")
    
    print(f"\nLATENCY METRICS:")
    print(f"  Avg generation time WITH RAG:    {sum(latencies['with_rag'])/len(latencies['with_rag']):.2f}s")
    print(f"  Avg generation time WITHOUT RAG: {sum(latencies['without_rag'])/len(latencies['without_rag']):.2f}s")
    
    print(f"\nCOST ESTIMATE:")
    print(f"  Per caption: ~$0.0005 (~Rs.0.04)")
    print(f"  Per 100 captions: ~$0.05 (~Rs.4)")
    
    # ════════════════════════════════════════════════════════
    # Save results to JSON
    # ════════════════════════════════════════════════════════
    
    output = {
        "evaluation_date": datetime.now().isoformat(),
        "model_tested": MODEL,
        "judge_model": MODEL,
        "test_size": len(TEST_PRODUCTS),
        "with_rag_scores": with_rag_avg,
        "without_rag_scores": without_rag_avg,
        "improvement_percentages": {
            dim: ((with_rag_avg[dim] - without_rag_avg[dim]) / without_rag_avg[dim] * 100) if without_rag_avg[dim] > 0 else 0
            for dim in with_rag_avg.keys()
        },
        "latency_seconds": {
            "with_rag_avg": sum(latencies["with_rag"])/len(latencies["with_rag"]),
            "without_rag_avg": sum(latencies["without_rag"])/len(latencies["without_rag"]),
        },
        "raw_results": results,
    }
    
    with open("evaluation_results.json", "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"\nFull results saved to: evaluation_results.json")
    print("=" * 70)


if __name__ == "__main__":
    main()
