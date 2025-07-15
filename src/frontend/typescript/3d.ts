class Game3D {
  // Connections
  private socket: WebSocket | null = null;
  private isHost: boolean = false;
  private gameId: string = '';
  private isConnected: boolean = false;

  // Canvas and engine
  private canvas: HTMLCanvasElement;
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private camera: BABYLON.FreeCamera;

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
  private diffMultiplier: number = 1;
  private speedMultiplier: number = 1.4;
  private ballSpeed: number = 0.3;
  private ballDiameter: number = 1;
  private isPlayerMoving : "UP" | "DOWN" | "NO" = "NO";
  private playerWidth: number = 6;
  private computerWidth: number = 6;

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

  constructor() {
    const canvasEl = document.getElementById("renderCanvas");
    if (!(canvasEl instanceof HTMLCanvasElement)) {
      throw new Error("renderCanvas element not found or is not a canvas");
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
  async connectToGame(gameId: string, isHost: boolean) {
    this.isHost = isHost;
    let type: string = "create";

    if(isHost && !this.gameId)
    {
      console.log("Generating game ID...");
      this.gameId = this.generateUniqueGameId();
    }
    else if (!isHost && gameId)
    {
      console.log("Connecting to existing game...");
      this.gameId = gameId;
      type = "join";
    }
    else
      console.log("Error: Connection unsuccessful!");

    this.socket = new WebSocket(`ws://localhost:3000/game/${gameId}`);
    console.log("Socket active at " + gameId);

    this.socket.onopen = () => {
      console.log("Socket Open");
      this.isConnected = true;
      this.socket?.send(JSON.stringify({
        type: type,
        isHost: this.isHost,
        gameId: this.gameId
      }));
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleNetworkMessage(data);
    };
  }

  handleNetworkMessage(data: any) {
    switch(data.type) {
      case 'player-move':
        if (!this.isHost) {
          this.computer.position.z = data.position;
        } else {
          this.player.position.z = data.position;
        }
        break;
      case 'ball-update':
        if (!this.isHost) {
          this.ball.position.copyFrom(data.position);
          (this.ball as any).velocity.copyFrom(data.velocity);
        }
        break;
      case 'score-update':
        this.playerScore = data.playerScore;
        this.computerScore = data.computerScore;
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
    this.setupDifficultyButtons();
    console.log("Rendering...");
    this.startRenderLoop();
    console.log("Done!");
  }

  async createScene() {
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    // Camera with cinematic angle
    this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(-45, 0, 0), this.scene);
    this.camera.setTarget(new BABYLON.Vector3(0, 0, 0));
    this.camera.rotation.x = 0.3; // Slight downward angle

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
    // Arena floor
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: this.arenaSize[0], height: this.arenaSize[1]}, this.scene);
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", this.scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.1);
    groundMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.4);
    groundMaterial.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.05);
    ground.material = groundMaterial;

    // Arena walls with glow
    this.createWalls();

    // Center line
    const centerLine = BABYLON.MeshBuilder.CreateBox("centerLine", {width: 0.2, height: 0.5, depth: this.arenaSize[0] / 2}, this.scene);
    const centerMaterial = new BABYLON.StandardMaterial("centerMat", this.scene);
    centerMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    centerMaterial.disableLighting = true;
    centerLine.material = centerMaterial;

    // Goal areas
    this.createGoalAreas();
  }

  createWalls() {
    // Top and bottom walls
    const wallHeight = 2;
    const wallMaterial = new BABYLON.StandardMaterial("wallMat", this.scene);
    wallMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
    wallMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.6);

    const topWall = BABYLON.MeshBuilder.CreateBox("topWall", {width: this.arenaSize[0], height: wallHeight, depth:1}, this.scene);
    topWall.position.z = this.arenaSize[1] / 2;
    topWall.position.y = wallHeight / 2;
    topWall.material = wallMaterial;
    this.topWallZ = topWall.position.z;

    const bottomWall = BABYLON.MeshBuilder.CreateBox("bottomWall", {width: this.arenaSize[0], height: wallHeight, depth: 1}, this.scene);
    bottomWall.position.z = this.arenaSize[1] / -2;
    bottomWall.position.y = wallHeight / 2;
    bottomWall.material = wallMaterial;
    this.bottomWallZ = bottomWall.position.z;
  }

  createGoalAreas() {
    // Player goal (left side)
    const playerGoal = BABYLON.MeshBuilder.CreateBox("playerGoal", {width: 0.3, height: 0.5 , depth: this.arenaSize[1] - 1}, this.scene);
    playerGoal.position.x = (this.arenaSize[0] / -2) + 0.5;
    playerGoal.position.y = 0.1;
    const playerGoalMat = new BABYLON.StandardMaterial("playerGoalMat", this.scene);
    playerGoalMat.emissiveColor = new BABYLON.Color3(0.49, 0.976, 1);
    playerGoalMat.disableLighting = true;
    playerGoal.material = playerGoalMat;

    // Computer goal (right side)
    const computerGoal = BABYLON.MeshBuilder.CreateBox("computerGoal", {width: 0.3, height: 0.5, depth: this.arenaSize[1] + 1}, this.scene);
    computerGoal.position.x = (this.arenaSize[0] / 2) + 0.5;
    computerGoal.position.y = 0.1;
    const computerGoalMat = new BABYLON.StandardMaterial("computerGoalMat", this.scene);
    computerGoalMat.emissiveColor = new BABYLON.Color3(1, 0.027, 0.227);
    computerGoalMat.disableLighting = true;
    computerGoal.material = computerGoalMat;

    this.playerGoal = playerGoal;
    this.computerGoal = computerGoal;
  }

  createPaddles() {
    // Player paddle (left side)
    this.playerWidth = 6 * this.diffMultiplier;
    this.player = BABYLON.MeshBuilder.CreateBox("player", {width: 1, height: 1, depth: this.playerWidth}, this.scene);
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
    this.computerWidth = 6 * this.diffMultiplier;
    this.computer = BABYLON.MeshBuilder.CreateBox("computer", {width: 1, height: 1, depth: this.computerWidth}, this.scene);
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
  }

  createBall() {
    this.ball = BABYLON.MeshBuilder.CreateSphere("ball", {diameter: this.ballDiameter}, this.scene);
    this.ball.position = new BABYLON.Vector3(0, this.computer.position.y + this.ballDiameter / 2, 0);

    // Ball material with dynamic glow
    const ballMaterial = new BABYLON.StandardMaterial("ballMat", this.scene);
    ballMaterial.ambientTexture = new BABYLON.Texture("../textures/pokeball2.png", this.scene);

    ballMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
    ballMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    ballMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
    this.ball.material = ballMaterial;

    // Ball stopped
    (this.ball as any).velocity = new BABYLON.Vector3(0, 0, 0);

    setTimeout(() => {
      (this.ball as any).velocity = new BABYLON.Vector3(
        Math.random() > 0.5 ? this.ballSpeed : -this.ballSpeed,
        0,
        (Math.random() - 0.5) * this.ballSpeed
      );
    }, 800);

    // Ball trail effect
    this.createBallTrail();
  }

  createBallTrail() {
    // Create a trail system for the ball
    this.ballTrail = [];
    this.maxTrailLength = 200;
  }

  createParticleSystem() {
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
  }

  createBallFragments(position: BABYLON.Vector3): void {
    // Create multiple small fragments
    const fragmentCount = 5;
    const fragmentSize = 0.2;

    for (let i = 0; i < fragmentCount; i++) {
      const fragment = BABYLON.MeshBuilder.CreateSphere(`ballFragment_${i}`, {diameter: fragmentSize}, this.scene);
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
    // Fog for depth
    this.scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    this.scene.fogColor = new BABYLON.Color3(0, 0, 0.1);
    /*this.scene.fogStart = 50;
    this.scene.fogEnd = 30;*/

    // Subtle camera animation
    this.scene.registerBeforeRender(() => {
      this.camera.position.y = 15 + Math.sin(Date.now() * 0.001) * 0.7;
    });
  }

  setupEventListeners() {
    window.addEventListener("keydown", (e) => {
      this.keysPressed[e.keyCode] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keysPressed[e.keyCode] = false;
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  setupDifficultyButtons() {
    document.getElementById("b_easy")?.addEventListener("click", () => {
      this.diffMultiplier = 2;
      this.speedMultiplier = 1.3;
      this.ballSpeed = 0.25;
      this.reset();
    });

    document.getElementById("b_medium")?.addEventListener("click", () => {
      this.diffMultiplier = 1;
      this.speedMultiplier = 1.4;
      this.ballSpeed = 0.3;
      this.reset();
    });

    document.getElementById("b_hard")?.addEventListener("click", () => {
      this.diffMultiplier = 0.5;
      this.speedMultiplier = 1.5;
      this.ballSpeed = 0.35;
      this.reset();
    });
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
    this.computerWidth *= this.diffMultiplier;
    this.player.scaling.z = this.diffMultiplier;
    this.computer.scaling.z = this.diffMultiplier;

    // Reset visual effects
    this.ballLastHitBy = null;
    this.ballGlowIntensity = 0;
  }

  update() {
    this.updatePlayer();
    this.updateComputer();
    if (!this.isGoalScored) { // Only update ball if no goal was scored
      this.updateBall();
    }
    this.updateBallFragments(); // Add this line
    this.updateVisualEffects();
    this.updateUI();
  }

  updatePlayer() {
    const speed = 0.2 * this.speedMultiplier;
    this.isPlayerMoving = "NO";

    if (this.keysPressed[38] || this.keysPressed[37]) // Down/Right arrows
    {
      this.isPlayerMoving = "DOWN";
      (this.player as any).velocity.z = speed;
      if (this.player.position.z + (this.playerWidth / 2) >= this.topWallZ - 1)
      {
        (this.player as any).velocity.z = 0;
        this.isPlayerMoving = "NO";
      }
    }
    else if (this.keysPressed[40] || this.keysPressed[39]) // Up/Left arrows
    {
      this.isPlayerMoving = "UP";
      (this.player as any).velocity.z = -speed;
      if (this.player.position.z - (this.playerWidth / 2) <= this.bottomWallZ + 1)
      {
        (this.player as any).velocity.z = 0;
        this.isPlayerMoving = "NO";
      }
    } else
    {
      (this.player as any).velocity.z = 0;
    }
    console.log("player moving: " + this.isPlayerMoving);
    this.player.position.z += (this.player as any).velocity.z;

    if (this.isConnected && this.socket) {
      this.socket.send(JSON.stringify({
        type: 'player-move',
        position: this.player.position.z
      }));
    }
  }

  updateComputer() {
    if (this.isConnected && this.socket) {
      // Only the host controls the "computer" (which is now player 2)
      if (!this.isHost) {
        const speed = 0.2 * this.speedMultiplier;

        // Use same controls as player but different keys (WASD)
        if (this.keysPressed[87]) { // W key
          this.computer.position.z += speed;
        }
        if (this.keysPressed[83]) { // S key
          this.computer.position.z -= speed;
        }

        // Send position update
        if (this.isConnected && this.socket) {
          this.socket.send(JSON.stringify({
            type: 'player-move',
            position: this.computer.position.z
          }));
        }
      }
    }
    else { // If there's no socket active, it's against AI
      const speed = 0.1 * this.speedMultiplier;
      const ballZ = this.ball.position.z;
      const paddleZ = this.computer.position.z;
      const paddleHeight = 3 * this.diffMultiplier;

      // AI: Follow ball when it's moving towards computer
      if ((this.ball as any).velocity.x > 0) {
        if (ballZ < paddleZ - paddleHeight/2)
        {
          (this.computer as any).velocity.z = -speed;
          if (this.computer.position.z - (this.computerWidth / 2) <= this.bottomWallZ + 1)
          {
            (this.computer as any).velocity.z = 0;
          }
        }
        else if (ballZ > paddleZ + paddleHeight/2)
        {
          (this.computer as any).velocity.z = speed;
          if (this.computer.position.z + (this.computerWidth / 2) >= this.topWallZ - 1)
          {
            (this.computer as any).velocity.z = 0;
          }
        }
        else
        {
          (this.computer as any).velocity.z = 0;
        }
      }
      else
      {
        (this.computer as any).velocity.z = 0;
      }

      this.computer.position.z += (this.computer as any).velocity.z;
    }
  }

  updateBall() {
    if (!this.isHost) return; // Only host simulates ball

    // Wall bouncing (top and bottom)
    if (this.ball.position.z <= this.arenaSize[1] / -2 + 1 || this.ball.position.z >= this.arenaSize[1] / 2 - 1){
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
    this.ball.rotation.y +=   rotationSpeed;
    this.ball.rotation.z -= (this.ball as any).velocity.x * rotationSpeed;

    // Send ball state to other player
    if (this.isConnected && this.socket) {
      this.socket.send(JSON.stringify({
        type: 'ball-update',
        position: this.ball.position,
        velocity: (this.ball as any).velocity
      }));
    }

    // Update ball trail
    this.updateBallTrail();
  }

  checkPaddleCollisions() {
    const ballPos = this.ball.position;
    const playerPos = this.player.position;
    const computerPos = this.computer.position;
    const paddleHeight = 3 * this.diffMultiplier;

    // Player paddle collision
    if (ballPos.x <= playerPos.x + 1 && ballPos.x >= playerPos.x - 1) {
      if (ballPos.z >= playerPos.z - paddleHeight && ballPos.z <= playerPos.z + paddleHeight) {
        console.log("player collision");
        (this.ball as any).velocity.x = Math.abs((this.ball as any).velocity.x);

        if (this.isPlayerMoving != "NO")
        {
          (this.ball as any).velocity.x += 0.1;
          (this.ball as any).velocity.z += this.isPlayerMoving == "UP" ? -0.15 : 0.15;
        }
        else
        {
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
      if (ballPos.z >= computerPos.z - paddleHeight && ballPos.z <= computerPos.z + paddleHeight) {
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

    // Player scores (ball goes past computer goal)
    if (ballPos.x >= this.computerGoal.position.x) {
      this.playerScore++;
      console.log("player scored " + this.playerScore);
      this.triggerPlayerScorePulse();
      this.createGoalExplosion(ballPos, 'player');
      this.vaporizeBall(ballPos);
      this.resetBallDelayed();
    }

    // Computer scores (ball goes past player goal)
    if (ballPos.x <= this.playerGoal.position.x) {
      this.computerScore++;
      console.log("computer scored " + this.computerScore);
      this.triggerComputerScorePulse();
      this.createGoalExplosion(ballPos, 'computer');
      this.vaporizeBall(ballPos);
      this.resetBallDelayed();
    }

    if (this.isConnected && this.socket) {
      this.socket.send(JSON.stringify({
        type: 'score-update',
        playerScore: this.playerScore,
        computerScore: this.computerScore
      }));
    }
  }

  resetBall() {
    // Clean up any remaining fragments
    this.ballFragments.forEach(fragment => fragment.dispose());
    this.ballFragments = [];

    this.ball.setEnabled(true); // Show the ball again
    this.isGoalScored = false;

    if (this.ball.position.x > 0)
    {
      this.ball.position = new BABYLON.Vector3(this.computer.position.x - 2, this.computer.position.y + this.ballDiameter / 2, this.computer.position.z);
      (this.ball as any).velocity = new BABYLON.Vector3(-this.ballSpeed, 0, (Math.random()) * this.ballSpeed);
    }
    else
    {
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
    if (playerScoreEl) playerScoreEl.textContent = this.playerScore.toString();
    if (computerScoreEl) computerScoreEl.textContent = this.computerScore.toString();
  }

  startRenderLoop() {
    console.log("Game started!")
    this.engine.runRenderLoop(() => {
      this.update();
      this.scene.render();
    });
  }
}

export function startGame3D() {
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
}

// Initialize the game
/*window.addEventListener("DOMContentLoaded", () => {
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
  game.init();
});*/
