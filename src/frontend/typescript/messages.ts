// Centralized message module for tournament UI
export const TourneyMessages = {
  champion: (winner: string) => `Champion: <strong>${winner}</strong> 🏆`,
  continue: 'Continue',
  semifinalWinner: (matchNum: number, winner: string) => `Semifinal ${matchNum} winner: ${winner}`,
  final: (p1: string, p2: string) => `Final: ${p1} vs ${p2}`,
  tournamentCreated: (name: string, p1: string, p2: string) => `Tournament "${name}" created!\nFirst match: ${p1} vs ${p2}`,
  finished: 'Tournament finished!'
};
