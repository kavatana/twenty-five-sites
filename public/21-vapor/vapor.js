/* ============================================================
   VAPOR — Kepler-1649c relay weather console
   Hand-rolled canvas weather sim + glass instrument UI.
   No external libraries. Three modules: utils, Scene (backdrop),
   WindMap (mini instrument), and the UI/state controller.
   ============================================================ */
(function(){
  'use strict';

  /* ---------------------------------------------------------
     Utilities
  --------------------------------------------------------- */
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const lerp=(a,b,t)=>a+(b-a)*t;

  function hexToRgb(hex){
    const h=hex.replace('#','');
    const n=parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h,16);
    return [(n>>16)&255,(n>>8)&255,n&255];
  }
  function mixRgb(hexA,hexB,t){
    const a=hexToRgb(hexA), b=hexToRgb(hexB);
    return [Math.round(lerp(a[0],b[0],t)),Math.round(lerp(a[1],b[1],t)),Math.round(lerp(a[2],b[2],t))];
  }
  const rgbCss=(rgb,a)=>`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

  // Hand-rolled cubic-bezier easing (Newton-Raphson solve), the
  // same math the browser uses for CSS cubic-bezier() timing
  // functions — used to drive canvas/JS values so they share the
  // exact easing feel as the CSS-transitioned DOM.
  function cubicBezier(x1,y1,x2,y2){
    const A=(a1,a2)=>1-3*a2+3*a1, B=(a1,a2)=>3*a2-6*a1, C=a1=>3*a1;
    const calcX=t=>((A(x1,x2)*t+B(x1,x2))*t+C(x1))*t;
    const calcY=t=>((A(y1,y2)*t+B(y1,y2))*t+C(y1))*t;
    const slopeX=t=>3*A(x1,x2)*t*t+2*B(x1,x2)*t+C(x1);
    function tFor(x){
      let t=x;
      for(let i=0;i<6;i++){
        const s=slopeX(t);
        if(Math.abs(s)<1e-6) break;
        t-=(calcX(t)-x)/s;
      }
      return clamp(t,0,1);
    }
    return x=>(x<=0?0:x>=1?1:calcY(tFor(x)));
  }
  const easeMorph=cubicBezier(.4,0,.2,1);
  const easeOut=cubicBezier(.16,1,.3,1);

  // Tiny seeded PRNG (mulberry32) — stable particle fields across reloads.
  function mulberry32(seed){
    return function(){
      seed|=0; seed=seed+0x6D2B79F5|0;
      let t=Math.imul(seed^seed>>>15,1|seed);
      t=t+Math.imul(t^t>>>7,61|t)^t;
      return ((t^t>>>14)>>>0)/4294967296;
    };
  }
  // Cheap layered-sine "noise" field — no gradient-noise library needed.
  function noise2(x,y,t){
    return (Math.sin(x*0.9+t*0.6)+Math.sin(y*1.3-t*0.4)+Math.sin((x+y)*0.5+t*0.8))/3;
  }

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     Mode data — the single source of truth for the console
  --------------------------------------------------------- */
  const MODES = {
    rain:{
      label:'Rain', tag:'STEADY RAIN', temp:8,
      accent:'#6FA8DC', accent2:'#4C7FB0',
      note:'Convective cells drifting east across the basin. Streak angle holding at twelve degrees; ground saturation climbing.',
      wind:'14 km/h · SSE', pressure:'98.2 kPa', thirdLabel:'HUMIDITY', third:'88%',
      windTag:'SURFACE VECTORS — LAMINAR',
      forecast:[9,7,6,8,10,9,11],
      composition:[
        {name:'Nitrogen (N₂)',value:68},
        {name:'Carbon Dioxide',value:15},
        {name:'Argon',value:8},
        {name:'H₂O Vapor',value:9,accent:true}
      ],
      compositionNote:'Trace-gas ratio nominal for a saturated troposphere; spectrometer confidence high.',
      wind_:{angle:100,speed:1.0,swirl:.15}
    },
    snow:{
      label:'Snow', tag:'DRIFT SNOW', temp:-14,
      accent:'#CFE6F5', accent2:'#9FC9E8',
      note:'Fine crystals falling under low shear. Accumulation line advancing on schedule; visibility holding steady.',
      wind:'6 km/h · NW', pressure:'101.6 kPa', thirdLabel:'HUMIDITY', third:'62%',
      windTag:'SURFACE VECTORS — CALM',
      forecast:[-12,-15,-17,-14,-11,-13,-16],
      composition:[
        {name:'Nitrogen (N₂)',value:74},
        {name:'Carbon Dioxide',value:17},
        {name:'Argon',value:7},
        {name:'Ice Crystals',value:2,accent:true}
      ],
      compositionNote:'Dry cold-trap chemistry; ice-crystal seeding suppresses vapor further overnight.',
      wind_:{angle:150,speed:.4,swirl:.05}
    },
    aurora:{
      label:'Aurora', tag:'AURORAL VEIL', temp:-6,
      accent:'#48E5C2', accent2:'#9D6FF0',
      note:'Charged particles meeting thin upper atmosphere. Ribbon curtain steady overhead; no surface precipitation.',
      wind:'3 km/h · VAR', pressure:'100.1 kPa', thirdLabel:'IONIZATION', third:'74%',
      windTag:'SURFACE VECTORS — VARIABLE',
      forecast:[-4,-7,-6,-9,-5,-3,-6],
      composition:[
        {name:'Nitrogen (N₂)',value:70},
        {name:'Carbon Dioxide',value:14},
        {name:'Argon',value:8},
        {name:'Ionized O',value:8,accent:true}
      ],
      compositionNote:'Ionized oxygen fraction elevated by particle precipitation in the thermosphere.',
      wind_:{angle:200,speed:.3,swirl:.9}
    },
    heat:{
      label:'Heat', tag:'THERMAL SURGE', temp:46,
      accent:'#F0885C', accent2:'#C9563A',
      note:'Surface superheating past comfort threshold. Haze bands visible from orbit; thermals building over the flat.',
      wind:'21 km/h · W, gusting', pressure:'96.4 kPa', thirdLabel:'PARTICULATE', third:'31 µg/m³',
      windTag:'SURFACE VECTORS — GUSTING',
      forecast:[44,47,49,45,42,46,48],
      composition:[
        {name:'Nitrogen (N₂)',value:66},
        {name:'Carbon Dioxide',value:18},
        {name:'Argon',value:9},
        {name:'Particulate',value:7,accent:true}
      ],
      compositionNote:'Particulate loading rising with convection; spectrometer flags haze aerosols.',
      wind_:{angle:260,speed:1.4,swirl:.35}
    }
  };
  const MODE_KEYS=['rain','snow','aurora','heat'];

  function miniIconSVG(mode){
    switch(mode){
      case 'rain': return '<svg viewBox="0 0 24 24" class="mini-rain" aria-hidden="true"><path d="M12 3c3.2 4 5.2 7.1 5.2 9.6a5.2 5.2 0 1 1-10.4 0C6.8 10.1 8.8 7 12 3Z" fill="currentColor" opacity=".9"/><path class="mini-drip" d="M9 19v2.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path class="mini-drip d2" d="M13.6 20v2.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
      case 'snow': return '<svg viewBox="0 0 24 24" class="mini-snow" aria-hidden="true"><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 2v20M4 7l16 10M20 7 4 17"/></g></svg>';
      case 'aurora': return '<svg viewBox="0 0 24 24" class="mini-aurora" aria-hidden="true"><path d="M2 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M2 10c2-2.4 4-2.4 6 0s4 2.4 6 0 4-2.4 6 0" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".55"/></svg>';
      case 'heat': return '<svg viewBox="0 0 24 24" class="mini-heat" aria-hidden="true"><circle cx="12" cy="11" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2.6v2.4M12 20v2.4M4.2 11h-2.4M22.2 11h-2.4M6 5l1.6 1.6M18 5l-1.6 1.6"/></g></svg>';
    }
    return '';
  }

  /* ---------------------------------------------------------
     Scene — the full-bleed backdrop weather simulation
  --------------------------------------------------------- */
  class Scene{
    constructor(canvas){
      this.canvas=canvas;
      this.ctx=canvas.getContext('2d');
      this.rand=mulberry32(1337);
      this.time=0;
      this.resize();
      this.buildParticles();
      this.lightning={alpha:0,startedAt:-999,nextAt:2600+this.rand()*2200,bolt:[]};
      this.snowAccum=0;
      this.heatBuffer=document.createElement('canvas');
      this.heatCtx=this.heatBuffer.getContext('2d');
    }
    resize(){
      const dpr=this.dpr=Math.min(2,window.devicePixelRatio||1);
      const rect=this.canvas.getBoundingClientRect();
      this.w=Math.max(1,Math.round(rect.width));
      this.h=Math.max(1,Math.round(rect.height));
      this.canvas.width=Math.round(this.w*dpr);
      this.canvas.height=Math.round(this.h*dpr);
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
      this.small=this.w<720;
      this.groundY=this.h*0.86;
    }
    buildParticles(){
      const r=this.rand;
      const rainN=this.small?90:190;
      this.rain=[]; for(let i=0;i<rainN;i++) this.rain.push({x:r(),y:r(),len:16+r()*26,speed:.58+r()*.55,op:.26+r()*.5});
      this.splashes=[];

      const snowN=this.small?70:130;
      this.snow=[]; for(let i=0;i<snowN;i++){
        const layer=i%3;
        this.snow.push({
          layer, x:r(), y:r(),
          size:layer===0?(1+r()*1.2):layer===1?(2+r()*1.6):(3+r()*2.2),
          speed:(layer===0?.02:layer===1?.05:.09)+r()*.03,
          sway:.3+r()*.7, phase:r()*Math.PI*2
        });
      }

      const starN=this.small?55:100;
      this.stars=[]; for(let i=0;i<starN;i++) this.stars.push({x:r(),y:r()*0.7,size:.6+r()*1.4,phase:r()*Math.PI*2,freq:.4+r()*.8});
      this.ribbonSeed=[r()*100,r()*100,r()*100];

      const emberN=this.small?26:46;
      this.embers=[]; for(let i=0;i<emberN;i++) this.embers.push({x:r(),y:r(),size:1.2+r()*2.2,speed:.03+r()*.05,sway:r()*Math.PI*2,phase:r()*Math.PI*2,flicker:.5+r()*.5});
      this.hazeBands=[{x:.1,y:.28,rx:.42,ry:.09,speed:.006},{x:.6,y:.4,rx:.5,ry:.11,speed:-.004}];
    }

    updateLightning(now,rainAlpha){
      const L=this.lightning;
      const elapsedSince = now-L.startedAt;
      L.alpha = elapsedSince<900 ? Math.exp(-elapsedSince*0.009)+0.55*Math.exp(-Math.pow((elapsedSince-130)*0.045,2)) : 0;
      if(rainAlpha>0.55 && now>=L.nextAt){
        L.startedAt=now;
        L.nextAt=now+3400+this.rand()*5200;
        const startX=this.w*(0.15+this.rand()*0.7);
        let x=startX,y=0; const pts=[[x,y]];
        while(y<this.h*0.62){
          x+= (this.rand()-0.5)*46;
          y+= 26+this.rand()*30;
          pts.push([x,y]);
        }
        L.bolt=pts;
      } else if(rainAlpha<=0.55){
        L.nextAt=Math.max(L.nextAt, now+400);
      }
    }

    drawRain(alpha,now,dt){
      if(alpha<0.004) return;
      const ctx=this.ctx,w=this.w,h=this.h;
      const ANGLE=12*Math.PI/180;
      ctx.save(); ctx.globalAlpha=alpha; ctx.lineCap='round';
      for(const d of this.rain){
        d.y += d.speed*dt;
        if(d.y>1.04){ d.y=-0.04; d.x=Math.random(); }
        const x=d.x*w, y=d.y*h;
        const dx=Math.sin(ANGLE)*d.len, dy=Math.cos(ANGLE)*d.len;
        ctx.strokeStyle=`rgba(198,216,238,${d.op})`;
        ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+dx,y+dy); ctx.stroke();
        if(y>this.groundY-4 && y<this.groundY+18 && Math.random()<0.02*alpha){
          this.splashes.push({x:x/w,y:this.groundY/h,age:0,max:.5+Math.random()*.3});
        }
      }
      for(let i=this.splashes.length-1;i>=0;i--){
        const s=this.splashes[i]; s.age+=dt;
        if(s.age>s.max){ this.splashes.splice(i,1); continue; }
        const t=s.age/s.max, rad=lerp(2,18,t), op=(1-t)*0.45*alpha;
        ctx.strokeStyle=`rgba(210,226,244,${op})`;
        ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.ellipse(s.x*w,s.y*h,rad,rad*0.32,0,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
    }

    drawSnow(alpha,now,dt){
      if(alpha<0.004) return;
      const ctx=this.ctx,w=this.w,h=this.h;
      ctx.save(); ctx.globalAlpha=alpha;
      const target = alpha>0.5 ? (this.small?16:26) : 0;
      this.snowAccum += (target-this.snowAccum)*Math.min(1,dt*0.18);
      for(const f of this.snow){
        f.y += f.speed*dt;
        if(f.y>1.05){ f.y=-0.05; f.x=Math.random(); }
        const op=(f.layer===0?.35:f.layer===1?.6:.85);
        const sx=f.x*w + Math.sin(now*0.00035*f.sway+f.phase)*(f.layer+1)*5;
        const sy=f.y*h;
        ctx.fillStyle=`rgba(233,242,251,${op})`;
        ctx.beginPath(); ctx.arc(sx,sy,f.size,0,Math.PI*2); ctx.fill();
      }
      if(this.snowAccum>0.4){
        const baseY=this.groundY - this.snowAccum;
        ctx.beginPath();
        ctx.moveTo(0,h);
        ctx.lineTo(0,baseY);
        const step=22;
        for(let x=0;x<=w+step;x+=step){
          const y=baseY+Math.sin(x*0.045+this.ribbonSeed[0])*2.4;
          ctx.lineTo(x,y);
        }
        ctx.lineTo(w,h); ctx.closePath();
        ctx.fillStyle='rgba(207,230,245,.16)';
        ctx.fill();
        ctx.beginPath();
        for(let x=0;x<=w+step;x+=step){
          const y=baseY+Math.sin(x*0.045+this.ribbonSeed[0])*2.4;
          x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.strokeStyle='rgba(233,244,252,.5)'; ctx.lineWidth=1.4; ctx.stroke();
      }
      ctx.restore();
    }

    drawAurora(alpha,now,dt){
      if(alpha<0.004) return;
      const ctx=this.ctx,w=this.w,h=this.h,t=now*0.001;
      ctx.save(); ctx.globalAlpha=alpha;
      for(const s of this.stars){
        const tw=0.35+0.65*Math.abs(Math.sin(t*s.freq+s.phase));
        ctx.fillStyle=`rgba(226,230,255,${tw*0.85})`;
        ctx.fillRect(s.x*w,s.y*h,s.size,s.size);
      }
      const ribbons=[
        {baseY:.26,amp1:34,amp2:14,f1:.0022,f2:.005,sp1:.35,sp2:.6,thick:70,c1:'72,229,194',c2:'157,111,240'},
        {baseY:.34,amp1:26,amp2:18,f1:.0018,f2:.004,sp1:-.28,sp2:.5,thick:56,c1:'72,229,194',c2:'157,111,240'},
        {baseY:.20,amp1:20,amp2:10,f1:.0026,f2:.006,sp1:.42,sp2:-.4,thick:44,c1:'157,111,240',c2:'72,229,194'}
      ];
      ctx.globalCompositeOperation='lighter';
      ribbons.forEach((rb,i)=>{
        const seed=this.ribbonSeed[i];
        const step=this.small?24:14;
        const top=[],bot=[];
        for(let x=-step;x<=w+step;x+=step){
          const y=rb.baseY*h + Math.sin(x*rb.f1+t*rb.sp1+seed)*rb.amp1 + Math.sin(x*rb.f2+t*rb.sp2+seed*1.7)*rb.amp2;
          top.push([x,y]); bot.push([x,y+rb.thick]);
        }
        const grad=ctx.createLinearGradient(0,rb.baseY*h-rb.thick*.3,0,rb.baseY*h+rb.thick*1.1);
        grad.addColorStop(0,`rgba(${rb.c1},0)`);
        grad.addColorStop(.45,`rgba(${rb.c1},.30)`);
        grad.addColorStop(.75,`rgba(${rb.c2},.20)`);
        grad.addColorStop(1,`rgba(${rb.c2},0)`);
        ctx.beginPath();
        ctx.moveTo(top[0][0],top[0][1]);
        for(const p of top) ctx.lineTo(p[0],p[1]);
        for(let i2=bot.length-1;i2>=0;i2--) ctx.lineTo(bot[i2][0],bot[i2][1]);
        ctx.closePath();
        ctx.fillStyle=grad;
        ctx.fill();
      });
      ctx.globalCompositeOperation='source-over';
      ctx.restore();
    }

    drawHeat(alpha,now,dt){
      if(alpha<0.004) return;
      const ctx=this.ctx,w=this.w,h=this.h,t=now*0.001;
      ctx.save(); ctx.globalAlpha=alpha;

      for(const b of this.hazeBands){
        const bx=((b.x*w + now*b.speed) % (w+w*b.rx*2)) - w*b.rx;
        const grad=ctx.createRadialGradient(bx,b.y*h,4,bx,b.y*h,w*b.rx);
        grad.addColorStop(0,'rgba(240,136,92,.10)');
        grad.addColorStop(1,'rgba(240,136,92,0)');
        ctx.fillStyle=grad;
        ctx.fillRect(0,0,w,h);
      }

      // rising shimmer: tiny procedurally-drawn buffer, blitted back
      // one thin row at a time with a horizontal sine offset that
      // grows toward the ground and scrolls upward over time.
      const rows=this.small?18:32;
      const hazeTop=h*0.40, hazeH=h*0.48;
      const maxAmp=this.small?6:11;
      if(this.heatBuffer.width!==Math.round(w) || this.heatBuffer.height!==rows){
        this.heatBuffer.width=Math.max(1,Math.round(w));
        this.heatBuffer.height=rows;
      }
      const hctx=this.heatCtx;
      const bw=this.heatBuffer.width;
      hctx.clearRect(0,0,bw,rows);
      const skyGrad=hctx.createLinearGradient(0,0,0,rows);
      skyGrad.addColorStop(0,'rgba(240,136,92,.05)');
      skyGrad.addColorStop(1,'rgba(240,136,92,.22)');
      hctx.fillStyle=skyGrad;
      hctx.fillRect(0,0,bw,rows);
      hctx.strokeStyle='rgba(20,14,20,.28)';
      hctx.lineWidth=Math.max(1,rows*0.05);
      hctx.beginPath();
      const ridgeStep=Math.max(6,Math.round(bw/48));
      for(let x=-ridgeStep;x<=bw+ridgeStep;x+=ridgeStep){
        const ry=rows*0.78+Math.sin(x*0.02+this.ribbonSeed[1])*rows*0.06+Math.sin(x*0.008+this.ribbonSeed[2])*rows*0.1;
        x===-ridgeStep?hctx.moveTo(x,ry):hctx.lineTo(x,ry);
      }
      hctx.stroke();
      hctx.fillStyle='rgba(255,201,166,.10)';
      for(let i=0;i<5;i++){
        const sx=(i/5)*bw + (bw/10);
        hctx.fillRect(sx,0,Math.max(2,bw*0.01),rows);
      }

      const sliceH=hazeH/rows;
      for(let row=0;row<rows;row++){
        const rowT=row/rows;
        const amp=maxAmp*Math.pow(rowT,1.5);
        const offset=amp*Math.sin(row*0.5 - t*2.1 + this.ribbonSeed[0]);
        const destY=hazeTop+row*sliceH;
        const sx=clamp(offset,-maxAmp,maxAmp);
        ctx.drawImage(this.heatBuffer,0,row,bw,1, sx,destY,w,sliceH+1);
      }

      for(const e of this.embers){
        e.y -= e.speed*dt;
        if(e.y<-0.05){ e.y=1.02; e.x=Math.random(); }
        const ex=e.x*w+Math.sin(now*0.0012+e.sway)*10;
        const ey=e.y*h;
        const fl=0.5+0.5*Math.sin(now*0.004+e.phase);
        ctx.fillStyle=`rgba(240,136,92,${0.12*fl})`;
        ctx.beginPath(); ctx.arc(ex,ey,e.size*3,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=`rgba(255,196,158,${0.75*fl})`;
        ctx.beginPath(); ctx.arc(ex,ey,e.size,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    drawMode(name,alpha,now,dt){
      if(alpha<0.004) return;
      if(name==='rain') this.drawRain(alpha,now,dt);
      else if(name==='snow') this.drawSnow(alpha,now,dt);
      else if(name==='aurora') this.drawAurora(alpha,now,dt);
      else if(name==='heat') this.drawHeat(alpha,now,dt);
    }

    draw(blend,now,dt){
      const ctx=this.ctx,w=this.w,h=this.h;
      ctx.clearRect(0,0,w,h);
      const sky=ctx.createLinearGradient(0,0,0,h);
      sky.addColorStop(0,'#1A1B3A');
      sky.addColorStop(1,'#2E2E5C');
      ctx.fillStyle=sky; ctx.fillRect(0,0,w,h);

      const accentMix=mixRgb(MODES[blend.from].accent,MODES[blend.to].accent,blend.t);
      const glow=ctx.createRadialGradient(w*0.68,h*0.22,10,w*0.68,h*0.22,w*0.62);
      glow.addColorStop(0,rgbCss(accentMix,0.17));
      glow.addColorStop(1,rgbCss(accentMix,0));
      ctx.fillStyle=glow; ctx.fillRect(0,0,w,h);

      this.drawMode(blend.from,1-blend.t,now,dt);
      this.drawMode(blend.to,blend.t,now,dt);

      const rainAlpha=(blend.from==='rain'?1-blend.t:0)+(blend.to==='rain'?blend.t:0);
      this.updateLightning(now,rainAlpha);
      if(this.lightning.alpha>0.003){
        ctx.save();
        ctx.globalAlpha=this.lightning.alpha*rainAlpha;
        ctx.fillStyle='rgba(232,238,255,.7)';
        ctx.fillRect(0,0,w,h);
        if(now-this.lightning.startedAt<160 && this.lightning.bolt.length){
          ctx.strokeStyle='rgba(255,255,255,.9)';
          ctx.lineWidth=2;
          ctx.beginPath();
          this.lightning.bolt.forEach((p,i)=> i===0?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]));
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    drawStatic(mode){
      this.draw({from:mode,to:mode,t:1},performance.now(),0.016);
    }
  }

  /* ---------------------------------------------------------
     WindMap — small instrument canvas: flowing vector field
  --------------------------------------------------------- */
  class WindMap{
    constructor(canvas){
      this.canvas=canvas;
      this.ctx=canvas.getContext('2d');
      this.rand=mulberry32(77);
      this.resize();
      const cols=7,rows=4;
      this.arrows=[];
      for(let gy=0;gy<rows;gy++) for(let gx=0;gx<cols;gx++){
        this.arrows.push({gx:(gx+0.5)/cols,gy:(gy+0.5)/rows,seed:this.rand()*100});
      }
      this.tracers=[];
      const tn=8;
      for(let i=0;i<tn;i++) this.tracers.push({x:this.rand(),y:this.rand(),trail:[]});
    }
    resize(){
      const dpr=this.dpr=Math.min(2,window.devicePixelRatio||1);
      const rect=this.canvas.getBoundingClientRect();
      this.w=Math.max(1,Math.round(rect.width));
      this.h=Math.max(1,Math.round(rect.height));
      this.canvas.width=Math.round(this.w*dpr);
      this.canvas.height=Math.round(this.h*dpr);
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    angleAt(gx,gy,now,windP){
      const n=noise2(gx*3+windP.seedOff,gy*3,now*0.00035*(0.4+windP.speed));
      return (windP.angle*Math.PI/180) + n*windP.swirl*1.6;
    }
    draw(blend,now,dt,accentRgb){
      const ctx=this.ctx,w=this.w,h=this.h;
      ctx.clearRect(0,0,w,h);
      const wf=MODES[blend.from].wind_, wt=MODES[blend.to].wind_;
      const windP={
        angle:lerp(wf.angle,wt.angle,blend.t),
        speed:lerp(wf.speed,wt.speed,blend.t),
        swirl:lerp(wf.swirl,wt.swirl,blend.t),
        seedOff:12
      };
      ctx.save();

      // soft instrument vignette, replaces flat black backing
      const vg=ctx.createRadialGradient(w*0.5,h*0.42,Math.min(w,h)*0.06,w*0.5,h*0.5,Math.max(w,h)*0.75);
      vg.addColorStop(0,rgbCss(accentRgb,.08));
      vg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);

      // minimal HUD crosshair (elegant instrument, not a spreadsheet grid)
      ctx.strokeStyle=rgbCss(accentRgb,.12);
      ctx.lineWidth=1;
      ctx.setLineDash([1,4]);
      ctx.beginPath(); ctx.moveTo(w/2,h*0.1); ctx.lineTo(w/2,h*0.9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w*0.06,h/2); ctx.lineTo(w*0.94,h/2); ctx.stroke();
      ctx.setLineDash([]);

      // corner brackets, radar-instrument framing
      const m=Math.min(w,h)*0.14;
      ctx.strokeStyle=rgbCss(accentRgb,.32);
      ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(7,7+m); ctx.lineTo(7,7); ctx.lineTo(7+m,7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w-7-m,7); ctx.lineTo(w-7,7); ctx.lineTo(w-7,7+m); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7,h-7-m); ctx.lineTo(7,h-7); ctx.lineTo(7+m,h-7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w-7-m,h-7); ctx.lineTo(w-7,h-7); ctx.lineTo(w-7,h-7-m); ctx.stroke();

      for(const a of this.arrows){
        const ang=this.angleAt(a.gx,a.gy,now,windP)+a.seed*0.0001;
        const speedNorm=0.55+0.45*Math.sin(now*0.0006*windP.speed+a.seed);
        const len=lerp(7,17,speedNorm)*(0.6+windP.speed*0.5);
        const cx=a.gx*w, cy=a.gy*h;
        const dx=Math.cos(ang)*len, dy=Math.sin(ang)*len;
        ctx.strokeStyle=rgbCss(accentRgb,.68);
        ctx.lineWidth=1.7; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(cx-dx*0.5,cy-dy*0.5); ctx.lineTo(cx+dx*0.5,cy+dy*0.5); ctx.stroke();
        const hx=cx+dx*0.5, hy=cy+dy*0.5;
        const ha=ang+Math.PI*0.82, hb=ang-Math.PI*0.82;
        ctx.beginPath();
        ctx.moveTo(hx,hy);
        ctx.lineTo(hx+Math.cos(ha)*3.6,hy+Math.sin(ha)*3.6);
        ctx.moveTo(hx,hy);
        ctx.lineTo(hx+Math.cos(hb)*3.6,hy+Math.sin(hb)*3.6);
        ctx.stroke();
      }

      for(const tr of this.tracers){
        const ang=this.angleAt(tr.x,tr.y,now,windP);
        const spd=(0.03+windP.speed*0.05)*dt;
        tr.x+=Math.cos(ang)*spd; tr.y+=Math.sin(ang)*spd*0.6;
        if(tr.x<-0.05||tr.x>1.05||tr.y<-0.05||tr.y>1.05){
          tr.x=this.rand(); tr.y=this.rand(); tr.trail=[];
        }
        tr.trail.push([tr.x,tr.y]);
        if(tr.trail.length>10) tr.trail.shift();
        ctx.beginPath();
        tr.trail.forEach((p,i)=>{
          const px=p[0]*w, py=p[1]*h;
          i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
        });
        ctx.strokeStyle=rgbCss(accentRgb,.55);
        ctx.lineWidth=1.2;
        ctx.stroke();
        const head=tr.trail[tr.trail.length-1];
        ctx.fillStyle=rgbCss(accentRgb,.95);
        ctx.beginPath(); ctx.arc(head[0]*w,head[1]*h,1.8,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
    drawStatic(mode,accentRgb){
      this.draw({from:mode,to:mode,t:1},performance.now(),0.016,accentRgb);
    }
  }

  /* ---------------------------------------------------------
     Telemetry — small oscilloscope-style live waveform strip
     that fills the current-conditions panel's lower register
     with a continuously-animating instrument reading (no
     history buffer needed: an analytic sine+noise field scrolls
     with time, so it never needs seeding or resetting on resize).
  --------------------------------------------------------- */
  class Telemetry{
    constructor(canvas){
      this.canvas=canvas;
      this.ctx=canvas.getContext('2d');
      this.resize();
    }
    resize(){
      const dpr=this.dpr=Math.min(2,window.devicePixelRatio||1);
      const rect=this.canvas.getBoundingClientRect();
      this.w=Math.max(1,Math.round(rect.width));
      this.h=Math.max(1,Math.round(rect.height));
      this.canvas.width=Math.round(this.w*dpr);
      this.canvas.height=Math.round(this.h*dpr);
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    draw(now,accentRgb,speedNorm){
      const ctx=this.ctx,w=this.w,h=this.h,t=now*0.001;
      ctx.clearRect(0,0,w,h);
      const midY=h*0.56;

      ctx.strokeStyle='rgba(255,255,255,.09)';
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(0,midY); ctx.lineTo(w,midY); ctx.stroke();

      const amp=h*0.30*(0.45+0.55*clamp(speedNorm||0.6,0,1.4));
      ctx.beginPath();
      const step=Math.max(2,w/110);
      for(let x=0;x<=w;x+=step){
        const xn=x/w;
        const n=noise2(xn*3.2,0,t*0.7+xn*2.1);
        const y=midY - Math.sin(xn*13+t*1.7)*amp*0.42*n - Math.sin(xn*4+t*-0.9)*amp*0.3;
        x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.strokeStyle=rgbCss(accentRgb,.9);
      ctx.lineWidth=1.6; ctx.lineJoin='round';
      ctx.shadowColor=rgbCss(accentRgb,.65);
      ctx.shadowBlur=6;
      ctx.stroke();
      ctx.shadowBlur=0;

      const sweepX=((t*66)%(w+140))-70;
      const sw=ctx.createLinearGradient(sweepX-70,0,sweepX+70,0);
      sw.addColorStop(0,'rgba(255,255,255,0)');
      sw.addColorStop(.5,'rgba(255,255,255,.12)');
      sw.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=sw;
      ctx.fillRect(0,0,w,h);
    }
    drawStatic(accentRgb){ this.draw(performance.now(),accentRgb,0.6); }
  }

  /* ---------------------------------------------------------
     UI / state controller
  --------------------------------------------------------- */
  const $=(sel,ctx)=>(ctx||document).querySelector(sel);
  const $$=(sel,ctx)=>Array.prototype.slice.call((ctx||document).querySelectorAll(sel));

  const dial=$('.dial'), thumb=$('.dial-thumb');
  const dialButtons=$$('.dial button');
  const tempNumEl=$('#tempNum');
  const glyphs={ rain:$('.g-rain'), snow:$('.g-snow'), aurora:$('.g-aurora'), heat:$('.g-heat') };
  const tagEl=$('#conditionTag');
  const noteEl=$('#conditionNote');
  const windDD=$('#statWind'), pressureDD=$('#statPressure');
  const thirdDT=$('#statThirdLabel'), thirdDD=$('#statThird');
  const forecastCards=$$('.fc-card');
  const trendBlock=$('.trend-block');
  const trendPoly=$('#trendPoly'), trendArea=$('#trendArea'), trendDot=$('#trendDot');
  const donutSegs={
    n2:$('#segN2'), co2:$('#segCO2'), ar:$('#segAr'), accent:$('#segAccent')
  };
  const legendEls={
    n2:$('#legN2'), co2:$('#legCO2'), ar:$('#legAr'), accent:$('#legAccent')
  };
  const compositionNoteEl=$('#compositionNote');
  const windTagEl=$('#windTag');
  const windCanvasEl=$('#windMap');
  const sceneCanvasEl=$('#scene');
  const telemetryCanvasEl=$('#telemetryCanvas');
  const trendRangeEl=$('#trendRange');
  const clockEl=$('#solClock');
  const root=document.documentElement;

  const C=2*Math.PI*50; // donut circumference, r=50

  const Transition={
    active:false, from:'rain', to:'rain', start:0, dur:1200,
    begin(from,to){ this.active=true; this.from=from; this.to=to; this.start=performance.now(); },
    snap(mode){ this.active=false; this.from=mode; this.to=mode; },
    sample(now){
      if(!this.active) return {from:this.to,to:this.to,t:1};
      const p=clamp((now-this.start)/this.dur,0,1);
      const e=easeMorph(p);
      if(p>=1){ this.active=false; this.from=this.to; return {from:this.to,to:this.to,t:1}; }
      return {from:this.from,to:this.to,t:e};
    }
  };

  function setAccentVars(mode){
    const m=MODES[mode];
    const rgb=hexToRgb(m.accent), rgb2=hexToRgb(m.accent2);
    root.style.setProperty('--accent',m.accent);
    root.style.setProperty('--accent-rgb',rgb.join(','));
    root.style.setProperty('--accent2',m.accent2);
    root.style.setProperty('--accent2-rgb',rgb2.join(','));
  }

  function swapText(el,value,delay){
    if(!el) return;
    if(prefersReduced){ el.textContent=value; return; }
    window.setTimeout(()=>{
      el.classList.add('swap');
      window.setTimeout(()=>{
        el.textContent=value;
        requestAnimationFrame(()=>el.classList.remove('swap'));
      },220);
    },delay||0);
  }

  function countTo(el,target,duration){
    if(!el) return;
    if(prefersReduced){ el.textContent=String(Math.round(target)); return; }
    const start=parseFloat(el.textContent)||0;
    const t0=performance.now();
    function tick(now){
      const p=clamp((now-t0)/duration,0,1);
      const e=easeMorph(p);
      const val=lerp(start,target,e);
      el.textContent=String(Math.round(val));
      if(p<1) requestAnimationFrame(tick);
      else el.textContent=String(Math.round(target));
    }
    requestAnimationFrame(tick);
  }

  function updateDial(mode,instant){
    dialButtons.forEach(b=>b.setAttribute('aria-selected',String(b.dataset.mode===mode)));
    const btn=dialButtons.find(b=>b.dataset.mode===mode);
    if(!btn||!thumb) return;
    const dr=dial.getBoundingClientRect(), br=btn.getBoundingClientRect();
    const x=br.left-dr.left-4, wpx=br.width;
    if(instant) thumb.classList.add('no-anim');
    thumb.style.transform=`translateX(${x}px)`;
    thumb.style.width=wpx+'px';
    if(instant){
      void thumb.offsetWidth;
      thumb.classList.remove('no-anim');
    }
  }

  function updateGlyph(mode){
    Object.keys(glyphs).forEach(k=>{
      if(glyphs[k]) glyphs[k].classList.toggle('active',k===mode);
    });
  }

  function updateCurrent(mode,instant){
    const m=MODES[mode];
    swapText(tagEl,m.tag,0);
    swapText(noteEl,m.note,60);
    swapText(windDD,m.wind,90);
    swapText(pressureDD,m.pressure,120);
    swapText(thirdDT,m.thirdLabel,60);
    swapText(thirdDD,m.third,150);
    if(instant) tempNumEl.textContent=String(m.temp);
    else countTo(tempNumEl,m.temp,1200);
    updateTrend(mode,instant);
  }

  function updateTrend(mode,instant){
    const vals=MODES[mode].forecast;
    const W=280,H=70,pad=10;
    const min=Math.min.apply(null,vals), max=Math.max.apply(null,vals);
    const range=(max-min)||1;
    const pts=vals.map((v,i)=>{
      const x=pad+i*((W-2*pad)/(vals.length-1));
      const y=pad+(1-(v-min)/range)*(H-2*pad);
      return [x,y];
    });
    const apply=()=>{
      if(trendPoly) trendPoly.setAttribute('points',pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' '));
      if(trendArea){
        const last=pts[pts.length-1], first=pts[0];
        const d='M'+pts.map((p,i)=>(i===0?'':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+
          ` L${last[0].toFixed(1)},${(H-pad).toFixed(1)} L${first[0].toFixed(1)},${(H-pad).toFixed(1)} Z`;
        trendArea.setAttribute('d',d);
      }
      if(trendDot){
        const last=pts[pts.length-1];
        trendDot.setAttribute('cx',last[0].toFixed(1));
        trendDot.setAttribute('cy',last[1].toFixed(1));
      }
      if(trendRangeEl) trendRangeEl.textContent=`${min}° – ${max}°`;
    };
    if(instant||prefersReduced||!trendBlock){ apply(); return; }
    trendBlock.classList.add('swap');
    window.setTimeout(()=>{ apply(); requestAnimationFrame(()=>trendBlock.classList.remove('swap')); },200);
  }

  function updateForecast(mode,instant){
    const m=MODES[mode];
    forecastCards.forEach((card,i)=>{
      const iconEl=card.querySelector('.fc-icon');
      const tempEl=card.querySelector('.fc-temp');
      const temp=m.forecast[i];
      const apply=()=>{
        if(iconEl) iconEl.innerHTML=miniIconSVG(mode);
        if(tempEl) tempEl.textContent=temp+'°';
      };
      if(instant || prefersReduced){ apply(); return; }
      window.setTimeout(()=>{
        card.classList.add('swap');
        window.setTimeout(()=>{
          apply();
          requestAnimationFrame(()=>card.classList.remove('swap'));
        },200);
      },i*35);
    });
  }

  function updateComposition(mode,instant){
    const m=MODES[mode];
    swapText(compositionNoteEl,m.compositionNote,80);
    const order=['n2','co2','ar','accent'];
    let cum=0;
    order.forEach((key,i)=>{
      const seg=m.composition[i];
      const len=(seg.value/100)*C;
      const offset=-(cum/100)*C;
      cum+=seg.value;
      const circle=donutSegs[key];
      if(circle){
        circle.style.strokeDasharray=`${len.toFixed(2)} ${C.toFixed(2)}`;
        circle.style.strokeDashoffset=`${offset.toFixed(2)}`;
      }
      const legend=legendEls[key];
      if(legend){
        const nameEl=legend.querySelector('.leg-name');
        const valEl=legend.querySelector('.leg-val');
        const apply=()=>{
          if(nameEl) nameEl.textContent=seg.name;
          if(valEl) valEl.textContent=seg.value+'%';
        };
        if(instant||prefersReduced) apply();
        else{
          window.setTimeout(()=>{
            legend.classList.add('swap');
            window.setTimeout(()=>{ apply(); requestAnimationFrame(()=>legend.classList.remove('swap')); },200);
          },i*40);
        }
      }
    });
  }

  function updateWindTag(mode){
    const m=MODES[mode];
    swapText(windTagEl,m.windTag,40);
    if(windCanvasEl) windCanvasEl.setAttribute('aria-label',`Live wind vector field. ${m.windTag.replace('SURFACE VECTORS — ','Regime: ').toLowerCase()}.`);
  }

  let state={mode:'rain'};

  function setMode(mode,opts){
    opts=opts||{};
    const instant=!!opts.instant;
    if(mode===state.mode && !instant) return;
    const prev=state.mode;
    state.mode=mode;
    document.body.dataset.mode=mode;
    updateDial(mode,instant);
    setAccentVars(mode);
    updateGlyph(mode);
    updateCurrent(mode,instant);
    updateForecast(mode,instant);
    updateComposition(mode,instant);
    updateWindTag(mode);
    if(instant) Transition.snap(mode);
    else Transition.begin(prev,mode);

    if(prefersReduced){
      const rgb=hexToRgb(MODES[mode].accent);
      scene && scene.drawStatic(mode);
      windmap && windmap.drawStatic(mode,rgb);
      telemetry && telemetry.drawStatic(rgb);
    }
  }

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  let scene=null, windmap=null, telemetry=null, running=false, rafId=null, lastTs=null;

  function frame(ts){
    if(!lastTs) lastTs=ts;
    const dt=Math.min(0.05,(ts-lastTs)/1000);
    lastTs=ts;
    const blend=Transition.sample(ts);
    scene.draw(blend,ts,dt);
    const accentRgb=mixRgb(MODES[blend.from].accent,MODES[blend.to].accent,blend.t);
    windmap.draw(blend,ts,dt,accentRgb);
    const windSpeed=lerp(MODES[blend.from].wind_.speed,MODES[blend.to].wind_.speed,blend.t);
    telemetry.draw(ts,accentRgb,windSpeed);
    rafId=requestAnimationFrame(frame);
  }
  function startLoop(){
    if(running||prefersReduced) return;
    running=true; lastTs=null;
    rafId=requestAnimationFrame(frame);
  }
  function stopLoop(){
    running=false;
    if(rafId) cancelAnimationFrame(rafId);
    rafId=null;
  }

  function updateClock(){
    if(!clockEl) return;
    const d=new Date();
    const hh=String(d.getHours()).padStart(2,'0');
    const mm=String(d.getMinutes()).padStart(2,'0');
    const ss=String(d.getSeconds()).padStart(2,'0');
    clockEl.textContent=`SOL 0412 — ${hh}:${mm}:${ss}`;
  }

  function debounce(fn,ms){
    let t;
    return function(){
      clearTimeout(t);
      t=setTimeout(fn,ms);
    };
  }

  function init(){
    setAccentVars('rain');
    scene=new Scene(sceneCanvasEl);
    windmap=new WindMap(windCanvasEl);
    telemetry=new Telemetry(telemetryCanvasEl);

    dialButtons.forEach(btn=>{
      btn.addEventListener('click',()=>setMode(btn.dataset.mode));
      btn.addEventListener('keydown',e=>{
        const i=dialButtons.indexOf(btn);
        if(e.key==='ArrowRight'||e.key==='ArrowDown'){
          e.preventDefault();
          const next=dialButtons[(i+1)%dialButtons.length];
          next.focus(); setMode(next.dataset.mode);
        } else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){
          e.preventDefault();
          const prevBtn=dialButtons[(i-1+dialButtons.length)%dialButtons.length];
          prevBtn.focus(); setMode(prevBtn.dataset.mode);
        }
      });
    });

    setMode('rain',{instant:true});
    updateClock();
    setInterval(updateClock,1000);

    const ro=new ResizeObserver(debounce(()=>{
      scene.resize();
      windmap.resize();
      telemetry.resize();
      updateDial(state.mode,true);
      if(prefersReduced){
        const rgb=hexToRgb(MODES[state.mode].accent);
        scene.drawStatic(state.mode);
        windmap.drawStatic(state.mode,rgb);
        telemetry.drawStatic(rgb);
      }
    },120));
    ro.observe(sceneCanvasEl);
    ro.observe(windCanvasEl);
    ro.observe(telemetryCanvasEl);

    document.fonts && document.fonts.ready && document.fonts.ready.then(()=>updateDial(state.mode,true));

    document.addEventListener('visibilitychange',()=>{
      if(document.hidden) stopLoop();
      else startLoop();
    });

    if(prefersReduced){
      const rgb=hexToRgb(MODES[state.mode].accent);
      scene.drawStatic(state.mode);
      windmap.drawStatic(state.mode,rgb);
      telemetry.drawStatic(rgb);
    } else {
      startLoop();
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  } else {
    init();
  }
})();
