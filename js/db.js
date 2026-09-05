/* SIS JUPI · base de datos local (IndexedDB) ───────────────────────
   Toda la información vive en este aparato. Se guarda automáticamente
   tras cada cambio. La app del administrador es la "central". */
'use strict';

const DB_DEFECTO = () => ({
  v: 1,
  inst: null,            // {rol:'central'|'tableta', disp:'ADMIN'|'T01', creada, cuenta}
  usuarios: [],          // {user,nombre,rol,disp,activo,hash,salt,centros,perm,primerAcceso,altaConfirmada,token}
  invitaciones: [],      // central: {token,user,nombre,disp,rol,centros,perm,passHash,creada,usada}
  dispositivos: [],      // central: {id,user,nombre,ultSync,creado,estado}
  tarifas: { SANE:{'Matrícula':10000,'Mensualidad':20000}, JUPI1:{'Preescolar':60000,'Primaria':50000,'Uniforme':15000,'APA':3000}, JUPI2:{'Guardería':45000,'Preescolar':70000,'Primaria':60000,'Uniforme':15000,'APA':3000} },
  especialidades: [ {nombre:'Electricidad',activa:true},{nombre:'Mecánica',activa:true},{nombre:'Carpintería',activa:true} ],
  niveles: { JUPI1:['Preescolar','Primaria'], JUPI2:['Guardería','Preescolar','Primaria'] },
  cfgVersion: 1,
  estudiantes: [], pagos: [], gastos: [],
  gabinete: { clientes: [], casos: [] },
  registros: [],         // auditoría
  bandeja: [],           // central: paquetes .sync recibidos
  acuses: [],            // central: acuses generados · tableta: acuses recibidos
  mapas: {},             // central: código provisional → definitivo
  notifs: [],
  contadores: {},
  ultimoBackup: null,
});

let DB = DB_DEFECTO();
let _idb = null, _timer = null;

function abrirIDB(){
  return new Promise((res, rej) => {
    const r = indexedDB.open('sisjupi', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function cargarDB(){
  _idb = await abrirIDB();
  const v = await new Promise((res, rej) => { const t=_idb.transaction('kv','readonly').objectStore('kv').get('db'); t.onsuccess=()=>res(t.result); t.onerror=()=>rej(t.error); });
  if(v){ const base = DB_DEFECTO(); DB = Object.assign(base, v); }
  try { if(navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch(e){}
  return DB;
}
function guardar(){ clearTimeout(_timer); _timer = setTimeout(guardarYa, 250); }
function guardarYa(){
  clearTimeout(_timer);
  return new Promise((res, rej) => {
    if(!_idb) return res();
    const t = _idb.transaction('kv','readwrite'); t.objectStore('kv').put(JSON.parse(JSON.stringify(DB)), 'db');
    t.oncomplete = () => res(); t.onerror = () => rej(t.error);
  });
}
async function borrarTodo(){ DB = DB_DEFECTO(); await guardarYa(); }

/* Acceso rápido */
const usuario = u => DB.usuarios.find(x => x.user === u);
const esCentral = () => DB.inst && DB.inst.rol === 'central';

/* Identificadores ──────────────────────────────────────────────── */
function nuevoRegId(d){ const k = 'REG-'+DB.inst.disp+'-'+ymd(d); DB.contadores[k] = (DB.contadores[k]||0)+1; return `REG-${DB.inst.disp}-${ymd(d)}-${pad(DB.contadores[k],6)}`; }
/* Código de entidad: en tableta es provisional (lleva la tableta), en central es definitivo (lleva el año) */
function nuevoCodigo(tipo, ancho){
  if(esCentral()){ const y = new Date().getFullYear(); const k = tipo+'-'+y; DB.contadores[k]=(DB.contadores[k]||0)+1; return `${tipo}-${y}-${pad(DB.contadores[k],ancho)}`; }
  const k = tipo+'-'+DB.inst.disp; DB.contadores[k]=(DB.contadores[k]||0)+1; return `${tipo}-${DB.inst.disp}-${pad(DB.contadores[k],ancho)}`;
}
const codigoEstudiante = centro => nuevoCodigo(centro, 4);
const codigoPago = centro => nuevoCodigo('PAGO-'+centro, 6);
const codigoGasto = () => nuevoCodigo('GASTO', 6);
const codigoCaso = () => nuevoCodigo('CASO', 4);
const codigoCliente = () => nuevoCodigo('CLI', 4);

/* Auditoría: cada operación crea un registro ───────────────────── */
function registrar(o){
  const d = o.fechaObj || ahora();
  const r = {
    id: nuevoRegId(d), usuario: o.usuario || (S.user ? S.user.user : 'sistema'), disp: DB.inst.disp,
    accion: o.accion, centro: o.centro || '—', modulo: o.modulo, servicio: o.servicio || '—',
    concepto: o.concepto, codigo: o.codigo || '—', dia: DIAS[d.getDay()], fecha: fecha(d), hora: hora(d),
    estado: esCentral() ? 'sincronizado' : 'pendiente', obs: o.obs || '', importe: o.importe || 0, tipo: o.tipo || 'otro', ts: d.getTime(),
  };
  DB.registros.push(r); guardar(); return r;
}
function notificar(ic, txt){ const d = ahora(); DB.notifs.unshift({ic, txt, fecha: fecha(d), hora: hora(d), new: true}); DB.notifs = DB.notifs.slice(0, 200); guardar(); }
const noConfirmados = () => DB.registros.filter(r => r.estado !== 'sincronizado');
