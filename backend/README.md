# Stock Photo Shop v2 — Backend (MVP)

Node.js/Express + SQLite backend for the stock photo shop.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create your .env (optional, see .env.example)
cp .env.example .env

# 3. Start the server
npm start
```

Server runs on **http://localhost:3001** by default.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `DB_PATH` | `./database.sqlite` | SQLite database file path |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/images` | List images (filters: `category`, `min_score`, `max_price`) |
| GET | `/api/images/:id` | Single image details |
| POST | `/api/upload` | Insert image metadata (returns id + price) |
| POST | `/api/cart/checkout` | Checkout cart (accepts `image_ids[]`, returns total) |

Static images are served from `/uploads/*`.

## Bulk Import

```bash
node scripts/import-images.js /path/to/images.json
```

Expected JSON structure:
```json
[
  { "filename": "photo1.jpg", "score": 45, "category": "nature", "title": "Mountain" }
]
```

Prices are auto-calculated:
- Score 0–10 → €0.09, 10–20 → €0.19, …, 90–100 → €0.99

## Database Schema

- **images** — photo metadata & pricing
- **users** — accounts with credits & subscription tier
- **purchases** — purchase records linking users to images

## Notes

- MVP only: no auth, no payments, no production hardening.
- SQLite database (`database.sqlite`) is auto-created on first run.
