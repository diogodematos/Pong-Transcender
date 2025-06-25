const { ethers } = require("hardhat");

async function main() {
  // Pega a fábrica do contrato 'TournamentResults'
  const TournamentResults = await ethers.getContractFactory("TournamentResults");
  // Faz o deploy do contrato
  const tournamentResults = await TournamentResults.deploy();


  console.log(`TournamentResults contract deployed to: ${tournamentResults.target}`);
}

// Padrão do Hardhat para lidar com erros e encerrar o processo
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
