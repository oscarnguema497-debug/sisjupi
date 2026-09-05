/* SIS JUPI · acceso ─────────────────────────────────────────────── */
'use strict';
let S = { user: null, sec: 'inicio' };

async function hashPass(pass, salt){ return sha256(salt + '·' + pass); }

/* ── Pantallas ── */
function mostrar(id){ document.querySelectorAll('.pantalla').forEach(p => p.classList.toggle('activa', p.id === id)); }

/* ── Primera vez: ¿qué es este aparato? ── */
function pantallaConfig(){
  mostrar('p-config');
  const inv = leerInvitacionDeURL();
  if(inv){ formRegistroInvitacion(inv); }
}
function leerInvitacionDeURL(){
  const p = new URLSearchParams(location.search); const i = p.get('i'); if(!i) return null;
  const inv = b64d(i); if(inv && inv.t && inv.u) return inv; return null;
}
function elegirCentral(){
  abrirModal('Soy el administrador', `<div class="pasos"><div class="paso-g"><div class="num">1</div><div><b>Este aparato guardará toda la información</b><p>Aquí llegarán los archivos de las tabletas y desde aquí harás las copias de seguridad. Elige tu nombre y una contraseña.</p></div></div></div>
  <div class="form" style="margin-top:1rem">
    <div class="campo"><label>Tu nombre</label><input id="c-nombre" placeholder="Ej. Pedro"></div>
    <div class="campo"><label>Nombre de usuario</label><input id="c-user" value="admin"></div>
    <div class="campo"><label>Contraseña</label><input id="c-p1" type="password"></div>
    <div class="campo"><label>Repite la contraseña</label><input id="c-p2" type="password"></div>
    <div class="form-foot"><button class="btn sec2" onclick="cerrarModal()">Volver</button><button class="btn grande" onclick="crearCentral()">Empezar</button></div></div>`);
}
async function crearCentral(){
  const nombre=$('c-nombre').value.trim()||'Administrador', user=$('c-user').value.trim().toLowerCase()||'admin', p1=$('c-p1').value, p2=$('c-p2').value;
  if(p1.length<4) return toast('La contraseña debe tener al menos 4 caracteres','err');
  if(p1!==p2) return toast('Las dos contraseñas no coinciden','err');
  const salt=token(8); const hash=await hashPass(p1,salt);
  DB.inst={rol:'central',disp:'ADMIN',creada:fecha(ahora()),cuenta:user};
  DB.usuarios.push({user,nombre,rol:'admin',disp:'ADMIN',activo:true,hash,salt,centros:Object.keys(CENTRO_NOMBRE),perm:['matriculas','pagos','gastos'],primerAcceso:false,altaConfirmada:true});
  DB.ultimoBackup=fecha(ahora());
  registrar({usuario:user,accion:'Instalación',modulo:'Sistema',concepto:'Central creada en este aparato',codigo:'ADMIN'});
  await guardarYa(); cerrarModal(true); toast('Listo. Este aparato ya es la central.','ok'); entrar(usuario(user));
}

/* ── Registro con enlace de invitación ── */
function formRegistroInvitacion(inv){
  abrirModal('Mi primera vez', `<div class="form">
    <div class="campo full"><label>Pega aquí el enlace que te ha dado el administrador</label><input id="r-link" value="${inv?esc(location.href):''}" placeholder="https://…/?i=…"></div>
    <div class="campo full"><label>Clave provisional (te la dio el administrador)</label><input id="r-p0" type="password" inputmode="numeric"></div>
    <div class="form-foot"><button class="btn sec2" onclick="cerrarModal()">Volver</button><button class="btn grande" onclick="registrarInvitacion()">Continuar</button></div></div>`);
  if(inv) setTimeout(()=>$('r-p0').focus(), 100);
}
async function registrarInvitacion(){
  const txt=$('r-link').value.trim(); let inv=null;
  try{ const u=new URL(txt); inv=b64d(u.searchParams.get('i')||''); }catch(e){ inv=b64d(txt.split('i=').pop()); }
  if(!inv||!inv.t||!inv.u) return toast('Ese enlace no es válido. Pídele al administrador que lo revise.','err');
  const p0=$('r-p0').value; if(await sha256(inv.t+'·'+p0)!==inv.k) return toast('La clave provisional no es correcta','err');
  const salt=token(8); const hash=await hashPass(p0,salt);
  DB.inst={rol:'tableta',disp:inv.d,creada:fecha(ahora()),cuenta:inv.u};
  DB.usuarios.push({user:inv.u,nombre:inv.n,rol:inv.r,disp:inv.d,activo:true,hash,salt,centros:inv.c,perm:inv.p,primerAcceso:true,altaConfirmada:false,token:inv.t});
  if(inv.cfg){ if(inv.cfg.tarifas) DB.tarifas=inv.cfg.tarifas; if(inv.cfg.especialidades) DB.especialidades=inv.cfg.especialidades; if(inv.cfg.niveles) DB.niveles=inv.cfg.niveles; }
  registrar({usuario:inv.u,accion:'Alta de usuario',modulo:'Usuarios',centro:inv.c[0],concepto:`${inv.n} activó su cuenta en la ${inv.d}`,codigo:inv.u,tipo:'alta'});
  await guardarYa(); history.replaceState(null,'',location.pathname); cerrarModal(true);
  toast(`Hola ${inv.n}. Esta tableta ya es la tuya.`,'ok'); entrar(usuario(inv.u));
}

