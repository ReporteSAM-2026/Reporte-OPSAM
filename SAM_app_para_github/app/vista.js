/* Pantallas (marcado). index.html queda como cascarón mínimo. */
document.getElementById('raiz').innerHTML = `
<div class="app">
<header class="top">
  <div class="fila">
    <img class="logo" src="app/logo.png" alt="SAM">
    <div class="tit"><span class="sub">Servicios Auxiliares Mina</span><h1 id="h1">Reporte de turno</h1></div>
    <button class="pill" id="red" type="button" title="Cambiar tema claro/oscuro"><span class="punto"></span><span id="redt">En línea</span></button>
  </div>
  <div class="chips"><span id="ch1">—</span><span id="ch2">—</span><span id="chv"></span><span id="info" class="ambar">Cargando maestro…</span></div>
</header>
<main>
<!-- ============ NUEVO ============ -->
<section class="vista on" id="v-nuevo">
  <div class="card">
    <h2><span><span class="paso">1</span>Datos del turno</span><small>班次信息</small></h2>
    <div class="dos">
      <label class="campo">Fecha · 日期<input type="date" id="f"></label>
      <label class="campo">Cuadrilla · 班组<select id="c"></select></label>
    </div>
    <div class="campo">Turno · 班次<div class="opciones" id="tchips"></div><select id="t" hidden></select></div>
    <label class="campo">Jefe de turno · 班长<select id="j"></select></label>
    <small style="color:var(--gris)">El turno noche lleva la fecha del día en que empieza.</small>
  </div>
  <div class="card dest" style="gap:6px"><h2><span><span class="paso">2</span>Actividades</span><small>作业</small></h2></div>
  <div id="lineas" style="display:flex;flex-direction:column;gap:12px"></div>
  <button class="btn" id="mas" type="button">＋ Agregar actividad</button>
  <div class="card">
    <h2><span><span class="paso">3</span>Cierre</span><small>收尾</small></h2>
    <label style="display:flex;gap:10px;align-items:center;font-size:15px"><input type="checkbox" id="sinact" style="width:22px;height:22px"> Turno sin actividad de servicios</label>
    <label class="campo">Observaciones del turno<textarea id="obs"></textarea></label>
    <div class="campo">Firma del jefe de turno * · 签名<canvas id="firma" width="600" height="200"></canvas></div>
    <button class="btn peq" id="borrar" type="button">Borrar firma</button>
  </div>
  <div class="guardar">
    <p id="hint"></p>
    <button class="btn pri" id="guardar" disabled>Guardar reporte · 保存</button>
  </div>
</section>
<!-- ============ PENDIENTES ============ -->
<section class="vista" id="v-cola">
  <div class="kpis"><div class="kpi al"><b id="n">0</b><span>Por enviar</span></div><div class="kpi"><b id="nl">0</b><span>Actividades</span></div><div class="kpi"><b id="nf">0</b><span>Fotos</span></div></div>
  <ul id="lista"></ul>
  <div class="card dest"><h2>Enviar · 发送</h2>
    <div class="btns"><button class="btn pri" id="exp">JSON</button><button class="btn" id="pdf">PDF</button></div>
    <small style="color:var(--gris)">JSON: se comparte por Teams/WhatsApp/correo y se importa con <code>python -m sam app</code>. PDF: en el diálogo elija «Guardar como PDF».</small>
    <button class="btn mal" id="vaciar">Ya los envié: vaciar lista</button></div>
</section>
<!-- ============ MAESTRO ============ -->
<section class="vista" id="v-maestro">
  <div class="card"><h2>Maestro · 主表</h2>
    <div class="aviso info" id="mest">Sin maestro cargado.</div>
    <label class="campo">Cargar Maestro_SAM.xlsx, Plan_SAM.xlsx o maestro.json<input type="file" id="mf" accept=".xlsx,.json" style="height:auto;padding:10px"></label>
    <small style="color:var(--gris)">Basta con cambiar la FECHA en la hoja Meta del Excel: la app acepta el más reciente y rechaza uno anterior.</small>
  </div>
</section>
</main>
<nav class="nav">
  <button data-v="nuevo" class="on"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nuevo · 新建</button>
  <button data-v="cola"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>Pendientes · 待发<i id="nb" hidden>0</i></button>
  <button data-v="maestro"><svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>Maestro · 主表</button>
</nav>
</div>
<div class="toast" id="toast" role="status"></div>
<datalist id="dl"></datalist>
<div id="imp"></div>
`;
