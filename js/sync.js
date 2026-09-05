/* SIS JUPI · sincronización por archivo ─────────────────────────────
   Tableta  → crea JUPI-T01-fecha.sync con sus registros sin confirmar
   Central  → importa, asigna códigos definitivos, genera ACUSE-….sync
   Tableta  → abre el acuse: registros en verde, códigos definitivos  */
'use strict';

const RE_PROV = /^(.+)-(T\d{2,})-(\d+)$/;   // SANE-T01-0001 · PAGO-SANE-T01-000001 · GASTO-T01-000001

/* ── TABLETA: crear paquete ── */
async function exportarSync(){
  const pend = noConfirmados();
  const u = S.user; const d = ahora();
  const codigos = new Set(pend.map(r => r.codigo));
  const paquete = {
    tipo: 'sync', v: 1, disp: DB.inst.disp, usuario: u.user, nombre: u.nombre, fecha: fecha(d), hora: hora(d),
    regs: pend.map(r => ({...r})),
    estudiantes: DB.estudiantes.filter(e => codigos.has(e.codigo) && !e.delCentro),
    pagos: DB.pagos.filter(p => codigos.has(p.codigo)),
    gastos: DB.gastos.filter(g => codigos.has(g.codigo)),
    clientes: DB.gabinete.clientes.filter(c => codigos.has(c.id)),
    casos: DB.gabinete.casos.filter(c => codigos.has(c.id) || pend.some(r => r.codigo === c.id)),
    alta: u.altaConfirmada === false ? {user:u.user, nombre:u.nombre, rol:u.rol, disp:u.disp, centros:u.centros, perm:u.perm, token:u.token} : null,
  };
  const nombre = `JUPI-${DB.inst.disp}-${ymd(d)}-${pad(d.getHours(),2)}${pad(d.getMinutes(),2)}.sync`;
  pend.forEach(r => r.estado = 'enviado'); await guardarYa();
  return { nombre, texto: JSON.stringify(paquete), n: pend.length };
}

