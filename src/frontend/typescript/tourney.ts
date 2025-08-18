import { startTourneyGame } from './2dTourney.ts';
import { router } from './router.ts';

let players: string[] = [];
let matches: { p1: string, p2: string }[] = [];
let currentMatchIndex = 0;
let semifinalWinners: string[] = [];

function showWinnerModal(winner: string) {
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

  modal.innerHTML = `
    <p>Campeão: <strong>${winner}</strong> 🏆</p>
    <button id="closeWinnerModal" style="margin-top: 15px; padding: 8px 20px; font-weight: bold;">Continuar</button>
  `;

  document.body.appendChild(modal);

  document.getElementById('closeWinnerModal')?.addEventListener('click', () => {
    modal.remove();
    window.location.reload();
  });
}

window.addEventListener('localTourneyGameOver', (e: any) => {
  const winner = e.detail?.winner || '';

  if (currentMatchIndex < 2) {
    semifinalWinners.push(winner);

    // Mostrar alert da semifinal atual antes de avançar
    alert(`Vencedor da semifinal ${currentMatchIndex + 1}: ${winner}`);

    if (currentMatchIndex + 1 < 2) {
      currentMatchIndex++;
      startNextMatch();
    } else if (currentMatchIndex + 1 === 2) {
      matches.push({ p1: semifinalWinners[0], p2: semifinalWinners[1] });
      alert(`Final: ${semifinalWinners[0]} vs ${semifinalWinners[1]}`);
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
    const tourneyName = (document.getElementById('tourneyName') as HTMLInputElement).value.trim() || 'Torneio Local';

    currentMatchIndex = 0;
    semifinalWinners = [];

    players = inputs.map(inp => inp.value.trim());

    shuffleArray(players);

    matches = [
      { p1: players[0], p2: players[1] },
      { p1: players[2], p2: players[3] }
    ];

    alert(`Torneio "${tourneyName}" criado!\nPrimeiro jogo: ${matches[0].p1} vs ${matches[0].p2}`);
    startBtn.disabled = true;
    startNextMatch();
  });
}

function startNextMatch() {
  if (currentMatchIndex >= matches.length) {
    alert("Torneio finalizado!");
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
