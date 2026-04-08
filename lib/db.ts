import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 1. 动态获取 data 目录的绝对路径
const dataDir = path.join(process.cwd(), 'data');

// 2. 如果目录不存在，则自动递归创建它
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 3. 正常连接并初始化数据库
const db = new Database(path.join(dataDir, 'notes.db'));
db.exec(`CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT, parent_id TEXT, is_folder INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
try { db.exec(`ALTER TABLE notes ADD COLUMN sort_order INTEGER DEFAULT 0`); } catch(e) {}

export default db;
