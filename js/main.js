/**
 * NeoNetrek Global Website - Main JavaScript
 *
 * Handles: starfield animation, server list rendering,
 * nav behavior, and smooth scrolling.
 */

(function () {
  'use strict';

  // ---------- Starfield ----------
  const canvas = document.getElementById('starfield');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let stars = [];
    const STAR_COUNT = 200;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initStars() {
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          speed: Math.random() * 0.3 + 0.05,
          brightness: Math.random(),
          twinkleSpeed: Math.random() * 0.02 + 0.005,
        });
      }
    }

    function drawStars() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = Date.now() * 0.001;

      for (const star of stars) {
        const flicker = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed * 60 + star.brightness * 10);
        const alpha = 0.3 + 0.7 * flicker;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,240,${alpha})`;
        ctx.fill();

        // Slow drift
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      }
      requestAnimationFrame(drawStars);
    }

    window.addEventListener('resize', () => { resizeCanvas(); initStars(); });
    resizeCanvas();
    initStars();
    drawStars();
  }

  // ---------- Utility ----------
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function safeUrl(url) {
    try {
      var parsed = new URL(url, location.href);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
    } catch (e) { /* invalid URL */ }
    return '';
  }

  // ---------- Server List ----------
  const SAMPLE_SERVERS = [
    {
      name: 'Example Server 1',
      url: '',
      location: 'New York, US',
      description: 'A sample entry -- add your own server to servers.js to replace these.',
    },
    {
      name: 'Example Server 2',
      url: '',
      location: 'Frankfurt, DE',
      description: 'Another sample entry showing how the server list looks when populated.',
    },
    {
      name: 'Example Server 3',
      url: '',
      location: 'Tokyo, JP',
      description: 'Servers with a URL will be polled for live status and player count.',
    },
  ];

  function getServers() {
    if (
      Array.isArray(window.NEONETREK_SERVERS) &&
      window.NEONETREK_SERVERS.length > 0
    ) {
      return window.NEONETREK_SERVERS;
    }
    return SAMPLE_SERVERS;
  }

  function serverCardId(server) {
    return 'server-' + escapeHtml(server.name || 'Unnamed Server')
      .replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  }

  function renderServerCard(server) {
    const name = escapeHtml(server.name || 'Unnamed Server');
    const location = escapeHtml(server.location || 'Unknown');
    const description = escapeHtml(server.description || '');
    const id = serverCardId(server);

    const baseUrl = server.url ? safeUrl(server.url.replace(/\/+$/, '')) : '';
    const playUrl = baseUrl ? escapeHtml(baseUrl + '/play/') : '';

    const joinBtn = playUrl
      ? `<a class="server-join-btn" href="${playUrl}" target="_blank" rel="noopener noreferrer">Play in Browser</a>`
      : `<span class="server-join-btn server-join-disabled">No URL</span>`;

    const portalBtn = baseUrl
      ? `<a class="server-portal-btn" href="${escapeHtml(baseUrl)}" target="_blank" rel="noopener noreferrer">Leaderboard</a>`
      : '';

    const established = server.established
      ? `<div class="server-established">Est. ${escapeHtml(server.established)}</div>`
      : '';

    const features = Array.isArray(server.features) && server.features.length > 0
      ? `<div class="server-features">${server.features.map(f => `<span class="server-feature-tag">${escapeHtml(f)}</span>`).join('')}</div>`
      : '';

    return `<div class="server-card" id="${id}">
      <div class="server-name">${name}</div>
      <div class="server-location">&gt; ${location}</div>
      ${established}
      <div class="server-desc">${description}</div>
      ${features}
      <div class="server-status">
        <span class="status-dot status-unknown"></span>
        <span class="status-text">Checking...</span>
        <span class="player-count"></span>
      </div>
      <div class="server-latency">
        <span class="latency-bars">
          <span class="latency-bar bar-1"></span>
          <span class="latency-bar bar-2"></span>
          <span class="latency-bar bar-3"></span>
          <span class="latency-bar bar-4"></span>
        </span>
        <span class="latency-text">Measuring...</span>
      </div>
      <div class="server-instances"></div>
      <div class="server-actions">
        ${joinBtn}
        ${portalBtn}
      </div>
    </div>`;
  }

  function renderInstances(card, instances, serverUrl) {
    const container = card.querySelector('.server-instances');
    if (!container || !Array.isArray(instances) || instances.length <= 1) return;

    const baseUrl = safeUrl(serverUrl.replace(/\/+$/, ''));
    if (!baseUrl) return;

    container.innerHTML = `<div class="instance-list-label">Game Modes</div>` +
      instances.map(function (inst) {
        const playerCount = inst.connections || 0;
        const playerText = playerCount === 1 ? '1 player' : playerCount + ' players';
        const features = (inst.features || []).map(function (f) {
          return '<span class="server-feature-tag">' + escapeHtml(f) + '</span>';
        }).join('');

        return '<div class="server-instance">' +
          '<div class="instance-header">' +
            '<span class="instance-name">' + escapeHtml(inst.name) + '</span>' +
            '<span class="instance-players">' + playerText + '</span>' +
          '</div>' +
          (inst.description ? '<div class="instance-desc">' + escapeHtml(inst.description) + '</div>' : '') +
          (features ? '<div class="instance-features">' + features + '</div>' : '') +
          '<a class="server-join-btn server-join-small" href="' +
            escapeHtml(baseUrl + '/play/?server=' + encodeURIComponent(inst.id)) +
            '" target="_blank" rel="noopener noreferrer">Play</a>' +
          '</div>';
      }).join('');

    // Hide main Play button when per-instance buttons are shown
    const mainPlayBtn = card.querySelector('.server-actions > .server-join-btn');
    if (mainPlayBtn) mainPlayBtn.style.display = 'none';
  }

  function updateLatencyDisplay(card, latencyMs) {
    var barsEl = card.querySelector('.latency-bars');
    var textEl = card.querySelector('.latency-text');
    if (!barsEl || !textEl) return;

    var level; // 0=timeout, 1=high, 2=medium, 3=good, 4=excellent
    var colorClass;
    if (latencyMs < 0) {
      // Offline / failed
      level = 0;
      colorClass = 'latency-none';
      textEl.textContent = '--';
    } else if (latencyMs < 80) {
      level = 4;
      colorClass = 'latency-excellent';
      textEl.textContent = latencyMs + ' ms';
    } else if (latencyMs < 150) {
      level = 3;
      colorClass = 'latency-good';
      textEl.textContent = latencyMs + ' ms';
    } else if (latencyMs < 250) {
      level = 2;
      colorClass = 'latency-medium';
      textEl.textContent = latencyMs + ' ms';
    } else {
      level = 1;
      colorClass = 'latency-high';
      textEl.textContent = latencyMs + ' ms';
    }

    barsEl.className = 'latency-bars ' + colorClass + ' latency-level-' + level;
  }

  function sortServersByLatency(grid) {
    var cards = Array.from(grid.querySelectorAll('.server-card'));
    cards.sort(function (a, b) {
      var la = parseInt(a.getAttribute('data-latency') || '99999', 10);
      var lb = parseInt(b.getAttribute('data-latency') || '99999', 10);
      return la - lb;
    });
    cards.forEach(function (card) { grid.appendChild(card); });
  }

  var renderGeneration = 0;

  function renderServers() {
    const grid = document.getElementById('servers-grid');
    if (!grid) return;

    const generation = ++renderGeneration;
    const servers = getServers();
    grid.innerHTML = servers.map(renderServerCard).join('');

    var pendingLatency = 0;

    // Probe each server for health status, latency, and instances
    servers.forEach((server) => {
      if (!server.url) return;

      const baseUrl = safeUrl(server.url.replace(/\/+$/, ''));
      if (!baseUrl) return;

      const id = serverCardId(server);
      const card = document.getElementById(id);
      if (!card) return;

      const dot = card.querySelector('.status-dot');
      const text = card.querySelector('.status-text');
      const count = card.querySelector('.player-count');

      pendingLatency++;

      // Abort requests that take longer than 8 seconds
      var controller = new AbortController();
      var timeoutId = setTimeout(function () { controller.abort(); }, 8000);

      // Measure latency via health endpoint timing
      const t0 = performance.now();
      const healthReq = fetch(baseUrl + '/health', { mode: 'cors', signal: controller.signal })
        .then((r) => {
          const latency = Math.round(performance.now() - t0);
          if (!r.ok) throw new Error('not ok');
          return r.json().then(function (data) {
            data._latency = latency;
            return data;
          });
        });

      const instancesReq = fetch(baseUrl + '/api/instances', { mode: 'cors', signal: controller.signal })
        .then((r) => { if (!r.ok) throw new Error('not ok'); return r.json(); })
        .catch(() => null);

      healthReq
        .then((data) => {
          if (generation !== renderGeneration) return;
          dot.classList.remove('status-unknown');
          dot.classList.add('status-online');
          text.textContent = 'Online';

          var n = data.connections ?? data.players ?? data.playerCount;
          if (typeof n === 'number') {
            count.textContent = n + (n === 1 ? ' player' : ' players');
          }

          // Update latency display
          card.setAttribute('data-latency', String(data._latency));
          updateLatencyDisplay(card, data._latency);
        })
        .catch(() => {
          if (generation !== renderGeneration) return;
          dot.classList.remove('status-unknown');
          dot.classList.add('status-offline');
          text.textContent = 'Offline';

          card.setAttribute('data-latency', '99999');
          updateLatencyDisplay(card, -1);
        })
        .finally(() => {
          clearTimeout(timeoutId);
          pendingLatency--;
          if (pendingLatency === 0 && generation === renderGeneration) {
            sortServersByLatency(grid);
          }
        });

      // Render instances if the server has multiple game modes
      instancesReq.then((instances) => {
        if (generation !== renderGeneration) return;
        if (instances) {
          renderInstances(card, instances, server.url);

          // Update total player count from instances
          if (Array.isArray(instances) && instances.length > 0) {
            var total = instances.reduce((sum, inst) => sum + (inst.connections || 0), 0);
            count.textContent = total + (total === 1 ? ' player' : ' players');
          }
        }
      });
    });
  }

  // ---------- Nav: close mobile menu on link click ----------
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      document.getElementById('navbar').classList.remove('open');
    });
  });

  // ---------- Nav: highlight active section on scroll ----------
  const sections = document.querySelectorAll('.section, .hero');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  function updateActiveNav() {
    const scrollY = window.scrollY + 100;
    let currentId = '';

    sections.forEach(section => {
      if (section.offsetTop <= scrollY) {
        currentId = section.id;
      }
    });

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === '#' + currentId) {
        link.style.color = 'var(--accent-gold)';
      } else {
        link.style.color = '';
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav);

  // ---------- Nav: highlight current page ----------
  (function highlightCurrentPage() {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
      const linkPage = link.getAttribute('href').split('#')[0];
      if (linkPage === page && !link.classList.contains('btn-play')) {
        link.style.color = 'var(--accent-gold)';
      }
    });
  })();

  // ---------- Init ----------
  window.addEventListener('DOMContentLoaded', () => {
    renderServers();
    updateActiveNav();
  });

  // Re-render when servers.json finishes loading (async from servers.js)
  window.addEventListener('neonetrek:servers', () => {
    renderServers();
  });

  // If DOM already loaded (script order), render immediately
  if (document.readyState !== 'loading') {
    renderServers();
  }
})();
