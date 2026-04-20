# Travel Expense Manager

Simple full-stack mini project for managing travel expenses.

## Simple Setup

The backend is now intentionally small:

- one FastAPI file
- local SQLite database
- no ORM
- no Docker needed
- frontend kept the same

## Files

- [backend/main.py](backend/main.py)
- [frontend/index.html](frontend/index.html)
- [frontend/style.css](frontend/style.css)
- [frontend/script.js](frontend/script.js)
- [.env.example](.env.example)
- [travel_expense.db](travel_expense.db)

## Run Backend

Install:

```bash
pip install -r requirements.txt
```

Start:

```bash
uvicorn backend.main:app --reload
```

Docs:

- [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Run Frontend

Serve the frontend folder:

```bash
python -m http.server 5500
```

Open:

- [http://127.0.0.1:5500/index.html](http://127.0.0.1:5500/index.html)

## Where Data Is Stored

All accounts, trips, and expenses are stored in:

- [travel_expense.db](travel_expense.db)

You can open it with DB Browser for SQLite.
