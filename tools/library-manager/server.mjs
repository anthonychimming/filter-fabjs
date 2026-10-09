import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { LibraryManager } from './lib/operations.mjs';
import { problem } from './lib/repository.mjs';

const uiRoot=fileURLToPath(new URL('./ui/',import.meta.url)),BODY_LIMIT=12*1024*1024;
const assets=new Map([['/',['index.html','text/html; charset=utf-8']],['/library-manager.js',['library-manager.js','text/javascript; charset=utf-8']],['/library-manager.css',['library-manager.css','text/css; charset=utf-8']]]);
async function body(request){
  if(request.headers['content-type']!=='application/json')throw problem('CONTENT_TYPE','Use application/json.');
  if(Number(request.headers['content-length'])>BODY_LIMIT)throw problem('BODY_TOO_LARGE','Upload exceeds the request limit.');
  const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;if(size>BODY_LIMIT)throw problem('BODY_TOO_LARGE','Upload exceeds the request limit.');chunks.push(chunk);}
  try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch{throw problem('INVALID_JSON','Expected a JSON object.');}
}
export async function startManagerServer({libraryRoot,baseRef,port=8091,manager:provided}={}){
  const manager=provided||await LibraryManager.open({libraryRoot,baseRef}),token=randomBytes(32).toString('hex');let origin,queue=Promise.resolve(),waiting=0;
  const server=http.createServer(async(request,response)=>{
    const send=(status,value,type='application/json; charset=utf-8')=>{response.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});response.end(type.startsWith('application/json')?JSON.stringify(value):value);};
    let release;
    try{
      if(request.headers.host!==new URL(origin).host)throw problem('HOST_REJECTED','Unexpected Host header.');
      if(request.headers.origin&&request.headers.origin!==origin)throw problem('ORIGIN_REJECTED','Only the manager origin is allowed.');
      if(request.headers['sec-fetch-site']&&!['same-origin','none'].includes(request.headers['sec-fetch-site']))throw problem('ORIGIN_REJECTED','Cross-site requests are forbidden.');
      const url=new URL(request.url,origin),route=url.pathname;
      if(request.method==='GET'&&assets.has(route)){const [file,type]=assets.get(route);return send(200,await fs.readFile(path.join(uiRoot,file)),type);}
      if(request.method==='GET'&&route==='/api/session')return send(200,{token});
      if(route.startsWith('/api/')){
        const received=Buffer.from(String(request.headers['x-library-token']||'')),expected=Buffer.from(token);
        // Images use a same-origin URL token because <img> cannot attach custom headers.
        const imageToken=Buffer.from(url.searchParams.get('token')||'');
        if(!(received.length===expected.length&&timingSafeEqual(received,expected))&&!(request.method==='GET'&&(route.startsWith('/api/preview/')||route.startsWith('/api/inspection/')||route.startsWith('/api/candidate/'))&&imageToken.length===expected.length&&timingSafeEqual(imageToken,expected)))throw problem('TOKEN_REQUIRED','Reload the manager to establish a local session.');
      }
      // Serialize repository reads as well as writes: no observer sees half an application.
      if(waiting>=32)throw problem('OPERATION_BUSY','Too many manager operations are waiting. Retry shortly.');
      const previous=queue;queue=new Promise(resolve=>{release=resolve;});waiting++;await previous;
      if(request.method==='GET'&&route==='/api/library')return send(200,manager.summary());
      if(request.method==='GET'&&route==='/api/diff')return send(200,{workingTree:await manager.git.diff(),candidate:manager.review?.diff||''});
      let match;
      if(request.method==='GET'&&(match=/^\/api\/filters\/([^/]+)\/history$/.exec(route)))return send(200,await manager.history(decodeURIComponent(match[1])));
      if(request.method==='GET'&&(match=/^\/api\/preview\/([^/]+)\/([1-9][0-9]*)$/.exec(route)))return send(200,await manager.preview(decodeURIComponent(match[1]),Number(match[2])),'image/png');
      if(request.method==='GET'&&(match=/^\/api\/inspection\/([a-f0-9-]+)\/preview$/.exec(route))){const item=manager.inspections.get(match[1]);if(!item)throw problem('INSPECTION_EXPIRED','Inspect this candidate again.');return send(200,item.packageBytes,'image/png');}
      if(request.method==='GET'&&(match=/^\/api\/candidate\/([^/]+)\/preview$/.exec(route))){const item=manager.pending.get(decodeURIComponent(match[1]));if(!item?.packageBytes)throw problem('PACKAGE_MISSING','No candidate preview.');return send(200,item.packageBytes,'image/png');}
      if(request.method==='POST'){
        const handlers={'/api/refresh':()=>manager.refresh(),'/api/candidate/inspect':data=>manager.inspect(data),'/api/candidate/accept':data=>manager.accept(data),'/api/candidate/unpublish':data=>manager.unpublish(data),'/api/candidate/delete-draft':data=>manager.deleteDraft(data),'/api/candidate/discard':data=>manager.discard(data),'/api/validate':()=>manager.validate(),'/api/prepare-publication':data=>manager.prepare(data)};
        if(handlers[route])return send(200,await handlers[route](await body(request)));
      }
      return send(404,{error:{code:'NOT_FOUND',message:'Unknown manager operation.'}});
    }catch(error){const status=['HOST_REJECTED','ORIGIN_REJECTED','TOKEN_REQUIRED'].includes(error.code)?403:error.code==='BODY_TOO_LARGE'?413:error.code==='OPERATION_BUSY'?409:400;send(status,{error:{code:error.code||'MANAGER_ERROR',message:error.message,path:error.path||null,details:error.details||null}});}
    finally{if(release){waiting--;release();}}
  });
  server.requestTimeout=30000;server.headersTimeout=15000;
  try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});}catch(error){if(!provided)await manager.close();throw error;}
  origin=`http://127.0.0.1:${server.address().port}`;
  return{server,manager,url:origin,async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));if(!provided)await manager.close();}};
}
export async function runCli(args=process.argv.slice(2)){
  const options={},names={'--library-root':'libraryRoot','--base-ref':'baseRef','--port':'port'};
  while(args.length){const key=args.shift();if(!names[key]||!args.length||Object.hasOwn(options,names[key]))throw new Error(`Invalid or repeated option: ${key}`);options[names[key]]=args.shift();}
  if(options.port!==undefined){options.port=Number(options.port);if(!Number.isInteger(options.port)||options.port<1||options.port>65535)throw new Error('--port must be 1–65535');}
  const app=await startManagerServer(options);console.log(`Filter FabJS Library Manager: ${app.url}\nLibrary: ${app.manager.root}\nPublication base: ${app.manager.baseSha}\nPending candidates remain local until Prepare Publication. No push is performed.`);
  let stopping=false;const stop=async()=>{if(stopping)return;stopping=true;await app.close();};process.once('SIGINT',stop);process.once('SIGTERM',stop);return app;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))runCli().catch(error=>{console.error(`ERROR ${error.message}`);process.exitCode=1;});
