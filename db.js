// IndexedDB = a small database built into the browser. Data stays on this device.
const open=()=>new Promise((res,rej)=>{
  const r=indexedDB.open('pipelinedesk',1);
  r.onupgradeneeded=()=>{r.result.createObjectStore('meta');r.result.createObjectStore('clients',{keyPath:'id'});};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
});
async function tx(store,mode,fn){
  const db=await open();
  return new Promise((res,rej)=>{
    const t=db.transaction(store,mode);const rq=fn(t.objectStore(store));
    t.oncomplete=()=>res(rq&&rq.result);t.onerror=()=>rej(t.error);
  });
}
export const metaGet=k=>tx('meta','readonly',s=>s.get(k));
export const metaSet=(k,v)=>tx('meta','readwrite',s=>s.put(v,k));
export const clientsAll=()=>tx('clients','readonly',s=>s.getAll());
export const clientPut=r=>tx('clients','readwrite',s=>s.put(r));
export const clientDelete=id=>tx('clients','readwrite',s=>s.delete(id));
export const clientsClear=()=>tx('clients','readwrite',s=>s.clear());
