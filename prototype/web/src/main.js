// main.js - entry point of the Track W web prototype (Demo 0.2: data + tuning_changes_0_2 override).
import { DATA_02 } from './data.js';
import { Game } from './game/game.js';

/* global __BUILD_ID__ */
const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1';
const game = new Game(document.getElementById('app'), DATA_02, {
  debug,
  khoenEnabled: params.get('khoen') !== '0', // feature_khoen (V9): ?khoen=0 tests the K0 fallback
  skipIntro: debug && params.get('intro') === '0', // test-only: ?debug=1&intro=0 skips the cold open (as if held to skip)
  buildId: typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev',
});
game.boot();
if (debug) {
  // Debug/test hook, only exposed with ?debug=1 (used by test/smoke.mjs).
  window.__demo = { ...game.debugApi(), game };
}
