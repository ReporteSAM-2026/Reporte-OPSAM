/* Maestro: lectura del Excel (hoja única con tablas tbl*) o JSON. Los datos NUNCA viajan: se leen en el aparato. */
'use strict';
/* ---------- maestro: JSON de Python o Excel directo; manda la FECHA de la hoja Meta ---------- */
const clave = m => String(m.fecha || '').slice(0, 16) + '|' + String(+m.version || 0).padStart(6, '0');
function aceptar(n) {
  if (!n || !n.grupos) { msg('El archivo no es un maestro SAM válido.', false); return false; }
  if (M && (String(n.fecha).slice(0, 16) < String(M.fecha).slice(0, 16) || (String(n.fecha).slice(0, 16) === String(M.fecha).slice(0, 16) && +n.version && +n.version < +M.version))) { msg(`El maestro ${n.fecha} es anterior al ya cargado (${M.fecha}). No se reemplazó.`, false); return false; }
  if (M && !Object.keys(n.plan || {}).length) n.plan = M.plan || {};
  M = n;
  try { LS.setItem('sam_maestro', JSON.stringify(M)); } catch (e) { msg('No se pudo guardar el maestro en el dispositivo.', false); }
  iniciar(); return true;
}
async function cargar() {
  try { const s = LS.getItem('sam_maestro'); if (s) { M = JSON.parse(s); iniciar(); } } catch (e) {}
  if (!M) { $('info').textContent = 'Sin maestro'; vista('maestro'); }
}
/* Cabecera «Español / 中文» → columna interna (igual a sam/maestros.py::ETIQ; lo vigila tests/test_flujo.py) */
const COLS = /*COLS*/{"code":"id","nombre":"nombre","inicio":"inicio","fin":"fin","activo":"activo","rol":"rol","cuadrilla_habitual":"cuadrilla_id","orden":"orden","unidad":"unidad","grupo_de_servicio":"grupo_id","actividad":"actividad_id","motivo":"motivo_id","sistema":"sistema","subtipo":"subtipo","nivel":"nivel","tipo_de_labor":"tipo_id","es_panel":"es_panel","panel":"panel_id","labor":"labor_id","entidad":"entidad","texto_normalizado":"texto_norm","code_maestro":"id_maestro","campo":"campo","visible":"visible","obligatorio":"obligatorio","valor_por_defecto":"defecto","etiqueta":"etiqueta","version":"version","fecha":"fecha","actualizado_por":"actualizado_por","notas":"notas","dia_semana":"dia_semana","mes_operativo":"mes_op_id","semana":"semana_num","tipo_semana":"tipo_semana","dias_semana":"dias_semana","inicio_mes":"inicio_mes","fin_mes":"fin_mes","tipo_mes":"tipo_mes","contratista":"contratista","sección":"seccion","metros_plan":"metros_plan","finalidad":"finalidad","labor_de_acceso":"acceso","zona":"zona","lado":"lado","método_de_explotación":"metodo","turno":"turno_id","prioridad":"prioridad","cuadrilla_asignada":"cuadrilla_asignada","meta_planificada":"meta","número":"numero","name":"nombre","start":"inicio","end":"fin","active":"activo","role":"rol","usual_guard":"cuadrilla_id","order":"orden","unit":"unidad","service_group":"grupo_id","activity":"actividad_id","reason":"motivo_id","system":"sistema","subtype":"subtipo","level":"nivel","heading_type":"tipo_id","is_panel":"es_panel","heading":"labor_id","entity":"entidad","normalized_text":"texto_norm","master_code":"id_maestro","field":"campo","required":"obligatorio","default_value":"defecto","label":"etiqueta","date":"fecha","updated_by":"actualizado_por","notes":"notas","weekday":"dia_semana","month":"mes_op_id","week":"semana_num","week_type":"tipo_semana","week_days":"dias_semana","month_start":"inicio_mes","month_end":"fin_mes","month_type":"tipo_mes","contractor":"contratista","size_[m]":"seccion","meters_plan_[m]":"metros_plan","finality":"finalidad","access_heading":"acceso","zone":"zona","side":"lado","mining_method":"metodo","number":"numero","shift":"turno_id","priority":"prioridad","assigned_guard":"cuadrilla_asignada","planned_goal":"meta","note":"nota","mes_productivo":"ciclo_mes","anio":"ciclo_anio","mes_num":"ciclo_num","inicio_ciclo":"ciclo_ini","fin_ciclo":"ciclo_fin"}/*FIN*/;
const TBL = /*TBL*/{"Turno":"tblShift","Cuadrilla":"tblGuard","Persona":"tblShiftLead","GrupoServicio":"tblServiceGroup","Servicio":"tblService","Actividad":"tblActivity","GrupoActividad":"tblGroupActivity","Motivo":"tblReason","GrupoMotivo":"tblGroupReason","EstadoItem":"tblItemStatus","SistemaBombeo":"tblPumpSystem","Item":"tblItem","GrupoCampo":"tblGroupField","Alias":"tblAlias","Meta":"tblConfig","Calendario":"tblCalendar"}/*FINT*/;   // nombre lógico → tabla Excel vigente (igual a sam/maestros.py; lo vigila tests/test_flujo.py)
const colDe = h => { const c = String(h).split('/')[0].trim().toLowerCase().replace(/\s+/g, '_'); return COLS[c] || c; };
/* Maestro de UNA hoja: cada catálogo es una tabla Excel tbl<Nombre> (xl/tables/*.xml) al lado de las demás */
function tablasDe(wb) {
  const out = {}, hojaM = wb.SheetNames.find(n => n.startsWith('Maestro')); if (!hojaM || !wb.files) return null;
  for (const k of Object.keys(wb.files)) {
    if (!/^xl\/tables\/table\d+\.xml$/.test(k)) continue;
    const f = wb.files[k].content, x = typeof f === 'string' ? f : new TextDecoder().decode(f);
    const nombre = (x.match(/displayName="([^"]+)"/) || [])[1], ref = (x.match(/\sref="([^"]+)"/) || [])[1];
    if (nombre && ref) out[nombre] = ref;
  }
  return Object.keys(out).length ? {hoja: wb.Sheets[hojaM], refs: out} : null;
}
const hoja = (wb, n, raw = true) => {
  const t = wb._t === undefined ? (wb._t = tablasDe(wb)) : wb._t;
  if (!t) return wb.Sheets[n] ? XLSX.utils.sheet_to_json(wb.Sheets[n], {defval: null, raw, dateNF: 'yyyy-mm-dd'}) : [];   // libro de una hoja por tabla (antiguo)
  const ref = t.refs[TBL[n]] || t.refs['tbl' + n]; if (!ref) return [];   // vigente, o el nombre de un Maestro anterior
  const f = XLSX.utils.sheet_to_json(t.hoja, {range: ref, header: 1, defval: null, raw, dateNF: 'yyyy-mm-dd'}), enc = (f[0] || []).map(colDe);
  return f.slice(1).filter(r => r.some(v => v !== null && v !== '')).map(r => Object.fromEntries(enc.map((c, i) => [c, r[i]])));
};
const act = r => r.activo == null || +r.activo !== 0, sid = ({id, nombre}) => ({id, nombre});
/* Formato de Planeación (copia de los maestros de Desarrollo y Explotación): tblPlan, tblFronts, tblCalendar, tblCiclos, tblConfig */
const TIPOS = [['GA', 'Galería'], ['RP', 'Rampa'], ['CX', 'Crucero'], ['FW', 'Footwall'], ['CM', 'Cámara'], ['NC', 'Nicho'], ['CARCAMO', 'Cárcamo'], ['OTRO', 'Otro']].map(([id, nombre]) => ({id, nombre}));
const fechaDe = v => { if (typeof v === 'number' && v > 20000) return new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10); if (v instanceof Date) return v.toISOString().slice(0, 10); return String(v ?? '').slice(0, 10); };
function rawT(wb, n) {
  const t = wb._t === undefined ? (wb._t = tablasDe(wb)) : wb._t, ref = t && t.refs[n]; if (!ref) return [];
  const f = XLSX.utils.sheet_to_json(t.hoja, {range: ref, header: 1, defval: null, raw: true}), enc = (f[0] || []).map(h => String(h).split('/')[0].trim().toLowerCase());
  return f.slice(1).filter(r => r.some(v => v !== null && v !== '')).map(r => Object.fromEntries(enc.map((c, i) => [c, r[i]])));
}
function planeacion(wb) {
  const P = rawT(wb, 'tblPlan'); if (!P.length || !('monthly plan' in P[0])) return null;
  const C = rawT(wb, 'tblConfig')[0] || {}, ref = fechaDe(C.fecha_actualizacion) || new Date().toISOString().slice(0, 10);
  const ci = rawT(wb, 'tblCiclos').map(r => ({mes: String(r.mes_productivo).trim().toLowerCase(), id: `${r.anio}-${String(r.mes_num).padStart(2, '0')}`, ini: fechaDe(r.inicio_ciclo), fin: fechaDe(r.fin_ciclo)}));
  const dd = (a, b) => Math.abs(Date.parse(a) - Date.parse(b));
  const mesId = n => { const c = ci.filter(x => x.mes === String(n).trim().toLowerCase()).sort((a, b) => dd(a.ini, ref) - dd(b.ini, ref))[0]; return c ? c.id : null; };
  const dias = {}, cal = [];
  rawT(wb, 'tblCalendar').forEach(r => { const d = fechaDe(r.day), c = ci.find(x => x.ini <= d && d <= x.fin); if (c) { cal.push({fecha: d, mes_op_id: c.id, semana_num: +r.week}); dias[c.id + '|' + r.week] = (dias[c.id + '|' + r.week] || 0) + 1; } });
  cal.forEach(r => { const n = dias[r.mes_op_id + '|' + r.semana_num]; r.tipo_semana = n > 7 ? 'LARGA' : n < 7 ? 'CORTA' : 'NORMAL'; });
  const lab = new Map(), fin = {}, ceros = l => norm(l).replace(/^((?:PN_)?[A-Z]{2}_)0+(\d{3,})_/, '$1$2_');
  const plan = P.filter(r => r['monthly plan']).map(r => { const l = ceros(r['monthly plan']), a = r.active !== false && r.active !== 0 && String(r.active).toUpperCase() !== 'FALSE';
    if (!lab.has(l)) lab.set(l, {id: l, tipo_id: tipoDe(l), activo: 0}); if (a) lab.get(l).activo = 1;
    return {mes_op_id: mesId(r.month), labor_id: l, finalidad: r.finality, activo: a ? 1 : 0}; }).filter(r => r.mes_op_id && r.activo);
  rawT(wb, 'tblFronts').forEach(r => { if (r.heading) { const l = ceros(r.heading); if (!lab.has(l)) lab.set(l, {id: l, tipo_id: tipoDe(l), activo: 1}); } });
  plan.forEach(r => { if (r.finalidad) lab.get(r.labor_id).finalidad = r.finalidad; });
  return {meta: {fecha: ref, version: 0, actualizado_por: C.actualizado_por || ''}, cal, lab: [...lab.values()].filter(l => l.activo), plan};
}
function desdeMaestro(wb) {   // mismo resultado que `python -m sam json`
  const N = planeacion(wb), meta = N ? N.meta : (hoja(wb, 'Meta', false)[0] || {}), cal = {};
  (N ? N.cal : hoja(wb, 'Calendario')).forEach(r => { cal[r.fecha] = [r.mes_op_id, +r.semana_num, r.tipo_semana]; });
  const ACT = hoja(wb, 'Actividad').filter(act), MOT = hoja(wb, 'Motivo').filter(act), GA = hoja(wb, 'GrupoActividad'), GM = hoja(wb, 'GrupoMotivo'),
        GC = hoja(wb, 'GrupoCampo'), SV = hoja(wb, 'Servicio').filter(act), IT = hoja(wb, 'Item').filter(act), LAB = N ? N.lab : hoja(wb, 'Labor').filter(act);
  const PL = planTbl(N ? N.plan : hoja(wb, 'Plan').filter(act), LAB.map(r => norm(r.id)), cal, N ? [] : hoja(wb, 'PlanSemanal').filter(act), N ? TIPOS : hoja(wb, 'TipoLabor'), LAB);
  const por = (lista, ids) => ids.map(i => lista.find(x => x.id === i)).filter(Boolean).map(sid);
  return {app: 'SAM-MAESTRO', fecha: String(meta.fecha || '').slice(0, 16), version: +meta.version || 0, actualizado_por: meta.actualizado_por || '',
    turnos: hoja(wb, 'Turno').filter(act).map(r => ({id: r.id, nombre: r.nombre, inicio: r.inicio, fin: r.fin})),
    cuadrillas: hoja(wb, 'Cuadrilla').filter(act).map(sid),
    jefes: hoja(wb, 'Persona').filter(act).filter(p => p.rol === 'JEFE_TURNO').sort((a, b) => a.nombre < b.nombre ? -1 : 1).map(p => ({id: p.id, nombre: p.nombre, cuadrilla_id: p.cuadrilla_id})),
    estados: hoja(wb, 'EstadoItem').filter(act).map(sid), sistemas_bombeo: hoja(wb, 'SistemaBombeo').filter(act).map(sid),
    grupos: hoja(wb, 'GrupoServicio').filter(act).sort((a, b) => a.orden - b.orden).map(g => ({id: g.id, nombre: g.nombre, unidad: g.unidad,
      campos: GC.filter(c => c.grupo_id === g.id).sort((a, b) => a.orden - b.orden).map(c => ({campo: c.campo, visible: +c.visible, obligatorio: +c.obligatorio, defecto: c.defecto == null ? null : String(c.defecto), etiqueta: c.etiqueta})),
      servicios: SV.filter(x => x.grupo_id === g.id).map(sid),
      actividades: por(ACT, GA.filter(x => x.grupo_id === g.id).map(x => x.actividad_id)),
      motivos: por(MOT, GM.filter(x => x.grupo_id === g.id).map(x => x.motivo_id)),
      items: IT.filter(x => x.grupo_id === g.id).map(sid)})),
    labores: LAB.map(r => norm(r.id)), tipo_labor: Object.fromEntries(LAB.map(r => [norm(r.id), r.tipo_id || tipoDe(r.id)])),
    tipos: N ? TIPOS : hoja(wb, 'TipoLabor').filter(act).map(sid), calendario: cal, plan: PL.plan, plan_src: PL.src, desc: PL.desc};
}
const tipoDe = id => (String(id).split('_').pop().match(/^[A-Z]+/) || ['OTRO'])[0];
const mesDe = v => { if (typeof v === 'number' && v > 20000) return new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 7); const s = String(v ?? '').trim(); return /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : s; };
function planTbl(filas, labores, cal, semanal = [], tipos = [], LAB = []) {   // tblPlan + tblPlanSemanal → {mes-Sn: [labores]}; la semanal manda sobre la mensual
  const sem = {}, plan = {}, src = {}, desc = {}, ok = new Set(labores);
  Object.values(cal).forEach(([m, n]) => { (sem[m] = sem[m] || new Set()).add(n); });
  const canon = l => [l, ...[l.replace(/_0+(\d)/, '_$1'), l.replace(/_(\d{1,3})_/, (x, n) => '_' + n.padStart(4, '0') + '_')]].find(x => ok.has(x));
  const ing = t => String(t || '').split('/')[0].trim();        // «Access / 通道» → «Access»
  const nt = Object.fromEntries(tipos.map(t => [t.id, t.nombre]));
  const fl = new Set();   // la finalidad de tblLabor manda; si no hay, la del plan; si no, el tipo de labor
  LAB.forEach(r => { const id = norm(r.id), t = r.tipo_id || tipoDe(r.id); if (nt[t]) desc[id] = nt[t]; if (r.finalidad) { desc[id] = ing(r.finalidad); fl.add(id); } });
  filas.forEach(r => { const l = r.labor_id && canon(norm(r.labor_id)), m = mesDe(r.mes_op_id); if (!l || !sem[m]) return;
    if (r.finalidad && !fl.has(l)) desc[l] = ing(r.finalidad);
    sem[m].forEach(n => { const k = `${m}-S${n}`; (plan[k] = plan[k] || []); src[k] = 'MENSUAL'; if (!plan[k].includes(l)) plan[k].push(l); }); });
  const sp = {};
  semanal.forEach(r => { const l = r.labor_id && canon(norm(r.labor_id)), m = mesDe(r.mes_op_id); if (!l || !m || !r.semana_num) return; const k = `${m}-S${parseInt(r.semana_num)}`;
    if (r.finalidad && !fl.has(l)) desc[l] = ing(r.finalidad);
    (sp[k] = sp[k] || []); src[k] = 'SEMANAL'; if (!sp[k].includes(l)) sp[k].push(l); });
  return {plan: Object.assign(plan, sp), src, desc};
}
function planDe(wb) {
  const plan = {}, semanal = new Set(), add = (s, l) => { (plan[s] = plan[s] || []); if (!plan[s].includes(l)) plan[s].push(l); };
  hoja(wb, 'Plan_Semanal', false).forEach(r => { let s = r.semana_id; if (!s && r.fecha) { const c = M.calendario[String(r.fecha).slice(0, 10)]; if (c) s = `${c[0]}-S${c[1]}`; } if (s && r.labor) { semanal.add(s); add(s, norm(r.labor)); } });
  hoja(wb, 'Plan_Mensual', false).forEach(r => { if (r.mes_op_id && r.labor) Object.values(M.calendario).forEach(([m, n]) => { const s = `${m}-S${n}`; if (m === String(r.mes_op_id).trim() && !semanal.has(s)) add(s, norm(r.labor)); }); });
  return plan;
}
$('mf').onchange = async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    if (/\.json$/i.test(file.name)) { if (aceptar(JSON.parse(await file.text()))) msg(`Maestro cargado (fecha ${M.fecha}).`, true); return; }
    if (typeof XLSX === 'undefined') { msg('Esta copia de index.html es antigua y no trae el lector de Excel. Use el index.html actual de la carpeta 16. BD_SAM (app v' + APP_V + ').', false); e.target.value = ''; return; }
    const wb = XLSX.read(await file.arrayBuffer(), {type: 'array', bookFiles: true});
    if ((wb.Sheets.Meta && wb.Sheets.Labor) || tablasDe(wb)) { if (aceptar(desdeMaestro(wb))) msg(`Maestro cargado (fecha ${M.fecha}).`, true); }
    else if ((wb.Sheets.Plan_Semanal || wb.Sheets.Plan_Mensual) && M) { M.plan = planDe(wb); LS.setItem('sam_maestro', JSON.stringify(M)); info(); msg('Plan cargado.', true); }
    else msg('Archivo no reconocido: se esperaba Maestro_SAM.xlsx, Plan_SAM.xlsx (con el maestro ya cargado) o maestro.json.', false);
  } catch (x) { msg('No se pudo leer el archivo: ' + x.message, false); }
  e.target.value = '';
};

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
cargar();
