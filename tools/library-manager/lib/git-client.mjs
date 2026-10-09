import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { problem, relativePath, REGISTRY_LIMIT } from './repository.mjs';
import { FILTER_FILE_MAX_BYTES } from '../../../src/io/filter-format.js';
import { ONLINE_LIBRARY_PACKAGE_MAX_BYTES } from '../../../src/io/filter-library-package.js';

const execute=promisify(execFile);
export class GitClient{
  constructor(root){this.root=root;}
  async run(args,{bytes=false,allowedExit=[]}={}){
    const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('GIT_'))delete env[key];
    Object.assign(env,{GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1'});
    try{const result=await execute('git',['-c',`safe.directory=${this.root.replaceAll('\\','/')}`,'-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','commit.gpgsign=false','-C',this.root,...args],{encoding:bytes?'buffer':'utf8',maxBuffer:32*1024*1024,timeout:30000,windowsHide:true,env});return result.stdout;}
    catch(error){if(allowedExit.includes(error.code))return error.stdout;throw problem('GIT_FAILED',`Git ${args[0]} failed: ${String(error.stderr||error.message).trim()}`);}
  }
  async status(){
    const rows=(await this.run(['status','--porcelain=v1','-z','--untracked-files=all'])).split('\0').filter(Boolean),result=[];
    for(let i=0;i<rows.length;i++){const row=rows[i];result.push({status:row.slice(0,2),path:row.slice(3)});if(/[RC]/.test(row.slice(0,2)))result.at(-1).originalPath=rows[++i];}
    return result;
  }
  async head(){return(await this.run(['rev-parse','--verify','HEAD'])).trim();}
  async branch(){return(await this.run(['symbolic-ref','--quiet','--short','HEAD'],{allowedExit:[1]})).trim()||'(detached)';}
  async resolve(ref){return(await this.run(['rev-parse','--verify','--end-of-options',`${ref}^{commit}`])).trim();}
  async ensureClean(){const status=await this.status();if(status.length)throw problem('DIRTY_REPOSITORY','The library has existing changes. Commit or move them before preparing manager changes. Browsing remains available.',{details:status});}
  async exportBase(ref,target){
    const commit=await this.resolve(ref);await fs.mkdir(path.join(target,'source'),{recursive:true});await fs.mkdir(path.join(target,'filters'),{recursive:true});
    const rows=(await this.run(['ls-tree','-r','-z',commit])).split('\0').filter(Boolean);
    for(const row of rows){const [info,file]=row.split('\t');if(file!== 'registry.json'&&!file.startsWith('source/')&&!file.startsWith('filters/'))continue;if(file.endsWith('/.gitkeep'))continue;relativePath(file);const [mode,type,sha]=info.split(' ');if(!['100644','100755'].includes(mode)||type!=='blob')throw problem('UNSAFE_PATH',`Publication base contains a non-regular file: ${file}`);
      const limit=file==='registry.json'?REGISTRY_LIMIT:file.startsWith('source/')?FILTER_FILE_MAX_BYTES:ONLINE_LIBRARY_PACKAGE_MAX_BYTES;
      if(Number(await this.run(['cat-file','-s',sha]))>limit)throw problem('FILE_TOO_LARGE',`Publication base exceeds limit: ${file}`);
      await fs.writeFile(path.join(target,file),await this.run(['cat-file','blob',sha],{bytes:true}),{flag:'wx'});
    }return commit;
  }
  async diff(){return this.run(['diff','--no-ext-diff','--no-textconv','HEAD','--','registry.json','source','filters']);}
  async assertAttributes(files){
    const attributes=(await this.run(['check-attr','-z','filter','working-tree-encoding','--',...files])).split('\0');
    for(let i=0;i+2<attributes.length;i+=3)if(!['unspecified','unset'].includes(attributes[i+2]))throw problem('UNSAFE_GIT_ATTRIBUTE',`Refusing Git conversion for ${attributes[i]} (${attributes[i+1]}).`);
  }
  async publicationBranch(date){
    const prefix=`library/publish-${date}`;let branch=prefix;
    const names=new Set((await this.run(['for-each-ref','--format=%(refname:short)','refs/heads/'])).trim().split('\n'));
    for(let suffix=2;names.has(branch);suffix++)branch=`${prefix}-${suffix}`;
    await this.run(['switch','-c',branch]);return branch;
  }
  async stage(files){await this.run(['add','--',...files]);const staged=(await this.run(['diff','--cached','--name-only','-z'])).split('\0').filter(Boolean);if(staged.some(file=>!files.includes(file))||files.some(file=>!staged.includes(file)))throw problem('STAGING_MISMATCH','Staged files differ from the reviewed publication.');}
  async stagedBytes(file){return this.run(['show',`:${file}`],{bytes:true});}
  async commit(count){await this.run(['commit','-m',`Publish ${count} online library change${count===1?'':'s'}`]);return this.head();}
}
