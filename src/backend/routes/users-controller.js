import db from '../db.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import pump from 'pump';    
import * as fs from 'fs';

const googleClient = new OAuth2Client('801178976948-j91b6t32p0i97628g02vnhvrsa9103b4.apps.googleusercontent.com');

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{7,20}$/;
const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z]+\.[a-zA-Z]{2,}$/;

// Mapa para gerenciar usuários conectados via WebSocket
const connectedUsers = new Map();

const usersController = async (fastify, options) => {

    // --- Rota de Teste (GET /api/users/) ---
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
        req.log.info('--> INÍCIO: Tentativa de conexão WebSocket.');

        // connection.socket é o objeto WebSocket real
        const socket = connection;

        //if (!socket) {
        //    req.log.error('WebSocket não disponível na conexão.');
        //    return;
        //}

        const params = new URL(req.url, 'http://localhost').searchParams;
        const token = params.get('token');

        if (!token) {
            req.log.warn('Token JWT ausente na conexão WebSocket.');
            socket.close(1008, 'Token is required'); // 1008 é um código de erro de política
            return;
        }

        try {
            const decoded = fastify.jwt.verify(token);
            const userId = decoded.id;

            if (!userId) {
                req.log.warn(`ID de usuário inválido no token WebSocket para token: ${token}`);
                socket.close(1008, 'Invalid user ID');
                return;
            }

            if (socket.readyState !== 1) { // WebSocket.OPEN = 1
                req.log.warn(`Socket para o user ${userId} não está pronto (readyState: ${socket.readyState}).`);
                socket.close(1008, 'Connection not ready');
                return;
            }

            // Armazenar a conexão do usuário
            connectedUsers.set(userId, socket);
            req.log.info(`Utilizador ${userId} conectado via WebSocket.`);

            // Event Listeners
            socket.on('close', (code, reason) => {
                connectedUsers.delete(userId);
                req.log.info(`Utilizador ${userId} desconectado (Código: ${code}, Razão: ${reason || 'N/A'}).`);
            });

            socket.on('message', (message) => {
                req.log.info(`Mensagem recebida de ${userId}: ${message}`);
                // Exemplo: ecoar a mensagem de volta
                socket.send(JSON.stringify({ type: 'echo', data: message.toString() }));
            });

            socket.on('error', (error) => {
                req.log.error(`Erro WebSocket para o user ${userId}: ${error.message}`);
                connectedUsers.delete(userId);
            });

            // Enviar mensagem de boas-vindas
            socket.send(JSON.stringify({
                type: 'welcome',
                message: 'Connected successfully to WebSocket',
                userId: userId
            }));

        } catch (error) {
            req.log.error(`Erro na verificação JWT para WebSocket: ${error.message}`);
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                socket.close(1008, `Invalid or expired token: ${error.message}`);
            } else {
                socket.close(1008, `Authentication error: ${error.message}`);
            }
        }
    });
    fastify.post('/register', async (req, reply) => {
        req.log.info('--> INÍCIO: Requisição de registo recebida.');
        req.log.info('Headers da requisição:', req.headers);

        try {
            const parts = req.parts();
            const userData = {};
            let avatarFile;

            req.log.info('A processar partes do formulário multipart para registo...');
            for await (const part of parts) {
                if (part.file) {
                    avatarFile = part;
                    req.log.info(`Ficheiro de avatar recebido: ${part.filename}`);
                } else {
                    userData[part.fieldname] = part.value;
                    req.log.info(`Campo recebido: ${part.fieldname} = ${part.value}`);
                }
            }
            req.log.info('Todas as partes do formulário multipart processadas para registo.');
            if (!avatarFile) {
                const defaultAvatarPath = path.join(process.cwd(), 'uploads', 'default-avatar.jpg');
                req.log.info(`A usar avatar padrão de: ${defaultAvatarPath}`);
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
                return reply.status(400).send({ error: 'Password inválida. Deve ter 7-20 caracteres, incluir pelo menos uma maiúscula, uma minúscula e um número.' });
            }

            if (!emailRegex.test(email)) {
                return reply.status(400).send({ error: 'Email inválido.' });
            }

            const hashedPassword = await argon2.hash(password);
            req.log.info('Password hashed.');

            // SEUS CAMINHOS DE AVATAR PREFERIDOS
            const avatarFilename = `${username}-${Date.now()}-${avatarFile.filename}`;
            const avatarPath = path.join(process.cwd(), 'uploads', avatarFilename);
            req.log.info(`A tentar guardar ficheiro de avatar em: ${avatarPath}`);

            await new Promise((resolve, reject) => {
                pump(avatarFile.file, fs.createWriteStream(avatarPath), (err) => {
                    if (err) {
                        req.log.error(`Erro ao salvar avatar: ${err.message}`);
                        return reject(err);
                    }
                    resolve();
                });
            });
            req.log.info(`Ficheiro de avatar ${avatarFilename} guardado com sucesso.`);

            const avatarURL = `/uploads/${avatarFilename}`;

            const stmt = db.prepare("INSERT INTO users (username, password, email, avatar) VALUES (?, ?, ?, ?)");
            const info = stmt.run(username, hashedPassword, email, avatarURL);
            req.log.info(`Utilizador ${username} registado com ID: ${info.lastInsertRowid}`);

            return reply.send({ success: true, message: 'User registered successfully!' });

        } catch (error) {
            req.log.error(`ERRO no registo de utilizador: ${error.message}`, error);
            if (!reply.sent) {
                if (error.message.includes('UNIQUE constraint failed')) {
                    return reply.status(409).send({ error: 'Username or email already exists.' });
                }
                return reply.status(500).send({ error: 'Internal Server Error ao registar utilizador.', details: error.message });
            }
        }
    });

    // --- POST /api/users/login - Login de utilizador ---
    fastify.post('/login', async (req, reply) => {
        const { username, password } = req.body;
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
            // Usa fastify.jwt.sign para assinar o token (secretKey definido no plugin JWT)
            const token = fastify.jwt.sign({ id: dbUser.id }, { expiresIn: '1h' });
            return { success: true, message: 'User logged in', token, dbUser: { id: dbUser.id, username: dbUser.username } }; // Inclui dbUser.id para consistência
        } catch (error) {
            req.log.error(`Error during login: ${error.message}`);
            return reply.status(500).send({ error: 'Internal server error', details: error.message });
        }
    });

    // --- POST /api/users/google-login - Login Google OAuth ---
    fastify.post('/google-login', async (req, reply) => {
        req.log.info('--> INÍCIO: Requisição de login Google recebida.');
        const { idToken } = req.body;

        if (!idToken) {
            req.log.warn('ID Token ausente na requisição de login Google.');
            return reply.status(400).send({ error: 'Missing ID token' });
        }

        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: '801178976948-j91b6t32p0i97628g02vnhvrsa9103b4.apps.googleusercontent.com' // Seu Audience ID
            });
            const payload = ticket.getPayload();
            const { email, name, picture } = payload;
            
            let avatarUrlFromGoogle = picture;
            if (avatarUrlFromGoogle && avatarUrlFromGoogle.startsWith('http://')) {
                avatarUrlFromGoogle = avatarUrlFromGoogle.replace('http://', 'https://');
                req.log.info(`Avatar URL do Google convertido para HTTPS: ${avatarUrlFromGoogle}`);
            }

            const username = name || email.split('@')[0];

            req.log.info(`Token Google verificado para email: ${email}`);

            let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

            if (!user) {
                req.log.info(`Utilizador com email ${email} não encontrado. A criar novo registo.`);
                const insertStmt = db.prepare('INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)');
                // Usar o avatar padrão do seu sistema se 'picture' não for fornecido
                const defaultAvatarUrl = '/uploads/default-avatar.jpg'; // Seus caminhos preferidos
                const info = insertStmt.run(username, email, 'google-auth', picture || defaultAvatarUrl);
                user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
                req.log.info(`Novo utilizador Google ${username} registado com ID: ${user.id}`);
            } else {
                req.log.info(`Utilizador com email ${email} encontrado (ID: ${user.id}).`);
                // Atualiza o avatar se for diferente e não for o padrão do sistema ou do Google (se Google fornecer um diferente)
                if (picture && user.avatar !== picture && user.avatar !== '/uploads/default-avatar.jpg') {
                    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(picture, user.id);
                    req.log.info(`Avatar do utilizador ${user.username} atualizado para: ${picture}`);
                }
            }

            // Usa fastify.jwt.sign para assinar o token
            const token = fastify.jwt.sign({ id: user.id }, { expiresIn: '1h' });
            req.log.info(`Token JWT gerado para o utilizador ${user.username}.`);

            return reply.send({ success: true, message: 'Google login successful', token });

        } catch (error) {
            req.log.error(`ERRO no login Google: ${error.message}`, error);
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                return reply.status(401).send({ error: 'Invalid or expired Google token', details: error.message });
            }
            return reply.status(500).send({ error: 'Internal Server Error ao efetuar login Google.', details: error.message });
        }
    });

    // --- GET /api/users/dashboard - Rota para o Dashboard ---
    fastify.get('/dashboard', {
        onRequest: [fastify.authenticate], // Protegida por autenticação JWT
        handler: async (request, reply) => {
            try {
                const userId = request.user.id;
                const user = db.prepare('SELECT id, username, avatar, wins, losses FROM users WHERE id = ?').get(userId);

                if (!user) {
                    request.log.warn(`Utilizador com ID ${userId} não encontrado para o dashboard.`);
                    return reply.status(404).send({ message: 'Utilizador não encontrado.' });
                }

                return reply.send({
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar || '/uploads/default-avatar.jpg',
                    wins: user.wins || 0,
                    losses: user.losses || 0,
                });

            } catch (error) {
                request.log.error(`Erro ao buscar dados do dashboard para o utilizador ${request.user?.id}: ${error.message}`, error);
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: error.message });
                }
                return reply.status(500).send({ error: 'Erro interno do servidor ao carregar dashboard.', details: error.message });
            }
        }
    });

    // --- GET /api/users/profile - Obter dados do perfil do utilizador ---
    fastify.get('/profile', {
        onRequest: [fastify.authenticate], // Protegida por autenticação JWT
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

     // --- GET /api/users/profile/id - Obter dados do perfil dum utilizador a partir dum id---
    fastify.get('/profile/:id', {
        onRequest: [fastify.authenticate], // Protegida por autenticação JWT
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

    // --- PUT /api/users/updateProfile - Atualizar perfil do utilizador (incluindo avatar) ---
    fastify.put('/updateProfile', { onRequest: [fastify.authenticate] }, async (req, reply) => {
        try {
            const userId = req.user.id; // ID do utilizador autenticado

            let newAvatarFile;
            let newAvatarFilename = null;
            let newAvatarPath = null;
            let newAvatarURL = null;
            let fieldsToUpdate = {};

            req.log.info('--> INÍCIO: Requisição de updateProfile recebida.');

            const user = db.prepare('SELECT id, username, email, avatar, password FROM users WHERE id = ?').get(userId);
            if (!user) {
                req.log.warn(`User com ID ${userId} não encontrado para update.`);
                return reply.status(404).send({ error: 'User not found' });
            }
            req.log.info(`User ${user.username} (ID: ${user.id}) encontrado para atualização.`);

            const parts = req.parts();
            req.log.info('A processar partes do formulário multipart para atualização...');
            for await (const part of parts) {
                if (part.file) {
                    newAvatarFile = part;
                    req.log.info(`Ficheiro de avatar recebido: ${part.filename}`);
                } else {
                    fieldsToUpdate[part.fieldname] = part.value;
                    req.log.info(`Campo recebido: ${part.fieldname} = ${part.value}`);
                }
            }
            req.log.info('Todas as partes do formulário multipart processadas para atualização.');

            const { newUsername, newEmail, newPassword } = fieldsToUpdate;

            if (!newUsername && !newEmail && !newPassword && !newAvatarFile) {
                return reply.status(400).send({ error: 'Nenhum campo para atualizar fornecido.' });
            }

            if (newPassword) {
                if (!passwordRegex.test(newPassword)) {
                    return reply.status(400).send({ error: 'Password inválida: Deve ter 7-20 caracteres, incluir pelo menos uma maiúscula, uma minúscula e um número.' });
                }
            }
            if (newEmail) {
                if (!emailRegex.test(newEmail)) {
                    return reply.status(400).send({ error: 'Email inválido.' });
                }
            }

            // Lidar com o upload do novo arquivo de avatar
            if (newAvatarFile) {
                newAvatarFilename = `${user.username}-${Date.now()}-${newAvatarFile.filename}`;
                // SEUS CAMINHOS DE AVATAR PREFERIDOS
                newAvatarPath = path.join(process.cwd(), 'uploads', newAvatarFilename);

                req.log.info(`A tentar guardar novo ficheiro de avatar em: ${newAvatarPath}`);
                await new Promise((resolve, reject) => {
                    pump(newAvatarFile.file, fs.createWriteStream(newAvatarPath), (err) => {
                        if (err) {
                            req.log.error(`Erro ao salvar novo avatar: ${err.message}`);
                            return reject(err);
                        }
                        resolve();
                    });
                });
                req.log.info(`Novo ficheiro de avatar ${newAvatarFilename} guardado com sucesso.`);

                newAvatarURL = `/uploads/${newAvatarFilename}`;

                // Remover o avatar antigo se não for o padrão
                if (user.avatar && user.avatar !== '/uploads/default-avatar.jpg') {
                    // SEUS CAMINHOS DE AVATAR PREFERIDOS
                    const oldAvatarPath = path.join(process.cwd(), user.avatar.replace('/uploads/', 'uploads/'));
                    try {
                        await fs.promises.unlink(oldAvatarPath);
                        req.log.info(`Avatar antigo ${user.avatar} removido com sucesso.`);
                    } catch (unlinkError) {
                        req.log.warn(`Não foi possível remover o avatar antigo ${user.avatar}: ${unlinkError.message}`);
                    }
                }
            } else {
                newAvatarURL = user.avatar; // Mantém o avatar existente
                req.log.info('Nenhum novo ficheiro de avatar foi enviado. Mantendo o avatar existente.');
            }

            const finalUsername = newUsername || user.username;
            const finalEmail = newEmail || user.email;
            const finalPassword = newPassword ? await argon2.hash(newPassword) : user.password;
            const finalAvatar = newAvatarURL;

            req.log.info(`Dados finais para atualização do user ID ${user.id}: Username=${finalUsername}, Email=${finalEmail}, Avatar=${finalAvatar}`);

            const updateStmt = db.prepare('UPDATE users SET username = ?, email = ?, password = ?, avatar = ? WHERE id = ?');
            const result = updateStmt.run(finalUsername, finalEmail, finalPassword, finalAvatar, userId);

            if (result.changes === 0) {
                req.log.warn(`Nenhum registo atualizado para o user ID: ${userId}. Pode ser porque os dados fornecidos são os mesmos que os existentes.`);
                return reply.send({ success: true, message: 'Perfil atualizado (ou dados já eram os mesmos).' });
            }

            req.log.info(`Utilizador ${user.username} (ID: ${user.id}) atualizado com sucesso no DB.`);
            return reply.send({ success: true, message: 'Perfil atualizado com sucesso!' });

        } catch (error) {
            req.log.error(`ERRO GERAL no updateProfile: ${error.message}`, error);
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: error.message });
            }
            if (!reply.sent) {
                reply.status(500).send({ error: 'Internal Server Error ao atualizar perfil.', details: error.message });
            }
        }
    });

    // --- DELETE /api/users/:id - Eliminar um utilizador ---
    fastify.delete('/:id', {
        onRequest: [fastify.authenticate], // Protegida por autenticação JWT
        handler: async (req, reply) => {
            const { id } = req.params;
            const userIdFromToken = req.user.id;

            // Garante que um utilizador só pode eliminar a sua própria conta
            if (parseInt(id) !== userIdFromToken) {
                req.log.warn(`Tentativa de eliminação de conta não autorizada. User ID do Token: ${userIdFromToken}, ID a ser eliminado: ${id}`);
                return reply.status(403).send({ error: 'Forbidden: You can only delete your own account.' });
            }

            try {
                // Eliminar dados associados primeiro para manter a integridade referencial
                req.log.info(`A eliminar dados associados para o utilizador ${id}...`);
                db.prepare('DELETE FROM games WHERE player1_id = ? OR player2_id = ?').run(id, id);
                db.prepare('DELETE FROM friends WHERE friend1_id = ? OR friend2_id = ?').run(id, id);
                db.prepare('DELETE FROM scores WHERE user_id = ?').run(id);
                req.log.info(`Dados associados para o utilizador ${id} eliminados.`);

                // Eliminar o arquivo de avatar, se não for o padrão
                const dbUser = db.prepare('SELECT avatar FROM users WHERE id = ?').get(id);
                if (dbUser && dbUser.avatar && dbUser.avatar !== '/uploads/default-avatar.jpg') {
                    // SEUS CAMINHOS DE AVATAR PREFERIDOS
                    const avatarPath = path.join(process.cwd(), dbUser.avatar.replace('/uploads/', 'uploads/'));
                    try {
                        await fs.promises.unlink(avatarPath);
                        req.log.info(`Avatar ${dbUser.avatar} do utilizador ${id} removido do sistema de ficheiros.`);
                    } catch (unlinkError) {
                        req.log.warn(`Não foi possível remover o avatar antigo ${dbUser.avatar} do utilizador ${id}: ${unlinkError.message}`);
                    }
                }

                // Finalmente, eliminar o utilizador
                const deleteUserStmt = db.prepare('DELETE FROM users WHERE id = ?');
                const result = deleteUserStmt.run(id);

                if (result.changes === 0) {
                    req.log.warn(`Utilizador ${id} não encontrado para eliminação.`);
                    return reply.status(404).send({ error: 'User not found' });
                }
                req.log.info(`Utilizador ${id} e todos os dados associados eliminados com sucesso.`);
                return { success: true, message: 'User and associated data deleted' };
            } catch (error) {
                req.log.error(`Erro ao eliminar o utilizador ${id} e dados associados: ${error.message}`, error);
                return reply.status(500).send({ error: 'Internal server error', details: error.message });
            }
        }
    });

    // --- GET /api/users/games/history - Histórico de Jogos ---
    fastify.get('/games/history', {
        onRequest: [fastify.authenticate], // Protegida por autenticação JWT
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

    // --- GET /api/users/friends - Lista de Amigos ---
    fastify.get('/friends', {
        onRequest: [fastify.authenticate], // Protegida por autenticação JWT
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
                    const isOnline = connectedUsers.has(friend.id); // Verifica se o amigo está online via WebSocket
                    // Simulação de last_seen se não estiver online (se não houver um campo real no DB)
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

    // --- POST /api/users/friends/add - Adicionar Amigo ---
    fastify.post('/friends/add', {
        onRequest: [fastify.authenticate], // Protegida por autenticação JWT
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

                // Garante que o ID menor vem primeiro para evitar duplicatas (e.g., 1-2 é o mesmo que 2-1)
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

    // --- GET /api/users/friends/search/:username - Pesquisar Amigos ---
    fastify.get('/friends/search/:username', {
        onRequest: [fastify.authenticate], // Protegida por autenticação JWT
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