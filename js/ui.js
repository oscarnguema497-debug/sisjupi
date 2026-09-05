/* SIS JUPI · interfaz ───────────────────────────────────────────── */
'use strict';

const SECS = {
  inicio:['🏠','Inicio'], sync:['📂','Archivos recibidos'], usuarios:['👥','Usuarios'], precios:['🏷️','Precios'],
  sane:['🎓','SANE FP'], jupi1:['🏫','JUPI 1'], jupi2:['🏫','JUPI 2'], gabinete:['⚖️','Abogado'],
  finanzas:['💰','Pagos y gastos'], informes:['📊','Informes'], historial:['🧭','Historial'], avisos:['🔔','Avisos'], copias:['💾','Copias de seguridad'], cuenta:['👤','Mi cuenta'],
};
const puede = p => S.user.rol === 'admin' || (S.user.perm||[]).includes(p);
const misCentros = () => S.user.centros.filter(c => c !== 'GABINETE');
const estDe = () => esCentral() ? DB.estudiantes : DB.estudiantes;

function secsVisibles(){
  const u = S.user;
  if(esCentral()) return ['inicio','sync','usuarios','precios','sane','jupi1','jupi2','gabinete','finanzas','informes','historial','avisos','copias','cuenta'];
  if(u.rol === 'gabinete') return ['inicio','gabinete','historial','cuenta'];
  const v = ['inicio']; ['SANE','JUPI1','JUPI2'].forEach(c => { if(u.centros.includes(c)) v.push(c.toLowerCase()); });
  v.push('historial','cuenta'); return v;
}
function construirMenu(){
  const v = secsVisibles(); const u = S.user;
  const grupos = esCentral()
    ? [['Menú',['inicio','sync']],['Personas',['usuarios','precios']],['Negocios',['sane','jupi1','jupi2','gabinete']],['Control',['finanzas','informes','historial','avisos','copias','cuenta']]]
    : [['Menú',['inicio']],['Mis estudiantes',v.filter(x=>!['inicio','historial','cuenta'].includes(x))],['Mi trabajo',['historial','cuenta']]];
  let h = `<div class="sb-brand"><div class="mini">🎓</div><div>SIS JUPI<small>${esCentral()?'CENTRAL':'TABLETA '+DB.inst.disp}</small></div></div>`;
  grupos.forEach(g => { const it = g[1].filter(x=>v.includes(x)); if(!it.length) return; h += `<div class="sb-label">${g[0]}</div>`; it.forEach(k => { h += `<div class="sb-item" data-sec="${k}" onclick="irSec('${k}')"><span class="sb-icon">${SECS[k][0]}</span>${SECS[k][1]}${k==='avisos'?'<span class="sb-badge" id="sb-nnew"></span>':k==='sync'?'<span class="sb-badge" id="sb-nband"></span>':''}</div>`; }); });
  h += `<div class="sb-space"></div><div class="sb-bottom"><div class="sb-info"><strong>${esc(u.nombre)}</strong><span class="mono">${esc(u.user)}</span> · <span class="mono">${DB.inst.disp}</span></div><button class="btn-salir" onclick="salir()">Cerrar sesión</button></div>`;
  $('sidebar').innerHTML = h;
  const mov = ['inicio', ...v.filter(x=>x!=='inicio').slice(0,5)];
  $('navmov').innerHTML = mov.map(k=>`<div class="sb-item" data-sec="${k}" onclick="irSec('${k}')"><span class="sb-icon">${SECS[k][0]}</span>${SECS[k][1]}</div>`).join('');
  $('btn-sync').style.display = esCentral() ? 'none' : ''; $('btn-abrir').style.display = esCentral() ? '' : 'none';
}
function irSec(k){ S.sec = k; document.querySelectorAll('[data-sec]').forEach(e => e.classList.toggle('act', e.dataset.sec === k)); $('tb-title').innerHTML = `${SECS[k][1]}<small>${esCentral()?'Administrador':esc(S.user.nombre)+' · '+DB.inst.disp}</small>`; render(); window.scrollTo(0,0); }
function render(){
  const f = window['sec_'+S.sec]; $('contenido').innerHTML = `<div class="sec act">${f ? f() : '<div class="vacio">Sección no disponible</div>'}</div>`;
  const n = noConfirmados().length; const p = $('tb-pend'); if(p){ p.style.display = esCentral()?'none':''; p.className = 'pill '+(n?'pend':'ok'); p.innerHTML = (n?'🟠 ':'🟢 ')+`${n} ${n?'sin confirmar':'todo al día'}`; }
  const nn = DB.notifs.filter(x=>x.new).length; const b=$('sb-nnew'); if(b){ b.textContent=nn; b.style.display=nn?'':'none'; }
  const nb = DB.bandeja.filter(x=>!x.importado).length; const b2=$('sb-nband'); if(b2){ b2.textContent=nb; b2.style.display=nb?'':'none'; }
}
const tile = (ic,t,s,fn,cls='',badge='') => `<div class="tile ${cls}" onclick="${fn}">${badge?`<span class="badge">${badge}</span>`:''}<div class="ic">${ic}</div><div class="t">${t}</div><div class="s">${s}</div></div>`;

/* ═══ INICIO ═══ */
function sec_inicio(){ return esCentral() ? inicioCentral() : inicioTableta(); }
function inicioTableta(){
  const u = S.user, nc = noConfirmados(), env = nc.filter(r=>r.estado==='enviado').length;
  let t = '';
  if(u.rol === 'gabinete'){ t += tile('⚖️','Casos','Clientes y cobros',"irSec('gabinete')"); }
  else {
    if(puede('matriculas')) misCentros().forEach(c => t += tile('🎓','Matricular',CENTRO_NOMBRE[c],`formMatricula('${c}')`));
    if(puede('pagos')) t += tile('💰','Cobrar','Un pago de un estudiante','formPago()','verde');
    if(puede('gastos')) t += tile('💸','Apuntar gasto','Algo que se ha pagado','formGasto()','rojo');
  }
  t += tile('🔄','SINCRONIZAR','Enviar al administrador','sincronizar()','oro', nc.length||'');
  t += tile('📥','Abrir un archivo','Del administrador (acuse)','$(\'f-abrir\').click()');
  const regs = DB.registros.slice(-5).reverse();
  return `<div class="sec-head"><div><h2>Hola, ${esc(u.nombre)}</h2><p>Tableta ${DB.inst.disp} · ${DIAS[ahora().getDay()]} ${fecha(ahora())}</p></div></div>
  ${u.altaConfirmada===false?`<div class="aviso">👤 Tu cuenta aún no ha llegado al administrador. Con tu primera sincronización aparecerás en su sistema.</div>`:''}
  ${nc.length?`<div class="aviso">🟠 Tienes <b>&nbsp;${nc.length}&nbsp;</b> registros sin confirmar${env?` (${env} ya enviados, esperando el acuse)`:''}. Al terminar el día pulsa SINCRONIZAR.</div>`:`<div class="aviso verde">🟢 Todo al día. No tienes nada pendiente de enviar.</div>`}
  <div class="tiles">${t}</div>
  <div class="card"><h3>Lo último que has hecho <span class="r">${DB.registros.length} en total · <a href="#" onclick="irSec('historial');return false">ver todo</a></span></h3>${tablaRegistros(regs,true)}</div>`;
}
function inicioCentral(){
  const ops = DB.usuarios.filter(u=>u.rol!=='admin'&&u.altaConfirmada!==false);
  const ing = DB.pagos.reduce((a,p)=>a+p.importe,0), gas = DB.gastos.reduce((a,g)=>a+g.importe,0), deuda = DB.estudiantes.reduce((a,e)=>a+Math.max(0,e.saldo||0),0);
  const band = DB.bandeja.filter(b=>!b.importado), dbk = diasDesde(DB.ultimoBackup);
  const tarde = ops.filter(u => { const d = DB.dispositivos.find(x=>x.id===u.disp); return d && diasDesde(d.ultSync) > 3; });
  const vacio = !DB.registros.some(r => r.usuario !== S.user.user);
  return `<div class="sec-head"><div><h2>Hola, ${esc(S.user.nombre)}</h2><p>${DIAS[ahora().getDay()]} ${fecha(ahora())} · este aparato es la central</p></div></div>
  <div class="card recibir" ondragover="event.preventDefault();this.classList.add('sobre')" ondragleave="this.classList.remove('sobre')" ondrop="soltar(event)"><div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap"><div style="font-size:2.2rem">📂</div><div style="flex:1"><b style="font-size:1rem;color:var(--azul)">Recibir un archivo de sincronización</b><p style="font-size:.8rem;margin-top:.2rem">Cuando un usuario te mande su archivo <span class="mono">.sync</span>, ábrelo aquí (o compártelo directamente a esta app).${band.length?` <b style="color:var(--nj)">Tienes ${band.length} sin importar.</b>`:''}</p></div><button class="btn grande oro" onclick="$('f-abrir').click()">📂 Abrir archivo</button></div>
  ${band.length?`<div style="margin-top:.8rem;border-top:1px solid #FDE68A;padding-top:.6rem">${band.map(b=>`<div style="display:flex;align-items:center;gap:.7rem;font-size:.82rem;padding:.3rem 0;flex-wrap:wrap"><span>📄</span><span style="flex:1"><b>${esc(b.nombreUsuario||b.usuario)}</b> · ${b.disp} · ${b.n} registros · ${b.fecha}</span><button class="btn" onclick="importarDeBandeja('${b.nombre}')">✅ Importar</button></div>`).join('')}</div>`:''}</div>
  ${tarde.length?`<div class="aviso">🟠 ${tarde.map(u=>esc(u.nombre)).join(', ')} ${tarde.length>1?'llevan':'lleva'} más de 3 días sin enviar nada.<button class="btn sec2" onclick="irSec('sync')">Ver tabletas</button></div>`:''}
  ${dbk>7?`<div class="aviso rojo">💾 Llevas ${dbk} días sin guardar una copia de seguridad.<button class="btn rojo" onclick="guardarCopia()">Guardar copia ahora</button></div>`:''}
  ${vacio?`<div class="aviso azul">👋 Todavía no has recibido datos de nadie. Empieza por <b>&nbsp;Usuarios → Añadir una persona</b>.</div>`:''}
  <h3 class="sub">Cómo va el negocio</h3>
  <div class="grid g4" style="margin-bottom:1rem">
    <div class="kpi verde"><div class="l">Ha entrado</div><div class="v">${fmt(ing)}</div><div class="s">${DB.pagos.length} pagos</div></div>
    <div class="kpi rojo"><div class="l">Ha salido</div><div class="v">${fmt(gas)}</div><div class="s">${DB.gastos.length} gastos</div></div>
    <div class="kpi oro"><div class="l">Queda</div><div class="v">${fmt(ing-gas)}</div></div>
    <div class="kpi nj"><div class="l">Te deben</div><div class="v">${fmt(deuda)}</div><div class="s">${DB.estudiantes.filter(e=>e.saldo>0).length} estudiantes</div></div>
  </div>
  <div class="card" style="margin-bottom:1rem"><h3>Por negocio</h3><div class="tbl-wrap"><table><tr><th>Negocio</th><th class="num">Estudiantes</th><th class="num">Ha entrado</th><th class="num">Ha salido</th><th class="num">Te deben</th><th></th></tr>
  ${['SANE','JUPI1','JUPI2'].map(c=>{const es=DB.estudiantes.filter(e=>e.centro===c);const i=DB.pagos.filter(p=>p.centro===c).reduce((a,p)=>a+p.importe,0);const g=DB.gastos.filter(x=>x.centro===c).reduce((a,x)=>a+x.importe,0);const d=es.reduce((a,e)=>a+Math.max(0,e.saldo||0),0);return `<tr class="click" onclick="irSec('${c.toLowerCase()}')"><td><b>${CENTRO_NOMBRE[c]}</b></td><td class="num">${es.length}</td><td class="num" style="color:var(--verde)">${fmt(i)}</td><td class="num" style="color:var(--rojo)">${fmt(g)}</td><td class="num">${d?`<b style="color:var(--nj)">${fmt(d)}</b>`:'—'}</td><td style="color:var(--g3)">ver ›</td></tr>`;}).join('')}
  <tr class="click" onclick="irSec('gabinete')"><td><b>Abogado</b></td><td class="num">${DB.gabinete.casos.filter(c=>c.estado!=='Cerrado').length} casos</td><td class="num" style="color:var(--verde)">${fmt(DB.pagos.filter(p=>p.centro==='GABINETE').reduce((a,p)=>a+p.importe,0))}</td><td class="num" style="color:var(--rojo)">${fmt(DB.gastos.filter(x=>x.centro==='GABINETE').reduce((a,x)=>a+x.importe,0))}</td><td class="num"><b style="color:var(--nj)">${fmt(DB.gabinete.casos.reduce((a,c)=>a+Math.max(0,(c.honor||0)-(c.pagado||0)),0))}</b></td><td style="color:var(--g3)">ver ›</td></tr></table></div></div>
  <div class="grid g2">
    <div class="card"><h3>👥 Tus usuarios <span class="r">Toca uno para ver su trabajo</span></h3><div class="lista-usr">${ops.length?ops.map(u=>{const d=DB.dispositivos.find(x=>x.id===u.disp)||{};const n=diasDesde(d.ultSync);return `<div class="usr-row" onclick="verUsuario('${u.user}')"><div class="avatar">${esc(u.nombre.slice(0,2).toUpperCase())}</div><div><div class="n">${esc(u.nombre)} <span class="tag">${u.disp}</span></div><div class="d">${u.centros.map(c=>CENTRO_NOMBRE[c]).join(', ')}</div></div><div class="r">${n>3?`<span class="est pend">Sin enviar ${hace(d.ultSync)}</span>`:`<span class="est sinc">Envió ${hace(d.ultSync)}</span>`}</div></div>`;}).join(''):'<div class="vacio">Aún no hay usuarios. Añade el primero en Usuarios.</div>'}</div></div>
    <div class="card"><h3>🔔 Avisos <span class="r"><a href="#" onclick="irSec('avisos');return false">ver todos</a></span></h3>${DB.notifs.slice(0,6).map(n=>`<div class="notif ${n.new?'new':''}"><div class="ic">${n.ic}</div><div>${esc(n.txt)}<div class="t">${n.fecha} ${n.hora}</div></div></div>`).join('')||'<div class="vacio">Sin avisos</div>'}</div>
  </div>`;
}
async function soltar(ev){ ev.preventDefault(); ev.currentTarget.classList.remove('sobre'); for(const f of ev.dataTransfer.files){ await procesarTexto(await leerArchivo(f), f.name); } }

