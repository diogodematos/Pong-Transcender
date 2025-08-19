enum KeyBindings {
  UP = 38,
  DOWN = 40,
}

// Global game variable
let game: Game;

class Game {
  private gameCanvas: HTMLCanvasElement;
  private gameContext: CanvasRenderingContext2D;
  public static keysPressed: boolean[] = [];
  public static playerScore: number = 0;
  public static computerScore: number = 0;
  public static diffMultiplier: number = 1;
  public static diffMultiplierIA: number = 1;
  public static speedMultiplier: number = 1.4;
  public static speedMultiplierIA: number = 1.4;
  private player1!: Paddle;
  private compBot!: ComputerPaddle;
  private ball!: Ball;
  private mid: GoalLine | undefined;
  private particleSystem: ParticleSystem;

  // Score pulsation effect properties
  private playerScorePulse: number = 0;
  private computerScorePulse: number = 0;
  private maxPulseIntensity: number = 7;
  private pulseDecayRate: number = 0.07;

  public setDifficulty(level: 'easy' | 'medium' | 'hard') {
    if (level === 'easy') {
        Game.diffMultiplier = 2;
        Game.speedMultiplier = 1.3;
        if (this.ball) this.ball.speed = 5;
    } 
    else if (level === 'medium') {
        Game.diffMultiplier = 1;
        Game.speedMultiplier = 1.4;
        if (this.ball) this.ball.speed = 6;
    } 
    else if (level === 'hard') {
        Game.diffMultiplier = 0.5;
        Game.speedMultiplier = 1.6;
        if (this.ball) this.ball.speed = 7;
    }

    console.log(`📊 Difficulty (2D) set to: ${level}`);
    this.reset();
}

  constructor() {
    // Creating canvas and checking if null
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement | null;
    if (!canvas) {
      throw new Error("Canvas element with id 'renderCanvas' not found");
    }
    this.gameCanvas = canvas;
    this.gameCanvas.width = window.innerWidth;
    this.gameCanvas.height = window.innerHeight;

    // Creating context
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get 2D context from canvas");
    }
    this.gameContext = context;
    this.gameContext.font = "30px Orbitron";

    // -------- Event Listeners ---------
    window.addEventListener("keydown", function(e) {
      Game.keysPressed[e.which] = true;
    });

    window.addEventListener("keyup", function(e) {
      Game.keysPressed[e.which] = false;
    });

    // Setup difficulty buttons after DOM is loaded

