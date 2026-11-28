import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as M from '../learning-machines/manifolds/mechanics.mjs';
import {FIXTURES as F} from '../learning-machines/manifolds/fixtures.mjs';
import {pcaDirectionNote,CHART_DIRECTION_NOTE} from '../learning-machines/manifolds/directions.mjs';
import {routeSVG,sameRoute} from '../learning-machines/manifolds/routes.mjs';
import {formatResidual,formatSliderValue} from '../learning-machines/manifolds/format.mjs';
import {project,depth,visibleBoxFaces,paintRobot} from '../learning-machines/manifolds/visuals.mjs';
import {threadData,paintThreads,projector,rmsDegrees,VIEWS} from '../learning-machines/manifolds/threads.mjs';
import * as Sheet from '../learning-machines/manifolds/sheet.mjs';
import * as Terrain from '../learning-machines/manifolds/terrain.mjs';
import {numberBoxHTML,fixed} from '../learning-machines/manifolds/numbers.mjs';
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
const css=readFileSync(resolve(base,'manifolds.css'),'utf8');assert.ok(!/(?:section|\.learning-page)>(?:p|ul)[^{]*\{[^}]*max-width/.test(css),'body text runs the same width as the diagrams');
assert.equal((page.match(/class="static-rig"/g)||[]).length,4);assert.equal((page.match(/data-reset=/g)||[]).length,4);
assert.ok(page.includes(pin.repository+'/tree/'+pin.commit+'/experiments/manifolds'));
assert.ok(page.includes(pin.repository+'/commit/'+pin.commit));
for(const match of page.matchAll(/(?:href|src)="([^"]+)"/g)){const url=match[1];if(/^(https?:|#|mailto:)/.test(url))continue;assert.ok(existsSync(resolve(base,url.split('?')[0])),url);}
assert.ok(readFileSync(resolve(root,'learning-machines/index.html'),'utf8').includes('an open notebook / 03'));
assert.ok(readFileSync(resolve(root,'learning-machines/attention-and-memory/index.html'),'utf8').includes('../manifolds/'));
assert.ok(F.landscape.exampleRoutes.lowCost.ok);assert.ok(F.scores.holdoutProjected.failed===0);
assert.ok(F.canonical.rank.rank===6);assert.ok(M.relativeGraspError(F.canonical.q).positionResidualM<.001);
// Direction correction is presentation-only: physical forward +Y and Reach stay unchanged.
assert.equal(pin.commit,'5713c037b08b013d0404e190c8bb48a06cd4ef18');
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
assert.ok(page.includes(pcaDirectionNote(F.pca)));assert.ok(page.includes(CHART_DIRECTION_NOTE));
assert.match(script,/Score range:/);assert.match(script,/Training range:/);
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
// The thread figure fits its canvas at every preset angle and size: sheet, outside pose and designed lines all stay inside.
for(const [W,H] of [[320,250],[507,355],[760,440]])for(const [yaw,el] of Object.values(VIEWS)){const P=projector(W,H,{yaw,el,scale:320},threads),{x0,x1,y0,y1}=threads.bounds;
 for(const point of [[x0,y0,0],[x1,y0,0],[x1,y1,0],[x0,y1,0],threads.outside,...threads.designed.flat()]){const [x,y]=P(point);assert.ok(x>=0&&x<=W&&y>=0&&y<=H,`thread figure stays inside a ${W}x${H} canvas`);}}
// Cost terrain: the pinned field drawn as ground. Height and shade both come from the same normalized cost, ground is drawn
// only for facets whose four corners are all valid, and the painter stays finite and inside its canvas at every yaw and size.
for(const field of ['torque','jointLimit','clearanceCost']){
 const mesh=Terrain.terrainMesh(F.landscape,field),cells=F.landscape.cells,valid=mesh.vertices.filter(v=>v.valid);
 assert.equal(mesh.vertices.length,cells.length);assert.equal(mesh.facets.length,(F.landscape.width-1)*(F.landscape.height-1));
 assert.equal(valid.length,cells.filter(c=>c.valid).length);
 for(const v of mesh.vertices){assert.equal(v.valid,cells[v.index].valid);if(v.valid){assert.ok(v.level>=0&&v.level<=1);assert.ok(Math.abs(v.point[2]-v.level*Terrain.RISE)<1e-12);}else assert.equal(v.level,null);}
 const byCost=[...valid].sort((a,b)=>cells[a.index].costs[field]-cells[b.index].costs[field]);
 for(let i=1;i<byCost.length;i++)assert.ok(byCost[i].point[2]>=byCost[i-1].point[2],'a costlier pose is never lower');
 assert.equal(Math.min(...valid.map(v=>v.level)),0);assert.equal(Math.max(...valid.map(v=>v.level)),1);
 for(const facet of mesh.facets)assert.equal(facet.solid,facet.corners.every(i=>cells[i].valid));
 const routes=[['shortest',true],['lowCost',false]].map(([key,dashed])=>({path:F.landscape.exampleRoutes[key].path,dashed}));
 for(const [W,H] of [[300,260],[466,373],[520,416]])for(let turn=0;turn<8;turn++){
  const yaw=Terrain.START_YAW+turn*Math.PI/4,P=Terrain.projector(W,H,yaw);
  for(const v of mesh.vertices){const [x,y]=P(v.point);assert.ok(x>=0&&x<=W&&y>=0&&y<=H,`terrain stays inside a ${W}x${H} canvas`);}
  const drawn=[];const terrainContext=new Proxy({},{get:(_,k)=>k==='measureText'?t=>({width:t.length*7.2}):(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),k);drawn.push(k);},set:()=>true});
  const points=Terrain.paintTerrain(terrainContext,W,H,yaw,mesh,{routes,start:F.landscape.start,goal:F.landscape.goal,inspect:routes[1].path[1],labels:['ball forward','ball height']});
  assert.equal(points.length,cells.length);assert.ok(drawn.includes('fill')&&drawn.includes('fillText'));
  const g=points[F.landscape.goal];assert.equal(Terrain.nearestCell(points,valid.map(v=>v.index),g[0],g[1]),F.landscape.goal);
  assert.equal(Terrain.nearestCell(points,routes[1].path,-900,-900),null);
 }
}
assert.match(script,/terrainFigure\(\{onGoal:/);assert.match(script,/M\.planGridPath\(grid,start,goal,\{field,weight:4\}\)/);
// Schematic sheets (top of the page): each map point lifts to one point on every sheet, drawn straight above it, each sheet reports that point in its own coordinates so
// no surface number repeats a map number, the sheets stay stacked above the map, and the painter stays finite and inside its canvas.
assert.ok(page.includes('id="sheet-figure"')&&page.includes('src="./sheet-static.svg"'));assert.match(script,/sheetFigure\(/);
assert.match(page,/One flat map for two curved surfaces/);assert.match(page,/takes six numbers, three per surface, and the map holds it in two/);assert.ok(page.indexOf('id="sheet-figure"')<page.indexOf('id="fourteen-numbers"'),'the concept figure comes before section 00');assert.ok(page.indexOf('id="sheet-figure"')<page.indexOf('Replace the two surfaces with the two arms'),'and before the introduction that builds on it');
assert.equal(Sheet.SHEETS.length,2);
const sheetSamples=[];for(let u=-1;u<=1;u+=.25)for(let v=-1;v<=1;v+=.25)sheetSamples.push([u,v]);
for(const target of sheetSamples){
 const path=Sheet.route(target),stack=Sheet.SHEETS.map((_,k)=>Sheet.lift(target,k));
 for(const lifted of stack)assert.deepEqual(lifted.slice(0,2),target,'the same point on every layer lies on one vertical line');
 assert.ok(Sheet.MAP_Z<stack[0][2]&&stack[0][2]<stack[1][2],'map, lower sheet and upper sheet never cross');
 Sheet.SHEETS.forEach((_,k)=>assert.equal(Sheet.own(target,k)[2],stack[k][2]));
 assert.deepEqual(path.map[0],[...Sheet.START]);assert.ok(Math.hypot(path.map.at(-1)[0]-target[0],path.map.at(-1)[1]-target[1])<1e-12);
 path.sheetLengths.forEach((length,k)=>assert.ok(length>=path.mapLength-1e-12,'lifting a straight map line cannot shorten it'));
}
{const {mapLength,sheetLengths}=Sheet.route(Sheet.TARGET);assert.ok(sheetLengths.every(n=>n>mapLength*1.03),'the default route visibly bends on both sheets');assert.ok(Math.abs(sheetLengths[0]-sheetLengths[1])>.01,'the two sheets bend it differently');}
for(const [W,H] of [[320,380],[507,588],[640,640]])for(let turn=0;turn<12;turn++){
 const yaw=Sheet.START_YAW+turn*Math.PI/6,P=Sheet.projector(W,H,yaw);
 for(const point of [...sheetSamples.flatMap(p=>Sheet.SHEETS.map((_,k)=>Sheet.lift(p,k))),...sheetSamples.map(([u,v])=>[u,v,Sheet.MAP_Z])]){const [x,y]=P(point);assert.ok(x>=0&&x<=W&&y>=0&&y<=H,`sheet figure stays inside a ${W}x${H} canvas`);}
 const drawn=[];const sheetContext=new Proxy({},{get:(_,k)=>k==='measureText'?t=>({width:t.length*7.2}):(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),k);drawn.push(k);},set:()=>true});
 const lines=Sheet.paintSheet(sheetContext,W,H,yaw,[...Sheet.TARGET],{mark:.4});assert.ok(drawn.includes('fill')&&drawn.includes('fillText'));
 // The painter returns the map line and one line per sheet; pointing at any of them finds the same place along the route.
 assert.equal(lines.length,1+Sheet.SHEETS.length);
 for(const points of lines){assert.equal(points.length,Sheet.PIECES+1);const a=points[12],b=points[13];assert.ok(Math.abs(Sheet.nearestOnRoute([points],(a[0]+b[0])/2,(a[1]+b[1])/2)-12.5/Sheet.PIECES)<1e-9);}
 assert.equal(Sheet.nearestOnRoute(lines,-500,-500),null);
}
// The boxes beside the figure: six numbers on the surfaces, none of them a copy of the two map numbers, and the page's static copy is current.
assert.equal(fixed(-.001),'0.00');assert.equal(fixed(1.239),'1.24');
{const [surfaces,map]=Sheet.numbersAt(Sheet.TARGET),six=surfaces.rows.flatMap(row=>row[1]),two=map.rows[0][1];
 assert.equal(six.length,6);assert.equal(two.length,2);assert.equal(new Set([...six,...two]).size,8,'all eight numbers differ');
 assert.ok(page.includes('<div class="numbers sheet-numbers">'+[surfaces,map].map(numberBoxHTML).join('')+'</div>'),'static number boxes match the default route');
 assert.notDeepEqual(Sheet.numbersAt(Sheet.TARGET,.5),Sheet.numbersAt(Sheet.TARGET,1));}
assert.equal(numberBoxHTML({caption:'a < b',rows:[['r',['1','2']]]}),'<table class="number-box"><caption>a &lt; b</caption><tbody><tr><th scope="row">r</th><td>1</td><td>2</td></tr></tbody></table>');
// Each robot panel shows its fourteen joint angles as a box with a second box beneath: the paw positions they produce in the free panel,
// and in the other three the smaller set of numbers that produced the pose.
assert.match(script,/joint angles in degrees · 14 numbers/);assert.equal((script.match(/p\.fewer=\(\)=>/g)||[]).length,4);
for(const caption of ['paw positions in metres','grasp controls · 8 numbers','position in the slice · 2 numbers','skill controls'])assert.ok(script.includes(caption),caption);
// Spinning never changes the drawn size: the scale depends on the canvas alone.
{const span=yaw=>{const P=Sheet.projector(640,640,yaw),a=P([0,0,Sheet.MAP_Z]),b=P([0,0,1]);return Math.hypot(a[0]-b[0],a[1]-b[1]);};assert.ok(Math.abs(span(0)-span(1.3))<1e-9);}
console.log('PASS: manifolds source integrity, links, four static fallbacks, article concepts, actual 14-joint FK, renderer finiteness, rank, route and PCA fixture integration, schematic sheet');
