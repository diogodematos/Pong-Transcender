import { startTourneyGame } from './2dTourney.ts';
import { router } from './router.ts';
import { TourneyMessages } from './messages.ts';

let players: string[] = [];
let matches: { p1: string, p2: string }[] = [];
let currentMatchIndex = 0;
let semifinalWinners: string[] = [];

function showWinnerModal(winner: string) {
  // Create modal container
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.left = '50%';
  modal.style.top = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.background = 'rgba(0,0,0,0.8)';
  modal.style.color = '#fff';
  modal.style.padding = '20px 30px';
  modal.style.borderRadius = '10px';
  modal.style.zIndex = '1000';
  modal.style.textAlign = 'center';

  // Create winner message paragraph
  const winnerMessage = document.createElement('p');
  winnerMessage.textContent = TourneyMessages.champion(winner); // Safe with textContent - XSS protected!

  // Create close button
  const closeButton = document.createElement('button');
  closeButton.id = 'closeWinnerModal';
  closeButton.style.marginTop = '15px';
  closeButton.style.padding = '8px 20px';
  closeButton.style.fontWeight = 'bold';
  closeButton.textContent = TourneyMessages.continue; // Safe with textContent

  // Add click event listener
  closeButton.addEventListener('click', () => {
    modal.remove();
    window.location.reload();
  });

  // Assemble the modal
  modal.appendChild(winnerMessage);
  modal.appendChild(closeButton);

  // Add to page
  document.body.appendChild(modal);
}

window.addEventListener('localTourneyGameOver', (e: any) => {
  const winner = e.detail?.winner || '';

  if (currentMatchIndex < 2) {
    semifinalWinners.push(winner);
    // Show alert for current semifinal before advancing
    alert(TourneyMessages.semifinalWinner(currentMatchIndex + 1, winner));
    if (currentMatchIndex + 1 < 2) {
      currentMatchIndex++;
      startNextMatch();
    } else if (currentMatchIndex + 1 === 2) {
      matches.push({ p1: semifinalWinners[0], p2: semifinalWinners[1] });
      alert(TourneyMessages.final(semifinalWinners[0], semifinalWinners[1]));
      currentMatchIndex++;
      startNextMatch();
    }
  } else {
    showWinnerModal(winner);
  }
});

export function initTourneyPage(loggedUsername: string) {
  (document.getElementById('player1') as HTMLInputElement).value = loggedUsername;
  const inputs = Array.from(document.querySelectorAll('#tourneySlots input')) as HTMLInputElement[];
  const startBtn = document.getElementById('startTourneyBtn') as HTMLButtonElement;
  startBtn.disabled = true;

  inputs.forEach(input => {
    input.addEventListener('input', () => {
      const allFilled = inputs.every(inp => inp.value.trim() !== '');
      startBtn.disabled = !allFilled;
    });
  });

  startBtn.addEventListener('click', () => {
    const tourneyName = (document.getElementById('tourneyName') as HTMLInputElement).value.trim() || 'Local Tournament';
    currentMatchIndex = 0;
    semifinalWinners = [];
    players = inputs.map(inp => inp.value.trim());
    shuffleArray(players);
    matches = [
      { p1: players[0], p2: players[1] },
      { p1: players[2], p2: players[3] }
    ];
    alert(TourneyMessages.tournamentCreated(tourneyName, matches[0].p1, matches[0].p2));
    startBtn.disabled = true;
    startNextMatch();
  });
}

function startNextMatch() {
  if (currentMatchIndex >= matches.length) {
    alert(TourneyMessages.finished);
    return;
  }
  const { p1, p2 } = matches[currentMatchIndex];
  startTourneyGame({ player1Nickname: p1, player2Nickname: p2 });
  router.navigate('/game');
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