    this.particleSystem = new ParticleSystem();
    // Start drawing everything with the default values
    this.reset();
  }

  reset() {
    var paddleWidth: number = this.gameCanvas.height / 100,
      paddleHeight: number = (this.gameCanvas.height / 10) * Game.diffMultiplier,
      paddleHeightIA: number = (this.gameCanvas.height / 10) * Game.diffMultiplierIA,
      ballSize: number = 10,
      wallOffset: number = 50;

    this.player1 = new Paddle(
      paddleWidth,
      paddleHeight,
      wallOffset,
      this.gameCanvas.height / 2 - paddleHeight / 2,
    );
    this.compBot = new ComputerPaddle(
      paddleWidth,
      paddleHeightIA,
      this.gameCanvas.width - (wallOffset + paddleWidth),
      this.gameCanvas.height / 2 - paddleHeight / 2,
    );
    this.ball = new Ball(
      ballSize,
      ballSize,
      this.gameCanvas.width / 2 - ballSize / 2,
      this.gameCanvas.height / 2 - ballSize / 2,
    );
  }

  // Method to trigger score pulsation
  triggerPlayerScorePulse() {
    this.playerScorePulse = this.maxPulseIntensity;
  }

  triggerComputerScorePulse() {
    this.computerScorePulse = this.maxPulseIntensity;
  }

  drawBoardDetails() {
    this.player1.goal.create(this.gameContext, this.gameCanvas);
    this.compBot.goal.create(this.gameContext, this.gameCanvas);
    this.mid = new GoalLine(this.gameCanvas.width / 2, 20, "#FFFFFF", "#FFFFFF", 2, 0);
    this.mid.create(this.gameContext, this.gameCanvas);

    // Draw player score with pulsation effect
    this.gameContext.fillStyle = "#FFFFFF";
    if (this.playerScorePulse > 0) {
      this.gameContext.shadowColor = "#7DF9FF";
      this.gameContext.shadowBlur = this.playerScorePulse;
    }

    let tmp = Game.playerScore, counter = 0;
    while(tmp >= 10){
      tmp /= 10;
      counter++;
    }
    this.gameContext.fillText(
      Game.playerScore.toString(),
      (this.gameCanvas.width / 2 - this.gameCanvas.width / 30) - (counter * 10),
      this.gameCanvas.height / 15,
    );

    // Reset shadow for player score
    this.gameContext.shadowBlur = 0;
    this.gameContext.shadowColor = "transparent";

    // Draw computer score with pulsation effect
    this.gameContext.fillStyle = "#FFFFFF";
    if (this.computerScorePulse > 0) {
      this.gameContext.shadowColor = "#FF073A";
      this.gameContext.shadowBlur = this.computerScorePulse;
    }

    let tmp2 = Game.computerScore, counter2 = 0;
    while(tmp2 >= 10){
      tmp2 /= 10;
      counter2++;
    }
    this.gameContext.fillText(
      Game.computerScore.toString(),
      (this.gameCanvas.width / 2 + this.gameCanvas.width / 60) + (counter2),
      this.gameCanvas.height / 15,
    );

    // Reset shadow for computer score
    this.gameContext.shadowBlur = 0;
    this.gameContext.shadowColor = "transparent";
  }

  update() {
    // Update pulsation effects
    if (this.playerScorePulse > 0) {
      this.playerScorePulse -= this.pulseDecayRate;
      if (this.playerScorePulse < 0) {
        this.playerScorePulse = 0;
      }
    }

    if (this.computerScorePulse > 0) {
      this.computerScorePulse -= this.pulseDecayRate;
      if (this.computerScorePulse < 0) {
        this.computerScorePulse = 0;
      }
    }

    this.player1.update(this.gameCanvas);
    this.compBot.update(this.ball, this.gameCanvas);
    this.ball.update(this.player1, this.compBot, this.gameCanvas, this.particleSystem);
    this.particleSystem.update(this.gameCanvas);
  }

  // Drawing everything
  draw() {
    this.gameContext.fillStyle = "#000";
    this.gameContext.fillRect(
      0,
      0,
      this.gameCanvas.width,
      this.gameCanvas.height,
    );

    this.drawBoardDetails();
    this.player1.draw(this.gameContext);
    this.compBot.draw(this.gameContext);
    this.ball.draw(this.gameContext);
    this.particleSystem.draw(this.gameContext);
  }

  gameLoop() {
      // Check win condition before updating/drawing
      if (Game.playerScore >= 5 || Game.computerScore >= 5) {
        this.showGameEndMessage();
        return;
      }
      this.update();
      this.draw();
      requestAnimationFrame(() => this.gameLoop());
    }

    showGameEndMessage() {
      // Remove previous message if exists
      const oldMsg = document.getElementById('game-end-msg');
      if (oldMsg) oldMsg.remove();


    const msgDiv = document.createElement('div');
    msgDiv.id = 'game-end-msg';
    msgDiv.style.position = 'fixed';
    msgDiv.style.left = '50%';
    msgDiv.style.top = '50%';
    msgDiv.style.transform = 'translate(-50%, -50%)';
    msgDiv.style.background = 'rgba(0,0,0,0.7)';
    msgDiv.style.color = '#fff';
    msgDiv.style.padding = '16px 32px';
    msgDiv.style.borderRadius = '12px';
    msgDiv.style.fontFamily = 'Orbitron, Arial, sans-serif';
    msgDiv.style.fontSize = '1.5rem';
    msgDiv.style.zIndex = '100';
    msgDiv.style.textAlign = 'center';

      const winner = Game.playerScore > Game.computerScore ? 'You win!' : 'Computer wins!';
      msgDiv.innerHTML = `<div style='margin-bottom:8px;'>${winner}</div><div>Final Score: <span style='color:#7DF9FF;'>${Game.playerScore}</span> - <span style='color:#FF073A;'>${Game.computerScore}</span></div>`;

      const btn = document.createElement('button');
      btn.textContent = 'Main Menu';
      btn.style.marginTop = '12px';
      btn.style.padding = '8px 24px';
      btn.style.fontSize = '1rem';
      btn.style.background = 'linear-gradient(45deg, #7DF9FF, #FF073A)';
      btn.style.color = '#fff';
      btn.style.border = 'none';
      btn.style.borderRadius = '8px';
      btn.style.cursor = 'pointer';
      btn.onclick = () => window.location.reload();
      msgDiv.appendChild(document.createElement('br'));
      msgDiv.appendChild(btn);

      document.body.appendChild(msgDiv);
    }
}

