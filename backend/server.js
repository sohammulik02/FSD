/**
 * KTBS Ghatanji — Enquiry Backend Server
 * Express + SQLite (sql.js — pure JS, no native build needed)
 *
 * Admin views enquiries via local files:
 *   - enquiries_export.txt   (formatted table — open in any text editor)
 *   - enquiries_export.sql   (raw SQL dump for re-import)
 *
 * These files are auto-regenerated whenever data changes.
 */

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'enquiries.db');
const TXT_PATH = path.join(__dirname, 'enquiries_export.txt');
const SQL_PATH = path.join(__dirname, 'enquiries_export.sql');

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Database helpers ───────────────────────────────────────
let db; // will be set in init()

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Export all enquiries to a formatted TXT table and a SQL file.
 * Called automatically after every INSERT or DELETE.
 */
function exportFiles() {
  try {
    const result = db.exec('SELECT * FROM enquiries ORDER BY created_at DESC');

    // ── Formatted table export (.txt) ───────────────────
    const headers = ['ID', 'Full Name', 'Mobile Number', 'Email ID', 'Pin Code', 'Submitted At'];
    const dataRows = result.length > 0 ? result[0].values : [];

    // Calculate column widths (max of header vs data)
    const colWidths = headers.map((h, i) => {
      let max = h.length;
      dataRows.forEach(row => {
        const len = String(row[i] ?? '').length;
        if (len > max) max = len;
      });
      return max;
    });

    // Build table lines
    const pad = (str, width) => String(str ?? '').padEnd(width);
    const borderLine = '+-' + colWidths.map(w => '-'.repeat(w)).join('-+-') + '-+';
    const headerLine = '| ' + headers.map((h, i) => pad(h, colWidths[i])).join(' | ') + ' |';

    let txt = '';
    txt += '  KTBS Ghatanji — Enquiry Data\n';
    txt += `  Generated: ${new Date().toLocaleString()}\n`;
    txt += `  Total Enquiries: ${dataRows.length}\n\n`;
    txt += borderLine + '\n';
    txt += headerLine + '\n';
    txt += borderLine + '\n';

    if (dataRows.length === 0) {
      const emptyMsg = '(No enquiries yet)';
      const totalWidth = colWidths.reduce((a, b) => a + b, 0) + (colWidths.length - 1) * 3;
      const leftPad = Math.floor((totalWidth - emptyMsg.length) / 2);
      txt += '| ' + ' '.repeat(leftPad) + emptyMsg + ' '.repeat(totalWidth - leftPad - emptyMsg.length) + ' |\n';
    } else {
      dataRows.forEach(row => {
        const line = '| ' + row.map((val, i) => pad(val, colWidths[i])).join(' | ') + ' |';
        txt += line + '\n';
      });
    }

    txt += borderLine + '\n';
    fs.writeFileSync(TXT_PATH, txt, 'utf8');

    // ── SQL export ──────────────────────────────────────
    let sql = '-- KTBS Ghatanji Enquiries — SQL Dump\n';
    sql += `-- Generated: ${new Date().toISOString()}\n\n`;
    sql += `DROP TABLE IF EXISTS enquiries;\n\n`;
    sql += `CREATE TABLE enquiries (\n`;
    sql += `  id            INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
    sql += `  full_name     TEXT    NOT NULL,\n`;
    sql += `  mobile_number TEXT    NOT NULL,\n`;
    sql += `  email_id      TEXT    NOT NULL,\n`;
    sql += `  pin_code      TEXT    NOT NULL,\n`;
    sql += `  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    if (result.length > 0) {
      const rows = result[0].values;
      rows.forEach(row => {
        const [id, full_name, mobile_number, email_id, pin_code, created_at] = row;
        const esc = s => String(s ?? '').replace(/'/g, "''");
        sql += `INSERT INTO enquiries (id, full_name, mobile_number, email_id, pin_code, created_at) VALUES (${id}, '${esc(full_name)}', '${esc(mobile_number)}', '${esc(email_id)}', '${esc(pin_code)}', '${esc(created_at)}');\n`;
      });
    }

    fs.writeFileSync(SQL_PATH, sql, 'utf8');

    console.log('  📁  Exported → enquiries_export.txt & enquiries_export.sql');
  } catch (err) {
    console.error('Export error:', err);
  }
}

async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing DB file or create a new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name     TEXT    NOT NULL,
      mobile_number TEXT    NOT NULL,
      email_id      TEXT    NOT NULL,
      pin_code      TEXT    NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  saveDb();

  // Generate export files on startup
  exportFiles();
}

// ── API Routes ─────────────────────────────────────────────

// POST  /api/enquiry  — submit a new enquiry
app.post('/api/enquiry', (req, res) => {
  const { fullName, mobileNumber, emailId, pinCode } = req.body;

  // Basic validation
  if (!fullName || !mobileNumber || !emailId || !pinCode) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required (fullName, mobileNumber, emailId, pinCode).'
    });
  }

  try {
    db.run(
      `INSERT INTO enquiries (full_name, mobile_number, email_id, pin_code) VALUES (?, ?, ?, ?)`,
      [fullName.trim(), mobileNumber.trim(), emailId.trim(), pinCode.trim()]
    );
    saveDb();
    exportFiles(); // auto-update local files

    // Get last inserted id
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];

    return res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully!',
      id: id
    });
  } catch (err) {
    console.error('DB insert error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// GET  /api/enquiries  — list all enquiries
app.get('/api/enquiries', (_req, res) => {
  try {
    const result = db.exec('SELECT * FROM enquiries ORDER BY created_at DESC');

    let rows = [];
    if (result.length > 0) {
      const columns = result[0].columns;
      rows = result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    }

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('DB read error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE  /api/enquiry/:id  — delete an enquiry (admin handled it)
app.delete('/api/enquiry/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID.' });
  }

  try {
    // Check if it exists
    const check = db.exec(`SELECT id FROM enquiries WHERE id = ${id}`);
    if (check.length === 0 || check[0].values.length === 0) {
      return res.status(404).json({ success: false, message: `Enquiry #${id} not found.` });
    }

    db.run(`DELETE FROM enquiries WHERE id = ?`, [id]);
    saveDb();
    exportFiles(); // auto-update local files

    return res.json({ success: true, message: `Enquiry #${id} deleted successfully.` });
  } catch (err) {
    console.error('DB delete error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE  /api/enquiries  — delete ALL enquiries (clear table)
app.delete('/api/enquiries', (_req, res) => {
  try {
    db.run(`DELETE FROM enquiries`);
    saveDb();
    exportFiles();
    return res.json({ success: true, message: 'All enquiries deleted.' });
  } catch (err) {
    console.error('DB delete-all error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Serve frontend static files from parent directory ──────
app.use(express.static(path.join(__dirname, '..')));

// ── Start server ───────────────────────────────────────────
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  ✅  KTBS Enquiry Server running at  http://localhost:${PORT}`);
    console.log(`  📁  Enquiry data exported to:`);
    console.log(`       ${TXT_PATH}`);
    console.log(`       ${SQL_PATH}`);
    console.log(`\n  💡  Use "node admin-tool.js" to manage enquiries from the command line.\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  if (db) db.close();
  process.exit(0);
});
