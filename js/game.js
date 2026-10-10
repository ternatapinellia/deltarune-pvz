/* =========================================================
   PvZ-Deltarune — 主逻辑（普通关 / 坚果保龄球 / 传送带）
   ========================================================= */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
canvas.width  = CFG.lawnX + CFG.cols * CFG.cellW + 18;
canvas.height = CFG.lawnY + CFG.rows * CFG.cellH + 16;

const $ = function (id) { return document.getElementById(id); };
const $$ = function (id) { return document.getElementById(id) || dummyEl(); };
function dummyEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){}}, textContent:'', innerHTML:'', appendChild(){}, querySelector(){return null;} }; }
const elSun=$$('suncount'), elSunBox=$$('sunbox'), elBank=$$('seedbank'), elShovel=$$('shovel'),
      elBanner=$$('banner'), elOverlay=$$('overlay'), elOvTitle=$$('ov-title'),
      elOvText=$$('ov-text'), elOvBtn=$$('ov-btn'), elProgFill=$$('progressFill'),
      elLevelTag=$$('levelTag'), elApp=$$('app'),
      elPauseTag=$$('pauseTag'), elBtnPause=$$('btnPause'), elBtnMenu=$$('btnMenu');

let S=null, selected=null, shovelOn=false, lastTime=0, rafId=null, hoverCell=null;

function cellCenter(r,c){ return { x: CFG.lawnX + c*CFG.cellW, y: CFG.lawnY + r*CFG.cellH + CFG.cellH/2 }; }
function cellFromPoint(mx,my){
  const c=Math.floor((mx-CFG.lawnX)/CFG.cellW), r=Math.floor((my-CFG.lawnY)/CFG.cellH);
  if(r<0||r>=CFG.rows||c<0||c>=CFG.cols) return null;
  return {r:r,c:c};
}

/* ---------------- 开局 ---------------- */
function startLevel(idx){
  const lv=LEVELS[idx];
  S={ lv:lv, lvIndex:idx, mode:lv.mode, sun:(lv.startSun||0), time:0, waveIdx:0,
      plants:[], zombies:[], suns:[], bullets:[], effects:[], rolling:[],
      cds:{}, hand:[], ammo:0, ammoMade:0,
      over:false, won:false, paused:false,
      sunValue:CFG.sunValue, autoSun:CFG.autoSun,
      nextSkySun:9, nextAmmo:1.0, nextHand:0.6 };
  if(lv.plants) lv.plants.forEach(function(k){ S.cds[k]=0; });

  selected=null; shovelOn=false;
  elShovel.classList.remove('selected');
  elShovel.style.display = (lv.mode==='normal')?'':'none';
  elSunBox.style.display = (lv.mode==='normal')?'':'none';
  elOverlay.classList.add('hidden');
  elBanner.classList.remove('show');
  elPauseTag.classList.remove('show');
  if(elBtnPause){ elBtnPause.textContent='\u23f8'; }

  setSunIcon();
  setShovelIcon();
  buildHud(); updateHud();
  if(rafId) cancelAnimationFrame(rafId);
  lastTime=performance.now();
  rafId=requestAnimationFrame(loop);
}

/* 顶栏阳光图标：有图用图 */
/* 铲子图标：有图用图 */
function setShovelIcon(){
  const el = document.getElementById('shovel');
  if(!el) return;
  const im = new Image();
  im.onload = function(){
    el.textContent = '';
    im.style.width='100%'; im.style.height='100%';
    im.style.objectFit='contain';
    im.style.imageRendering='pixelated';
    el.appendChild(im);
  };
  im.src = Assets.pathFor('plant:lancer');
}

function setSunIcon(){
  const el = document.getElementById('sunicon');
  if(!el) return;
  const im = new Image();
  im.onload = function(){
    el.textContent = '';
    im.style.width='100%'; im.style.height='100%';
    im.style.objectFit='contain';
    im.style.imageRendering='pixelated';
    el.appendChild(im);
  };
  im.src = Assets.pathFor('sun');
}

/* ---------------- HUD ---------------- */
function buildHud(){
  elBank.innerHTML='';
  if(S.mode==='normal'){ buildSeedBank(); }
  else if(S.mode==='bowling'){ buildBowlingHud(); }
  else if(S.mode==='conveyor'){ buildConveyorHud(); }
}

function cardHtml(key){
  const p=PLANTS[key];
  return '<div class="card-art">🌱</div>'+
         '<div class="card-name">'+p.name+'</div>'+
         (S.mode==='normal' ? '<div class="card-cost">'+p.cost+'</div>' : '')+
         '<div class="cd" style="display:none"></div>';
}

