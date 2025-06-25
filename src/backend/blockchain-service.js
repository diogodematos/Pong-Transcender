// src/backend/blockchain-service.js

import { ethers } from "ethers";

// --- CONFIGURAÇÕES DA BLOCKCHAIN ---
// O endereço do contrato TournamentResults que você implantou.
// Certifique-se de que este é o endereço real obtido no último deploy!
const CONTRACT_ADDRESS = "0xa1CF5786c6ceC9E8D0BbACEdF2cc98dAe4614363"; // SEU ENDEREÇO REAL AQUI

// O ABI COMPLETO do seu contrato TournamentResults.
// Este é o array completo que você acabou de fornecer:
const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tournamentId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "winner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "loser",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "winnerScore",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "loserScore",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "TournamentResultRecorded",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "getTournamentCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_tournamentId",
        "type": "uint256"
      }
    ],
    "name": "getTournamentResult",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_tournamentId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_winner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_loser",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_winnerScore",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_loserScore",
        "type": "uint256"
      }
    ],
    "name": "recordTournamentResult",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "registeredTournamentIds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "results",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tournamentId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "winner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "loser",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "winnerScore",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "loserScore",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];


// Conectar ao provedor Ganache (usando o nome do serviço 'blockchain' dentro do Docker)
const provider = new ethers.JsonRpcProvider("http://blockchain:8545");

// Crie uma carteira para assinar transações.
// Use a primeira chave privada do Ganache para o mnemonic fornecido:
// "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
// Chave Privada correspondente: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5ef7598a7250bb40eb80'
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5ef7598a7250bb40eb80";
const wallet = new ethers.Wallet(privateKey, provider);

// Instância do contrato
const tournamentResultsContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

/**
 * Registra o resultado de um torneio na blockchain.
 * @param {number} tournamentId - O ID único do torneio.
 * @param {string} winnerAddress - O endereço da carteira do vencedor (Ex: "0x...")
 * @param {string} loserAddress - O endereço da carteira do perdedor (Ex: "0x...")
 * @param {number} winnerScore - A pontuação do vencedor.
 * @param {number} loserScore - A pontuação do perdedor.
 */
async function recordTournamentResultBlockchain(tournamentId, winnerAddress, loserAddress, winnerScore, loserScore) {
  try {
    console.log(`Attempting to record result for Tournament ID: ${tournamentId}...`);
    const tx = await tournamentResultsContract.recordTournamentResult(
      tournamentId,
      winnerAddress,
      loserAddress,
      winnerScore,
      loserScore
    );

    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait(); // Espera a transação ser minerada
    console.log("Transaction confirmed:", receipt.hash);
    console.log("Result recorded on blockchain!");
    return { success: true, transactionHash: receipt.hash };

  } catch (error) {
    console.error("Error recording tournament result on blockchain:", error);
    if (error.code === 'CALL_EXCEPTION' || error.code === 'BAD_DATA') {
        console.error("Contract call failed, possibly due to a revert in the smart contract.");
    }
    return { success: false, error: error.message };
  }
}

/**
 * Obtém o resultado de um torneio pela blockchain.
 * @param {number} tournamentId - O ID único do torneio.
 * @returns {Promise<object>} - Um objeto com os detalhes do resultado do torneio ou null se não encontrado/erro.
 */
async function getTournamentResultBlockchain(tournamentId) {
    try {
        const result = await tournamentResultsContract.getTournamentResult(tournamentId);
        // O resultado é retornado como um array (por causa do 'returns' do Solidity),
        // convertemos para um objeto mais legível.
        return {
            tournamentId: Number(result[0]),
            winner: result[1],
            loser: result[2],
            winnerScore: Number(result[3]),
            loserScore: Number(result[4]),
            timestamp: Number(result[5])
        };
    } catch (error) {
        console.error(`Error getting tournament result for ID ${tournamentId} from blockchain:`, error);
        return null;
    }
}


export {
  recordTournamentResultBlockchain,
  getTournamentResultBlockchain,
};