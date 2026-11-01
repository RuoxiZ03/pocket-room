import { motionReduced } from './preferences.js';
import { ROOM, buildBedroom } from './room-layout.js';

// A tiny native 3D software renderer: independent meshes, flat lighting, 640×520 pixels.
// This is not an image with invisible links. The same projected model vertices define
// the visible objects and their accessible HTML hit regions at every display size.
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, n) => a.map(v => v * n);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm = a => mul(a, 1 / Math.hypot(...a));
const camera = ROOM.camera;
const forward = norm(sub(ROOM.target, camera));
const right = norm(cross(forward, [0, 1, 0]));
const up = cross(right, forward);
const light = norm([-3, 8, 5]);
const W = ROOM.width, H = ROOM.height;
// Orthographic projection: distance never changes furniture proportions.
function project(p) {
  const d = sub(p, camera);
  return [W/2 + dot(d,right)*ROOM.scale, H/2 + 20 - dot(d,up)*ROOM.scale, dot(d,forward)];
}
function shade(hex, amount, highlight, center) {
  const rgb=hex.match(/\w\w/g).map(c=>parseInt(c,16));
  // A local peach lamp warms nearby surfaces; daylight stays cream/blue elsewhere.
  const lamp=Math.max(0,1-Math.hypot(center[0]+2.35,center[1]-1.84,center[2]-.04)/2.0)*.25;
  const fairy=center[2]<2.15?Math.max(0,1-Math.hypot((center[0]+2.61)*1.4,center[1]-3.3)/.9)*.18:0;
  const warmth=lamp+fairy;
  return rgb.map((v,i)=>Math.round(Math.min(249,Math.max(0,
    v*amount*(1-warmth-highlight*.16)+[255,185,164][i]*warmth+[193,246,239][i]*highlight*.21))));
}
function convexHull(points) {
  const p = points.map(v => v.slice(0,2)).sort((a,b) => a[0]-b[0] || a[1]-b[1]);
  const turn = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const half = points => { const h=[]; for(const v of points){ while(h.length>1 && turn(h.at(-2),h.at(-1),v)<=0)h.pop(); h.push(v); } return h; };
  return [...half(p).slice(0,-1),...half([...p].reverse()).slice(0,-1)];
}
export function mountRoom(canvas, targets, onOpen) {
  const ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  let faces = [], hitVertices = { computer: [], diary: [] };
  let disposed = false, opening = false, frame = 0, last = 0, pressed = '', focused = '', hovered = '';
  let amounts = { computer: 0, diary: 0 };
  const photo = new Image();
  photo.src = 'assets/header.jpg';
  let photoPixels=null;
  photo.onload=()=>{
    const sample=document.createElement('canvas');sample.width=128;sample.height=80;
    const sampleContext=sample.getContext('2d');
    sampleContext.drawImage(photo,0,0,128,80);
    photoPixels=sampleContext.getImageData(0,0,128,80).data;
    schedule();
  };
  const surface = (points, color, group='', texture=false, layer=1) => {
    faces.push({ points, color, group, texture, layer });
    if (group) hitVertices[group].push(...points);
  };
  function box(center, size, color, bevel=0, group='', transform=p=>p) {
    const h=size.map(v=>v/2), r=Math.min(bevel,...h);
    const push = raw => {
      let pts = raw;
      const n = cross(sub(pts[1],pts[0]),sub(pts[2],pts[0]));
      if(dot(n,pts.reduce((a,p)=>add(a,p),[0,0,0]))<0) pts=[...pts].reverse();
      surface(pts.map(p=>transform(add(p,center))),color,group);
    };
    for(let axis=0;axis<3;axis++) for(const sign of [-1,1]) {
      const b=(axis+1)%3,c=(axis+2)%3;
      push([[-1,-1],[1,-1],[1,1],[-1,1]].map(([s,t])=>{const p=[0,0,0];p[axis]=sign*h[axis];p[b]=s*(h[b]-r);p[c]=t*(h[c]-r);return p;}));
    }
    if(!r)return;
    for(let a=0;a<3;a++)for(const sb of [-1,1])for(const sc of [-1,1]) {
      const b=(a+1)%3,c=(a+2)%3;
      push([[-1,0],[1,0],[1,1],[-1,1]].map(([sa, side])=>{const p=[0,0,0];p[a]=sa*(h[a]-r);p[b]=sb*(h[b]-(side?r:0));p[c]=sc*(h[c]-(side?0:r));return p;}));
    }
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]) push([[h[0],h[1]-r,h[2]-r],[h[0]-r,h[1],h[2]-r],[h[0]-r,h[1]-r,h[2]]].map(p=>[p[0]*x,p[1]*y,p[2]*z]));
  }
  function cylinder(center, rx, rz, height, color, segments=12) {
    const top=[],bottom=[];
    for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;top.push(add(center,[Math.cos(a)*rx,height/2,Math.sin(a)*rz]));bottom.push(add(center,[Math.cos(a)*rx,-height/2,Math.sin(a)*rz]));}
    surface([...top].reverse(),color);
    for(let i=0;i<segments;i++){const j=(i+1)%segments;surface([top[i],top[j],bottom[j],bottom[i]],color);}
  }
  function cone(center, bottomRadius, topRadius, height, color, segments=12) {
    const lower=[],upper=[];
    for(let i=0;i<segments;i++) {
      const a=i/segments*Math.PI*2;
      lower.push(add(center,[Math.cos(a)*bottomRadius,-height/2,Math.sin(a)*bottomRadius]));
      upper.push(add(center,[Math.cos(a)*topRadius,height/2,Math.sin(a)*topRadius]));
    }
    surface([...upper].reverse(),color);
    for(let i=0;i<segments;i++){const j=(i+1)%segments;surface([upper[i],upper[j],lower[j],lower[i]],color);}
  }
  function sphere(center,radius,color) {
    // An octahedron keeps plants and bulbs deliberately simple and toy-like.
    const ring=[[1,0,0],[0,0,1],[-1,0,0],[0,0,-1]].map(p=>add(center,mul(p,radius)));
    for(let i=0;i<4;i++) {
      const j=(i+1)%4;
      surface([ring[j],ring[i],add(center,[0,radius,0])],color);
      surface([ring[i],ring[j],add(center,[0,-radius,0])],color);
    }
  }
  const pixels=ctx.createImageData(W,H);
  const depthBuffer=new Float32Array(W*H);
  // Native software depth buffer. Furniture genuinely occludes other geometry;
  // painter-order polygons alone cannot reliably handle this dense layout.
  function triangle(a,b,c,color,uv=null) {
    const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(Math.abs(area)<.001)return;
    const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(W-1,Math.ceil(Math.max(a[0],b[0],c[0])));
    const y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(H-1,Math.ceil(Math.max(a[1],b[1],c[1])));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
      const px=x+.5,py=y+.5;
      const u=((b[0]-px)*(c[1]-py)-(b[1]-py)*(c[0]-px))/area;
      const v=((c[0]-px)*(a[1]-py)-(c[1]-py)*(a[0]-px))/area;
      const w=1-u-v;
      if(u<-.00001||v<-.00001||w<-.00001)continue;
      const z=u*a[2]+v*b[2]+w*c[2],index=y*W+x;
      if(z>=depthBuffer[index])continue;
      depthBuffer[index]=z;
      let rgb=color;
      if(uv && photoPixels) {
        const tx=Math.min(127,Math.max(0,Math.floor((u*uv[0][0]+v*uv[1][0]+w*uv[2][0])*127)));
        const ty=Math.min(79,Math.max(0,Math.floor((u*uv[0][1]+v*uv[1][1]+w*uv[2][1])*79)));
        const k=(ty*128+tx)*4;rgb=[photoPixels[k],photoPixels[k+1],photoPixels[k+2]];
      }
      const k=index*4;
      // Subtle fixed quantization grain, without random flicker.
      const grain=((x*13+y*7)%5-2)*.35;
      pixels.data[k]=rgb[0]+grain;pixels.data[k+1]=rgb[1]+grain;pixels.data[k+2]=rgb[2]+grain;pixels.data[k+3]=255;
    }
  }
  function draw() {
    faces=[];hitVertices={computer:[],diary:[]};
    buildBedroom({box,cylinder,surface,cone,sphere},amounts,pressed);
    depthBuffer.fill(Infinity);
    for(let i=0;i<pixels.data.length;i+=4) {
      pixels.data[i]=226;pixels.data[i+1]=239;pixels.data[i+2]=240;pixels.data[i+3]=255;
    }
    for(const f of faces) {
      let n=norm(cross(sub(f.points[1],f.points[0]),sub(f.points[2],f.points[0])));
      if(f.layer===0)n=mul(n,-1);
      const center=mul(f.points.reduce((a,p)=>add(a,p),[0,0,0]),1/f.points.length);
      if(dot(n,sub(camera,center))<=0)continue;
      const bright=.86+Math.max(0,dot(n,light))*.13;
      const color=shade(f.color,bright,f.group?amounts[f.group]:0,center);
      const p=f.points.map(project),uv=[[0,1],[1,1],[1,0],[0,0]];
      for(let i=1;i<p.length-1;i++)triangle(p[0],p[i],p[i+1],color,f.texture?[uv[0],uv[i],uv[i+1]]:null);
    }
    ctx.putImageData(pixels,0,0);
    // Project the object hull into percentage coordinates, so touch/keyboard buttons
    // stay exactly aligned with the rendered 3D models when the scene scales.
    for(const id of ['computer','diary']) {
      const projectedHull=convexHull(hitVertices[id].map(project));
      const rawX=projectedHull.map(p=>p[0]),rawY=projectedHull.map(p=>p[1]);
      const cx=(Math.min(...rawX)+Math.max(...rawX))/2,cy=(Math.min(...rawY)+Math.max(...rawY))/2;
      // Small screens keep a 44px touch target centered on the real subject.
      const touchScale=canvas.clientWidth<=720?Math.max(1,
        44*W/(canvas.clientWidth*(Math.max(...rawX)-Math.min(...rawX))),
        44*H/(canvas.clientHeight*(Math.max(...rawY)-Math.min(...rawY)))):1;
      const hull=projectedHull.map(p=>[cx+(p[0]-cx)*touchScale,cy+(p[1]-cy)*touchScale]);
      const xs=hull.map(p=>p[0]),ys=hull.map(p=>p[1]);
      const minX=Math.min(...xs)-2,minY=Math.min(...ys)-2,w=Math.max(...xs)-minX+2,h=Math.max(...ys)-minY+2;
      const target=targets[id];
      Object.assign(target.hit.style,{left:`${minX/W*100}%`,top:`${minY/H*100}%`,width:`${w/W*100}%`,height:`${h/H*100}%`,clipPath:`polygon(${hull.map(p=>`${(p[0]-minX)/w*100}% ${(p[1]-minY)/h*100}%`).join(',')})`});
      Object.assign(target.label.style,{left:`${(minX+w/2)/W*100}%`,top:`${(minY-8)/H*100}%`});
      target.label.hidden=!(focused===id || hovered===id || pressed===id);
      target.hit.dataset.highlighted=String(focused===id || hovered===id);
    }
  }
  function tick(now) {
    frame=0;if(disposed || !canvas.isConnected)return;
    const dt=Math.min(.1,(now-last)/1000||.016);last=now;
    let again=false;
    for(const id of ['computer','diary']) {
      const target=(focused===id||hovered===id||pressed===id)?1:0;
      const diff=target-amounts[id];
      amounts[id]=motionReduced()?target:Math.abs(diff)<.015?target:amounts[id]+diff*Math.min(1,dt*18);
      again ||= Math.abs(amounts[id]-target)>.005;
    }
    draw();if(again)schedule();
  }
  function schedule() { if(!disposed&&!frame)frame=requestAnimationFrame(tick); }
  for(const [id,target] of Object.entries(targets)) {
    target.hit.addEventListener('pointerenter',()=>{hovered=id;schedule();});
    target.hit.addEventListener('pointerleave',()=>{hovered='';if(!opening)pressed='';schedule();});
    target.hit.addEventListener('focus',()=>{focused=id;schedule();});
    target.hit.addEventListener('blur',()=>{focused='';schedule();});
    target.hit.addEventListener('pointerdown',()=>{pressed=id;schedule();});
    target.hit.addEventListener('pointerup',()=>{if(!opening)pressed='';schedule();});
    target.hit.addEventListener('pointercancel',()=>{pressed='';schedule();});
    target.hit.addEventListener('click',()=>{
      if(opening)return;
      opening=true;
      pressed=id;schedule();
      onOpen(id);
    });
  }
  const resizeObserver=new ResizeObserver(schedule);
  resizeObserver.observe(canvas);
  schedule();
  return () => { resizeObserver.disconnect();disposed=true;cancelAnimationFrame(frame);photo.onload=null; };
}
