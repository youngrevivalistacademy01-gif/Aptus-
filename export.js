// Backup and restore. The backup file stays encrypted with your passphrase.
import*as db from './db.js';
export async function daysSinceExport(){const t=await db.metaGet('lastExport');return t?Math.floor((Date.now()-t)/864e5):null;}
export async function exportBackup(){
  const data={app:'aptus-pipeline-desk',version:1,salt:await db.metaGet('salt'),check:await db.metaGet('check'),clients:await db.clientsAll()};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
  a.download='pipeline-desk-backup-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();a.remove();
  const log=(await db.metaGet('exportLog'))||[];log.push(Date.now()); // audit log: times only, no client data
  await db.metaSet('exportLog',log);await db.metaSet('lastExport',Date.now());
}
export async function importBackup(text){
  let d;try{d=JSON.parse(text);}catch{throw new Error('That file is not a valid backup.');}
  if(d.app!=='aptus-pipeline-desk'||!d.salt||!d.check||!Array.isArray(d.clients))throw new Error('That file is not an Aptus Pipeline Desk backup.');
  await db.clientsClear();await db.metaSet('salt',d.salt);await db.metaSet('check',d.check);
  for(const c of d.clients)await db.clientPut(c);
}
