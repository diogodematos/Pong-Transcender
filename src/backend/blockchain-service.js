// src/backend/blockchain-service.js

import { ethers } from "ethers";

// --- BLOCKCHAIN CONFIGURATION ---
// The address of the TournamentResults contract you deployed.
// Make sure this is the actual address obtained from your last deployment!
const CONTRACT_ADDRESS = "0xa1CF5786c6ceC9E8D0BbACEdF2cc98dAe4614363"; // YOUR ACTUAL ADDRESS HERE

// This is the full array you just provided:
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


// Connect to Ganache provider (using the service name 'blockchain' inside Docker)
const provider = new ethers.JsonRpcProvider("http://blockchain:8545");

// Create a wallet to sign transactions.
// Use a primeira chave privada do Ganache para o mnemonic fornecido:
// "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
// Chave Privada correspondente: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5ef7598a7250bb40eb80'
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5ef7598a7250bb40eb80";
const wallet = new ethers.Wallet(privateKey, provider);

// Contract instance
const tournamentResultsContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

/**
 * Records a tournament result on the blockchain.
 * @param {number} tournamentId - The unique tournament ID.
 * @param {string} winnerAddress - The winner's wallet address (e.g., "0x...")
 * @param {string} loserAddress - The loser's wallet address (e.g., "0x...")
 * @param {number} winnerScore - The winner's score.
 * @param {number} loserScore - The loser's score.
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
  const receipt = await tx.wait(); // Wait for the transaction to be mined
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