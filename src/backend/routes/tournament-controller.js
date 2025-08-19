// src/backend/routes/tournament-controller.js

import { recordTournamentResultBlockchain, getTournamentResultBlockchain } from '../blockchain-service.js';

const tournamentController = (fastify, options, done) => {

    // Example route to record a tournament result
    fastify.post('/record-result', async (req, res) => {
    // Suppose the POST request body contains these fields:
        // {
        //   "tournamentId": 1,
    //   "winnerAddress": "0xGanacheAccountAddress1", // Address of a Ganache account
    //   "loserAddress": "0xGanacheAccountAddress2",  // Address of another Ganache account
        //   "winnerScore": 11,
        //   "loserScore": 5
        // }
        const { tournamentId, winnerAddress, loserAddress, winnerScore, loserScore } = req.body;

        if (!tournamentId || !winnerAddress || !loserAddress || winnerScore === undefined || loserScore === undefined) {
            return res.status(400).send({ error: 'Missing tournament result data.' });
        }

    // Call the blockchain-service function to record the result
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
            // There may be contract validation errors (e.g., "Tournament result already recorded.")
            return res.status(500).send({
                error: 'Failed to record tournament result on blockchain.',
                details: result.error
            });
        }
    });

    // Example route to get a tournament result
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
