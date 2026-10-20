import*as db from './db.js';
import*as cr from './crypto.js';
import{FIELDS,newClient,missing,quota,saveClient,loadClients}from './vault.js';
import{exportBackup,importBackup,daysSinceExport}from './export.js';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let clients=[];
const show=h=>{$('#view').innerHTML=h;};

(async()=>{
  const salt=await db.metaGet('salt');
  $('#lockMsg').textContent=salt?'Enter your passphrase to unlock.':'First time: choose a passphrase (8+ characters). It cannot be recovered if you forget it, so write it down somewhere safe.';
  $('#confirmRow').hidden=!!salt;
})();

$('#unlockBtn').onclick=async()=>{
  const pass=$('#pass').value;let salt=await db.metaGet('salt');
  if(!salt){
    if(pass.length<8)return alert('Use at least 8 characters.');
    if(pass!==$('#pass2').value)return alert('The two passphrases do not match.');
    salt=cr.b64(cr.randomSalt());cr.setKey(await cr.deriveKey(pass,cr.unb64(salt)));
    await db.metaSet('salt',salt);await db.metaSet('check',await cr.encrypt({ok:1}));
  }else{
    cr.setKey(await cr.deriveKey(pass,cr.unb64(salt)));
    try{await cr.decrypt(await db.metaGet('check'));}catch{return alert('Wrong passphrase.');}
  }
  clients=await loadClients();$('#lock').hidden=true;$('#main').hidden=false;
  $('#pass').value='';banner();renderList();
};
$('#navClients').onclick=()=>renderList();
$('#navBackup').onclick=()=>renderBackup();

async function banner(){
  const d=await daysSinceExport();
  $('#banner').textContent=d===null?'No backup yet. Go to Backup and export one.':d>=7?`Last backup was ${d} days ago. Please export a new one.`:'';
}

function renderList(){
  show(`<button id="add">+ Add client</button>`+(clients.map(c=>{
    const m=missing(c);
    return`<div class="card"><b>${esc(c.name)}</b> <small>${esc(c.region)} · daily quota ${quota(c)}</small>
    <p>${m.length?m.length+' intake items need attention':'All intake items verified'}</p>
    <button data-open="${c.id}">Open</button></div>`;}).join('')||'<p>No clients yet.</p>'));
  $('#add').onclick=()=>renderEdit(newClient(),true);
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>renderEdit(clients.find(c=>c.id===b.dataset.open),false));
}

function renderEdit(c,isNew){
  const m=missing(c);
  show(`<h2>${isNew?'New client':esc(c.name)}</h2>
  <div class="card ${m.length?'warn':''}"><b>Still needed from the client:</b>
  ${m.length?'<ul>'+m.map(x=>`<li>${x.label} (${x.why})</li>`).join('')+'</ul>':' nothing'}</div>
  <label>Client name<input id="name" value="${esc(c.name)}"></label>
  <label>Region<select id="region"><option${c.region==='Nigeria'?' selected':''}>Nigeria</option><option${c.region==='Abroad'?' selected':''}>Abroad</option></select></label>
  ${FIELDS.map(([k,l])=>{const x=c.fields[k]||{};
    return`<label>${l}<textarea rows="2" data-f="${k}">${esc(x.value)}</textarea></label>
    <label class="chk"><input type="checkbox" data-v="${k}"${x.verified?' checked':''}> Verified with client${x.date?' (updated '+new Date(x.date).toLocaleDateString()+')':''}</label>`;}).join('')}
  <label>Master CV (paste the text from Google Docs)<textarea id="cv" rows="14">${esc(c.masterCV)}</textarea></label>
  <p><button id="save">Save</button><button id="back">Back</button>${isNew?'':'<button id="del">Delete client data</button>'}</p>`);
  $('#back').onclick=renderList;
  $('#save').onclick=async()=>{
    c.name=$('#name').value.trim();if(!c.name)return alert('Please enter a client name.');
    c.region=$('#region').value;c.masterCV=$('#cv').value;
    FIELDS.forEach(([k])=>{
      const v=document.querySelector(`[data-f="${k}"]`).value,ok=document.querySelector(`[data-v="${k}"]`).checked,old=c.fields[k]||{};
      if(v!==(old.value||'')||ok!==!!old.verified)c.fields[k]={value:v,verified:ok,date:Date.now()};
    });
    c.updated=Date.now();await saveClient(c);if(isNew)clients.push(c);renderList();
  };
  if(!isNew)$('#del').onclick=async()=>{
    if(!confirm('Delete ALL data for this client? This cannot be undone.'))return;
    await db.clientDelete(c.id);clients=clients.filter(x=>x!==c);renderList();
  };
}

function renderBackup(){
  show(`<h2>Backup</h2>
  <p>Your data lives only in this browser. Clearing browser data erases it, so export a backup often. The file is encrypted with your passphrase.</p>
  <button id="exp">Export backup</button>
  <label>Import backup (replaces everything here)<input id="imp" type="file" accept=".json"></label>`);
  $('#exp').onclick=async()=>{await exportBackup();banner();alert('Backup downloaded. Check your Downloads folder.');};
  $('#imp').onchange=async e=>{
    const f=e.target.files[0];if(!f)return;
    if(!confirm('This replaces all data in this browser with the backup. Continue?'))return;
    try{await importBackup(await f.text());alert('Backup restored. The page will reload; unlock with the backup passphrase.');location.reload();}
    catch(err){alert(err.message);}
  };
}