// --------- CLASSES ---------

class Entity {
  width: number;
  height: number;
  x: number;
  y: number;
  xVel: number = 0;
  yVel: number = 0;
  constructor(w: number, h: number, x: number, y: number) {
    this.width = w;
    this.height = h;
    this.x = x;
    this.y = y;
  }
  draw(context : CanvasRenderingContext2D) {
    context.fillStyle = "#FFFFFF";
    context.fillRect(this.x, this.y, this.width, this.height);
  }
}

class GoalLine extends Entity {
  private color: string;
  private glowColor: string;
  public x: number;

  constructor(x: number, y: number, color: string, glowColor: string, width: number, height: number) {
    super(width, height, x, y);
    this.x = x;
    this.color = color;
    this.glowColor = glowColor;
  }

  create(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    // Multiple glow layers for intense effect
    context.lineCap = "round";
    context.strokeStyle = this.color;
    context.lineWidth = this.width;

    // Layer 1: Wide outer glow
    context.shadowBlur = 40;
    context.shadowColor = this.color;
    context.beginPath();
    context.moveTo(this.x, this.y);
    context.lineTo(this.x, canvas.height - 20);
    context.stroke();

    // Layer 2: Medium glow
    context.shadowBlur = 20;
    context.beginPath();
    context.moveTo(this.x, this.y);
    context.lineTo(this.x, canvas.height - 20);
    context.stroke();

    // Layer 3: Inner glow (bright core)
    context.shadowBlur = 10;
    context.shadowColor = this.glowColor;
    context.beginPath();
    context.moveTo(this.x, this.y);
    context.lineTo(this.x, canvas.height - 20);
    context.stroke();

    // Reset shadow
    context.shadowBlur = 0;
    context.shadowColor = "transparent";
  }
}

class Paddle extends Entity {
  private speed: number = 5 * Game.speedMultiplier;
  public goal: GoalLine;
  public moving: "UP" | "DOWN" | "NO";

  constructor(w: number, h: number, x: number, y: number) {
    super(w, h, x, y);
    this.moving = "NO";
    this.goal = new GoalLine(this.x - 10, 20, "#7DF9FF", "#FFFFFF", 5, 0);
  }

  draw(context : CanvasRenderingContext2D) {
    context.fillStyle = "#FFFFFF";
    context.shadowColor = "#7DF9FF"
    context.shadowBlur = 10;
    context.shadowOffsetX = 2;
    context.beginPath();
    context.roundRect(this.x, this.y, this.width, this.height, 10);
    context.fill();

    // Reset shadows
    context.shadowBlur = 0;
    context.shadowColor = "transparent";
    context.shadowOffsetX = 0;
  }

  update(canvas : HTMLCanvasElement) {
    this.moving = "NO";
    if (Game.keysPressed[KeyBindings.UP]) {
      this.moving = "UP"
      console.log("Player: up");
      this.yVel = -1;
      if (this.y <= 20) {
        this.yVel = 0;
      }
    }
    else if (Game.keysPressed[KeyBindings.DOWN]) {
      this.moving = "DOWN"
      console.log("Player: down");
      this.yVel = 1;
      if (this.y + this.height >= canvas.height - 20) {
        this.yVel = 0;
      }
    }
    else {
      this.yVel = 0;
    }
    this.y += this.yVel * this.speed;
  }
}