function loadCardArt(key){
  const p=PLANTS[key];
  const slot=elBank.querySelector('[data-key="'+key+'"] .card-art');
  if(!slot) return;
  const im=new Image();
  im.onload=function(){ slot.innerHTML=''; im.style.width='100%'; im.style.height='100%';
                        im.style.objectFit='contain'; slot.appendChild(im); };
  im.src=Assets.pathFor('plant:'+p.img);
}

function buildSeedBank(){
  S.lv.plants.forEach(function(key){
    const p=PLANTS[key];
    const d=document.createElement('div');
    d.className='card'; d.dataset.key=key; d.innerHTML=cardHtml(key);
    d.onclick=function(){
      if(S.over) return;
      if(S.cds[key]>0||S.sun<p.cost) return;
      selected=(selected===key)?null:key; shovelOn=false;
      elShovel.classList.remove('selected'); refreshCards();
    };
    elBank.appendChild(d);
  });
  S.lv.plants.forEach(loadCardArt);
  refreshCards();
}

function buildBowlingHud(){
  const wrap=document.createElement('div');
  wrap.id='ammoBox';
  wrap.innerHTML='<span id="ammoTxt">坚果 \u00d70</span>';
  elBank.appendChild(wrap);
  S.ammoBox = wrap;
  S.ammoTxt = wrap.querySelector('#ammoTxt');
}

function buildConveyorHud(){
  S.lv.conveyor.forEach(function(key){
    const d=document.createElement('div');
    d.className='card'; d.dataset.hand=key; d.innerHTML=cardHtml(key);
    d.onclick=function(){
      if(S.over) return;
      const i=S.hand.indexOf(key);
      if(i<0) return;                       // 手上没有就不给选
      selected=(selected===key)?null:key;
      refreshHand();
    };
    elBank.appendChild(d);
  });
  S.lv.conveyor.forEach(loadCardArt);
  refreshHand();
}

function refreshCards(){
  if(!S||S.mode!=='normal') return;
  Array.prototype.forEach.call(elBank.children,function(d){
    const key=d.dataset.key; if(!key) return;
    const p=PLANTS[key], cd=S.cds[key]||0, poor=S.sun<p.cost;
    d.classList.toggle('selected',selected===key);
    d.classList.toggle('disabled',cd>0||poor);
    const cdEl=d.querySelector('.cd');
    if(cd>0){ cdEl.style.display='block';
              cdEl.style.height=(cd/p.cd*100)+'%'; cdEl.style.top='0'; }
    else cdEl.style.display='none';
  });
}

function refreshHand(){
  if(!S||S.mode!=='conveyor') return;
  Array.prototype.forEach.call(elBank.children,function(d){
    const key=d.dataset.hand; if(!key) return;
    const have=S.hand.indexOf(key)>=0;
    d.classList.toggle('selected',selected===key);
    d.classList.toggle('disabled',!have);
  });
}

function updateHud(){
  if(!S) return;
  if(S.mode==='normal') elSun.textContent=Math.floor(S.sun);
  elLevelTag.textContent=S.lv.name;
  const total=S.lv.waves.length;
  elProgFill.style.width=(Math.min(S.waveIdx,total)/total*100)+'%';
  if(S.mode==='bowling' && S.ammoTxt){
    S.ammoTxt.textContent='坚果 \u00d7'+S.ammo;
  }
  refreshCards(); refreshHand();
}

/* ---------------- 交互 ---------------- */
canvas.addEventListener('click',function(e){
  if(!S||S.over) return;
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;

  /* 先判断点阳光（普通关才有） */
  if(S.mode==='normal'){
    for(let i=S.suns.length-1;i>=0;i--){
      const s=S.suns[i];
      if((mx-s.x)*(mx-s.x)+(my-s.y)*(my-s.y)<=s.r*s.r+80){
        collectSun(s); S.suns.splice(i,1); return;
      }
    }
  }

  const cell=cellFromPoint(mx,my);
  if(!cell) return;

  /* 保龄球：点哪一行就从哪一行滚出去 */
  if(S.mode==='bowling'){
    rollNut(cell.r);
    return;
  }

  const here=plantAt(cell.r,cell.c);

  /* 铲子（普通关） */
  if(shovelOn){
    if(here){ S.plants.splice(S.plants.indexOf(here),1);
              shovelOn=false; elShovel.classList.remove('selected'); }
    return;
  }

  if(!selected) return;
  if(here) return;

  if(S.mode==='normal'){
    const p=PLANTS[selected];
    if(S.sun<p.cost||S.cds[selected]>0) return;
    S.sun-=p.cost; S.cds[selected]=p.cd; updateHud();
  } else if(S.mode==='conveyor'){
    const i=S.hand.indexOf(selected);
    if(i<0) return;
    S.hand.splice(i,1);          // 从手上扣掉一张
  }

  placePlant(cell.r,cell.c,selected);
  selected=null;
  refreshCards(); refreshHand();
});

