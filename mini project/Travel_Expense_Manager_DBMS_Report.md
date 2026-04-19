# Travel Expense Manager - DBMS Report

## Academic Year 2025-26

### Project Type
Database Management System Mini Project (SQLite + FastAPI)

### Institute
[Your Institute Name]

### Team Members
1. [Member 1 Name]
2. [Member 2 Name]
3. [Member 3 Name]

---

## 1. Project Overview

The Travel Expense Manager is a DBMS-backed web application designed to track travel expenses for individual trips. The system supports secure login, trip planning, day-wise expense entries, currency conversion to a trip base currency, and ledger-style reporting.

### 1.1 Problem Statement
During travel, users spend in multiple categories and currencies. Manual tracking is error-prone and does not provide a consolidated day-wise or base-currency view. The project solves this by storing structured trip and expense data in a relational database and computing normalized, queryable summaries.

### 1.2 Project Objectives
- Maintain a secure user-wise travel and expense record.
- Support trip-specific base currency for consistent totals.
- Store both original and converted values for auditability.
- Provide day-wise ledger output for clear spending flow.
- Ensure data integrity through schema constraints and validation.

### 1.3 Technology Stack
- Backend: FastAPI (Python)
- Database: SQLite
- Data Access: sqlite3 module
- Frontend: HTML, CSS, JavaScript
- Currency Rates: Frankfurter API with fallback conversion table

---

## 2. Database Design

### 2.1 Schema and Relationships
The system uses four primary tables:
- users
- sessions
- trips
- expenses

Relationship summary:
- One user can have many trips.
- One trip can have many expenses.
- One user can have many active/inactive sessions.

### 2.2 Core Tables (SQL)

```sql
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
    day_label TEXT NOT NULL DEFAULT 'Day 1',
    FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
);
```

### 2.3 Normalization
The schema is normalized up to 3NF:
- 1NF: Atomic values in all columns.
- 2NF: Non-key attributes depend on full primary key.
- 3NF: No transitive dependency across user, trip, and expense entities.

### 2.4Constraints and Integrity Controls 
- Unique email in users table.
- Foreign keys with cascading delete for referential integrity.
- Application-level validation for:
  - `end_date >= start_date`
  - valid day label format (`Day N`)
  - day index within trip duration
  - positive monetary amount

---

## 3. Stored Logic (Application-Level DB Functions)

SQLite supports triggers but has limited procedural features compared to PostgreSQL. Therefore, critical business rules are implemented as deterministic backend functions that run before write operations.

### 3.1 Day Label Parser

Purpose: Convert day labels such as `Day 1`, `Day 2` to integer day indexes.

```python
def day_to_index(day_label: str) -> int:
    match = re.fullmatch(r"Day\s+(\d+)", day_label.strip(), flags=re.IGNORECASE)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid day label")
    return int(match.group(1))
```

### 3.2 Expense Date Resolver

Purpose: Derive actual expense date from trip start date + day label when explicit date is not provided.

```python
def expense_date_from_day(trip_start_date: str, day_label: str) -> str:
    day_number = day_to_index(day_label)
    trip_start = datetime.strptime(trip_start_date, "%Y-%m-%d").date()
    expense_date = trip_start + timedelta(days=day_number - 1)
    return expense_date.isoformat()
```

### 3.3 Currency Conversion Pipeline

Purpose: Convert entered amount to trip base currency and store both values.

```python
def convert_currency(amount, from_currency, to_currency, for_date):
    if from_currency == to_currency:
        return amount.quantize(Decimal("0.01")), Decimal("1")
    rate = fetch_rate(from_currency, to_currency, for_date)
    converted = (amount * rate).quantize(Decimal("0.01"))
    return converted, rate
```

### 3.4 Security-Critical Validation
Before inserting expense rows:
- user ownership of trip is verified
- day index is checked against trip duration
- normalized uppercase currency is enforced

This ensures only valid, authorized, and consistent records enter the database.

---

## 4. Trigger-Like Integrity Strategy

Although SQL triggers are not explicitly defined in the current SQLite script, equivalent protection is achieved using layered checks:

### 4.1 Layer 1: Schema Rules
- NOT NULL columns
- foreign key references
- unique email

    ### 4.2 Layer 2: API Validation Models
    Pydantic models (`RegisterIn`, `TripIn`, `TripUpdateIn`, `ExpenseIn`) reject invalid payloads before DB execution.

