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

const usersController = async (fastify, options) => {

	// fastify.get('/ws', { websocket: true }, (connection, req) => {
		
	//   const { url } = req;
  // 	const token = new URLSearchParams(url?.split('?')[1]).get('token');
	// if (!token) {
	// 	connection.socket.close(1008, 'Token is required');
	// 	return;
	// }
	// try {
	// 	const decoded = jwt.verify(token, secretKey);
	// 	connection.userId = decoded.id; // Armazena o ID do utilizador na conexão
	// } catch (error) {
	// 	connection.socket.close(1008, 'Invalid token');
	// 	return;
	// }

	// connectedUsers.set(connection.userId, connection);
	// // connection.socket.on('message', (message) => {
	// // 	console.log(`Mensagem de ${userId}: ${message}`);
	// // Aqui você pode processar a mensagem recebida
	// //})

	// connection.socket.on('close', () => {
	// 	connectedUsers.delete(connection.userId);
	// 	console.log(`User ${connection.userId} disconnected`);
	// });
	// console.log(`User ${connection.userId} connected`);
	// });


  fastify.get('/', async (req, res) => {
    try {
      const users = db.prepare('SELECT id, username FROM users').all();
      return { users };
    } catch(error) {
      return res.status(500).send({ error: error.message });
    }
  });

	const connectedUsers = new Map();

	fastify.get('/ws', { websocket: true }, (socket, req) => {
			console.log('WebSocket connection attempt');
			
			// O primeiro parâmetro é diretamente o WebSocket
			if (!socket) {
					console.error('WebSocket not available');
					return;
			}
	
			const params = new URL(req.url, 'http://localhost').searchParams;
			const token = params.get('token');
	
			if (!token) {
					console.log('No token provided');
					socket.close(1008, 'Token is required');
					return;
			}
	
			try {
					const decoded = jwt.verify(token, secretKey);
					const userId = decoded.id;
	
					if (!userId) {
							console.log('Invalid user ID in token');
							socket.close(1008, 'Invalid user ID');
							return;
					}
	
					// Verificar se o socket está no estado correto
					if (socket.readyState !== 1) { // WebSocket.OPEN = 1
							console.log('Socket not ready');
							socket.close(1008, 'Connection not ready');
							return;
					}
	
					// Guardar a conexão
					connectedUsers.set(userId, socket);
					console.log(`User ${userId} connected successfully`);
	
					// Event listeners
					socket.on('close', () => {
							connectedUsers.delete(userId);
							console.log(`User ${userId} disconnected`);
					});
	
					socket.on('message', (message) => {
							console.log(`Message from ${userId}: ${message}`);
							// Echo da mensagem de volta
							socket.send(`Echo: ${message}`);
					});
	
					socket.on('error', (error) => {
							console.error(`WebSocket error for user ${userId}:`, error);
							connectedUsers.delete(userId);
					});
	
					// Enviar mensagem de boas-vindas
					socket.send(JSON.stringify({
							type: 'welcome',
							message: 'Connected successfully',
							userId: userId
					}));
	
			} catch (error) {
					console.error('JWT verification failed:', error);
					socket.close(1008, 'Invalid token');
					return;
			}
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
			return {success: true, message: 'User logged in', token, dbUser: {id: dbUser.id}};
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

	// No teu servidor
	fastify.get('/dashboard', async (req, res) => {
		// Verificar token JWT
		const token = req.headers.authorization?.split(' ')[1];
		if (!token) {
			return res.status(401).send({error: 'Unauthorized'});
		}
		try {
				// Verificar e decodificar o token
				const decoded = jwt.verify(token, secretKey);

				// Buscar dados do usuário na base de dados
				const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
				
				if (!user) {
						return res.status(404).send({ error: 'Usuário não encontrado' });
				}
				return res.send({
						username: user.username,
						avatar: user.avatar,
				});
		} catch (error) {
				console.error('Dashboard error:', error);
				return res.status(401).send({ error: 'Token inválido' });
		}
	});
	
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
				avatar: user.avatar,
				wins: user.wins,
				losses: user.losses
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
		const parts = req.parts();
		let newAvatarFile;
		let newAvatarFilename = null;
		let newAvatarPath = null;
		let newAvatarURL = null;
		let fieldsToUpdate = {};
	
		// Processa os dados recebidos
		for await (const part of parts) {
			if (part.file) {
				newAvatarFile = part;
				console.log(`Avatar recebido: ${part.filename}`);
			} else {
				fieldsToUpdate[part.fieldname] = part.value;
			}
		}

		const {newUsername, newEmail, newPassword} = fieldsToUpdate;
		
		if (!newUsername && !newEmail && !newPassword && !newAvatarFile) {
			return res.status(400).send({error: 'Missing fields'});
		}
		if (newPassword){
			if (!passwordRegex.test(newPassword)) {
			return res.status(400).send({error: 'Password must be 7-20 characters long, contain at least one uppercase letter, one lowercase letter and one number'});
			}
		}
		if (newEmail)
		{if (!emailRegex.test(newEmail)) {			
			return res.status(400).send({error: 'Email must be valid'});
		}}

		const decoded = jwt.verify(token, secretKey);
		const user1 = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
		if (!user1) {
		return res.status(404).send({ error: 'User not found' });
		}
		if (newAvatarFile) {	
			newAvatarFilename = `${user1.username}-${Date.now()}-${newAvatarFile.filename}`;
			newAvatarPath = path.join(process.cwd(),'public', 'uploads', newAvatarFilename);
		
			// Usa o pump para salvar o avatar
			await new Promise((resolve, reject) => {
				pump(newAvatarFile.file, fs.createWriteStream(newAvatarPath), (err) => {
					if (err) return reject(err);
					resolve();
				});
			});
	
			newAvatarURL = `/uploads/${newAvatarFilename}`;
		}
		else {
			newAvatarURL = null; // Se não houver novo avatar, mantém o antigo
		}
		try {
			const decoded = jwt.verify(token, secretKey);
			const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
			if (!user) {
				return res.status(404).send({error: 'User not found'});
			}
			console.log(newUsername, newEmail, newPassword, newAvatarURL);

			const fieldsToUpdate = {
				username: newUsername || user.username,
				email: newEmail || user.email,
				password: newPassword ? await argon2.hash(newPassword) : user.password,
				avatar: newAvatarURL || user.avatar
			};
			console.log(fieldsToUpdate);
			const updateData = db.prepare('UPDATE users SET username = ?, email = ?, password = ?, avatar = ? WHERE id = ?');
			updateData.run(fieldsToUpdate.username, fieldsToUpdate.email, fieldsToUpdate.password, fieldsToUpdate.avatar, decoded.id);			
			return res.send({success: true, message: 'User updated'});
		} catch(error) {
			return res.status(500).send({error: 'Internal server error'});
		}
	});	
	// fastify.put('/updateProfile' , async (req, res) => {
	// 	const token = req.headers.authorization?.split(' ')[1];
	// 	if (!token) {
	// 		return res.status(401).send({error: 'Unauthorized'});
	// 	}
	// 	const {newUsername, newEmail, newPassword} = req.body;
	// 	if (!newUsername && !newEmail && !newPassword) {
	// 		return res.status(400).send({error: 'Missing fields'});
	// 	}
	// 	if (newPassword)
	// 	{if (!passwordRegex.test(newPassword)) {
	// 		return res.status(400).send({error: 'Password must be 7-20 characters long, contain at least one uppercase letter, one lowercase letter and one number'});
	// 	}}
	// 	if (newEmail)
	// 	{if (!emailRegex.test(newEmail)) {			
	// 		return res.status(400).send({error: 'Email must be valid'});
	// 	}}
	// 	try {
	// 		const decoded = jwt.verify(token, secretKey);
	// 		const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
	// 		if (!user) {
	// 			return res.status(404).send({error: 'User not found'});
	// 		}
	// 		console.log(newUsername, newEmail, newPassword);

	// 		const fieldsToUpdate = {
	// 			username: newUsername || user.username,
	// 			email: newEmail || user.email,
	// 			password: newPassword ? await argon2.hash(newPassword) : user.password
	// 		};
	// 		console.log(fieldsToUpdate);
	// 		const updateData = db.prepare('UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?');
	// 		updateData.run(fieldsToUpdate.username, fieldsToUpdate.email, fieldsToUpdate.password, decoded.id);			
	// 		return res.send({success: true, message: 'User updated'});
	// 	} catch(error) {
	// 		return res.status(500).send({error: 'Internal server error'});
	// 	}
	// });
	
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

	////			TESTE INICIO 

// Adicionar ao teu server.js existente

fastify.get('/games/history', async (req, res) => {
	const token = req.headers.authorization?.split(' ')[1];
	if (!token) {
			return res.status(401).send({error: 'Unauthorized'});
	}

	try {
			const decoded = jwt.verify(token, secretKey);
			const userId = decoded.id;

			// Query para buscar histórico de jogos
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
							g.played_at
					FROM games g
					JOIN users u1 ON g.player1_id = u1.id
					JOIN users u2 ON g.player2_id = u2.id
					WHERE g.player1_id = ? OR g.player2_id = ?
					ORDER BY g.played_at DESC
					LIMIT 20
			`).all(userId, userId, userId, userId, userId, userId, userId);

			return { games };
	} catch (error) {
			console.error('Error fetching game history:', error);
			return res.status(500).send({error: 'Internal server error'});
	}
});

fastify.get('/friends', async (req, res) => {
	const token = req.headers.authorization?.split(' ')[1];
	if (!token) {
			return res.status(401).send({error: 'Unauthorized'});
	}

	try {
			const decoded = jwt.verify(token, secretKey);
			const userId = decoded.id;

			const friends = db.prepare(`
					SELECT 
							u.id, 
							u.username, 
							u.avatar,
							0 as is_online,
							datetime('now', '-' || (ABS(RANDOM()) % 24) || ' hours') as last_seen
					FROM users u
					INNER JOIN friends f ON (
							(f.friend1_id = ? AND f.friend2_id = u.id) OR
							(f.friend2_id = ? AND f.friend1_id = u.id)
					)
					WHERE u.id != ?
					ORDER BY u.username
			`).all(userId, userId, userId);

			// Friends online
			const friendsWithStatus = friends.map(friend => {
				const isOnline = connectedUsers.has(friend.id);
				console.log(typeof friend.id, typeof userId);
				return {
					...friend,
					is_online: isOnline,
					last_seen: isOnline ? null : friend.last_seen
				};
			});

			return { friends: friendsWithStatus };
	} catch (error) {
			console.error('Error fetching friends:', error);
			return res.status(500).send({error: 'Internal server error'});
	}
});

fastify.post('/friends/add', async (req, res) => {
	const token = req.headers.authorization?.split(' ')[1];
	if (!token) {
			return res.status(401).send({error: 'Unauthorized'});
	}

	try {
			const decoded = jwt.verify(token, secretKey);
			const userId = decoded.id;
			const { friendId } = req.body;

			if (!friendId) {
					return res.status(400).send({error: 'Friend ID is required'});
			}

			if (userId === friendId) {
					return res.status(400).send({error: 'Cannot add yourself as friend'});
			}

			// Verificar se o utilizador existe
			const friendExists = db.prepare('SELECT id FROM users WHERE id = ?').get(friendId);
			if (!friendExists) {
					return res.status(404).send({error: 'User not found'});
			}

			// Verificar se já são amigos
			const existingFriendship = db.prepare(`
					SELECT id FROM friends 
					WHERE (friend1_id = ? AND friend2_id = ?) 
						 OR (friend1_id = ? AND friend2_id = ?)
			`).get(userId, friendId, friendId, userId);

			if (existingFriendship) {
					return res.status(400).send({error: 'Already friends'});
			}

			// Adicionar amizade
			const friend1Id = Math.min(userId, friendId);
			const friend2Id = Math.max(userId, friendId);

			db.prepare(`
					INSERT INTO friends (friend1_id, friend2_id, created_at)
					VALUES (?, ?, datetime('now'))
			`).run(friend1Id, friend2Id);

			return { message: 'Friend added successfully' };
	} catch (error) {
			console.error('Error adding friend:', error);
			return res.status(500).send({error: 'Internal server error'});
	}
});

fastify.get('/friends/search/:username', async (req, res) => {
	const token = req.headers.authorization?.split(' ')[1];
	if (!token) {
			return res.status(401).send({error: 'Unauthorized'});
	}

	try {
			const decoded = jwt.verify(token, secretKey);
			const userId = decoded.id;
			const { username } = req.params;

			if (!username || username.length < 2) {
					return res.status(400).send({error: 'Username must be at least 2 characters'});
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
			console.error('Error searching users:', error);
			return res.status(500).send({error: 'Internal server error'});
	}
	});
};

export default usersController;