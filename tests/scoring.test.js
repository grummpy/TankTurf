import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hitPlayer, matchResult, roundBanner, update } from "../src/core/game.js";
import { makeMatch } from "./helpers.js";

describe("scoring, elimination, rounds, and matches", () => {
  it("scores one point per life and eliminates at zero", () => {
    const game = makeMatch({ slots: ["human", "human", "off", "off"] });
    const attacker = game.players[0];
    const victim = game.players[1];
    victim.lives = 3;
    assert.equal(hitPlayer(game, 1, 0), "down");
    assert.equal(victim.lives, 2);
    assert.equal(victim.eliminated, false);
    assert.equal(attacker.score, 1);
    victim.alive = true;
    victim.lives = 1;
    assert.equal(hitPlayer(game, 1, 0), "ko");
    assert.equal(victim.lives, 0);
    assert.equal(victim.eliminated, true);
    assert.equal(attacker.score, 2);
    assert.equal(game.phase, "roundEnd");
    assert.equal(attacker.roundWins, 1);
    assert.equal(roundBanner(game), "GOLD WINS THE ROUND");
  });

  it("ends a 2v2 round only when a whole team is gone", () => {
    const game = makeMatch({ mode: "2v2", roundCount: 3 });
    game.players[2].lives = 1;
    game.players[2].alive = true;
    game.players[3].lives = 1;
    game.players[3].alive = true;
    hitPlayer(game, 2, 0);
    assert.equal(game.phase, "playing");
    assert.equal(game.players[2].eliminated, true);
    hitPlayer(game, 3, 1);
    assert.equal(game.phase, "roundEnd");
    assert.equal(game.winnerTeam, 0);
    assert.equal(game.players[0].roundWins, 1);
    assert.equal(game.players[1].roundWins, 1);
    assert.equal(game.players[2].roundWins, 0);
    assert.equal(roundBanner(game), "WEST WINS THE ROUND");
  });

  it("ignores friendly fire when awarding score", () => {
    const game = makeMatch({ mode: "2v2" });
    const before = game.players[1].lives;
    assert.equal(hitPlayer(game, 1, 0), "friendly");
    assert.equal(game.players[1].lives, before);
    assert.equal(game.players[0].score, 0);
  });

  it("declares a draw when nobody is left", () => {
    const game = makeMatch({ slots: ["human", "human", "off", "off"] });
    for (const player of game.players) {
      if (player.slot === "off") continue;
      player.eliminated = true;
      player.alive = false;
      player.lives = 0;
    }
    update(game);
    assert.equal(game.phase, "roundEnd");
    assert.equal(game.winnerTeam, null);
    assert.equal(game.players[0].roundWins, 0);
    assert.equal(roundBanner(game), "DRAW");
  });

  it("plays the requested number of rounds and ranks the match", () => {
    const game = makeMatch({
      slots: ["human", "human", "off", "off"],
      roundCount: 2,
      roundEndTicks: 1,
    });
    const finishRound = (winner) => {
      const loser = winner === 0 ? 1 : 0;
      game.players[loser].lives = 1;
      game.players[loser].alive = true;
      game.players[loser].eliminated = false;
      hitPlayer(game, loser, winner);
      assert.equal(game.phase, "roundEnd");
      update(game);
    };
    finishRound(0);
    assert.equal(game.phase, "playing");
    assert.equal(game.round, 2);
    assert.equal(game.players[0].lives, 3);
    assert.equal(game.players[0].score, 1);
    finishRound(0);
    assert.equal(game.phase, "matchEnd");
    const result = matchResult(game);
    assert.equal(result.tie, false);
    assert.equal(result.winner.index, 0);
    assert.equal(result.rows[0].roundWins, 2);
    assert.ok(result.rows[0].roundWins > result.rows[1].roundWins);
  });

  it("breaks a round-win tie with KO score", () => {
    const game = makeMatch({ slots: ["human", "human", "off", "off"], roundCount: 1 });
    game.players[0].roundWins = 1;
    game.players[1].roundWins = 1;
    game.players[0].score = 4;
    game.players[1].score = 2;
    game.phase = "matchEnd";
    const result = matchResult(game);
    assert.equal(result.winner.name, "GOLD");
    game.players[1].score = 4;
    const tied = matchResult(game);
    assert.equal(tied.tie, true);
    assert.equal(tied.winner, null);
  });
});
