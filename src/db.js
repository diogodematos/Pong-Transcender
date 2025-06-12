import Database from "better-sqlite3";
const db = new Database('app.db');

// Criar tabelas uma de cada vez
const createUsers = `
CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar TEXT,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0
)`;

const createFriends = `
CREATE TABLE IF NOT EXISTS friends(
    id INTEGER PRIMARY KEY,
    friend1_id INTEGER NOT NULL,
    friend2_id INTEGER NOT NULL,
    FOREIGN KEY(friend1_id) REFERENCES users(id),
    FOREIGN KEY(friend2_id) REFERENCES users(id),
    UNIQUE(friend1_id, friend2_id)
)`;

const createGames = `
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY,
    player1_id INTEGER NOT NULL,
    player2_id INTEGER NOT NULL,
    player1_score INTEGER NOT NULL,
    player2_score INTEGER NOT NULL,
    winner_id INTEGER,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(player1_id) REFERENCES users(id),
    FOREIGN KEY(player2_id) REFERENCES users(id),
    FOREIGN KEY(winner_id) REFERENCES users(id)
)`;

db.exec(createUsers);
db.exec(createFriends);
db.exec(createGames);

export default db;