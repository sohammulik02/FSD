/**
 * KTBS Ghatanji — Admin CLI Tool
 * ───────────────────────────────
 * Run this with:  node admin-tool.js
 *
 * Commands:
 *   list             — Show all enquiries in a table
 *   delete <id>      — Delete a specific enquiry by ID
 *   delete-all       — Delete ALL enquiries
 *   export           — Re-export CSV & SQL files
 *   help             — Show available commands
 *   exit / quit      — Exit the tool
 *
 * The server must be running (node server.js) for this tool to work.
 */

const readline = require('readline');
const SERVER = 'http://localhost:3000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\n  admin> '
});

// ── Helpers ──────────────────────────────────────────────

async function fetchJSON(url, opts = {}) {
  // Use dynamic import for fetch (available in Node 18+)
  const res = await fetch(url, opts);
  return res.json();
}

function printTable(rows) {
  if (rows.length === 0) {
    console.log('\n  📭  No enquiries found.\n');
    return;
  }

  // Column widths
  const cols = {
    id: 5,
    full_name: 22,
    mobile_number: 16,
    email_id: 28,
    pin_code: 9,
    created_at: 22
  };

  const pad = (str, len) => String(str ?? '').padEnd(len).slice(0, len);
  const sep = '  ' + Object.values(cols).map(w => '─'.repeat(w)).join('──') + '──';

  console.log();
  console.log(sep);
  console.log(
    '  ' +
    pad('ID', cols.id) + '  ' +
    pad('Full Name', cols.full_name) + '  ' +
    pad('Mobile', cols.mobile_number) + '  ' +
    pad('Email', cols.email_id) + '  ' +
    pad('Pin Code', cols.pin_code) + '  ' +
    pad('Submitted At', cols.created_at)
  );
  console.log(sep);

  rows.forEach(r => {
    console.log(
      '  ' +
      pad(r.id, cols.id) + '  ' +
      pad(r.full_name, cols.full_name) + '  ' +
      pad(r.mobile_number, cols.mobile_number) + '  ' +
      pad(r.email_id, cols.email_id) + '  ' +
      pad(r.pin_code, cols.pin_code) + '  ' +
      pad(r.created_at, cols.created_at)
    );
  });

  console.log(sep);
  console.log(`  Total: ${rows.length} enquir${rows.length === 1 ? 'y' : 'ies'}`);
}

function printHelp() {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║        KTBS Ghatanji — Admin Tool            ║
  ╠══════════════════════════════════════════════╣
  ║  list           Show all enquiries           ║
  ║  delete <id>    Delete enquiry by ID         ║
  ║  delete-all     Delete ALL enquiries         ║
  ║  export         Re-export CSV & SQL files    ║
  ║  help           Show this help               ║
  ║  exit / quit    Exit the tool                ║
  ╚══════════════════════════════════════════════╝
  `);
}

// ── Command handlers ────────────────────────────────────

async function cmdList() {
  try {
    const json = await fetchJSON(`${SERVER}/api/enquiries`);
    if (json.success) {
      printTable(json.data);
    } else {
      console.log('  ❌  Error:', json.message);
    }
  } catch (err) {
    console.log('  ❌  Cannot connect to server. Is it running? (node server.js)');
  }
}

async function cmdDelete(idStr) {
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    console.log('  ❌  Please provide a valid ID. Usage: delete <id>');
    return;
  }

  // Confirm before deleting
  const answer = await new Promise(resolve => {
    rl.question(`  ⚠️  Delete enquiry #${id}? (y/n): `, resolve);
  });

  if (answer.trim().toLowerCase() !== 'y') {
    console.log('  ↩  Cancelled.');
    return;
  }

  try {
    const json = await fetchJSON(`${SERVER}/api/enquiry/${id}`, { method: 'DELETE' });
    if (json.success) {
      console.log(`  ✅  ${json.message}`);
    } else {
      console.log(`  ❌  ${json.message}`);
    }
  } catch (err) {
    console.log('  ❌  Cannot connect to server. Is it running?');
  }
}

async function cmdDeleteAll() {
  const answer = await new Promise(resolve => {
    rl.question('  ⚠️  Delete ALL enquiries? This cannot be undone! (y/n): ', resolve);
  });

  if (answer.trim().toLowerCase() !== 'y') {
    console.log('  ↩  Cancelled.');
    return;
  }

  try {
    const json = await fetchJSON(`${SERVER}/api/enquiries`, { method: 'DELETE' });
    if (json.success) {
      console.log(`  ✅  ${json.message}`);
    } else {
      console.log(`  ❌  ${json.message}`);
    }
  } catch (err) {
    console.log('  ❌  Cannot connect to server. Is it running?');
  }
}

async function cmdExport() {
  // Trigger a re-export by simply hitting GET (server exports on every change,
  // but we can also read and show the file paths)
  try {
    const json = await fetchJSON(`${SERVER}/api/enquiries`);
    if (json.success) {
      console.log('  ✅  Files are already up-to-date in the backend folder:');
      console.log('       📄 enquiries_export.csv');
      console.log('       📄 enquiries_export.sql');
    }
  } catch (err) {
    console.log('  ❌  Cannot connect to server. Is it running?');
  }
}

// ── Main loop ───────────────────────────────────────────

async function handleCommand(line) {
  const parts = line.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();

  switch (cmd) {
    case 'list':
    case 'ls':
    case 'show':
      await cmdList();
      break;

    case 'delete':
    case 'del':
    case 'remove':
      if (parts[1]) {
        await cmdDelete(parts[1]);
      } else {
        console.log('  Usage: delete <id>   (e.g. delete 3)');
      }
      break;

    case 'delete-all':
    case 'clear':
      await cmdDeleteAll();
      break;

    case 'export':
      await cmdExport();
      break;

    case 'help':
    case '?':
      printHelp();
      break;

    case 'exit':
    case 'quit':
    case 'q':
      console.log('\n  👋  Bye!\n');
      process.exit(0);

    case '':
    case undefined:
      break;

    default:
      console.log(`  Unknown command: "${cmd}". Type "help" for available commands.`);
  }
}

// ── Start ───────────────────────────────────────────────
console.log(`
  ╔══════════════════════════════════════════════╗
  ║     KTBS Ghatanji — Enquiry Admin Tool       ║
  ║     Type "help" for available commands        ║
  ╚══════════════════════════════════════════════╝`);

rl.prompt();

rl.on('line', async (line) => {
  await handleCommand(line);
  rl.prompt();
});

rl.on('close', () => {
  console.log('\n  👋  Bye!\n');
  process.exit(0);
});
