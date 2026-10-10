// After htmx swaps in a page, jump to the section named in the link (for example index.html#work).
document.addEventListener('htmx:afterSettle', function (evt) {
  var info = evt.detail && evt.detail.pathInfo;
  var anchor = info && info.anchor;
  if (!anchor) return;
  setTimeout(function () {
    var el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ block: 'start' });
  }, 30);
});
// If a page cannot be fetched, fall back to a normal page load.
document.addEventListener('htmx:sendError', function (evt) {
  var path = evt.detail && evt.detail.pathInfo && evt.detail.pathInfo.requestPath;
  if (path) window.location.href = path;
});

// Light/dark theme toggle. The choice is remembered in localStorage when available.
document.addEventListener('click', function (evt) {
  var btn = evt.target.closest && evt.target.closest('.theme-toggle');
  if (!btn) return;
  var root = document.documentElement;
  var current = root.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  var next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (e) {}
});

// Creative layer: animated record stream in the hero, count-up metrics, scroll reveal.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = null;
  document.documentElement.classList.add('js');

  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function startStream() {
    if (raf) cancelAnimationFrame(raf);
    var cv = document.querySelector('.stream');
    if (!cv) return;
    var ctx = cv.getContext('2d'), dots = [], lanes = 10, w = 0, h = 0, dpr = window.devicePixelRatio || 1;
    function size() {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    for (var i = 0; i < 70; i++) dots.push({ lane: i % lanes, x: Math.random() * w, v: 0.4 + Math.random() * 1.4 });
    function frame() {
      if (!document.body.contains(cv)) return;
      ctx.clearRect(0, 0, w, h);
      var accent = cssVar('--accent'), rule = cssVar('--rule');
      ctx.strokeStyle = rule; ctx.lineWidth = 1;
      for (var l = 0; l < lanes; l++) {
        var y = (h / (lanes + 1)) * (l + 1);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.fillStyle = accent;
      dots.forEach(function (d) {
        d.x += d.v; if (d.x > w + 4) d.x = -4;
        var y = (h / (lanes + 1)) * (d.lane + 1);
        ctx.globalAlpha = 0.25 + 0.75 * (d.x / w);
        ctx.fillRect(d.x, y - 2, 6, 4);
      });
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    frame();
    window.addEventListener('resize', size);
  }

  function countUp(el) {
    var target = +el.dataset.count, suffix = el.dataset.suffix || '', dec = +(el.dataset.decimals || 0);
    if (reduce) { el.textContent = target.toFixed(dec) + suffix; return; }
    var t0 = performance.now(), dur = 1200;
    (function tick(now) {
      var p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * e).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function observe() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        if (en.target.classList.contains('metrics')) en.target.querySelectorAll('[data-count]').forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.card').forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  function init() { startStream(); observe(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('htmx:afterSettle', init);
})();

// Live local-time widget.
(function () {
  function tick() {
    document.querySelectorAll('.time[data-tz]').forEach(function (el) {
      try { el.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: el.dataset.tz }); } catch (e) {}
    });
  }
  tick(); setInterval(tick, 15000);
  document.addEventListener('htmx:afterSettle', tick);
})();

// Clickable pipeline stages in the system design card.
document.addEventListener('click', function (evt) {
  var btn = evt.target.closest && evt.target.closest('.arch button[data-step]');
  if (!btn) return;
  var card = btn.closest('.sys');
  var tpl = card.querySelector('template[data-step="' + btn.dataset.step + '"]');
  var info = card.querySelector('.arch-info');
  if (!tpl || !info) return;
  card.querySelectorAll('.arch button').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
  info.innerHTML = tpl.innerHTML;
});

// System design category tabs (click and arrow keys).
(function () {
  function select(tab) {
    var list = tab.closest('[role="tablist"]');
    list.querySelectorAll('[role="tab"]').forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  document.addEventListener('click', function (evt) {
    var tab = evt.target.closest && evt.target.closest('.sd-tabs [role="tab"]');
    if (tab) select(tab);
  });
  document.addEventListener('keydown', function (evt) {
    var tab = evt.target.closest && evt.target.closest('.sd-tabs [role="tab"]');
    if (!tab || (evt.key !== 'ArrowRight' && evt.key !== 'ArrowLeft')) return;
    var tabs = Array.prototype.slice.call(tab.parentNode.children);
    var i = tabs.indexOf(tab) + (evt.key === 'ArrowRight' ? 1 : -1);
    var next = tabs[(i + tabs.length) % tabs.length];
    select(next); next.focus(); evt.preventDefault();
  });
})();

// Switch between the systems shown in the system design card.
document.addEventListener('click', function (evt) {
  var btn = evt.target.closest && evt.target.closest('.sys-switch button[data-sys]');
  if (!btn) return;
  var card = btn.closest('.card');
  card.querySelectorAll('.sys-switch button').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
  card.querySelectorAll('.sys[data-sys]').forEach(function (el) { el.hidden = el.dataset.sys !== btn.dataset.sys; });
});
