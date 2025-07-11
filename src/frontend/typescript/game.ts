import { startGame2D } from './2d.ts';
import { startGame3D } from './3d.ts';

// Track if games are already running to prevent multiple instances
let gameRunning = false;
console.log("Starting game...");

// Wait for DOM to be loaded
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, setting up main menu...');

  // Get button elements
  const btn2D = document.getElementById('btn-2d') as HTMLButtonElement;
  const btn3D = document.getElementById('btn-3d') as HTMLButtonElement;

  // Add event listeners for buttons
  if (btn2D) {
    btn2D.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!gameRunning) {
        console.log('Starting 2D game...');
        gameRunning = true;
        try {
          startGame2D();
        } catch (error) {
          console.error('Error starting 2D game:', error);
          gameRunning = false;
        }
      } else {
        console.log('Game already running');
      }
    });
  } else {
    console.error('Button with id "btn-2d" not found');
  }

  if (btn3D) {
    btn3D.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!gameRunning) {
        console.log('Starting 3D game...');
        gameRunning = true;
        try {
          startGame3D();
        } catch (error) {
          console.error('Error starting 3D game:', error);
          gameRunning = false;
        }
      } else {
        console.log('Game already running');
      }
    });
  } else {
    console.error('Button with id "btn-3d" not found');
  }

  // Initialize main menu
  initializeMainMenu();
});

// Function to initialize the main menu
export function initializeMainMenu() {
  console.log('Main menu initialized');

  // Check if required elements exist
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('Canvas element with id "game-canvas" not found');
  } else {
    console.log('Canvas found:', canvas);
  }

  // Add any main menu setup logic here
}

// Function to handle game cleanup
export function cleanupCurrentGame() {
  console.log('Cleaning up current game...');
  gameRunning = false;
  // Add cleanup logic here if needed
}

// Function to reset game state (useful for switching between games)
export function resetGameState() {
  cleanupCurrentGame();
  console.log('Game state reset');
}