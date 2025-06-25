import db from '../db.js'
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import pump from 'pump';
import * as fs from 'fs';

// --- CONFIGURAÇÃO DA GOOGLE OAUTH ---
// ATENÇÃO: Substitua 'YOUR_GOOGLE_CLIENT_ID' pela sua ID de Cliente real da Google.
// É ALTAMENTE RECOMENDADO carregar esta ID de uma variável de ambiente (ex: process.env.GOOGLE_CLIENT_ID)
// em vez de a deixar aqui no código.
// secrets
// --- FIM DA CONFIGURAÇÃO GOOGLE OAUTH ---


// Regex for password and email validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{7,20}$/;
const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z]+\.[a-zA-Z]{2,}$/;

const usersController = (fastify, options, done) => {

    // GET /api/users - Get all users (username and id)
    fastify.get('/', async (req, reply) => {
        try {
            const users = db.prepare('SELECT id, username FROM users').all();
            return { users };
        } catch(error) {
            req.log.error(`Error fetching users: ${error.message}`);
            return reply.status(500).send({ error: 'Internal Server Error', details: error.message });
        }
    });

    // POST /api/users/register - Register a new user
    fastify.post('/register', async (req, reply) => { // Use 'reply' instead of 'res'
        req.log.info('--> INÍCIO: Requisição de registo recebida.');
        req.log.info('Headers da requisição:', req.headers);

        try {
            const parts = req.parts();
            const userData = {};
            let avatarFile;

            req.log.info('A processar partes do formulário multipart para registo...');
            // Process multipart data
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

            // If no avatar provided, use default
            if (!avatarFile) {
                const defaultAvatarPath = path.join(process.cwd(), 'assets', 'img', 'default-avatar.jpg');
                req.log.info(`A usar avatar padrão de: ${defaultAvatarPath}`);
                // Create a mock part object for default avatar
                avatarFile = {
                    filename: 'default-avatar.jpg',
                    file: fs.createReadStream(defaultAvatarPath) // Use fs.createReadStream for a stream
                };
            }

            const { username, password, email } = userData;

            // Basic validation
            if (!username || !password || !email) { // avatarFile will always exist now
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

            // Save the avatar file
            const avatarFilename = `${username}-${Date.now()}-${avatarFile.filename}`;
            const avatarPath = path.join(process.cwd(), 'uploads', avatarFilename);
            req.log.info(`A tentar guardar ficheiro de avatar em: ${avatarPath}`);

            // Use pump to save the avatar (from the stream directly)
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

            // Insert user into database
            const stmt = db.prepare("INSERT INTO users (username, password, email, avatar) VALUES (?, ?, ?, ?)");
            const info = stmt.run(username, hashedPassword, email, avatarURL);
            req.log.info(`Utilizador ${username} registado com ID: ${info.lastInsertRowid}`);

            return reply.send({ success: true, message: 'User registered successfully!' });

        } catch (error) {
            req.log.error(`ERRO no registo de utilizador: ${error.message}`, error);
            if (!reply.sent) {
                // Check if the error is due to unique constraint (e.g., username or email already exists)
                if (error.message.includes('UNIQUE constraint failed')) {
                    return reply.status(409).send({ error: 'Username or email already exists.' });
                }
                return reply.status(500).send({ error: 'Internal Server Error ao registar utilizador.', details: error.message });
            }
        }
    });

    // POST /api/users/login - Login user
    fastify.post('/login', async (req, reply) => { // Use 'reply'
        const {username, password} = req.body;
        if (!username || !password) {
            return reply.status(400).send({error: 'Missing username or password'});
        }
        try {
            const dbUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
            if (!dbUser) {
                return reply.status(404).send({error: 'User not found'});
            }
            const passwordMatch = await argon2.verify(dbUser.password, password);
            if (!passwordMatch) {
                return reply.status(401).send({error: 'Invalid password'});
            }
            const token = jwt.sign({id: dbUser.id}, secretKey, {expiresIn: '1h'});
            return {success: true, message: 'User logged in', token};
        } catch (error) {
            req.log.error(`Error during login: ${error.message}`);
            return reply.status(500).send({error: 'Internal server error'});
        }
    });

    // POST /api/users/google-login - Handle Google OAuth login
    fastify.post('/google-login', async (req, reply) => {
        req.log.info('--> INÍCIO: Requisição de login Google recebida.');
        const { idToken } = req.body;

        if (!idToken) {
            req.log.warn('ID Token ausente na requisição de login Google.');
            return reply.status(400).send({ error: 'Missing ID token' });
        }

        try {
            // Verifica o token de ID com a API do Google
            const ticket = await googleClient.verifyIdToken({
                idToken,
                 // <-- ATUALIZE AQUI com a mesma ID de Cliente
            });
            const payload = ticket.getPayload();
            const { email, name, picture } = payload; // Extrai email, nome e URL da imagem de perfil
            const username = name || email.split('@')[0]; // Usa o nome completo ou a parte do email como username

            req.log.info(`Token Google verificado para email: ${email}`);

            // Procura o utilizador na base de dados pelo email
            let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

            if (!user) {
                req.log.info(`Utilizador com email ${email} não encontrado. A criar novo registo.`);
                // Se o utilizador não existir, cria um novo registo
                const insertStmt = db.prepare('INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)');
                // Atenção: 'google-auth' é um placeholder para password.
                // Não é uma password real. Use algo que indique que é um utilizador OAuth.
                const info = insertStmt.run(username, email, 'google-auth', picture || '/uploads/default-avatar.jpg'); // Usa a imagem do Google ou avatar padrão
                user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid); // Pega o utilizador recém-criado
                req.log.info(`Novo utilizador Google ${username} registado com ID: ${user.id}`);
            } else {
                req.log.info(`Utilizador com email ${email} encontrado (ID: ${user.id}).`);
                // Opcional: Atualizar avatar se for diferente
                if (picture && user.avatar !== picture && picture !== '/uploads/default-avatar.jpg') {
                    // Cuidado: Se o utilizador já tiver um avatar personalizado, pode não querer sobrescrevê-lo.
                    // Para simplificar, vamos atualizar se for diferente do default.
                    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(picture, user.id);
                    req.log.info(`Avatar do utilizador ${user.username} atualizado para: ${picture}`);
                }
            }

            // Gera um token JWT para o utilizador autenticado
            const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '1h' });
            req.log.info(`Token JWT gerado para o utilizador ${user.username}.`);

            return reply.send({ success: true, message: 'Google login successful', token });

        } catch (error) {
            req.log.error(`ERRO no login Google: ${error.message}`, error);
            // Melhora o tratamento de erros para tokens inválidos/expirados do Google
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                return reply.status(401).send({ error: 'Invalid or expired Google token', details: error.message });
            }
            return reply.status(500).send({ error: 'Internal Server Error ao efetuar login Google.', details: error.message });
        }
    });

    // GET /api/users/profile - Get user profile data
    fastify.get('/profile', async (req, reply) => { // Use 'reply'
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return reply.status(401).send({error: 'Unauthorized'});
        }
        try {
            const decoded = jwt.verify(token, secretKey);
            const user = db.prepare('SELECT id, username, email, avatar FROM users WHERE id = ?').get(decoded.id);
            if (!user) {
                return reply.status(404).send({error: 'User not found'});
            }
            return reply.send({
                username: user.username,
                email: user.email,
                avatar: user.avatar
            });
        } catch(error) {
            req.log.error(`Error fetching profile: ${error.message}`);
            // Specific error handling for JWT issues
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: error.message });
            }
            return reply.status(500).send({error: 'Internal server error'});
        }
    });

    // PUT /api/users/updateProfile - Update user profile (including avatar)
    fastify.put('/updateProfile' , async (req, reply) => { // Use 'reply'
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            req.log.warn('Tentativa de atualização de perfil sem token de autorização.');
            return reply.status(401).send({error: 'Unauthorized: Missing token'});
        }

        let decoded;
        try {
            decoded = jwt.verify(token, secretKey);
            req.log.info(`Token decodificado para user ID: ${decoded.id}`);
        } catch (authError) {
            req.log.error(`Erro de autenticação ou token inválido: ${authError.message}`);
            // Specific error handling for JWT issues
            if (authError.name === 'TokenExpiredError' || authError.name === 'JsonWebTokenError') {
                return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token', details: authError.message });
            }
            return reply.status(500).send({error: 'Internal Server Error', details: authError.message});
        }

        let newAvatarFile;
        let newAvatarFilename = null;
        let newAvatarPath = null;
        let newAvatarURL = null;
        let fieldsToUpdate = {};

        req.log.info('--> INÍCIO: Requisição de updateProfile recebida.');

        try {
            // Fetch user data early to use existing avatar and username for filename
            const user = db.prepare('SELECT id, username, email, avatar, password FROM users WHERE id = ?').get(decoded.id);
            if (!user) {
                req.log.warn(`User com ID ${decoded.id} não encontrado para update.`);
                return reply.status(404).send({ error: 'User not found' });
            }
            req.log.info(`User ${user.username} (ID: ${user.id}) encontrado para atualização.`);


            const parts = req.parts(); // Get the async iterator for multipart form data
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

            const {newUsername, newEmail, newPassword} = fieldsToUpdate;

            // Validate if at least one field is provided for update
            if (!newUsername && !newEmail && !newPassword && !newAvatarFile) {
                return reply.status(400).send({error: 'Nenhum campo para atualizar fornecido.'});
            }

            // Validate new password if provided
            if (newPassword){
                if (!passwordRegex.test(newPassword)) {
                    return reply.status(400).send({error: 'Password inválida: Deve ter 7-20 caracteres, incluir pelo menos uma maiúscula, uma minúscula e um número.'});
                }
            }
            // Validate new email if provided
            if (newEmail) {
                if (!emailRegex.test(newEmail)) {
                    return reply.status(400).send({error: 'Email inválido.'});
                }
            }

            // Handle new avatar file upload
            if (newAvatarFile) {
                // Generate unique filename and path
                newAvatarFilename = `${user.username}-${Date.now()}-${newAvatarFile.filename}`;
                newAvatarPath = path.join(process.cwd(), 'uploads', newAvatarFilename);

                req.log.info(`A tentar guardar novo ficheiro de avatar em: ${newAvatarPath}`);
                // Use pump to stream and save the file
                await new Promise((resolve, reject) => {
                    pump(newAvatarFile.file, fs.createWriteStream(newAvatarPath), (err) => {
                        if (err) {
                            req.log.error(`Erro ao salvar novo avatar: ${err.message}`);
                            return reject(err); // Propagate error from pump
                        }
                        resolve();
                    });
                });
                req.log.info(`Novo ficheiro de avatar ${newAvatarFilename} guardado com sucesso.`);

                newAvatarURL = `/uploads/${newAvatarFilename}`;

                // OPTIONAL: Delete old avatar if it exists and is not the default
                if (user.avatar && user.avatar !== '/uploads/default-avatar.jpg') {
                    const oldAvatarPath = path.join(process.cwd(), user.avatar);
                    try {
                        await fs.promises.unlink(oldAvatarPath); // Use fs.promises.unlink
                        req.log.info(`Avatar antigo ${user.avatar} removido com sucesso.`);
                    } catch (unlinkError) {
                        req.log.warn(`Não foi possível remover o avatar antigo ${user.avatar}: ${unlinkError.message}`);
                        // Log warning but don't fail the request for this
                    }
                }
            } else {
                newAvatarURL = user.avatar; // If no new avatar, keep the existing one
                req.log.info('Nenhum novo ficheiro de avatar foi enviado. Mantendo o avatar existente.');
            }

            // Prepare fields for database update
            const finalUsername = newUsername || user.username;
            const finalEmail = newEmail || user.email;
            const finalPassword = newPassword ? await argon2.hash(newPassword) : user.password;
            const finalAvatar = newAvatarURL; // This will be the new URL or the old one

            req.log.info(`Dados finais para atualização do user ID ${user.id}: Username=${finalUsername}, Email=${finalEmail}, Avatar=${finalAvatar}`);

            // Update user in database
            const updateStmt = db.prepare('UPDATE users SET username = ?, email = ?, password = ?, avatar = ? WHERE id = ?');
            const result = updateStmt.run(finalUsername, finalEmail, finalPassword, finalAvatar, decoded.id);

            if (result.changes === 0) {
                 req.log.warn(`Nenhum registo atualizado para o user ID: ${decoded.id}. Pode ser porque os dados fornecidos são os mesmos que os existentes.`);
                 return reply.send({success: true, message: 'Perfil atualizado (ou dados já eram os mesmos).'});
            }

            req.log.info(`Utilizador ${user.username} (ID: ${user.id}) atualizado com sucesso no DB.`);
            return reply.send({success: true, message: 'Perfil atualizado com sucesso!'});

        } catch(error) {
            req.log.error(`ERRO GERAL no updateProfile: ${error.message}`, error);
            // Ensure no response has been sent already
            if (!reply.sent) {
                reply.status(500).send({error: 'Internal Server Error ao atualizar perfil.', details: error.message});
            }
        }
    });

    // DELETE /api/users/:id - Delete a user
    fastify.delete('/:id', async (req, reply) => { // Use 'reply'
        const {id} = req.params;
        try {
            const deleteData = db.prepare('DELETE FROM users WHERE id = ?');
            const result = deleteData.run(id);
            if (result.changes === 0) {
                return reply.status(404).send({ error: 'User not found' });
            }
            return {success: true, message: 'User deleted'};
        } catch(error) {
            req.log.error(`Error deleting user ${id}: ${error.message}`);
            return reply.status(400).send({error: 'Could not delete user', details: error.message});
        }
    })

    done(); // Call done() to signal that plugin registration is complete
};

export default usersController;