/* ═══ SINCRONIZAR (tableta) ═══ */
async function sincronizar(){
  const pend = noConfirmados();
  if(!pend.length) return abrirModal('✅ Nada que enviar', `<div class="pasos"><div class="paso-g"><div class="num ok">✓</div><div><b>Todo está al día</b><p>No tienes registros sin confirmar.</p></div></div></div><div class="form-foot" style="margin-top:1rem"><button class="btn grande" onclick="cerrarModal()">Cerrar</button></div>`);
  const enviados = pend.filter(r=>r.estado==='enviado').length;
  const { nombre, texto, n } = await exportarSync();
  window._ultimoSync = { nombre, texto };
  abrirModal('🔄 Enviar al administrador', `<div class="pasos">
    <div class="paso-g"><div class="num ok">✓</div><div><b>Archivo creado</b><p><span class="mono">${nombre}</span> · ${n} registros${enviados?` (${enviados} ya se habían enviado antes; van incluidos por si no llegaron)`:''}</p></div></div>
    <div class="paso-g"><div class="num">2</div><div><b>Mándaselo al administrador</b><p>Por WhatsApp, Bluetooth o como prefieras.</p><div class="acciones" style="margin-top:.6rem"><button class="btn verde grande" onclick="compartirUltimo()">📤 Enviar…</button><button class="btn sec2" onclick="descargarTexto(_ultimoSync.nombre,_ultimoSync.texto);toast('Guardado en Descargas','ok')">💾 Guardar el archivo</button></div></div></div>
    <div class="paso-g"><div class="num">3</div><div><b>Cuando te devuelva el acuse, ábrelo aquí</b><p>Con "Abrir un archivo" en Inicio (o compártelo a esta app). Tus registros pasarán a verde.</p></div></div>
  </div><div class="form-foot" style="margin-top:1rem"><button class="btn grande" onclick="cerrarModal();render()">Listo</button></div>`);
  render();
}
async function compartirUltimo(){ const r = await compartirTexto(_ultimoSync.nombre, _ultimoSync.texto, 'Sincronización SIS JUPI'); if(r==='descargado') toast('Tu navegador no permite compartir: el archivo se ha guardado en Descargas','warn'); else if(r==='compartido') toast('Enviado','ok'); }

/* ═══ ARCHIVOS RECIBIDOS (central) ═══ */
function sec_sync(){
  const pend = DB.bandeja.filter(b=>!b.importado), hechos = DB.bandeja.filter(b=>b.importado).slice(0,30);
  const ops = DB.usuarios.filter(u=>u.rol!=='admin'&&u.altaConfirmada!==false);
  return `<div class="sec-head"><div><h2>Archivos recibidos</h2><p>Aquí llegan los archivos que te envían los usuarios. Ábrelos y pulsa Importar.</p></div><div class="acciones"><button class="btn grande oro" onclick="$('f-abrir').click()">📂 Abrir archivo .sync</button></div></div>
  ${pend.length?`<div class="card amarillo"><h3>📥 Sin importar <span class="r">${pend.length}</span></h3>${pend.map(b=>`<div class="fila"><span style="font-size:1.4rem">📄</span><div style="flex:1"><b>${esc(b.nombreUsuario||b.usuario)}</b> · ${b.disp} · ${b.n} registros<br><span class="mono" style="color:var(--g3)">${esc(b.nombre)} · ${b.fecha} ${b.hora}</span></div><button class="btn grande" onclick="importarDeBandeja('${esc(b.nombre)}')">✅ Importar</button></div>`).join('')}</div>`:`<div class="aviso">📭 No tienes archivos nuevos.</div>`}
  <div class="grid g2"><div class="card"><h3>Estado de cada tableta</h3>${ops.length?ops.map(u=>{const d=DB.dispositivos.find(x=>x.id===u.disp)||{};const n=diasDesde(d.ultSync);return `<div class="fila"><div class="avatar">${esc(u.nombre.slice(0,2).toUpperCase())}</div><div style="flex:1"><b>${esc(u.nombre)}</b> <span class="tag">${u.disp}</span><br><span style="color:${n>3?'var(--rojo)':'var(--g3)'}">Último archivo: ${hace(d.ultSync)}</span></div>${n>3?'<span class="est pend">Reclámaselo</span>':'<span class="est sinc">Al día</span>'}</div>`;}).join(''):'<div class="vacio">Sin usuarios todavía</div>'}</div>
  <div class="card"><h3>Ya importados <span class="r">${hechos.length}</span></h3>${hechos.length?hechos.map(b=>`<div class="fila" style="font-size:.78rem">✅ <b>${b.disp}</b> · ${b.n} registros · <span class="mono">${b.fecha}</span> · ${b.nuevos} nuevos, ${b.dup} repetidos${b.acuse?` <button class="btn-mini oro" onclick="enviarAcuse('${esc(b.nombre)}')">📤 Acuse</button>`:''}</div>`).join(''):'<div class="vacio">Todavía no has importado ningún archivo</div>'}</div></div>`;
}
function importarDeBandeja(nombre){
  const b = DB.bandeja.find(x=>x.nombre===nombre); if(!b) return;
  const r = importarPaquete(b.paquete, 'bandeja');
  if(r.rechazo){ b.importado = true; b.rechazado = r.rechazo; guardar(); render(); return abrirModal('No se ha importado', `<div class="aviso rojo">⛔ ${esc(r.rechazo)}</div><div class="form-foot"><button class="btn" onclick="cerrarModal()">Cerrar</button></div>`); }
  b.importado = true; b.nuevos = r.nuevos; b.dup = r.dup; b.acuse = r.acuse.nombreArchivo; guardar();
  abrirModal('✅ Importado', `<div class="pasos">${r.alta?`<div class="paso-g"><div class="num ok">👤</div><div><b>Nuevo usuario: ${esc(r.alta.nombre)}</b><p>Se ha registrado con tu invitación y ya aparece en Usuarios.</p></div></div>`:''}
    <div class="paso-g"><div class="num ok">✓</div><div><b>${r.nuevos} registros nuevos guardados</b><p>${r.dup?r.dup+' ya los tenías y se han ignorado. ':''}Ya cuentan en tus informes.</p></div></div>
    <div class="paso-g"><div class="num">2</div><div><b>Devuélvele el acuse</b><p>Así sus registros se ponen en verde y recibe los precios actualizados.</p><div class="acciones" style="margin-top:.6rem"><button class="btn verde grande" onclick="enviarAcuse('${esc(nombre)}')">📤 Enviar acuse…</button><button class="btn sec2" onclick="descargarAcuse('${esc(nombre)}')">💾 Guardar acuse</button></div></div></div></div>
    <div class="form-foot" style="margin-top:1rem"><button class="btn grande" onclick="cerrarModal();render()">Cerrar</button></div>`);
  render();
}
function acuseDe(nombreBandeja){ const b = DB.bandeja.find(x=>x.nombre===nombreBandeja); return b && DB.acuses.find(a=>a.nombreArchivo===b.acuse); }
async function enviarAcuse(n){ const a = acuseDe(n); if(!a) return toast('No encuentro ese acuse','err'); const r = await compartirTexto(a.nombreArchivo, JSON.stringify(a), 'Acuse SIS JUPI'); if(r==='descargado') toast('Tu navegador no permite compartir: el acuse se ha guardado en Descargas','warn'); }
function descargarAcuse(n){ const a = acuseDe(n); if(!a) return; descargarTexto(a.nombreArchivo, JSON.stringify(a)); toast('Acuse guardado en Descargas','ok'); }

