/*
 * ToyBox SDK — include this in any toy:
 *   <script src="/toybox-sdk.js"></script>
 *
 * A toy is just an HTML page. It runs in a sandboxed iframe on top of the
 * video, and talks to the player through the `ToyBox` object:
 *
 *   ToyBox.onInit(params => { ... })   // params from the lesson file
 *   ToyBox.onTime(t => { ... })        // current video time (≈4×/sec)
 *   ToyBox.pause() / ToyBox.play()
 *   ToyBox.seek(seconds)               // e.g. "rewatch that bit"
 *   ToyBox.complete({ correct: true }) // learner finished; result is logged
 *   ToyBox.log(anything)               // send analytics/debug data
 *
 * Opening the toy file directly in a browser (outside the player) still works:
 * after a moment, onInit fires with the toy's default params for testing.
 */
(function () {
  var initCbs = [], timeCbs = [];
  var state = { params: null, cue: null, time: 0, duration: 0, paused: true, inPlayer: false };

  function send(msg) {
    msg.toybox = 1;
    if (window.parent !== window) window.parent.postMessage(msg, '*');
    else console.log('[ToyBox]', msg);
  }

  window.addEventListener('message', function (e) {
    if (e.source !== window.parent) return;
    var d = e.data;
    if (!d || d.toybox !== 1) return;
    if (d.type === 'init') {
      state.inPlayer = true;
      state.params = d.params || {};
      state.cue = d.cue;
      initCbs.forEach(function (cb) { cb(state.params, state.cue); });
    } else if (d.type === 'time') {
      state.time = d.time; state.duration = d.duration; state.paused = d.paused;
      timeCbs.forEach(function (cb) { cb(d.time, d); });
    }
  });

  window.ToyBox = {
    get params() { return state.params; },
    get time() { return state.time; },
    get inPlayer() { return state.inPlayer; },
    onInit: function (cb) {
      initCbs.push(cb);
      if (state.params) cb(state.params, state.cue);
    },
    onTime: function (cb) { timeCbs.push(cb); },
    pause: function () { send({ type: 'pause' }); },
    play: function () { send({ type: 'play' }); },
    seek: function (t) { send({ type: 'seek', time: Number(t) }); },
    complete: function (result) { send({ type: 'complete', result: result }); },
    log: function (data) { send({ type: 'log', data: data }); },
    /** Defaults used when the toy is opened on its own for testing. */
    defaults: function (p) { state.defaults = p; },
  };

  function ready() {
    send({ type: 'ready' });
    // Standalone mode: no player answered, so use defaults.
    setTimeout(function () {
      if (!state.params) {
        state.params = state.defaults || {};
        initCbs.forEach(function (cb) { cb(state.params, null); });
      }
    }, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
