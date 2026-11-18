/* Buscador de labores por código (RP, CX…): hoja inferior con cuadro de búsqueda y filtros por tipo. Funciona sin señal. */
(function () {
  const caja = document.createElement('div'); caja.id = 'bus'; caja.hidden = true;
  caja.innerHTML = `<div class="bus-caja" role="dialog" aria-label="Buscar labor">
    <div class="bus-cab"><b>Buscar labor · 查找巷道</b><button type="button" class="btn peq" id="bus-x">Cerrar</button></div>
    <input id="bus-q" type="search" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Ej.: RP9357 · CX01 · 0826">
    <div class="opciones" id="bus-t"></div><small id="bus-n"></small><ul id="bus-l"></ul></div>`;
  document.body.appendChild(caja);
  const q = caja.querySelector('#bus-q'), chipsEl = caja.querySelector('#bus-t'), nEl = caja.querySelector('#bus-n'), lista = caja.querySelector('#bus-l');
  let destino = null, alElegir = null, tipo = '', soloPlan = false;
  const compacto = s => norm(s).replace(/[_\s-]/g, '');
  const tipoDe = id => (M.tipo_labor && M.tipo_labor[id]) || (String(id).split('_').pop().match(/^[A-Z]+/) || ['OTRO'])[0];
  const nombreTipo = t => ((M.tipos || []).find(x => x.id === t) || {}).nombre || t;
  const delPlan = () => { const c = M.calendario[$('f').value]; return new Set((c && M.plan[`${c[0]}-S${c[1]}`]) || []); };

  function pintar() {
    const plan = delPlan(), t = compacto(q.value);
    const base = M.labores.map(id => ({id, tipo: tipoDe(id), plan: plan.has(id), c: compacto(id)}))
      .filter(l => (!t || l.c.includes(t)) && (!soloPlan || l.plan));
    const n = {}; base.forEach(l => { n[l.tipo] = (n[l.tipo] || 0) + 1; });
    const orden = ['RP', 'CX', ...Object.keys(n).filter(x => x !== 'RP' && x !== 'CX').sort()];
    chipsEl.innerHTML = [['', 'Todas', base.length], ...orden.map(x => [x, x, n[x] || 0])]
      .map(([v, et, c]) => `<button type="button" class="op${v === tipo ? ' on' : ''}" data-t="${esc(v)}" title="${esc(v ? nombreTipo(v) : 'Todas las labores')}">${esc(et)} <small>${c}</small></button>`).join('')
      + (plan.size ? `<button type="button" class="op${soloPlan ? ' on' : ''}" data-plan="1">Solo plan <small>${plan.size}</small></button>` : '');
    const r = base.filter(l => !tipo || l.tipo === tipo).sort((a, b) => (b.plan - a.plan) || (a.id < b.id ? -1 : 1));
    nEl.textContent = r.length ? `${r.length} labor${r.length === 1 ? '' : 'es'}${r.length > 80 ? ' · mostrando 80: escriba más del código' : ''}` : 'Sin resultados: pruebe con menos dígitos o «Todas».';
    lista.innerHTML = r.slice(0, 80).map(l => `<li><button type="button" class="bus-it" data-id="${esc(l.id)}"><span><b>${esc(l.id)}</b><small>${esc(((M.desc || {})[l.id]) || nombreTipo(l.tipo))}${(l.id.match(/_(\d+)_/) || [])[1] ? ' · nivel ' + l.id.match(/_(\d+)_/)[1] : ''}</small></span>${l.plan ? '<em>PLAN</em>' : ''}</button></li>`).join('');
  }
  function cerrar() { caja.hidden = true; document.body.style.overflow = ''; }
  window.abrirBuscador = (input, cb) => {
    if (!M) { msg('Cargue el maestro primero.', false); return; }
    destino = input; alElegir = cb; tipo = ''; soloPlan = false; q.value = input.value.trim();
    caja.hidden = false; document.body.style.overflow = 'hidden'; pintar(); q.focus();
  };
  q.oninput = pintar;
  chipsEl.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.plan) soloPlan = !soloPlan; else tipo = b.dataset.t; pintar(); };
  lista.onclick = e => { const b = e.target.closest('.bus-it'); if (!b) return; destino.value = b.dataset.id; cerrar(); if (alElegir) alElegir(); destino.focus(); };
  caja.querySelector('#bus-x').onclick = cerrar;
  caja.onclick = e => { if (e.target === caja) cerrar(); };
  addEventListener('keydown', e => { if (e.key === 'Escape' && !caja.hidden) cerrar(); });
})();
