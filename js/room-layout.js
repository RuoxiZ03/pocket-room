// Fixed isometric bedroom layout. Decorative meshes have no interaction group.
// Only computer and diary emit projected hit vertices in the renderer.
export const ROOM = { width: 640, height: 520, camera: [8,9.2,8], target: [0,1.2,0], scale: 64 };
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const yaw=(p,a)=>[p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];
const roll=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a),p[2]];
const cream='eee7d8', ivory='f5eddd', wood='c6b5a5', blue='8b9dab', pink='d8a3b2';

export function buildBedroom({box,cylinder,surface,cone,sphere},amounts,pressed) {
  const floor=(x,z,rx,rz,color,y=.01,n=20)=>{
    const points=Array.from({length:n},(_,i)=>[x+Math.cos(i/n*Math.PI*2)*rx,y,z+Math.sin(i/n*Math.PI*2)*rz]);
    surface(points,color,'',false,0);
  };
  const shadow=(x,z,rx,rz)=>{
    floor(x,z,rx,rz,'7b8993',.012);
    floor(x,z,rx*.83,rz*.83,'74848e',.014);
    floor(x,z,rx*.64,rz*.66,'6c7e89',.016);
  };
  // A smaller continuous room; floorboards are simple geometry, not a photo map.
  // Small wall quads let the lamp tint a local area instead of the entire wall.
  for(let y=0;y<3.65;y+=.25) {
    const top=Math.min(3.65,y+.25);
    for(let x=-2.8;x<2.8;x+=.25) {
      const end=Math.min(2.8,x+.25);
      surface([[x,y,-2.5],[x,top,-2.5],[end,top,-2.5],[end,y,-2.5]],'f2e8db','',false,0);
    }
    for(let z=-2.5;z<2.35;z+=.25) {
      const end=Math.min(2.35,z+.25);
      surface([[-2.8,y,end],[-2.8,top,end],[-2.8,top,z],[-2.8,y,z]],'eee6dd','',false,0);
    }
  }
  surface([[-2.8,0,-2.5],[2.8,0,-2.5],[2.8,0,2.35],[-2.8,0,2.35]],'81929d','',false,0);
  for(let z=-2.45;z<2.35;z+=.43)box([0,.004,z],[5.6,.006,.014],'778b97');
  box([0,.09,-2.45],[5.6,.18,.1],'b4bfbe',.02);
  box([-2.75,.09,-.075],[.1,.18,4.85],'b4bfbe',.02);
  box([0,3.67,-2.48],[5.65,.09,.12],'a2adb0',.02);
  box([-2.78,3.67,-.075],[.12,.09,4.95],'a2adb0',.02);
  for(const y of [.7,1.4,2.1,2.8,3.5])box([0,y,-2.483],[5.6,.015,.022],'dbd4c9');
  // Broad rug under the chair, diary table and bed foot; small decorative bands.
  box([-.55,.026,1.05],[3.65,.045,2.25],'e7cbd1',.05);
  for(let z=.15;z<2.1;z+=.4)box([-.55,.053,z],[3.48,.008,.09],z<1?'d9aebd':'e0b8c5');
  for(let x=-2.25;x<1.2;x+=.14)box([x,.032,2.22],[.045,.035,.15],'ead9d7');
  shadow(-1.75,0,1.01,.7);shadow(.85,-1.05,1.04,1.23);shadow(2.15,.8,.5,.42);
  // Bed: a low cream frame, simple pink bedding and two discrete pillows.
  for(const x of [.02,1.62])for(const z of [-2.03,.05])box([x,.23,z],[.13,.43,.13],wood,.025);
  box([.82,.48,-1.0],[1.96,.35,2.5],cream,.08);
  box([.82,.78,-1.0],[1.9,.31,2.42],ivory,.12);
  box([.82,1.03,-2.17],[2.02,1.04,.18],'c6b3ac',.06);
  box([.82,1.07,-2.055],[1.84,.68,.07],'e0c8c5',.04);
  box([.82,.98,-.64],[1.92,.13,1.62],'e6bdc8',.06);
  box([.82,1.055,.0],[1.95,.08,.45],blue,.025);
  box([1.79,.83,.0],[.075,.43,.45],'8e9da9',.02);
  for(const x of [.36,1.24])box([x,1.01,-1.72],[.75,.2,.48],'f1d6db',.09);
  box([1.2,1.12,-1.68],[.025,.015,.33],'dfbdc9',.006);
  // Window and curtain folds occupy the wall above the desk.
  surface([[-2.76,1.75,.2],[-2.76,3.18,.2],[-2.76,3.18,-1.55],[-2.76,1.75,-1.55]],'bbd8e2','',false,0);
  for(const y of [1.7,2.45,3.23])box([-2.69,y,-.675],[.13,.07,1.9],'94aaa9',.02);
  for(const z of [-1.6,-.67,.25])box([-2.69,2.46,z],[.13,1.6,.07],'94aaa9',.02);
  box([-2.57,3.34,-.675],[.08,.08,2.35],'b2a4a7',.02);
  for(const z0 of [-1.79,.38])for(let i=0;i<3;i++)box([-2.53+(i%2)*.045,2.45,z0+i*.1],[.07,1.76,.11],i%2?'c3bfce':'d5ccd6',.025);
  // L-shaped living/work area at left; monitor remains independently clickable.
  box([-1.8,1.28,-.17],[1.82,.17,1.34],cream,.07);
  for(const x of [-2.52,-1.08])for(const z of [-.68,.31])box([x,.62,z],[.1,1.21,.1],'cbd0c8',.025);
  box([-2.35,.66,-.15],[.42,1.09,.98],'d3d7cd',.035);
  for(const y of [.38,.72,1.04])box([-2.35,y,.35],[.16,.035,.04],'98a8a9',.01);
  // Compact low-poly chair: distinct back, seat, armrests, pedestal and feet.
  const chair=p=>add(yaw(p,-.12),[-1.6,0,1.02]);
  box([0,.76,0],[.72,.15,.7],'c0b5c5',.09,'',chair);
  box([0,1.18,.29],[.72,.84,.17],'8293a2',.08,'',chair);
  box([0,1.2,.185],[.59,.64,.045],'b7bdc8',.035,'',chair);
  for(const x of [-.36,.36])box([x,.95,0],[.065,.33,.06],'a0aeb1',.02,'',chair);
  for(const x of [-.36,.36])box([x,1.10,-.02],[.08,.07,.5],'c0c9c6',.02,'',chair);
  cylinder([-1.6,.42,1.02],.07,.07,.6,'aab9bb');
  for(const angle of [0,1.26,2.51,3.77,5.03]){
    const p=add([-1.6,.12,1.02],[Math.cos(angle)*.29,0,Math.sin(angle)*.29]);
    box(p,[.18,.07,.13],'8799a7',.02);
  }
  // Diary table in the reachable foreground; no other objects overlap its book.
  shadow(-.1,1.53,.62,.44);
  cylinder([-.1,.57,1.53],.7,.48,.12,cream,16);
  for(const x of [-.53,.33])for(const z of [1.28,1.78])box([x,.28,z],[.09,.52,.09],'c9c6ba',.02);
  // Tall shelf close to bed: shelves, books, records and a keepsake toy.
  box([2.19,1.27,.53],[.86,2.5,.07],'c5cfca',.015);
  for(const x of [1.76,2.62])box([x,1.27,.82],[.075,2.55,.67],cream,.02);
  for(const y of [.08,.70,1.32,1.94,2.55])box([2.19,y,.82],[.9,.075,.7],cream,.02);
  const bookColors=['95b1c3','b7b6cb','d7a9b8','91aaa1','c2ac9a'];
  for(const [row,y] of [[0,.32],[1,.94],[2,2.16]])for(let i=0;i<(row===1?3:5);i++){
    const h=.28+(i%3)*.055;
    box([1.9+i*.135,y,.81],[.095,h,.42],bookColors[(row+i)%5],.006);
    box([1.9+i*.135,y+h*.2,1.028],[.07,.018,.006],'eae5d8');
  }
  box([2.2,1.57,.8],[.55,.35,.45],'c2b9c6',.025);
  box([2.2,1.57,1.035],[.18,.035,.018],'ecded8',.006);
  // Display records above the bed, in a compact wall shelf.
  box([.52,3.0,-2.18],[2.55,.11,.42],cream,.025);
  for(let i=0;i<8;i++)box([-.51+i*.135,3.28,-2.18],[.08,.43+(i%2)*.08,.3],bookColors[i%5],.005);
  box([.84,3.27,-2.17],[.45,.45,.06],'b7c2cc',.008);
  for(const [radius,color,z] of [[.19,'627182',-2.13],[.061,'ddb3c2',-2.125]]) {
    surface(Array.from({length:20},(_,i)=>[.84+Math.cos(i/20*Math.PI*2)*radius,3.27+Math.sin(i/20*Math.PI*2)*radius,z]),color);
  }
  box([1.4,3.17,-2.17],[.22,.26,.22],'b4a8c8',.025);
  sphere([1.4,3.37,-2.17],.12,'d8c4ce');
  // Original swan photograph, flanked by small color-block posters and sticky notes.
  box([.70,2.24,-2.385],[1.24,.82,.09],'a7b4b8',.025);
  surface([[.14,1.89,-2.331],[1.26,1.89,-2.331],[1.26,2.59,-2.331],[.14,2.59,-2.331]],'f2e8d6','',true);
  box([1.78,2.29,-2.385],[.5,.72,.055],'809baa',.012);
  box([1.78,2.38,-2.35],[.3,.24,.01],'dfb0c2',.005);
  box([1.78,2.10,-2.35],[.34,.09,.01],'ede4c9');
  for(let i=0;i<3;i++)box([-1.13+i*.22,1.88+(i%2)*.12,-2.39],[.17,.2,.035],['e6cb9f','c1cfbc','d8baca'][i],.004);
  // Warm local lamp, mug and neatly grouped desk accessories.
  cylinder([-2.35,1.41,.04],.18,.15,.05,'bd9fae');
  box([-2.35,1.68,.04],[.045,.52,.045],'a6a6ad',.012);
  cone([-2.35,2.0,.04],.25,.13,.3,'dfb1c1',12);
  sphere([-2.35,1.84,.04],.075,'ffe2b6');
  cylinder([-1.06,1.45,.15],.095,.095,.2,'b7c8cf');
  cylinder([-1.06,1.556,.15],.073,.073,.008,'897663');
  box([-1.06,1.47,.26],[.11,.1,.04],'b7c8cf',.02);
  // Plant lives on the shelf, not scattered over the room.
  cone([2.2,2.73,.8],.16,.12,.27,'d5b0ba',10);
  for(const [x,y,z] of [[-.12,.22,0],[.12,.28,.04],[0,.38,-.05],[.08,.18,-.1]]){
    box([2.2+x*.5,2.88+y*.45,.8+z*.5],[.025,y,.025],'719286',.004);
    sphere([2.2+x,2.92+y,.8+z],.12,'8caa91');
  }
  // Pink light string: static bulbs and simple cords. No extra clickable hints.
  for(let i=0;i<10;i++){
    const z=-2.15+i*.43,y=3.37-(i%3)*.09;
    box([-2.61,y+.07,z],[.018,.18,.018],'b9a5ad');
    sphere([-2.61,y-.045,z],.06,'ffdfcf');
  }
  // Independent interactive computer group, transformed with all its parts.
  const ct=p=>add(p,[0,pressed==='computer'?-.025:amounts.computer*.02,0]);
  box([-1.7,1.47,-.37],[.48,.2,.45],'c9d6d0',.04,'computer',ct);
  box([-1.7,1.98,-.38],[1.06,.9,.71],'e9e8d8',.11,'computer',ct);
  box([-1.7,2.02,-.009],[.84,.62,.035],'456d7a',.055,'computer',ct);
  box([-1.7,2.02,.017],[.72,.51,.022],'8bbbc8',.02,'computer',ct);
  box([-1.65,2.02,.032],[.47,.34,.012],'e7e4d7',0,'computer',ct);
  box([-1.65,2.17,.041],[.47,.045,.012],'789cba',0,'computer',ct);
  box([-1.51,1.65,-.007],[.06,.022,.018],'a8bd9c',.006,'computer',ct);
  box([-1.7,1.415,.31],[1.0,.07,.34],'becac8',.025,'computer',ct);
  for(let row=0;row<3;row++)for(let key=0;key<9;key++)box([-2.12+key*.103,1.463,.21+row*.09],[.075,.02,.055],ivory,.004,'computer',ct);
  box([-1.02,1.43,.38],[.18,.1,.27],'e4dfd1',.05,'computer',ct);
  // Diary moved onto its own front table; hinge, paper and hit hull stay together.
  const dt=p=>add(yaw(p,.18),[-.1,.68+(pressed==='diary'?-.02:amounts.diary*.045),1.53]);
  box([0,0,0],[.64,.045,.66],'b37d98',.018,'diary',dt);
  box([.01,.035,0],[.59,.045,.61],ivory,.009,'diary',dt);
  const angle=pressed==='diary'?.24:amounts.diary*.09;
  const cover=p=>dt(add(roll(add(p,[.32,-.07,0]),angle),[-.32,.07,0]));
  box([0,.07,0],[.65,.04,.68],pink,.018,'diary',cover);
  box([-.25,.093,0],[.035,.008,.62],'b7869f',.003,'diary',cover);
  box([.29,.102,0],[.12,.027,.12],'e8c4cc',.01,'diary',cover);
}
