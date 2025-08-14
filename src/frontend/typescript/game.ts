import { startGame2D } from './2d.ts';
import { startGame3D } from './3d.ts';

// Track if games are already running to prevent multiple instances
// Use a global singleton for game state
if (!(window as any).PongTranscenderState) {
  (window as any).PongTranscenderState = {
    gameRunning: false,
    selectedGameMode: null
  };
}

export function getGameRunning() {
  return (window as any).PongTranscenderState.gameRunning;
}
export function setGameRunning(value: boolean) {
  (window as any).PongTranscenderState.gameRunning = value;
}

let selectedGameMode: '2d' | '3d' | null = null;
console.log("Starting game...");

// Wait for DOM to be loaded
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, setting up main menu...');

  // Get button elements
  const btn2D = document.getElementById('btn-2d') as HTMLButtonElement;
  const btn3D = document.getElementById('btn-3d') as HTMLButtonElement;

  const inst = document.getElementById('instructions') as HTMLDivElement;
  const scr = document.getElementById('score-display') as HTMLDivElement;

  const gameID = document.getElementById('gameId') as HTMLInputElement;
  const btnJoin = document.getElementById('btn-join') as HTMLButtonElement;
  const btnCreate = document.getElementById('btn-create') as HTMLButtonElement;
  const btnSinglePlayer = document.getElementById('btn-sp') as HTMLButtonElement;

  const diffDiv = document.getElementById('diff') as HTMLDivElement;
  const dimDiv = document.getElementById('dimension') as HTMLDivElement;
  const joinDiv = document.getElementById('joinDiv') as HTMLDivElement;
  const snglDiv = document.getElementById('sngl-player') as HTMLDivElement;

  // Get multiplayer UI elements
  const multiplayerDiv = document.getElementById('multiplayer-controls') as HTMLDivElement;

  // Add event listeners for game mode selection
  if (btn2D) {
    btn2D.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      selectedGameMode = '2d';
      diffDiv.hidden = false;
      dimDiv.hidden = true;
      snglDiv.hidden = true;

      // Hide multiplayer controls for 2D
      if (multiplayerDiv) multiplayerDiv.hidden = true;

      // Start 2D game immediately (single player only)
  console.log('[DEBUG] gameRunning before 2D start:', getGameRunning());
  if (!getGameRunning()) {
        console.log('Starting 2D single-player game...');
  setGameRunning(true);
        try {
          startGame2D();
        } catch (error) {
          console.error('Error starting 2D game:', error);
          setGameRunning(false);
        }
      } else {
        console.log('Game already running');
      }

      console.log('2D game mode selected');
    });
  } else {
    console.error('Button with id "btn-2d" not found');
  }

  if (btn3D) {
    btn3D.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      selectedGameMode = '3d';
      inst.hidden = false;
      scr.hidden = false;
      snglDiv.hidden = false;
      joinDiv.hidden = false;
      dimDiv.hidden = true;

      // Show multiplayer controls for 3D
      if (multiplayerDiv) multiplayerDiv.hidden = false;

      console.log('3D game mode selected - choose single player or multiplayer');
    });
  }
  else {
    console.error('Button with id "btn-3d" not found');
  }

  // Add event listeners for multiplayer buttons (3D only)
  if (btnJoin) {
    btnJoin.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      joinDiv.hidden = true;
      diffDiv.hidden = true;
      snglDiv.hidden = true;
      inst.hidden = true;

      const gameId = gameID?.value?.trim();

      if (!gameId) {
        alert('Please enter a Game ID to join');
        return;
      }

      if (selectedGameMode != '3d') {
        alert('Multiplayer is only available for 3D mode');
        return;
      }

  console.log('[DEBUG] gameRunning before 3D join:', getGameRunning());
  if (!getGameRunning()) {
        console.log(`Joining 3D multiplayer game with ID: ${gameId}`);
  setGameRunning(true);

        try {
          startGame3D(gameId, false, true); // false = not host (joining)
        } catch (error) {
          console.error('Error joining 3D game:', error);
          setGameRunning(false);
          alert(`Failed to join game: ${error}`);
        }
      }
      else {
        console.log('Game already running');
        alert('A game is already running');
      }
    });
  }
  else {
    console.error('Button with id "btn-join" not found');
  }

  if (btnCreate) {
    btnCreate.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      joinDiv.hidden = true;
      diffDiv.hidden = true;
      snglDiv.hidden = true;
      inst.hidden = true;

      if (selectedGameMode != '3d') {
        alert('Coming soon!');
        return;
      }

  console.log('[DEBUG] gameRunning before 3D create:', getGameRunning());
  if (!getGameRunning()) {
        console.log('Creating new 3D multiplayer game...');
  setGameRunning(true);

        try {
          startGame3D('', true, true); // true = host (creating)
        } catch (error) {
          console.error('Error creating 3D game:', error);
          setGameRunning(false);
          alert(`Failed to create game: ${error}`);
        }
      } else {
        console.log('Game already running');
        alert('A game is already running');
      }
    });
  } else {
    console.error('Button with id "btn-create" not found');
  }

  // Add event listener for single player 3D mode
  if (btnSinglePlayer) {
    btnSinglePlayer.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      diffDiv.hidden = false;
      joinDiv.hidden = true;
      snglDiv.hidden = true;
      inst.hidden = true;

      if (selectedGameMode !== '3d') {
        alert('Please select 3D mode first');
        return;
      }

  console.log('[DEBUG] gameRunning before 3D single player:', getGameRunning());
  if (!getGameRunning()) {
        console.log('Starting 3D single-player game...');
  setGameRunning(true);

        try {
          // Start 3D game without multiplayer connection
          startGame3D('', true, false); // gameId, isHost, useMultiplayer
        } catch (error) {
          console.error('Error starting 3D single-player game:', error);
          setGameRunning(false);
          alert(`Failed to start game: ${error}`);
        }
      } else {
        console.log('Game already running');
        alert('A game is already running');
      }
    });
  } else {
    console.error('Button not found');
  }

  // Initialize main menu
  initializeMainMenu();
});

