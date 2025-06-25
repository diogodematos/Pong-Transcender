require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24", // <--- IMPORTANTE: Verifique o pragma do seu TournamentResults.sol e ajuste se for diferente (ex: "0.8.0")
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545", // Nome do serviço 'blockchain' no docker-compose.yml e porta 8545 do Ganache
      accounts: {
        mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about", // O mnemonic do seu docker-compose.yml
        count: 10, // O número de contas que o Ganache gera
      },
      chainId: 1337, // networkId do seu Ganache no docker-compose.yml
    },
  },
};