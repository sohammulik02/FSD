from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import date as DateType, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import Depends, FastAPI, Form, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
import uvicorn

BASE_DIR = Path(__file__).resolve().parents[1]
DB_PATH = BASE_DIR / "travel_expense.db"
BASE_CURRENCY = "INR"
SESSION_TTL_HOURS = 24 * 7
EXCHANGE_API_BASE = "https://api.frankfurter.app"

app = FastAPI(title="Travel Expense Manager", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TripIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    destination_country: str = Field(min_length=2, max_length=80)
    start_date: DateType
    end_date: DateType
    base_currency: str = Field(default=BASE_CURRENCY, min_length=3, max_length=3)


class TripUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=120)
    destination_country: str | None = Field(default=None, min_length=2, max_length=80)
    start_date: Optional[DateType] = None
    end_date: Optional[DateType] = None
    base_currency: str | None = Field(default=None, min_length=3, max_length=3)


class ExpenseIn(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(min_length=3, max_length=3)
    category: str = Field(min_length=2, max_length=50)
    day_label: str = Field(default="Day 1", min_length=4, max_length=20)
    date: Optional[DateType] = None
    description: str | None = Field(default=None, max_length=500)


@contextmanager
def db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
    finally:
        connection.close()


def normalize_currency(value: str) -> str:
    return value.strip().upper()


def day_to_index(day_label: str) -> int:
    match = re.fullmatch(r"Day\s+(\d+)", day_label.strip(), flags=re.IGNORECASE)
    if not match:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid day label")
    return int(match.group(1))


def expense_date_from_day(trip_start_date: str, day_label: str) -> str:
    day_number = day_to_index(day_label)
    trip_start = datetime.strptime(trip_start_date, "%Y-%m-%d").date()
    expense_date = trip_start + timedelta(days=day_number - 1)
    return expense_date.isoformat()


def expense_date_obj_from_payload(trip: sqlite3.Row, payload: ExpenseIn) -> DateType:
    if payload.date is not None:
        return payload.date
    return datetime.strptime(expense_date_from_day(trip["start_date"], payload.day_label), "%Y-%m-%d").date()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return base64.b64encode(salt + digest).decode("ascii")


def verify_password(password: str, encoded: str) -> bool:
    raw = base64.b64decode(encoded.encode("ascii"))
    salt, stored_digest = raw[:16], raw[16:]
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return hmac.compare_digest(digest, stored_digest)


def init_db() -> None:
    with db() as connection:
        connection.executescript(
            """
            PRAGMA foreign_keys = ON;
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS trips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                destination_country TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                base_currency TEXT NOT NULL DEFAULT 'INR',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trip_id INTEGER NOT NULL,
                amount TEXT NOT NULL,
                currency TEXT NOT NULL,
                base_currency TEXT NOT NULL,
                converted_amount TEXT NOT NULL,
                conversion_rate TEXT NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
            );
            """
        )
        expenses_columns = {row[1] for row in connection.execute("PRAGMA table_info(expenses)").fetchall()}
        if "day_label" not in expenses_columns:
            connection.execute("ALTER TABLE expenses ADD COLUMN day_label TEXT NOT NULL DEFAULT 'Day 1'")
        connection.commit()


def row_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row else None


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)).isoformat()
    created_at = now_utc_iso()
    with db() as connection:
        connection.execute(
            "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
            (token, user_id, expires_at, created_at),
        )
        connection.commit()
    return token


