#!/usr/bin/env python3
"""
Export SQLite database to readable formats: SQL dump and CSV files.
"""

import sqlite3
import csv
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent / "travel_expense.db"
EXPORT_DIR = Path(__file__).parent / "database_exports"

def export_sql_dump():
    """Export entire database as SQL script."""
    conn = sqlite3.connect(DB_PATH)
    
    dump_file = EXPORT_DIR / "database_dump.sql"
    with open(dump_file, "w") as f:
        for line in conn.iterdump():
            f.write(f"{line}\n")
    
    conn.close()
    print(f"✓ SQL dump exported to: {dump_file}")

def export_csv_tables():
    """Export each table as CSV file."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    
    for table_name in tables:
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [row[1] for row in cursor.fetchall()]
        
        csv_file = EXPORT_DIR / f"{table_name}.csv"
        with open(csv_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(columns)
            writer.writerows(rows)
        
        print(f"✓ Table '{table_name}' exported to: {csv_file} ({len(rows)} rows)")
    
    conn.close()

def export_json():
    """Export entire database as JSON."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    data = {}
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    
    for table_name in tables:
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        data[table_name] = [dict(row) for row in rows]
    
    json_file = EXPORT_DIR / "database.json"
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    
    conn.close()
    print(f"✓ JSON export created: {json_file}")

def create_readable_summary():
    """Create a human-readable summary of the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    summary_file = EXPORT_DIR / "DATABASE_SUMMARY.txt"
    
    with open(summary_file, "w", encoding="utf-8") as f:
        f.write("=" * 80 + "\n")
        f.write("TRAVEL EXPENSE MANAGER - DATABASE SUMMARY\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        
        for table_name in tables:
            f.write("\n" + "=" * 80 + "\n")
            f.write(f"TABLE: {table_name.upper()}\n")
            f.write("=" * 80 + "\n\n")
            
            # Get schema
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            
            f.write("COLUMNS:\n")
            f.write("-" * 80 + "\n")
            for col in columns:
                col_name, col_type = col[1], col[2]
                notnull = "NOT NULL" if col[3] else "NULLABLE"
                f.write(f"  • {col_name:<25} {col_type:<15} {notnull}\n")
            
            # Get data
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]
            
            f.write(f"\nTOTAL ROWS: {row_count}\n")
            f.write("-" * 80 + "\n\n")
            
            if row_count > 0:
                cursor.execute(f"SELECT * FROM {table_name} LIMIT 10")
                rows = cursor.fetchall()
                
                f.write("SAMPLE DATA (First 10 rows):\n\n")
                for idx, row in enumerate(rows, 1):
                    f.write(f"  Record {idx}:\n")
                    for col_name, value in zip([c[1] for c in columns], row):
                        value_str = str(value) if value is not None else "NULL"
                        # Truncate long values
                        if len(value_str) > 70:
                            value_str = value_str[:67] + "..."
                        f.write(f"    {col_name:<25} {value_str}\n")
                    f.write("\n")
    
    conn.close()
    print(f"✓ Readable summary created: {summary_file}")

if __name__ == "__main__":
    EXPORT_DIR.mkdir(exist_ok=True)
    
    print("\nExporting Travel Expense Manager Database...\n")
    print(f"Source: {DB_PATH}\n")
    
    export_sql_dump()
    export_csv_tables()
    export_json()
    create_readable_summary()
    
    print(f"\n✓ All exports saved to: {EXPORT_DIR}\n")
    print("Files created:")
    print("  • database_dump.sql  - Full SQL dump (import into any SQL tool)")
    print("  • *.csv files        - Individual table exports for spreadsheets")
    print("  • database.json      - Entire database in JSON format")
    print("  • DATABASE_SUMMARY.txt - Human-readable overview\n")