function placePlant(r,c,key){
  const p=PLANTS[key];
  const pl={ r:r,c:c,type:key,cfg:p,hp:p.hp,t:0,armed:false,img:p.img };
  if(p.imitate){ pl.imitateAt = 1 + Math.random(); }   // 1~2 秒后变身
  S.plants.push(pl);
  if(p.bomb) setTimeout(function(){ if(!S.over) explode(pl); },700);
}

elShovel.onclick=function(){
  if(!S||S.over||S.mode!=='normal') return;
  shovelOn=!shovelOn; selected=null;
  elShovel.classList.toggle('selected',shovelOn); refreshCards();
};

elBtnPause.onclick=function(e){ e.stopPropagation(); togglePause(); };
elBtnMenu.onclick=function(e){ e.stopPropagation(); backToMenu(); };
document.addEventListener('keydown',function(e){
  if(e.code==='Space'){ e.preventDefault(); togglePause(); }
  if(e.code==='Escape'){ backToMenu(); }
});

function plantAt(r,c){
  for(let i=0;i<S.plants.length;i++){
    const p=S.plants[i];
    if(p.r===r&&p.c===c) return p;
  }
  return null;
}

/* ---------------- 保龄球 ---------------- */
function rollNut(row){
  if(S.ammo<=0) return;
  S.ammo--;
  const explosive=(S.ammoMade % (S.lv.explosiveEvery||7)===0);
  S.ammoMade++;
  S.rolling.push({ r:row, x:CFG.lawnX+20, vx:560, explosive:explosive,
                   y:CFG.lawnY+row*CFG.cellH+CFG.cellH/2, gone:false });
  updateHud();
}

/* ---------------- 阳光 ---------------- */
function spawnSun(x,y,fromSky){
  S.suns.push({ x:x, y:y, ty:y+(fromSky?70:0), vy:fromSky?28:0,
                life:13, r:17, auto:!!S.autoSun, t:0 });
}

/* 收集一朵阳光 */
function collectSun(sun){
  S.sun += S.sunValue;
  if(elSun) elSun.textContent = Math.floor(S.sun);
  refreshCards();
}

/* ---------------- 爆炸 ---------------- */
function explode(pl){
  const cfg=PLANTS[pl.type];
  if(!cfg.bomb) return;
  const cx=CFG.lawnX+pl.c*CFG.cellW+cand(), cy=0;
  const X=CFG.lawnX+pl.c*CFG.cellW, Y=CFG.lawnY+pl.r*CFG.cellH+CFG.cellH/2;
  const rad=cfg.bomb.radius*CFG.cellW;
  S.effects.push({x:X,y:Y,r:rad,life:0.55,max:0.55});
  S.zombies.forEach(function(z){
    if(Math.abs(z.x-X)<=rad&&Math.abs(z.y-Y)<=rad) z.hp-=cfg.bomb.dmg;
  });
  const i=S.plants.indexOf(pl);
  if(i>=0) S.plants.splice(i,1);
}
function cand(){ return 0; }

/* ---------------- 主循环 ---------------- */
function loop(now){
  const dt=Math.min(0.05,(now-lastTime)/1000);
  lastTime=now;
  if(S&&!S.over&&!S.paused) update(dt);
  render();
  rafId=requestAnimationFrame(loop);
}

/* ---------------- 暂停 / 退出 ---------------- */
function togglePause(){
  if(!S||S.over) return;
  S.paused=!S.paused;
  elPauseTag.classList.toggle('show',S.paused);
  elBtnPause.textContent=S.paused?'\u25b6':'\u23f8';
  elBtnPause.title=S.paused?'继续':'暂停';
}

function backToMenu(){
  if(S){ S.over=true; S.paused=false; }
  if(rafId){ cancelAnimationFrame(rafId); rafId=null; }
  elPauseTag.classList.remove('show');
  elBtnPause.textContent='\u23f8';
  selected=null; shovelOn=false;
  elShovel.classList.remove('selected');
  showLevelSelect();
}

