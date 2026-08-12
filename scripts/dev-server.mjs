import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||8080);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html',target=path.resolve(root,relative);if(!target.startsWith(root)){res.writeHead(403);res.end('Forbidden');return;}const stat=await fs.stat(target);const file=stat.isDirectory()?path.join(target,'index.html'):target;const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch(error){res.writeHead(error.code==='ENOENT'?404:500,{'Content-Type':'text/plain; charset=utf-8'});res.end(error.code==='ENOENT'?'Not found':String(error));}});
server.listen(port,'127.0.0.1',()=>console.log(`Filter FabJS: http://localhost:${port}`));