// Function to initialize the main menu
export function initializeMainMenu() {
  console.log('Main menu initialized');

  // Check if required elements exist
  const canvas = document.getElementById('renderCanvas');
  if (!canvas) {
    console.error('Canvas element with id "renderCanvas" not found');
  } else {
    console.log('Canvas found:', canvas);
  }

  // Add any main menu setup logic here
}

// Function to handle game cleanup
export function cleanupCurrentGame() {
  console.log('Cleaning up current game...');
  setGameRunning(false);
  selectedGameMode = null;

  // Show main menu elements again
  const ctrlDiv = document.getElementById('diff') as HTMLDivElement;
  const dimDiv = document.getElementById('dimension') as HTMLDivElement;
  const multiplayerDiv = document.getElementById('multiplayer-controls') as HTMLDivElement;

  if (ctrlDiv) ctrlDiv.hidden = true;
  if (dimDiv) dimDiv.hidden = false;
  if (multiplayerDiv) multiplayerDiv.hidden = true;

  // Add cleanup logic here if needed
}

// Function to reset game state (useful for switching between games)
export function resetGameState() {
  cleanupCurrentGame();
  console.log('Game state reset');
}

// Function to display generated game ID to user (call this from your game classes)
export function displayGameId(gameId: string) {
  const gameIdDisplay = document.getElementById('gameId');
  if (gameIdDisplay) {
    gameIdDisplay.textContent = `Game ID: ${gameId}`;
    gameIdDisplay.style.display = 'block';
  } else {
    // If no display element exists, show in console and alert
    console.log(`Generated Game ID: ${gameId}`);
    alert(`Game created! Share this ID with others to join: ${gameId}`);
  }
}