function update(dt){
  S.time+=dt;

  if(S.mode==='normal'){
    S.lv.plants.forEach(function(k){ if(S.cds[k]>0) S.cds[k]=Math.max(0,S.cds[k]-dt); });
    S.nextSkySun-=dt;
    if(S.nextSkySun<=0){
      const lo = S.lv.skySunMin!=null ? S.lv.skySunMin : CFG.skySunMin;
      const hi = S.lv.skySunMax!=null ? S.lv.skySunMax : CFG.skySunMax;
      S.nextSkySun=lo+Math.random()*(hi-lo);
      spawnSun(CFG.lawnX+40+Math.random()*(CFG.cols*CFG.cellW-80),-20,true);
    }
  }

  if(S.mode==='bowling'){
    S.nextAmmo-=dt;
    if(S.nextAmmo<=0&&S.ammo<S.lv.ammoMax){
      S.nextAmmo=S.lv.ammoEvery; S.ammo++; updateHud();
    }
  }

  if(S.mode==='conveyor'){
    S.nextHand-=dt;
    const key=S.lv.conveyor[0];
    if(S.nextHand<=0&&countHand(key)<S.lv.handMax){
      S.nextHand=S.lv.conveyEvery;
      S.hand.push(key); refreshHand();
    }
  }

  for(let i=S.suns.length-1;i>=0;i--){
    const s=S.suns[i];
    if(s.y<s.ty) s.y=Math.min(s.ty,s.y+s.vy*dt);
    s.t += dt;
    s.life-=dt;

    /* 自动收集：天上掉的落地就收，植物产的冒头就收 */
    if(s.auto && (s.t>0.45 || !s.vy)) { collectSun(s); S.suns.splice(i,1); continue; }

    if(s.life<=0) S.suns.splice(i,1);
  }

  /* 植物 */
  S.plants.forEach(function(pl){
    pl.t+=dt; const cfg=pl.cfg;
    if(cfg.produce){
      const every = S.lv.produceEvery || cfg.produce.every;
      if(pl.t>=every){
      pl.t=0;
      const n=cfg.produce.double?2:1;
      for(let k=0;k<n;k++){ const cc=cellCenter(pl.r,pl.c); spawnSun(cc.x+(k?14:-14),cc.y,false); }
      }
    }
    if(cfg.shoot){
      const has=S.zombies.some(function(z){
        return z.r===pl.r&&z.x>CFG.lawnX+pl.c*CFG.cellW-10&&z.hp>0; });
      if(has&&pl.t>=cfg.shoot.every){
        pl.t=0;
        const burst=cfg.shoot.burst||1;
        for(let k=0;k<burst;k++){
          const cc=cellCenter(pl.r,pl.c);
          S.bullets.push({x:cc.x+18,y:cc.y-6,r:pl.r,dmg:cfg.shoot.dmg,delay:k*0.09});
        }
      }
    }
    if(cfg.mine&&!pl.armed&&pl.t>=cfg.mine.arm) pl.armed=true;

    /* 模仿者变身 */
    if(cfg.imitate && pl.t>=pl.imitateAt){
      transformImitator(pl);
    }
    if(cfg.spike){
      S.zombies.forEach(function(z){
        if(z.r===pl.r&&Math.abs(z.x-(CFG.lawnX+pl.c*CFG.cellW))<CFG.cellW*0.5) z.hp-=cfg.spike.dps*dt;
      });
    }
  });

  /* 子弹 */
  for(let i=S.bullets.length-1;i>=0;i--){
    const b=S.bullets[i];
    if(b.delay>0){ b.delay-=dt; continue; }
    b.x+=CFG.bulletSpeed*dt;
    let hit=false;
    for(let j=0;j<S.zombies.length;j++){
      const z=S.zombies[j];
      if(z.r===b.r&&z.hp>0&&Math.abs(z.x-b.x)<26){ z.hp-=b.dmg; hit=true; break; }
    }
    if(hit||b.x>CFG.lawnX+CFG.cols*CFG.cellW+40) S.bullets.splice(i,1);
  }

  /* 保龄球滚动：撞到僵尸造成伤害，不重复撞同一只 */
  for(let i=S.rolling.length-1;i>=0;i--){
    const n=S.rolling[i];
    n.x+=n.vx*dt;
    if(!n.hitSet) n.hitSet=[];

    let boom=false;
    for(let j=0;j<S.zombies.length;j++){
      const z=S.zombies[j];
      if(z.hp<=0||z.r!==n.r) continue;
      if(n.hitSet.indexOf(z)>=0) continue;      // 已经撞过这只了
      if(Math.abs(z.x-n.x)<30){
        n.hitSet.push(z);
        if(n.explosive){ boom=true; break; }
        z.hp-=CFG.nutDamage;
      }
    }
    if(boom){
      const rad=CFG.cellW*CFG.nutExplodeRadius;
      S.effects.push({x:n.x,y:n.y,r:rad,life:0.5,max:0.5});
      const dmg = CFG.nutExplodeDamage || CFG.nutDamage * 3;
      S.zombies.forEach(function(z){
        if(Math.abs(z.x-n.x)<=rad&&Math.abs(z.y-n.y)<=rad) z.hp-=dmg;
      });
      S.rolling.splice(i,1); continue;
    }
    /* 滚太久（撞不死）也收掉，避免卡在场上 */
    n.life=(n.life||0)+dt;
    if(n.x>CFG.lawnX+CFG.cols*CFG.cellW+50 || n.life>6) S.rolling.splice(i,1);
  }

  /* 僵尸 */
  S.zombies.forEach(function(z){
    if(z.hp<=0) return;

    /* 推冰车：碾碎路上的植物，不停下 */
    if(z.crush){
      z.eating=false;
      z.x-=z.speed*dt;
      for(let i=S.plants.length-1;i>=0;i--){
        const pl=S.plants[i];
        if(pl.r!==z.r) continue;
        const px=CFG.lawnX+pl.c*CFG.cellW;
        if(Math.abs(z.x-px)<CFG.cellW*0.42){
          /* 地刺扎不到车，其他都被压碎 */
          if(!pl.cfg.spike){
            S.effects.push({x:px, y:CFG.lawnY+pl.r*CFG.cellH+CFG.cellH/2,
                            r:CFG.cellW*0.6, life:0.35, max:0.35});
            S.plants.splice(i,1);
          }
        }
      }
      return;   // 跳过啃食逻辑
    }

    const target=findEatTarget(z);
    if(target){
      z.eating=true; target.hp-=z.dmg*dt;
      if(target.hp<=0){ const i=S.plants.indexOf(target); if(i>=0) S.plants.splice(i,1); }
    } else { z.eating=false; z.x-=z.speed*dt; }

    for(let i=0;i<S.plants.length;i++){
      const pl=S.plants[i];
      if(pl.cfg.mine&&pl.armed&&pl.r===z.r&&
         Math.abs((CFG.lawnX+pl.c*CFG.cellW)-z.x)<CFG.cellW*0.45){
        const X=CFG.lawnX+pl.c*CFG.cellW, Y=CFG.lawnY+pl.r*CFG.cellH+CFG.cellH/2;
        S.effects.push({x:X,y:Y,r:CFG.cellW,life:0.4,max:0.4});
        z.hp-=pl.cfg.mine.dmg; S.plants.splice(i,1); break;
      }
    }
  });

  S.zombies=S.zombies.filter(function(z){ return z.hp>0; });

  for(let i=S.effects.length-1;i>=0;i--){
    S.effects[i].life-=dt;
    if(S.effects[i].life<=0) S.effects.splice(i,1);
  }

  /* 波次 */
  while(S.waveIdx<S.lv.waves.length&&S.time>=S.lv.waves[S.waveIdx].t){
    const w=S.lv.waves[S.waveIdx];

    /* 组装这一波的全部僵尸类型（固定 + 随机追加） */
    let list = w.z.slice();
    if(w.rand && w.rand.n>0){
      for(let i=0;i<w.rand.n;i++){
        const pool = w.rand.pool || ['normal'];
        /* 后期越靠后越容易出铁桶 */
        let pool2 = pool;
        if(S.waveIdx >= S.lv.waves.length-3){
          pool2 = pool.concat(['bucket','bucket']);
        }
        list.push(pool2[Math.floor(Math.random()*pool2.length)]);
      }
    }
    /* 打乱顺序，避免同类总挤在一起 */
    for(let i=list.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      const t=list[i]; list[i]=list[j]; list[j]=t;
    }

    dropWave(list, w.huge);
    S.waveIdx++; updateHud();
  }

  S.zombies.forEach(function(z){ z.y=CFG.lawnY+z.r*CFG.cellH+CFG.cellH/2; });

  if(S.transformMsg && S.time - S.transformMsgAt > 1.8) S.transformMsg = null;

  if(S.zombies.some(function(z){ return z.x<CFG.lawnX-30; })) return gameOver(false);
  if(S.waveIdx>=S.lv.waves.length&&S.zombies.length===0) return gameOver(true);

  if(S.mode==='normal'){ elSun.textContent=Math.floor(S.sun); refreshCards(); }
}

