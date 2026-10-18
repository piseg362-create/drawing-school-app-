const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const devDbPath = path.join(projectRoot, 'dev.db');
const resourcesDir = path.join(projectRoot, 'resources');
const emptyDbPath = path.join(resourcesDir, 'prod-empty.db');

if (!fs.existsSync(devDbPath)) {
  console.error(`[prepare-production-db] Error: Source database not found at ${devDbPath}`);
  process.exit(1);
}

if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

if (fs.existsSync(emptyDbPath)) {
  fs.unlinkSync(emptyDbPath);
}

console.log('[prepare-production-db] Generating clean production database template...');

const devDb = new Database(devDbPath);
const emptyDb = new Database(emptyDbPath);

// Extract all table and index definitions from devDb
const schemaRows = devDb.prepare(`
  SELECT sql FROM sqlite_master 
  WHERE sql IS NOT NULL 
    AND name NOT LIKE 'sqlite_%'
    AND name NOT LIKE '_prisma_%'
  ORDER BY type = 'table' DESC, type = 'index' DESC
`).all();

emptyDb.pragma('foreign_keys = OFF');

for (const row of schemaRows) {
  if (row.sql) {
    emptyDb.exec(row.sql);
  }
}

emptyDb.pragma('foreign_keys = ON');

// Verify that all tables exist and have 0 rows
const tables = emptyDb.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type = 'table' 
    AND name NOT LIKE 'sqlite_%'
`).all();

console.log(`[prepare-production-db] Created ${tables.length} tables with 0 rows in ${emptyDbPath}`);
for (const table of tables) {
  const count = emptyDb.prepare(`SELECT count(*) as count FROM "${table.name}"`).get();
  if (count.count !== 0) {
    console.warn(`[prepare-production-db] Warning: Table ${table.name} has ${count.count} rows!`);
  }
}

devDb.close();
emptyDb.close();
console.log('✅ Clean production database ready for packaging.');
