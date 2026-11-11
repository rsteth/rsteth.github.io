import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as M from '../learning-machines/manifolds/mechanics.mjs';
import {FIXTURES as F} from '../learning-machines/manifolds/fixtures.mjs';
import {pcaDirectionNote,VIEW_DIRECTION_NOTE,CHART_DIRECTION_NOTE} from '../learning-machines/manifolds/directions.mjs';
import {routeSVG,sameRoute} from '../learning-machines/manifolds/routes.mjs';
import {formatResidual,formatSliderValue} from '../learning-machines/manifolds/format.mjs';
import {project,depth,visibleBoxFaces,paintRobot} from '../learning-machines/manifolds/visuals.mjs';
import {threadData,paintThreads,rmsDegrees,VIEWS} from '../learning-machines/manifolds/threads.mjs';
// Each route has dark ink and a pale casing; at least one edge exceeds 3:1 across the full field.
const luminance=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
for(let i=0;i<=100;i++){const v=i/100,bg=[228-72*v,221-116*v,194-117*v];assert.ok(Math.max(contrast([48,46,40],bg),contrast([255,249,239],bg))>=3);}
assert.ok(contrast([48,46,40],[255,249,239])>3);
assert.match(routeSVG([[0,0],[1,1]],{shortest:true}),/stroke="#302e28"[\s\S]*stroke-dasharray="7 5"/);
assert.match(routeSVG([[0,0],[1,1]]),/stroke="#fff9ef"/);
assert.ok(sameRoute({ok:true,path:[1,2]},{ok:true,path:[1,2]}));
assert.ok(!sameRoute({ok:true,path:[1,2]},{ok:true,path:[2,1]}));
assert.equal(formatResidual({positionResidualM:null,angularResidualRad:null}),'not evaluated mm translation; not evaluated° rotation');
assert.equal(formatResidual({positionResidualM:0,angularResidualRad:0}),'0.000 mm translation; 0.0000° rotation');
assert.ok(!formatResidual({}).includes('NaN'));
assert.equal(formatSliderValue(.43,.005,' m'),'0.430 m');
assert.equal(formatSliderValue(.435,.005,' m'),'0.435 m');
assert.equal(formatSliderValue(.001,.001),'0.001');
assert.equal(formatSliderValue(.002,.001),'0.002');
assert.equal(formatSliderValue(-12.3,.1,'°'),'-12.3°');
assert.equal(formatSliderValue(4,1),'4');
assert.equal(formatSliderValue(1e-7,1e-7),'0.0000001');
assert.throws(()=>formatSliderValue(1,0),RangeError);
const root=fileURLToPath(new URL('../',import.meta.url)),base=resolve(root,'learning-machines/manifolds');
const pin=JSON.parse(readFileSync(resolve(base,'mechanics-pin.json')));assert.match(pin.commit,/^[0-9a-f]{40}$/);
for(const [name,item] of Object.entries(pin.files))assert.equal(createHash('sha256').update(readFileSync(resolve(base,name))).digest('hex'),item.sha256);
assert.equal(createHash('sha256').update(readFileSync(resolve(base,pin.licenseFile))).digest('hex'),pin.licenseSha256);
const page=readFileSync(resolve(base,'index.html'),'utf8'),script=readFileSync(resolve(base,'page.mjs'),'utf8');
for(const a of ['fourteen-numbers','grasp','landscape','skill','compression','contact','learning','sources'])assert.ok(page.includes('id="'+a+'"'));
for(const phrase of ['How many dimensions does a movement need?','knowledge distillation','LoRA','remain available','six independent','locally'])assert.ok((page+script).toLowerCase().includes(phrase.toLowerCase()),phrase);
assert.equal((page.match(/data-static-caption=/g)||[]).length,4);
assert.ok(page.includes(`${F.scores.holdout.rmsDeg.toFixed(3)}° before projection`));
assert.ok(page.includes(`${F.scores.holdoutProjected.rmsDeg.toFixed(3)}° after projection`));
assert.ok(page.includes(`${F.landscape.cells.filter(c=>c.valid).length} of ${F.landscape.cells.length} samples are valid`));
assert.ok(page.includes(`forward y, ${F.landscape.axes.y[0].toFixed(2)} to ${F.landscape.axes.y.at(-1).toFixed(2)} m`));
const css=readFileSync(resolve(base,'manifolds.css'),'utf8');assert.match(css,/\.map text\{font-size:18px\}/);assert.match(script,/map-axis-caption/);
assert.equal((page.match(/class="static-rig"/g)||[]).length,4);assert.equal((page.match(/data-reset=/g)||[]).length,4);
assert.ok(page.includes(pin.repository+'/tree/'+pin.commit+'/experiments/manifolds'));
for(const match of page.matchAll(/(?:href|src)="([^"]+)"/g)){const url=match[1];if(/^(https?:|#|mailto:)/.test(url))continue;assert.ok(existsSync(resolve(base,url.split('?')[0])),url);}
assert.ok(readFileSync(resolve(root,'learning-machines/index.html'),'utf8').includes('an open notebook / 03'));
assert.ok(readFileSync(resolve(root,'learning-machines/attention-and-memory/index.html'),'utf8').includes('../manifolds/'));
assert.ok(F.landscape.exampleRoutes.lowCost.ok);assert.ok(F.scores.holdoutProjected.failed===0);
assert.ok(F.canonical.rank.rank===6);assert.ok(M.relativeGraspError(F.canonical.q).positionResidualM<.001);
// Direction correction is presentation-only: physical forward +Y and Reach stay unchanged.
assert.equal(pin.commit,'f4d873cea71a195fd35f596b80b9bb946aa82137');
assert.equal(pin.files['mechanics.mjs'].sha256,'749142a983fe6ef1026e5a44406ea018a4aa7a9e40593df61b11e9fe5d5639b4');
assert.equal(pin.files['fixtures.mjs'].sha256,'75576664f0cdffc32152a8be073e2446727857cf6b26244ce285832d064290e9');
// Screen-right/down/toward-camera preserves camera chirality after the 180° yaw.
const origin=project([0,0,0]),basis=[[1,0,0],[0,1,0],[0,0,1]],screenRight=basis.map(v=>(project(v)[0]-origin[0])/200),screenDown=basis.map(v=>(project(v)[1]-origin[1])/200),toward=basis.map(depth);
const cross=[screenRight[1]*screenDown[2]-screenRight[2]*screenDown[1],screenRight[2]*screenDown[0]-screenRight[0]*screenDown[2],screenRight[0]*screenDown[1]-screenRight[1]*screenDown[0]];
assert.ok(cross.reduce((sum,v,i)=>sum+v*toward[i],0)<0,'screen-right/down/toward-camera determinant stays negative');
for(let i=0;i<3;i++)assert.ok(Math.abs(cross[i]+toward[i])<1e-12);
assert.ok(toward[0]<0&&toward[1]>0&&toward[2]>0,'camera sees -X/+Y/top');
const back=[0,.3,1.2],front=[0,.5,1.2];
assert.ok(project(front)[0]<project(back)[0]);assert.ok(project(front)[1]>project(back)[1]);assert.ok(depth(front)>depth(back));
const reachBack=M.encodeTaskCoordinates(-1,0),reachFront=M.encodeTaskCoordinates(1,0);
assert.ok(reachFront.ballPose.position[1]>reachBack.ballPose.position[1]);
assert.ok(project(reachFront.ballPose.position)[0]<project(reachBack.ballPose.position)[0]);
assert.ok(project(reachFront.ballPose.position)[1]>project(reachBack.ballPose.position)[1]);
for(const target of [reachBack,reachFront]){const solved=M.solveGrasp({...target,initialQ:F.canonical.q});assert.ok(solved.ok);assert.ok(M.relativeGraspError(solved.q).positionResidualM<.001);}
const faces=visibleBoxFaces(0,0,1,.4,.2,.6);assert.ok(faces[0].points.every(p=>p[1]===.1),'visible torso/head front is +Y');assert.ok(faces[1].points.every(p=>p[0]===-.2),'visible side is -X');assert.ok(faces[2].points.every(p=>p[2]===1.6),'visible top stays +Z');
// Ball, target ghost, wrists, training traces and axis labels share the same projection.
const recorded=[];const recordingContext=new Proxy({},{get:(_,method)=>(...args)=>recorded.push([method,args]),set:()=>true});
const ghost={position:[.03,.6,1.2],rotation:F.canonical.ballPose.rotation},trail=[[.02,.34,1.15],[.02,.5,1.15]],testFK=M.forwardKinematics(F.canonical.q);
paintRobot({getContext:()=>recordingContext},testFK,F.canonical.ballPose,{ghost,trails:[trail]});
const close=(a,b)=>Math.abs(a-b)<1e-9;
const saw=(method,p)=>recorded.some(([m,args])=>m===method&&close(args[0],project(p)[0])&&close(args[1],project(p)[1]));
assert.ok(saw('arc',F.canonical.ballPose.position));assert.ok(saw('arc',ghost.position));assert.ok(saw('arc',testFK.left.position));assert.ok(saw('arc',testFK.right.position));assert.ok(saw('moveTo',trail[0]));assert.ok(saw('lineTo',trail[1]));
const worldY=[-.60,.26,.02];assert.ok(recorded.some(([m,args])=>m==='fillText'&&args[0]==='y'&&close(args[1],project(worldY)[0])&&close(args[2],project(worldY)[1])));
const wristY=testFK.left.position.map((v,i)=>v+.09*testFK.left.rotation[i][1]);assert.ok(saw('lineTo',wristY));
const calls=[];const ctx=new Proxy({},{get:(_,k)=>k==='measureText'?()=>({width:1}):(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),k);calls.push(k);},set:()=>true});
paintRobot({getContext:()=>ctx},M.forwardKinematics(F.canonical.q),F.canonical.ballPose);assert.ok(calls.includes('arc'));assert.ok(project([0,0,1]).every(Number.isFinite));
// Every independent control changes an orientation or a point of the actual 3D chain.
for(let i=0;i<14;i++){const q=[...F.canonical.q];q[i]+=.01;assert.notDeepEqual(M.forwardKinematics(q),M.forwardKinematics(F.canonical.q));}
// PCA score signs come from training metadata, not from reversing a UI slider.
assert.deepEqual(F.pca.orientation.map(o=>[o.component,o.axis]),[[1,'y'],[2,'z']]);
assert.ok(F.pca.orientation.every(o=>o.trainingCorrelation>0&&o.trainingCount===F.demonstrations.train.length));
assert.match(pcaDirectionNote(F.pca),/PCA signs are arbitrary/);assert.match(pcaDirectionNote(F.pca),/mixed fitted axes/);
assert.ok(page.includes(pcaDirectionNote(F.pca)));assert.ok(page.includes(VIEW_DIRECTION_NOTE));assert.ok(page.includes(CHART_DIRECTION_NOTE));
assert.match(script,/CHART_DIRECTION_NOTE/);assert.match(script,/Displayed ball: forward y=/);assert.match(script,/Score range:/);assert.match(script,/Training range:/);
const pcaGrid=Array.from({length:21},(_,j)=>Array.from({length:21},(_,i)=>{
 const z=F.pca.coordinateRanges.map(([lo,hi],k)=>lo+(hi-lo)*(k===0?i:j)/20),r=M.projectDecodedConfiguration(M.decodePCA(z,F.pca));assert.ok(r.ok);return r.ballPose.position;
}));
for(let j=0;j<21;j++)for(let i=1;i<21;i++)assert.ok(pcaGrid[j][i][1]>pcaGrid[j][i-1][1],'positive PC1 moves farther forward throughout this tested score rectangle');
for(let j=1;j<21;j++)for(let i=0;i<21;i++)assert.ok(pcaGrid[j][i][2]>pcaGrid[j-1][i][2],'positive PC2 raises the ball throughout this tested score rectangle');
const presentLow=M.encodeTaskCoordinates(0,-1),presentHigh=M.encodeTaskCoordinates(0,1);assert.ok(presentHigh.ballPose.position[2]>presentLow.ballPose.position[2]);
for(const target of [presentLow,presentHigh])assert.ok(M.solveGrasp({...target,initialQ:F.canonical.q}).ok);
const g=F.landscape;for(let j=0;j<g.height;j++)for(let i=1;i<g.width;i++)assert.ok(g.cells[j*g.width+i].ballPose.position[1]>g.cells[j*g.width+i-1].ballPose.position[1],'cost columns still increase physical +Y');
for(let j=1;j<g.height;j++)for(let i=0;i<g.width;i++)assert.ok(g.cells[j*g.width+i].ballPose.position[2]>g.cells[(j-1)*g.width+i].ballPose.position[2],'cost rows still increase physical +Z');
const rms=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]))/Math.sqrt(14);
for(const sample of [F.reconstructionExample.sample,F.outsideSkill]){const z=M.encodePCA(sample.q,F.pca),decoded=M.decodePCA(z,F.pca),projected=M.projectDecodedConfiguration(decoded);assert.ok(projected.ok);assert.ok(Number.isFinite(rms(decoded,sample.q)));assert.ok(Number.isFinite(rms(projected.q,sample.q)));}
assert.ok(Math.abs(M.reconstructAndScore(F.demonstrations.holdout.map(s=>s.q),F.pca).rmsDeg-F.scores.holdout.rmsDeg)<1e-12);
assert.ok(Math.abs(rms(M.decodePCA(M.encodePCA(F.outsideSkill.q,F.pca),F.pca),F.outsideSkill.q)-F.outsideSkill.reconstructionRmsRad)<1e-12);
assert.equal(M.projectDecodedConfiguration([NaN]).ok,false);
// A partial initialization failure restores the fallback and disables every panel control.
const failureAction=script.match(/catch\(error\)\{([\s\S]*?)\}\}\);/)[1];
const partialControls=[{tagName:'INPUT',disabled:false},{tagName:'BUTTON',disabled:false},{tagName:'SELECT',disabled:false}];
const fallbackImage={hidden:true},fallbackCaption={hidden:true},failedPanel={canvas:{hidden:false},status:{textContent:''},root:{querySelectorAll(selector){assert.equal(selector,'input,button,select');return partialControls;}}};
let loggedFailure=false;new Function('$','p','error','console',failureAction)((selector)=>selector==='.static-rig'?fallbackImage:fallbackCaption,failedPanel,new Error('Synthetic setup failure'),{error(){loggedFailure=true;}});
assert.ok(partialControls.every(control=>control.disabled));assert.equal(failedPanel.canvas.hidden,true);assert.equal(fallbackImage.hidden,false);assert.equal(fallbackCaption.hidden,false);assert.match(failedPanel.status.textContent,/Interactive panel unavailable/);assert.ok(loggedFailure);
// Execute the actual release handler after a rejected-target drawing, without a browser.
const releaseAction=script.match(/const mode=button\(t,'Release grasp',\(\)=>\{([\s\S]*?)\}\);\n const update/)[1];
const releasedPanel={q:[...F.canonical.q],ball:structuredClone(F.canonical.ballPose),status:{textContent:'Target not accepted'}};
const originalReleasedQ=[...releasedPanel.q],originalReleasedBall=structuredClone(releasedPanel.ball);let lastGhost={position:[0,.85,1.2]},releaseDraws=0;
new Function('locked','mode','free','unreachable','controls','reset','proxy','p','freeControls','deg','draw',releaseAction)(
 true,{}, {}, {}, [{input:{disabled:false}}],()=>assert.fail('Release must not reset'),{},releasedPanel,[{set(){}}],v=>v*180/Math.PI,
 (state,options)=>{assert.equal(state,releasedPanel);releaseDraws++;lastGhost=options?.ghost??null;}
);
assert.equal(releaseDraws,1);assert.equal(lastGhost,null);assert.deepEqual(releasedPanel.q,originalReleasedQ);assert.deepEqual(releasedPanel.ball,originalReleasedBall);assert.match(releasedPanel.status.textContent,/Released:/);
assert.match(script,/out\.textContent=formatSliderValue\(\+input\.value,step,unit\)/);
// Release-mode regression: even a synthetic click cannot run the unreachable-grasp action.
assert.match(script,/unreachable\.disabled=!locked/);
const action=script.match(/const unreachable=button\(t,'Try unreachable target',\(\)=>\{([^}]+)\}\)/)[1];
let changed=false;const values=[0,.43],controls=[null,{set(){changed=true;}}],update=()=>{changed=true;};
new Function('locked','values','controls','update',action)(false,values,controls,update);
assert.equal(changed,false);assert.equal(values[1],.43);
new Function('locked','values','controls','update',action)(true,values,controls,update);
assert.equal(changed,true);assert.equal(values[1],.85);
assert.match(script,/Both planners found the same route/);assert.match(script,/M\.solveGrasp/);assert.match(script,/M\.planGridPath/);assert.match(script,/M\.decodePCA/);assert.match(script,/M\.projectDecodedConfiguration/);
// Skill threads: every plotted value comes from the pinned fixture and PCA mechanics; the renderer stays finite in each preset view.
const threads=threadData(F,M),trajectoryCount=new Set([...F.demonstrations.train,...F.demonstrations.holdout].map(s=>s.trajectory)).size;
assert.equal(threads.threads.length,trajectoryCount);assert.equal(threads.threads.filter(t=>t.hold).length,new Set(F.demonstrations.holdout.map(s=>s.trajectory)).size);
for(const thread of threads.threads){assert.equal(thread.points.length,F.demonstrations.sampleMetadata.samplesPerTrajectory);thread.samples.forEach((sample,i)=>{assert.equal(sample.step,i);assert.deepEqual(thread.points[i].slice(0,2),M.encodePCA(sample.q,F.pca));assert.ok(thread.points[i][2]<threads.outside[2]/5,'demonstrations stay near the fitted plane');});}
assert.ok(Math.abs(rmsDegrees(threads.outside[2])-F.outsideSkill.reconstructionRmsRad*180/Math.PI)<1e-9);
assert.deepEqual(threads.outside.slice(0,2),F.outsideSkill.encoded);
for(const [yaw,el] of Object.values(VIEWS)){const seen=[];const threadContext=new Proxy({},{get:(_,k)=>k==='measureText'?t=>({width:t.length*7.2}):(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),k);seen.push(k);},set:()=>true});
 const hits=paintThreads(threadContext,640,420,threads,{yaw,el,scale:260,hot:0,current:threads.locate(F.canonical.q),designed:true});assert.equal(hits.length,trajectoryCount*F.demonstrations.sampleMetadata.samplesPerTrajectory+1);assert.ok(hits.every(h=>h.every(Number.isFinite)));assert.ok(seen.includes('quadraticCurveTo'));}
assert.match(script,/threadFigure\(threadData\(F,M\)/);assert.match(script,/figure\.setPose\(p\.q,mode==='task'\)/);assert.match(script,/sideBySide\(p\)/);
assert.equal(threads.designed.length,10);for(const points of threads.designed){assert.equal(points.length,17,'every designed Reach / Present line solves across its whole range');assert.ok(points.flat().every(Number.isFinite));}
console.log('PASS: manifolds source integrity, links, four static fallbacks, article concepts, actual 14-joint FK, renderer finiteness, rank, route and PCA fixture integration');