function countHand(key){ let n=0; S.hand.forEach(function(k){ if(k===key) n++; }); return n; }

function findEatTarget(z){
  for(let i=0;i<S.plants.length;i++){
    const pl=S.plants[i];
    if(pl.r!==z.r) continue;
    const px=CFG.lawnX+pl.c*CFG.cellW;
    if(z.x-px<CFG.cellW*0.55&&z.x-px>-CFG.cellW*0.25) return pl;
  }
  return null;
}

/* 模仿者变身：50% 变成随机植物，50% 变成僵尸 */
function transformImitator(pl){
  const i = S.plants.indexOf(pl);
  if(i<0) return;

  const cc = cellCenter(pl.r, pl.c);
  S.effects.push({ x:cc.x, y:cc.y, r:CFG.cellW*0.9, life:0.45, max:0.45 });

  /* 能变出来的植物：
     1) 关卡里配置了 imitatePool 就用它
     2) 否则用本关可用植物
     3) 如果都没有（像第四关只给模仿者），就用全部植物
     都要排除模仿者自己和樱桃炸弹 */
  let canBe = (S.lv.imitatePool || S.lv.plants).filter(function(k){
    return PLANTS[k] && !PLANTS[k].imitate && !PLANTS[k].bomb;
  });
  if(!canBe.length){
    canBe = Object.keys(PLANTS).filter(function(k){
      return !PLANTS[k].imitate && !PLANTS[k].bomb;
    });
  }

  const toZombie = Math.random() < 0.5;

  if(toZombie){
    /* 变成僵尸：就在这一格出现（趣味所在），但只出普通/路障，且慢一些 */
    S.plants.splice(i,1);
    const pool = ['normal','normal','cone', (Math.random()<0.15?'zamboni':'normal')];
    const type = pool[Math.floor(Math.random()*pool.length)];
    const cfg = ZOMBIES[type];
    S.zombies.push({ type:type, cfg:cfg,
      hp:cfg.hp*CFG.imitatorZombieHp, maxHp:cfg.hp*CFG.imitatorZombieHp,
      r:pl.r,
      x:CFG.lawnX + pl.c*CFG.cellW + CFG.cellW*0.35,
      y:CFG.lawnY + pl.r*CFG.cellH + CFG.cellH/2,
      eating:false, dmg:cfg.dmg,
      speed:cfg.speed*CFG.imitatorZombieSpeed, img:cfg.img });
    S.transformMsg = '糟糕！变成了僵尸！';
  } else {
    /* 变成植物 */
    const key = canBe.length ? canBe[Math.floor(Math.random()*canBe.length)] : 'peashooter';
    const np = PLANTS[key];
    pl.type = key; pl.cfg = np; pl.hp = np.hp; pl.img = np.img;
    pl.t = 0; pl.armed = false; pl.imitateAt = null;
    S.transformMsg = '模仿者变成了 ' + np.name + '！';
  }
  S.transformMsgAt = S.time;
}

