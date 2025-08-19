import Database from "better-sqlite3";
import path from "path";

// Use DB_PATH from environment or a default path relative to the working directory
// ATTENTION: if your Docker Compose maps 'data' to a volume, the path must be './data/app.db'
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');

// Create database at the specified path
const db = new Database(dbPath); // <--- Usar dbPath aqui

// Set WAL mode for better performance
db.pragma('journal_mode = WAL');

// Query to create users table
const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        avatar TEXT DEFAULT NULL,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,  
        nickname TEXT DEFAULT NULL,
        twofa_enabled INTEGER DEFAULT 0,
        twofa_secret TEXT DEFAULT NULL
    )
`;

// Query to create scores table (for blockchain backup)
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

// Query to create friends table (added by your colleague)
const createFriendsTable = `
    CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        friend1_id INTEGER NOT NULL,
        friend2_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(friend1_id) REFERENCES users(id),
        FOREIGN KEY(friend2_id) REFERENCES users(id),
        UNIQUE(friend1_id, friend2_id)
    )
`;

// Query to create games table (added by your colleague)
const createGamesTable = `
    CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER NOT NULL,
        player1_score INTEGER NOT NULL,
        player2_score INTEGER NOT NULL,
        winner_id INTEGER NOT NULL,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(player1_id) REFERENCES users(id),
        FOREIGN KEY(player2_id) REFERENCES users(id),
        FOREIGN KEY(winner_id) REFERENCES users(id)
    )
`;

// Create tables if they do not exist
try {
    db.exec(createUsersTable);
    // Check if columns 'wins', 'losses', and 'twofa_enabled' exist and add them if not
    const userColumns = db.prepare("PRAGMA table_info(users)").all();
    const hasWins = userColumns.some(col => col.name === 'wins');
    const hasLosses = userColumns.some(col => col.name === 'losses');
    const hasTwoFA = userColumns.some(col => col.name === 'twofa_enabled');
    const hasTwoFASecret = userColumns.some(col => col.name === 'twofa_secret');

    if (!hasWins) {
        db.exec("ALTER TABLE users ADD COLUMN wins INTEGER DEFAULT 0");
        console.log("Added 'wins' column to 'users' table.");
    }
    if (!hasLosses) {
        db.exec("ALTER TABLE users ADD COLUMN losses INTEGER DEFAULT 0");
        console.log("Added 'losses' column to 'users' table.");
    }
    if (!hasTwoFA) {
        db.exec("ALTER TABLE users ADD COLUMN twofa_enabled INTEGER DEFAULT 0");
        console.log("Added 'twofa_enabled' column to 'users' table.");
    }
    if (!hasTwoFASecret) {
        db.exec("ALTER TABLE users ADD COLUMN twofa_secret TEXT DEFAULT NULL");
        console.log("Added 'twofa_secret' column to 'users' table.");
    }

    db.exec(createScoresTable);
    db.exec(createFriendsTable); // Adicionado
    db.exec(createGamesTable);
    console.log('Database tables (users, scores, friends, games) created/checked successfully');
} catch (error) {
    console.error('Error creating database tables:', error);
}

// Function to gracefully close the database
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

export default db;