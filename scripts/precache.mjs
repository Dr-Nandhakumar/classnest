import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve('dist');
async function files(dir){let out=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await files(p));else if(entry.name!=='sw.js')out.push(p)}return out}
const all=await files(root),assets=all.map(p=>path.relative(root,p).replaceAll('\\','/'));
const hash=createHash('sha256');for(const p of all)hash.update(await fs.readFile(p));const version=hash.digest('hex').slice(0,12);
await fs.writeFile(path.join(root,'sw.js'),`const CACHE='classnest-offline-${version}';const ASSETS=${JSON.stringify(assets)};self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(p=>new URL(p,self.registration.scope).href))));self.skipWaiting()});self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('classnest-offline-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match(new URL('index.html',self.registration.scope).href,{ignoreVary:true})));return;}event.respondWith(caches.match(event.request,{ignoreVary:true}).then(cached=>cached||fetch(event.request)))});`);
console.log('Offline app shell prepared: '+assets.length+' assets.');
