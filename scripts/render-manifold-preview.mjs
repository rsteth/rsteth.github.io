// Reproducible original static fallback from the same pinned geometry as the live view.
import {readFileSync,writeFileSync} from 'node:fs';
import {forwardKinematics,RIG,encodePCA} from '../learning-machines/manifolds/mechanics.mjs';
import {FIXTURES as F} from '../learning-machines/manifolds/fixtures.mjs';
import {project,depth,visibleBoxFaces} from '../learning-machines/manifolds/visuals.mjs';
import {routeSVG} from '../learning-machines/manifolds/routes.mjs';
import {pcaDirectionNote,VIEW_DIRECTION_NOTE,CHART_DIRECTION_NOTE} from '../learning-machines/manifolds/directions.mjs';
import * as M from '../learning-machines/manifolds/mechanics.mjs';
import {threadData,paintThreads,VIEWS} from '../learning-machines/manifolds/threads.mjs';
function rig(q,caption){const fk=forwardKinematics(q),P=p=>project(p).map(x=>x.toFixed(2)).join(','),add=(a,b)=>a.map((v,i)=>v+b[i]);
let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 440" role="img" aria-labelledby="title desc"><title id="title">Fourteen joints, one volleyball</title><desc id="desc">Original isometric diagram generated from the exact three-dimensional joint pose used by this panel. Caption states whether the hands are free or rigidly grasping. Fixed-torso kinematic teaching model, not a real robot.</desc><rect width="640" height="440" fill="#edeadf"/>';
const line=(a,b,color,width=1)=>svg+=`<line x1="${project(a)[0]}" y1="${project(a)[1]}" x2="${project(b)[0]}" y2="${project(b)[1]}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
for(let k=-4;k<=4;k++){line([k*.15,-.25,0],[k*.15,.95,0],'#dcd8cd');line([-.6,k*.15+.35,0],[.6,k*.15+.35,0],'#dcd8cd');}
const poly=(ps,color)=>svg+=`<polygon points="${ps.map(P).join(' ')}" fill="${color}" stroke="#827f72"/>`;
function box(...args){visibleBoxFaces(...args).forEach(({points,fill})=>poly(points,fill));}
box(0,-.03,.58,.4,.18,.67);box(0,-.03,1.32,.17,.16,.17);
for(const arm of [fk.left,fk.right].sort((a,b)=>depth(a.position)-depth(b.position))){for(let j=1;j<arm.points.length;j++){line(arm.points[j-1],arm.points[j],'#716f62',19);line(arm.points[j-1],arm.points[j],'#c3c6b4',14);}for(const p of arm.points){const [x,y]=project(p);svg+=`<circle cx="${x}" cy="${y}" r="6" fill="#f5f2e8" stroke="#757466" stroke-width="2"/>`;}poly([[0,-.045,-.045],[0,.045,-.045],[0,.045,.045],[0,-.045,.045]].map(v=>add(arm.position,arm.rotation.map(r=>r.reduce((n,a,i)=>n+a*v[i],0)))),'#b9a586');for(let j=0;j<3;j++)line(arm.position,add(arm.position,arm.rotation.map(r=>r[j]*.09)),['#9c523d','#586e51','#536d83'][j],2);}
const ball=F.canonical.ballPose.position,[x,y]=project(ball);svg+=`<circle cx="${x}" cy="${y}" r="22" fill="#dbc791" stroke="#706957" stroke-width="1.5"/>`;
for(let a=0;a<3;a++){const points=[];for(let k=0;k<=64;k++){const v=[...ball];v[(a+1)%3]+=.11*Math.cos(k*Math.PI/32);v[(a+2)%3]+=.11*Math.sin(k*Math.PI/32);points.push(P(v));}svg+=`<polyline points="${points.join(' ')}" fill="none" stroke="${a?'#8f805f':'#9c523d'}" stroke-width="${a?1:2}"/>`;}
svg+='<g fill="#514e44" font-family="monospace" font-size="13"><text x="20" y="28">'+caption+'</text><text x="20" y="418">Synthetic 3D rig · fixed torso · rigid paws</text></g></svg>\n';
return svg;}
const save=(name,svg)=>writeFileSync(new URL('../learning-machines/manifolds/'+name+'.svg',import.meta.url),svg);
save('preview',rig(F.canonical.q,'14 JOINTS / 6 GRASP CONSTRAINTS / 8 LOCALLY'));
save('free-static',rig(RIG.initialQ,'14 INDEPENDENT JOINTS / BALL UNATTACHED'));
save('grasp-static',rig(F.canonical.q,'6 RELATIVE-POSE CONSTRAINTS / 8 LOCALLY'));

const shell=(title,desc)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 440" role="img"><title>${title}</title><desc>${desc}</desc><rect width="640" height="440" fill="#edeadf"/>`;
const text=(x,y,s,size=12)=>`<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" fill="#514e44">${s}</text>`;
let map=shell('A cost field on a two-dimensional slice','Actual fixed-load torque estimates sampled over ball forward distance and height. Hatched cells are invalid. Dashed shortest route and solid weighted least-cost route both traverse valid cells.');
map+='<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#d4d0c6"/><path d="M-1 1L5 7M2-2L8 4" stroke="#948e80"/></pattern></defs>';
const g=F.landscape,min=Math.min(...g.cells.filter(c=>c.valid).map(c=>c.costs.torque)),max=Math.max(...g.cells.filter(c=>c.valid).map(c=>c.costs.torque)),xy=i=>[55+(i%g.width+.5)*520/g.width,337-(Math.floor(i/g.width)+.5)*270/g.height];
for(const cell of g.cells){const [x,y]=xy(cell.index),v=cell.valid?(cell.costs.torque-min)/(max-min):0;map+=`<rect x="${x-260/g.width}" y="${y-135/g.height}" width="${520/g.width+.1}" height="${270/g.height+.1}" fill="${cell.valid?`rgb(${228-72*v},${221-116*v},${194-117*v})`:'url(#hatch)'}"/>`;}
for(const [route,isShortest] of [[g.exampleRoutes.shortest,true],[g.exampleRoutes.lowCost,false]])map+=routeSVG(route.path.map(xy),{shortest:isShortest});
for(const [i,label] of [[g.start,'S'],[g.goal,'G']]){const [x,y]=xy(i);map+=`<circle cx="${x}" cy="${y}" r="10" fill="#fff9ef"/>`+text(x-4,y+4,label);}
map+=text(20,28,'2D SLICE / BALL-LOAD TORQUE ESTIMATE')+text(55,53,`height z: ${g.axes.z[0].toFixed(2)}–${g.axes.z.at(-1).toFixed(2)} m`)+text(55,361,`forward y: ${g.axes.y[0].toFixed(2)}–${g.axes.y.at(-1).toFixed(2)} m`)+text(20,390,`${min.toFixed(3)}–${max.toFixed(3)} N·m · equal load split · quasistatic`)+text(20,415,'Dashed: shortest · solid: cost-aware · hatch: invalid')+'</svg>';save('landscape-static',map);
// The live thread renderer, drawn into a context that records SVG instead of pixels.
function svgContext(){
 let out='',d='',tf='';const n=v=>+v.toFixed(2),esc=t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;'),alpha=()=>c.globalAlpha<1?` opacity="${c.globalAlpha}"`:'';
 const c={globalAlpha:1,strokeStyle:'#000',fillStyle:'#000',lineWidth:1,textAlign:'left',dash:[],
  clearRect(){},setLineDash(v){c.dash=v;},beginPath(){d='';},closePath(){d+='Z';},save(){},restore(){tf='';},
  moveTo(x,y){d+=`M${n(x)} ${n(y)}`;},lineTo(x,y){d+=`L${n(x)} ${n(y)}`;},quadraticCurveTo(a,b,x,y){d+=`Q${n(a)} ${n(b)} ${n(x)} ${n(y)}`;},
  arc(x,y,r){d+=`M${n(x-r)} ${n(y)}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0`;},
  stroke(){out+=`<path d="${d}" fill="none" stroke="${c.strokeStyle}" stroke-width="${c.lineWidth}" stroke-linecap="round" stroke-linejoin="round"${c.dash.length?` stroke-dasharray="${c.dash.join(' ')}"`:''}${tf?` transform="${tf}"`:''}${alpha()}/>`;},
  fill(){out+=`<path d="${d}" fill="${c.fillStyle}"${alpha()}/>`;},
  measureText:t=>({width:t.length*7.2}),translate(x,y){tf+=`translate(${n(x)} ${n(y)})`;},rotate(a){tf+=` rotate(${n(a*180/Math.PI)})`;},
  fillText(t,x,y){out+=`<text x="${n(x)}" y="${n(y+4)}" font-family="monospace" font-size="12" fill="${c.fillStyle}" text-anchor="${{left:'start',center:'middle',right:'end'}[c.textAlign]}"${tf?` transform="${tf}"`:''}${alpha()}>${esc(t)}</text>`;},
  svg:()=>out};
 return c;
}
let skill=shell('Handoffs as threads on a fitted two-coordinate plane','Each synthetic handoff is one thread plotted on the two PCA coordinates fitted to the training trajectories. Height is joint-space distance from that fitted plane at the same scale. The threads lie almost flat; an outside-family sideward example sits far above the plane.');
const threads=threadData(F,M),recorder=svgContext();paintThreads(recorder,640,340,threads,{yaw:VIEWS.quarter[0],el:VIEWS.quarter[1],scale:225,hot:null,current:null});
skill+=text(20,28,'HANDOFFS AS THREADS / A LIMITED SKILL FAMILY')+`<g transform="translate(0 30)">${recorder.svg()}</g>`+text(20,390,`${F.demonstrations.train.length} training + ${F.demonstrations.holdout.length} held-out poses · ${(F.scores.train.explainedVariance*100).toFixed(3)}% training variance`)+text(20,415,`Height = distance from the fitted plane · outside-family RMS ${(F.outsideSkill.reconstructionRmsRad*180/Math.PI).toFixed(3)}°`)+'</svg>';save('skill-static',skill);

// Device-resolution HTML carries every numeric caption when an external SVG shrinks on mobile.
const fixed=(x,n=3)=>x.toFixed(n),freeFK=forwardKinematics(RIG.initialQ);
const captions=[
 `<p><strong>Free configuration.</strong> Two arms × ${RIG.jointNames.length} independent joints = ${RIG.initialQ.length} joint coordinates. The ball is unattached.</p><p>Left paw (x, y, z): ${freeFK.left.position.map(x=>fixed(x)).join(', ')} m. Right paw: ${freeFK.right.position.map(x=>fixed(x)).join(', ')} m. Coloured wrist axes show orientation.</p>`,
 `<p><strong>Canonical rigid grasp.</strong> Numerical relative-pose Jacobian rank ${F.canonical.rank.rank}; ${F.canonical.q.length} joint coordinates minus ${F.canonical.rank.rank} independent constraints leaves ${F.canonical.q.length-F.canonical.rank.rank} dimensions locally.</p><p>Relative-hand residual: ${fixed(F.canonical.grasp.positionResidualM*1000,6)} mm translation and ${fixed(F.canonical.grasp.angularResidualRad*180/Math.PI,6)}° rotation.</p>`,
 `<p><strong>Sampled ball-load torque field.</strong> Horizontal: forward y, ${fixed(g.axes.y[0],2)} to ${fixed(g.axes.y.at(-1),2)} m. Vertical: height z, ${fixed(g.axes.z[0],2)} to ${fixed(g.axes.z.at(-1),2)} m. Fixed x=${fixed(g.slice.x,2)} m; orientation and posture preferences fixed. ${CHART_DIRECTION_NOTE}</p><p>${g.cells.filter(c=>c.valid).length} of ${g.cells.length} samples are valid. Field range ${fixed(min)}–${fixed(max)} N·m; quasistatic, equal load split. Dashed = shortest route (${fixed(g.exampleRoutes.shortest.distanceM)} m); solid = cost-aware route (${fixed(g.exampleRoutes.lowCost.distanceM)} m). S = start; G = goal; hatch = invalid sample.</p>`,
 `<p><strong>Training-fitted PCA.</strong> Each thread is one synthetic handoff plotted on PC1 and PC2; height is its joint-space distance from the fitted plane at the same scale. Solid = training; dashed = held out. ${F.demonstrations.train.length} synthetic training poses and ${F.demonstrations.holdout.length} held-out poses. Two components explain ${fixed(F.scores.train.explainedVariance*100)}% of training variance.</p><p>Holdout joint-angle RMS: ${fixed(F.scores.holdout.rmsDeg)}° before projection and ${fixed(F.scores.holdoutProjected.rmsDeg)}° after projection (${F.scores.holdoutProjected.failed} failures). Outside-family raw reconstruction RMS: ${fixed(F.outsideSkill.reconstructionRmsRad*180/Math.PI)}°. Reach / Present are hand-designed coordinates, not names for these fitted components.</p><p>${pcaDirectionNote(F.pca)}</p>`
];
const pageURL=new URL('../learning-machines/manifolds/index.html',import.meta.url);let html=readFileSync(pageURL,'utf8');
for(let i=0;i<4;i++){const caption=`<div class="static-caption" data-static-caption="${i}">${captions[i]}</div>`;const existing=new RegExp(`<div class="static-caption" data-static-caption="${i}">[\\s\\S]*?<\\/div>`);if(existing.test(html))html=html.replace(existing,caption);else{const panelStart=html.indexOf(`id="panel-${i}"`),position=html.indexOf('</canvas></div>',panelStart)+'</canvas></div>'.length;html=html.slice(0,position)+caption+html.slice(position);}}
const viewNote=`<p class="small view-direction-note">${VIEW_DIRECTION_NOTE}</p>`;if(html.includes('class="small view-direction-note"'))html=html.replace(/<p class="small view-direction-note">[\s\S]*?<\/p>/,viewNote);else html=html.replace('<section id="fourteen-numbers"',viewNote+'<section id="fourteen-numbers"');
writeFileSync(pageURL,html);
