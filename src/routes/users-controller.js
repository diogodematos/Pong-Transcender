import db from '../db.js'
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import pump from 'pump';
import fs from 'fs';

//const googleClient = new OAuth2Client('188335469204-dff0bjf48ubspckenk92t6730ade1o0i.apps.googleusercontent.com');

const secretKey = 'segredo_super_secreto';


const deleteSchema = {	
	response: {
		200: {
			status: {type: 'number'}
		}
	}
};

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{7,20}$/;
const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z]+\.[a-zA-Z]{2,}$/;

const usersController = (fastify, options, done) => {

	fastify.get('/', async (req, res) => {
		try {
			const users = db.prepare('SELECT id, username FROM users').all();
			return { users };
		} catch(error) {
			return(error);
		};
	});
	
	
	
	// Código do handler para o upload
	fastify.post('/register', async (req, res) => {
		try {
			const parts = req.parts();
			const userData = {};
			let avatarFile;
	
			// Processa os dados recebidos
			for await (const part of parts) {
				if (part.file) {
					avatarFile = part;
					console.log(`Avatar recebido: ${part.filename}`);
				} else {
					userData[part.fieldname] = part.value;
				}
			}

			if (!avatarFile) {
				avatarFile = {
					filename: 'default-avatar.jpg',
					file: fs.createReadStream(path.join(process.cwd(), 'public', 'img', 'default-avatar.jpg'))
				};
				console.log(`Avatar padrão usado: ${avatarFile.filename}`);
			}
			
	
			const { username, password, email } = userData;
	
			if (!username || !password || !email || !avatarFile) {
				return res.status(400).send({ error: 'Missing fields' });
			}
		
			if (!passwordRegex.test(password)) {
				return res.status(400).send({ error: 'Password inválida' });
			}
	
			if (!emailRegex.test(email)) {
				return res.status(400).send({ error: 'Email inválido' });
			}
	
			const hashedPassword = await argon2.hash(password);
	
			// Salva o arquivo avatar
			const avatarFilename = `${username}-${Date.now()}-${avatarFile.filename}`;
			const avatarPath = path.join(process.cwd(),'public', 'uploads', avatarFilename);
		
			// Usa o pump para salvar o avatar
			await new Promise((resolve, reject) => {
				pump(avatarFile.file, fs.createWriteStream(avatarPath), (err) => {
					if (err) return reject(err);
					resolve();
				});
			});
	
			const avatarURL = `/uploads/${avatarFilename}`;
			
			const stmt = db.prepare("INSERT INTO users (username, password, email, avatar) VALUES (?, ?, ?, ?)");
			  try {
				const info = stmt.run(username, hashedPassword, email, avatarURL);
				return res.send({ success: true, message: 'User registered' });
			  } catch (err) {
				console.error("Erro ao registrar usuário:", err);
				return res.status(400).send({ error: 'Failed to register user' });
			  }
			  
		} catch (error) {
			console.error("Erro inesperado:", error);
			return res.status(500).send({ error: 'Internal Server Error' });
		}
	});
	
	fastify.post('/login', async (req, res) => {
		const {username, password} = req.body;
		if (!username || !password) {
			return res.status(400).send({error: 'Missing fields'});
		}
		try {
			const dbUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
			if (!dbUser) {
				return res.status(404).send({error: 'User not found'});
			}
			const passwordMatch = await argon2.verify(dbUser.password, password);
			if (!passwordMatch) {
				return res.status(401).send({error: 'Invalid password'});
			}
			const token = jwt.sign({id: dbUser.id}, secretKey, {expiresIn: '1h'});
			return {success: true, message: 'User logged in', token};
		} catch (error) {
			return res.status(500).send({error: 'Internal server error'});
		}
	});
	
	// fastify.post('/google-login', async (req, res) => {
	// 	const { idToken } = req.body;
	
	// 	if (!idToken) {
	// 		return res.status(400).send({ error: 'Missing ID token' });
	// 	}
	
	// 	try {
	// 		const ticket = await googleClient.verifyIdToken({
	// 			idToken,
	// 			audience: '188335469204-dff0bjf48ubspckenk92t6730ade1o0i.apps.googleusercontent.com'
	// 		});
	// 		const payload = ticket.getPayload();
	
	// 		const email = payload.email;
	// 		const username = payload.name || email.split('@')[0];
	
	// 		// Verifica se o user já existe
	// 		let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
	
	// 		if (!user) {
	// 			// Registra novo user vindo do Google
	// 			const insert = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
	// 			// Password vazia ou placeholder, visto que login será sempre via Google
	// 			insert.run(username, email, 'google-auth');
	// 			user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
	// 		}
	
	// 		const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '1h' });
	
	// 		return { success: true, message: 'Google login successful', token };
	
	// 	} catch (err) {
	// 		console.error(err);
	// 		return res.status(401).send({ error: 'Invalid Google token' });
	// 	}
	// });
	
	fastify.get('/profile', async (req, res) => {
		const token = req.headers.authorization?.split(' ')[1];
		if (!token) {
			return res.status(401).send({error: 'Unauthorized'});
		}
		try {
			const decoded = jwt.verify(token, secretKey);
			const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
			if (!user) {
				return res.status(404).send({error: 'User not found'});
			}
			return res.send({
				username: user.username,
				email: user.email,
				avatar: user.avatar
			});
		} catch(error) {
			return res.status(500).send({error: 'Internal server error'});
		}
	});
	
	fastify.put('/updateProfile' , async (req, res) => {
		const token = req.headers.authorization?.split(' ')[1];
		if (!token) {
			return res.status(401).send({error: 'Unauthorized'});
		}
		const {newUsername, newEmail, newPassword} = req.body;
		if (!newUsername && !newEmail && !newPassword) {
			return res.status(400).send({error: 'Missing fields'});
		}
		if (newPassword)
		{if (!passwordRegex.test(newPassword)) {
			return res.status(400).send({error: 'Password must be 7-20 characters long, contain at least one uppercase letter, one lowercase letter and one number'});
		}}
		if (newEmail)
		{if (!emailRegex.test(newEmail)) {			
			return res.status(400).send({error: 'Email must be valid'});
		}}
		try {
			const decoded = jwt.verify(token, secretKey);
			const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
			if (!user) {
				return res.status(404).send({error: 'User not found'});
			}
			console.log(newUsername, newEmail, newPassword);

			const fieldsToUpdate = {
				username: newUsername || user.username,
				email: newEmail || user.email,
				password: newPassword ? await argon2.hash(newPassword) : user.password
			};
			console.log(fieldsToUpdate);
			const updateData = db.prepare('UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?');
			updateData.run(fieldsToUpdate.username, fieldsToUpdate.email, fieldsToUpdate.password, decoded.id);			
			return res.send({success: true, message: 'User updated'});
		} catch(error) {
			return res.status(500).send({error: 'Internal server error'});
		}
	});
	
	fastify.delete('/:id', {schema: deleteSchema}, async (req, res) => {
		const {id} = req.params;
		try {
			const deleteData = db.prepare('DELETE FROM users WHERE id = ?');
			const result = deleteData.run(id);
			if (result.changes === 0) {
				return res.status(404).send({ error: 'User not found' });
			}
			return {success: true, message: 'User deleted'};
		} catch(error) {
			return res.status(400).send({error: 'Could not delete user'});
		}
	})
	done();
};

export default usersController;