/* ═══ USUARIOS (central) ═══ */
function sec_usuarios(){
  const inv = DB.invitaciones.filter(i => !i.usada || (usuario(i.user)||{}).altaConfirmada === false);
  const us = DB.usuarios.filter(u=>u.altaConfirmada!==false);
  return `<div class="sec-head"><div><h2>Usuarios</h2><p>Añade una persona: te damos un enlace y una clave. Aparecerá como activa con su primera sincronización.</p></div><div class="acciones"><button class="btn grande" onclick="formInvitar()">＋ Añadir una persona</button></div></div>
  ${inv.length?`<div class="card amarillo"><h3>🔗 Invitaciones sin completar <span class="r">${inv.length}</span></h3>${inv.map(i=>`<div class="fila"><b>${esc(i.nombre)}</b><span style="color:var(--g3)">· ${i.disp} · ${i.centros.map(c=>CENTRO_NOMBRE[c]).join(', ')} · creada ${i.creada}</span><span style="margin-left:auto;display:flex;gap:.4rem;flex-wrap:wrap"><span class="est ${i.usada?'env':'pend'}">${i.usada?'Ya entró, falta su primer archivo':'Aún no ha entrado'}</span><button class="btn-mini" onclick="verInvitacion('${i.token}')">Ver datos</button>${i.usada?'':`<button class="btn-mini rojo" onclick="anularInv('${i.token}')">Anular</button>`}</span></div>`).join('')}</div>`:''}
  <div class="card"><div class="tbl-wrap"><table><tr><th>Nombre</th><th>Usuario</th><th>Tableta</th><th>Negocios</th><th>Puede</th><th>Estado</th><th></th></tr>
  ${us.map(u=>`<tr><td><b>${esc(u.nombre)}</b>${u.rol==='admin'?' <span class="tag oro">ADMIN</span>':u.rol==='gabinete'?' <span class="tag">ABOGADO</span>':''}</td><td class="mono">${esc(u.user)}</td><td class="mono">${u.disp}</td><td>${u.centros.map(c=>CENTRO_NOMBRE[c]).join(', ')}</td><td style="font-size:.7rem;color:var(--g3)">${u.rol==='admin'?'Todo':(u.perm||[]).map(p=>(PERMISOS.find(x=>x[0]===p)||[p,p])[1]).join(', ')||'—'}</td><td>${u.activo?'<span class="est sinc">Activa</span>':'<span class="est gris">Desactivada</span>'}</td>
  <td style="white-space:nowrap">${u.rol!=='admin'?`<button class="btn-mini" onclick="formEditarUsuario('${esc(u.user)}')">Editar</button> <button class="btn-mini ${u.activo?'rojo':''}" onclick="toggleUsuario('${esc(u.user)}')">${u.activo?'Desactivar':'Activar'}</button>`:''}</td></tr>`).join('')}</table></div>
  <p style="font-size:.72rem;color:var(--g3);margin-top:.6rem">Los cambios de permisos o desactivación llegan a la tableta con el siguiente acuse.</p></div>`;
}
function siguienteTableta(){ const n = DB.dispositivos.map(d=>+(d.id.match(/^T(\d+)$/)||[0,0])[1]); return 'T'+pad((n.length?Math.max(...n):0)+1,2); }
function formInvitar(){
  abrirModal('Añadir una persona', `<div class="form">
  <div class="campo full"><label>¿Cómo se llama?</label><input id="fi-nombre" placeholder="Ej. María Ondo"></div>
  <div class="campo"><label>¿Qué es?</label><select id="fi-rol" onchange="$('fi-centros').style.display=this.value==='gabinete'?'none':''"><option value="operativo">Trabaja en un centro</option><option value="gabinete">Abogado</option></select></div>
  <div class="campo"><label>Su tableta será</label><input value="${siguienteTableta()}" disabled></div>
  <div class="full" id="fi-centros"><div class="form-sec">¿En qué negocios trabaja?</div><div style="display:flex;gap:1rem;flex-wrap:wrap;font-size:.85rem;margin-top:.4rem">${['SANE','JUPI1','JUPI2'].map(c=>`<label><input type="checkbox" class="fi-c" value="${c}" ${c==='SANE'?'checked':''}> ${CENTRO_NOMBRE[c]}</label>`).join('')}</div>
  <div class="form-sec">¿Qué puede hacer?</div><div style="display:flex;gap:.8rem;flex-wrap:wrap;font-size:.85rem;margin-top:.4rem">${PERMISOS.map(([p,l])=>`<label><input type="checkbox" class="fi-p" value="${p}" ${p!=='gastos'?'checked':''}> ${l}</label>`).join('')}</div></div>
  <div class="form-foot"><button class="btn sec2" onclick="cerrarModal()">Cancelar</button><button class="btn grande" onclick="crearInvitacion()">Crear y generar enlace</button></div></div>`);
}
async function crearInvitacion(){
  const nombre = $('fi-nombre').value.trim(); if(!nombre) return toast('Escribe su nombre','err');
  const rol = $('fi-rol').value; const centros = rol==='gabinete' ? ['GABINETE'] : [...document.querySelectorAll('.fi-c:checked')].map(x=>x.value);
  if(!centros.length) return toast('Marca al menos un negocio','err');
  const perm = rol==='gabinete' ? ['pagos'] : [...document.querySelectorAll('.fi-p:checked')].map(x=>x.value);
  let base = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z ]/g,'').trim().split(' ')[0] || 'usuario'; let user=base, i=2; while(usuario(user)||DB.invitaciones.some(x=>x.user===user)) user = base+(i++);
  const disp = siguienteTableta(); const passIni = String(1000+Math.floor(Math.random()*9000)); const tok = token(6);
  const inv = { token:tok, user, nombre, disp, rol, centros, perm, passIni, passHash: await sha256(tok+'·'+passIni), creada: fecha(ahora()), usada:false };
  DB.invitaciones.push(inv);
  DB.dispositivos.push({ id:disp, user, nombre, ultSync:null, creado:fecha(ahora()), estado:'sin registrar' });
  registrar({accion:'Invitación creada', modulo:'Usuarios', concepto:`${nombre} (${user}) → ${disp}`, codigo:user});
  guardar(); cerrarModal(); render(); verInvitacion(tok);
}
function enlaceInvitacion(inv){
  const datos = { t:inv.token, u:inv.user, n:inv.nombre, d:inv.disp, r:inv.rol, c:inv.centros, p:inv.perm, k:inv.passHash, cfg:{tarifas:DB.tarifas, especialidades:DB.especialidades, niveles:DB.niveles} };
  const base = location.origin + location.pathname; return `${base}?i=${b64e(datos)}`;
}
function verInvitacion(tok){
  const inv = DB.invitaciones.find(i=>i.token===tok); const link = enlaceInvitacion(inv);
  const msg = `Hola ${inv.nombre}, abre este enlace en tu tableta para instalar SIS JUPI:\n${link}\n\nTu usuario: ${inv.user}\nTu clave provisional: ${inv.passIni}`;
  abrirModal(`Datos de acceso de ${esc(inv.nombre)}`, `<div class="pasos">
    <div class="paso-g"><div class="num">1</div><div><b>Mándale el enlace y la clave</b><p>Pulsa "Enviar…" y elige WhatsApp, correo o lo que uses. O copia el texto.</p></div></div>
    <div class="paso-g"><div class="num">2</div><div><div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:1.05rem"><span>Usuario: <b class="mono">${esc(inv.user)}</b></span><span>Clave: <b class="mono">${inv.passIni}</b></span><span>Tableta: <b class="mono">${inv.disp}</b></span></div><p>La primera vez que entre pondrá una clave suya.</p></div></div>
    <div class="paso-g"><div class="num">3</div><div><b>Aparecerá como activa con su primer archivo de sincronización</b></div></div></div>
  <div class="acciones" style="margin-top:1rem;justify-content:center"><button class="btn verde grande" onclick="compartirInv('${tok}')">📤 Enviar…</button><button class="btn sec2 grande" onclick="copiar(${JSON.stringify(msg).replace(/"/g,'&quot;')})">📋 Copiar</button></div>
  <details style="margin-top:.8rem"><summary style="font-size:.72rem;color:var(--g3);cursor:pointer">Ver el enlace</summary><div class="link-box">${esc(link)}</div></details>`);
}
async function compartirInv(tok){ const inv = DB.invitaciones.find(i=>i.token===tok); const link = enlaceInvitacion(inv); const text = `Hola ${inv.nombre}, abre este enlace en tu tableta para instalar SIS JUPI. Tu usuario: ${inv.user} · Tu clave provisional: ${inv.passIni}`; if(navigator.share){ try{ await navigator.share({title:'SIS JUPI', text, url:link}); return; }catch(e){} } copiar(text+'\n'+link); }
function copiar(t){ if(navigator.clipboard) navigator.clipboard.writeText(t).then(()=>toast('Copiado. Pégalo donde quieras.','ok')); else toast('Selecciona el texto y cópialo','warn'); }
function anularInv(tok){ const inv = DB.invitaciones.find(x=>x.token===tok); DB.invitaciones.splice(DB.invitaciones.indexOf(inv),1); const d = DB.dispositivos.find(x=>x.id===inv.disp); if(d && d.estado==='sin registrar') DB.dispositivos.splice(DB.dispositivos.indexOf(d),1); guardar(); toast('Invitación anulada','warn'); render(); }
function formEditarUsuario(uu){
  const u = usuario(uu);
  abrirModal(`Editar a ${esc(u.nombre)}`, `<div class="form"><div class="campo full"><label>Nombre</label><input id="fe-nombre" value="${esc(u.nombre)}"></div>
  ${u.rol!=='gabinete'?`<div class="form-sec">Negocios</div><div class="full" style="display:flex;gap:1rem;flex-wrap:wrap;font-size:.85rem">${['SANE','JUPI1','JUPI2'].map(c=>`<label><input type="checkbox" class="fe-c" value="${c}" ${u.centros.includes(c)?'checked':''}> ${CENTRO_NOMBRE[c]}</label>`).join('')}</div>
  <div class="form-sec">Puede</div><div class="full" style="display:flex;gap:.8rem;flex-wrap:wrap;font-size:.85rem">${PERMISOS.map(([p,l])=>`<label><input type="checkbox" class="fe-p" value="${p}" ${(u.perm||[]).includes(p)?'checked':''}> ${l}</label>`).join('')}</div>`:''}
  <div class="form-foot"><button class="btn sec2" onclick="cerrarModal()">Cancelar</button><button class="btn" onclick="guardarEditarUsuario('${esc(uu)}')">GUARDAR</button></div></div>`);
}
function guardarEditarUsuario(uu){ const u = usuario(uu); u.nombre = $('fe-nombre').value.trim()||u.nombre; if(u.rol!=='gabinete'){ u.centros = [...document.querySelectorAll('.fe-c:checked')].map(x=>x.value); u.perm = [...document.querySelectorAll('.fe-p:checked')].map(x=>x.value); } registrar({accion:'Modificación de usuario', modulo:'Usuarios', concepto:`Cambios en la cuenta de ${u.nombre}`, codigo:uu}); guardar(); cerrarModal(); toast('Guardado. Le llegará con el próximo acuse.','ok'); render(); }
function toggleUsuario(uu){ const u = usuario(uu); u.activo = !u.activo; registrar({accion:u.activo?'Activar cuenta':'Desactivar cuenta', modulo:'Usuarios', concepto:`Cuenta de ${u.nombre} ${u.activo?'activada':'desactivada'}`, codigo:uu}); guardar(); toast(`Cuenta ${u.activo?'activada':'desactivada'}`, u.activo?'ok':'warn'); render(); }
function verUsuario(uu){
  const u = usuario(uu); const d = DB.dispositivos.find(x=>x.id===u.disp)||{}; const regs = DB.registros.filter(r=>r.usuario===uu).slice().reverse();
  const ing = DB.pagos.filter(p=>p.usuario===uu).reduce((a,p)=>a+p.importe,0), gas = DB.gastos.filter(g=>g.usuario===uu).reduce((a,g)=>a+g.importe,0);
  $('contenido').innerHTML = `<div class="sec act"><div class="sec-head"><div><button class="btn-mini" onclick="irSec('inicio')">← Volver</button><h2 style="margin-top:.5rem">${esc(u.nombre)} <span class="tag oro">${u.disp}</span></h2><p>Último archivo recibido: <b>${hace(d.ultSync)}</b>${d.ultSync?' ('+d.ultSync+')':''}</p></div><div class="acciones"><button class="btn sec2" onclick="descargarCSV(DB.registros.filter(r=>r.usuario==='${esc(uu)}'),'${esc(uu)}')">📊 Excel</button><button class="btn sec2" onclick="window.print()">📄 PDF</button></div></div>
  <div class="grid g4" style="margin-bottom:1rem"><div class="kpi"><div class="l">Registros recibidos</div><div class="v">${regs.length}</div></div><div class="kpi"><div class="l">Matrículas / Pagos / Gastos</div><div class="v">${regs.filter(r=>r.tipo==='matricula').length} / ${regs.filter(r=>r.tipo==='pago').length} / ${regs.filter(r=>r.tipo==='gasto').length}</div></div><div class="kpi verde"><div class="l">Ha cobrado</div><div class="v">${fmt(ing)}</div></div><div class="kpi rojo"><div class="l">Ha gastado</div><div class="v">${fmt(gas)}</div></div></div>
  <div class="card"><h3>Todo lo que ha hecho</h3>${tablaRegistros(regs)}</div></div>`;
}