### 4.3 Layer 3: Transaction-Scope Business Checks
Before `INSERT INTO expenses`, the application verifies:
- trip exists and belongs to authenticated user
- day label is valid and in range
- derived/explicit date consistency

This layered design functions as an application-managed trigger framework.

---

## 5. Views and Access Control

### 5.1 Logical Ledger View
The endpoint `/api/v1/trips/{trip_id}/ledger` acts as a computed view over `trips + expenses`:
- returns trip metadata
- returns ordered expense rows (date, created_at, id)
- computes cumulative total in base currency

Equivalent SQL pattern:

```sql
SELECT id, trip_id, amount, currency, base_currency, converted_amount,
       conversion_rate, category, day_label, date, description, created_at
FROM expenses
WHERE trip_id = ?
ORDER BY date, created_at, id;
```

### 5.2 Permission Model
Authorization is token-based:
- Session token stored in sessions table
- Every trip/expense operation validates authenticated user
- Queries are user-scoped (`WHERE user_id = ?`) to enforce isolation

This approach provides row-level security behavior at the application layer.

---

## 6. Execution Workflow and Version Evolution

### 6.1 Expense Insert Workflow
1. User logs in and receives bearer token.
2. User selects trip and submits expense form.
3. Backend validates token and trip ownership.
4. Day label is parsed; date is resolved.
5. Currency conversion is performed.
6. Expense row is inserted with original + converted values.
7. Ledger endpoint returns updated totals and ordered entries.

### 6.2 Evolution in This Project
- Initial version: date-centric entry model.
- Improved version: day-wise model (`day_label`) for user-friendly flow.
- Added compatibility: optional date support for older clients.
- Reliability fix: robust type annotations for Python 3.14/Pydantic compatibility.
- Conversion fix: corrected fallback exchange-rate math to avoid wrong totals.

---

## 7. SQL Contribution to Performance and Reliability

### 7.1 Performance
- Lightweight SQLite engine ensures low overhead for mini project scope.
- Simple indexed primary keys and foreign-key joins.
- Ordered ledger query supports deterministic UI rendering.

### 7.2 Reliability and Atomicity
- Write operations are committed only after successful validation and conversion.
- Errors abort request before commit, preventing partial invalid inserts.
- Session expiry check ensures stale tokens cannot mutate data.

### 7.3 Data Integrity (Layered Defense)
- Database constraints protect structural consistency.
- Validation schemas protect input shape and types.
- Business-rule functions protect domain correctness.
- Ownership checks prevent cross-user access.

### 7.4 Maintainability and Extensibility
Current schema can be extended with:
- category master table
- budget limits per trip/day
- materialized summary tables for analytics
- audit log table for immutable history

The clear separation of user/trip/expense/session entities supports future growth.

---

## 8. Conclusion

The Travel Expense Manager demonstrates a practical DBMS implementation for a real-world use case. The project applies core database principles including normalization, referential integrity, secure access control, and consistent transactional writes. By storing both entered and converted monetary values, it preserves financial traceability while delivering a clear day-wise ledger interface.

From a DBMS perspective, the project succeeds in balancing usability, correctness, and reliability. The final system is simple enough for academic evaluation yet robust enough to demonstrate production-oriented design decisions such as layered validation, secure session handling, and deterministic reporting queries.

---

## Annexure A: API Endpoints Mapped to DB Operations

- `POST /api/v1/auth/register` -> INSERT users
- `POST /api/v1/auth/login` -> SELECT users, INSERT sessions
- `GET /api/v1/trips` -> SELECT trips by user
- `POST /api/v1/trips` -> INSERT trips
- `PUT /api/v1/trips/{trip_id}` -> UPDATE trips
- `DELETE /api/v1/trips/{trip_id}` -> DELETE trips (cascade expenses)
- `GET /api/v1/trips/{trip_id}/expenses` -> SELECT expenses by trip
- `POST /api/v1/trips/{trip_id}/expenses` -> INSERT expenses
- `DELETE /api/v1/trips/{trip_id}/expenses/{expense_id}` -> DELETE expense
- `GET /api/v1/trips/{trip_id}/ledger` -> SELECT + aggregate expense data

## Annexure B: Suggested Viva Questions

1. Why is `converted_amount` stored instead of computed on every read?
2. How does the system prevent one user from seeing another user’s trips?
3. Why is `day_label` used in addition to date?
4. What integrity guarantees come from foreign keys with `ON DELETE CASCADE`?
5. What changes are needed to migrate from SQLite to PostgreSQL?
