/* Team login on a static site: decrypts members/vault.json in the browser.
   Format and key derivation match tools/team_admin.py. Nothing is sent anywhere or stored:
   the password stays in this page, and the decrypted content lives only in memory. */
'use strict';
(() => {
  const form = document.getElementById('login-form'), status = document.getElementById('login-status');
  const panel = document.getElementById('team-panel'), button = form.querySelector('button[type=submit]');
  const enc = new TextEncoder(), dec = new TextDecoder();
  const bytes = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
  const hex = buffer => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  let vault = null;
  const loadVault = () => vault || (vault = fetch('members/vault.json', {cache: 'no-store'}).then(r => r.ok ? r.json() : null).catch(() => null));

  async function open(name, password) {
    const v = await loadVault();
    if (!v) return {state: 'unavailable'};
    const lower = name.trim().toLowerCase();
    const idSalt = bytes(v.idSalt);
    const id = hex(await crypto.subtle.digest('SHA-256', new Uint8Array([...idSalt, ...enc.encode(lower)]))).slice(0, 24);
    const user = v.users.find(u => u.id === id);
    // Unknown names still pay the full key-derivation cost, so timing does not reveal membership.
    const salt = user ? bytes(user.salt) : crypto.getRandomValues(new Uint8Array(16));
    const base = await crypto.subtle.importKey('raw', enc.encode(lower + '\n' + password), 'PBKDF2', false, ['deriveKey']);
    const memberKey = await crypto.subtle.deriveKey({name: 'PBKDF2', hash: v.kdf.hash, salt, iterations: v.kdf.iterations}, base, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
    if (!user) return {state: 'denied'};
    try {
      const raw = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(user.iv), additionalData: enc.encode(id)}, memberKey, bytes(user.key));
      const contentKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
      const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(v.content.iv), additionalData: enc.encode('kclflowlab-team-v1')}, contentKey, bytes(v.content.data));
      return {state: 'open', content: JSON.parse(dec.decode(plain)), name: lower};
    } catch { return {state: 'denied'}; }
  }

  // ---------- Signed-in view: Schedule (group meetings) and Notes ----------
  const initials = name => name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const today = () => new Date().toISOString().slice(0, 10);
  const day = iso => new Date(iso + 'T12:00:00');
  const fmt = (iso, opts) => day(iso).toLocaleDateString('en-GB', opts);
  function scheduleView(schedule) {
    const sessions = (schedule && schedule.sessions) || [];
    if (!sessions.length) return '<p class="team-empty">—</p>';
    const now = today(), next = sessions.find(s => s.date >= now && s.presenter);
    const card = next ? '<article class="next-meeting"><div class="next-date"><span>' + fmt(next.date, {weekday: 'short'}) + '</span><strong>' + fmt(next.date, {day: 'numeric'}) + '</strong><span>' + fmt(next.date, {month: 'short'}) + '</span></div>' +
      '<div class="next-body"><p class="next-label">Next' + (next.time ? ' · ' + escape(next.time) : '') + '</p><p class="next-presenter"><i>' + escape(initials(next.presenter)) + '</i>' + escape(next.presenter) + '</p>' + (next.topic && next.topic !== 'TBC' ? '<p class="next-topic">' + escape(next.topic) + '</p>' : '') + '</div></article>' : '';
    const rows = sessions.map(s => '<li class="' + (s.date < now ? 'past' : '') + (s === next ? ' is-next' : '') + (s.presenter ? '' : ' off') + '"><time datetime="' + s.date + '">' + fmt(s.date, {day: '2-digit', month: 'short'}) + '<small>' + fmt(s.date, {year: 'numeric'}) + '</small></time>' +
      (s.presenter ? '<span class="who"><i>' + escape(initials(s.presenter)) + '</i>' + escape(s.presenter) + '</span><span class="what">' + escape(s.topic && s.topic !== 'TBC' ? s.topic : '') + '</span>' : '<span class="who muted">' + escape(s.note || '—') + '</span><span class="what"></span>') +
      '<span class="when">' + escape(s.time || '') + '</span></li>').join('');
    return card + '<ol class="rota" aria-label="Group meetings, every two weeks">' + rows + '</ol>';
  }
  function notesView(items) {
    return '<ul class="team-items">' + (items || []).map(item => '<li>' + (item.url ? '<a href="' + escape(item.url) + '" target="_blank" rel="noopener noreferrer">' + escape(item.title) + ' ↗</a>' : '<strong>' + escape(item.title) + '</strong>') + (item.note ? '<p>' + escape(item.note) + '</p>' : '') + '</li>').join('') + '</ul>';
  }
  function render(result) {
    const c = result.content, views = {schedule: () => scheduleView(c.schedule), notes: () => notesView(c.items)};
    panel.innerHTML = '<div class="team-head"><div class="team-tabs" role="tablist" aria-label="Team area">' +
      '<button role="tab" data-view="schedule" aria-selected="true">Schedule</button><button role="tab" data-view="notes" aria-selected="false" tabindex="-1">Notes</button></div>' +
      '<button type="button" id="sign-out" aria-label="Sign out" data-tip="Sign out"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h4v14h-4M10 8l-4 4 4 4M6 12h10"/></svg></button></div><div id="team-view" role="tabpanel" tabindex="-1"></div>';
    const show = view => {
      panel.querySelectorAll('[role=tab]').forEach(t => { const on = t.dataset.view === view; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      document.getElementById('team-view').innerHTML = views[view]();
    };
    panel.querySelectorAll('[role=tab]').forEach((tab, i, tabs) => {
      tab.addEventListener('click', () => show(tab.dataset.view));
      tab.addEventListener('keydown', e => { const step = {ArrowRight: 1, ArrowLeft: -1}[e.key]; if (!step) return; const next = tabs[(i + step + tabs.length) % tabs.length]; next.focus(); show(next.dataset.view); });
    });
    form.hidden = true; panel.hidden = false; document.body.classList.add('signed-in');
    document.getElementById('sign-out').addEventListener('click', () => location.reload());
    show('schedule'); panel.querySelector('[aria-selected=true]').focus();
  }

  if (!window.crypto || !crypto.subtle) { status.textContent = 'Needs a secure (HTTPS) connection'; button.disabled = true; return; }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = form.username.value, password = form.password.value;
    form.password.value = '';
    if (!name.trim() || !password) { status.textContent = ''; form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); return; }
    button.disabled = true; form.classList.add('busy'); status.textContent = '';
    const result = await open(name, password);
    button.disabled = false; form.classList.remove('busy');
    if (result.state === 'open') return render(result);
    status.textContent = result.state === 'unavailable' ? 'Not available yet' : 'Incorrect';
    form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
    form.password.focus();
  });
})();
