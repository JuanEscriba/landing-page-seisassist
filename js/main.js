/* SeisAssist 3.0.0 · Frontend académico. Sin transporte Bluetooth ni backend. */
(function () {
  'use strict';
  const VERSION = 3;
  const CARE = { pending: 'Pendiente', care: 'En atención', done: 'Atendida' };
  const PRIORITY = { none: 'Sin prioridad asignada', red: 'Rojo', yellow: 'Amarillo', green: 'Verde', black: 'Negro' };
  const CONDITIONS = ['Movilidad reducida', 'Discapacidad auditiva', 'Discapacidad visual', 'Sensibilidad sensorial', 'Discapacidad cognitiva', 'Condición crónica'];
  const BLOOD = ['Desconocido', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const isText = (v, max) => typeof v === 'string' && v.length <= max;
  const isDate = v => typeof v === 'string' && Number.isFinite(Date.parse(v));
  const isBool = v => typeof v === 'boolean';
  const isObject = v => Boolean(v && typeof v === 'object' && !Array.isArray(v));

  function freshState() {
    return { version: VERSION, revision: 0, profile: null, location: null, voicePhrase: 'SeisAssist, ayuda', sos: null, examples: [] };
  }
  function validProfile(p) {
    return isObject(p) && isText(p.name, 80) && p.name.trim().length > 0 && Number.isInteger(p.age) && p.age >= 0 && p.age <= 120 && BLOOD.includes(p.blood) &&
      isText(p.medications, 200) && isText(p.allergies, 200) && isBool(p.noAllergies) && (p.noAllergies ? p.allergies === '' : p.allergies.trim().length > 0) &&
      Array.isArray(p.conditions) && p.conditions.length <= CONDITIONS.length && p.conditions.every(c => CONDITIONS.includes(c)) && new Set(p.conditions).size === p.conditions.length &&
      isBool(p.noConditions) && isText(p.otherCondition, 100) && (p.noConditions ? p.conditions.length === 0 && p.otherCondition === '' : p.conditions.length > 0 || p.otherCondition.trim().length > 0) &&
      isText(p.equipment, 120) && isText(p.instructions, 200) && isBool(p.noInstructions) && (!p.noInstructions || p.instructions === '') && isBool(p.consent) && isDate(p.updatedAt);
  }
  function validLocation(l) {
    return isObject(l) && Number.isFinite(l.lat) && Math.abs(l.lat) <= 90 && Number.isFinite(l.lng) && Math.abs(l.lng) <= 180 && isDate(l.at) && ['gps', 'example'].includes(l.source) && (l.accuracy === null || Number.isFinite(l.accuracy) && l.accuracy >= 0);
  }
  function validAlert(a) {
    return isObject(a) && /^S6-(LOCAL|[0-9]{4})$/.test(a.id) && (a.profile === null || validProfile(a.profile) && a.profile.consent) &&
      (a.location === null || validLocation(a.location)) && isDate(a.detectedAt) && isBool(a.reviewed) && Object.hasOwn(CARE, a.care) && Object.hasOwn(PRIORITY, a.priority) &&
      (a.receipt === null || isObject(a.receipt) && isText(a.receipt.by, 100) && a.receipt.by.length > 0 && isDate(a.receipt.at)) && (a.care === 'pending' || a.receipt !== null);
  }
  function validateState(s) {
    if (!isObject(s) || s.version !== VERSION || !Number.isSafeInteger(s.revision) || s.revision < 0 || !(s.profile === null || validProfile(s.profile)) || !(s.location === null || validLocation(s.location)) || !isText(s.voicePhrase, 80) || !s.voicePhrase.trim() || !Array.isArray(s.examples) || s.examples.length > 3) return false;
    if (!s.examples.every(a => validAlert(a) && a.id !== 'S6-LOCAL') || new Set(s.examples.map(a => a.id)).size !== s.examples.length) return false;
    if (s.sos !== null && (!validAlert(s.sos) || s.sos.id !== 'S6-LOCAL' || !['failed', 'emitting', 'confirmed'].includes(s.sos.phase) || !isDate(s.sos.attemptedAt) ||
        (s.sos.phase === 'confirmed') !== (s.sos.receipt !== null) || s.sos.phase === 'failed' && s.sos.care !== 'pending')) return false;
    if (s.sos?.profile && !s.profile?.consent) return false;
    return true;
  }
  // HU-01/03/04/15. El paquete se toma una vez; un reintento no lo regenera.
  function activate(s, fail, at = now()) {
    if (s.sos && s.sos.phase !== 'failed') return false;
    if (!s.sos) {
      s.sos = { id: 'S6-LOCAL', profile: s.profile?.consent ? clone(s.profile) : null, location: clone(s.location), detectedAt: at, attemptedAt: at, reviewed: false, care: 'pending', priority: 'none', receipt: null, phase: 'failed' };
    }
    s.sos.attemptedAt = at;
    s.sos.phase = fail ? 'failed' : 'emitting';
    if (!fail) s.sos.detectedAt = at;
    return true;
  }
  // HU-05/30/48. Un acuse no inicia atención y no puede duplicarse.
  function confirmReceipt(a, at = now()) {
    if (!a || a.receipt || a.phase === 'failed') return false;
    a.receipt = { by: 'Brigadista Demo · B-12', at };
    a.reviewed = true;
    if (a.id === 'S6-LOCAL') a.phase = 'confirmed';
    return true;
  }
  // HU-46: revocar elimina el perfil del paquete, incluso si hubo fallo previo.
  function revoke(s) {
    if (s.profile) { s.profile.consent = false; s.profile.updatedAt = now(); }
    if (s.sos) s.sos.profile = null;
  }
  function saveProfile(s, profile) {
    s.profile = clone(profile);
    if (!profile.consent) revoke(s);
    else if (s.sos && s.sos.phase !== 'failed') s.sos.profile = clone(profile);
  }
  function exampleState() {
    const s = freshState();
    const at = '2026-11-19T18:00:00.000Z';
    s.profile = { name: 'Carlos · caso ficticio', age: 42, blood: 'O+', medications: '', allergies: 'Alergia ficticia registrada', noAllergies: false, conditions: ['Movilidad reducida'], otherCondition: '', noConditions: false, equipment: 'Silla de ruedas (dato ficticio)', instructions: 'Ejemplo: explicar cada paso con calma antes del contacto.', noInstructions: false, consent: false, updatedAt: at };
    s.location = { lat: -12.1042, lng: -76.9631, at, source: 'example', accuracy: null };
    const a = { id: 'S6-3105', profile: { ...clone(s.profile), name: 'Alex · caso ficticio', consent: true, noAllergies: true, allergies: '', noInstructions: true, instructions: '' }, location: { ...s.location, lat: -12.1051, lng: -76.9618 }, detectedAt: at, reviewed: true, care: 'care', priority: 'red', receipt: { by: 'Brigadista Demo · B-12', at } };
    s.examples = [a, { id: 'S6-9012', profile: null, location: null, detectedAt: at, reviewed: false, care: 'pending', priority: 'none', receipt: null }, { ...clone(a), id: 'S6-4410', profile: { ...clone(a.profile), name: 'Rosa · caso ficticio', allergies: 'Alergia ficticia B', noAllergies: false }, location: { ...s.location, lat: -12.1030, lng: -76.9649 }, care: 'done', priority: 'yellow' }];
    return s;
  }
  function coordinates(alerts) {
    const located = alerts.filter(a => a.location);
    if (!located.length) return { markers: [], bounds: null };
    const lats = located.map(a => a.location.lat), lngs = located.map(a => a.location.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const dy = Math.max(maxLat - minLat, .001), dx = Math.max(maxLng - minLng, .001);
    const midLat = (maxLat + minLat) / 2, midLng = (maxLng + minLng) / 2;
    const groups = new Map();
    // Coordenadas coincidentes: un solo marcador abre una selección, sin tapar controles.
    located.forEach(a => {
      const key = `${a.location.lat.toFixed(4)},${a.location.lng.toFixed(4)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    });
    const markers = [...groups.values()].map(items => ({ items, x: 50 + (items[0].location.lng - midLng) / dx * 60, y: 50 - (items[0].location.lat - midLat) / dy * 60 }));
    // Agrupar también puntos próximos: 52 px de separación en el mapa mínimo
    // (210 × 304). El grupo conserva todos los casos en el listado accesible.
    let merged = true;
    while (merged) {
      merged = false;
      outer: for (let i = 0; i < markers.length; i++) for (let j = i + 1; j < markers.length; j++) {
        const a = markers[i], b = markers[j];
        if (Math.abs(a.x - b.x) * 2.1 < 52 && Math.abs(a.y - b.y) * 3.04 < 52) {
          const total = a.items.length + b.items.length;
          a.x = (a.x * a.items.length + b.x * b.items.length) / total;
          a.y = (a.y * a.items.length + b.y * b.items.length) / total;
          a.items.push(...b.items); markers.splice(j, 1); merged = true; break outer;
        }
      }
    }
    return { markers, bounds: { minLat, maxLat, minLng, maxLng } };
  }
  // Exportación exclusiva para pruebas Node; no añade APIs globales al navegador.
  if (typeof module !== 'undefined' && module.exports) { module.exports = { freshState, exampleState, validateState, validProfile, validLocation, activate, confirmReceipt, revoke, saveProfile, coordinates }; return; }

  document.documentElement.classList.add('js');
  const $ = id => document.getElementById(id);
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = name => `<img class="icon" src="../assets/icons/${name}.svg" alt="">`;
  const date = value => value ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value)) : 'Sin registro';
  const rootURL = new URL('../', location.href);
  const KEY = `seisassist:v3:${rootURL.pathname}`;
  let state = freshState(), persisted = false, dirty = false, activeRole = 'persona', selected = null, filter = 'all', dialogAction = null, dialogOrigin = null;
  let storageBaseline = null, conflict = false, gpsRequest = 0;

  function warning(message) { $('storage-warning').hidden = !message; $('storage-warning').textContent = message ? `⚠ ${message}` : ''; }
  try {
    const raw = localStorage.getItem(KEY);
    storageBaseline = raw;
    if (raw) {
      const candidate = JSON.parse(raw);
      if (!validateState(candidate)) throw new Error('invalid-state');
      state = candidate;
      persisted = true;
    }
  } catch (error) {
    warning('No se pudo leer una copia local válida. Se abre una sesión vacía; los datos anteriores no se sobrescriben hasta que guardes o confirmes un reinicio.');
  }
  function announce(message) {
    $('live').textContent = '';
    requestAnimationFrame(() => { $('live').textContent = message; });
  }
  function changedElsewhere() {
    try { return localStorage.getItem(KEY) !== storageBaseline; } catch { return false; }
  }
  function canMutate() {
    if (conflict || changedElsewhere()) {
      conflict = true; $('tab-conflict').hidden = false;
      announce('Otra pestaña cambió los datos. Recarga antes de continuar.');
      return false;
    }
    return true;
  }
  function persist() {
    state.revision++;
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(KEY, serialized);
      storageBaseline = serialized;
      persisted = true; warning(''); return true;
    } catch {
      persisted = false;
      warning('No se pudo guardar en este navegador. Los cambios existen solo en esta sesión; se perderán al cerrar o recargar. Reintenta guardar cuando el almacenamiento esté disponible.');
      return false;
    }
  }
  function commit(message) {
    const ok = persist(); renderAll();
    announce(`${message} ${ok ? 'Guardado localmente.' : 'Solo en esta sesión; no se pudo guardar.'}`);
    return ok;
  }
  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return;
    conflict = true; $('tab-conflict').hidden = false;
    announce('Otra pestaña cambió los datos; recarga antes de continuar.');
  });

  // Diálogo nativo: fondo inerte, Tab contenido, Escape y devolución de foco.
  function confirm(title, description, action, label = 'Confirmar') {
    dialogOrigin = document.activeElement;
    $('dialog-title').textContent = title; $('dialog-description').textContent = description;
    $('dialog-confirm').textContent = label; dialogAction = action;
    $('confirm-dialog').returnValue = 'cancel'; $('confirm-dialog').showModal(); $('dialog-cancel').focus();
  }
  $('confirm-dialog').addEventListener('close', () => {
    const action = dialogAction; dialogAction = null;
    if (dialogOrigin?.isConnected) dialogOrigin.focus();
    if ($('confirm-dialog').returnValue === 'confirm' && action) action();
  });
  $('confirm-dialog').addEventListener('cancel', () => { $('confirm-dialog').returnValue = 'cancel'; });
  $('confirm-dialog').addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === $('dialog-cancel')) { e.preventDefault(); $('dialog-confirm').focus(); }
    else if (!e.shiftKey && document.activeElement === $('dialog-confirm')) { e.preventDefault(); $('dialog-cancel').focus(); }
  });

  function closeMenu(returnFocus = false) {
    $('nav-menu').classList.remove('is-open'); $('menu-toggle').setAttribute('aria-expanded', 'false'); $('menu-toggle').textContent = 'Abrir menú';
    if (returnFocus) $('menu-toggle').focus();
  }
  $('menu-toggle').addEventListener('click', () => {
    const open = $('nav-menu').classList.toggle('is-open'); $('menu-toggle').setAttribute('aria-expanded', String(open)); $('menu-toggle').textContent = open ? 'Cerrar menú' : 'Abrir menú';
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('nav-menu').classList.contains('is-open') && !$('confirm-dialog').open) closeMenu(true); });
  document.addEventListener('click', e => { if (!e.target.closest('.site-header')) closeMenu(); });
  const navBreakpoint = matchMedia('(max-width: 63.99rem)');
  navBreakpoint.addEventListener('change', () => closeMenu());
  document.querySelectorAll('#nav-menu a').forEach(a => a.addEventListener('click', () => {
    closeMenu(); const target = document.querySelector(a.getAttribute('href')); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
  }));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) document.querySelectorAll('#nav-menu a').forEach(a => {
        if (a.hash === `#${entry.target.id}`) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-5% 0px -70% 0px' });
    document.querySelectorAll('main > section').forEach(section => observer.observe(section));
  }
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function switchRole(role, scroll = false) {
    const apply = () => {
      activeRole = role;
      tabs.forEach(t => { const on = t.id === `tab-${role}`; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; $(t.getAttribute('aria-controls')).hidden = !on; });
      $(`tab-${role}`).focus({ preventScroll: true });
      if (scroll) $('plataforma').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    if (role !== activeRole && activeRole === 'cuidador' && dirty) confirm('Cambios sin guardar', 'Si cambias de rol se descartará el borrador. La última versión guardada se conserva.', () => { populateForm(); apply(); }, 'Descartar y cambiar');
    else apply();
  }
  const tabLayout = matchMedia('(min-width: 75rem)');
  const tabMobile = matchMedia('(max-width: 47.99rem)');
  function tabOrientation() { document.querySelector('[role="tablist"]').setAttribute('aria-orientation', tabLayout.matches || tabMobile.matches ? 'vertical' : 'horizontal'); }
  tabLayout.addEventListener('change', tabOrientation); tabMobile.addEventListener('change', tabOrientation); tabOrientation();
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => switchRole(tab.id.slice(4)));
    tab.addEventListener('keydown', e => {
      const vertical = document.querySelector('[role="tablist"]').getAttribute('aria-orientation') === 'vertical';
      const prev = vertical ? 'ArrowUp' : 'ArrowLeft', next = vertical ? 'ArrowDown' : 'ArrowRight';
      if (![prev, next, 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const index = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === next ? 1 : -1) + tabs.length) % tabs.length;
      // Activación manual: mover el foco no descarta formularios ni cambia el rol.
      tabs[index].focus();
    });
  });
  document.querySelectorAll('[data-role-jump]').forEach(button => button.addEventListener('click', e => { e.preventDefault(); switchRole(button.dataset.roleJump, true); }));

  // HU-01/02/03/15: acciones accesibles e idempotentes.
  function emit(retry = false) {
    if (!canMutate()) return;
    if (state.sos && state.sos.phase !== 'failed') { announce('La alerta ya está activa. Se conserva su estado y su acuse.'); return; }
    if (retry) $('fail-emission').checked = false;
    activate(state, $('fail-emission').checked);
    const failed = state.sos.phase === 'failed';
    commit(failed ? 'Fallo local simulado. Puedes reintentar.' : 'SOS de prueba en emisión; aún sin recepción confirmada.');
    if (retry && !failed) $('sos-activate').focus();
  }
  $('sos-activate').addEventListener('click', () => emit()); $('sos-retry').addEventListener('click', () => emit(true));
  $('voice-form').addEventListener('submit', e => {
    e.preventDefault();
    const phrase = $('voice-phrase').value.trim();
    const valid = phrase.length > 0 && phrase.length <= 80;
    $('voice-phrase').setAttribute('aria-invalid', String(!valid));
    if (!valid) { $('voice-feedback').textContent = '⚠ Escribe una frase de 1 a 80 caracteres.'; $('voice-phrase').focus(); return; }
    if (!canMutate()) return;
    state.voicePhrase = phrase; const ok = commit('Frase configurada.');
    $('voice-feedback').textContent = ok ? '✓ Frase guardada localmente.' : '⚠ Frase disponible solo en esta sesión.';
  });
  $('test-voice').addEventListener('click', () => {
    const received = $('voice-test').value.trim().normalize('NFC').toLocaleLowerCase('es');
    const expected = state.voicePhrase.trim().normalize('NFC').toLocaleLowerCase('es');
    const matches = received === expected;
    $('voice-feedback').textContent = matches ? '✓ Coincidencia reconocida en la simulación por texto.' : '⚠ Comando no reconocido. La alerta no cambia. Utiliza la frase configurada completa.';
    if (matches) emit();
  });

  // HU-11/12: una captura real solo se toma de Geolocation; nunca se fabrica al fallar.
  function applyLocation(loc) {
    if (!validLocation(loc) || !canMutate()) return false;
    state.location = loc;
    if (state.sos && state.sos.phase !== 'failed') state.sos.location = clone(loc);
    return commit('Captura histórica actualizada.');
  }
  $('update-location').addEventListener('click', () => {
    if (!canMutate()) return;
    const feedback = $('location-feedback');
    const failure = message => { feedback.textContent = `⚠ ${message} Se conserva la última captura válida, si existe.`; $('update-location').disabled = false; };
    if ($('fail-location').checked) { failure('Fallo GPS simulado.'); return; }
    if (!navigator.geolocation || !isSecureContext) { failure('GPS no disponible. Se necesita HTTPS o localhost y permiso de ubicación.'); return; }
    const request = ++gpsRequest;
    $('update-location').disabled = true; feedback.textContent = 'Solicitando una captura GPS…';
    navigator.geolocation.getCurrentPosition(pos => {
      if (request !== gpsRequest) return;
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, at: new Date(pos.timestamp).toISOString(), source: 'gps', accuracy: pos.coords.accuracy };
      if (!validLocation(loc)) { failure('El dispositivo devolvió coordenadas inválidas.'); return; }
      const ok = applyLocation(loc); $('update-location').disabled = false;
      feedback.textContent = conflict ? '⚠ Otra pestaña cambió los datos. No se aplicó la captura.' : ok ? '✓ Captura GPS guardada con su fecha.' : '⚠ Captura GPS disponible solo en esta sesión.';
    }, error => { if (request === gpsRequest) failure(error.code === 1 ? 'Permiso GPS denegado.' : error.code === 3 ? 'Tiempo de espera GPS agotado.' : 'No se pudo obtener ubicación.'); }, { timeout: 10000, maximumAge: 0, enableHighAccuracy: false });
  });
  $('example-location').addEventListener('click', () => {
    if (!canMutate()) return;
    confirm('Usar coordenadas de ejemplo', 'Reemplaza la captura local con un ejemplo ficticio de Lima. No representa tu ubicación real.', () => {
      gpsRequest++; $('update-location').disabled = false;
      const ok = applyLocation({ lat: -12.1042, lng: -76.9631, at: now(), source: 'example', accuracy: null });
      $('location-feedback').textContent = ok ? '✓ Ejemplo guardado y etiquetado como ficticio.' : '⚠ Ejemplo disponible solo en esta sesión.';
    });
  });

  function profileHTML(p) {
    if (!p) return '<p class="missing">No hay datos de emergencia disponibles en este navegador.</p>';
    return `<dl><dt>Nombre y edad</dt><dd>${escape(p.name)} · ${p.age} años</dd><dt>Tipo de sangre</dt><dd>${escape(p.blood)}</dd><dt>Alergias</dt><dd>${escape(p.noAllergies ? 'Sin alergias conocidas (declarado)' : p.allergies)}</dd><dt>Medicación</dt><dd>${escape(p.medications || 'Información no disponible')}</dd><dt>Condiciones y movilidad</dt><dd>${escape(p.noConditions ? 'Sin condiciones conocidas (declarado)' : [...p.conditions, p.otherCondition].filter(Boolean).join(' · '))}</dd><dt>Equipo de asistencia declarado</dt><dd>${escape(p.equipment || 'Información no disponible')}</dd><dt>Instrucciones antes del contacto</dt><dd>${escape(p.noInstructions ? 'No aplica (declarado)' : p.instructions || 'Información no disponible')}</dd><dt>Autorización</dt><dd>${p.consent ? 'Autorizado para la vista Rescatista' : 'No autorizado: señal básica sin datos médicos'}</dd><dt>Actualización local</dt><dd>${date(p.updatedAt)}</dd></dl>`;
  }
  function statusHTML() {
    const a = state.sos;
    if (!a) return `${icon('shield')}<div class="status-text"><strong>Sin SOS activo</strong><p>No hay eventos de alerta registrados.</p></div>`;
    const title = a.phase === 'failed' ? 'Fallo de emisión de prueba' : a.phase === 'confirmed' ? 'Recepción confirmada de prueba' : 'En emisión de prueba · sin acuse';
    const text = a.phase === 'failed' ? 'No se emitió el paquete. Reintenta con los mismos datos.' : a.phase === 'confirmed' ? `Acuse de ${a.receipt.by}. No implica rescate iniciado ni llegada de ayuda.` : 'Aún no existe confirmación del rol Rescatista.';
    return `${icon(a.phase === 'confirmed' ? 'check' : 'alert')}<div class="status-text"><strong>${title}</strong><p>${escape(text)}</p><p>${a.profile ? 'Incluye el perfil ficticio autorizado.' : 'Señal básica: sin datos médicos.'}</p><p>${a.phase === 'failed' ? 'Intento' : 'Última detección local'}: ${date(a.phase === 'failed' ? a.attemptedAt : a.detectedAt)}</p>${a.receipt ? `<p>Acuse: ${date(a.receipt.at)}</p>` : ''}</div>`;
  }
  function renderPersona() {
    ['sos-status', 'family-status'].forEach(id => { $(id).innerHTML = statusHTML(); $(id).className = `notice ${state.sos?.phase === 'failed' ? 'error' : state.sos?.phase === 'confirmed' ? 'success' : 'warning'}`; });
    const active = Boolean(state.sos && state.sos.phase !== 'failed');
    $('sos-activate').setAttribute('aria-disabled', String(active));
    $('sos-button-label').textContent = active ? 'SOS de prueba activo' : 'Activar SOS de prueba';
    $('sos-retry').hidden = state.sos?.phase !== 'failed';
    $('persona-profile').innerHTML = profileHTML(state.profile); $('family-profile').innerHTML = profileHTML(state.profile);
    const l = state.location;
    $('location-data').innerHTML = l ? `<dt>Coordenadas históricas</dt><dd>${l.lat.toFixed(6)}, ${l.lng.toFixed(6)}</dd><dt>Captura</dt><dd>${date(l.at)}</dd><dt>Origen</dt><dd>${l.source === 'gps' ? 'GPS del dispositivo' : 'Ejemplo ficticio; no es tu ubicación'}</dd><dt>Precisión informada</dt><dd>${l.accuracy === null ? 'No disponible en el ejemplo' : `${Math.round(l.accuracy)} metros; no es distancia de rescate`}</dd>` : '<dt>Coordenadas</dt><dd>Información no disponible</dd><dt>Captura</dt><dd>Sin capturas previas</dd>';
    const ready = Boolean(state.profile && state.location && persisted);
    $('readiness').textContent = ready ? '✓ Preparado para la demostración local' : '⚠ Preparación pendiente';
    const checks = [
      [Boolean(state.profile), 'Perfil de emergencia', 'Registrar perfil', 'profile'],
      [Boolean(state.location), 'Captura histórica de ubicación', 'Actualizar ubicación', 'location'],
      [persisted, 'Persistencia en este navegador', 'Reintentar guardado', 'storage']
    ];
    $('diagnostic').innerHTML = checks.map(([ok, label, action, key]) => `<li>${ok ? '✓ Listo' : '⚠ Pendiente'}: ${label}${!ok ? `<br><button type="button" class="button secondary" data-fix="${key}">${action}</button>` : ''}</li>`).join('');
  }
  $('diagnostic').addEventListener('click', e => {
    const button = e.target.closest('[data-fix]'); if (!button) return;
    if (button.dataset.fix === 'profile') switchRole('cuidador', true);
    if (button.dataset.fix === 'location') $('update-location').focus();
    if (button.dataset.fix === 'storage' && canMutate()) { commit('Copia local actualizada.'); $('readiness').setAttribute('tabindex', '-1'); $('readiness').focus(); }
  });

  function alerts() { return [...(state.sos && state.sos.phase !== 'failed' ? [state.sos] : []), ...state.examples]; }
  function filteredAlerts() { return alerts().filter(a => filter === 'all' || a.care === filter); }
  function selectAlert(id) {
    if (!canMutate()) return;
    const a = alerts().find(item => item.id === id); if (!a) return;
    selected = id; a.reviewed = true; persist(); renderRescue(); $('alert-detail').focus(); announce(`Detalle de ${id} abierto. Alerta revisada.`);
  }
  function marker(a, label, x, y) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'marker';
    button.dataset.state = a.care; button.style.left = `${x}%`; button.style.top = `${y}%`;
    button.textContent = label; button.setAttribute('aria-pressed', String(selected === a.id));
    button.setAttribute('aria-label', `${a.id}. ${CARE[a.care]}. Prioridad ${PRIORITY[a.priority]}. Abrir detalle.`);
    button.title = `${a.id} · ${CARE[a.care]} · ${PRIORITY[a.priority]}`;
    button.addEventListener('click', () => selectAlert(a.id)); return button;
  }
  function renderRescue() {
    const list = filteredAlerts();
    if (selected && !list.some(a => a.id === selected)) selected = null;
    ['all', 'pending', 'care', 'done'].forEach(key => { $(`count-${key}`).textContent = alerts().filter(a => key === 'all' || a.care === key).length; });
    $('filter-result').textContent = `${list.length} alertas en el filtro ${filter === 'all' ? 'Todas' : CARE[filter]}.`;
    $('alert-list').innerHTML = list.length ? list.map((a, i) => `<li><button type="button" class="alert-button" data-alert="${a.id}" aria-pressed="${a.id === selected}"><strong>${i + 1}. ${escape(a.id)} · ${escape(a.profile?.name || 'Señal básica')}</strong><span>${a.reviewed ? '✓ Revisada' : '⚠ Nueva'} · ${CARE[a.care]}</span><span>Prioridad: ${PRIORITY[a.priority]}</span><span>${a.receipt ? '✓ Recepción confirmada' : '⚠ Recepción pendiente'}</span><span class="small">Detección de prueba: ${date(a.detectedAt)} · ${a.location ? 'Con coordenadas históricas' : 'Sin coordenadas'}</span></button></li>`).join('') : '<li>Buscando señales… No hay alertas en este filtro.</li>';
    const map = coordinates(list); $('map-markers').replaceChildren(); $('radar-markers').replaceChildren();
    const bounds = map.bounds;
    $('map-bounds').textContent = bounds ? `Norte arriba. Latitud ${bounds.minLat.toFixed(4)} a ${bounds.maxLat.toFixed(4)}; longitud ${bounds.minLng.toFixed(4)} a ${bounds.maxLng.toFixed(4)}. Plano sin calles; ejes con escalas independientes.` : 'Sin coordenadas para representar.';
    map.markers.forEach(m => {
      const index = list.indexOf(m.items[0]) + 1;
      const node = marker(m.items[0], m.items.length > 1 ? `+${m.items.length}` : `${index}${{ pending: 'P', care: 'E', done: 'A' }[m.items[0].care]}`, m.x, m.y);
      if (m.items.length > 1) {
        node.setAttribute('aria-label', `${m.items.length} alertas agrupadas por proximidad: ${m.items.map(a => `${a.id}, ${CARE[a.care]}, ${PRIORITY[a.priority]}`).join('; ')}. Consulta el listado.`);
        node.addEventListener('click', () => { $('map-message').textContent = `Grupo de coordenadas cercanas: ${m.items.map(a => a.id).join(', ')}. Cada alerta se puede abrir por separado en el listado.`; });
      }
      $('map-markers').append(node);
    });
    list.forEach((a, i) => { const pos = [[25, 25], [75, 25], [25, 75], [75, 75]][i]; $('radar-markers').append(marker(a, `${i + 1}${{ pending: 'P', care: 'E', done: 'A' }[a.care]}`, pos[0], pos[1])); });
    const noLocation = list.filter(a => !a.location).length;
    $('map-message').textContent = `${noLocation} alerta(s) sin coordenadas: disponibles en el listado. Los marcadores representan capturas históricas.`;
    $('radar-message').textContent = list.length ? `${list.length} señales ficticias. No existe detección Bluetooth.` : 'Buscando señales… Sin alertas en el filtro actual.';
    renderDetail(list.find(a => a.id === selected));
  }
  $('alert-list').addEventListener('click', e => { const b = e.target.closest('[data-alert]'); if (b) selectAlert(b.dataset.alert); });
  $('filters').addEventListener('click', e => {
    const b = e.target.closest('[data-filter]'); if (!b) return;
    filter = b.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === b)));
    renderRescue();
  });
  ['map', 'radar'].forEach(type => $(`view-${type}`).addEventListener('click', () => {
    ['map', 'radar'].forEach(t => { $(`${t}-view`).hidden = t !== type; $(`view-${t}`).setAttribute('aria-pressed', String(t === type)); });
  }));
  function renderDetail(a) {
    if (!a) { $('alert-detail').innerHTML = '<h3>Detalle de alerta</h3><p>Selecciona un marcador o una alerta del listado para revisar sus datos y registrar una acción.</p>'; return; }
    const p = a.profile, l = a.location;
    const block = (heading, text, kind = '') => `<section class="detail-block ${kind}"><h4>${kind ? icon('alert') : ''}${heading}</h4><p>${escape(text)}</p></section>`;
    $('alert-detail').innerHTML = `<h3>Detalle · ${a.id}</h3><p>${CARE[a.care]} · Prioridad ${PRIORITY[a.priority]}</p><dl><dt>Identificación</dt><dd>${escape(p?.name || 'Señal básica sin perfil médico recibido')}</dd><dt>Detección de prueba</dt><dd>${date(a.detectedAt)}</dd><dt>Ubicación histórica</dt><dd>${l ? `${l.lat.toFixed(6)}, ${l.lng.toFixed(6)} · ${date(l.at)} · ${l.source === 'example' ? 'Ejemplo ficticio' : 'Captura GPS'}` : 'Información no disponible; no se inventan coordenadas'}</dd></dl>
      ${block('Perfil médico', p ? `${p.age} años · Sangre: ${p.blood} · Medicación: ${p.medications || 'Información no disponible'}` : 'Sin perfil médico registrado o autorizado. Dato no recibido.')}
      ${block('Alergias', p ? p.noAllergies ? 'Sin alergias conocidas (declarado)' : p.allergies : 'Información no disponible', p && !p.noAllergies ? 'critical' : '')}
      ${block('Condiciones médicas y movilidad', p ? p.noConditions ? 'Sin condiciones conocidas (declarado)' : [...p.conditions, p.otherCondition].filter(Boolean).join(' · ') : 'Información no disponible')}
      ${block('Equipo de asistencia declarado', p?.equipment || 'Información no disponible', p?.equipment ? 'warning' : '')}
      ${block('Instrucciones antes del contacto', p ? p.noInstructions ? 'No aplica (declarado)' : p.instructions || 'Información no disponible' : 'Información no disponible', p?.instructions ? 'warning' : '')}
      <label for="priority-select">Prioridad de atención</label><select id="priority-select">${Object.entries(PRIORITY).map(([key, name]) => `<option value="${key}" ${a.priority === key ? 'selected' : ''}>${name}</option>`).join('')}</select><p class="small">Registro manual de prueba; no calcula una prioridad médica.</p><button type="button" id="save-priority" class="button secondary">Confirmar prioridad</button>
      ${a.receipt ? `<p class="notice success">${icon('check')}<span>Recepción confirmada por ${escape(a.receipt.by)} · ${date(a.receipt.at)}</span></p>` : '<button type="button" id="confirm-receipt" class="button primary">Confirmar recepción</button>'}
      ${a.receipt && a.care !== 'done' ? `<button type="button" id="progress-care" class="button secondary">${a.care === 'pending' ? 'Registrar inicio de atención' : 'Marcar atención finalizada'}</button>` : ''}`;
    $('save-priority').addEventListener('click', () => {
      if (!canMutate()) return;
      const priority = $('priority-select').value;
      confirm('Confirmar prioridad', `Asignar ${PRIORITY[priority]} al caso ${a.id}. Se actualizarán el listado y la etiqueta accesible del mapa.`, () => {
        if (!canMutate()) return; a.priority = priority; commit(`Prioridad ${PRIORITY[priority]} registrada.`); $('priority-select').focus();
      }, 'Guardar prioridad');
    });
    $('confirm-receipt')?.addEventListener('click', () => {
      if (!canMutate()) return;
      if (confirmReceipt(a)) { commit(`Acuse registrado para ${a.id}; atención aún ${CARE[a.care].toLowerCase()}.`); $('alert-detail').focus(); }
    });
    $('progress-care')?.addEventListener('click', () => confirm('Actualizar atención', `Cambiar ${a.id} a ${a.care === 'pending' ? 'En atención' : 'Atendida'} dentro del escenario ficticio.`, () => {
      if (!canMutate()) return; a.care = a.care === 'pending' ? 'care' : 'done'; commit('Estado de atención actualizado.'); $('alert-detail').focus();
    }));
  }

  // HU-41 a HU-47. Validación explícita, borrador y privacidad independientes.
  const form = $('profile-form');
  function setDirty(value) { dirty = value; updateFormState(); }
  function updateFormState() { $('form-state').textContent = dirty ? '⚠ Cambios sin guardar' : !state.profile ? 'Sin perfil guardado' : persisted ? '✓ Guardado localmente' : '⚠ Solo disponible en esta sesión'; }
  function updateControls() {
    $('allergies').disabled = $('no-allergies').checked;
    $('instructions').disabled = $('no-instructions').checked;
    form.querySelectorAll('[name="conditions"]').forEach(c => { c.disabled = $('no-conditions').checked; });
    $('other-condition').disabled = $('no-conditions').checked;
    $('instruction-count').textContent = `${$('instructions').value.length} de 200 caracteres${$('instructions').value.length > 200 ? ' · Límite excedido' : ''}`;
  }
  function clearErrors() {
    form.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  }
  function populateForm(blank = false) {
    const p = blank ? null : state.profile;
    const fieldMap = { name: 'name', age: 'age', blood: 'blood', medications: 'medications', allergies: 'allergies', 'other-condition': 'otherCondition', equipment: 'equipment', instructions: 'instructions' };
    Object.entries(fieldMap).forEach(([id, key]) => { $(id).value = p?.[key] ?? ''; });
    [['no-allergies', 'noAllergies'], ['no-conditions', 'noConditions'], ['no-instructions', 'noInstructions'], ['consent', 'consent']].forEach(([id, key]) => { $(id).checked = Boolean(p?.[key]); });
    form.querySelectorAll('[name="conditions"]').forEach(c => { c.checked = Boolean(p?.conditions.includes(c.value)); });
    updateControls(); clearErrors(); setDirty(blank); $('form-feedback').textContent = '';
  }
  form.addEventListener('input', () => { setDirty(true); updateControls(); });
  form.addEventListener('change', () => { setDirty(true); updateControls(); });
  function readForm() {
    return { name: $('name').value.trim(), age: $('age').value === '' ? NaN : Number($('age').value), blood: $('blood').value, medications: $('medications').value.trim(),
      allergies: $('no-allergies').checked ? '' : $('allergies').value.trim(), noAllergies: $('no-allergies').checked,
      conditions: $('no-conditions').checked ? [] : [...form.querySelectorAll('[name="conditions"]:checked')].map(el => el.value), otherCondition: $('no-conditions').checked ? '' : $('other-condition').value.trim(), noConditions: $('no-conditions').checked,
      equipment: $('equipment').value.trim(), instructions: $('no-instructions').checked ? '' : $('instructions').value.trim(), noInstructions: $('no-instructions').checked, consent: $('consent').checked, updatedAt: now() };
  }
  form.addEventListener('submit', e => {
    e.preventDefault(); clearErrors(); const p = readForm(); let first = null;
    const error = (id, message, control = id) => { $(`err-${id}`).textContent = `⚠ ${message}`; $(control).setAttribute('aria-invalid', 'true'); if (!first) first = $(control); };
    if (!p.name || p.name.length > 80) error('name', 'Escribe un nombre de 1 a 80 caracteres.');
    if (!Number.isInteger(p.age) || p.age < 0 || p.age > 120) error('age', 'Ingresa una edad entera de 0 a 120 años.');
    if (!BLOOD.includes(p.blood)) error('blood', 'Selecciona un tipo de sangre o Desconocido.');
    if (!p.noAllergies && !p.allergies) error('allergies', 'Especifica alergias o marca Sin alergias conocidas.');
    if (!p.noConditions && p.conditions.length === 0 && !p.otherCondition) {
      error('conditions', 'Selecciona condiciones, escribe otra o declara Sin condiciones conocidas.', 'condition-motor');
      $('condition-motor').setAttribute('aria-describedby', 'err-conditions');
    }
    if (!p.noInstructions && $('instructions').value.length > 200) error('instructions', 'Reduce las instrucciones a un máximo de 200 caracteres.');
    if (first) { $('form-feedback').textContent = '⚠ Revisa los campos indicados. El perfil no se guardó.'; first.focus(); return; }
    if (!validProfile(p)) { $('form-feedback').textContent = '⚠ Revisa los límites de longitud del formulario.'; return; }
    if (!canMutate()) return;
    saveProfile(state, p);
    const ok = commit('Perfil actualizado.'); setDirty(false);
    $('form-feedback').textContent = ok ? `✓ Perfil guardado. ${p.consent ? 'Autorizado para el rol Rescatista.' : 'Sin autorización: SOS básico sin datos médicos.'}` : '⚠ Perfil actualizado solo en memoria. No se guardó; puedes reintentar.';
  });
  $('discard-edit').addEventListener('click', () => { if (!dirty) return; confirm('Descartar cambios', 'Se recuperará la última versión del perfil de esta sesión.', () => { populateForm(); $('name').focus(); }); });
  $('new-profile').addEventListener('click', () => confirm('Preparar un nuevo perfil', 'Se vaciará el formulario. El perfil actual se conserva hasta que guardes uno nuevo.', () => { populateForm(true); $('name').focus(); }));
  $('revoke-consent').addEventListener('click', () => {
    if (!canMutate()) return;
    confirm('Revocar autorización', 'El perfil médico dejará de ser visible en la alerta local. El resto del borrador se conserva. No es posible retirar información ya vista fuera de esta demostración.', () => {
      if (!canMutate()) return;
      revoke(state); $('consent').checked = false; const ok = commit('Autorización revocada para la alerta local.');
      $('form-feedback').textContent = ok ? '✓ Autorización revocada y guardada. Los demás cambios pendientes aún requieren guardar.' : '⚠ Revocada solo en esta sesión. Reintenta guardar antes de cerrar.';
    }, 'Revocar ahora');
  });
  window.addEventListener('beforeunload', e => { if (dirty || !persisted && (state.profile || state.sos)) { e.preventDefault(); e.returnValue = ''; } });
  // Evitar pérdida del borrador al salir por enlaces externos.
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link || !dirty || new URL(link.href).origin === location.origin) return;
    e.preventDefault(); confirm('Salir con cambios pendientes', 'El borrador todavía no está guardado. Puedes cancelar y guardarlo antes de abrir Figma.', () => { setDirty(false); location.href = link.href; }, 'Salir sin guardar');
  });
  function resetDemo(withExamples) {
    if (!canMutate()) return;
    confirm(withExamples ? 'Cargar casos ficticios' : 'Empezar sin datos', 'Reemplaza los datos de esta demostración y descarta el borrador. Esta acción no modifica otros proyectos.', () => {
      if (!canMutate()) return;
      gpsRequest++; $('update-location').disabled = false;
      state = withExamples ? exampleState() : freshState(); selected = null; filter = 'all';
      ['fail-location', 'fail-emission'].forEach(id => { $(id).checked = false; });
      ['voice-feedback', 'location-feedback'].forEach(id => { $(id).textContent = ''; });
      $('voice-phrase').value = state.voicePhrase; $('voice-test').value = '';
      document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === 'all')));
      persist(); populateForm(); renderAll(); announce(withExamples ? 'Casos ficticios cargados.' : 'Sesión vacía preparada.');
    });
  }
  $('load-examples').addEventListener('click', () => resetDemo(true)); $('clear-demo').addEventListener('click', () => resetDemo(false));
  function renderAll() { renderPersona(); renderRescue(); updateFormState(); }
  $('voice-phrase').value = state.voicePhrase; populateForm(); renderAll();

  // Copia offline por proyecto; la primera visita requiere HTTPS/localhost y red.
  let offlineReady = false;
  function connectionStatus() {
    const network = navigator.onLine ? 'El navegador informa conexión de red.' : 'El navegador informa modo sin conexión.';
    $('connection-status').textContent = `${network} ${offlineReady ? 'Copia de esta versión preparada para reabrir sin conexión.' : 'Copia offline aún no confirmada; conserva abierta la página.'} El perfil se consulta localmente.`;
  }
  connectionStatus();
  if ('serviceWorker' in navigator && isSecureContext) {
    navigator.serviceWorker.register(new URL('sw.js', rootURL), { scope: rootURL.pathname }).then(async registration => {
      const ready = await navigator.serviceWorker.ready;
      offlineReady = Boolean(ready.active); connectionStatus();
      if (registration.waiting) $('connection-status').textContent += ' Hay una actualización: cierra todas las pestañas de este proyecto y vuelve a abrirlo.';
      registration.addEventListener('updatefound', () => {
        registration.installing?.addEventListener('statechange', () => {
          if (registration.waiting) $('connection-status').textContent += ' Nueva versión disponible: guarda los cambios y cierra las pestañas del proyecto para actualizar.';
        });
      });
    }).catch(() => { offlineReady = false; connectionStatus(); });
  }
  window.addEventListener('online', connectionStatus); window.addEventListener('offline', connectionStatus);
})();