class ComputerPaddle extends Entity {
  private speed: number = 5 * Game.speedMultiplierIA;
  public goal: GoalLine;

  constructor(w: number, h: number, x: number, y: number) {
    super(w, h, x, y);
    this.goal = new GoalLine(this.x + this.width + 10, 20, "#FF073A", "#ff3961", 5, 0);
  }

  draw(context : CanvasRenderingContext2D) {
    context.fillStyle = "#FFFFFF";
    context.shadowColor = "#ed6b72"
    context.shadowBlur = 10;
    context.shadowOffsetX = -2;
    context.beginPath();
    context.roundRect(this.x, this.y, this.width, this.height, 10);
    context.fill();

    // Reset shadows
    context.shadowBlur = 0;
    context.shadowColor = "transparent";
    context.shadowOffsetX = 0;
  }

  update(ball: Ball, canvas : HTMLCanvasElement) {
    //chase ball
    if (ball.y < this.y && ball.xVel >= 1) {
      this.yVel = -1;

      if (this.y <= 20) {
        this.yVel = 0;
      }
    } else if (ball.y > this.y + this.height && ball.xVel >= 1) {
      this.yVel = 1;

      if (this.y + this.height >= canvas.height - 20) {
        this.yVel = 0;
      }
    } else {
      this.yVel = 0;
    }

    this.y += this.yVel * this.speed;
  }
}

class Ball extends Entity {
  public speed: number = 6;
  public glowColor = "#FFFFFF";
  public isWaiting: boolean = false;
  private lastHitBy: 'player' | 'computer' | null = null;
  private glowIntensity: number = 0;
  private maxGlowIntensity: number = 7;

  constructor(w: number, h: number, x: number, y: number) {
    super(w, h, x, y);
    var randomDirection = Math.floor(Math.random() * 2) + 1;
    if (randomDirection % 2) {
      this.xVel = 1;
    } else {
      this.xVel = -1;
    }
    this.yVel = 1;
  }

  draw(context: CanvasRenderingContext2D) {
    // Set glow effect based on who last hit the ball
    this.glowColor = this.lastHitBy === 'player' ? '#7DF9FF' : '#FF073A';

    context.fillStyle = "#FFFFFF" //this.lastHitBy === 'player' ? '#cffdff' : '#ffbfcc';
    context.beginPath();
    context.arc(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width / 2,
      0,
      2 * Math.PI
    );
    if (this.lastHitBy && this.glowIntensity > 0) {

      context.shadowColor = this.glowColor;
      context.shadowBlur = 4;
      context.shadowOffsetY = (this.yVel * this.speed * 1.2) * -1;
      context.shadowOffsetX = (this.xVel * this.speed * 1.2) * -1;
    }
    context.fill();

    // Reset shadow
    //this.glowColor = "#FFFFFF";
    context.shadowBlur = 0;
    context.shadowColor = "transparent";
    context.shadowOffsetY = 0;
    context.shadowOffsetX = 0;
  }