/* ═══ PRECIOS (central) ═══ */
function sec_precios(){
  return `<div class="sec-head"><div><h2>Precios y especialidades</h2><p>Lo que cambies aquí llega a cada tableta con su próximo acuse.</p></div></div>
  <div class="grid g3">${Object.keys(DB.tarifas).map(c=>`<div class="card"><h3>${CENTRO_NOMBRE[c]}</h3>${Object.entries(DB.tarifas[c]).map(([k,v])=>`<div class="fila"><span style="flex:1">${k}</span><input class="mono" style="width:110px;text-align:right" value="${v}" onchange="setTarifa('${c}','${k}',this.value)"> <span style="color:var(--g3)">FCFA</span></div>`).join('')}</div>`).join('')}
  <div class="card"><h3>Especialidades SANE FP</h3>${DB.especialidades.map((e,i)=>`<div class="fila"><span style="flex:1;${e.activa?'':'color:var(--g3);text-decoration:line-through'}">${esc(e.nombre)}</span><button class="btn-mini ${e.activa?'rojo':''}" onclick="toggleEsp(${i})">${e.activa?'Quitar':'Reactivar'}</button></div>`).join('')}<div style="display:flex;gap:.5rem;margin-top:.6rem"><input id="ne-nombre" placeholder="Nueva especialidad" style="flex:1"><button class="btn" onclick="addEsp()">Añadir</button></div></div></div>`;
}
function setTarifa(c,k,v){ const n = parseInt(v)||0; const ant = DB.tarifas[c][k]; DB.tarifas[c][k] = n; DB.cfgVersion++; registrar({accion:'Cambio de precio', modulo:'Precios', centro:c, servicio:k, concepto:`${k}: de ${fmt(ant)} a ${fmt(n)}`}); guardar(); toast(`${CENTRO_NOMBRE[c]} · ${k}: ${fmt(n)}`,'ok'); }
function addEsp(){ const n = $('ne-nombre').value.trim(); if(!n) return; DB.especialidades.push({nombre:n, activa:true}); DB.cfgVersion++; registrar({accion:'Nueva especialidad', modulo:'Precios', centro:'SANE', servicio:n, concepto:`Especialidad ${n} añadida`}); guardar(); render(); }
function toggleEsp(i){ const e = DB.especialidades[i]; e.activa = !e.activa; DB.cfgVersion++; guardar(); render(); }

