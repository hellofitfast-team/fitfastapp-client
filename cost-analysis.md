# FitFast Cost Analysis

> Living document — updated as new cost data is measured or pricing changes.
> Last updated: February 6, 2026

---

## Exchange Rate Baseline

| Metric | Value |
|---|---|
| USD/EGP rate (Feb 2026) | ~47 EGP |
| Target: cost per client/month | < $0.20 USD (~9.4 EGP) |

---

## 1. AI Model Costs (OpenRouter)

### 1.1 OCR — Payment Screenshot Extraction

| Item | Value |
|---|---|
| Model | `qwen/qwen2.5-vl-72b-instruct` |
| Input price | $0.15 / 1M tokens |
| Output price | $0.60 / 1M tokens |
| Measured input tokens | ~134 |
| Measured output tokens | ~55 |
| **Cost per extraction** | **$0.000053** |

**Test results** (InstaPay 20,000 EGP screenshot):

- Amount: `20000` — correct
- Sender: `محمود` — correct (Arabic)
- Reference: `40171960364` — prefix `401719` matches (trailing chars misread)
- Total tokens: 185-192

**Scaling projection** (per month, 1000 clients):

| Scenario | Extractions/mo | Monthly cost |
|---|---|---|
| Low (new signups only) | 50 | $0.003 |
| Medium (renewals) | 200 | $0.011 |
| High (re-scans + retries) | 500 | $0.027 |

> OCR cost is negligible. Even at 500 extractions/month, it's under $0.03.

---

### 1.2 Meal Plan Generation

| Item | Value |
|---|---|
| Model | `deepseek/deepseek-chat` (DeepSeek V3) |
| Input price | $0.30 / 1M tokens |
| Output price | $1.20 / 1M tokens |
| `max_tokens` setting | 6,000 |
| Estimated prompt tokens | ~800 (profile + assessment + check-in context) |
| Estimated completion tokens | ~4,000 (7-day plan with meals, macros, instructions) |
| **Estimated cost per plan** | **$0.005** |

---

### 1.3 Workout Plan Generation

| Item | Value |
|---|---|
| Model | `deepseek/deepseek-chat` (DeepSeek V3) |
| Input price | $0.30 / 1M tokens |
| Output price | $1.20 / 1M tokens |
| `max_tokens` setting | 6,000 |
| Estimated prompt tokens | ~800 |
| Estimated completion tokens | ~4,000 (7-day plan with exercises, sets, reps) |
| **Estimated cost per plan** | **$0.005** |

---

### 1.4 AI Cost Per Client Per Month

Plans are generated on check-in (every 14 days = ~2x/month).
Each check-in triggers 1 meal plan + 1 workout plan.

| Component | Frequency | Cost/event | Monthly cost |
|---|---|---|---|
| Meal plan | 2x | $0.005 | $0.010 |
| Workout plan | 2x | $0.005 | $0.010 |
| OCR (one-time signup) | 0.08x* | $0.00005 | ~$0.000 |
| **Total per client/month** | | | **$0.020** |

*\*Amortized: 1 OCR per signup ÷ 12-month average lifetime*

**At scale (1000 clients):**

| Metric | Value |
|---|---|
| Monthly AI cost (1000 clients) | **$20.00** |
| Monthly AI cost in EGP | **~940 EGP** |
| Per-client per-month | **$0.020 (~0.94 EGP)** |

> Well under the $0.20/client/month target. AI costs are ~10% of budget ceiling.

---

## 2. Infrastructure Costs

### 2.1 Supabase

| Plan | Monthly cost | Notes |
|---|---|---|
| Free tier | $0 | 2 projects, 500 MB DB, pauses after 7 days inactivity |
| **Pro tier (recommended)** | **$25/mo** | 8 GB DB, 100K MAUs, 100 GB storage, no pause |
| Typical with usage | $35-75/mo | Depends on storage + egress |

**FitFast estimate at 1000 clients:**

| Resource | Estimated usage | Within Pro limits? |
|---|---|---|
| Database size | ~500 MB (profiles, plans, check-ins) | Yes (8 GB included) |
| Monthly active users | ~1,000 | Yes (100K included) |
| Auth users | ~1,050 (1000 clients + coach) | Yes |
| File storage | ~5 GB (screenshots, progress photos) | Yes (100 GB included) |
| Edge functions | 0 (not used) | N/A |
| Realtime | 0 (not used) | N/A |

