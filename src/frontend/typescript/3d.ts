import {router} from "./router.ts";

class Game3D {
  // Connections
  private socket: WebSocket | null = null;
  private isHost: boolean = false;
  private gameId: string = '';
  private isConnected: boolean = false;
  private useMultiplayer: boolean = false;
  private gameUpdateInterval: number | null = null;

  // Canvas and engine
  private canvas: HTMLCanvasElement;
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene | null;
  private camera: BABYLON.FreeCamera | null;

  // Lighting
  private playerLight: BABYLON.SpotLight;
  private computerLight: BABYLON.SpotLight;

  // Game objects
  private arenaSize = [50, 30];
  private player: BABYLON.Mesh;
  private computer: BABYLON.Mesh;
  private ball: BABYLON.Mesh;
  private playerGoal: BABYLON.Mesh;
  private computerGoal: BABYLON.Mesh;
  private topWallZ: number = 0;
  private bottomWallZ: number = 0;

  // Game state
  private keysPressed: { [key: number]: boolean } = {};
  private playerScore: number = 0;
  private computerScore: number = 0;
  private finalPlayerScore: number | null = null;
  private finalOpponentScore: number | null = null;
  private diffMultiplier: number = 1;
  private speedMultiplier: number = 1.4;
  private diffMultiplierIA: number = 1;
  private speedMultiplierIA: number = 1.4;
  private ballSpeed: number = 0.3;
  private ballDiameter: number = 1;
  private isPlayerMoving: "UP" | "DOWN" | "NO" = "NO";
  private playerWidth: number = 6;
  private computerWidth: number = 6;
  private gameEndOverlay: HTMLDivElement | null = null;
  private isRunning: boolean = true;
  private gameState: boolean | null = null; // true = victory, false = defeat

  // Visual effects
  private playerScorePulse: number = 0;
  private computerScorePulse: number = 0;
  private maxPulseIntensity: number = 2;
  private pulseDecayRate: number = 0.05;
  private ballLastHitBy: string | null = null;
  private ballGlowIntensity: number = 0;

  // Particle system and effects
  private particleSystem: BABYLON.ParticleSystem;
  private ballTrail: BABYLON.Vector3[] = [];
  private maxTrailLength: number = 200;
  private ballFragments: BABYLON.Mesh[] = [];
  private isGoalScored: boolean = false;

  public setDifficulty(level: 'easy' | 'medium' | 'hard') {
    if (level === 'easy') {
        this.diffMultiplier = 2;
        this.speedMultiplier = 1.3;
        this.ballSpeed = 0.25;
    } else if (level === 'medium') {
        this.diffMultiplier = 1;
        this.speedMultiplier = 1.4;
        this.ballSpeed = 0.3;
    } else if (level === 'hard') {
        this.diffMultiplier = 0.5;
        this.speedMultiplier = 1.5;
        this.ballSpeed = 0.35;
    }

    console.log(`📊 Dificuldade ajustada para: ${level}`);
    this.reset();
}


  constructor() {
    const canvasEl = document.getElementById("renderCanvas");
    console.debug('[Game3D] renderCanvas element:', canvasEl);
    if (!canvasEl) {
      const gamePage = document.getElementById('gamePage');
      console.error('[Game3D] renderCanvas not found! gamePage innerHTML:', gamePage ? gamePage.innerHTML : 'gamePage not found');
      throw new Error('Element with id "renderCanvas" not found.');
    }
    if (!(canvasEl instanceof HTMLCanvasElement)) {
      const gamePage = document.getElementById('gamePage');
      console.error('[Game3D] renderCanvas is not a canvas element! Tag:', canvasEl.tagName, 'gamePage innerHTML:', gamePage ? gamePage.innerHTML : 'gamePage not found');
      throw new Error('Element with id "renderCanvas" is not a canvas element.');
    }
    this.canvas = canvasEl;
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = null!; // Will be initialized in createScene
    this.camera = null!; // Will be initialized in createScene

    // Initialize other properties that will be set in createScene
    this.playerLight = null!;
    this.computerLight = null!;
    this.player = null!;
    this.computer = null!;
    this.ball = null!;
    this.playerGoal = null!;
    this.computerGoal = null!;
    this.particleSystem = null!;
  }

  // Connections
  async connectToGame(gameId: string, isHost: boolean, useMultiplayer: boolean = false): Promise<boolean> {
    this.isHost = isHost;
    this.useMultiplayer = useMultiplayer;

    // Only set up WebSocket for multiplayer
    if (!useMultiplayer) {
      console.log("Starting single player game");
      return true;
    }

    let targetGameId: string;

    // Get authentication token
    const token = this.getAuthToken();
    if (!token) {
      throw new Error("Authentication token not found. Please log in first.");
    }

    // Test authentication first
    try {
      console.log('Testing authentication...');
      const authTestResponse = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Auth test response status:', authTestResponse.status);
      
      if (!authTestResponse.ok) {
        const authErrorText = await authTestResponse.text();
        console.error('Auth test failed:', authTestResponse.status, authTestResponse.statusText, authErrorText);
        throw new Error("Authentication failed. Please log in again.");
      }
      
      const profileData = await authTestResponse.json();
      console.log('Authentication test passed, user profile:', profileData);
    } catch (error) {
      console.error('Auth test error:', error);
      throw new Error("Authentication failed. Please log in again.");
    }

    // Determine connection type and game ID
    if (isHost) {
      // Create a new game using the API
      try {
        console.log('Making request to /api/game/create with token:', token);
        console.log('Request method: POST');
        console.log('Request headers:', {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        });
        
        const response = await fetch('/api/game/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({}) // Add empty body to ensure it's treated as POST
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        // Log response headers as an object
        const responseHeaders: any = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        console.log('Response headers:', responseHeaders);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response body:', errorText);
          
          // Try to parse error as JSON for better error message
          try {
            const errorJson = JSON.parse(errorText);
            console.error('Parsed error:', errorJson);
            throw new Error(`Failed to create game: ${response.status} ${response.statusText} - ${errorJson.message || errorJson.error || errorText}`);
          } catch (parseError) {
            throw new Error(`Failed to create game: ${response.status} ${response.statusText} - ${errorText}`);
          }
        }

        const result = await response.json();
        targetGameId = result.gameId;
        this.gameId = targetGameId;
        console.log("Created game with ID:", targetGameId);
        alert("Game created! Share this ID with others to join: " + targetGameId);
      } catch (error) {
        console.error("Failed to create game:", error);
        throw new Error(`Failed to create game. Please try again. Error: ${error}`);
      }
    } else {
      // Join existing game
      if (!gameId || gameId.trim() === "") {
        console.error("Error: Game ID is required to join a game");
        return false;
      }
      
      targetGameId = gameId.trim();
      this.gameId = targetGameId;

      // Validate game exists using the API
      try {
        const response = await fetch('/api/game/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ gameId: targetGameId })
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Game not found");
          }
          throw new Error(`Failed to join game: ${response.statusText}`);
        }

        console.log("Game validated, proceeding to join:", targetGameId);
      } catch (error) {
        console.error("Failed to validate game:", error);
        throw error;
      }
    }

