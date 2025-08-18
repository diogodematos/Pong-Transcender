import { WebSocket } from 'ws';
import db from '../db.js';

// Store active games and their sockets
const connectedGames = new Map();
const gamePlayers = new Map();
const socketToUserId = new Map(); // Map each socket to its user ID

export default async function gameRoutes(fastify, options) {
  fastify.log.info('🎮 Game controller routes being registered');
  
  // WebSocket upgrade handler for game connections
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    fastify.log.info('🔌 Game WebSocket connection attempt received');
    fastify.log.info('Request query params:', req.query);
    
    // In Fastify WebSocket, the connection object itself is the socket
    const socket = connection;
    
    const token = req.query.token;
    const gameId = req.query.gameId || 'default-game';

    try {
      req.log.info(`Starting game WebSocket connection for gameId: ${gameId}`);
      
      // Verify JWT token
      if (!token) {
        throw new Error('No token provided');
      }
      
      req.log.info(`Verifying JWT token for game connection`);
      const decoded = fastify.jwt.verify(token);
      const userId = decoded.id;
      req.log.info(`JWT verified successfully for user: ${userId}`);
      
      // Set up game state
      if (!connectedGames.has(gameId)) {
        connectedGames.set(gameId, new Set());
        gamePlayers.set(gameId, {
          player1Id: null,
          player2Id: null,
          activePlayer1: false,
          activePlayer2: false,
          countdownStarted: false,
          gameState: {
            paddle1Y: 0,
            paddle2Y: 0,
            lastP1Y: 0,
            lastP2Y: 0,
            ballX: 0,
            ballY: 0,
            ballZ: 0,
            ballVelX: 0, // Start with 0 velocity
            ballVelZ: 0, // Start with 0 velocity
            player1Score: 0,
            player2Score: 0,
            gameStarted: false, // Track if game has actually started
            gameEnded: false,
            updateInterval: null
          }
        });
      }

      const gameSockets = connectedGames.get(gameId);
      const players = gamePlayers.get(gameId);
      const gameState = players.gameState; // Use shared game state
      
      req.log.info(`🔍 Debug - Before adding socket: Set size = ${gameSockets.size}`);
      gameSockets.add(socket);
      socketToUserId.set(socket, userId); // Map this socket to the user ID
      req.log.info(`🔍 Debug - After adding socket: Set size = ${gameSockets.size}`);
      req.log.info(`🔍 Debug - Socket mapped to user ID: ${userId}`);
      
      // Assign or reassign player based on userId
      if (!players.player1Id || players.player1Id === userId) {
        players.player1Id = userId;
        players.activePlayer1 = true;
      } else if (!players.player2Id || players.player2Id === userId) {
        players.player2Id = userId;
        players.activePlayer2 = true;
      } else {
        req.log.info(`Unauthorized join attempt by user ${userId} for game ${gameId}`);
        socket.close(1008, 'Game full or not authorized');
        return;
      }

      // Start countdown when 2nd player joins or reconnects
      if (gameSockets.size === 2 && players.activePlayer1 && players.activePlayer2 && !players.countdownStarted) {
        players.countdownStarted = true;
        let countdown = 3;
        
        const countdownInterval = setInterval(() => {
          // Broadcast countdown to all clients
          gameSockets.forEach(client => {
            if (client && client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'countdown',
                count: countdown
              }));
            }
          });
          
          countdown--;
          
          if (countdown < 0) {
            clearInterval(countdownInterval);
            
            // Set initial velocity only if currently at rest (initial start or after goal)
            if (gameState.ballVelX === 0 && gameState.ballVelZ === 0) {
              gameState.ballX = 0;
              gameState.ballZ = 0;
              gameState.ballVelX = Math.random() > 0.5 ? 0.3 : -0.3;
              gameState.ballVelZ = (Math.random() - 0.5) * 0.3;
              req.log.info(`Setting initial ball velocity: X=${gameState.ballVelX}, Z=${gameState.ballVelZ}`);
            }
            
            gameState.gameStarted = true;
            req.log.info(`Game started/resumed! Ball velocity: X=${gameState.ballVelX}, Z=${gameState.ballVelZ}`);
            
            // Notify clients game has started
            gameSockets.forEach(client => {
              if (client && client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'game_started',
                  message: 'Game has started!'
                }));
              }
            });
          }
        }, 1000); // Update every second
      }
      
      req.log.info(`User ${userId} joined game ${gameId}. Players connected: ${gameSockets.size}/2`);

      socket.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          req.log.info(`Received message from user ${userId}:`, data);

          if (data.type === 'game_init') {
            req.log.info(`Game ${gameId} initialized by user ${userId}, isHost: ${data.isHost}`);
            // Don't initialize ball movement - wait for countdown to complete
            
            // Send immediate game state after initialization
            setTimeout(() => {
              gameSockets.forEach(client => {
                if (client && client.readyState === 1) {
                  // Find which user this client belongs to using the socket mapping
                  const clientUserId = socketToUserId.get(client);
                  const isClientPlayer1 = clientUserId === players.player1Id;
                  
                  req.log.info(`📡 Sending game state to user ${clientUserId}, isPlayer1: ${isClientPlayer1}`);
                  
                  // Mirror ball position for Player 2 so they see it from their perspective
                  /*gameState.ballX += gameState.ballVelX;
                  gameState.ballZ += gameState.ballVelZ;*/

                  const ballXForClient = isClientPlayer1 ? gameState.ballX : -gameState.ballX;
                  const ballZForClient = isClientPlayer1 ? gameState.ballZ : -gameState.ballZ;

                  client.send(JSON.stringify({
                    type: 'game_state',
                    opponentPaddleY: isClientPlayer1 ? -gameState.paddle2Y : -gameState.paddle1Y,
                    ballX: ballXForClient,
                    ballZ: ballZForClient,
                    playerScore: isClientPlayer1 ? gameState.player1Score : gameState.player2Score,
                    opponentScore: isClientPlayer1 ? gameState.player2Score : gameState.player1Score,
                    playersConnected: gameSockets.size,
                    gameStarted: gameState.gameStarted,
                  }));
                }
              });
            }, 10);
            
          } else if (data.type === 'player_update') {
            // Update paddle position based on user ID (host vs non-host)
            // Host (player1) is always the first player who joined
            const isPlayer1 = players.player1Id === userId;
            
            if (isPlayer1) {
              gameState.paddle1Y = data.paddleY;
            } else {
              gameState.paddle2Y = data.paddleY;
            }

            // Send game state to each client with proper player mapping
            gameSockets.forEach(client => {
              if (client && client.readyState === 1) {
                // Find which user this client belongs to using the socket mapping
                const clientUserId = socketToUserId.get(client);
                const isClientPlayer1 = clientUserId === players.player1Id;

                // Mirror ball position for Player 2 so they see it from their perspective
                /*gameState.ballX += gameState.ballVelX;
                gameState.ballZ += gameState.ballVelZ;*/

                const ballXForClient = isClientPlayer1 ? gameState.ballX : -gameState.ballX;
                const ballZForClient = isClientPlayer1 ? gameState.ballZ : -gameState.ballZ;

                client.send(JSON.stringify({
                  type: 'game_state',
                  opponentPaddleY: isClientPlayer1 ? -gameState.paddle2Y : -gameState.paddle1Y,
                  ballX: ballXForClient,
                  ballZ: ballZForClient,
                  playerScore: isClientPlayer1 ? gameState.player1Score : gameState.player2Score,
                  opponentScore: isClientPlayer1 ? gameState.player2Score : gameState.player1Score,
                  playersConnected: gameSockets.size,
                  gameStarted: gameState.gameStarted,
                }));
              }
            });
          }
        } catch (e) {
          req.log.error(`Error processing game message: ${e.message}`);
        }
      });


      gameState.lastP1Y = gameState.paddle1Y;
      gameState.lastP2Y = gameState.paddle2Y;

      // Start periodic game state broadcast for this game if not already started
      if (!gameState.updateInterval) {
        gameState.updateInterval = setInterval(() => {
          if (gameSockets.size > 0) {
            if (gameState.gameStarted && !gameState.gameEnded) {
              // Update ball position
              gameState.ballX += gameState.ballVelX;
              gameState.ballZ += gameState.ballVelZ;

              // Wall bouncing
              const arenaHalfHeight = 15;
              if (gameState.ballZ <= -arenaHalfHeight + 1 || gameState.ballZ >= arenaHalfHeight - 1) {
                gameState.ballVelZ *= -1;
              }

              // Paddle collision detection
              const paddleHeight = 3;
              const arenaHalfWidth = 24;

              let speed = 0.4;
              let spin = 0.2;

              // Player 1 paddle collision (left side)
              if (gameState.ballX <= -arenaHalfWidth + 2 && gameState.ballX >= -arenaHalfWidth + 1) {
                if (gameState.ballZ >= gameState.paddle1Y - paddleHeight && 
                    gameState.ballZ <= gameState.paddle1Y + paddleHeight)
                {
                  if (gameState.lastP1Y !== gameState.paddle1Y)
                  {
                    gameState.ballVelX = Math.abs(gameState.ballVelX) + speed; // Increase speed powerup
                    gameState.ballVelZ += (gameState.ballZ - gameState.paddle1Y) * (-spin); // Add spin
                    gameState.lastP1Y = gameState.paddle1Y;
                  }
                  else
                  {
                    gameState.ballVelX = Math.abs(gameState.ballVelX) + 0.01; // Increase speed slightly
                    gameState.ballVelZ += (gameState.ballZ - gameState.paddle1Y) * 0.1; // Add spin
                  }
                  req.log.info(`Player 1 paddle hit! Ball velocity: X=${gameState.ballVelX}, Z=${gameState.ballVelZ}`);
                }
              }

              // Player 2 paddle collision (right side)
              if (gameState.ballX >= arenaHalfWidth - 2 && gameState.ballX <= arenaHalfWidth - 1) {
                if (gameState.ballZ >= -gameState.paddle2Y - paddleHeight &&
                    gameState.ballZ <= -gameState.paddle2Y + paddleHeight)
                {
                  if (gameState.lastP2Y !== gameState.paddle2Y)
                  {
                    gameState.ballVelX = -Math.abs(gameState.ballVelX) - speed; // Increase speed slightly
                    gameState.ballVelZ += (gameState.ballZ - (-gameState.paddle2Y)) * (-spin); // Add spin
                    gameState.lastP2Y = gameState.paddle2Y;
                  }
                  else
                  {
                    gameState.ballVelX = -Math.abs(gameState.ballVelX) - 0.01; // Increase speed slightly
                    gameState.ballVelZ += (gameState.ballZ - (-gameState.paddle2Y)) * 0.1; // Add spin
                  }
                  req.log.info(`Player 2 paddle hit! Ball velocity: X=${gameState.ballVelX}, Z=${gameState.ballVelZ}`);
                }
              }

              gameState.lastP1Y = gameState.paddle1Y;
              gameState.lastP2Y = gameState.paddle2Y;

              // Goal detection
              if (gameState.ballX > arenaHalfWidth) {
                // Ball went past right side of arena (from server perspective)
                // Player 1 (host) scores because ball went past Player 2's goal
                gameState.player1Score++;
                gameState.ballX = 0;
                gameState.ballZ = 0;
                gameState.ballVelX = 0;
                gameState.ballVelZ = 0;

                setTimeout(() => {
                  gameState.ballVelX = -0.3;
                  gameState.ballVelZ = (Math.random() - 0.5) * 0.3;
                }, 1000);

                req.log.info(`Player 1 scored! Score: ${gameState.player1Score}-${gameState.player2Score}`);
              } else if (gameState.ballX < -arenaHalfWidth) {
                // Ball went past left side of arena (from server perspective)
                // Player 2 (non-host) scores because ball went past Player 1's goal
                gameState.player2Score++;
                gameState.ballX = 0;
                gameState.ballZ = 0;
                gameState.ballVelX = 0;
                gameState.ballVelZ = 0;

                setTimeout(() => {
                gameState.ballVelX = 0.3;
                gameState.ballVelZ = (Math.random() - 0.5) * 0.3;
                }, 1000);

                req.log.info(`Player 2 scored! Score: ${gameState.player1Score}-${gameState.player2Score}`);
              }

              // Check for game end (first to 5 points wins)
              if (!gameState.gameEnded && (gameState.player1Score >= 5 || gameState.player2Score >= 5)) {
                // Broadcast final game state to all clients before game_end
                gameSockets.forEach(client => {
                  if (client && client.readyState === 1) {
                    const clientUserId = socketToUserId.get(client);
                    const isClientPlayer1 = clientUserId === players.player1Id;
                    // Mirror ball position for Player 2 so they see it from their perspective
                    const ballXForClient = isClientPlayer1 ? gameState.ballX : -gameState.ballX;
                    const ballZForClient = isClientPlayer1 ? gameState.ballZ : -gameState.ballZ;
                    client.send(JSON.stringify({
                      type: 'game_state',
                      opponentPaddleY: isClientPlayer1 ? -gameState.paddle2Y : -gameState.paddle1Y,
                      ballX: ballXForClient,
                      ballZ: ballZForClient,
                      playerScore: isClientPlayer1 ? gameState.player1Score : gameState.player2Score,
                      opponentScore: isClientPlayer1 ? gameState.player2Score : gameState.player1Score,
                      playersConnected: gameSockets.size,
                      gameStarted: gameState.gameStarted,
                    }));
                  }
                });
                gameState.gameEnded = true;
                const winnerId = gameState.player1Score >= 5 ? players.player1Id : players.player2Id;
                req.log.info(`Game ended! Winner: ${winnerId}, Final Score: ${gameState.player1Score}-${gameState.player2Score}`);

                // Save game result to database
                try {
                  db.prepare(`
                    INSERT INTO games (player1_id, player2_id, player1_score, player2_score, winner_id, played_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                  `).run(
                    players.player1Id,
                    players.player2Id || 0,
                    gameState.player1Score,
                    gameState.player2Score,
                    winnerId
                  );
                  // Update user stats
                  db.prepare('UPDATE users SET wins = wins + 1 WHERE id = ?').run(winnerId);
                  const loserId = winnerId === players.player1Id ? players.player2Id : players.player1Id;
                  if (loserId) {
                    db.prepare('UPDATE users SET losses = losses + 1 WHERE id = ?').run(loserId);
                  }
                  req.log.info(`Database updated: Winner ${winnerId} got +1 win, Loser ${loserId} got +1 loss`);
                } catch (dbError) {
                  req.log.error(`Database error when saving game result: ${dbError.message}`);
                }

                // Broadcast personalized game end to each client
                gameSockets.forEach(client => {
                  if (client && client.readyState === 1) {
                    const clientUserId = socketToUserId.get(client);
                    const isClientPlayer1 = clientUserId === players.player1Id;
                    client.send(JSON.stringify({
                      type: 'game_end',
                      winnerId: winnerId,
                      yourPlayerId: clientUserId,
                      playerScore: isClientPlayer1 ? gameState.player1Score : gameState.player2Score,
                      opponentScore: isClientPlayer1 ? gameState.player2Score : gameState.player1Score,
                    }));
                  }
                });

                // Clean up game resources
                connectedGames.delete(gameId);
                gamePlayers.delete(gameId);
                clearInterval(gameState.updateInterval);
                return;
              }
            }

            // Always broadcast updated state to all clients
            gameSockets.forEach(client => {
              if (client && client.readyState === 1) {
                // Find which user this client belongs to using the socket mapping
                const clientUserId = socketToUserId.get(client);
                const isClientPlayer1 = clientUserId === players.player1Id;
                
                req.log.info(`📡 Broadcasting game state to user ${clientUserId}, isPlayer1: ${isClientPlayer1}`);

                // Mirror ball position for Player 2 so they see it from their perspective
                /*gameState.ballX += gameState.ballVelX;
                gameState.ballZ += gameState.ballVelZ;*/

                const ballXForClient = isClientPlayer1 ? gameState.ballX : -gameState.ballX;
                const ballZForClient = isClientPlayer1 ? gameState.ballZ : -gameState.ballZ;

                client.send(JSON.stringify({
                  type: 'game_state',
                  opponentPaddleY: isClientPlayer1 ? -gameState.paddle2Y : -gameState.paddle1Y,
                  ballX: ballXForClient,
                  ballZ: ballZForClient,
                  playerScore: isClientPlayer1 ? gameState.player1Score : gameState.player2Score,
                  opponentScore: isClientPlayer1 ? gameState.player2Score : gameState.player1Score,
                  playersConnected: gameSockets.size,
                  gameStarted: gameState.gameStarted,
                }));
              }
            });
          }
        }, 10); // Reduced to 10 FPS server updates to prevent glitching
      }

      socket.on('close', (code, reason) => {
        const disconnectedUserId = socketToUserId.get(socket);
        gameSockets.delete(socket);
        socketToUserId.delete(socket);
        
        if (disconnectedUserId === players.player1Id) {
          players.activePlayer1 = false;
        } else if (disconnectedUserId === players.player2Id) {
          players.activePlayer2 = false;
        }
        
        // Pause game if not both active
        if (!players.activePlayer1 || !players.activePlayer2) {
          gameState.gameStarted = false;
          players.countdownStarted = false;
          req.log.info(`Game paused due to disconnection. Waiting for reconnection.`);
        }
        
        req.log.info(`User ${disconnectedUserId} left game ${gameId}. Code: ${code}, Reason: ${reason || 'N/A'}. Connected: ${gameSockets.size}`);
        
        if (gameSockets.size === 0) {
          if (gameState.updateInterval) {
            clearInterval(gameState.updateInterval);
            gameState.updateInterval = null;
          }
          connectedGames.delete(gameId);
          gamePlayers.delete(gameId);
        }
      });

      socket.on('error', (error) => {
        const disconnectedUserId = socketToUserId.get(socket);
        gameSockets.delete(socket);
        socketToUserId.delete(socket);
        
        if (disconnectedUserId === players.player1Id) {
          players.activePlayer1 = false;
        } else if (disconnectedUserId === players.player2Id) {
          players.activePlayer2 = false;
        }
        
        // Pause game if not both active
        if (!players.activePlayer1 || !players.activePlayer2) {
          gameState.gameStarted = false;
          players.countdownStarted = false;
          req.log.info(`Game paused due to disconnection. Waiting for reconnection.`);
        }
        
        req.log.error(`Game WebSocket error for user ${disconnectedUserId}: ${error.message}`);
        
        if (gameSockets.size === 0) {
          if (gameState.updateInterval) {
            clearInterval(gameState.updateInterval);
            gameState.updateInterval = null;
          }
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
      try {
        if (socket && typeof socket.close === 'function') {
          socket.close(1008, `Authentication error: ${error.message}`);
        } else if (connection && connection.socket && typeof connection.socket.close === 'function') {
          connection.socket.close(1008, `Authentication error: ${error.message}`);
        }
      } catch (closeError) {
        req.log.error(`Error closing WebSocket: ${closeError.message}`);
      }
    }
  });

  // API to create a new game
  fastify.post('/create', {
    onRequest: [fastify.authenticate],
    handler: async (req, reply) => {
      let gameId;
      do {
        gameId = `game_${Math.floor(1000 + Math.random() * 9000)}`;
      } while (connectedGames.has(gameId));
      return { gameId };
    }
  });


  // API to join a game
  fastify.post('/join', {
    onRequest: [fastify.authenticate],
    handler: async (req, reply) => {
      const { gameId } = req.body;
      const userId = req.user.id;
      
      if (!connectedGames.has(gameId)) {
        throw new Error('Game not found');
      }
      
      const gameSockets = connectedGames.get(gameId);
      if (gameSockets.size >= 2) {
        throw new Error('Game is full');
      }
      
      return { success: true, gameId };
    }
  });
};