/* ── CENTRAL: importar paquete ── */
function mapearCodigo(cod, anio){
  if(!cod || cod === '—') return cod;
  if(DB.mapas[cod]) return DB.mapas[cod];
  const m = RE_PROV.exec(cod); if(!m) return cod;              // ya es definitivo
  const [, tipo, , num] = m; const k = tipo + '-' + anio; DB.contadores[k] = (DB.contadores[k]||0) + 1;
  const def = `${tipo}-${anio}-${pad(DB.contadores[k], num.length)}`; DB.mapas[cod] = def; return def;
}
function importarPaquete(p, origen){
  const res = { nuevos:0, dup:0, alta:null, rechazo:null };
  if(!p || p.tipo !== 'sync' || !Array.isArray(p.regs)) { res.rechazo = 'Ese archivo no es un .sync de SIS JUPI'; return res; }
  // Alta de usuario nuevo: solo si la invitación existe y no se ha usado por otro
  if(p.alta){
    const inv = DB.invitaciones.find(i => i.token === p.alta.token);
    if(!inv){ res.rechazo = 'Este archivo viene de una tableta que no has invitado tú. No se importa.'; return res; }
    if(inv.usada && inv.user !== p.alta.user){ res.rechazo = 'La invitación de esta tableta ya la usó otra persona.'; return res; }
    inv.usada = true; let u = usuario(p.alta.user); const eraNuevo = !u || u.altaConfirmada === false;
    if(!u){ u = {user:p.alta.user, nombre:p.alta.nombre, rol:p.alta.rol, disp:p.alta.disp, activo:true, hash:'', salt:'', centros:p.alta.centros, perm:p.alta.perm, altaConfirmada:true, token:p.alta.token}; DB.usuarios.push(u); }
    else u.altaConfirmada = true;
    let d = DB.dispositivos.find(x => x.id === p.alta.disp); if(d){ d.user = u.user; d.nombre = u.nombre; d.estado = 'activo'; }
    if(eraNuevo){ res.alta = u; notificar('👤', `Nuevo usuario: ${u.nombre} (${u.user}) en la ${p.alta.disp}`); }
  } else {
    const disp = DB.dispositivos.find(x => x.id === p.disp);
    if(!disp || disp.estado === 'sin registrar'){ res.rechazo = `La tableta ${p.disp} no está dada de alta en esta central.`; return res; }
  }
  const anio = (aDate(p.fecha) || ahora()).getFullYear();
  const ids = [];
  // Entidades: se añaden con código definitivo (si ya existe el mapa, se ignoran)
  const meter = (lista, obj, clave) => { const prov = obj[clave]; const def = mapearCodigo(prov, anio); if(lista.some(x => x[clave] === def)) return; obj = {...obj, [clave]: def, codigoProv: prov}; lista.push(obj); };
  (p.estudiantes||[]).forEach(e => { meter(DB.estudiantes, {...e, delCentro:false}, 'codigo'); });
  (p.pagos||[]).forEach(x => meter(DB.pagos, {...x, estudiante: mapearCodigo(x.estudiante, anio)}, 'codigo'));
  (p.gastos||[]).forEach(x => meter(DB.gastos, x, 'codigo'));
  (p.clientes||[]).forEach(x => meter(DB.gabinete.clientes, x, 'id'));
  (p.casos||[]).forEach(x => meter(DB.gabinete.casos, {...x, cliente: mapearCodigo(x.cliente, anio)}, 'id'));
  // Registros de auditoría: duplicados por ID
  p.regs.forEach(r => {
    ids.push(r.id);
    if(DB.registros.some(x => x.id === r.id)){ res.dup++; return; }
    DB.registros.push({...r, codigoProv: r.codigo, codigo: mapearCodigo(r.codigo, anio), estado:'sincronizado'}); res.nuevos++;
  });
  recalcularSaldos();
  // Dispositivo y notificaciones
  const d = DB.dispositivos.find(x => x.id === p.disp); if(d) d.ultSync = fecha(ahora()) + ' ' + hora(ahora());
  const mapa = {}; [...(p.regs||[]).map(r=>r.codigo), ...(p.estudiantes||[]).map(e=>e.codigo), ...(p.pagos||[]).map(x=>x.codigo), ...(p.gastos||[]).map(x=>x.codigo), ...(p.clientes||[]).map(x=>x.id), ...(p.casos||[]).map(x=>x.id)].forEach(c => { if(DB.mapas[c]) mapa[c] = DB.mapas[c]; });
  const u = usuario(p.usuario);
  const centros = u ? u.centros : [];
  const acuse = { tipo:'acuse', v:1, disp:p.disp, para:p.usuario, de:S.user ? S.user.nombre : 'Administrador', fecha:fecha(ahora()), hora:hora(ahora()), ids, mapa,
    cfg:{tarifas:DB.tarifas, especialidades:DB.especialidades, niveles:DB.niveles, version:DB.cfgVersion},
    cuenta: u ? {perm:u.perm, centros:u.centros, activo:u.activo, nombre:u.nombre} : null,
    estudiantes: DB.estudiantes.filter(e => centros.includes(e.centro)).map(e => ({codigo:e.codigo, centro:e.centro, nombre:e.nombre, apellidos:e.apellidos, especialidad:e.especialidad, nivel:e.nivel, turno:e.turno, tel:e.tel, matricula:e.matricula, mensualidad:e.mensualidad, pagado:e.pagado, saldo:e.saldo, fmat:e.fmat})),
    nombreArchivo: `ACUSE-${p.disp}-${ymd(ahora())}-${pad(ahora().getHours(),2)}${pad(ahora().getMinutes(),2)}.sync` };
  DB.acuses.unshift(acuse); DB.acuses = DB.acuses.slice(0, 50);
  res.acuse = acuse;
  if(res.nuevos) notificar('📥', `Importado archivo de ${p.nombre||p.usuario} (${p.disp}): ${res.nuevos} registros nuevos`);
  const nMat = p.regs.filter(r=>r.tipo==='matricula').length, nPag = p.regs.filter(r=>r.tipo==='pago').length, nGas = p.regs.filter(r=>r.tipo==='gasto').length;
  if(nMat) notificar('🎓', `${nMat} matrícula${nMat>1?'s':''} nueva${nMat>1?'s':''} de ${p.nombre||p.usuario}`);
  if(nPag) notificar('💰', `${nPag} pago${nPag>1?'s':''} de ${p.nombre||p.usuario} · ${fmt(p.regs.filter(r=>r.tipo==='pago').reduce((a,r)=>a+r.importe,0))}`);
  if(nGas) notificar('💸', `${nGas} gasto${nGas>1?'s':''} de ${p.nombre||p.usuario} · ${fmt(p.regs.filter(r=>r.tipo==='gasto').reduce((a,r)=>a+r.importe,0))}`);
  registrar({accion:'Importación', modulo:'Sincronización', concepto:`Archivo de ${p.disp}: ${res.nuevos} nuevos, ${res.dup} repetidos`, codigo:p.disp, tipo:'sync'});
  guardar(); return res;
}
function recalcularSaldos(){
  DB.estudiantes.forEach(e => { if(e.delCentro) return; const pag = DB.pagos.filter(p => p.estudiante === e.codigo).reduce((a,p)=>a+p.importe,0); e.pagado = pag; e.saldo = Math.max(0, (e.matricula||0) + (e.mensualidad||0) + (e.extras||0) - pag); });
  DB.gabinete.casos.forEach(c => { const pag = DB.pagos.filter(p => p.estudiante === c.id).reduce((a,p)=>a+p.importe,0); if(pag) c.pagado = pag; });
}