def get_current_user(authorization: str | None = Header(default=None)) -> sqlite3.Row:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = authorization.split(" ", 1)[1].strip()
    with db() as connection:
        row = connection.execute(
            """
            SELECT users.*
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
              AND datetime(sessions.expires_at) > datetime('now')
            """,
            (token,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return row


_fallback_inr_rates = {
    "USD": Decimal("83.50"),
    "EUR": Decimal("91.00"),
    "GBP": Decimal("106.00"),
    "SGD": Decimal("61.50"),
    "JPY": Decimal("0.58"),
    "THB": Decimal("2.34"),
    "AED": Decimal("22.70"),
    "AUD": Decimal("55.00"),
    "CAD": Decimal("61.00"),
    "INR": Decimal("1.00"),
}


def fallback_rate(from_currency: str, to_currency: str) -> Decimal:
    from_rate = _fallback_inr_rates.get(from_currency)
    to_rate = _fallback_inr_rates.get(to_currency)
    if from_rate and to_rate:
        return from_rate / to_rate
    if from_currency == "INR" and to_rate:
        return Decimal("1") / to_rate
    if to_currency == "INR" and from_rate:
        return from_rate
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch exchange rate")


def fetch_rate(from_currency: str, to_currency: str, for_date: DateType) -> Decimal:
    endpoint = (
        f"{EXCHANGE_API_BASE}/latest"
        if for_date > DateType.today()
        else f"{EXCHANGE_API_BASE}/{for_date.isoformat()}"
    )
    query = urlencode({"amount": 1, "from": from_currency, "to": to_currency})
    request = Request(f"{endpoint}?{query}")
    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
        rates = payload.get("rates") or {}
        if to_currency in rates:
            return Decimal(str(rates[to_currency]))
    except (HTTPError, URLError, ValueError, TimeoutError):
        pass
    return fallback_rate(from_currency, to_currency)


def convert_currency(amount: Decimal, from_currency: str, to_currency: str, for_date: DateType) -> tuple[Decimal, Decimal]:
    from_currency = normalize_currency(from_currency)
    to_currency = normalize_currency(to_currency)
    if from_currency == to_currency:
        return amount.quantize(Decimal("0.01")), Decimal("1")
    rate = fetch_rate(from_currency, to_currency, for_date)
    converted = (amount * rate).quantize(Decimal("0.01"))
    return converted, rate


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Travel Expense Manager API is running"}


@app.post("/api/v1/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterIn) -> dict[str, Any]:
    created_at = now_utc_iso()
    with db() as connection:
        existing = connection.execute("SELECT id FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

        cursor = connection.execute(
            "INSERT INTO users (full_name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
            (payload.full_name, payload.email.lower(), hash_password(payload.password), created_at),
        )
        connection.commit()
        user = connection.execute(
            "SELECT id, full_name, email, created_at FROM users WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    return row_dict(user) or {}


@app.post("/api/v1/auth/login")
def login_user(username: str = Form(...), password: str = Form(...)) -> dict[str, str]:
    with db() as connection:
        user = connection.execute("SELECT * FROM users WHERE email = ?", (username.lower(),)).fetchone()
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return {"access_token": create_session(user["id"]), "token_type": "bearer"}


@app.get("/api/v1/trips")
def list_trips(current_user: sqlite3.Row = Depends(get_current_user)) -> list[dict[str, Any]]:
    with db() as connection:
        rows = connection.execute(
            "SELECT id, user_id, title, destination_country, start_date, end_date, base_currency, created_at FROM trips WHERE user_id = ? ORDER BY start_date",
            (current_user["id"],),
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/v1/trips", status_code=status.HTTP_201_CREATED)
def create_trip(payload: TripIn, current_user: sqlite3.Row = Depends(get_current_user)) -> dict[str, Any]:
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_date cannot be earlier than start_date")

    created_at = now_utc_iso()
    with db() as connection:
        cursor = connection.execute(
            """
            INSERT INTO trips (user_id, title, destination_country, start_date, end_date, base_currency, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                current_user["id"],
                payload.title,
                payload.destination_country,
                payload.start_date.isoformat(),
                payload.end_date.isoformat(),
                normalize_currency(payload.base_currency),
                created_at,
            ),
        )
        connection.commit()
        trip = connection.execute(
            "SELECT id, user_id, title, destination_country, start_date, end_date, base_currency, created_at FROM trips WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    return dict(trip)


def get_trip_for_user(connection: sqlite3.Connection, trip_id: int, user_id: int) -> sqlite3.Row:
    trip = connection.execute(
        "SELECT * FROM trips WHERE id = ? AND user_id = ?",
        (trip_id, user_id),
    ).fetchone()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


@app.get("/api/v1/trips/{trip_id}")
def get_trip(trip_id: int, current_user: sqlite3.Row = Depends(get_current_user)) -> dict[str, Any]:
    with db() as connection:
        trip = get_trip_for_user(connection, trip_id, current_user["id"])
    return dict(trip)


@app.put("/api/v1/trips/{trip_id}")
def update_trip(trip_id: int, payload: TripUpdateIn, current_user: sqlite3.Row = Depends(get_current_user)) -> dict[str, Any]:
    with db() as connection:
        get_trip_for_user(connection, trip_id, current_user["id"])
        updates = payload.model_dump(exclude_unset=True)
        start_date = updates.get("start_date", None)
        end_date = updates.get("end_date", None)
        if start_date is not None:
            start_date = start_date.isoformat()
        if end_date is not None:
            end_date = end_date.isoformat()
        if start_date and end_date and end_date < start_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_date cannot be earlier than start_date")

        if "base_currency" in updates and updates["base_currency"] is not None:
            updates["base_currency"] = normalize_currency(updates["base_currency"])
        if start_date is not None:
            updates["start_date"] = start_date
        if end_date is not None:
            updates["end_date"] = end_date

        if updates:
            set_clause = ", ".join(f"{field} = ?" for field in updates)
            connection.execute(
                f"UPDATE trips SET {set_clause} WHERE id = ? AND user_id = ?",
                (*updates.values(), trip_id, current_user["id"]),
            )
            connection.commit()

        updated = connection.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
    return dict(updated)


@app.delete("/api/v1/trips/{trip_id}", status_code=200)
def delete_trip(trip_id: int, current_user: sqlite3.Row = Depends(get_current_user)) -> None:
    with db() as connection:
        get_trip_for_user(connection, trip_id, current_user["id"])
        connection.execute("DELETE FROM trips WHERE id = ? AND user_id = ?", (trip_id, current_user["id"]))
        connection.commit()


@app.post("/api/v1/trips/{trip_id}/expenses", status_code=status.HTTP_201_CREATED)
def create_expense(trip_id: int, payload: ExpenseIn, current_user: sqlite3.Row = Depends(get_current_user)) -> dict[str, Any]:
    with db() as connection:
        trip = get_trip_for_user(connection, trip_id, current_user["id"])
        if day_to_index(payload.day_label) > (datetime.strptime(trip["end_date"], "%Y-%m-%d").date() - datetime.strptime(trip["start_date"], "%Y-%m-%d").date()).days + 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Day exceeds trip duration")
        expense_date_obj = expense_date_obj_from_payload(trip, payload)
        converted_amount, rate = convert_currency(
            payload.amount,
            normalize_currency(payload.currency),
            trip["base_currency"],
            expense_date_obj,
        )
        created_at = now_utc_iso()
        cursor = connection.execute(
            """
            INSERT INTO expenses
                            (trip_id, amount, currency, base_currency, converted_amount, conversion_rate, category, day_label, date, description, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                trip_id,
                str(payload.amount.quantize(Decimal("0.01"))),
                normalize_currency(payload.currency),
                trip["base_currency"],
                str(converted_amount),
                str(rate),
                payload.category,
                                payload.day_label,
                expense_date_obj.isoformat(),
                payload.description,
                created_at,
            ),
        )
        connection.commit()
        expense = connection.execute("SELECT * FROM expenses WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(expense)


@app.get("/api/v1/trips/{trip_id}/expenses")
def list_expenses(trip_id: int, current_user: sqlite3.Row = Depends(get_current_user)) -> list[dict[str, Any]]:
    with db() as connection:
        get_trip_for_user(connection, trip_id, current_user["id"])
        rows = connection.execute(
            "SELECT * FROM expenses WHERE trip_id = ? ORDER BY date, created_at, id",
            (trip_id,),
        ).fetchall()
    return [dict(row) for row in rows]


@app.delete("/api/v1/trips/{trip_id}/expenses/{expense_id}", status_code=200)
def delete_expense(trip_id: int, expense_id: int, current_user: sqlite3.Row = Depends(get_current_user)) -> None:
    with db() as connection:
        get_trip_for_user(connection, trip_id, current_user["id"])
        connection.execute("DELETE FROM expenses WHERE id = ? AND trip_id = ?", (expense_id, trip_id))
        connection.commit()


@app.get("/api/v1/trips/{trip_id}/ledger")
def trip_ledger(trip_id: int, current_user: sqlite3.Row = Depends(get_current_user)) -> dict[str, Any]:
    with db() as connection:
        trip = get_trip_for_user(connection, trip_id, current_user["id"])
        expenses = connection.execute(
            """
            SELECT id, trip_id, amount, currency, base_currency, converted_amount, conversion_rate,
                   category, day_label, date, description, created_at
            FROM expenses
            WHERE trip_id = ?
            ORDER BY date, created_at, id
            """,
            (trip_id,),
        ).fetchall()

    total = sum((Decimal(row["converted_amount"]) for row in expenses), Decimal("0.00"))

    return {
        "trip": dict(trip),
        "base_currency": trip["base_currency"],
        "total_expense": str(total.quantize(Decimal("0.01"))),
        "expenses": [dict(row) for row in expenses],
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