/* ═══ CENTROS ═══ */
function sec_sane(){ return centro('SANE'); } function sec_jupi1(){ return centro('JUPI1'); } function sec_jupi2(){ return centro('JUPI2'); }
function centro(c){
  if(!S.user.centros.includes(c) && !esCentral()) return '<div class="vacio">No tienes acceso a este centro.</div>';
  const es = DB.estudiantes.filter(e=>e.centro===c); const ing = DB.pagos.filter(p=>p.centro===c).reduce((a,p)=>a+p.importe,0); const deuda = es.reduce((a,e)=>a+Math.max(0,e.saldo||0),0);
  const esSane = c==='SANE'; const grupos = esSane ? DB.especialidades.filter(x=>x.activa).map(x=>x.nombre) : DB.niveles[c];
  return `<div class="sec-head"><div><h2>${CENTRO_NOMBRE[c]}</h2><p>${esCentral()?'Estudiantes, pagos y '+(esSane?'especialidades':'niveles'):'Toca un estudiante para ver su ficha o cobrarle'}</p></div>
    <div class="acciones">${puede('matriculas')?`<button class="btn grande" onclick="formMatricula('${c}')">🎓 Nueva matrícula</button>`:''}${puede('pagos')?`<button class="btn verde grande" onclick="formPago('${c}')">💰 Cobrar</button>`:''}</div></div>
  ${esCentral()?`<div class="grid g3" style="margin-bottom:1rem"><div class="kpi"><div class="l">Estudiantes</div><div class="v">${es.length}</div></div><div class="kpi verde"><div class="l">Ha entrado</div><div class="v">${fmt(ing)}</div></div><div class="kpi rojo"><div class="l">Te deben</div><div class="v">${fmt(deuda)}</div><div class="s">${es.filter(e=>e.saldo>0).length} estudiantes con saldo</div></div></div>`
  :`<div class="aviso" style="background:#fff">${es.length} estudiantes · ${es.filter(e=>e.saldo>0).length} con pagos pendientes · Precios: ${Object.entries(DB.tarifas[c]).map(([k,v])=>`${k} ${v.toLocaleString('es-ES')}`).join(' · ')}</div>`}
  <div class="tabs"><div class="tab act" onclick="tab(this,'t-est')">Estudiantes</div>${esCentral()?`<div class="tab" onclick="tab(this,'t-grp')">${esSane?'Especialidades':'Niveles'}</div>`:''}<div class="tab" onclick="tab(this,'t-pag')">Pagos</div></div>
  <div class="tpanel act" id="t-est"><div class="card">${tablaEstudiantes(es)}</div></div>
  ${esCentral()?`<div class="tpanel" id="t-grp"><div class="grid g3">${grupos.map(g=>{const ge=es.filter(e=>(e.especialidad||e.nivel)===g);const t=ge.reduce((a,e)=>a+(e.pagado||0),0);return `<div class="card"><h3>${esc(g)}</h3><div class="v" style="font-size:1.4rem;font-weight:800;color:var(--azul)">${ge.length} <span style="font-size:.8rem;color:var(--g3);font-weight:500">estudiantes</span></div><div style="font-size:.78rem"><b>${fmt(t)}</b> cobrados</div></div>`;}).join('')}</div></div>`:''}
  <div class="tpanel" id="t-pag"><div class="card">${tablaPagos(DB.pagos.filter(p=>p.centro===c))}</div></div>`;
}
function tablaEstudiantes(es){
  if(!es.length) return '<div class="vacio">Sin estudiantes. Crea la primera matrícula.</div>';
  return `<div class="tbl-wrap"><table><tr><th>Código</th><th>Estudiante</th><th>${es[0].centro==='SANE'?'Especialidad':'Nivel'}</th><th class="num">Pagado</th><th class="num">Debe</th><th></th></tr>
  ${es.map(e=>`<tr class="click" onclick="fichaEstudiante('${esc(e.codigo)}')"><td class="mono"><b>${esc(e.codigo)}</b>${e.delCentro?' <span class="tag" title="Matriculado en otra tableta">otro</span>':''}</td><td>${esc(e.nombre)} ${esc(e.apellidos)}<br><span style="color:var(--g3);font-size:.66rem">${esc(e.tel||'')}</span></td><td>${esc(e.especialidad||e.nivel)}</td><td class="num">${fmt(e.pagado)}</td><td class="num" style="color:${e.saldo>0?'var(--rojo)':'var(--verde)'};font-weight:700">${e.saldo>0?fmt(e.saldo):'Al día'}</td><td>${puede('pagos')&&e.saldo>0?`<button class="btn-mini oro" onclick="event.stopPropagation();formPago('${e.centro}','${esc(e.codigo)}')">Cobrar</button>`:''}</td></tr>`).join('')}</table></div>`;
}
function tablaPagos(ps){ if(!ps.length) return '<div class="vacio">Sin pagos registrados.</div>'; return `<div class="tbl-wrap"><table><tr><th>Código</th><th>Estudiante</th><th>Concepto</th><th>Fecha</th>${esCentral()?'<th>Quién</th>':''}<th class="num">Importe</th></tr>${ps.slice().reverse().map(p=>{const e=DB.estudiantes.find(x=>x.codigo===p.estudiante)||DB.gabinete.casos.find(x=>x.id===p.estudiante);return `<tr><td class="mono"><b>${esc(p.codigo)}</b></td><td>${e?esc((e.nombre||e.asunto)+' '+(e.apellidos||'')):esc(p.estudiante)}</td><td>${esc(p.concepto)}</td><td class="mono">${p.fecha}</td>${esCentral()?`<td>${esc(p.usuario)}</td>`:''}<td class="num"><b>${fmt(p.importe)}</b></td></tr>`;}).join('')}</table></div>`; }

/* ── Matrícula ── */
function formMatricula(c){
  const esSane = c==='SANE'; const t = DB.tarifas[c]; const opciones = esSane ? DB.especialidades.filter(x=>x.activa).map(x=>x.nombre) : DB.niveles[c];
  abrirModal(`Matrícula · ${CENTRO_NOMBRE[c]}`, `<div class="form">
  <div class="form-sec">La persona</div>
  <div class="campo"><label>Nombre</label><input id="fm-nombre"></div><div class="campo"><label>Apellidos</label><input id="fm-apellidos"></div>
  <div class="campo"><label>Fecha de nacimiento</label><input id="fm-fnac" type="date"></div><div class="campo"><label>Sexo</label><select id="fm-sexo"><option>M</option><option>F</option></select></div>
  <div class="campo"><label>Documento</label><input id="fm-doc"></div><div class="campo"><label>Teléfono</label><input id="fm-tel" inputmode="tel"></div>
  <div class="campo"><label>Dirección</label><input id="fm-dir"></div><div class="campo"><label>Tutor / padre / madre</label><input id="fm-tutor"></div>
  <div class="form-sec">Los estudios</div>
  <div class="campo"><label>${esSane?'Especialidad':'Nivel'}</label><select id="fm-grp" onchange="calcMat('${c}')">${opciones.map(o=>`<option>${esc(o)}</option>`).join('')}</select></div>
  <div class="campo"><label>Turno</label><select id="fm-turno"><option>Mañana</option><option>Tarde</option></select></div>
  <div class="campo"><label>Año académico</label><input id="fm-ano" value="${ahora().getFullYear()}-${ahora().getFullYear()+1}"></div>
  <div class="form-sec">El dinero</div>
  <div class="campo"><label>${esSane?'Matrícula':'Precio del nivel'}</label><input id="fm-mat" class="mono" inputmode="numeric" onchange="calcMat('${c}',true)"></div>
  ${esSane?`<div class="campo"><label>Mensualidad</label><input id="fm-men" class="mono" inputmode="numeric" onchange="calcMat('${c}',true)"></div>`:`<div class="campo" style="display:flex;align-items:flex-end;gap:.8rem;font-size:.8rem;flex-wrap:wrap">${Object.keys(t).filter(k=>!DB.niveles[c].includes(k)).map(k=>`<label><input type="checkbox" class="fm-ex" value="${esc(k)}" onchange="calcMat('${c}')"> ${esc(k)} (${t[k].toLocaleString('es-ES')})</label>`).join('')}</div>`}
  <div class="campo"><label>Paga hoy</label><input id="fm-pag" class="mono" inputmode="numeric" value="0" oninput="calcMat('${c}',true)"></div>
  <div class="form-foot"><div class="calc"><span>Total: <b id="fm-tot">—</b></span><span>Quedará debiendo: <b id="fm-saldo">—</b></span></div><button class="btn sec2" onclick="cerrarModal()">Cancelar</button><button class="btn grande" onclick="guardarMatricula('${c}')">💾 Guardar</button></div></div>`);
  calcMat(c);
}
function calcMat(c, manual){
  const t = DB.tarifas[c]; const g = $('fm-grp').value; const esSane = c==='SANE';
  if(!manual){ if(esSane){ $('fm-mat').value = t['Matrícula']; $('fm-men').value = t['Mensualidad']; } else { const ex = [...document.querySelectorAll('.fm-ex:checked')].reduce((a,x)=>a+t[x.value],0); $('fm-mat').value = (t[g]||0) + ex; } }
  const tot = (+$('fm-mat').value||0) + (esSane ? (+$('fm-men').value||0) : 0), pag = +$('fm-pag').value||0;
  $('fm-tot').textContent = fmt(tot); $('fm-saldo').textContent = fmt(tot-pag); $('fm-saldo').style.color = tot-pag>0 ? 'var(--rojo)' : 'var(--verde)';
}
function guardarMatricula(c){
  const n = $('fm-nombre').value.trim(), a = $('fm-apellidos').value.trim(); if(!n||!a) return toast('Nombre y apellidos son obligatorios','err');
  const esSane = c==='SANE'; const g = $('fm-grp').value, mat = +$('fm-mat').value||0, men = esSane ? (+$('fm-men').value||0) : 0, pag = +$('fm-pag').value||0;
  if(pag > mat+men) return toast('Paga más de lo que cuesta. Revisa el importe.','err');
  const e = { codigo: codigoEstudiante(c), centro:c, nombre:n, apellidos:a, fnac:$('fm-fnac').value, sexo:$('fm-sexo').value, doc:$('fm-doc').value, tel:$('fm-tel').value, dir:$('fm-dir').value, tutor:$('fm-tutor').value,
    especialidad: esSane?g:'', nivel: esSane?'':g, ano:$('fm-ano').value, turno:$('fm-turno').value, fmat:fecha(ahora()), matricula:mat, mensualidad:men, extras:0, pagado:pag, saldo:mat+men-pag, delCentro:false };
  DB.estudiantes.push(e);
  registrar({accion:'Alta de matrícula', centro:c, modulo:'Matrículas', servicio:g, concepto:`Matrícula de ${n} ${a} (${g}, ${e.turno})`, codigo:e.codigo, tipo:'matricula'});
  if(pag>0){ const p = { codigo: codigoPago(c), estudiante:e.codigo, centro:c, concepto:'Primer pago de matrícula', importe:pag, fecha:fecha(ahora()), usuario:S.user.user }; DB.pagos.push(p); registrar({accion:'Registro de pago', centro:c, modulo:'Pagos', servicio:g, concepto:p.concepto, codigo:p.codigo, importe:pag, tipo:'pago'}); }
  guardar(); cerrarModal(); toast(`Guardado · ${e.codigo}`,'ok'); render();
}
function fichaEstudiante(cod){
  const e = DB.estudiantes.find(x=>x.codigo===cod); const ps = DB.pagos.filter(p=>p.estudiante===cod);
  abrirModal(`${esc(e.nombre)} ${esc(e.apellidos)}`, `<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.9rem"><span class="tag oro">${esc(e.codigo)}</span><span class="tag">${CENTRO_NOMBRE[e.centro]}</span><span class="tag">${esc(e.especialidad||e.nivel)}</span><span class="tag">${esc(e.turno||'')}</span></div>
  <div class="grid g2" style="margin-bottom:.9rem"><div class="kpi verde"><div class="l">Ha pagado</div><div class="v" style="font-size:1rem">${fmt(e.pagado)}</div></div><div class="kpi ${e.saldo>0?'rojo':'verde'}"><div class="l">Debe</div><div class="v" style="font-size:1rem">${fmt(e.saldo)}</div></div></div>
  <div class="tabs"><div class="tab act" onclick="tab(this,'fe-p')">Pagos (${ps.length})</div><div class="tab" onclick="tab(this,'fe-d')">Datos</div></div>
  <div class="tpanel act" id="fe-p">${ps.map(p=>`<div class="fila" style="font-size:.78rem"><span><span class="mono">${esc(p.codigo)}</span><br><span style="color:var(--g3)">${esc(p.concepto)} · ${p.fecha}</span></span><b style="margin-left:auto">${fmt(p.importe)}</b></div>`).join('')||'<div class="vacio">Sin pagos</div>'}</div>
  <div class="tpanel" id="fe-d"><dl class="datos"><dt>Nacimiento</dt><dd>${esc(e.fnac||'—')}</dd><dt>Sexo</dt><dd>${esc(e.sexo||'—')}</dd><dt>Documento</dt><dd>${esc(e.doc||'—')}</dd><dt>Teléfono</dt><dd>${esc(e.tel||'—')}</dd><dt>Dirección</dt><dd>${esc(e.dir||'—')}</dd><dt>Tutor</dt><dd>${esc(e.tutor||'—')}</dd><dt>Año</dt><dd>${esc(e.ano||'—')}</dd><dt>Matriculado</dt><dd>${esc(e.fmat||'—')}</dd></dl></div>
  <div class="form-foot">${puede('pagos')&&e.saldo>0?`<button class="btn verde grande" onclick="formPago('${e.centro}','${esc(e.codigo)}')">💰 Cobrar</button>`:''}<button class="btn sec2" onclick="cerrarModal()">Cerrar</button></div>`);
}

