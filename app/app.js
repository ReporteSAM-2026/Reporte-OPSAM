'use strict';
const $ = id => document.getElementById(id), LS = localStorage;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const p2 = n => String(n).padStart(2, '0'), iso = d => `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s*_\s*/g, '_').replace(/["']/g, '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
const APP_V = '1.9';
let M = null, firmado = false;

/* ---------- almacenamiento local: IndexedDB (aguanta fotos), sin señal ---------- */
const DB = new Promise((ok, ko) => { const r = indexedDB.open('sam', 1); r.onupgradeneeded = () => r.result.createObjectStore('cola', {keyPath: 'uuid'}); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const tx = (modo, fn) => DB.then(d => new Promise((ok, ko) => { const t = d.transaction('cola', modo), r = fn(t.objectStore('cola')); t.oncomplete = () => ok(r && r.result); t.onerror = () => ko(t.error); }));
const colaTodos = () => tx('readonly', s => s.getAll()), colaPut = x => tx('readwrite', s => s.put(x)), colaVaciar = () => tx('readwrite', s => s.clear());
document.getElementById('chv').textContent = 'App v' + APP_V; let tt; const msg = (t, ok) => { const e = $('toast'); e.textContent = t; e.className = 'toast on ' + (ok ? 'bien' : 'mal'); clearTimeout(tt); tt = setTimeout(() => e.className = 'toast', ok ? 2600 : 5200); };
const vista = v => { document.querySelectorAll('.vista').forEach(s => s.classList.toggle('on', s.id === 'v-' + v)); document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); scrollTo(0, 0); if (v === 'cola') lista(); };
document.querySelectorAll('.nav button').forEach(b => b.onclick = () => vista(b.dataset.v));
const tema = t => { document.documentElement.dataset.tema = t; try { localStorage.setItem('sam_tema', t); } catch (e) {} };
try { tema(localStorage.getItem('sam_tema') || 'claro'); } catch (e) {}
$('red').onclick = () => tema(document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro');
const enLinea = () => { $('red').classList.toggle('off', !navigator.onLine); $('redt').textContent = navigator.onLine ? 'En línea' : 'Sin señal'; };
addEventListener('online', enLinea); addEventListener('offline', enLinea); enLinea();
/* chips (radio) para listas cortas */
const chips = (k, a, v = '') => `<div class="opciones" data-chips><input type="hidden" data-k="${k}" value="${esc(v)}">${a.map(o => `<button type="button" class="op${o.id === v ? ' on' : ''}" data-v="${esc(o.id)}">${esc(o.nombre)}</button>`).join('')}</div>`;
document.addEventListener('click', e => { const b = e.target.closest('.op[data-v]'); if (!b) return; const w = b.parentElement, h = w.querySelector('input[type=hidden]');
  const nuevo = h.value === b.dataset.v && w.id !== 'tchips' ? '' : b.dataset.v; h.value = nuevo; w.querySelectorAll('.op').forEach(x => x.classList.toggle('on', x.dataset.v === nuevo)); if (w.id === 'tchips') { $('t').value = nuevo; info(); } refrescar(); });
const opts = (a, ph) => `<option value="">${ph || '— elegir —'}</option>` + a.map(o => `<option value="${esc(o.id)}">${esc(o.nombre)}</option>`).join('');

/* ---------- encabezado: turno por reloj (DÍA 06:00–17:59, NOCHE 18:00–05:59 → la madrugada es del turno noche de ayer) ---------- */
function turnoActual(d = new Date()) { const h = d.getHours(), f = new Date(d); if (h < 6) f.setDate(f.getDate() - 1); return [iso(f), h >= 6 && h < 18 ? 'DIA' : 'NOCHE']; }
function iniciar() {
  const [f, t] = turnoActual();
  $('f').value = f; $('t').innerHTML = opts(M.turnos); $('t').value = t; tchips();
  $('j').innerHTML = opts(M.jefes); $('c').innerHTML = opts(M.cuadrillas);
  $('f').onchange = $('t').onchange = info;
  $('c').onchange = info; $('j').onchange = () => { const j = M.jefes.find(x => x.id === $('j').value); if (j && j.cuadrilla_id) $('c').value = j.cuadrilla_id; info(); };
  info(); contar(); $('lineas').innerHTML = ''; agregar(); refrescar();
}
function tchips() { $('tchips').innerHTML = `<input type="hidden" id="th" value="${esc($('t').value)}">` + M.turnos.map(x => `<button type="button" class="op${x.id === $('t').value ? ' on' : ''}" data-v="${esc(x.id)}">${esc(x.nombre)}${x.inicio ? ` <small>${esc(String(x.inicio).slice(0,5))}–${esc(String(x.fin).slice(0,5))}</small>` : ''}</button>`).join(''); }
function info() {
  const c = M.calendario[$('f').value];
  const j = M.jefes.find(x => x.id === $('j').value), cu = M.cuadrillas.find(x => x.id === $('c').value);
  $('ch1').textContent = `${$('f').value} · ${$('t').value || '—'}`; $('ch2').textContent = cu ? cu.nombre : 'Sin cuadrilla';
  $('info').textContent = c ? `${c[0]} · Semana ${c[1]} (${c[2].toLowerCase()})` : 'Fecha fuera del calendario';
  $('mest').className = 'aviso ' + (c ? 'info' : 'warn'); $('mest').innerHTML = `Maestro del <b>${esc(M.fecha)}</b>${M.version ? ' · v' + M.version : ''} · ${M.labores.length} labores · ${M.grupos.length} grupos de servicio.` + (c ? '' : '<br>La fecha elegida está fuera del calendario: cargue un maestro más reciente.');
  const plan = (c && M.plan[`${c[0]}-S${c[1]}`]) || [];
  $('dl').innerHTML = (plan.length ? plan : M.labores).map(l => `<option value="${esc(l)}">`).join('');
}

/* ---------- actividades (los campos salen del maestro: hoja GrupoCampo) ---------- */
function agregar() {
  const d = document.createElement('div'); d.className = 'linea'; d._fotos = [];
  d.innerHTML = `<div class="cab"><span>Actividad <span class="nl"></span></span><button class="btn peq mal x" type="button">Quitar</button></div><label class="campo">Grupo de servicio * · 服务组<select class="g">${opts(M.grupos)}</select></label><div class="campos" style="display:flex;flex-direction:column;gap:10px"></div>`;
  d.querySelector('.x').onclick = () => { d.remove(); numerar(); refrescar(); };
  d.querySelector('.g').onchange = () => pintar(d);
  $('lineas').appendChild(d); numerar();
}
const numerar = () => [...$('lineas').children].forEach((d, i) => { d.querySelector('.nl').textContent = '#' + (i + 1); });
const grupo = d => M.grupos.find(g => g.id === d.querySelector('.g').value);
function pintar(d) {
  const g = grupo(d); d._fotos = [];
  const html = !g ? '' : g.campos.filter(c => +c.visible).map(c => {
    const n = c.campo, et = esc(c.etiqueta) + (+c.obligatorio ? ' *' : '');
    if (n === 'evidencia') return `<div class="campo">${et} · 证据<div class="btns"><button type="button" class="btn cam">📷 Tomar foto</button><button type="button" class="btn gal">🖼 Galería</button></div>
      <input type="file" accept="image/*" capture="environment" hidden class="fc"><input type="file" accept="image/*" multiple hidden class="fg"><div class="mini"></div></div>`;
    const lista = {servicio: g.servicios, actividad: g.actividades, motivo: g.motivos, item: g.items, estado: M.estados, sistema_bombeo: M.sistemas_bombeo}[n];
    const ctl = lista ? (lista.length <= 6 ? chips(n, lista) : `<select data-k="${n}">${opts(lista)}</select>`)
      : n === 'labor' ? `<input data-k="labor" list="dl" placeholder="Escriba para buscar" autocomplete="off">`
      : n === 'cantidad' ? `<input data-k="cantidad" type="number" inputmode="decimal" min="0" step="any" value="${esc(c.defecto || '')}">`
      : n === 'observaciones' ? `<textarea data-k="observaciones" rows="2"></textarea>` : `<input data-k="${n}">`;
    return lista && lista.length <= 6 ? `<div class="campo">${et}${ctl}</div>` : `<label class="campo">${et} ${n === 'cantidad' ? `<small>(${g.unidad === 'M' ? 'metros' : 'unidades'})</small>` : ''}${ctl}</label>`;
  }).join('');
  d.querySelector('.campos').innerHTML = html;
  const fc = d.querySelector('.fc'); if (!fc) return;
  d.querySelector('.cam').onclick = () => fc.click(); d.querySelector('.gal').onclick = () => d.querySelector('.fg').click();
  fc.onchange = d.querySelector('.fg').onchange = e => { addFotos(d, [...e.target.files]); e.target.value = ''; };
}
async function comprimir(file) {   // máx. 1280 px, JPEG 65 %: ~100–200 KB por foto
  const b = await createImageBitmap(file), k = Math.min(1, 1280 / Math.max(b.width, b.height)), c = document.createElement('canvas');
  c.width = Math.round(b.width * k); c.height = Math.round(b.height * k); c.getContext('2d').drawImage(b, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.65);
}
async function addFotos(d, files) {
  for (const f of files) { if (d._fotos.length >= 6) { msg('Máximo 6 fotos por actividad.', false); break; } try { d._fotos.push(await comprimir(f)); } catch (e) { msg('No se pudo leer una de las fotos.', false); } }
  miniaturas(d); refrescar();
}
function miniaturas(d) {
  d.querySelector('.mini').innerHTML = d._fotos.map((u, i) => `<span><img src="${u}"><b data-q="${i}">×</b></span>`).join('');
  d.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { d._fotos.splice(+b.dataset.q, 1); miniaturas(d); refrescar(); });
}

/* ---------- firma táctil ---------- */
const cv = $('firma'), cx = cv.getContext('2d'); let dibujando = false;
cx.lineWidth = 2.5; cx.lineCap = 'round'; cx.strokeStyle = '#000';
const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
cv.onpointerdown = e => { dibujando = true; cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); cx.beginPath(); cx.moveTo(x, y); };
cv.onpointermove = e => { if (!dibujando) return; const [x, y] = pos(e); cx.lineTo(x, y); cx.stroke(); if (!firmado) { firmado = true; refrescar(); } };
cv.onpointerup = cv.onpointercancel = () => { dibujando = false; };
const limpiarFirma = () => { cx.clearRect(0, 0, cv.width, cv.height); firmado = false; };
$('borrar').onclick = () => { limpiarFirma(); refrescar(); };

/* ---------- validación: no deja guardar con vacíos ---------- */
function recoger(final) {
  if (!M) return {error: 'cargue el maestro'};
  for (const [id, t] of [['f', 'la fecha'], ['t', 'el turno'], ['j', 'el jefe de turno'], ['c', 'la cuadrilla']]) if (!$(id).value) return {error: t};
  const lineas = [];
  for (const [i, d] of [...$('lineas').children].entries()) {
    const g = grupo(d); if (!g) return {error: `actividad ${i + 1}: elegir el grupo de servicio`};
    const l = {grupo: g.id};
    g.campos.forEach(c => { if (!+c.visible && c.defecto) l[c.campo] = c.defecto; });
    d.querySelectorAll('[data-k]').forEach(e => { l[e.dataset.k] = e.value.trim(); });
    for (const c of g.campos) if (c.campo !== 'evidencia' && +c.obligatorio && !l[c.campo]) return {error: `${g.nombre}: ${c.etiqueta}`};
    if (l.labor && !M.labores.includes(norm(l.labor))) return {error: `${g.nombre}: la labor «${l.labor}» no está en el maestro`};
    if (!(parseFloat(l.cantidad) > 0)) return {error: `${g.nombre}: la cantidad debe ser mayor que 0`};
    l.cantidad = parseFloat(l.cantidad);
    const ev = g.campos.find(c => c.campo === 'evidencia');
    if (ev && +ev.visible && +ev.obligatorio && !d._fotos.length) return {error: `${g.nombre}: ${ev.etiqueta} (al menos una foto)`};
    l.fotos = d._fotos.map((data, k) => ({nombre: `foto${k + 1}.jpg`, data}));
    lineas.push(l);
  }
  if (!lineas.length && !$('sinact').checked) return {error: 'una actividad, o marcar «Turno sin actividad»'};
  if (lineas.length && $('sinact').checked) return {error: 'desmarcar «Turno sin actividad» (hay actividades)'};
  if (!firmado) return {error: 'la firma del jefe de turno'};
  if (!final) return {};
  return {reporte: {uuid: crypto.randomUUID(), fecha_turno: $('f').value, turno: $('t').value, cuadrilla: $('c').value, jefe: $('j').value,
    observaciones: $('obs').value.trim(), firma: cv.toDataURL('image/png'), lineas, guardado: new Date().toISOString()}};
}
function refrescar() {
  const r = recoger(false);
  $('guardar').disabled = !!r.error; $('hint').className = r.error ? 'err' : 'ok';
  $('hint').textContent = r.error ? `Falta completar: ${r.error}` : 'Todo diligenciado: puede guardar.';
}
document.addEventListener('input', refrescar); document.addEventListener('change', refrescar);
$('mas').onclick = () => { agregar(); refrescar(); };

/* ---------- guardar / exportar / PDF ---------- */
async function contar() { const c = await colaTodos(); $('n').textContent = c.length; $('nl').textContent = c.reduce((a, r) => a + r.lineas.length, 0); $('nf').textContent = c.reduce((a, r) => a + r.lineas.reduce((b, l) => b + (l.fotos || []).length, 0), 0); $('nb').hidden = !c.length; $('nb').textContent = c.length; }
async function lista() { const c = await colaTodos(); await contar();
  $('lista').innerHTML = c.length ? c.map(r => `<li class="item"><div class="t"><span>${esc(r.fecha_turno)} · ${esc(r.turno)}</span><span class="est">POR ENVIAR</span></div><div class="m">${esc((M.jefes.find(j => j.id === r.jefe) || {nombre: r.jefe}).nombre)} · ${esc(r.cuadrilla)}</div><div class="m">${r.lineas.length ? r.lineas.map(l => esc((M.grupos.find(g => g.id === l.grupo) || {nombre: l.grupo}).nombre)).join(', ') : 'Turno sin actividad'}</div></li>`).join('') : '<li class="aviso info">No hay reportes pendientes.</li>'; }
$('guardar').onclick = async () => {
  const r = recoger(true); if (r.error) return msg('Falta: ' + r.error, false);
  await colaPut(r.reporte);
  $('lineas').innerHTML = ''; agregar(); $('obs').value = ''; $('sinact').checked = false; limpiarFirma(); refrescar(); contar();
  msg('Reporte guardado ✔ Envíelo desde «Pendientes» cuando tenga señal.', true); vista('cola');
};
$('exp').onclick = async () => {
  const cola = await colaTodos(); if (!cola.length) return msg('No hay reportes pendientes.', false);
  const blob = new Blob([JSON.stringify({app: 'SAM-REPORTE', version: 2, reportes: cola})], {type: 'application/json'});
  const file = new File([blob], `reportes_SAM_${iso(new Date())}.json`, {type: 'application/json'});
  if (navigator.canShare && navigator.canShare({files: [file]})) { try { await navigator.share({files: [file]}); return; } catch (e) { /* cancelado */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
};
$('vaciar').onclick = async () => { if (confirm('¿Ya envió el archivo exportado? Se borrará la lista de este dispositivo.')) { await colaVaciar(); lista(); } };
const detalle = (g, l) => {
  const L = {servicio: g.servicios, actividad: g.actividades, motivo: g.motivos, item: g.items, estado: M.estados, sistema_bombeo: M.sistemas_bombeo};
  return g.campos.filter(c => +c.visible && c.campo !== 'evidencia').map(c => { const x = l[c.campo]; if (x == null || x === '') return '';
    return `<b>${esc(c.etiqueta)}:</b> ${esc(L[c.campo] ? (L[c.campo].find(o => o.id === x) || {nombre: x}).nombre : x)}`; }).filter(Boolean).join(' · ');
};
$('pdf').onclick = async () => {   // imprime los reportes guardados; en el celular elija «Guardar como PDF»
  const cola = (await colaTodos()).sort((p, q) => (p.fecha_turno + p.turno).localeCompare(q.fecha_turno + q.turno)); if (!cola.length) return msg('No hay reportes guardados para imprimir.', false);
  $('imp').innerHTML = cola.map(r => `<section><img class="lg" src="${document.querySelector('.logo').src}"><h2>Reporte de turno SAM</h2>
    <p><b>Fecha:</b> ${esc(r.fecha_turno)} · <b>Turno:</b> ${esc(r.turno)} · <b>Cuadrilla:</b> ${esc(r.cuadrilla)} · <b>Jefe de turno:</b> ${esc((M.jefes.find(j => j.id === r.jefe) || {nombre: r.jefe}).nombre)}</p>
    <table><tr><th>Grupo</th><th>Detalle</th><th>Evidencia</th></tr>${r.lineas.length ? r.lineas.map(l => { const g = M.grupos.find(x => x.id === l.grupo) || {nombre: l.grupo, campos: []};
      return `<tr><td>${esc(g.nombre)}</td><td>${detalle(g, l)}</td><td>${(l.fotos || []).map(f => `<img class="f" src="${f.data}">`).join('')}</td></tr>`; }).join('') : '<tr><td colspan="3">Turno sin actividad de servicios</td></tr>'}</table>
    <p><b>Observaciones:</b> ${esc(r.observaciones)}</p><p>Firma del jefe de turno:<br><img class="s" src="${r.firma}"></p><small>Guardado ${esc(r.guardado)}</small></section>`).join('');
  window.print();
};
