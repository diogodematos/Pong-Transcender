import db from '../db.js';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
dotenv.config();
import argon2 from 'argon2';
import path from 'path';
import pump from 'pump';    
import * as fs from 'fs';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{7,20}$/;
const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z]+\.[a-zA-Z]{2,}$/;

// Map to manage users connected via WebSocket
const connectedUsers = new Map();

const usersController = async (fastify, options) => {

    // --- Test Route (GET /api/users/) ---
    fastify.get('/', async (req, reply) => {
        try {
            const users = db.prepare('SELECT id, username FROM users').all();
            return { users };
        } catch(error) {
            req.log.error(`Error fetching users: ${error.message}`);
            return reply.status(500).send({ error: 'Internal Server Error', details: error.message });
        }
    });

    // --- WebSocket Endpoint (GET /api/users/ws) ---
    fastify.get('/ws', { websocket: true }, (connection, req) => {
    req.log.info('--> START: WebSocket connection attempt.');

    // connection.socket is the actual WebSocket object
        const socket = connection;

    //if (!socket) {
    //    req.log.error('WebSocket not available in connection.');
    //    return;
    //}

        const params = new URL(req.url, 'http://localhost').searchParams;
        const token = params.get('token');

        if (!token) {
            req.log.warn('JWT token missing in WebSocket connection.');
            socket.close(1008, 'Token is required'); // 1008 is a policy error code
            return;
        }

        try {
            const decoded = fastify.jwt.verify(token);
            const userId = decoded.id;

            if (!userId) {
                req.log.warn(`Invalid user ID in WebSocket token for token: ${token}`);
                socket.close(1008, 'Invalid user ID');
                return;
            }

            if (socket.readyState !== 1) { // WebSocket.OPEN = 1
                req.log.warn(`Socket for user ${userId} is not ready (readyState: ${socket.readyState}).`);
                socket.close(1008, 'Connection not ready');
                return;
            }

            // Store the user's connection
            connectedUsers.set(userId, socket);
            req.log.info(`User ${userId} connected via WebSocket.`);

            // Event Listeners
            socket.on('close', (code, reason) => {
                connectedUsers.delete(userId);
                req.log.info(`User ${userId} disconnected (Code: ${code}, Reason: ${reason || 'N/A'}).`);
            });

            socket.on('message', (message) => {
                req.log.info(`Message received from ${userId}: ${message}`);
                // Example: echo the message back
                socket.send(JSON.stringify({ type: 'echo', data: message.toString() }));
            });

            socket.on('error', (error) => {
                req.log.error(`WebSocket error for user ${userId}: ${error.message}`);
                connectedUsers.delete(userId);
            });

            // Send welcome message
            socket.send(JSON.stringify({
                type: 'welcome',
                message: 'Connected successfully to WebSocket',
                userId: userId
            }));

        } catch (error) {
            req.log.error(`Error verifying JWT for WebSocket: ${error.message}`);
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                socket.close(1008, `Invalid or expired token: ${error.message}`);
            } else {
                socket.close(1008, `Authentication error: ${error.message}`);
            }
        }
    });
    fastify.post('/register', async (req, reply) => {
        req.log.info('--> START: Registration request received.');
        req.log.info('Request headers:', req.headers);

        try {
            const parts = req.parts();
            const userData = {};
            let avatarFile;

            req.log.info('Processing multipart form parts for registration...');
            for await (const part of parts) {
                if (part.file) {
                    avatarFile = part;
                    req.log.info(`Avatar file received: ${part.filename}`);
                } else {
                    userData[part.fieldname] = part.value;
                    req.log.info(`Field received: ${part.fieldname} = ${part.value}`);
                }
            }
            req.log.info('All multipart form parts processed for registration.');
            if (!avatarFile) {
                const defaultAvatarPath = path.join(process.cwd(), 'uploads', 'default-avatar.jpg');
                req.log.info(`Using default avatar from: ${defaultAvatarPath}`);
                avatarFile = {
                    filename: 'default-avatar.jpg',
                    file: fs.createReadStream(defaultAvatarPath)
                };
            }

            const { username, password, email } = userData;

            if (!username || !password || !email) {
                return reply.status(400).send({ error: 'Missing required fields (username, password, email).' });
            }

            if (!passwordRegex.test(password)) {
                return reply.status(400).send({ error: 'Invalid password. It must be 7-20 characters, include at least one uppercase letter, one lowercase letter, and one number.' });
            }

            if (!emailRegex.test(email)) {
                return reply.status(400).send({ error: 'Invalid email.' });
            }

            const hashedPassword = await argon2.hash(password);
            req.log.info('Password hashed.');

            // SEUS CAMINHOS DE AVATAR PREFERIDOS
            const avatarFilename = `${username}-${Date.now()}-${avatarFile.filename}`;
            const avatarPath = path.join(process.cwd(), 'uploads', avatarFilename);
            req.log.info(`Attempting to save avatar file to: ${avatarPath}`);

            await new Promise((resolve, reject) => {
                pump(avatarFile.file, fs.createWriteStream(avatarPath), (err) => {
                    if (err) {
                        req.log.error(`Error saving avatar: ${err.message}`);
                        return reject(err);
                    }
                    resolve();
                });
            });
            req.log.info(`Avatar file ${avatarFilename} saved successfully.`);

            const avatarURL = `/uploads/${avatarFilename}`;

            const stmt = db.prepare("INSERT INTO users (username, password, email, avatar) VALUES (?, ?, ?, ?)");
            const info = stmt.run(username, hashedPassword, email, avatarURL);
            req.log.info(`User ${username} registered with ID: ${info.lastInsertRowid}`);

            return reply.send({ success: true, message: 'User registered successfully!' });

        } catch (error) {
            req.log.error(`ERROR during user registration: ${error.message}`, error);
            if (!reply.sent) {
                if (error.message.includes('UNIQUE constraint failed')) {
                    return reply.status(409).send({ error: 'Username or email already exists.' });
                }
                return reply.status(500).send({ error: 'Internal Server Error during user registration.', details: error.message });
            }
        }
    });

    // --- POST /api/users/login - User login ---
    fastify.post('/login', async (req, reply) => {
        const { username, password, twofa_code } = req.body;
        if (!username || !password) {
            return reply.status(400).send({ error: 'Missing username or password' });
        }
        try {
            const dbUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
            if (!dbUser) {
                return reply.status(404).send({ error: 'User not found' });
            }
            const passwordMatch = await argon2.verify(dbUser.password, password);
            if (!passwordMatch) {
                return reply.status(401).send({ error: 'Invalid password' });
            }
            if (dbUser.twofa_enabled) {
                if (!twofa_code) return reply.status(401).send({ error: '2FA code required' });
                const verified = speakeasy.totp.verify({
                  secret: dbUser.twofa_secret,
                  encoding: 'base32',
                  token: twofa_code
                });
                if (!verified) 
                    return reply.status(401).send({ error: 'Invalid 2FA code' });
            }
            // Use fastify.jwt.sign to sign the token (secretKey set in JWT plugin)
            const token = fastify.jwt.sign({ id: dbUser.id }, { expiresIn: '1h', secret: process.env.JWT_SECRET });
            return { success: true, message: 'User logged in', token, dbUser: { id: dbUser.id, username: dbUser.username } }; // Includes dbUser.id for consistency
        } catch (error) {
            req.log.error(`Error during login: ${error.message}`);
            return reply.status(500).send({ error: 'Internal server error', details: error.message });
        }
    });

        fastify.post('/twofa/setup', { onRequest: [fastify.authenticate] }, async (req, reply) => {
                const userId = req.user.id;
                const secret = speakeasy.generateSecret({ name: 'PokePong' });
                await db.prepare('UPDATE users SET twofa_secret = ?, twofa_enabled = 1 WHERE id = ?')
                    .run(secret.base32, userId);
                const qrCode = await qrcode.toDataURL(secret.otpauth_url);
                return { qrCode, secret: secret.base32 };
        });

        fastify.post('/twofa/disable', { onRequest: [fastify.authenticate] }, async (req, reply) => {
                const userId = req.user.id;
                try {
                    await db.prepare('UPDATE users SET twofa_enabled = 0, twofa_secret = NULL WHERE id = ?').run(userId);
                    return { success: true, message: '2FA successfully disabled' };
                } catch (error) {
                    req.log.error(`Error disabling 2FA: ${error.message}`);
                    return reply.status(500).send({ error: 'Internal error disabling 2FA' });
                }
            });
      
    fastify.get('/twofa/status', { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const userId = req.user.id;
        const user = db.prepare('SELECT twofa_enabled FROM users WHERE id = ?').get(userId);
        return { twofa_enabled: user?.twofa_enabled === 1 };
    });
      

    // --- POST /api/users/google-login - Login Google OAuth ---
    fastify.post('/google-login', async (req, reply) => {
        req.log.info('--> START: Google login request received.');
        const { idToken } = req.body;

        if (!idToken) {
            req.log.warn('ID Token missing in Google login request.');
            return reply.status(400).send({ error: 'Missing ID token' });
        }

        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID // Seu Audience ID
            });
            const payload = ticket.getPayload();
            const { email, name, picture } = payload;
            
            let avatarUrlFromGoogle = picture;
            if (avatarUrlFromGoogle && avatarUrlFromGoogle.startsWith('http://')) {
                avatarUrlFromGoogle = avatarUrlFromGoogle.replace('http://', 'https://');
                req.log.info(`Google avatar URL converted to HTTPS: ${avatarUrlFromGoogle}`);
            }

            const username = name || email.split('@')[0];

            req.log.info(`Google token verified for email: ${email}`);

            let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

            if (!user) {
                req.log.info(`User with email ${email} not found. Creating new record.`);
                const insertStmt = db.prepare('INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)');
                // Use your system's default avatar if 'picture' is not provided
                const defaultAvatarUrl = '/uploads/default-avatar.jpg'; // Your preferred paths
                const info = insertStmt.run(username, email, 'google-auth', picture || defaultAvatarUrl);
                user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
                req.log.info(`New Google user ${username} registered with ID: ${user.id}`);
            } else {
                req.log.info(`User with email ${email} found (ID: ${user.id}).`);
                // Update avatar if different and not the system or Google default (if Google provides a different one)
                if (picture && user.avatar !== picture && user.avatar !== '/uploads/default-avatar.jpg') {
                    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(picture, user.id);
                    req.log.info(`Avatar for user ${user.username} updated to: ${picture}`);
                }
            }

            // Usa fastify.jwt.sign para assinar o token
            const token = fastify.jwt.sign({ id: user.id }, { expiresIn: '1h', secret: process.env.JWT_SECRET });
            req.log.info(`JWT token generated for user ${user.username}.`);

            return reply.send({ success: true, message: 'Google login successful', token, user: { username: user.username } });

        } catch (error) {
            req.log.error(`ERROR during Google login: ${error.message}`, error);
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                return reply.status(401).send({ error: 'Invalid or expired Google token', details: error.message });
            }
            return reply.status(500).send({ error: 'Internal Server Error during Google login.', details: error.message });
        }
    });

    // --- GET /api/users/dashboard - Dashboard Route ---
    fastify.get('/dashboard', {
    onRequest: [fastify.authenticate], // Protected by JWT authentication
        handler: async (request, reply) => {
            try {
                const userId = request.user.id;
                const user = db.prepare('SELECT id, username, avatar, wins, losses FROM users WHERE id = ?').get(userId);

                if (!user) {
                    request.log.warn(`User with ID ${userId} not found for dashboard.`);
                    return reply.status(404).send({ message: 'User not found.' });
                }

                return reply.send({
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar || '/uploads/default-avatar.jpg',
                    wins: user.wins || 0,
                    losses: user.losses || 0,
                });

            } catch (error) {
                request.log.error(`Error fetching dashboard data for user ${request.user?.id}: ${error.message}`, error);
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: error.message });
                }
                return reply.status(500).send({ error: 'Internal server error loading dashboard.', details: error.message });
            }
        }
    });

    // --- GET /api/users/profile - Get user profile data ---
    fastify.get('/profile', {
    onRequest: [fastify.authenticate], // Protected by JWT authentication
        handler: async (req, reply) => {
            const userId = req.user.id;
            try {
                const user = db.prepare('SELECT id, username, email, avatar, wins, losses FROM users WHERE id = ?').get(userId);
                if (!user) {
                    return reply.status(404).send({ error: 'User not found' });
                }
                return reply.send({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar || '/uploads/default-avatar.jpg',
                    wins: user.wins || 0,
                    losses: user.losses || 0,
                });
            } catch (error) {
                req.log.error(`Error fetching profile: ${error.message}`);
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: error.message });
                }
                return reply.status(500).send({ error: 'Internal server error', details: error.message });
            }
        }
    });

    // --- GET /api/users/profile/id - Get profile data for a user by id---
    fastify.get('/profile/:id', {
    onRequest: [fastify.authenticate], // Protected by JWT authentication
        handler: async (req, reply) => {
            try {
                const {id} = req.params;
                const userId = req.user.id;
                console.log(`Fetching profile for user ID: ${id} by authenticated user ID: ${userId}`);
                const user = db.prepare('SELECT id, username, avatar, wins, losses FROM users WHERE id = ?').get(id);
                if (!user) {
                    return reply.status(404).send({ error: 'User not found' });
                }
                return reply.send({
                    username: user.username,
                    avatar: user.avatar || '/uploads/default-avatar.jpg',
                    wins: user.wins || 0,
                    losses: user.losses || 0,
                });
            } catch (error) {
                req.log.error(`Error fetching profile: ${error.message}`);
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: error.message });
                }
                return reply.status(500).send({ error: 'Internal server error', details: error.message });
            }
        }
    });

    // --- PUT /api/users/updateProfile - Update user profile (including avatar) ---
    fastify.put('/updateProfile', { onRequest: [fastify.authenticate] }, async (req, reply) => {
        try {
            const userId = req.user.id; // Authenticated user ID

            let newAvatarFile;
            let newAvatarFilename = null;
            let newAvatarPath = null;
            let newAvatarURL = null;
            let fieldsToUpdate = {};

            req.log.info('--> START: updateProfile request received.');

            const user = db.prepare('SELECT id, username, email, avatar, password FROM users WHERE id = ?').get(userId);
            if (!user) {
                req.log.warn(`User with ID ${userId} not found for update.`);
                return reply.status(404).send({ error: 'User not found' });
            }
            req.log.info(`User ${user.username} (ID: ${user.id}) found for update.`);

            const parts = req.parts();
            req.log.info('Processing multipart form parts for update...');
            for await (const part of parts) {
                if (part.file) {
                    newAvatarFile = part;
                    req.log.info(`Avatar file received: ${part.filename}`);
                } else {
                    fieldsToUpdate[part.fieldname] = part.value;
                    req.log.info(`Field received: ${part.fieldname} = ${part.value}`);
                }
            }
            req.log.info('All multipart form parts processed for update.');

            const { newUsername, newEmail, newPassword } = fieldsToUpdate;

            if (!newUsername && !newEmail && !newPassword && !newAvatarFile) {
                return reply.status(400).send({ error: 'No fields to update provided.' });
            }

            if (newPassword) {
                if (!passwordRegex.test(newPassword)) {
                    return reply.status(400).send({ error: 'Invalid password: Must be 7-20 characters, include at least one uppercase, one lowercase, and one number.' });
                }
            }
            if (newEmail) {
                if (!emailRegex.test(newEmail)) {
                    return reply.status(400).send({ error: 'Invalid email.' });
                }
            }

                // Handle new avatar file upload
            if (newAvatarFile) {
                newAvatarFilename = `${user.username}-${Date.now()}-${newAvatarFile.filename}`;
                // YOUR PREFERRED AVATAR PATHS
                newAvatarPath = path.join(process.cwd(), 'uploads', newAvatarFilename);

                req.log.info(`Attempting to save new avatar file to: ${newAvatarPath}`);
                await new Promise((resolve, reject) => {
                    pump(newAvatarFile.file, fs.createWriteStream(newAvatarPath), (err) => {
                        if (err) {
                            req.log.error(`Error saving new avatar: ${err.message}`);
                            return reject(err);
                        }
                        resolve();
                    });
                });
                req.log.info(`New avatar file ${newAvatarFilename} saved successfully.`);

                newAvatarURL = `/uploads/${newAvatarFilename}`;

                // Remove old avatar if not default
                if (user.avatar && user.avatar !== '/uploads/default-avatar.jpg') {
                    // YOUR PREFERRED AVATAR PATHS
                    const oldAvatarPath = path.join(process.cwd(), user.avatar.replace('/uploads/', 'uploads/'));
                    try {
                        await fs.promises.unlink(oldAvatarPath);
                        req.log.info(`Old avatar ${user.avatar} removed successfully.`);
                    } catch (unlinkError) {
                        req.log.warn(`Could not remove old avatar ${user.avatar}: ${unlinkError.message}`);
                    }
                }
            } else {
                newAvatarURL = user.avatar; // Keep existing avatar
                req.log.info('No new avatar file sent. Keeping existing avatar.');
            }

            const finalUsername = newUsername || user.username;
            const finalEmail = newEmail || user.email;
            const finalPassword = newPassword ? await argon2.hash(newPassword) : user.password;
            const finalAvatar = newAvatarURL;

            req.log.info(`Final data for user ID ${user.id} update: Username=${finalUsername}, Email=${finalEmail}, Avatar=${finalAvatar}`);

            const updateStmt = db.prepare('UPDATE users SET username = ?, email = ?, password = ?, avatar = ? WHERE id = ?');
            const result = updateStmt.run(finalUsername, finalEmail, finalPassword, finalAvatar, userId);

            if (result.changes === 0) {
                req.log.warn(`No record updated for user ID: ${userId}. May be because provided data is the same as existing.`);
                return reply.send({ success: true, message: 'Profile updated (or data was already the same).' });
            }

            req.log.info(`User ${user.username} (ID: ${user.id}) successfully updated in DB.`);
            return reply.send({ success: true, message: 'Profile updated successfully!' });

        } catch (error) {
            req.log.error(`GENERAL ERROR in updateProfile: ${error.message}`, error);
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: error.message });
            }
            if (!reply.sent) {
                reply.status(500).send({ error: 'Internal Server Error updating profile.', details: error.message });
            }
        }
    });

    // --- DELETE /api/users/:id - Delete a user ---
    fastify.delete('/:id', {
    onRequest: [fastify.authenticate], // Protected by JWT authentication
        handler: async (req, reply) => {
            const { id } = req.params;
            const userIdFromToken = req.user.id;

            // Ensure a user can only delete their own account
            if (parseInt(id) !== userIdFromToken) {
                req.log.warn(`Tentativa de eliminação de conta não autorizada. User ID do Token: ${userIdFromToken}, ID a ser eliminado: ${id}`);
                return reply.status(403).send({ error: 'Forbidden: You can only delete your own account.' });
            }

            try {
                // Eliminar dados associados primeiro para manter a integridade referencial
                req.log.info(`Deleting associated data for user ${id}...`);
                db.prepare('DELETE FROM games WHERE player1_id = ? OR player2_id = ?').run(id, id);
                db.prepare('DELETE FROM friends WHERE friend1_id = ? OR friend2_id = ?').run(id, id);
                db.prepare('DELETE FROM scores WHERE user_id = ?').run(id);
                req.log.info(`Associated data for user ${id} deleted.`);

                // Delete avatar file if not default
                const dbUser = db.prepare('SELECT avatar FROM users WHERE id = ?').get(id);
                if (dbUser && dbUser.avatar && dbUser.avatar !== '/uploads/default-avatar.jpg') {
                    // Your preferred avatar paths
                    const avatarPath = path.join(process.cwd(), dbUser.avatar.replace('/uploads/', 'uploads/'));
                    try {
                        await fs.promises.unlink(avatarPath);
                        req.log.info(`Avatar ${dbUser.avatar} for user ${id} removed from filesystem.`);
                    } catch (unlinkError) {
                        req.log.warn(`Could not remove old avatar ${dbUser.avatar} for user ${id}: ${unlinkError.message}`);
                    }
                }

                // Finalmente, eliminar o utilizador
                const deleteUserStmt = db.prepare('DELETE FROM users WHERE id = ?');
                const result = deleteUserStmt.run(id);

                if (result.changes === 0) {
                    req.log.warn(`User ${id} not found for deletion.`);
                    return reply.status(404).send({ error: 'User not found' });
                }
                req.log.info(`User ${id} and all associated data deleted successfully.`);
                return { success: true, message: 'User and associated data deleted' };
            } catch (error) {
                req.log.error(`Error deleting user ${id} and associated data: ${error.message}`, error);
                return reply.status(500).send({ error: 'Internal server error', details: error.message });
            }
        }
    });

    // --- GET /api/users/games/history - Game History ---
    fastify.get('/games/history', {
    onRequest: [fastify.authenticate], // Protected by JWT authentication
        handler: async (req, reply) => {
            try {
                const userId = req.user.id;

                const games = db.prepare(`
                    SELECT
                        g.id,
                        CASE
                            WHEN g.player1_id = ? THEN u2.username
                            ELSE u1.username
                        END as opponent_name,
                        CASE
                            WHEN g.player1_id = ? THEN g.player1_score
                            ELSE g.player2_score
                        END as player_score,
                        CASE
                            WHEN g.player1_id = ? THEN g.player2_score
                            ELSE g.player1_score
                        END as opponent_score,
                        CASE
                            WHEN (g.player1_id = ? AND g.player1_score > g.player2_score) OR
                                 (g.player2_id = ? AND g.player2_score > g.player1_score)
                            THEN 'win'
                            ELSE 'loss'
                        END as result,
                        CASE
                            WHEN g.player1_id = ? THEN g.player2_id
                            ELSE g.player1_id
                        END as opponent_id,
                        g.played_at
                    FROM games g
                    JOIN users u1 ON g.player1_id = u1.id
                    JOIN users u2 ON g.player2_id = u2.id
                    WHERE g.player1_id = ? OR g.player2_id = ?
                    ORDER BY g.played_at DESC
                    LIMIT 20
                `).all(userId, userId, userId, userId, userId, userId, userId, userId);
                

                return { games };
            } catch (error) {
                req.log.error('Error fetching game history:', error);
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: error.message });
                }
                return reply.status(500).send({ error: 'Internal server error', details: error.message });
            }
        }
    });

    fastify.get('/games/history/:id', {
        onRequest: [fastify.authenticate], // Protegida por autenticação JWT
        handler: async (req, reply) => {
            try {
                const {id} = req.params;

                const games = db.prepare(`
                    SELECT
                        g.id,
                        CASE
                            WHEN g.player1_id = ? THEN u2.username
                            ELSE u1.username
                        END as opponent_name,
                        CASE
                            WHEN g.player1_id = ? THEN g.player1_score
                            ELSE g.player2_score
                        END as player_score,
                        CASE
                            WHEN g.player1_id = ? THEN g.player2_score
                            ELSE g.player1_score
                        END as opponent_score,
                        CASE
                            WHEN (g.player1_id = ? AND g.player1_score > g.player2_score) OR
                                    (g.player2_id = ? AND g.player2_score > g.player1_score)
                            THEN 'win'
                            ELSE 'loss'
                        END as result,
                        CASE
                            WHEN g.player1_id = ? THEN g.player2_id
                            ELSE g.player1_id
                        END as opponent_id,
                        g.played_at
                    FROM games g
                    JOIN users u1 ON g.player1_id = u1.id
                    JOIN users u2 ON g.player2_id = u2.id
                    WHERE g.player1_id = ? OR g.player2_id = ?
                    ORDER BY g.played_at DESC
                    LIMIT 20
                `).all(id, id, id, id, id, id, id, id);
                

                return { games };
            } catch (error) {
                req.log.error('Error fetching game history:', error);
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: error.message });
                }
                return reply.status(500).send({ error: 'Internal server error', details: error.message });
            }
        }
    });

    // --- GET /api/users/friends - Friends List ---
    fastify.get('/friends', {
    onRequest: [fastify.authenticate], // Protected by JWT authentication
        handler: async (req, reply) => {
            try {
                const userId = req.user.id;

                const friends = db.prepare(`
                    SELECT
                        u.id,
                        u.username,
                        u.avatar
                    FROM users u
                    INNER JOIN friends f ON (
                        (f.friend1_id = ? AND f.friend2_id = u.id) OR
                        (f.friend2_id = ? AND f.friend1_id = u.id)
                    )
                    WHERE u.id != ?
                    ORDER BY u.username
                `).all(userId, userId, userId);

                const friendsWithStatus = friends.map(friend => {
                    const isOnline = connectedUsers.has(friend.id); // Checks if friend is online via WebSocket
                    // Simulate last_seen if not online (if no real field in DB)
                    const lastSeen = isOnline ? null : new Date(Date.now() - (Math.abs(Math.random() * 24 * 60 * 60 * 1000))).toISOString(); // Aleatoriamente até 24h atrás
                    return {
                        ...friend,
                        is_online: isOnline,
                        last_seen: lastSeen
                    };
                });

                return { friends: friendsWithStatus };
            } catch (error) {
                req.log.error('Error fetching friends:', error);
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: error.message });
                }
                return reply.status(500).send({ error: 'Internal server error', details: error.message });
            }
        }
    });

    // --- POST /api/users/friends/add - Add Friend ---
    fastify.post('/friends/add', {
    onRequest: [fastify.authenticate], // Protected by JWT authentication
        handler: async (req, reply) => {
            try {
                const userId = req.user.id;
                const { friendId } = req.body;

                if (!friendId) {
                    return reply.status(400).send({ error: 'Friend ID is required' });
                }

                if (userId === friendId) {
                    return reply.status(400).send({ error: 'Cannot add yourself as friend' });
                }

                const friendExists = db.prepare('SELECT id FROM users WHERE id = ?').get(friendId);
                if (!friendExists) {
                    return reply.status(404).send({ error: 'User not found' });
                }

                const existingFriendship = db.prepare(`
                    SELECT id FROM friends
                    WHERE (friend1_id = ? AND friend2_id = ?)
                         OR (friend1_id = ? AND friend2_id = ?)
                `).get(userId, friendId, friendId, userId);

                if (existingFriendship) {
                    return reply.status(400).send({ error: 'Already friends' });
                }

                // Ensure smaller ID comes first to avoid duplicates (e.g., 1-2 is same as 2-1)
                const friend1Id = Math.min(userId, friendId);
                const friend2Id = Math.max(userId, friendId);

                db.prepare(`
                    INSERT INTO friends (friend1_id, friend2_id, created_at)
                    VALUES (?, ?, datetime('now'))
                `).run(friend1Id, friend2Id);

                return { message: 'Friend added successfully' };
            } catch (error) {
                req.log.error('Error adding friend:', error);
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: error.message });
                }
                return reply.status(500).send({ error: 'Internal server error', details: error.message });
            }
        }
    });

    fastify.get('/friends/search/:username', {
        onRequest: [fastify.authenticate],
        handler: async (req, reply) => {
            try {
                const userId = req.user.id;
                const { username } = req.params;

                if (!username || username.length < 2) {
                    return reply.status(400).send({ error: 'Username must be at least 2 characters' });
                }

                const users = db.prepare(`
                    SELECT
                        u.id,
                        u.username,
                        u.email,
                        u.avatar,
                        CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_friend
                    FROM users u
                    LEFT JOIN friends f ON (
                        (f.friend1_id = ? AND f.friend2_id = u.id) OR
                        (f.friend2_id = ? AND f.friend1_id = u.id)
                    )
                    WHERE u.username LIKE ? AND u.id != ?
                    ORDER BY u.username
                    LIMIT 10
                `).all(userId, userId, `%${username}%`, userId);

                return { users };
            } catch (error) {
                req.log.error('Error searching users:', error);
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: error.message });
                }
                return reply.status(500).send({ error: 'Internal server error', details: error.message });
            }
        }
    });
};

export default usersController;