**Estimated Supabase cost: $25-35/month**

---

### 2.2 Vercel

| Plan | Monthly cost | Notes |
|---|---|---|
| Hobby (free) | $0 | Non-commercial only, 1 user, limited compute |
| **Pro (recommended)** | **$20/mo** | 1 TB bandwidth, commercial use allowed |

**FitFast estimate at 1000 clients:**

| Resource | Estimated usage | Within Pro limits? |
|---|---|---|
| Bandwidth | ~50 GB/mo | Yes (1 TB included) |
| Serverless functions | ~100 GB-hrs | Yes (1000 GB-hrs included) |
| Build minutes | ~200/mo | Yes |

**Estimated Vercel cost: $20/month**

---

## 3. Total Monthly Cost Summary

### At 1000 Clients

| Category | Monthly USD | Monthly EGP |
|---|---|---|
| AI — Plan generation | $20.00 | 940 EGP |
| AI — OCR extraction | $0.03 | 1.4 EGP |
| Supabase Pro | $30.00 | 1,410 EGP |
| Vercel Pro | $20.00 | 940 EGP |
| Domain + DNS | $1.00 | 47 EGP |
| **Total** | **$71.03** | **~3,338 EGP** |
| **Per client/month** | **$0.071** | **~3.34 EGP** |

### At 500 Clients

| Category | Monthly USD | Monthly EGP |
|---|---|---|
| AI — Plan generation | $10.00 | 470 EGP |
| AI — OCR extraction | $0.01 | 0.5 EGP |
| Supabase Pro | $25.00 | 1,175 EGP |
| Vercel Pro | $20.00 | 940 EGP |
| Domain + DNS | $1.00 | 47 EGP |
| **Total** | **$56.01** | **~2,633 EGP** |
| **Per client/month** | **$0.112** | **~5.27 EGP** |

---

## 4. Break-Even Analysis

Assuming the coach charges clients monthly subscription fees:

| Scenario | Client fee (EGP/mo) | Revenue (1000 clients) | Costs | Margin |
|---|---|---|---|---|
| Budget tier | 150 EGP | 150,000 EGP | 3,338 EGP | 97.8% |
| Mid tier | 500 EGP | 500,000 EGP | 3,338 EGP | 99.3% |
| Premium tier | 1,000 EGP | 1,000,000 EGP | 3,338 EGP | 99.7% |

> Infrastructure + AI costs are < 3% of revenue in all realistic pricing scenarios.

---

## 5. Cost Optimization Notes

### Already Optimized

- **DeepSeek V3** for text generation: ~10x cheaper than GPT-4o
- **Qwen VL** for OCR: vision model at $0.15/M input — extremely cheap
- **14-day plan cycles**: AI runs 2x/month per client, not daily
- **No real-time features**: no Supabase Realtime costs
- **No edge functions**: standard serverless on Vercel

### Potential Future Optimizations

- **Supabase Free tier**: viable for < 100 clients if you tolerate auto-pause risk
- **Self-hosted Supabase**: ~$10/mo on a VPS, eliminates Supabase Pro fee
- **DeepSeek API direct** (not via OpenRouter): may be 20-40% cheaper
- **Cache AI plans**: if user skips check-in, reuse previous plan (saves 1 generation)
- **Batch OCR**: process multiple screenshots in a single API call

---

## 6. Measured Data Log

| Date | Test | Model | Input tokens | Output tokens | Total tokens | Cost | Notes |
|---|---|---|---|---|---|---|---|
| 2026-02-06 | OCR InstaPay screenshot | qwen2.5-vl-72b-instruct | 134 | 58 | 192 | $0.000055 | 20,000 EGP transfer, ref partially extracted |
| 2026-02-06 | OCR InstaPay screenshot (run 2) | qwen2.5-vl-72b-instruct | 134 | 51 | 185 | $0.000051 | Same image, consistent results |

> Add new measurements to this table as they are collected.

---

## Sources

- [OpenRouter — Qwen2.5 VL 72B Pricing](https://openrouter.ai/qwen/qwen2.5-vl-72b-instruct)
- [OpenRouter — DeepSeek V3 Pricing](https://openrouter.ai/deepseek/deepseek-chat)
- [Supabase Pricing](https://supabase.com/pricing)
- [Vercel Pricing](https://vercel.com/pricing)
- [USD/EGP Exchange Rate — XE](https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=EGP)
