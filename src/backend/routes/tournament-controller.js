// src/backend/routes/tournament-controller.js

import { recordTournamentResultBlockchain, getTournamentResultBlockchain } from '../blockchain-service.js';

const tournamentController = (fastify, options, done) => {

    // Exemplo de rota para registar um resultado de torneio
    fastify.post('/record-result', async (req, res) => {
        // Suponha que o corpo da requisição POST contenha estes dados:
        // {
        //   "tournamentId": 1,
        //   "winnerAddress": "0xGanacheAccountAddress1", // Endereço de uma conta do Ganache
        //   "loserAddress": "0xGanacheAccountAddress2",  // Endereço de outra conta do Ganache
        //   "winnerScore": 11,
        //   "loserScore": 5
        // }
        const { tournamentId, winnerAddress, loserAddress, winnerScore, loserScore } = req.body;

        if (!tournamentId || !winnerAddress || !loserAddress || winnerScore === undefined || loserScore === undefined) {
            return res.status(400).send({ error: 'Missing tournament result data.' });
        }

        // Chamar a função da blockchain-service para registar o resultado
        const result = await recordTournamentResultBlockchain(
            tournamentId,
            winnerAddress,
            loserAddress,
            winnerScore,
            loserScore
        );

        if (result.success) {
            return res.status(200).send({
                message: 'Tournament result recorded successfully on blockchain!',
                transactionHash: result.transactionHash
            });
        } else {
            // Pode haver erros de validação do contrato (ex: "Tournament result already recorded.")
            return res.status(500).send({
                error: 'Failed to record tournament result on blockchain.',
                details: result.error
            });
        }
    });

    // Exemplo de rota para obter um resultado de torneio
    fastify.get('/results/:tournamentId', async (req, res) => {
        const { tournamentId } = req.params;
        const id = parseInt(tournamentId, 10);

        if (isNaN(id)) {
            return res.status(400).send({ error: 'Invalid Tournament ID.' });
        }

        const result = await getTournamentResultBlockchain(id);

        if (result) {
            return res.status(200).send(result);
        } else {
            return res.status(404).send({ error: 'Tournament result not found or an error occurred.' });
        }
    });

    done();
};

export default tournamentController;