/* ── Pago ── */
function formPago(c, cod){
  const cs = esCentral() ? ['SANE','JUPI1','JUPI2'] : misCentros(); c = c || cs[0]; const es = DB.estudiantes.filter(e=>e.centro===c);
  abrirModal('Cobrar', `<div class="form">
  <div class="campo"><label>Negocio</label><select id="fp-c" onchange="cerrarModal();formPago(this.value)">${cs.map(x=>`<option value="${x}" ${x===c?'selected':''}>${CENTRO_NOMBRE[x]}</option>`).join('')}</select></div>
  <div class="campo"><label>Estudiante</label><select id="fp-est" onchange="fpInfo()">${es.map(e=>`<option value="${esc(e.codigo)}" ${e.codigo===cod?'selected':''}>${esc(e.nombre)} ${esc(e.apellidos)} (${esc(e.codigo)})</option>`).join('')}</select></div>
  <div class="campo full"><label>Por qué paga</label><input id="fp-con" value="${c==='SANE'?'Mensualidad de '+['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][ahora().getMonth()]:'Pago de matrícula'}"></div>
  <div class="campo"><label>Cuánto (FCFA)</label><input id="fp-imp" class="mono" inputmode="numeric" value="${c==='SANE'?DB.tarifas.SANE['Mensualidad']:0}"></div>
  <div class="campo"><label>Nota (opcional)</label><input id="fp-obs"></div>
  <div class="form-foot"><div class="calc" id="fp-info"></div><button class="btn sec2" onclick="cerrarModal()">Cancelar</button><button class="btn verde grande" onclick="guardarPago('${c}')">💾 Guardar</button></div></div>`);
  fpInfo();
}
function fpInfo(){ const e = DB.estudiantes.find(x=>x.codigo===$('fp-est').value); if(!e){ $('fp-info').innerHTML='Sin estudiantes en este negocio'; return; } $('fp-info').innerHTML = `<span>Debe ahora: <b style="color:${e.saldo>0?'var(--rojo)':'var(--verde)'}">${fmt(e.saldo)}</b></span>`; if(e.saldo>0 && e.centro!=='SANE') $('fp-imp').value = e.saldo; }
function guardarPago(c){
  const e = DB.estudiantes.find(x=>x.codigo===$('fp-est').value); const imp = +$('fp-imp').value||0; if(!e||imp<=0) return toast('Indica un importe válido','err');
  const p = { codigo: codigoPago(c), estudiante:e.codigo, centro:c, concepto:$('fp-con').value.trim()||'Pago', importe:imp, fecha:fecha(ahora()), usuario:S.user.user };
  DB.pagos.push(p); e.pagado = (e.pagado||0)+imp; e.saldo = Math.max(0, (e.saldo||0)-imp);
  registrar({accion:'Registro de pago', centro:c, modulo:'Pagos', servicio:e.especialidad||e.nivel, concepto:`${p.concepto} · ${e.nombre} ${e.apellidos}`, codigo:p.codigo, importe:imp, tipo:'pago', obs:$('fp-obs').value});
  guardar(); cerrarModal(); toast(`Pago guardado · ${fmt(imp)}`,'ok'); render();
}
/* ── Gasto ── */
function formGasto(){
  const cs = esCentral() ? Object.keys(CENTRO_NOMBRE) : S.user.centros;
  abrirModal('Apuntar un gasto', `<div class="form">
  <div class="campo"><label>Negocio</label><select id="fg-c">${cs.map(x=>`<option value="${x}">${CENTRO_NOMBRE[x]}</option>`).join('')}</select></div>
  <div class="campo"><label>Tipo</label><select id="fg-cat">${['Material','Mantenimiento','Luz / agua','Limpieza','Transporte','Salarios','Otros'].map(x=>`<option>${x}</option>`).join('')}</select></div>
  <div class="campo full"><label>Qué se ha pagado</label><input id="fg-con" placeholder="Ej. Pintura para el aula 3"></div>
  <div class="campo"><label>Cuánto (FCFA)</label><input id="fg-imp" class="mono" inputmode="numeric"></div><div class="campo"><label>¿Hay factura o recibo?</label><select id="fg-just"><option>Sí</option><option>No</option></select></div>
  <div class="form-foot"><button class="btn sec2" onclick="cerrarModal()">Cancelar</button><button class="btn rojo grande" onclick="guardarGasto()">💾 Guardar</button></div></div>`);
}
function guardarGasto(){
  const imp = +$('fg-imp').value||0, con = $('fg-con').value.trim(); if(!con||imp<=0) return toast('Escribe qué se ha pagado y cuánto','err');
  const g = { codigo: codigoGasto(), centro:$('fg-c').value, cat:$('fg-cat').value, concepto:con, importe:imp, fecha:fecha(ahora()), usuario:S.user.user, just:$('fg-just').value };
  DB.gastos.push(g); registrar({accion:'Registro de gasto', centro:g.centro, modulo:'Gastos', servicio:g.cat, concepto:con, codigo:g.codigo, importe:imp, tipo:'gasto', obs: g.just==='No' ? 'Sin justificante' : ''});
  guardar(); cerrarModal(); toast(`Gasto guardado · ${fmt(imp)}`,'ok'); render();
}

/* ═══ PAGOS Y GASTOS (central) ═══ */
function sec_finanzas(){
  const ing = DB.pagos.reduce((a,p)=>a+p.importe,0), gas = DB.gastos.reduce((a,g)=>a+g.importe,0); const deud = DB.estudiantes.filter(e=>e.saldo>0);
  return `<div class="sec-head"><div><h2>Pagos y gastos</h2><p>Todo lo que ha entrado y salido, y quién debe.</p></div><div class="acciones"><button class="btn verde" onclick="formPago()">💰 Cobrar</button><button class="btn rojo" onclick="formGasto()">💸 Apuntar gasto</button></div></div>
  <div class="grid g3" style="margin-bottom:1rem"><div class="kpi verde"><div class="l">Ha entrado</div><div class="v">${fmt(ing)}</div></div><div class="kpi rojo"><div class="l">Ha salido</div><div class="v">${fmt(gas)}</div></div><div class="kpi nj"><div class="l">Te deben</div><div class="v">${fmt(deud.reduce((a,e)=>a+e.saldo,0))}</div></div></div>
  <div class="tabs"><div class="tab act" onclick="tab(this,'f-d')">Quién debe (${deud.length})</div><div class="tab" onclick="tab(this,'f-p')">Pagos</div><div class="tab" onclick="tab(this,'f-g')">Gastos</div></div>
  <div class="tpanel act" id="f-d"><div class="card">${deud.length?`<div class="tbl-wrap"><table><tr><th>Código</th><th>Estudiante</th><th>Negocio</th><th>Teléfono</th><th class="num">Debe</th><th></th></tr>${deud.map(e=>`<tr><td class="mono">${esc(e.codigo)}</td><td>${esc(e.nombre)} ${esc(e.apellidos)}</td><td>${CENTRO_NOMBRE[e.centro]}</td><td>${esc(e.tel||'—')}</td><td class="num" style="color:var(--rojo)"><b>${fmt(e.saldo)}</b></td><td><button class="btn-mini oro" onclick="formPago('${e.centro}','${esc(e.codigo)}')">Cobrar</button></td></tr>`).join('')}</table></div>`:'<div class="vacio">Nadie debe nada 🎉</div>'}</div></div>
  <div class="tpanel" id="f-p"><div class="card">${tablaPagos(DB.pagos)}</div></div>
  <div class="tpanel" id="f-g"><div class="card">${DB.gastos.length?`<div class="tbl-wrap"><table><tr><th>Código</th><th>Quién</th><th>Negocio</th><th>Qué</th><th>Tipo</th><th>Fecha</th><th>Factura</th><th class="num">Importe</th></tr>${DB.gastos.slice().reverse().map(g=>`<tr><td class="mono">${esc(g.codigo)}</td><td>${esc(g.usuario)}</td><td>${CENTRO_NOMBRE[g.centro]||g.centro}</td><td>${esc(g.concepto)}</td><td>${esc(g.cat)}</td><td class="mono">${g.fecha}</td><td>${esc(g.just)}</td><td class="num"><b>${fmt(g.importe)}</b></td></tr>`).join('')}</table></div>`:'<div class="vacio">Sin gastos</div>'}</div></div>`;
}

