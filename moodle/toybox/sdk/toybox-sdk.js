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
 *   ToyBox.theme                       // the host's theme: colours, font, palette…
 *   ToyBox.color('primary')            // a theme colour (handy for <canvas>)
 *
 * The theme is also set as CSS variables on <html>, so style toys with them:
 *   var(--tb-surface) var(--tb-text) var(--tb-muted) var(--tb-border) var(--tb-grid)
 *   var(--tb-primary) var(--tb-on-primary) var(--tb-accent) var(--tb-link)
 *   var(--tb-success) var(--tb-warning) var(--tb-danger) var(--tb-surface-alt)
 *   var(--tb-c1) … var(--tb-c6) (data colours)  var(--tb-font) var(--tb-radius)
 *   var(--tb-button-radius) var(--tb-shadow)
 *
 * When a toy is shown on its own with "fit content" sizing, the SDK reports
 * the page height automatically so the box grows to fit the toy.
 */
(function () {
  var initCbs = [], timeCbs = [];

  // Default theme (used until the host sends one, or when the toy is opened directly).
  var DEFAULT_THEME = {
    id: 'toybox', mode: 'dark', font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    page: '#0b0f17', surface: '#0b1020', surfaceAlt: '#070b17', text: '#e5e7eb', muted: '#94a3b8',
    border: 'rgba(255, 255, 255, 0.15)', grid: '#1a223c', primary: '#1e3a8a', onPrimary: '#ffffff',
    accent: '#f59e0b', link: '#7aa2ff', success: '#4ade80', warning: '#f59e0b', danger: '#f87171',
    palette: ['#f59e0b', '#22d3ee', '#f472b6', '#a78bfa', '#4ade80', '#60a5fa'],
    radius: '16px', buttonRadius: '999px', shadow: '0 12px 40px rgba(0, 0, 0, 0.65)', band: '#121826', onBand: '#e5e7eb'
  };
  var theme = DEFAULT_THEME;
  var VAR_NAMES = { font: 'font', page: 'page', surface: 'surface', surfaceAlt: 'surface-alt', text: 'text', muted: 'muted',
    border: 'border', grid: 'grid', primary: 'primary', onPrimary: 'on-primary', accent: 'accent', link: 'link',
    success: 'success', warning: 'warning', danger: 'danger', radius: 'radius', buttonRadius: 'button-radius',
    shadow: 'shadow', band: 'band', onBand: 'on-band' };

  function applyTheme(t) {
    theme = t;
    var root = document.documentElement, k;
    for (k in VAR_NAMES) if (t[k]) root.style.setProperty('--tb-' + VAR_NAMES[k], t[k]);
    (t.palette || []).forEach(function (c, i) { root.style.setProperty('--tb-c' + (i + 1), c); });
    root.style.colorScheme = t.mode === 'light' ? 'light' : 'dark';
    root.setAttribute('data-tb-mode', t.mode || 'dark');
    var css = (t.fontFaces || []).map(function (f) {
      // Only data: fonts can load inside the sandbox.
      if (!/^data:/.test(f.url)) return '';
      return '@font-face{font-family:"' + f.family + '";font-weight:' + f.weight + ';font-style:' + (f.style || 'normal') +
        ';font-display:swap;src:url("' + f.url + '")}';
    }).join('');
    // Base styles so even an unstyled toy looks at home.
    css += 'html{font-family:var(--tb-font);color:var(--tb-text)}';
    var el = document.getElementById('toybox-theme');
    if (!el) { el = document.createElement('style'); el.id = 'toybox-theme'; (document.head || root).insertBefore(el, (document.head || root).firstChild); }
    el.textContent = css;
  }
  applyTheme(DEFAULT_THEME);
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
      if (d.theme && typeof d.theme === 'object') applyTheme(d.theme);
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
    get theme() { return theme; },
    /** A theme colour by name ('primary', 'text', 'grid'…) or palette index (0, 1, 2…). */
    color: function (name) {
      if (typeof name === 'number') { var p = theme.palette || []; return p[name % p.length] || '#888'; }
      return theme[name] || DEFAULT_THEME[name] || '#888';
    },
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
