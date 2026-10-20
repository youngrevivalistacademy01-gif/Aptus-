// Web Crypto = encryption built into the browser. Your passphrase makes a key (PBKDF2);
// the key locks each client record with AES-GCM. Without the passphrase the data is unreadable.
const enc=new TextEncoder(),dec=new TextDecoder();
let key=null;
export function b64(buf){let s='';for(const x of new Uint8Array(buf))s+=String.fromCharCode(x);return btoa(s);}
export const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export const randomSalt=()=>crypto.getRandomValues(new Uint8Array(16));
export async function deriveKey(pass,salt){
  const base=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export const setKey=k=>{key=k;};
export async function encrypt(obj){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(obj)));
  return {iv:b64(iv),ct:b64(ct)};
}
export async function decrypt(p){
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(p.iv)},key,unb64(p.ct));
  return JSON.parse(dec.decode(pt));
}