/* ═══ ABOGADO ═══ */
function sec_gabinete(){
  if(!esCentral() && S.user.rol!=='gabinete') return '<div class="vacio">Esta parte es solo para el abogado y el administrador.</div>';
  const G = DB.gabinete; const hon = G.casos.reduce((a,c)=>a+(c.honor||0),0), cob = G.casos.reduce((a,c)=>a+(c.pagado||0),0);
  return `<div class="sec-head"><div><h2>Abogado</h2><p>Clientes, casos, honorarios y cobros.</p></div><div class="acciones"><button class="btn grande" onclick="formCaso()">＋ Nuevo caso</button><button class="btn sec2" onclick="formCliente()">＋ Cliente</button></div></div>
  <div class="grid g4" style="margin-bottom:1rem"><div class="kpi"><div class="l">Clientes</div><div class="v">${G.clientes.length}</div></div><div class="kpi"><div class="l">Casos abiertos</div><div class="v">${G.casos.filter(c=>c.estado!=='Cerrado').length}</div></div><div class="kpi verde"><div class="l">Cobrado</div><div class="v">${fmt(cob)}</div></div><div class="kpi rojo"><div class="l">Por cobrar</div><div class="v">${fmt(hon-cob)}</div></div></div>
  <div class="grid g2"><div class="card"><h3>Casos</h3>${G.casos.length?`<div class="tbl-wrap"><table><tr><th>Caso</th><th>Cliente</th><th>Asunto</th><th>Estado</th><th>Próx. cita</th><th class="num">Honorarios</th><th class="num">Cobrado</th><th></th></tr>${G.casos.slice().reverse().map(c=>{const cl=G.clientes.find(x=>x.id===c.cliente);return `<tr><td class="mono"><b>${esc(c.id)}</b></td><td>${cl?esc(cl.nombre):esc(c.cliente)}</td><td>${esc(c.asunto)}</td><td><span class="est ${c.estado==='Cerrado'?'gris':'azul'}">${esc(c.estado)}</span></td><td class="mono">${esc(c.proxCita||'—')}</td><td class="num">${fmt(c.honor)}</td><td class="num" style="color:${(c.pagado||0)<(c.honor||0)?'var(--rojo)':'var(--verde)'}">${fmt(c.pagado)}</td><td style="white-space:nowrap">${(c.pagado||0)<(c.honor||0)?`<button class="btn-mini oro" onclick="cobrarCaso('${esc(c.id)}')">Cobrar</button> `:''}${c.estado!=='Cerrado'?`<button class="btn-mini" onclick="cerrarCaso('${esc(c.id)}')">Cerrar</button>`:''}</td></tr>`;}).join('')}</table></div>`:'<div class="vacio">Sin casos todavía</div>'}</div>
  <div class="card"><h3>Clientes</h3>${G.clientes.map(c=>`<div class="fila"><span><span class="mono">${esc(c.id)}</span> <b>${esc(c.nombre)}</b><br><span style="color:var(--g3);font-size:.72rem">${esc(c.tel||'')}</span></span><span style="margin-left:auto">${G.casos.filter(x=>x.cliente===c.id).length} casos</span></div>`).join('')||'<div class="vacio">Sin clientes</div>'}</div></div>`;
}
function formCliente(){ abrirModal('Nuevo cliente', `<div class="form"><div class="campo full"><label>Nombre / empresa</label><input id="fc-n"></div><div class="campo"><label>Teléfono</label><input id="fc-t" inputmode="tel"></div><div class="form-foot"><button class="btn sec2" onclick="cerrarModal()">Cancelar</button><button class="btn" onclick="guardarCliente()">Guardar</button></div></div>`); }
function guardarCliente(){ const n = $('fc-n').value.trim(); if(!n) return toast('Escribe el nombre','err'); const c = {id:codigoCliente(), nombre:n, tel:$('fc-t').value}; DB.gabinete.clientes.push(c); registrar({accion:'Alta de cliente', centro:'GABINETE', modulo:'Abogado', servicio:'Clientes', concepto:`Nuevo cliente ${n}`, codigo:c.id, tipo:'gabinete'}); guardar(); cerrarModal(); toast('Cliente guardado','ok'); render(); }
function formCaso(){ if(!DB.gabinete.clientes.length) return toast('Primero añade un cliente','warn'); abrirModal('Nuevo caso', `<div class="form"><div class="campo full"><label>Cliente</label><select id="fk-c">${DB.gabinete.clientes.map(c=>`<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('')}</select></div><div class="campo full"><label>Asunto</label><input id="fk-a"></div><div class="campo"><label>Honorarios (FCFA)</label><input id="fk-h" class="mono" inputmode="numeric"></div><div class="campo"><label>Próxima cita</label><input id="fk-f" placeholder="dd/mm/aaaa hh:mm"></div><div class="form-foot"><button class="btn sec2" onclick="cerrarModal()">Cancelar</button><button class="btn" onclick="guardarCaso()">Guardar</button></div></div>`); }
function guardarCaso(){ const a = $('fk-a').value.trim(); if(!a) return toast('Escribe el asunto','err'); const c = {id:codigoCaso(), cliente:$('fk-c').value, asunto:a, estado:'Abierto', honor:+$('fk-h').value||0, pagado:0, proxCita:$('fk-f').value||'—'}; DB.gabinete.casos.push(c); registrar({accion:'Apertura de caso', centro:'GABINETE', modulo:'Abogado', servicio:'Casos', concepto:a, codigo:c.id, tipo:'gabinete'}); guardar(); cerrarModal(); toast('Caso abierto','ok'); render(); }
function cobrarCaso(id){ const c = DB.gabinete.casos.find(x=>x.id===id); abrirModal('Cobrar honorarios', `<div class="form"><div class="campo full"><label>Caso</label><input value="${esc(c.asunto)}" disabled></div><div class="campo"><label>Cuánto (FCFA)</label><input id="fh-imp" class="mono" inputmode="numeric" value="${(c.honor||0)-(c.pagado||0)}"></div><div class="form-foot"><button class="btn sec2" onclick="cerrarModal()">Cancelar</button><button class="btn verde" onclick="guardarCobroCaso('${esc(id)}')">Guardar</button></div></div>`); }
function guardarCobroCaso(id){ const c = DB.gabinete.casos.find(x=>x.id===id); const imp = +$('fh-imp').value||0; if(imp<=0) return toast('Importe no válido','err'); c.pagado = (c.pagado||0)+imp; const p = {codigo:codigoPago('GABINETE'), estudiante:c.id, centro:'GABINETE', concepto:`Honorarios · ${c.asunto}`, importe:imp, fecha:fecha(ahora()), usuario:S.user.user}; DB.pagos.push(p); registrar({accion:'Cobro de honorarios', centro:'GABINETE', modulo:'Abogado', servicio:'Honorarios', concepto:p.concepto, codigo:p.codigo, importe:imp, tipo:'pago'}); guardar(); cerrarModal(); toast(`Cobro guardado · ${fmt(imp)}`,'ok'); render(); }
function cerrarCaso(id){ const c = DB.gabinete.casos.find(x=>x.id===id); c.estado='Cerrado'; registrar({accion:'Cierre de caso', centro:'GABINETE', modulo:'Abogado', servicio:'Casos', concepto:c.asunto, codigo:c.id, tipo:'gabinete'}); guardar(); render(); }

/* ═══ INFORMES (central) ═══ */
const RF = {usuario:'',centro:'',servicio:'',tipo:'',desde:'',hasta:''};
function filtrar(){ return DB.registros.filter(r=>(!RF.usuario||r.usuario===RF.usuario)&&(!RF.centro||r.centro===RF.centro)&&(!RF.servicio||r.servicio===RF.servicio)&&(!RF.tipo||r.tipo===RF.tipo)&&(!RF.desde||aDate(r.fecha)>=new Date(RF.desde))&&(!RF.hasta||aDate(r.fecha)<=new Date(RF.hasta))); }
function sec_informes(){
  const servicios = [...new Set(DB.registros.map(r=>r.servicio))].filter(x=>x!=='—').sort();
  const sel = (id,ops,lbl,nombres) => `<div class="campo"><label>${lbl}</label><select onchange="RF.${id}=this.value;render()">${['',...ops].map(o=>`<option value="${esc(o)}" ${RF[id]===o?'selected':''}>${o?esc(nombres?nombres[o]||o:o):'Todos'}</option>`).join('')}</select></div>`;
  const rs = filtrar(); const ing = rs.filter(r=>r.tipo==='pago').reduce((a,r)=>a+r.importe,0), gas = rs.filter(r=>r.tipo==='gasto').reduce((a,r)=>a+r.importe,0);
  const por = (k,lbl,nombres) => { const m={}; rs.forEach(r=>{const x=r[k]; m[x]=m[x]||{n:0,ing:0,gas:0}; m[x].n++; if(r.tipo==='pago')m[x].ing+=r.importe; if(r.tipo==='gasto')m[x].gas+=r.importe;}); const ks=Object.keys(m); return `<div class="card"><h3>Por ${lbl}</h3>${ks.length?`<table><tr><th>${lbl}</th><th class="num">Registros</th><th class="num">Entrado</th><th class="num">Salido</th></tr>${ks.map(x=>`<tr><td>${esc(nombres?nombres[x]||x:x)}</td><td class="num">${m[x].n}</td><td class="num">${fmt(m[x].ing)}</td><td class="num">${fmt(m[x].gas)}</td></tr>`).join('')}</table>`:'<div class="vacio">Sin datos</div>'}</div>`; };
  const nombresU = Object.fromEntries(DB.usuarios.map(u=>[u.user,u.nombre]));
  const tipos = {matricula:'Matrículas',pago:'Pagos',gasto:'Gastos',gabinete:'Abogado',alta:'Altas de usuario',sync:'Importaciones',otro:'Otros'};
  return `<div class="sec-head"><div><h2>Informes</h2><p>Elige filtros y los números se actualizan solos.</p></div><div class="acciones"><button class="btn sec2" onclick="Object.keys(RF).forEach(k=>RF[k]='');render()">Limpiar</button><button class="btn sec2" onclick="window.print()">📄 PDF</button><button class="btn oro" onclick="descargarCSV(filtrar(),'informe')">📊 Excel</button></div></div>
  <div class="card" style="margin-bottom:1rem"><h3>Filtros</h3><div class="form">${sel('usuario',DB.usuarios.map(u=>u.user),'Quién',nombresU)}${sel('centro',Object.keys(CENTRO_NOMBRE),'Negocio',CENTRO_NOMBRE)}${sel('servicio',servicios,'Especialidad / nivel / tipo')}${sel('tipo',Object.keys(tipos),'Operación',tipos)}
    <div class="campo"><label>Desde</label><input type="date" value="${RF.desde}" onchange="RF.desde=this.value;render()"></div><div class="campo"><label>Hasta</label><input type="date" value="${RF.hasta}" onchange="RF.hasta=this.value;render()"></div></div></div>
  <div class="grid g4" style="margin-bottom:1rem"><div class="kpi"><div class="l">Registros</div><div class="v">${rs.length}</div></div><div class="kpi verde"><div class="l">Ha entrado</div><div class="v">${fmt(ing)}</div></div><div class="kpi rojo"><div class="l">Ha salido</div><div class="v">${fmt(gas)}</div></div><div class="kpi oro"><div class="l">Queda</div><div class="v">${fmt(ing-gas)}</div></div></div>
  <div class="grid g3" style="margin-bottom:1rem">${por('usuario','quién',nombresU)}${por('centro','negocio',CENTRO_NOMBRE)}${por('servicio','especialidad / nivel')}</div>
  <div class="grid g2" style="margin-bottom:1rem">${por('dia','día de la semana')}${por('tipo','operación',tipos)}</div>
  <div class="card"><h3>Detalle <span class="r">${rs.length} registros</span></h3>${tablaRegistros(rs.slice().reverse())}</div>`;
}
function descargarCSV(rs, que){
  const cab = ['ID','Quién','Tableta','Acción','Negocio','Módulo','Servicio','Concepto','Código','Día','Fecha','Hora','Importe','Estado','Nota'];
  const csv = '\uFEFF' + [cab.join(';'), ...rs.map(r=>[r.id,r.usuario,r.disp,r.accion,CENTRO_NOMBRE[r.centro]||r.centro,r.modulo,r.servicio,r.concepto,r.codigo,r.dia,r.fecha,r.hora,r.importe,r.estado,r.obs].map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';'))].join('\n');
  descargarTexto(`SISJUPI-${que}-${ymd(ahora())}.csv`, csv, 'text/csv;charset=utf-8'); toast(`Excel guardado (${rs.length} registros)`,'ok');
}

/* ═══ HISTORIAL · AVISOS · COPIAS · CUENTA ═══ */
function sec_historial(){ const rs = DB.registros.slice().reverse(); return `<div class="sec-head"><div><h2>${esCentral()?'Historial de todo':'Mi historial'}</h2><p>Cada cosa que se hace queda apuntada: quién, desde qué tableta, qué, cuándo y si está confirmada.</p></div><div class="acciones">${esCentral()?`<button class="btn oro" onclick="descargarCSV(DB.registros,'historial')">📊 Excel</button>`:''}<button class="btn sec2" onclick="window.print()">📄 PDF</button></div></div><div class="card">${tablaRegistros(rs)}</div>`; }
function sec_avisos(){ const h = `<div class="sec-head"><div><h2>Avisos</h2><p>Lo que ha pasado y conviene que sepas.</p></div><div class="acciones"><button class="btn sec2" onclick="DB.notifs.forEach(n=>n.new=false);guardar();render()">Marcar todo como leído</button></div></div><div class="card">${DB.notifs.map(n=>`<div class="notif ${n.new?'new':''}"><div class="ic">${n.ic}</div><div>${esc(n.txt)}<div class="t">${n.fecha} ${n.hora}</div></div></div>`).join('')||'<div class="vacio">Sin avisos</div>'}</div>`; return h; }
function sec_copias(){
  const dbk = diasDesde(DB.ultimoBackup);
  return `<div class="sec-head"><div><h2>Copias de seguridad</h2><p>Este aparato guarda toda la información. Si se rompe o lo roban, solo se salva lo que hayas copiado fuera.</p></div></div>
  ${dbk>7?`<div class="aviso rojo">💾 Llevas ${dbk} días sin copia. Hazla ahora, tarda 5 segundos.</div>`:`<div class="aviso verde">🟢 Última copia: ${hace(DB.ultimoBackup)} (${DB.ultimoBackup||'—'}).</div>`}
  <div class="grid g2"><div class="card"><h3>Guardar una copia</h3><div class="pasos">
    <div class="paso-g"><div class="num">1</div><div><b>Pulsa el botón</b><p>Se crea un archivo con toda la información.</p></div></div>
    <div class="paso-g"><div class="num">2</div><div><b>Guárdalo fuera de este aparato</b><p>En un USB, en tu móvil, en el correo. Lo importante es que no esté solo aquí.</p></div></div>
    <div class="paso-g"><div class="num">3</div><div><b>Repítelo cada semana</b><p>La app te avisa en rojo si pasan más de 7 días.</p></div></div></div>
    <div class="acciones" style="margin-top:1rem"><button class="btn grande oro" onclick="guardarCopia()">💾 Guardar copia ahora</button></div></div>
  <div class="card"><h3>Recuperar desde una copia</h3><p style="font-size:.8rem;color:var(--g3);margin-bottom:.8rem">Solo si has cambiado de aparato o has perdido los datos. Abre el archivo <span class="mono">.jupi</span> de la última copia y todo vuelve a estar como estaba.</p><button class="btn grande sec2" onclick="$('f-abrir').click()">📂 Abrir archivo de copia</button>
  <h3 style="margin-top:1.4rem">Cuánto ocupa</h3><p style="font-size:.8rem">${DB.registros.length} registros · ${DB.estudiantes.length} estudiantes · ${DB.pagos.length} pagos · ${DB.gastos.length} gastos · aprox. ${Math.round(JSON.stringify(DB).length/1024)} KB</p></div></div>`;
}
function sec_cuenta(){
  const u = S.user;
  return `<div class="sec-head"><div><h2>Mi cuenta</h2><p>Las contraseñas no se guardan a la vista.</p></div></div>
  <div class="grid g2"><div class="card"><h3>Cambiar contraseña</h3><div class="form"><div class="campo full"><label>Contraseña actual</label><input type="password" id="mc-p0"></div><div class="campo"><label>Nueva contraseña</label><input type="password" id="mc-p1"></div><div class="campo"><label>Repite la nueva</label><input type="password" id="mc-p2"></div><div class="form-foot"><button class="btn" onclick="cambiarPass()">Guardar</button></div></div></div>
  <div class="card"><h3>Este aparato</h3><dl class="datos"><dt>Nombre</dt><dd>${esc(u.nombre)}</dd><dt>Usuario</dt><dd class="mono">${esc(u.user)}</dd><dt>Aparato</dt><dd class="mono">${DB.inst.disp} (${esCentral()?'central':'tableta'})</dd><dt>Negocios</dt><dd>${u.centros.map(c=>CENTRO_NOMBRE[c]).join(', ')}</dd><dt>Puede</dt><dd>${u.rol==='admin'?'Todo':(u.perm||[]).map(p=>(PERMISOS.find(x=>x[0]===p)||[p,p])[1]).join(', ')}</dd><dt>Instalado</dt><dd>${DB.inst.creada}</dd><dt>Versión</dt><dd class="mono">${window.SISJUPI_VERSION||'—'}</dd></dl>
  <details style="margin-top:1rem"><summary style="font-size:.74rem;color:var(--rojo);cursor:pointer">Zona peligrosa</summary><p style="font-size:.74rem;color:var(--g3);margin:.5rem 0">Borra TODO lo que hay en este aparato. Solo para empezar de cero. ${esCentral()?'Guarda una copia antes.':''}</p><button class="btn rojo" onclick="if(confirm('¿Seguro? Se borra todo lo de este aparato y no se puede deshacer.')){borrarTodo().then(()=>location.reload())}">Borrar todo y empezar de cero</button></details></div></div>`;
}

/* ═══ Tablas de auditoría ═══ */
function tablaRegistros(regs, corto){
  if(!regs.length) return '<div class="vacio">Sin registros todavía.</div>';
  return `<div class="tbl-wrap"><table><tr><th>ID</th>${corto?'':'<th>Quién</th>'}<th>Qué</th><th>Código</th><th>Cuándo</th><th class="num">Importe</th><th>Estado</th></tr>
  ${regs.map(r=>`<tr class="click" onclick="verRegistro('${r.id}')"><td class="mono">${r.id}</td>${corto?'':`<td>${esc((usuario(r.usuario)||{}).nombre||r.usuario)}<br><span class="mono" style="color:var(--g3)">${r.disp}</span></td>`}<td>${esc(r.accion)}<br><span style="color:var(--g3)">${esc(r.concepto)}</span></td><td class="mono">${esc(r.codigo)}</td><td style="white-space:nowrap">${r.dia}<br><span class="mono">${r.fecha} ${r.hora}</span></td><td class="num">${r.importe?fmt(r.importe):'—'}</td><td>${estHtml(r.estado)}</td></tr>`).join('')}</table></div>`;
}
function verRegistro(id){
  const r = DB.registros.find(x=>x.id===id); if(!r) return;
  abrirModal('Registro', `<dl class="datos"><dt>ID</dt><dd class="mono">${r.id}</dd><dt>Quién</dt><dd>${esc((usuario(r.usuario)||{}).nombre||r.usuario)} (${esc(r.usuario)})</dd><dt>Tableta</dt><dd class="mono">${r.disp}</dd><dt>Acción</dt><dd>${esc(r.accion)}</dd><dt>Negocio</dt><dd>${CENTRO_NOMBRE[r.centro]||esc(r.centro)}</dd><dt>Módulo</dt><dd>${esc(r.modulo)}</dd><dt>Servicio</dt><dd>${esc(r.servicio)}</dd><dt>Concepto</dt><dd>${esc(r.concepto)}</dd><dt>Código</dt><dd class="mono">${esc(r.codigo)}${r.codigoProv&&r.codigoProv!==r.codigo?` <span style="color:var(--g3)">(era ${esc(r.codigoProv)})</span>`:''}</dd><dt>Día</dt><dd>${r.dia}</dd><dt>Fecha</dt><dd>${r.fecha}</dd><dt>Hora</dt><dd class="mono">${r.hora}</dd>${r.importe?`<dt>Importe</dt><dd><b>${fmt(r.importe)}</b></dd>`:''}<dt>Estado</dt><dd>${estHtml(r.estado)}</dd><dt>Nota</dt><dd>${esc(r.obs)||'—'}</dd></dl><div class="form-foot"><button class="btn" onclick="cerrarModal()">Cerrar</button></div>`);
}