  update(player: Paddle, computer: ComputerPaddle, canvas : HTMLCanvasElement, particleSystem: ParticleSystem) {
    // Canvas upper
    if (this.y <= 10) {
      this.yVel = 1;
    }

    // Canvas lower
    if (this.y + this.height >= canvas.height - 10) {
      this.yVel = -1;
    }

    // Left goal (blue)
    if (this.x <= player.goal.x) {
      particleSystem.createExplosion(
        this.x + this.width / 2,
        this.y + this.height / 2,
        -1,
        "#7DF9FF"
      );
      this.isWaiting = true;
      Game.computerScore += 1;
      this.x = player.x + 18;
      this.y = canvas.height / 2;

      let tmpx = this.xVel;
      let tmpy = this.yVel;

      this.xVel = 0;
      this.yVel = 0;

      setTimeout(() => {
        this.xVel = tmpx * -1;
        this.yVel = tmpy;
        this.isWaiting = false;
      }, 800);

      // make the score glow
      game.triggerComputerScorePulse();

      // Reset glow when ball resets
      this.lastHitBy = null;
      this.glowIntensity = 0;
    }

    // Right goal (red)
    if (this.x >= computer.goal.x) {
      particleSystem.createExplosion(
        this.x + this.width / 2,
        this.y + this.height / 2,
        1,
        "#FF073A"
      );
      this.isWaiting = true;
      Game.playerScore += 1;

      this.x = computer.x - 18;
      this.y = canvas.height / 2;

      let tmpx = this.xVel;
      let tmpy = this.yVel;

      this.xVel = 0;
      this.yVel = 0;

      setTimeout(() => {
        this.xVel = tmpx * -1;
        this.yVel = tmpy;
        this.isWaiting = false;
      }, 800);

      // make the score glow
      game.triggerPlayerScorePulse();

      // Reset glow when ball resets
      this.lastHitBy = null;
      this.glowIntensity = 0;
    }

    // Player paddle collision
    if (this.x <= player.x + player.width) {
      if (this.y >= player.y && this.y + this.height <= player.y + player.height) {
        this.xVel = 1;
        this.lastHitBy = 'player';
        this.glowIntensity = this.maxGlowIntensity;
        console.log("Player: hit");
        if (player.moving != "NO")
        {
          this.xVel += 0.5;
          this.yVel = player.moving === "UP" ? -1.8 : 1.8;
        }
      }
    }

    // Computer paddle collision
    if (this.x + this.width >= computer.x) {
      if (this.y >= computer.y && this.y + this.height <= computer.y + computer.height) {
        this.xVel = -1;
        this.lastHitBy = 'computer';
        this.glowIntensity = this.maxGlowIntensity;
        console.log("Computer: hit");
      }
    }

    if (!this.isWaiting)
    {
      this.x += this.xVel * this.speed;
      this.y += this.yVel * this.speed;
    }
    else if (this.x <= canvas.width / 2) {
      this.x = player.x + 18;
      this.y = player.y + player.height / 2;
    }
    else {
      this.x = computer.x - 18;
      this.y = computer.y + computer.height / 2;
    }
    //console.log("x: " + this.x + ", y: " + this.y);
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;

  constructor(x: number, y: number, vx: number, vy: number, color: string = "#FFFFFF") {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.maxLife = 120; // frames
    this.life = this.maxLife;
    this.size = Math.random() * 2 + 0.1;
    this.color = color;
  }

  update(canvas: HTMLCanvasElement) {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x <= 0 || this.x >= canvas.width)
      this.vx *= -1;

    this.vx *= 0.98; // friction
    this.vy += 0; // gravity
    this.life--;
  }

  draw(context: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife;
    context.fillStyle = this.color;
    context.globalAlpha = alpha;
    context.shadowBlur = 5;
    context.shadowColor = this.color;

    context.beginPath();
    context.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
    context.fill();

    context.globalAlpha = 1;
    context.shadowBlur = 0;
    context.shadowColor = "transparent";
  }

  isDead(): boolean {
    return this.life <= 0;
  }
}

class ParticleSystem {
  particles: Particle[] = [];

  createExplosion(x: number, y: number, direction: number, color: string = "#FFFFFF") {
    // Create 15-25 particles
    const particleCount = Math.floor(Math.random() * 10) + 15;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.random() - 0.5) * Math.PI; // Random angle
      const speed = Math.random() * 8 + 2;

      // Bias particles towards the ball's direction
      const vx = Math.cos(angle) * speed * direction + (Math.random() - 0.5) * 2;
      const vy = Math.sin(angle) * speed + (Math.random() - 0.5) * 4;

      this.particles.push(new Particle(x, y, vx, vy, color));
    }
  }

  update(canvas: HTMLCanvasElement) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(canvas);
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(context: CanvasRenderingContext2D) {
    this.particles.forEach(particle => particle.draw(context));
  }
}

export let currentGame2D: Game | null = null;

export function startGame2D() {
  console.log('2D Game started!');
  game = new Game();
  currentGame2D = game;
  game.gameLoop();
}