/* ── Login ── */
function pantallaLogin(){
  mostrar('p-login');
  const u = DB.inst.cuenta; $('l-user').value = DB.usuarios.length===1 ? DB.usuarios[0].user : (u||'');
  $('l-pass').value=''; $('l-msg').className='msg'; $('l-msg').textContent='';
  $('l-sub').textContent = esCentral() ? 'Central del administrador' : `Tableta ${DB.inst.disp}`;
  setTimeout(()=>$('l-pass').focus(),100);
}
async function login(){
  const u=$('l-user').value.trim().toLowerCase(), p=$('l-pass').value, msg=$('l-msg');
  const user=usuario(u);
  if(!user){ msg.className='msg err'; msg.textContent='✗ Ese usuario no está en este aparato'; return; }
  if(!user.activo){ msg.className='msg err'; msg.textContent='✗ Esta cuenta está desactivada'; return; }
  if(await hashPass(p,user.salt)!==user.hash){ msg.className='msg err'; msg.textContent='✗ Contraseña incorrecta'; return; }
  entrar(user);
}
function entrar(user){
  S.user=user; S.sec='inicio';
  mostrar('p-app'); construirMenu(); irSec('inicio');
  if(user.primerAcceso) primerAcceso(); else if(!user.vioAyuda){ user.vioAyuda=true; guardar(); ayuda(); }
  procesarCompartidos();
}
function salir(){ S.user=null; cerrarModal(true); pantallaLogin(); }

/* ── Primer acceso: obligar a cambiar la clave ── */
function primerAcceso(){
  abrirModal('Elige tu contraseña', `<div class="pasos"><div class="paso-g"><div class="num">1</div><div><b>Es tu primera vez</b><p>Te dieron una clave provisional. Ahora pon una tuya: solo tú la sabrás.</p></div></div></div>
  <div class="form" style="margin-top:1rem"><div class="campo"><label>Nueva contraseña</label><input type="password" id="pa-1"></div><div class="campo"><label>Repite la contraseña</label><input type="password" id="pa-2"></div>
  <div class="form-foot"><button class="btn grande" onclick="guardarPrimer()">Guardar y entrar</button></div></div>`, true);
}
async function guardarPrimer(){
  const a=$('pa-1').value,b=$('pa-2').value; if(a.length<4) return toast('Pon al menos 4 caracteres','err'); if(a!==b) return toast('Las dos contraseñas no coinciden','err');
  S.user.salt=token(8); S.user.hash=await hashPass(a,S.user.salt); S.user.primerAcceso=false; S.user.vioAyuda=true;
  registrar({accion:'Cambio de contraseña',modulo:'Usuarios',concepto:'Clave provisional sustituida',codigo:S.user.user}); guardar();
  cerrarModal(true); toast('Contraseña guardada. Ya es tuya.','ok'); ayuda();
}
async function cambiarPass(){
  const p0=$('mc-p0').value,p1=$('mc-p1').value,p2=$('mc-p2').value;
  if(await hashPass(p0,S.user.salt)!==S.user.hash) return toast('La contraseña actual no es correcta','err');
  if(p1.length<4||p1!==p2) return toast('La nueva contraseña debe tener 4 caracteres o más y coincidir','err');
  S.user.salt=token(8); S.user.hash=await hashPass(p1,S.user.salt);
  registrar({accion:'Cambio de contraseña',modulo:'Usuarios',concepto:'Contraseña actualizada',codigo:S.user.user}); guardar();
  ['mc-p0','mc-p1','mc-p2'].forEach(i=>$(i).value=''); toast('Contraseña guardada','ok');
}

/* ── Ayuda ── */
function ayuda(){
  const h = esCentral() ? [
    ['👥','Añade a tus usuarios','En Usuarios pulsa "Añadir una persona". Te sale un enlace y una clave: se los mandas y la persona entra sola.'],
    ['📂','Recibe sus archivos','Cada usuario te envía un archivo .sync. Ábrelo en Inicio con "Abrir archivo" (o compártelo a esta app desde WhatsApp) y pulsa Importar.'],
    ['📊','Mira cómo va el negocio','En Inicio ves lo que ha entrado, salido, lo que te deben y quién ha hecho qué.'],
    ['💾','Guarda una copia cada semana','En Copias de seguridad pulsa "Guardar copia" y pásala a un USB o a tu móvil. Si este aparato se rompe, no pierdes nada.'],
  ] : [
    ['📝','Trabaja normal','Matricula, cobra, apunta gastos. No hace falta Internet: todo se guarda en tu tableta.'],
    ['🔄','Al terminar, pulsa SINCRONIZAR','La app crea un archivo. Mándaselo al administrador por WhatsApp, Bluetooth o como quieras.'],
    ['🟢','Espera la confirmación','Cuando el administrador lo importe te devolverá un archivo. Ábrelo aquí y tus registros se pondrán en verde.'],
  ];
  abrirModal('¿Cómo funciona?', `<div class="pasos">${h.map((x,i)=>`<div class="paso-g"><div class="num">${i+1}</div><div><b>${x[0]} ${x[1]}</b><p>${x[2]}</p></div></div>`).join('')}</div><div class="form-foot" style="margin-top:1rem"><button class="btn grande" onclick="cerrarModal()">Entendido</button></div>`);
}
