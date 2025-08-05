import db from '../db.js';

const gameController = async (fastify, options) => {
  const connectedGames = new Map(); // Map<gameId, Set<socket>>
  const gamePlayers = new Map(); // Map<gameId, {player1Id, player2Id}>

  // WebSocket endpoint for game
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const socket = connection;
    const params = new URL(req.url, 'http://localhost').searchParams;
    const token = params.get('token');
    const gameId = params.get('gameId');

    if (!token || !gameId) {
      req.log.warn('Missing token or gameId for game WebSocket connection.');
      socket.close(1008, 'Token and gameId are required');
      return;
    }

    try {
      const decoded = fastify.jwt.verify(token);
      const userId = decoded.id;

      if (!connectedGames.has(gameId)) {
        connectedGames.set(gameId, new Set());
        gamePlayers.set(gameId, { player1Id: userId, player2Id: null });
      }
      const gameSockets = connectedGames.get(gameId);
      const players = gamePlayers.get(gameId);

      if (gameSockets.size >= 2) {
        socket.close(1008, 'Game is full');
        return;
      }

      gameSockets.add(socket);
      if (gameSockets.size === 2) {
        players.player2Id = userId;
      }
      req.log.info(`User ${userId} joined game ${gameId}`);

      // Game state
      let gameState = {
        paddle1Y: 0,
        paddle2Y: 0,
        ballX: 0,
        ballY: 0,
        player1Score: 0,
        player2Score: 0,
      };

      socket.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'game_init') {
            if (data.isHost) {
              req.log.info(`Game ${gameId} initialized by host ${userId}`);
            }
          } else if (data.type === 'player_update') {
            if (gameSockets.size === 1) {
              // Single-player (AI opponent)
              gameState.paddle1Y = data.paddleY;
              gameState.paddle2Y = -data.paddleY; // Simple AI
              gameState.ballX += 0.1 * (gameState.ballX < 0 ? 1 : -1);
              if (gameState.ballX > 4 || gameState.ballX < -4) {
                gameState.ballX = 0;
                gameState.ballY = 0;
                if (gameState.ballX > 4) gameState.player1Score++;
                else gameState.player2Score++;
              }
            } else {
              // Multiplayer
              if (Array.from(gameSockets)[0] === socket) {
                gameState.paddle1Y = data.paddleY;
              } else {
                gameState.paddle2Y = data.paddleY;
              }
              gameState.ballX += 0.1 * (gameState.ballX < 0 ? 1 : -1);
              if (gameState.ballX > 4 || gameState.ballX < -4) {
                gameState.ballX = 0;
                gameState.ballY = 0;
                if (gameState.ballX > 4) gameState.player1Score++;
                else gameState.player2Score++;
              }
            }

            // Check for game end (e.g., score reaches 5)
            if (gameState.player1Score >= 5 || gameState.player2Score >= 5) {
              const winnerId = gameState.player1Score >= 5 ? players.player1Id : players.player2Id;
              // Save game result to database
              db.prepare(`
                INSERT INTO games (player1_id, player2_id, player1_score, player2_score, winner_id, played_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
              `).run(
                players.player1Id,
                players.player2Id || 0, // 0 for AI opponent
                gameState.player1Score,
                gameState.player2Score,
                winnerId
              );
              // Update user stats
              db.prepare('UPDATE users SET wins = wins + 1 WHERE id = ?').run(winnerId);
              db.prepare('UPDATE users SET losses = losses + 1 WHERE id = ?').run(
                winnerId === players.player1Id && players.player2Id ? players.player2Id : players.player1Id
              );
              gameSockets.forEach(client => {
                if (client.readyState === 1) {
                  client.send(JSON.stringify({
                    type: 'game_end',
                    winnerId,
                    player1Score: gameState.player1Score,
                    player2Score: gameState.player2Score,
                  }));
                }
              });
              connectedGames.delete(gameId);
              gamePlayers.delete(gameId);
              return;
            }

            // Broadcast game state
            gameSockets.forEach(client => {
              if (client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'game_state',
                  opponentPaddleY: client === Array.from(gameSockets)[0] ? gameState.paddle2Y : gameState.paddle1Y,
                  ballX: gameState.ballX,
                  ballY: gameState.ballY,
                  playerScore: client === Array.from(gameSockets)[0] ? gameState.player1Score : gameState.player2Score,
                  opponentScore: client === Array.from(gameSockets)[0] ? gameState.player2Score : gameState.player1Score,
                }));
              }
            });
          }
        } catch (e) {
          req.log.error(`Error processing game message: ${e.message}`);
        }
      });

      socket.on('close', (code, reason) => {
        gameSockets.delete(socket);
        req.log.info(`User ${userId} left game ${gameId}. Code: ${code}, Reason: ${reason || 'N/A'}`);
        if (gameSockets.size === 0) {
          connectedGames.delete(gameId);
          gamePlayers.delete(gameId);
        }
      });

      socket.on('error', (error) => {
        req.log.error(`Game WebSocket error for user ${userId}: ${error.message}`);
        gameSockets.delete(socket);
        if (gameSockets.size === 0) {
          connectedGames.delete(gameId);
          gamePlayers.delete(gameId);
        }
      });

      socket.send(JSON.stringify({
        type: 'game_joined',
        gameId,
        userId,
      }));
    } catch (error) {
      req.log.error(`Error verifying game WebSocket token: ${error.message}`);
      socket.close(1008, `Authentication error: ${error.message}`);
    }
  });

  // API to create a new game
  fastify.post('/create', {
    onRequest: [fastify.authenticate],
    handler: async (req, reply) => {
      const userId = req.user.id;
      const gameId = `game_${Date.now()}_${userId}`;
      return { gameId };
    }
  });

  // API to join a game
  fastify.post('/join', {
    onRequest: [fastify.authenticate],
    handler: async (req, reply) => {
      const userId = req.user.id;
      const { gameId } = req.body;
      if (!gameId || !connectedGames.has(gameId)) {
        return reply.status(404).send({ error: 'Game not found' });
      }
      return { gameId };
    }
  });
};

export default gameController;