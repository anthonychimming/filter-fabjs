import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const files=[];const walk=directory=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const full=path.join(directory,entry.name);if(entry.isDirectory())walk(full);else if(/\.(?:js|mjs)$/.test(entry.name))files.push(full);}};walk('src');walk('scripts');
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}console.log(`Syntax checked ${files.length} JavaScript modules.`);
