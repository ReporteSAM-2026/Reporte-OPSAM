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
const COLS = /*COLS*/{"code":"id","nombre":"nombre","inicio":"inicio","fin":"fin","activo":"activo","rol":"rol","cuadrilla_habitual":"cuadrilla_id","orden":"orden","unidad":"unidad","grupo_de_servicio":"grupo_id","actividad":"actividad_id","motivo":"motivo_id","sistema":"sistema","subtipo":"subtipo","nivel":"nivel","tipo_de_labor":"tipo_id","es_panel":"es_panel","panel":"panel_id","labor":"labor_id","entidad":"entidad","texto_normalizado":"texto_norm","code_maestro":"id_maestro","campo":"campo","visible":"visible","obligatorio":"obligatorio","valor_por_defecto":"defecto","etiqueta":"etiqueta","version":"version","fecha":"fecha","actualizado_por":"actualizado_por","notas":"notas","dia_semana":"dia_semana","mes_operativo":"mes_op_id","semana":"semana_num","tipo_semana":"tipo_semana","dias_semana":"dias_semana","inicio_mes":"inicio_mes","fin_mes":"fin_mes","tipo_mes":"tipo_mes"}/*FIN*/;
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
  const ref = t.refs['tbl' + n]; if (!ref) return [];
  const f = XLSX.utils.sheet_to_json(t.hoja, {range: ref, header: 1, defval: null, raw, dateNF: 'yyyy-mm-dd'}), enc = (f[0] || []).map(colDe);
  return f.slice(1).filter(r => r.some(v => v !== null && v !== '')).map(r => Object.fromEntries(enc.map((c, i) => [c, r[i]])));
};
const act = r => r.activo == null || +r.activo !== 0, sid = ({id, nombre}) => ({id, nombre});
function desdeMaestro(wb) {   // mismo resultado que `python -m sam json`
  const meta = hoja(wb, 'Meta', false)[0] || {}, cal = {};
  hoja(wb, 'Calendario').forEach(r => { cal[r.fecha] = [r.mes_op_id, +r.semana_num, r.tipo_semana]; });
  const ACT = hoja(wb, 'Actividad').filter(act), MOT = hoja(wb, 'Motivo').filter(act), GA = hoja(wb, 'GrupoActividad'), GM = hoja(wb, 'GrupoMotivo'),
        GC = hoja(wb, 'GrupoCampo'), SV = hoja(wb, 'Servicio').filter(act), IT = hoja(wb, 'Item').filter(act);
  const por = (lista, ids) => ids.map(i => lista.find(x => x.id === i)).filter(Boolean).map(sid);
  return {app: 'SAM-MAESTRO', fecha: String(meta.fecha || '').slice(0, 16), version: +meta.version || 0,
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
    labores: hoja(wb, 'Labor').filter(act).map(r => norm(r.id)), calendario: cal, plan: {}};
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
