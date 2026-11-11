import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const [repo,revision]=process.argv.slice(2);
if(!repo||!/^[a-f0-9]{40}$/.test(revision??''))throw Error('Usage: node scripts/sync-token-study.mjs <repo-path> <full-commit-sha>');
const git=(...args)=>execFileSync('git',['-C',repo,...args]);
if(!/^https:\/\/github.com\/rsteth\/learning-machines(?:\.git)?$|^git@github.com:rsteth\/learning-machines(?:\.git)?$/.test(git('remote','get-url','origin').toString().trim()))throw Error('Unexpected experiment repository');
const commit=git('rev-parse',revision+'^{commit}').toString().trim(),dest=new URL('../learning-machines/tokens/',import.meta.url);
mkdirSync(dest,{recursive:true});
const files=['mechanics.mjs','fixture.mjs'].map(file=>{const path='experiments/tokens/'+file,bytes=git('show',commit+':'+path);writeFileSync(new URL(file,dest),bytes);return {file,path,sha256:createHash('sha256').update(bytes).digest('hex')};});
const license=git('show',commit+':LICENSE');writeFileSync(new URL('mechanics-LICENSE.txt',dest),license);
writeFileSync(new URL('mechanics-pin.json',dest),JSON.stringify({repository:'https://github.com/rsteth/learning-machines',commit,files,license:'MIT',licensePath:'LICENSE',licenseFile:'mechanics-LICENSE.txt',licenseSha256:createHash('sha256').update(license).digest('hex')},null,2)+'\n');
const url=new URL('index.html',dest);writeFileSync(url,readFileSync(url,'utf8').replace(/(https:\/\/github.com\/rsteth\/learning-machines\/(?:tree|commit|blob)\/)(?:[a-f0-9]{40}|PIN_COMMIT)/g,'$1'+commit).replace(/(Pinned to commit <code>)[a-f0-9]{7}(<\/code>)/,'$1'+commit.slice(0,7)+'$2'));
// The static worked example is drawn from the mechanics that were just pinned.
execFileSync(process.execPath,[fileURLToPath(new URL('./render-token-study.mjs',import.meta.url))],{stdio:'inherit'});
console.log('Pinned token experiment '+commit);