/* 把一波僵尸均匀铺到不同行：每行轮着放，行内再随机错开 */
function dropWave(list, huge){
  const rows = CFG.rows;
  /* 行号序列：平均分配 + 打乱，保证不会全挤一行 */
  const seq = [];
  for(let i=0;i<list.length;i++) seq.push(i % rows);
  for(let i=seq.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    const t=seq[i]; seq[i]=seq[j]; seq[j]=t;
  }

  /* 每行的出场序号，用于拉开左右间距 */
  const rowCount = {};

  list.forEach(function(type, i){
    const cfg=ZOMBIES[type];
    const r = seq[i];
    const k = (rowCount[r] = (rowCount[r] || 0) + 1) - 1;

    /* 出场位置：基础间距 + 随机抖动 */
    const x = CFG.lawnX + CFG.cols*CFG.cellW + 26 + k*(34 + Math.random()*22)
              + Math.random()*30;

    /* 速度带一点随机，避免整排同步走 */
    const spd = cfg.speed * (0.9 + Math.random()*0.25);

    S.zombies.push({ type:type, cfg:cfg, hp:cfg.hp, maxHp:cfg.hp,
      r:r, x:x, y:0, eating:false, dmg:cfg.dmg, speed:spd, img:cfg.img,
      crush:!!cfg.crush });
  });

  if(huge) showBanner();
}

function showBanner(){
  elBanner.textContent='一大波耗子来袭！';
  elBanner.classList.add('show');
  setTimeout(function(){ elBanner.classList.remove('show'); },2600);
}

