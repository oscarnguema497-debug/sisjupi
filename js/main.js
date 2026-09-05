/* SIS JUPI · arranque ───────────────────────────────────────────── */
'use strict';
window.SISJUPI_VERSION = '1.0.0';

document.addEventListener('DOMContentLoaded', async () => {
  try { await cargarDB(); } catch(e){ alert('Este navegador no permite guardar datos (¿modo incógnito?). Usa Chrome o Safari normal.'); return; }
  $('f-abrir').addEventListener('change', () => abrirArchivos($('f-abrir')));
  document.addEventListener('keydown', e => { if(e.key==='Enter' && $('p-login').classList.contains('activa')) login(); if(e.key==='Escape') cerrarModal(); });
  $('modal').addEventListener('click', e => { if(e.target.id==='modal') cerrarModal(); });
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window._instalar = e; const b = $('btn-instalar'); if(b) b.style.display=''; });
  if(!DB.inst) pantallaConfig(); else pantallaLogin();
});
async function instalarApp(){ if(!window._instalar) return toast('Usa el menú del navegador → "Instalar app" o "Añadir a pantalla de inicio"','warn'); window._instalar.prompt(); }
