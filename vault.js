// The Client Profile Vault: intake fields, each with a "verified with client" flag and date.
import*as db from './db.js';import{encrypt,decrypt}from './crypto.js';
export const FIELDS=[
 ['address','Address'],['salary','Salary expectation'],['roles','Target roles'],
 ['links','LinkedIn / GitHub / portfolio links'],['dob','Date of birth'],
 ['citizenship','Citizenship / work authorisation'],['gender','Gender / sex (for US/Canada forms)']];
export const quota=c=>c.region==='Nigeria'?5:10; // daily quota per stage, from the SOP
export function newClient(){return{id:crypto.randomUUID(),name:'',region:'Nigeria',fields:{},masterCV:'',updated:Date.now()};}
// Items that block applications: empty ("missing") or not yet confirmed by the client ("unverified").
export function missing(c){
  return FIELDS.map(([k,l])=>{const f=c.fields[k];
    if(!f||!f.value.trim())return{label:l,why:'missing'};
    if(!f.verified)return{label:l,why:'unverified'};return null;}).filter(Boolean);
}
export async function saveClient(c){const{id,...rest}=c;await db.clientPut({id,...await encrypt(rest)});}
export async function loadClients(){
  return Promise.all((await db.clientsAll()).map(async r=>({id:r.id,...await decrypt(r)})));
}