/* ── TABLETA: aplicar acuse ── */
function aplicarAcuse(a){
  if(!a || a.tipo !== 'acuse') return { ok:false, msg:'Ese archivo no es un acuse del administrador' };
  if(a.disp !== DB.inst.disp) return { ok:false, msg:`Ese acuse es para la tableta ${a.disp}, no para esta (${DB.inst.disp})` };
  let n = 0; a.ids.forEach(id => { const r = DB.registros.find(x => x.id === id); if(r && r.estado !== 'sincronizado'){ r.estado = 'sincronizado'; n++; } });
  const m = a.mapa || {}; const map = c => m[c] || c;
  DB.registros.forEach(r => { r.codigo = map(r.codigo); });
  DB.estudiantes.forEach(e => { e.codigo = map(e.codigo); });
  DB.pagos.forEach(p => { p.codigo = map(p.codigo); p.estudiante = map(p.estudiante); });
  DB.gastos.forEach(g => { g.codigo = map(g.codigo); });
  DB.gabinete.clientes.forEach(c => { c.id = map(c.id); });
  DB.gabinete.casos.forEach(c => { c.id = map(c.id); c.cliente = map(c.cliente); });
  if(a.cfg){ DB.tarifas = a.cfg.tarifas || DB.tarifas; DB.especialidades = a.cfg.especialidades || DB.especialidades; DB.niveles = a.cfg.niveles || DB.niveles; DB.cfgVersion = a.cfg.version || DB.cfgVersion; }
  // Estudiantes del centro que no son de esta tableta (solo lectura, para poder cobrarles)
  (a.estudiantes||[]).forEach(e => { const ex = DB.estudiantes.find(x => x.codigo === e.codigo); if(ex){ if(ex.delCentro){ Object.assign(ex, e); } } else DB.estudiantes.push({...e, delCentro:true, asist:[], notas:[]}); });
  if(S.user && S.user.altaConfirmada === false){ S.user.altaConfirmada = true; }
  if(a.cuenta && S.user){ S.user.perm = a.cuenta.perm || S.user.perm; S.user.centros = a.cuenta.centros || S.user.centros; if(a.cuenta.activo === false){ S.user.activo = false; } }
  DB.acuses.unshift({id:a.nombreArchivo, fecha:a.fecha, n}); DB.acuses = DB.acuses.slice(0,20);
  guardar(); return { ok:true, n };
}

