/*
 * ToyBox SDK — include this in any toy:
 *   <script src="toybox-sdk.js"></script>
 *
 * A toy is just an HTML page. It runs in a sandboxed iframe, either on top of
 * a video or on its own, and talks to its host through the `ToyBox` object:
 *
 *   ToyBox.onInit(params => { ... })   // params set by the educator
 *   ToyBox.hasVideo                    // false when the toy is used on its own
 *   ToyBox.onTime(t => { ... })        // current video time (≈4×/sec, video only)
 *   ToyBox.pause() / ToyBox.play()     // video only; harmless otherwise
 *   ToyBox.seek(seconds)               // e.g. "rewatch that bit" (video only)
 *   ToyBox.complete({ correct: true }) // learner finished; result is saved
 *   ToyBox.log(anything)               // send analytics/debug data
 *   ToyBox.defaults({...})             // params to use when opened directly
 *
 * When a toy is shown on its own with "fit content" sizing, the SDK reports
 * the page height automatically so the box grows to fit the toy.
 */
(function () {
  var initCbs = [], timeCbs = [];
  var state = { params: null, cue: null, time: 0, duration: 0, paused: true, inPlayer: false, hasVideo: false };

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
      state.hasVideo = !!d.hasVideo;
      state.params = d.params || {};
      state.cue = d.cue;
      document.documentElement.classList.toggle('toybox-has-video', state.hasVideo);
      document.documentElement.classList.toggle('toybox-no-video', !state.hasVideo);
      initCbs.forEach(function (cb) { cb(state.params, state.cue); });
      reportSize();
    } else if (d.type === 'time') {
      state.time = d.time; state.duration = d.duration; state.paused = d.paused;
      timeCbs.forEach(function (cb) { cb(d.time, d); });
    }
  });

  // Tell the host how tall the content is (used for "fit content" sizing).
  var lastH = 0;
  function reportSize() {
    var h = Math.ceil(document.documentElement.scrollHeight);
    if (h && Math.abs(h - lastH) > 1) { lastH = h; send({ type: 'resize', height: h }); }
  }
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(reportSize);
    var watch = function () { if (document.body) ro.observe(document.body); };
    if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch);
  }

  window.ToyBox = {
    get params() { return state.params; },
    get time() { return state.time; },
    get inPlayer() { return state.inPlayer; },
    get hasVideo() { return state.hasVideo; },
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
    // Opened directly (no host answered): use the defaults.
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
