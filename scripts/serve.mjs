import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const port=Number(process.env.PORT||5173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.wasm':'application/wasm','.tflite':'application/octet-stream','.task':'application/octet-stream','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
    const info=await stat(file);if(!info.isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':file.includes('/models/')||file.includes('/vendor/')?'public, max-age=3600':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(await readFile(file));
  }catch(error){res.writeHead(error.code==='ENOENT'?404:500).end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}`));
server.on('error',error=>{console.error(error.message);process.exit(1)});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