function gameOver(won){
  S.over=true; S.won=!!won;
  elOvTitle.textContent=won?'🎉 守住了！':'💀 老鼠偷光了你家的钱';
  elOvText.textContent=won?'所有 Spamton 都被清掉了。':'有 Spamton 溜进了屋里，把钱搬空了。再来一次？';
  elOvBtn.textContent='重玩本关';
  /* 关键：结算按钮重新绑定，避免沿用选关界面的“开始第一关” */
  elOvBtn.onclick=function(){ startLevel(S?S.lvIndex:0); };
  elOverlay.classList.remove('hidden');
}
/* ---------------- 渲染 ---------------- */
function render(){
  if(!S) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const bg=Assets.get('bg');
  if(bg&&bg.complete&&bg.naturalWidth) ctx.drawImage(bg,0,0,canvas.width,canvas.height);
  else{
    for(let r=0;r<CFG.rows;r++)for(let c=0;c<CFG.cols;c++){
      const x=CFG.lawnX+c*CFG.cellW, y=CFG.lawnY+r*CFG.cellH;
      ctx.fillStyle=((r+c)%2)?'#1b3d13':'#173510';
      ctx.fillRect(x,y,CFG.cellW,CFG.cellH);
      /* 像素草地纹理：固定位置的浅色点 */
      for(let i=0;i<4;i++){
        const gx = x + ((c*37 + r*19 + i*53) % (CFG.cellW-10)) + 5;
        const gy = y + ((c*23 + r*41 + i*31) % (CFG.cellH-10)) + 5;
        ctx.fillStyle='rgba(120,200,90,.13)';
        ctx.fillRect(gx,gy,4,4);
      }
    }
  }

  ctx.fillStyle='#241f36';
  ctx.fillRect(0,0,CFG.lawnX,canvas.height);

  if((selected||shovelOn)&&hoverCell){
    ctx.fillStyle='rgba(255,213,74,.18)';
    ctx.fillRect(CFG.lawnX+hoverCell.c*CFG.cellW,CFG.lawnY+hoverCell.r*CFG.cellH,
                 CFG.cellW,CFG.cellH);
  }

  S.plants.forEach(function(pl){
    const cc=cellCenter(pl.r,pl.c);
    let h=CFG.cellH*0.82,w=CFG.cellW*0.82;
    if(pl.type==='spikeweed') h=CFG.cellH*0.34;
    /* 像素风动感：站定时极轻微呼吸 */
    const bob = Math.round(Math.sin(S.time*3 + pl.c*0.8 + pl.r*1.1)*1);
    Assets.draw(ctx,'plant:'+pl.img,pl.cfg.name,cc.x,cc.y+bob,w,h);
  });

  S.bullets.forEach(function(b){
    if(b.delay>0) return;
    const px=Math.round(b.x), py=Math.round(b.y);
    ctx.fillStyle='#3f8f2e'; ctx.fillRect(px-6,py-6,12,12);
    ctx.fillStyle='#8ef07a'; ctx.fillRect(px-4,py-4,8,8);
    ctx.fillStyle='#d6ffc9'; ctx.fillRect(px-4,py-4,3,3);
  });

  S.rolling.forEach(function(n){
    Assets.draw(ctx,'plant:dispenser','坚果',n.x,n.y,CFG.cellW*0.8,CFG.cellH*0.8);
    if(n.explosive){
      ctx.beginPath(); ctx.arc(n.x,n.y-34,7,0,Math.PI*2);
      ctx.fillStyle='#ff8a4a'; ctx.fill();
    }
  });

  S.zombies.forEach(function(z){
    const h=CFG.cellH*1.02,w=CFG.cellW*0.86;
    /* 像素风动感：走路上下起伏，啃食前后小幅抖动 */
    const phase = z.x*0.16 + z.r*1.7;
    let dy = Math.round(Math.sin(phase)*2);
    let dx = 0;
    if(z.eating){ dy = Math.round(Math.sin(S.time*22)*2); dx = Math.round(Math.sin(S.time*18)*1); }
    Assets.draw(ctx,'zombie:'+z.img,z.cfg.name,z.x+dx,z.y+dy,w,h);
    if(z.hp<z.maxHp){
      const bw=44,bh=4;
      ctx.fillStyle='rgba(0,0,0,.6)';
      ctx.fillRect(z.x-bw/2,z.y-h/2-12,bw,bh);
      ctx.fillStyle='#6bdc6b';
      ctx.fillRect(z.x-bw/2,z.y-h/2-12,bw*Math.max(0,z.hp/z.maxHp),bh);
    }
  });

  S.suns.forEach(function(s){
    const r=Math.round(s.r), x=Math.round(s.x), y=Math.round(s.y);
    const img = Assets.get('sun');
    if (img && img.complete && img.naturalWidth) {
      /* 有图：按整数倍放大到约 2r 大小 */
      const iw=img.naturalWidth, ih=img.naturalHeight;
      const sc = Assets.fitScale(iw, ih, r*2.2, r*2.2);
      const w=Math.round(iw*sc), h=Math.round(ih*sc);
      ctx.drawImage(img, Math.round(x-w/2), Math.round(y-h/2), w, h);
    } else {
      /* 没图：像素小太阳 */
      ctx.fillStyle='#c99700'; ctx.fillRect(x-r,y-r,r*2,r*2);
      ctx.fillStyle='#f5c518'; ctx.fillRect(x-r+2,y-r+2,r*2-4,r*2-4);
      ctx.fillStyle='#fff3a8'; ctx.fillRect(x-r+4,y-r+4,r,r);
    }
  });

  S.effects.forEach(function(e){
    const k=1-e.life/e.max;
    const r=Math.round(e.r*(0.4+k*0.7));
    const x=Math.round(e.x), y=Math.round(e.y);
    ctx.fillStyle='rgba(255,'+Math.round(180-k*100)+',60,'+(e.life/e.max*0.8)+')';
    ctx.fillRect(x-r,y-r,r*2,r*2);
    ctx.fillStyle='rgba(255,255,200,'+(e.life/e.max*0.6)+')';
    ctx.fillRect(x-r/2,y-r/2,r,r);
  });

  if(S.mode==='bowling') drawAmmo();

  /* 模仿者变身提示 */
  if(S.transformMsg){
    const k = 1 - (S.time - S.transformMsgAt)/1.8;
    ctx.globalAlpha = Math.max(0, Math.min(1, k*2));
    ctx.font='bold 20px "Courier New",Consolas,monospace';
    ctx.textAlign='center';
    ctx.fillStyle='#000';
    ctx.fillText(S.transformMsg, canvas.width/2+2, 42+2);
    ctx.fillStyle='#ffd54a';
    ctx.fillText(S.transformMsg, canvas.width/2, 42);
    ctx.globalAlpha = 1;
  }
}

