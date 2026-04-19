# Database Exports - Travel Expense Manager

All database files have been exported in multiple readable formats. Choose the format that works best for your needs!

## 📋 Available Formats

### 1. **DATABASE_SUMMARY.txt** ⭐ **START HERE**
   - **Best for:** Quick overview of all tables and data
   - **Format:** Plain text, human-readable
   - **Content:** 
     - Column definitions for each table
     - Row counts
     - Sample records with all fields displayed nicely
   - **Open with:** Any text editor (Notepad, VS Code, etc.)

### 2. **database_dump.sql**
   - **Best for:** Backing up data or importing into another database
   - **Format:** SQL script
   - **Content:** 
     - Complete schema (CREATE TABLE statements)
     - All data as INSERT statements
     - Can be imported into SQLite, MySQL, PostgreSQL, etc.
   - **Open with:** Text editor or SQL tools
   - **Usage:** `sqlite3 new_db.db < database_dump.sql`

### 3. **users.csv**
   - **Best for:** Viewing users in spreadsheet format
   - **Format:** Comma-separated values
   - **Content:** All user accounts with columns: id, full_name, email, password_hash, created_at
   - **Open with:** Excel, Google Sheets, or any spreadsheet app

### 4. **trips.csv**
   - **Best for:** Viewing all trips in spreadsheet format
   - **Format:** Comma-separated values
   - **Content:** All trips with columns: id, user_id, title, destination_country, start_date, end_date, base_currency, created_at
   - **Open with:** Excel, Google Sheets, or any spreadsheet app

### 5. **expenses.csv**
   - **Best for:** Viewing all expenses in spreadsheet format
   - **Format:** Comma-separated values
   - **Content:** All expenses with columns: id, trip_id, amount, currency, base_currency, converted_amount, conversion_rate, category, date, description, created_at
   - **Open with:** Excel, Google Sheets, or any spreadsheet app

### 6. **sessions.csv**
   - **Best for:** Viewing active sessions
   - **Format:** Comma-separated values
   - **Content:** Session tokens with columns: token, user_id, expires_at, created_at
   - **Open with:** Excel, Google Sheets, or any spreadsheet app

### 7. **database.json**
   - **Best for:** Integration with web apps, APIs, or scripting
   - **Format:** JSON (JavaScript Object Notation)
   - **Content:** Entire database as nested JSON objects
   - **Open with:** Code editors, online JSON viewers
   - **Usage:** Parse in JavaScript, Python, etc. for data processing

---

## 🚀 Quick Start

1. **For a quick look at your data:**
   - Open `DATABASE_SUMMARY.txt` in any text editor

2. **For Excel/Google Sheets:**
   - Open any `.csv` file with Excel or Google Sheets
   - Data will be automatically formatted into columns and rows

3. **To backup your database:**
   - Keep `database_dump.sql` safe
   - Can restore later: `sqlite3 restored_db.db < database_dump.sql`

4. **For programming/API use:**
   - Use `database.json` in your applications

---

## 📊 Current Database Status

| Table | Rows | Description |
|-------|------|-------------|
| **users** | 5 | User accounts and credentials |
| **trips** | 4 | Travel trips with dates and currencies |
| **expenses** | 2 | Individual expenses with conversions |
| **sessions** | 0 | Active user sessions (auto-expires) |

---

## 🔄 Regenerating Exports

Run this command anytime to update all exports with the latest database:

```bash
python export_database.py
```

All files will be updated in the `database_exports/` folder.

---

**Last exported:** 2026-04-19 21:17:59
