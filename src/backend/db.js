import Database from "better-sqlite3";
import path from "path";

// Configurar caminho da base de dados para funcionar com Docker
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');

// Criar base de dados
const db = new Database('./data/app.db');

// Configurar WAL mode para melhor performance
db.pragma('journal_mode = WAL');

// Query para criar tabela de utilizadores
const createUsersTable = `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE,
		avatar TEXT DEFAULT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)
`;

// Query para criar tabela de scores (para blockchain backup)
const createScoresTable = `
	CREATE TABLE IF NOT EXISTS scores (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		tournament_id TEXT,
		score INTEGER NOT NULL,
		blockchain_hash TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users (id)
	)
`;

// Criar tabelas se não existirem
try {
	db.exec(createUsersTable);
	db.exec(createScoresTable);
	console.log('Database tables created successfully');
} catch (error) {
	console.error('Error creating database tables:', error);
}

// Função para fechar a base de dados gracefully
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

export default db;
