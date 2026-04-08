import Database from 'better-sqlite3';
import path from 'path';
const db = new Database(path.join(process.cwd(), 'data', 'notes.db'));
db.exec(`CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT, parent_id TEXT, is_folder INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
try { db.exec(`ALTER TABLE notes ADD COLUMN sort_order INTEGER DEFAULT 0`); } catch(e) {}
export default db;
