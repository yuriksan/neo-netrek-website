/**
 * NeoNetrek Global Leaderboard
 *
 * Fetches /api/global-leaderboard from a nearby server,
 * renders a sortable/searchable table.
 */
(function () {
  'use strict';

  var RANK_NAMES = [
    'Ensign', 'Lieutenant', 'Lt. Commander', 'Commander',
    'Captain', 'Fleet Captain', 'Commodore', 'Rear Admiral', 'Admiral'
  ];
  var RANK_CODES = ['Esgn', 'Lt', 'LtCm', 'Cder', 'Capt', 'FltC', 'Cdor', 'RAdm', 'Admr'];

  var players = [];
  var sortKey = 'total';
  var sortAsc = false;
  var searchFilter = '';

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function serverTag(name) {
    // Extract short label: "NeoNetrek London" → "London"
    var short = name.replace(/^NeoNetrek\s*/i, '') || name;
    return '<span class="server-tag">' + escapeHtml(short) + '</span>';
  }

  function rankDisplay(rank) {
    var r = Math.max(0, Math.min(rank, 8));
    return '<span class="rank-code" title="' + escapeHtml(RANK_NAMES[r]) + '">'
      + escapeHtml(RANK_CODES[r]) + '</span>';
  }

  function renderTable() {
    var tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    var filtered = players;
    if (searchFilter) {
      var q = searchFilter.toLowerCase();
      filtered = players.filter(function (p) {
        return p.name.toLowerCase().indexOf(q) !== -1;
      });
    }

    // Sort
    var sorted = filtered.slice().sort(function (a, b) {
      var va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'string') {
        va = va.toLowerCase();
        vb = vb.toLowerCase();
      }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

    if (sorted.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="leaderboard-loading">'
        + (players.length === 0 ? 'No player data available.' : 'No matching players.')
        + '</td></tr>';
      return;
    }

    var html = '';
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      var elite = p.rank >= 6 ? ' class="rank-elite"' : '';
      html += '<tr' + elite + '>'
        + '<td>' + rankDisplay(p.rank) + '</td>'
        + '<td class="player-name">' + escapeHtml(p.name) + '</td>'
        + '<td>' + serverTag(p.server) + '</td>'
        + '<td class="instance-id">' + escapeHtml(p.instance) + '</td>'
        + '<td class="num">' + p.hours.toFixed(1) + '</td>'
        + '<td class="num">' + p.offense + '</td>'
        + '<td class="num">' + p.bombing + '</td>'
        + '<td class="num">' + p.planets + '</td>'
        + '<td class="num total">' + p.total + '</td>'
        + '</tr>';
    }
    tbody.innerHTML = html;
  }

  function updateSortHeaders() {
    var ths = document.querySelectorAll('.leaderboard-table th.sortable');
    for (var i = 0; i < ths.length; i++) {
      var th = ths[i];
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.getAttribute('data-sort') === sortKey) {
        th.classList.add(sortAsc ? 'sorted-asc' : 'sorted-desc');
      }
    }
  }

  // Pick the nearest server from servers.json by latency
  function fetchLeaderboard() {
    fetch('/servers.json')
      .then(function (r) { return r.json(); })
      .catch(function () { return []; })
      .then(function (servers) {
        if (!Array.isArray(servers) || servers.length === 0) {
          setStatus('No servers configured');
          return;
        }
        tryServers(servers, 0);
      });
  }

  function tryServers(servers, index) {
    if (index >= servers.length) {
      setStatus('All servers unreachable');
      return;
    }

    var server = servers[index];
    var baseUrl = (server.url || '').replace(/\/+$/, '');
    if (!baseUrl) return tryServers(servers, index + 1);

    setStatus('Fetching from ' + (server.name || baseUrl) + '...');

    fetch(baseUrl + '/api/global-leaderboard', { mode: 'cors' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        players = data.players || [];
        renderTable();
        var count = players.length + ' player' + (players.length !== 1 ? 's' : '');
        setStatus(count + ' from ' + (server.name || baseUrl));
        if (data.updated) {
          var el = document.getElementById('leaderboard-updated');
          if (el) el.textContent = 'Last updated: ' + new Date(data.updated).toLocaleString();
        }
      })
      .catch(function () {
        tryServers(servers, index + 1);
      });
  }

  function setStatus(text) {
    var el = document.getElementById('leaderboard-status');
    if (el) el.textContent = text;
  }

  // Sort header clicks
  document.addEventListener('click', function (e) {
    var th = e.target.closest('.sortable');
    if (!th) return;
    var key = th.getAttribute('data-sort');
    if (!key) return;
    if (sortKey === key) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      sortAsc = (key === 'name'); // name sorts A→Z by default, numbers desc
    }
    updateSortHeaders();
    renderTable();
  });

  // Search filter
  var searchInput = document.getElementById('leaderboard-search');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchFilter = this.value;
      renderTable();
    });
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchLeaderboard);
  } else {
    fetchLeaderboard();
  }
})();
