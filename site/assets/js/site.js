/* kultr.cc — everything interactive on the site, no dependencies.
   Every part is optional: each block looks for its own markup and quietly
   does nothing on pages that do not have it. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  /* ------------------------------------------------------------ nav -- */

  var nav = $('.nav');
  var toggle = $('.nav-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var open = !nav.hasAttribute('data-open');
      nav.toggleAttribute('data-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('.nav-menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.removeAttribute('data-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.hasAttribute('data-open')) {
        nav.removeAttribute('data-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* --------------------------------------------------------- reveal -- */

  var revealables = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealables.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealables.forEach(function (el) {
      el.classList.add('is-in');
    });
  }

  /* ---------------------------------------------------------- accent -- */
  /* The page's accent follows whatever the hero player is playing, and the
     backdrop crossfades between two washes of the artwork, the way the app
     retints itself from album art. */

  var backdropLayers = $$('.backdrop-layer');
  var backdropFront = 0;

  // Fade the incoming layer in over an outgoing one that stays fully opaque
  // until the end, so a crossfade never dips through the background.
  function crossfade(incoming, outgoing, seconds) {
    incoming.style.zIndex = '1';
    outgoing.style.zIndex = '0';
    incoming.style.transition = 'opacity ' + seconds + 's linear';
    outgoing.style.transition = 'opacity 0s linear ' + seconds + 's';
    incoming.classList.add('is-on');
    outgoing.classList.remove('is-on');
  }

  function paint(track, seconds) {
    var dur = reduceMotion ? 0 : seconds;
    root.style.setProperty('--accent-dur', dur + 's');
    root.style.setProperty('--accent', track.accent);
    root.style.setProperty('--accent-2', track.c2);
    if (backdropLayers.length === 2) {
      var next = backdropLayers[1 - backdropFront];
      next.style.setProperty('--c1', track.c1);
      next.style.setProperty('--c2', track.c2);
      crossfade(next, backdropLayers[backdropFront], dur);
      backdropFront = 1 - backdropFront;
    }
  }

  /* ---------------------------------------------------------- player -- */

  // The app's sample library: short tracks, two-tone covers.
  var TRACKS = [
    { title: 'Re-entry', artist: 'Nocturne Machine', album: 'Low Orbit', year: 2019, genre: 'Techno', bpm: 122, key: '7A', c1: '#4b63dc', c2: '#6b2bab', accent: '#7c8cff' },
    { title: 'Aurora I', artist: 'Signal Drift', album: 'Aurora Vanta', year: 2001, genre: 'Techno', bpm: 126, key: '8A', c1: '#df6e3a', c2: '#7f9b23', accent: '#d49a3c' },
    { title: 'Interchange', artist: 'Nocturne Machine', album: 'Midnight Transit', year: 2009, genre: 'Electronic', bpm: 124, key: '9A', c1: '#d93cae', c2: '#a4303e', accent: '#e0559f' },
    { title: 'Null Modem', artist: 'Signal Drift', album: 'Carrier Wave', year: 2024, genre: 'Electronic', bpm: 123, key: '9B', c1: '#8fd33e', c2: '#2ca74e', accent: '#6fcf57' },
    { title: 'Salt Flats', artist: 'The Glass Harbour', album: 'Salt and Static', year: 2017, genre: 'Ambient', bpm: 120, key: '10B', c1: '#2fb09e', c2: '#2c68b4', accent: '#3cb4c4' }
  ];
  var DURATION = 30; // seconds, like the sample library's short tracks
  var OUTRO = 20; // where the blend starts
  var BLEND = DURATION - OUTRO;

  function camelot(k) {
    return { n: parseInt(k, 10), l: k.slice(-1) };
  }
  // Harmonic mixing: same number, or a neighbour with the same letter.
  function compatible(a, b) {
    var x = camelot(a);
    var y = camelot(b);
    if (x.n === y.n) return true;
    var d = Math.abs(x.n - y.n);
    return x.l === y.l && (d === 1 || d === 11);
  }
  function fmt(t) {
    t = Math.max(0, Math.floor(t));
    return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }
  function pct(n) {
    var s = n >= 0 ? '+' : '−';
    return s + Math.abs(n).toFixed(1) + '%';
  }
  // Tempo share at 50%: both tracks move halfway, as InjeKt does by default.
  function planFor(a, b) {
    var shared = Math.round((a.bpm + b.bpm) / 2);
    return {
      shared: shared,
      thisPct: (shared / a.bpm - 1) * 100,
      nextPct: (shared / b.bpm - 1) * 100,
      clash: !compatible(a.key, b.key)
    };
  }

  var player = $('[data-player]');
  if (player) {
    var els = {
      arts: $$('.art', player),
      meta: $('.player-meta', player),
      title: $('.player-title', player),
      sub: $('.player-sub', player),
      chips: $('.player-chips', player),
      fill: $('.track-fill', player),
      now: $('[data-now]', player),
      total: $('[data-total]', player),
      play: $('[data-play]', player),
      next: $('[data-next]', player),
      prev: $('[data-prev]', player),
      injekt: $('.injekt-toggle', player),
      planHead: $('.plan-head', player),
      planDetail: $('.plan-detail', player),
      live: $('[data-live]', player)
    };

    var state = {
      i: 0,
      t: reduceMotion ? 6 : 14,
      playing: false,
      userPaused: false,
      injekt: true,
      blending: false,
      swapped: false,
      visible: true,
      front: 0
    };
    var last = 0;

    var cur = function () {
      return TRACKS[state.i];
    };
    var nxt = function () {
      return TRACKS[(state.i + 1) % TRACKS.length];
    };

    var setArt = function (track, seconds) {
      var incoming = els.arts[1 - state.front];
      var outgoing = els.arts[state.front];
      incoming.style.setProperty('--c1', track.c1);
      incoming.style.setProperty('--c2', track.c2);
      crossfade(incoming, outgoing, reduceMotion ? 0 : seconds);
      state.front = 1 - state.front;
    };

    var renderMeta = function (track, matchedBpm) {
      els.title.textContent = track.title;
      els.sub.textContent = track.artist + ' — ' + track.album;
      var bpm = matchedBpm
        ? '<span class="chip chip-accent">' + matchedBpm + ' BPM</span>'
        : '<span class="chip">' + track.bpm + ' BPM</span>';
      els.chips.innerHTML =
        '<span class="chip">' + track.year + '</span>' +
        '<span class="chip">' + track.genre + '</span>' +
        bpm +
        '<span class="chip">' + track.key + '</span>';
    };

    var swapToken = 0;
    var swapMeta = function (track, matchedBpm) {
      var token = ++swapToken;
      if (reduceMotion) {
        renderMeta(track, matchedBpm);
        return;
      }
      els.meta.classList.add('is-out');
      setTimeout(function () {
        if (token !== swapToken) return;
        renderMeta(track, matchedBpm);
        els.meta.classList.remove('is-out');
      }, 320);
    };

    var renderPlan = function () {
      var a = cur();
      var b = nxt();
      var p = planFor(a, b);
      var head;
      var detail;
      if (!state.injekt) {
        head = state.blending ? 'Crossfading into ' + b.title : 'Up next: ' + b.title;
        detail = 'InjeKt off — a plain ' + BLEND + ' s equal-power crossfade.';
      } else if (p.clash) {
        head = state.blending ? 'Sweeping into ' + b.title : 'Up next: ' + b.title;
        detail = 'Keys ' + a.key + ' and ' + b.key + ' clash, so it filter-sweeps out of this track instead of blending into a muddy chord.';
      } else if (state.blending) {
        head = 'InjeKt → ' + b.title;
        detail = 'Beat-matched at ' + p.shared + ' BPM — this track ' + pct(p.thisPct) + ', the next ' + pct(p.nextPct) + ' · bass swap · ' + a.key + ' → ' + b.key;
      } else {
        head = 'Up next: ' + b.title;
        detail = 'Blend at ' + fmt(OUTRO) + ', meeting at ' + p.shared + ' BPM · keys ' + a.key + ' → ' + b.key;
      }
      els.planHead.textContent = head;
      els.planDetail.textContent = detail;
    };

    var renderClock = function () {
      els.fill.style.width = Math.min(100, (state.t / DURATION) * 100) + '%';
      els.now.textContent = fmt(state.t);
    };

    var setPlaying = function (on) {
      state.playing = on;
      player.classList.toggle('is-playing', on);
      els.play.setAttribute('aria-label', on ? 'Pause' : 'Play');
      els.play.innerHTML = '<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#' + (on ? 'pause' : 'play') + '"></use></svg>';
      if (on) {
        last = performance.now();
        requestAnimationFrame(frame);
      }
    };

    // A blend: the next cover fades in, the page's colour drifts to the next
    // track's over the whole overlap, and the titles change hands halfway.
    var startBlend = function (seconds) {
      state.blending = true;
      state.swapped = false;
      var b = nxt();
      var p = planFor(cur(), b);
      setArt(b, seconds);
      paint(b, seconds);
      if (state.injekt && !p.clash) renderMeta(cur(), p.shared);
      renderPlan();
      if (els.live) els.live.textContent = 'Blending into ' + b.title + ' by ' + b.artist;
    };

    var finishBlend = function () {
      swapToken++;
      els.meta.classList.remove('is-out');
      state.i = (state.i + 1) % TRACKS.length;
      state.blending = false;
      state.swapped = false;
      renderMeta(cur());
      renderPlan();
    };

    var frame = function (now) {
      if (!state.playing) return;
      var dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (state.visible && !document.hidden) {
        state.t += dt;
        if (!state.blending && state.t >= OUTRO) startBlend(BLEND);
        if (state.blending && !state.swapped && state.t >= OUTRO + BLEND / 2) {
          state.swapped = true;
          var b = nxt();
          var p = planFor(cur(), b);
          swapMeta(b, state.injekt && !p.clash ? p.shared : 0);
        }
        if (state.t >= DURATION) {
          // The incoming track has been playing for the whole overlap.
          state.t = BLEND;
          finishBlend();
        }
        renderClock();
      }
      requestAnimationFrame(frame);
    };

    // Skipping is a short blend straight to the start of the next track.
    var skip = function (dir) {
      if (state.blending) finishBlend();
      state.i = (state.i + dir + TRACKS.length) % TRACKS.length;
      var track = cur();
      setArt(track, 0.8);
      paint(track, 0.9);
      swapMeta(track);
      state.t = 0;
      renderClock();
      renderPlan();
      if (els.live) els.live.textContent = 'Now playing ' + track.title + ' by ' + track.artist;
    };

    els.play.addEventListener('click', function () {
      state.userPaused = state.playing;
      setPlaying(!state.playing);
    });
    els.next.addEventListener('click', function () {
      skip(1);
    });
    els.prev.addEventListener('click', function () {
      // Like any player: back to the start first, then the previous track.
      if (state.t > 3 && !state.blending) {
        state.t = 0;
        renderClock();
      } else {
        skip(-1);
      }
    });
    els.injekt.addEventListener('click', function () {
      state.injekt = !state.injekt;
      els.injekt.setAttribute('aria-pressed', String(state.injekt));
      els.injekt.lastChild.textContent = state.injekt ? ' InjeKt on' : ' InjeKt off';
      player.setAttribute('data-injekt', state.injekt ? 'on' : 'off');
      renderPlan();
    });

    // First paint, without a transition.
    var first = cur();
    els.arts[0].style.setProperty('--c1', first.c1);
    els.arts[0].style.setProperty('--c2', first.c2);
    els.arts[0].classList.add('is-on');
    paint(first, 0);
    renderMeta(first);
    renderPlan();
    renderClock();
    els.total.textContent = fmt(DURATION);

    // Only play while someone can see it; never start by itself if motion
    // is reduced.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        state.visible = entries[0].isIntersecting;
        last = performance.now();
      }).observe(player);
    }
    if (!reduceMotion) setPlaying(true);
  }

  /* Pages without the player still take their colour from the sample library:
     each feature section, as it scrolls into view, "plays" one of the covers. */
  if (!player) {
    paint(TRACKS[0], 0);
    var tinted = $$('[data-tint]');
    if (tinted.length && 'IntersectionObserver' in window) {
      var current = -1;
      var tio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var k = parseInt(entry.target.getAttribute('data-tint'), 10) % TRACKS.length;
            if (k === current) return;
            current = k;
            paint(TRACKS[k], 1.6);
          });
        },
        { rootMargin: '-45% 0px -45% 0px' }
      );
      tinted.forEach(function (el) {
        tio.observe(el);
      });
    }
  }

  /* ----------------------------------------------------- screenshots -- */

  var shots = $('[data-shots]');
  if (shots) {
    var tabs = $$('[role="tab"]', shots);
    var imgs = $$('.shots-view img', shots);
    var capTitle = $('[data-cap-title]', shots);
    var capText = $('[data-cap-text]', shots);
    var select = function (n, focus) {
      tabs.forEach(function (tab, k) {
        var on = k === n;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        if (on && focus) tab.focus();
        if (on) {
          capTitle.textContent = tab.getAttribute('data-title');
          capText.textContent = tab.getAttribute('data-text');
          if (tab.scrollIntoView && !focus) {
            var bar = tab.parentElement;
            bar.scrollTo({ left: tab.offsetLeft - bar.clientWidth / 2 + tab.clientWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
          }
        }
      });
      imgs.forEach(function (img, k) {
        img.classList.toggle('is-on', k === n);
      });
    };
    tabs.forEach(function (tab, k) {
      tab.addEventListener('click', function () {
        select(k, false);
      });
      tab.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (e.key === 'Home') d = -k;
        if (e.key === 'End') d = tabs.length - 1 - k;
        if (d) {
          e.preventDefault();
          select((k + d + tabs.length) % tabs.length, true);
        }
      });
    });
  }

  /* --------------------------------------------------- InjeKt diagram -- */
  /* Two decks drawn as DJ-style waveforms: silver for the top end, the
     accent for the bass. Watch the coloured core move from one track to the
     other at the bass swap. */

  var diagram = $('[data-diagram]');
  if (diagram) {
    var seed = 7;
    var rand = function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var BLEND_FROM = 440;
    var BLEND_TO = 700;
    var SWAP = 570;
    var STEP = 5;
    var W = 3;
    var paths = {};
    var add = function (cls, x, cy, h) {
      if (h < 0.6) return;
      (paths[cls] = paths[cls] || []).push('M' + x + ' ' + (cy - h).toFixed(1) + 'h' + W + 'v' + (2 * h).toFixed(1) + 'h-' + W + 'z');
    };
    var lane = function (name, from, to, cy, envelope, bassOn, ghostBefore) {
      var n = 0;
      for (var x = from; x < to; x += STEP, n++) {
        var r = rand();
        var amp = 0.42 + 0.5 * r;
        if (n % 8 === 0) amp = Math.max(amp, 0.94); // the kick on the one
        var ghost = x < ghostBefore;
        if (ghost) amp *= 0.45;
        var h = 44 * amp * envelope(x);
        var bass = h * (0.5 + 0.15 * rand());
        add(name + (ghost ? ' ghost' : ''), x, cy, h);
        add(ghost || !bassOn(x) ? 'bass ghost' : 'bass', x, cy, bass);
      }
    };
    var fadeOut = function (x) {
      if (x < BLEND_FROM) return 1;
      return Math.cos(((x - BLEND_FROM) / (BLEND_TO - BLEND_FROM)) * Math.PI / 2);
    };
    var fadeIn = function (x) {
      if (x < BLEND_FROM) return 0.8;
      if (x > BLEND_TO) return 1;
      return Math.sin(((x - BLEND_FROM) / (BLEND_TO - BLEND_FROM)) * Math.PI / 2);
    };
    lane('hi', 20, BLEND_TO, 110, fadeOut, function (x) { return x < SWAP; }, 0);
    lane('hi', 300, 980, 256, fadeIn, function (x) { return x >= SWAP; }, BLEND_FROM);

    // On a narrow screen the diagram scrolls; start it on the blend.
    var scroller = diagram.parentElement;
    if (scroller.scrollWidth > scroller.clientWidth) {
      scroller.scrollLeft = (diagram.clientWidth * 0.57) - scroller.clientWidth / 2;
    }

    var group = $('[data-waves]', diagram);
    var ns = 'http://www.w3.org/2000/svg';
    Object.keys(paths).forEach(function (cls) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('class', cls);
      p.setAttribute('d', paths[cls].join(''));
      group.appendChild(p);
    });
  }

  /* ------------------------------------------------------- equaliser -- */

  var eq = $('[data-eq]');
  if (eq) {
    var PRESETS = {
      Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
      'Bass Reduce': [-6, -5, -4, -2, 0, 0, 0, 0, 0, 0],
      'Treble Boost': [0, 0, 0, 0, 0, 1, 2, 4, 5, 6],
      Vocal: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
      Acoustic: [4, 3, 2, 0, 1, 1, 2, 3, 3, 2],
      Electronic: [5, 4, 1, 0, -2, 1, 0, 2, 4, 5],
      'Late Night': [-4, -3, -1, 1, 2, 2, 1, 0, -1, -2],
      Loudness: [6, 4, 0, -2, -3, -1, 1, 3, 5, 6]
    };
    var bands = $$('.eq-band', eq);
    var buttons = $$('.preset', eq.parentElement);
    var RANGE = 12; // dB either side
    var apply = function (name) {
      PRESETS[name].forEach(function (gain, k) {
        var band = bands[k];
        var pos = 50 - (gain / RANGE) * 50; // % from the top
        var fill = $('.eq-fill', band);
        var knob = $('.eq-knob', band);
        knob.style.top = pos + '%';
        fill.style.top = Math.min(pos, 50) + '%';
        fill.style.bottom = 100 - Math.max(pos, 50) + '%';
        band.setAttribute('aria-label', band.getAttribute('data-freq') + ' Hz, ' + (gain > 0 ? '+' : '') + gain + ' dB');
      });
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.textContent === name));
      });
    };
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        apply(b.textContent);
      });
    });
    apply('Electronic');
  }

  /* ------------------------------------------------------------ copy -- */

  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = document.getElementById(btn.getAttribute('data-copy'));
      if (!src || !navigator.clipboard) return;
      var text = src.innerText.replace(/^\$ /gm, '');
      navigator.clipboard.writeText(text).then(function () {
        var use = $('use', btn);
        use.setAttribute('href', 'assets/icons.svg#check');
        btn.setAttribute('aria-label', 'Copied');
        setTimeout(function () {
          use.setAttribute('href', 'assets/icons.svg#copy');
          btn.setAttribute('aria-label', 'Copy commands');
        }, 1600);
      });
    });
  });
})();