/* ── Recibir cualquier archivo (botón, arrastrar o compartir) ── */
async function procesarTexto(texto, nombreArchivo){
  let obj; try { obj = JSON.parse(texto); } catch(e){ toast('Ese archivo no es de SIS JUPI','err'); return; }
  if(obj.tipo === 'sync'){
    if(!esCentral()) return toast('Los archivos .sync se abren en el aparato del administrador, no aquí','warn');
    if(DB.bandeja.some(b => b.nombre === nombreArchivo && !b.importado)) return toast('Ese archivo ya está en la bandeja','warn');
    DB.bandeja.unshift({nombre:nombreArchivo, disp:obj.disp, usuario:obj.usuario, nombreUsuario:obj.nombre, fecha:obj.fecha, hora:obj.hora, n:obj.regs.length, paquete:obj, importado:false, recibido:fecha(ahora())+' '+hora(ahora())});
    guardar(); toast('Archivo recibido. Pulsa Importar.','ok'); render();
  } else if(obj.tipo === 'acuse'){
    if(esCentral()) return toast('Los acuses se abren en la tableta del usuario, no aquí','warn');
    const r = aplicarAcuse(obj); if(!r.ok) return toast(r.msg,'err');
    abrirModal('✅ Confirmado', `<div class="pasos"><div class="paso-g"><div class="num ok">✓</div><div><b>El administrador ha recibido tu trabajo</b><p>${r.n} registros confirmados y ya en verde.${obj.cfg?' Precios y listas actualizados.':''}</p></div></div></div><div class="form-foot" style="margin-top:1rem"><button class="btn grande" onclick="cerrarModal()">Cerrar</button></div>`);
    render();
  } else if(obj.tipo === 'copia'){
    if(!esCentral()) return toast('Las copias de seguridad se recuperan en el aparato del administrador','warn');
    confirmarRestaurar(obj);
  } else toast('Ese archivo no es de SIS JUPI','err');
}
async function abrirArchivos(input){ for(const f of input.files){ await procesarTexto(await leerArchivo(f), f.name); } input.value=''; }
async function procesarCompartidos(){
  if(!('caches' in window)) return;
  try{ const c = await caches.open('sisjupi-compartidos'); const keys = await c.keys();
    for(const k of keys){ const r = await c.match(k); const nombre = decodeURIComponent(k.url.split('/').pop()); await procesarTexto(await r.text(), nombre); await c.delete(k); }
  }catch(e){}
}

/* ── Copias de seguridad (central) ── */
async function guardarCopia(){
  await guardarYa(); const d = ahora();
  const copia = { tipo:'copia', v:1, fecha:fecha(d), hora:hora(d), datos: JSON.parse(JSON.stringify(DB)) };
  const nombre = `COPIA-SISJUPI-${ymd(d)}-${pad(d.getHours(),2)}${pad(d.getMinutes(),2)}.jupi`;
  DB.ultimoBackup = fecha(d); registrar({accion:'Copia de seguridad', modulo:'Sistema', concepto:'Copia completa guardada', codigo:nombre}); guardar();
  const r = await compartirTexto(nombre, JSON.stringify(copia), 'Copia de seguridad SIS JUPI');
  toast(r === 'descargado' ? 'Copia guardada en Descargas. Pásala a un USB o a tu móvil.' : 'Copia lista para compartir', 'ok'); render();
}
function confirmarRestaurar(obj){
  abrirModal('Recuperar desde una copia', `<div class="aviso rojo">⚠️ Esto sustituye TODOS los datos actuales por los de la copia del <b>&nbsp;${esc(obj.fecha)} ${esc(obj.hora)}</b>. Solo hazlo si has cambiado de aparato o has perdido los datos.</div>
    <div class="form-foot"><button class="btn sec2" onclick="cerrarModal()">Cancelar</button><button class="btn rojo grande" onclick="restaurar()">Sí, recuperar</button></div>`);
  window._copiaPendiente = obj;
}
async function restaurar(){
  const obj = window._copiaPendiente; if(!obj || !obj.datos) return;
  const admin = S.user; DB = Object.assign(DB_DEFECTO(), obj.datos);
  if(admin && !usuario(admin.user)) DB.usuarios.push(admin);   // nunca dejar al admin fuera
  DB.inst = DB.inst || {rol:'central', disp:'ADMIN', creada:fecha(ahora()), cuenta:admin?admin.user:'admin'};
  await guardarYa(); cerrarModal(true); S.user = usuario(admin ? admin.user : DB.inst.cuenta) || DB.usuarios[0];
  toast(`Datos recuperados de la copia del ${obj.fecha}`,'ok'); construirMenu(); irSec('inicio');
}
