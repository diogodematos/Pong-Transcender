import Database from "better-sqlite3";

const db = new Database('app.db');
const query = `
	CREATE TABLE users(
		id INTEGER PRIMARY KEY,
		username STRING NOT NULL UNIQUE,
		password STRING NOT NULL,
		email STRING NOT NULL UNIQUE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)
`

if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get() === undefined) {
	db.exec(query);
}

export default db;