function drawAmmo(){
  const cc=cellCenter(0,0);
  for(let i=0;i<S.ammo;i++){
    Assets.draw(ctx,'plant:dispenser','',CFG.lawnX*0.5,CFG.lawnY+40+i*46,52,52);
  }
  ctx.fillStyle='#c9c3dd';
  ctx.font='bold 13px "Microsoft YaHei",Arial';
  ctx.textAlign='center';
  ctx.fillText('点击某行', CFG.lawnX*0.5, CFG.lawnY-14);
  ctx.fillText('滚出坚果', CFG.lawnX*0.5, canvas.height-50);
}

canvas.addEventListener('mousemove',function(e){
  const rect=canvas.getBoundingClientRect();
  hoverCell=cellFromPoint(e.clientX-rect.left,e.clientY-rect.top);
});
canvas.addEventListener('mouseleave',function(){ hoverCell=null; });

/* ---------------- 关卡选择 ---------------- */
function showLevelSelect(){
  elOvTitle.textContent='暗世界保卫战';
  let t='选一关开始：\n';
  LEVELS.forEach(function(lv,i){ t+='\n'+(i+1)+'. '+lv.name+' — '+lv.tip.split('\n')[0]; });
  elOvText.textContent=t;
  elOvBtn.textContent='开始游戏';
  elOverlay.classList.remove('hidden');
  elOvBtn.onclick=function(){ startLevel(0); };
  buildLevelButtons();
}

function buildLevelButtons(){
  let bar=$('levelSelect');
  if(!bar){
    bar=document.createElement('div');
    bar.id='levelSelect';
    elOverlay.querySelector('#overlay-inner').appendChild(bar);
  }
  bar.innerHTML='';
  LEVELS.forEach(function(lv,i){
    const b=document.createElement('button');
    b.textContent=lv.name;
    b.style.cssText='margin:4px;padding:9px 16px;border-radius:20px;border:none;'+
      'background:#2b2540;color:#e8e6f0;cursor:pointer;font-size:14px';
    b.onmouseenter=function(){ b.style.background='#3c3456'; };
    b.onmouseleave=function(){ b.style.background='#2b2540'; };
    b.onclick=function(){ startLevel(i); };
    bar.appendChild(b);
  });
}

/* 支持 ?level=1 / ?level=2 直接进关（也方便分享链接） */
(function () {
  const m = (location.search || '').match(/[?&]level=(\d+)/);
  if (m) {
    const i = parseInt(m[1], 10) - 1;
    if (i >= 0 && i < LEVELS.length) { startLevel(i); return; }
  }
  showLevelSelect();
})();