    try {
      console.log(`${isHost ? 'Creating' : 'Joining'} game with ID: ${targetGameId}`);

      // Create WebSocket connection using your existing infrastructure
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      // Use the same host as the current page (nginx proxy will handle routing)
      const wsUrl = `${protocol}//${hostname}/api/game/ws?token=${encodeURIComponent(token)}&gameId=${encodeURIComponent(targetGameId)}`;
      
      this.socket = new WebSocket(wsUrl);
      console.log("Socket connection initiated for game:", targetGameId);

      // Store socket reference to avoid null issues
      const socket = this.socket;

      // Return a promise that resolves when connection is established or rejects on error
      return new Promise((resolve, reject) => {
        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
          console.error("Connection timeout");
          socket.close();
          reject(new Error("Connection timeout"));
        }, 10000); // 10 second timeout

        socket.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log("Socket connection established");
          this.isConnected = true;

          // Send game initialization message
          console.log('Sending game_init message, isHost:', this.isHost);
          socket.send(JSON.stringify({
            type: 'game_init',
            isHost: this.isHost,
            gameId: targetGameId
          }));

          resolve(true);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Received WebSocket message:", data);

            // Handle connection-specific responses
            if (data.type === "game_joined") {
              console.log(`Successfully joined game:`, targetGameId);
            }

            if (data.type === "game_end") {
              console.log("Game ended:", data);
              // Handle game end logic here
            }

            // Pass to your existing message handler
            this.handleNetworkMessage(data);
          } catch (parseError) {
            console.error("Error parsing message:", parseError);
          }
        };

        socket.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error("WebSocket error:", error);
          this.isConnected = false;
          reject(new Error("WebSocket connection failed"));
        };

        socket.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log("WebSocket closed:", event.code, event.reason);
          this.isConnected = false;
          
          // Clean up game update interval
          if (this.gameUpdateInterval) {
            clearInterval(this.gameUpdateInterval);
            this.gameUpdateInterval = null;
          }

          // Handle specific close codes
          if (event.code === 1008) {
            reject(new Error("Authentication failed or game is full"));
          } else if (!this.isConnected) {
            reject(new Error(`Connection closed: ${event.reason || 'Unknown reason'}`));
          }
        };
      });

    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      return false;
    }
  }

  // Helper method to get authentication token - implement based on your auth system
  private getAuthToken(): string | null {
    // This should return the JWT token from your authentication system
    // You might store it in localStorage, sessionStorage, or a cookie
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;
  }

  handleNetworkMessage(data: any) {
    console.log('🔄 Processing network message:', data.type, data);
    
  switch (data.type) {
      case 'game_joined':
        console.log('✅ Successfully joined game:', data.gameId);
        console.log('🔌 WebSocket connected, isHost:', this.isHost, 'useMultiplayer:', this.useMultiplayer);
        
        // Send our initial position to sync with other player
        if (this.useMultiplayer && this.isConnected && this.socket) {
          console.log('Sending initial position sync');
          this.socket.send(JSON.stringify({
            type: 'player_update',
            paddleY: this.player.position.z,
            ballX: this.ball.position.x,
            ballY: this.ball.position.z
          }));
          
          // If we're the host, send periodic updates to ensure ball starts moving
          if (this.isHost) {
            console.log('Host: Starting ball movement trigger interval');
            if (!this.gameUpdateInterval) {
              let updateCount = 0;
              this.gameUpdateInterval = window.setInterval(() => {
                if (this.useMultiplayer && this.isConnected && this.socket) {
                  updateCount++;
                  console.log(`Host trigger update #${updateCount}`);
                  this.socket.send(JSON.stringify({
                    type: 'player_update',
                    paddleY: this.player.position.z,
                    ballX: this.ball.position.x,
                    ballY: this.ball.position.z
                  }));
                  
                  // Stop after 10 updates (5 seconds) to let natural gameplay take over
                  if (updateCount >= 10) {
                    console.log('Host trigger interval completed');
                    if (this.gameUpdateInterval) {
                      clearInterval(this.gameUpdateInterval);
                      this.gameUpdateInterval = null;
                    }
                  }
                }
              }, 500); // Send updates every 500ms for the first 5 seconds
            }
          }
        }
        break;

      case 'game_state':
        console.log('Received game state:', {
          opponentPaddleY: data.opponentPaddleY,
          ballX: data.ballX,
          ballY: data.ballY,
          playerScore: data.playerScore,
          opponentScore: data.opponentScore,
          playersConnected: data.playersConnected,
          gameStarted: data.gameStarted
        });
        
        // Handle game state updates from server
        if (this.useMultiplayer) {
          // Only update opponent paddle position, don't touch our own paddle
          if (data.opponentPaddleY !== undefined) {
            this.computer.position.z = data.opponentPaddleY;
          }
          
          // Update ball position ONLY from server authority - disable all client ball physics
          if (data.ballX !== undefined && data.ballY !== undefined) {
            // Always update ball position from server, no client-side ball movement at all
            this.ball.position.x = data.ballX;
            this.ball.position.z = data.ballY; // Note: server ballY maps to our ballZ
            
            // Show the ball if it was hidden
            if (!this.ball.isEnabled()) {
              this.ball.setEnabled(true);
              this.isGoalScored = false;
            }
            
            // Ball is moving, stop the host interval if it exists
            if (this.gameUpdateInterval && this.isHost) {
              console.log('🎾 Ball started moving, stopping host trigger interval');
              clearInterval(this.gameUpdateInterval);
              this.gameUpdateInterval = null;
            }
          } else {
            console.log('❌ No ball position data received');
          }
          
          // Update scores - server sends playerScore (your score) and opponentScore (opponent's score)
          // Always display your score on left, opponent score on right, regardless of host status
          this.playerScore = data.playerScore;  // Your score (always on left display)
          this.computerScore = data.opponentScore;  // Opponent score (always on right display)
          
          console.log(`Score update - My score (left): ${this.playerScore}, Opponent score (right): ${this.computerScore}`);
          
          // Check if we're waiting for players or if game hasn't started yet
          if (data.playersConnected < 2) {
            console.log(`Waiting for players: ${data.playersConnected}/2 connected`);
            this.showWaitingMessage(`Waiting for opponent... (${data.playersConnected}/2 players)`);
          } else if (data.gameStarted === false) {
            console.log('Both players connected, waiting for countdown to complete...');
            this.hideWaitingMessage(); // Hide waiting message when both players are connected
          } else {
            this.hideWaitingMessage(); // Hide waiting message when game is active
          }
          
          console.log('Updated scores - Player (left):', this.playerScore, 'Opponent (right):', this.computerScore);
        }
        break;

      case 'countdown':
        console.log('Countdown:', data.count);
        // Display countdown to user
        this.showCountdown(data.count);
        break;

      case 'game_started':
        console.log('Game has officially started!');
        // Hide countdown display and show that game is active
        this.hideCountdown();
        break;

      case 'game_end':
        console.log('Game ended:', data);
        
        // Clean up game update interval
        if (this.gameUpdateInterval) {
          clearInterval(this.gameUpdateInterval);
          this.gameUpdateInterval = null;
        }
        
  // Always use final scores from game_end message for overlay
  this.finalPlayerScore = typeof data.playerScore === 'number' ? data.playerScore : this.playerScore;
  this.finalOpponentScore = typeof data.opponentScore === 'number' ? data.opponentScore : this.computerScore;
  // Debug winner mapping
  console.log('[GameEnd] winnerId:', data.winnerId, 'yourPlayerId:', data.yourPlayerId, 'isVictory:', data.winnerId === data.yourPlayerId);
  // Set game state for overlay
  this.gameState = (data.winnerId === data.yourPlayerId); // true if you won
  this.isRunning = false;
  this.createGameEndOverlay();

        // Gracefully close ONLY the game WebSocket (not the user WebSocket)
        if (this.socket) {
          console.log('Closing game WebSocket connection');
          this.socket.close(1000, 'Game ended normally'); // Normal closure
          this.socket = null;
          this.isConnected = false;
        }
        break;

      default:
        console.log('Unknown message type:', data.type);
        break;
    }
  }

  generateUniqueGameId(): string {
    return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async init() {
    await this.createScene();
    console.log("Setting up...");
    this.setupEventListeners();
    //this.setupDifficultyButtons();
    
    // Set up score colors based on host status for multiplayer
    if (this.useMultiplayer) {
      this.setupScoreColors();
    }
    
    console.log("Rendering...");
    this.startRenderLoop();
    console.log("Done! Multiplayer mode:", this.useMultiplayer);
  }

  async createScene() {
    if (!this.engine) return;
    this.scene = new BABYLON.Scene(this.engine);
    if (!this.scene) return;
    this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    // Camera with cinematic angle
    this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(-45, 0, 0), this.scene);
    if (this.camera) {
      this.camera.setTarget(new BABYLON.Vector3(0, 0, 0));
      this.camera.rotation.x = 0.3;
    }

    // Lighting setup for dramatic effect
    this.createLighting();

    // Create game objects
    this.createArena();
    this.createPaddles();
    this.createBall();
    this.createParticleSystem();

    // Add atmospheric effects
    this.addAtmosphericEffects();
  }

  createLighting() {
    if (!this.scene) return;
    // Main directional light
    const mainLight = new BABYLON.DirectionalLight("mainLight", new BABYLON.Vector3(-1, -1, 1), this.scene);
    mainLight.intensity = 0.5;

    // Ambient light for subtle illumination
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 0.3;

    // Dynamic colored lights for atmosphere
    this.playerLight = new BABYLON.SpotLight("playerLight", new BABYLON.Vector3(-20, 10, 0),
      new BABYLON.Vector3(1, -0.5, 0), Math.PI / 4, 2, this.scene);
    this.playerLight.diffuse = new BABYLON.Color3(0.49, 0.976, 1); // Cyan
    this.playerLight.intensity = 0.8;

    this.computerLight = new BABYLON.SpotLight("computerLight", new BABYLON.Vector3(20, 10, 0),
      new BABYLON.Vector3(-1, -0.5, 0), Math.PI / 4, 2, this.scene);
    this.computerLight.diffuse = new BABYLON.Color3(1, 0.027, 0.227); // Red
    this.computerLight.intensity = 0.8;
  }

  createArena() {
    if (!this.scene) return;
    // Arena floor
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {
      width: this.arenaSize[0],
      height: this.arenaSize[1]
    }, this.scene);
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", this.scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.1);
    groundMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.4);
    groundMaterial.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.05);
    ground.material = groundMaterial;

    // Arena walls with glow
    this.createWalls();

    // Center line
    const centerLine = BABYLON.MeshBuilder.CreateBox("centerLine", {
      width: 0.2,
      height: 0.5,
      depth: this.arenaSize[0] / 2
    }, this.scene);
    const centerMaterial = new BABYLON.StandardMaterial("centerMat", this.scene);
    centerMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    centerMaterial.disableLighting = true;
    centerLine.material = centerMaterial;

    // Goal areas
    this.createGoalAreas();
  }

  createWalls() {
    if (!this.scene) return;
    // Top and bottom walls
    const wallHeight = 2;
    const wallMaterial = new BABYLON.StandardMaterial("wallMat", this.scene);
    wallMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
    wallMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.6);

    const topWall = BABYLON.MeshBuilder.CreateBox("topWall", {
      width: this.arenaSize[0],
      height: wallHeight,
      depth: 1
    }, this.scene);
    topWall.position.z = this.arenaSize[1] / 2;
    topWall.position.y = wallHeight / 2;
    topWall.material = wallMaterial;
    this.topWallZ = topWall.position.z;

    const bottomWall = BABYLON.MeshBuilder.CreateBox("bottomWall", {
      width: this.arenaSize[0],
      height: wallHeight,
      depth: 1
    }, this.scene);
    bottomWall.position.z = this.arenaSize[1] / -2;
    bottomWall.position.y = wallHeight / 2;
    bottomWall.material = wallMaterial;
    this.bottomWallZ = bottomWall.position.z;
  }

  createGoalAreas() {
    if (!this.scene) return;
    // Player goal (left side)
    const playerGoal = BABYLON.MeshBuilder.CreateBox("playerGoal", {
      width: 0.3,
      height: 0.5,
      depth: this.arenaSize[1] - 1
    }, this.scene);
    playerGoal.position.x = (this.arenaSize[0] / -2) + 0.5;
    playerGoal.position.y = 0.1;
    const playerGoalMat = new BABYLON.StandardMaterial("playerGoalMat", this.scene);
    
    // Computer goal (right side)
    const computerGoal = BABYLON.MeshBuilder.CreateBox("computerGoal", {
      width: 0.3,
      height: 0.5,
      depth: this.arenaSize[1] + 1
    }, this.scene);
    computerGoal.position.x = (this.arenaSize[0] / 2) + 0.5;
    computerGoal.position.y = 0.1;
    const computerGoalMat = new BABYLON.StandardMaterial("computerGoalMat", this.scene);
    
    // Set goal colors to match player colors consistently
    // Blue = Host (Player 1), Red = Non-host (Player 2)
    if (this.useMultiplayer) {
      if (this.isHost) {
        // Host sees: Left goal (yours) = blue, Right goal (opponent's) = red
        playerGoalMat.emissiveColor = new BABYLON.Color3(0.49, 0.976, 1); // Blue
        computerGoalMat.emissiveColor = new BABYLON.Color3(1, 0.027, 0.227); // Red
        console.log('HOST: Left goal BLUE (yours), Right goal RED (opponent)');
      } else {
        // Non-host sees: Left goal (yours) = red, Right goal (opponent's) = blue
        // This means when non-host scores into right goal (blue), their left score (red) increases
        playerGoalMat.emissiveColor = new BABYLON.Color3(1, 0.027, 0.227); // Red
        computerGoalMat.emissiveColor = new BABYLON.Color3(0.49, 0.976, 1); // Blue
        console.log('CLIENT: Left goal RED (yours), Right goal BLUE (opponent)');
      }
    } else {
      // Single player: default colors
      playerGoalMat.emissiveColor = new BABYLON.Color3(0.49, 0.976, 1); // Blue
      computerGoalMat.emissiveColor = new BABYLON.Color3(1, 0.027, 0.227); // Red
    }
    
    playerGoalMat.disableLighting = true;
    computerGoalMat.disableLighting = true;
    playerGoal.material = playerGoalMat;
    computerGoal.material = computerGoalMat;

    this.playerGoal = playerGoal;
    this.computerGoal = computerGoal;
  }

  createPaddles() {
    if (!this.scene) return;
    // Player paddle (left side)
    this.playerWidth = 6 * this.diffMultiplier;
    this.player = BABYLON.MeshBuilder.CreateBox("player", { width: 1, height: 1, depth: this.playerWidth }, this.scene);
    this.player.position.x = this.playerGoal.position.x + 1;
    this.player.position.y = 1.6;
    this.player.position.z = 0;

    // Player paddle material with glow
    const playerMaterial = new BABYLON.StandardMaterial("playerMat", this.scene);
    playerMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
    playerMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.5);
    playerMaterial.specularColor = new BABYLON.Color3(0.49, 0.976, 1);
    this.player.material = playerMaterial;

    // Computer paddle (right side)
    this.computerWidth = 6 * this.diffMultiplierIA;
    this.computer = BABYLON.MeshBuilder.CreateBox("computer", {
      width: 1,
      height: 1,
      depth: this.computerWidth
    }, this.scene);
    this.computer.position.x = this.computerGoal.position.x - 1;
    this.computer.position.y = 1;
    this.computer.position.z = 0;

    // Computer paddle material with glow
    const computerMaterial = new BABYLON.StandardMaterial("computerMat", this.scene);
    computerMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
    computerMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.1, 0.1);
    computerMaterial.specularColor = new BABYLON.Color3(1, 0.027, 0.227);
    this.computer.material = computerMaterial;

    // Add physics properties (extending the mesh objects)
    (this.player as any).velocity = new BABYLON.Vector3(0, 0, 0);
    (this.computer as any).velocity = new BABYLON.Vector3(0, 0, 0);

    // In multiplayer, keep paddle colors normal - we'll change goal colors instead
    if (this.useMultiplayer) {
      console.log('Multiplayer paddle setup - Everyone controls LEFT paddle, sees opponent on RIGHT');
      console.log('Goal colors will indicate host (blue) vs client (red)');
    }
  }

  createBall() {
    if (!this.scene) return;
    // Dispose existing ball if it exists to prevent duplicates
    if (this.ball) {
      this.ball.dispose();
    }
    
    this.ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: this.ballDiameter }, this.scene);
    this.ball.position = new BABYLON.Vector3(0, this.computer.position.y + this.ballDiameter / 2, 0);

    // Ball material with dynamic glow
    const ballMaterial = new BABYLON.StandardMaterial("ballMat", this.scene);
    ballMaterial.ambientTexture = new BABYLON.Texture("../assets/img/pokeball2.png", this.scene);

    ballMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
    ballMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    ballMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
    this.ball.material = ballMaterial;

    // Ball stopped initially
    (this.ball as any).velocity = new BABYLON.Vector3(0, 0, 0);

    // In multiplayer, let the server handle ball movement
    // In single player, start ball movement after delay
    if (!this.useMultiplayer) {
      setTimeout(() => {
        (this.ball as any).velocity = new BABYLON.Vector3(
          Math.random() > 0.5 ? this.ballSpeed : -this.ballSpeed,
          0,
          (Math.random() - 0.5) * this.ballSpeed
        );
      }, 800);
    } else {
      console.log('Multiplayer mode: Ball movement will be controlled by server');
    }

    // Ball trail effect
    this.createBallTrail();
  }

  createBallTrail() {
    // Create a trail system for the ball
    this.ballTrail = [];
    this.maxTrailLength = 200;
  }

  createParticleSystem() {
    if (!this.scene) return;
    // Particle system for goal explosions
    this.particleSystem = new BABYLON.ParticleSystem("particles", 2000, this.scene);
    this.particleSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
    this.particleSystem.emitter = new BABYLON.Vector3(0, 0, 0);
    this.particleSystem.minEmitBox = new BABYLON.Vector3(0, 0, 0);
    this.particleSystem.maxEmitBox = new BABYLON.Vector3(0, 0, 0);
    this.particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1.0);
    this.particleSystem.color2 = new BABYLON.Color4(1, 1, 1, 1.0);
    this.particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
    this.particleSystem.minSize = 0.1;
    this.particleSystem.maxSize = 0.5;
    this.particleSystem.minLifeTime = 0.3;
    this.particleSystem.maxLifeTime = 1.5;
    this.particleSystem.emitRate = 1500;
    this.particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    this.particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
    this.particleSystem.direction1 = new BABYLON.Vector3(-2, 2, -2);
    this.particleSystem.direction2 = new BABYLON.Vector3(2, 2, 2);
    this.particleSystem.minAngularSpeed = 0;
    this.particleSystem.maxAngularSpeed = Math.PI;
    // this.particleSystem.minInitialRotation = 0;
    // this.particleSystem.maxInitialRotation = Math.PI;
  }

  createBallFragments(position: BABYLON.Vector3): void {
    if (!this.scene) return;
    // Create multiple small fragments
    const fragmentCount = 5;
    const fragmentSize = 0.2;

    for (let i = 0; i < fragmentCount; i++) {
      const fragment = BABYLON.MeshBuilder.CreateSphere(`ballFragment_${i}`, { diameter: fragmentSize }, this.scene);
      fragment.position = position.clone();

      // Copy ball material properties
      const fragmentMaterial = new BABYLON.StandardMaterial(`fragmentMat_${i}`, this.scene);
      fragmentMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
      fragmentMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);
      fragmentMaterial.alpha = 1;
      fragment.material = fragmentMaterial;

      // Store velocity and other properties on the fragment
      (fragment as any).velocity = new BABYLON.Vector3(
        (Math.random() - 1) * (this.ball as any).velocity.x,
        0,
        (Math.random() - 1) * (this.ball as any).velocity.z
      );
      (fragment as any).angularVelocity = new BABYLON.Vector3(
        (Math.random() - 1) * (this.ball as any).velocity.x,
        0,
        (Math.random() - 1) * (this.ball as any).velocity.z
      );
      (fragment as any).life = 1.0; // Start with full opacity

      this.ballFragments.push(fragment);
    }
  }

  // Add this method to animate fragments:
  updateBallFragments(): void {
    for (let i = this.ballFragments.length - 1; i >= 0; i--) {
      const fragment = this.ballFragments[i];
      const velocity = (fragment as any).velocity;
      const angularVel = (fragment as any).angularVelocity;

      // Update position
      fragment.position.addInPlace(velocity);

      // Apply gravity
      velocity.y -= 0.001;

      // Update rotation
      fragment.rotation.addInPlace(angularVel);

      // Fade out
      (fragment as any).life -= 0.001;
      const material = fragment.material as BABYLON.StandardMaterial;
      material.alpha = (fragment as any).life;
      material.emissiveColor = material.emissiveColor.scale((fragment as any).life);

      // Remove when fully faded
      if ((fragment as any).life <= 0) {
        fragment.dispose();
        this.ballFragments.splice(i, 1);
      }
    }
  }

  vaporizeBall(position: BABYLON.Vector3): void {
    this.isGoalScored = true;
    this.ball.setEnabled(false); // Hide the original ball
    this.createBallFragments(position);
  }

  resetBallDelayed(): void {
    setTimeout(() => {
      this.resetBall();
    }, 2000); // Wait 2 seconds before resetting
  }

  addAtmosphericEffects() {
    if (!this.scene) return;
    // Fog for depth
    this.scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    this.scene.fogColor = new BABYLON.Color3(0, 0, 0.1);
    /*this.scene.fogStart = 50;
    this.scene.fogEnd = 30;*/

    // Subtle camera animation
    if (this.camera && this.camera.position) {
      this.camera.position.y = 15 + Math.sin(Date.now() * 0.001) * 0.7;
    }
  }

  setupEventListeners() {
    window.addEventListener("keydown", (e) => {
      this.keysPressed[e.keyCode] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keysPressed[e.keyCode] = false;
    });

    window.addEventListener("resize", () => {
      if (this.engine) this.engine.resize();
    });
  }



  setupScoreColors() {
    const playerScoreEl = document.getElementById('player-score');
    const computerScoreEl = document.getElementById('computer-score');
    
    if (playerScoreEl && computerScoreEl) {
      if (this.isHost) {
        // Host: Left score (yours) = blue, Right score (opponent's) = red
        playerScoreEl.style.color = '#7DF9FF';  // Blue
        computerScoreEl.style.color = '#FF073A'; // Red
        console.log('HOST: Score colors set - Left: BLUE (yours), Right: RED (opponent)');
      } else {
        // Non-host: Left score (yours) = red, Right score (opponent's) = blue
        playerScoreEl.style.color = '#FF073A';  // Red
        computerScoreEl.style.color = '#7DF9FF'; // Blue
        console.log('CLIENT: Score colors set - Left: RED (yours), Right: BLUE (opponent)');
      }
    }
  }

  reset() {
    // Reset positions
    this.player.position.z = 0;
    this.computer.position.z = 0;
    this.ball.position = new BABYLON.Vector3(0, this.computer.position.y + this.ballDiameter / 2, 0);

    // Ball stopped
    (this.ball as any).velocity = new BABYLON.Vector3(0, 0, 0);

    setTimeout(() => {
      (this.ball as any).velocity = new BABYLON.Vector3(
        Math.random() > 0.5 ? this.ballSpeed : -this.ballSpeed,
        0,
        (Math.random() - 0.5) * this.ballSpeed
      );
    }, 800);

    // Reset paddle sizes
    this.playerWidth *= this.diffMultiplier;
    this.computerWidth *= this.diffMultiplierIA;
    this.player.scaling.z = this.diffMultiplier;
    this.computer.scaling.z = this.diffMultiplierIA;

    // Reset visual effects
    this.ballLastHitBy = null;
    this.ballGlowIntensity = 0;
  }

  update() {
    if (!this.isRunning) return;
    this.updatePlayer();
    this.updateComputer();
    if (!this.isGoalScored) { // Only update ball if no goal was scored
      this.updateBall();
    }
    this.updateBallFragments();
    this.updateVisualEffects();
    this.updateUI();
  }

  updatePlayer() {
    const speed = 0.2 * this.speedMultiplier;
    this.isPlayerMoving = "NO";
    
    // In multiplayer, always control the left paddle (player) regardless of host/client
    // The server will map this correctly
    let controlledPaddle = this.player;
    let paddleWidth = this.playerWidth;

    if (this.keysPressed[38] || this.keysPressed[37]) { // Down/Right arrows
      this.isPlayerMoving = "DOWN";
      (controlledPaddle as any).velocity.z = speed;
      if (controlledPaddle.position.z + (paddleWidth / 2) >= this.topWallZ - 1) {
        (controlledPaddle as any).velocity.z = 0;
        this.isPlayerMoving = "NO";
      }
    } else if (this.keysPressed[40] || this.keysPressed[39]) { // Up/Left arrows
      this.isPlayerMoving = "UP";
      (controlledPaddle as any).velocity.z = -speed;
      if (controlledPaddle.position.z - (paddleWidth / 2) <= this.bottomWallZ + 1) {
        (controlledPaddle as any).velocity.z = 0;
        this.isPlayerMoving = "NO";
      }
    } else {
      (controlledPaddle as any).velocity.z = 0;
    }

    // Only update position if not in multiplayer mode
    if (!this.useMultiplayer) {
      controlledPaddle.position.z += (controlledPaddle as any).velocity.z;
    } else {
      // In multiplayer, always update position locally for responsive controls
      // Server updates will override this for the opponent paddle only
      controlledPaddle.position.z += (controlledPaddle as any).velocity.z;
    }

    // Send player updates to server (compatible with your backend protocol)
    // Send when actively moving only to reduce conflicts
    if (this.useMultiplayer && this.isConnected && this.socket) {
      // Only send updates when actually moving to prevent paddle conflicts
      const shouldSendUpdate = (controlledPaddle as any).velocity.z !== 0;
      
      if (shouldSendUpdate) {
        console.log('📤 Sending paddle update:', controlledPaddle.position.z.toFixed(3), 'velocity:', (controlledPaddle as any).velocity.z.toFixed(3));
        this.socket.send(JSON.stringify({
          type: 'player_update',
          paddleY: controlledPaddle.position.z, // Send current paddle position
          ballX: this.ball.position.x,          // Include ball position for server-side collision detection
          ballY: this.ball.position.z           // Your server expects ballY, we use ballZ
        }));
      }
    }
  }


  updateComputer() {
    // In multiplayer, computer paddle is controlled by the other player
    if (this.useMultiplayer) {
      // Computer paddle position is updated via network messages
      // No local AI logic needed
      return;
    }

    // Single player AI logic
    const speed = 0.1 * this.speedMultiplierIA;
    const ballZ = this.ball.position.z;
    const paddleZ = this.computer.position.z;
    const paddleHeight = 3 * this.diffMultiplierIA;

    // AI: Follow ball when it's moving towards computer
    if ((this.ball as any).velocity.x > 0) {
      if (ballZ < paddleZ - paddleHeight / 2) {
        (this.computer as any).velocity.z = -speed;
        if (this.computer.position.z - (this.computerWidth / 2) <= this.bottomWallZ + 1) {
          (this.computer as any).velocity.z = 0;
        }
      } else if (ballZ > paddleZ + paddleHeight / 2) {
        (this.computer as any).velocity.z = speed;
        if (this.computer.position.z + (this.computerWidth / 2) >= this.topWallZ - 1) {
          (this.computer as any).velocity.z = 0;
        }
      } else {
        (this.computer as any).velocity.z = 0;
      }
    } else {
      (this.computer as any).velocity.z = 0;
    }

    this.computer.position.z += (this.computer as any).velocity.z;
  }

  updateBall() {
    // In multiplayer, NEVER handle ball physics on client - server is 100% authoritative
    if (this.useMultiplayer) {
      // Only handle visual effects like rotation, no position updates
      if (!this.isGoalScored && this.ball.isEnabled()) {
        const rotationSpeed = 0.1;
        this.ball.rotation.y += rotationSpeed;
      }
      return;
    }

    // Single player ball physics
    // Wall bouncing (top and bottom)
    if (this.ball.position.z <= this.arenaSize[1] / -2 + 1 ||
      this.ball.position.z >= this.arenaSize[1] / 2 - 1) {
      (this.ball as any).velocity.z *= -1;
    }

    // Paddle collision detection
    this.checkPaddleCollisions();

    // Goal detection
    this.checkGoals();

    // Update ball position
    this.ball.position.x += (this.ball as any).velocity.x;
    this.ball.position.z += (this.ball as any).velocity.z;

    const rotationSpeed = 0.1;
    this.ball.rotation.x += (this.ball as any).velocity.z * rotationSpeed;
    this.ball.rotation.y += rotationSpeed;
    this.ball.rotation.z -= (this.ball as any).velocity.x * rotationSpeed;
  }

  checkPaddleCollisions() {
    const ballPos = this.ball.position;
    const playerPos = this.player.position;
    const computerPos = this.computer.position;
    const paddleHeight = 3 * this.diffMultiplier;
    const paddleHeightIA = 3 * this.diffMultiplierIA;

    // Player paddle collision
    if (ballPos.x <= playerPos.x + 1 && ballPos.x >= playerPos.x - 1) {
      if (ballPos.z >= playerPos.z - paddleHeight && ballPos.z <= playerPos.z + paddleHeight) {
        console.log("player collision");
        (this.ball as any).velocity.x = Math.abs((this.ball as any).velocity.x);

        if (this.isPlayerMoving != "NO") {
          (this.ball as any).velocity.x += 0.1;
          (this.ball as any).velocity.z += this.isPlayerMoving == "UP" ? -0.15 : 0.15;
        } else {
          if ((this.ball as any).velocity.x >= this.ballSpeed)
            (this.ball as any).velocity.x = Math.abs((this.ball as any).velocity.x - 0.1);
        }

        console.log("current ball speed (x): " + (this.ball as any).velocity.x);
        console.log("current ball speed (z): " + (this.ball as any).velocity.z);
        this.ballLastHitBy = 'player';
        this.ballGlowIntensity = 1;
        this.triggerPaddleHitEffect(playerPos, 'player');
      }
    }

    // Computer paddle collision
    if (ballPos.x >= computerPos.x - 1 && ballPos.x <= computerPos.x + 1) {
      if (ballPos.z >= computerPos.z - paddleHeightIA && ballPos.z <= computerPos.z + paddleHeightIA) {
        console.log("computer collision");
        (this.ball as any).velocity.x = -Math.abs((this.ball as any).velocity.x);
        this.ballLastHitBy = 'computer';
        this.ballGlowIntensity = 1;
        this.triggerPaddleHitEffect(computerPos, 'computer');
      }
    }
  }

  checkGoals() {
    const ballPos = this.ball.position;

    // Only handle goals in single player mode
    if (this.useMultiplayer) {
      // Goals and scoring are handled by the server
      return;
    }

    // Single player goal detection
    // Player scores (ball goes past computer goal)
    if (ballPos.x >= this.computerGoal.position.x) {
      this.playerScore++;
      console.log("player scored " + this.playerScore);
      this.triggerPlayerScorePulse();
      this.createGoalExplosion(ballPos, 'player');
      this.vaporizeBall(ballPos);
      this.resetBallDelayed();
      
      // Check for game end (first to 5 points wins)
      if (this.playerScore >= 5) {
        setTimeout(() => {
          this.gameState = true;
          this.isRunning = false;
          this.createGameEndOverlay();
        }, 200);
        return;
      }
    }

    // Computer scores (ball goes past player goal)
    if (ballPos.x <= this.playerGoal.position.x) {
      this.computerScore++;
      console.log("computer scored " + this.computerScore);
      this.triggerComputerScorePulse();
      this.createGoalExplosion(ballPos, 'computer');
      this.vaporizeBall(ballPos);
      this.resetBallDelayed();
      
      // Check for game end (first to 5 points wins)
      if (this.computerScore >= 5) {
        setTimeout(() => {
          this.gameState = false;
          this.isRunning = false;
          this.createGameEndOverlay();
        }, 2000);
        return;
      }
    }
  }

  resetBall() {
    // Clean up any remaining fragments
    this.ballFragments.forEach(fragment => fragment.dispose());
    this.ballFragments = [];

    this.ball.setEnabled(true); // Show the ball again
    this.isGoalScored = false;

    if (this.ball.position.x > 0) {
      this.ball.position = new BABYLON.Vector3(this.computer.position.x - 2, this.computer.position.y + this.ballDiameter / 2, this.computer.position.z);
      (this.ball as any).velocity = new BABYLON.Vector3(-this.ballSpeed, 0, (Math.random()) * this.ballSpeed);
    } else {
      this.ball.position = new BABYLON.Vector3(this.player.position.x + 2, this.computer.position.y + this.ballDiameter / 2, this.player.position.z);
      (this.ball as any).velocity = new BABYLON.Vector3(this.ballSpeed, 0, (Math.random()) * this.ballSpeed);
    }

    this.ballLastHitBy = null;
    this.ballGlowIntensity = 0;
  }

  updateBallTrail() {
    // Add current position to trail
    this.ballTrail.push(this.ball.position.clone());

    // Limit trail length
    if (this.ballTrail.length > this.maxTrailLength) {
      this.ballTrail.shift();
    }
  }

  updateVisualEffects() {
    // Update ball glow based on last hit
    if (this.ballGlowIntensity > 0) {
      const ballMat = this.ball.material as BABYLON.StandardMaterial;
      if (this.ballLastHitBy === 'player') {
        ballMat.emissiveColor = new BABYLON.Color3(0.49 * this.ballGlowIntensity, 0.976 * this.ballGlowIntensity, 2 * this.ballGlowIntensity);
      } else if (this.ballLastHitBy === 'computer') {
        ballMat.emissiveColor = new BABYLON.Color3(2 * this.ballGlowIntensity, 0.027 * this.ballGlowIntensity, 0.227 * this.ballGlowIntensity);
      }

      this.ballGlowIntensity -= 0.02;
      if (this.ballGlowIntensity <= 0) {
        this.ballGlowIntensity = 0;
        ballMat.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
      }
    }

    // Update score pulsation
    if (this.playerScorePulse > 0) {
      this.playerLight.intensity = 0.8 + this.playerScorePulse;
      this.playerScorePulse -= this.pulseDecayRate;
      if (this.playerScorePulse <= 0) {
        this.playerScorePulse = 0;
        this.playerLight.intensity = 0.8;
      }
    }

    if (this.computerScorePulse > 0) {
      this.computerLight.intensity = 0.8 + this.computerScorePulse;
      this.computerScorePulse -= this.pulseDecayRate;
      if (this.computerScorePulse <= 0) {
        this.computerScorePulse = 0;
        this.computerLight.intensity = 0.8;
      }
    }
  }

  triggerPlayerScorePulse() {
    this.playerScorePulse = this.maxPulseIntensity;
    const playerScoreEl = document.getElementById('player-score');
    if (playerScoreEl) {
      playerScoreEl.style.textShadow = '0 0 30px #7DF9FF';
      setTimeout(() => {
        playerScoreEl.style.textShadow = '0 0 20px currentColor';
      }, 1000);
    }
  }

  triggerComputerScorePulse() {
    this.computerScorePulse = this.maxPulseIntensity;
    const computerScoreEl = document.getElementById('computer-score');
    if (computerScoreEl) {
      computerScoreEl.style.textShadow = '0 0 30px #FF073A';
      setTimeout(() => {
        computerScoreEl.style.textShadow = '0 0 20px currentColor';
      }, 1000);
    }
  }

  triggerPaddleHitEffect(position: BABYLON.Vector3, player: string) {
    // Create small particle burst at paddle hit
    const color = player === 'player' ? new BABYLON.Color4(0.49, 0.976, 1, 1) : new BABYLON.Color4(1, 0.027, 0.227, 1);
    this.particleSystem.color1 = color;
    this.particleSystem.color2 = color;
    this.particleSystem.emitter = position.clone();
    this.particleSystem.start();
    setTimeout(() => {
      this.particleSystem.stop();
    }, 1000);
  }

  createGoalExplosion(position: BABYLON.Vector3, scorer: string) {
    // Create dramatic explosion effect
    const color = scorer === 'player' ? new BABYLON.Color4(0.49, 0.976, 1, 1) : new BABYLON.Color4(1, 0.027, 0.227, 1);
    this.particleSystem.color1 = color;
    this.particleSystem.color2 = color;
    this.particleSystem.emitter = position.clone();
    this.particleSystem.emitRate = 3000;
    this.particleSystem.start();

    setTimeout(() => {
      this.particleSystem.stop();
      this.particleSystem.emitRate = 200;
    }, 1000);
  }

  updateUI() {
    const playerScoreEl = document.getElementById('player-score');
    const computerScoreEl = document.getElementById('computer-score');
    
    // playerScore = your score (always displayed on left)
    // computerScore = opponent score (always displayed on right)
    // Server already sends the correct mapping based on your player role
    if (playerScoreEl) playerScoreEl.textContent = this.playerScore.toString();
    if (computerScoreEl) computerScoreEl.textContent = this.computerScore.toString();
  }

  showCountdown(count: number) {
    // Create or update countdown display
    let countdownEl = document.getElementById('countdown-display');
    if (!countdownEl) {
      countdownEl = document.createElement('div');
      countdownEl.id = 'countdown-display';
      countdownEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 4rem;
        color: #7DF9FF;
        text-shadow: 0 0 20px #7DF9FF;
        z-index: 1000;
        font-family: 'Orbitron', monospace;
        font-weight: bold;
        text-align: center;
      `;
      document.body.appendChild(countdownEl);
    }
    
    if (count > 0) {
      countdownEl.textContent = count.toString();
      countdownEl.style.display = 'block';
    } else {
      countdownEl.textContent = 'GO!';
      countdownEl.style.color = '#FF073A';
      countdownEl.style.textShadow = '0 0 20px #FF073A';
      setTimeout(() => {
        this.hideCountdown();
      }, 1000);
    }
  }

  hideCountdown() {
    const countdownEl = document.getElementById('countdown-display');
    if (countdownEl) {
      countdownEl.style.display = 'none';
    }
  }

  showWaitingMessage(message: string) {
    let waitingEl = document.getElementById('waiting-display');
    if (!waitingEl) {
      waitingEl = document.createElement('div');
      waitingEl.id = 'waiting-display';
      waitingEl.style.cssText = `
        position: fixed;
        top: 40%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 1.5rem;
        color: #7DF9FF;
        text-shadow: 0 0 10px #7DF9FF;
        z-index: 999;
        font-family: 'Orbitron', monospace;
        font-weight: bold;
        text-align: center;
        background: rgba(0, 0, 0, 0.7);
        padding: 20px;
        border-radius: 10px;
        border: 2px solid #7DF9FF;
      `;
      document.body.appendChild(waitingEl);
    }
    
    waitingEl.textContent = message;
    waitingEl.style.display = 'block';
  }

  hideWaitingMessage() {
    const waitingEl = document.getElementById('waiting-display');
    if (waitingEl) {
      waitingEl.style.display = 'none';
    }
  }

  startRenderLoop() {
    console.log("Game started!")
    this.engine.runRenderLoop(() => {
      if (!this.isRunning) return;
      this.update();
      if (this.scene) {
        this.scene.render();
      }
    });
  }

  // Overlay for game end
  createGameEndOverlay() {
    // Remove existing overlay if it exists
    if (this.gameEndOverlay) {
      document.body.removeChild(this.gameEndOverlay);
    }

    this.gameEndOverlay = document.createElement('div');
    this.gameEndOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      font-family: Arial, sans-serif;
      color: white;
      text-align: center;
      backdrop-filter: blur(10px);
    `;

    const isVictory = this.gameState;
    const title = document.createElement('h1');
    let titleColor, titleShadow;
    if (this.useMultiplayer && !this.isHost) {
      // Non-host: VICTORY is red, DEFEAT is blue
      titleColor = isVictory ? '#FF073A' : '#7DF9FF';
      titleShadow = isVictory ? '#FF073A' : '#7DF9FF';
    } else {
      // Host and single player: VICTORY is blue, DEFEAT is red
      titleColor = isVictory ? '#7DF9FF' : '#FF073A';
      titleShadow = isVictory ? '#7DF9FF' : '#FF073A';
    }
    title.textContent = isVictory ? 'VICTORY!' : 'DEFEAT!';
    title.style.cssText = `
      font-size: 4rem;
      margin: 0 0 20px 0;
      text-shadow: 0 0 20px ${titleShadow};
      color: ${titleColor};
      animation: pulse 2s infinite;
    `;

    // Always use final scores from game_end message if available
    const playerScore = typeof this.finalPlayerScore === 'number' ? this.finalPlayerScore : this.playerScore;
    const opponentScore = typeof this.finalOpponentScore === 'number' ? this.finalOpponentScore : this.computerScore;
    let playerLabel = 'Player';
    let opponentLabel = 'Computer';
    let playerColor = '#7DF9FF';
    let opponentColor = '#FF073A';
    // Multiplayer: use 'You' and 'Opponent' labels and update colors by side
    if (this.useMultiplayer) {
      playerLabel = 'You';
      opponentLabel = 'Opponent';
      if (this.isHost) {
        playerColor = '#7DF9FF'; // Blue
        opponentColor = '#FF073A'; // Red
      } else {
        playerColor = '#FF073A'; // Red
        opponentColor = '#7DF9FF'; // Blue
      }
    }
    const scoreDisplay = document.createElement('div');
    scoreDisplay.innerHTML = `
      <p style="font-size: 2rem; margin: 20px 0;">Final Score</p>
      <p style="font-size: 1.5rem; margin: 10px 0;">
        ${playerLabel}: <span style="color: ${playerColor};">${playerScore}</span> - 
        ${opponentLabel}: <span style="color: ${opponentColor};">${opponentScore}</span>
      </p>
    `;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 20px;
      margin-top: 40px;
    `;

    const mainMenuButton = document.createElement('button');
    mainMenuButton.textContent = 'Main Menu';
    if (this.useMultiplayer) {
      if (this.isHost) {
        // Host: always blue button
        mainMenuButton.style.cssText = `
          padding: 15px 30px;
          font-size: 1.2rem;
          background: linear-gradient(45deg, #7DF9FF, #1E90FF);
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(125, 249, 255, 0.3);
        `;
        mainMenuButton.onmouseover = () => {
          mainMenuButton.style.transform = 'scale(1.05)';
          mainMenuButton.style.boxShadow = '0 6px 20px rgba(125, 249, 255, 0.5)';
        };
        mainMenuButton.onmouseout = () => {
          mainMenuButton.style.transform = 'scale(1)';
          mainMenuButton.style.boxShadow = '0 4px 15px rgba(125, 249, 255, 0.3)';
        };
      } else {
        // Non-host: always red button
        mainMenuButton.style.cssText = `
          padding: 15px 30px;
          font-size: 1.2rem;
          background: linear-gradient(45deg, #FF073A, #DC143C);
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255, 7, 58, 0.3);
        `;
        mainMenuButton.onmouseover = () => {
          mainMenuButton.style.transform = 'scale(1.05)';
          mainMenuButton.style.boxShadow = '0 6px 20px rgba(255, 7, 58, 0.5)';
        };
        mainMenuButton.onmouseout = () => {
          mainMenuButton.style.transform = 'scale(1)';
          mainMenuButton.style.boxShadow = '0 4px 15px rgba(255, 7, 58, 0.3)';
        };
      }
    } else {
      // Single player: keep victory/defeat color logic
      if (isVictory) {
        mainMenuButton.style.cssText = `
          padding: 15px 30px;
          font-size: 1.2rem;
          background: linear-gradient(45deg, #7DF9FF, #1E90FF);
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(125, 249, 255, 0.3);
        `;
        mainMenuButton.onmouseover = () => {
          mainMenuButton.style.transform = 'scale(1.05)';
          mainMenuButton.style.boxShadow = '0 6px 20px rgba(125, 249, 255, 0.5)';
        };
        mainMenuButton.onmouseout = () => {
          mainMenuButton.style.transform = 'scale(1)';
          mainMenuButton.style.boxShadow = '0 4px 15px rgba(125, 249, 255, 0.3)';
        };
      } else {
        mainMenuButton.style.cssText = `
          padding: 15px 30px;
          font-size: 1.2rem;
          background: linear-gradient(45deg, #FF073A, #DC143C);
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255, 7, 58, 0.3);
        `;
        mainMenuButton.onmouseover = () => {
          mainMenuButton.style.transform = 'scale(1.05)';
          mainMenuButton.style.boxShadow = '0 6px 20px rgba(255, 7, 58, 0.5)';
        };
        mainMenuButton.onmouseout = () => {
          mainMenuButton.style.transform = 'scale(1)';
          mainMenuButton.style.boxShadow = '0 4px 15px rgba(255, 7, 58, 0.3)';
        };
      }
    }
  mainMenuButton.onclick = () => window.location.reload();

    buttonContainer.appendChild(mainMenuButton);

    this.gameEndOverlay.appendChild(title);
    this.gameEndOverlay.appendChild(scoreDisplay);
    this.gameEndOverlay.appendChild(buttonContainer);

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(this.gameEndOverlay);
  }

  // returnToMainMenu() {
  //   // Stop the game loop and dispose Babylon engine/scene
  //   if (this.engine) {
  //     this.engine.stopRenderLoop();
  //     if (this.scene) {
  //       this.scene.dispose();
  //       this.scene = null;
  //     }
  //     this.engine.dispose();
  //     // Do not set this.engine to null, keep it as BABYLON.Engine type
  //   }
  //   this.isRunning = false;

  //   // Remove overlays and UI elements
  //   if (this.gameEndOverlay) {
  //     document.body.removeChild(this.gameEndOverlay);
  //     this.gameEndOverlay = null;
  //   }
  //   const countdownEl = document.getElementById('countdown-display');
  //   if (countdownEl && countdownEl.parentNode) {
  //     countdownEl.parentNode.removeChild(countdownEl);
  //   }
  //   const waitingEl = document.getElementById('waiting-display');
  //   if (waitingEl && waitingEl.parentNode) {
  //     waitingEl.parentNode.removeChild(waitingEl);
  //   }
  //   // Optionally reset scores/UI
  //   const playerScoreEl = document.getElementById('player-score');
  //   if (playerScoreEl) playerScoreEl.textContent = '0';
  //   const computerScoreEl = document.getElementById('computer-score');
  //   if (computerScoreEl) computerScoreEl.textContent = '0';

  //   // Reset game state variables
  //   this.playerScore = 0;
  //   this.computerScore = 0;
  //   this.gameState = null;

  //   // Reset global reference if used
  //   if (typeof currentGame3D !== 'undefined') {
  //     currentGame3D = null;
  //   }

  //   // Log cleanup
  //   console.log('Game cleaned up, ready for new game.');

  //   // Navigate to dashboard/main menu
  //   router.navigate('/dashboard');
  // }
}

export let currentGame3D: Game3D | null = null;
// FIXED: Updated startGame3D function
export async function startGame3D(gameId: string = '', isHost: boolean = false, useMultiplayer: boolean = false) {
  console.log('3D Game selected');
  const game = new Game3D();

  currentGame3D = game;

/*  // Connect with proper multiplayer flag
  game.connectToGame(gameId, isHost, useMultiplayer).then(() => {
    console.log("Initializing...");
    game.init();
  });*/

  try {
    const success = await game.connectToGame(gameId, isHost, useMultiplayer);
    if (success) {
      console.log("Successfully connected to game!");
      console.log("Initializing...");
      game.init();
    }
  } catch (error: any) {
    console.error("Failed to connect to game:", error.message);
    // Show user-friendly error message and redirect to dashboard
    if (error.message === "Game not found") {
      alert("The game you're trying to join doesn't exist. Please check the Game ID.");
    } else if (error.message === "Connection timeout") {
      alert("Connection timed out. Please check your internet connection and try again.");
    } else {
      alert("Failed to connect to game. Please try again.");
    }
    
    // Redirect to dashboard/profile page on connection failure
    setTimeout(() => {
        router.navigate('/profile'); // Adjust the route as needed
    }, 1000);
  }
}

/*export function startGame3D() {
  console.log('3D Game selected');
  const game = new Game3D();
  let gameId;
  let isHost: boolean = true;

  document.getElementById("get")?.addEventListener("click", () => {
    gameId = document.getElementById("gameId")?.textContent;
  });

  if (!isHost && gameId) {
    game.connectToGame(gameId, isHost);
  }
  else
    game.connectToGame("", isHost);
  console.log("Initializing...");
  game.init();
}*/


/*export function startGame3D(gameId: string = '', isHost: boolean = false, useMultiplayer: boolean = false) {
  console.log('3D Game selected');
  const game = new Game3D();

  // Connect to game with the provided parameters
  if (useMultiplayer && (gameId || isHost)) {
    console.log('Starting multiplayer 3D game.');
    game.connectToGame(gameId, isHost);
  } else {
    console.log('Starting single player 3D game.');
    game.connectToGame("", isHost);
    // Don't connect to WebSocket for single player
  }

  console.log("Initializing...");
  game.init();
}*/
