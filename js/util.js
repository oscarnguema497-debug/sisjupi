/* SIS JUPI · utilidades ─────────────────────────────────────────── */
'use strict';
const $ = id => document.getElementById(id);
const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const CENTRO_NOMBRE = {SANE:'SANE FP', JUPI1:'JUPI 1', JUPI2:'JUPI 2', GABINETE:'Abogado'};
const PERMISOS = [['matriculas','Matricular'],['pagos','Cobrar'],['gastos','Apuntar gastos']];

const pad = (n,l) => String(n).padStart(l,'0');
const fmt = n => (Math.round(n)||0).toLocaleString('es-ES') + ' FCFA';
const fecha = d => `${pad(d.getDate(),2)}/${pad(d.getMonth()+1,2)}/${d.getFullYear()}`;
const hora  = d => `${pad(d.getHours(),2)}:${pad(d.getMinutes(),2)}:${pad(d.getSeconds(),2)}`;
const ymd   = d => `${d.getFullYear()}${pad(d.getMonth()+1,2)}${pad(d.getDate(),2)}`;
const ahora = () => new Date();
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const aDate = f => { if(!f) return null; const [d,m,y] = f.split(' ')[0].split('/'); return new Date(`${y}-${m}-${d}T00:00:00`); };
function diasDesde(f){ const d = aDate(f); if(!d) return 9999; return Math.floor((Date.now() - d.getTime())/86400000); }
const hace = f => { const n = diasDesde(f); return n >= 9999 ? 'nunca' : n <= 0 ? 'hoy' : n === 1 ? 'ayer' : `hace ${n} días`; };
const token = (l=6) => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; const r = crypto.getRandomValues(new Uint8Array(l)); for(const b of r) s += a[b % a.length]; return s; };

/* base64url para enlaces */
const b64e = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const b64d = s => { try { s = s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length % 4) s += '='; return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch(e){ return null; } };

async function sha256(txt){ const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }

/* UI: toast y modal */
function toast(t, tipo=''){ const w=$('toasts'); const d=document.createElement('div'); d.className='toast '+tipo; d.textContent=t; w.appendChild(d); setTimeout(()=>d.remove(), 4200); }
function abrirModal(titulo, html, bloqueado=false){ $('m-title').textContent=titulo; $('m-body').innerHTML=html; $('modal').classList.add('act'); if(bloqueado) $('modal').dataset.bloqueado='1'; else delete $('modal').dataset.bloqueado; }
function cerrarModal(force){ if($('modal').dataset.bloqueado && !force) return; delete $('modal').dataset.bloqueado; $('modal').classList.remove('act'); }
function tab(el,id){ el.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('act')); el.classList.add('act'); const cont=el.parentElement.parentElement; cont.querySelectorAll('.tpanel').forEach(p=>p.classList.toggle('act', p.id===id)); }

/* Descargar / compartir archivos */
function descargarTexto(nombre, texto, mime='application/json'){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([texto],{type:mime})); a.download=nombre; document.body.appendChild(a); a.click(); a.remove();
}
async function compartirTexto(nombre, texto, titulo){
  const f = new File([texto], nombre, {type:'application/json'});
  if(navigator.canShare && navigator.canShare({files:[f]})){
    try { await navigator.share({files:[f], title: titulo||nombre}); return 'compartido'; } catch(e){ if(e.name==='AbortError') return 'cancelado'; }
  }
  descargarTexto(nombre, texto); return 'descargado';
}
function leerArchivo(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsText(file); }); }

const estHtml = e => ({
  sincronizado:'<span class="est sinc">Confirmado</span>', pendiente:'<span class="est pend">Sin enviar</span>',
  enviado:'<span class="est env">Enviado, sin confirmar</span>', error:'<span class="est err">Error</span>'
}[e] || `<span class="est gris">${esc(e)}</span>`);
