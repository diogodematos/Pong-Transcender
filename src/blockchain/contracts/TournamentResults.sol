// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; // Verifique esta versão com a do seu hardhat.config.js

contract TournamentResults {
    struct Result {
        uint tournamentId;
        address winner;
        address loser;
        uint winnerScore;
        uint loserScore;
        uint timestamp;
    }

    mapping(uint => Result) public results;
    uint[] public registeredTournamentIds;

    event TournamentResultRecorded(
        uint indexed tournamentId,
        address indexed winner,
        address indexed loser,
        uint winnerScore,
        uint loserScore,
        uint timestamp
    );

    function recordTournamentResult(
        uint _tournamentId,
        address _winner,
        address _loser,
        uint _winnerScore,
        uint _loserScore
    ) public {
        require(results[_tournamentId].winner == address(0), "Tournament result already recorded.");

        results[_tournamentId] = Result({
            tournamentId: _tournamentId,
            winner: _winner,
            loser: _loser,
            winnerScore: _winnerScore,
            loserScore: _loserScore,
            timestamp: block.timestamp
        });

        registeredTournamentIds.push(_tournamentId);

        emit TournamentResultRecorded(
            _tournamentId,
            _winner,
            _loser,
            _winnerScore,
            _loserScore,
            block.timestamp
        );
    }

    function getTournamentResult(uint _tournamentId) public view returns (
        uint, address, address, uint, uint, uint
    ) {
        Result storage r = results[_tournamentId];
        require(r.winner != address(0), "Tournament result not found.");
        return (r.tournamentId, r.winner, r.loser, r.winnerScore, r.loserScore, r.timestamp);
    }

    function getTournamentCount() public view returns (uint) {
        return registeredTournamentIds.length;
    }
}
