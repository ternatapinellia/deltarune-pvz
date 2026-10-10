/* =========================================================
   PvZ-Deltarune — 配置
   换角色图：改 img 字段（对应 assets/plants|zombies 里的文件名）
   ========================================================= */

const CFG = {
  cols:9, rows:5, cellW:82, cellH:98, lawnX:150, lawnY:76,

  /* ===== 全局数值（想调手感改这里） ===== */
  sunValue: 50,        // 每朵阳光值
  autoSun: true,       // 阳光自动收集
  skySunMin: 11,       // 天降阳光间隔（秒）
  skySunMax: 16,
  bulletSpeed: 420,    // 子弹速度 px/s
  nutDamage: 460,      // 保龄球撞一下（普通1下/路障2下/铁桶3下）
  nutExplodeRadius: 1.9, // 爆炸坚果范围（格）
  nutExplodeDamage: 1400, // 爆炸坚果伤害
  imitatorZombieHp: 0.6,   // 模仿者变出的僵尸血量倍率
  imitatorZombieSpeed: 0.7,// 模仿者变出的僵尸速度倍率
  sunLife: 13,         // 阳光停留时间（自动收集时无意义）
};

const COLORS = {
  flowery:'#f7d24b', tenna:'#e86a5c', green:'#68c26b', yellow:'#e9c33a',
  dispenser:'#8fd4e8', swaptenna:'#8a6ad1', ralsai:'#5fb6c9',
  swapspamton:'#d1546e', lancer:'#4a7fd1', imitator:'#b8a0e0',
  spamton:'#d8d3e0', spamton_cone:'#b7adc4',
  spamton_bucket:'#9ea7b5', spamton_dancer:'#e0b0c8', spamton_zamboni:'#9ec9e8',
};

/* ---------------- 植物 ---------------- */
const PLANTS = {
  sunflower:  { name:'向日葵',     cost:50,  cd:7.5, hp:300,  img:'flowery',     produce:{every:22} },
  twinsun:    { name:'双头向日葵', cost:150, cd:20,  hp:300,  img:'tenna',       produce:{every:22, double:true} },
  peashooter: { name:'豌豆射手',   cost:100, cd:7.5, hp:300,  img:'green',       shoot:{every:1.5, dmg:20} },
  gatling:    { name:'机枪豌豆',   cost:250, cd:30,  hp:300,  img:'yellow',      shoot:{every:0.55, dmg:20, burst:4} },
  wallnut:    { name:'坚果',       cost:50,  cd:30,  hp:4000, img:'dispenser' },
  potatomine: { name:'土豆地雷',   cost:25,  cd:30,  hp:300,  img:'swaptenna',   mine:{arm:14, dmg:1800} },
  spikeweed:  { name:'地刺',       cost:100, cd:7.5, hp:300,  img:'ralsai',      spike:{dps:20} },
  cherry:     { name:'樱桃炸弹',   cost:150, cd:50,  hp:9999, img:'swapspamton', bomb:{radius:1.7, dmg:9999} },
  /* 模仿者：放下后随机变成别的植物，或者变成一只僵尸 */
  imitator:   { name:'模仿者',     cost:50,  cd:1,   hp:300,  img:'imitator', imitate:true },
};

/* ---------------- 僵尸 ---------------- */
const ZOMBIES = {
  normal: { name:'Spamton',      hp:200,  speed:17, dmg:100, img:'spamton' },
  cone:   { name:'路障 Spamton', hp:560,  speed:17, dmg:100, img:'spamton_cone' },
  bucket: { name:'铁桶 Spamton', hp:1300, speed:17, dmg:100, img:'spamton_bucket' },
  dancer: { name:'舞王 Spamton',  hp:500,  speed:17, dmg:100, img:'spamton_dancer' },
  zamboni:{ name:'推冰车 Spamton', hp:2200, speed:24, dmg:100, img:'spamton_zamboni',
            crush:true },   // 直接碾碎植物，不啃食
};

/* ---------------- 关卡 ---------------- */
const LEVELS = [
  {
    id:1, mode:'normal', name:'第一关 · 前院',
    tip:'普通关卡。开局先种向日葵攒阳光。\n把阵地守住，别让 Spamton 走到最左边。',
    plants:['sunflower','peashooter','wallnut','potatomine','spikeweed','cherry','twinsun','gatling'],
    startSun:100,
    waves:[
      { t:30,  z:['normal'] },
      { t:55,  z:['normal','normal'] },
      { t:82,  z:['normal','cone'] },
      { t:110, z:['normal','normal','cone'] },
      { t:140, z:['cone','bucket','normal'] },
      { t:172, z:['normal','cone','cone','bucket','zamboni'] },
      { t:205, z:['bucket','bucket','cone','normal','normal','zamboni','zamboni'], huge:true },
    ],
  },

  {
    id:2, mode:'bowling', name:'第二关 · 坚果保龄球',
    tip:'坚果（饮水机）不断送上来，最多存 6 个。\n点击某一行，把它滚出去撞倒 Spamton。\n每第 5 个是会爆炸的，炸一片。\nSpamton 会从各条路上涌来。',
    ammoEvery:1.5,
    ammoMax:6,
    explosiveEvery:4,
    /* 每波：先按 z 阵列一次性放，再按 rand 随机追加 */
    waves:[
      { t:5,  z:['normal','normal'] },
      { t:13, z:['normal','normal','normal'] },
      { t:22, z:['normal','cone','normal'] },
      { t:32, z:['cone','normal','normal','normal'] },
      { t:42, z:['cone','cone','bucket','normal'] },
      { t:52, z:['bucket','cone','cone','normal','normal','normal'], rand:{n:4, pool:['normal','cone']} },
      { t:63, z:['bucket','bucket','cone','cone','normal','normal'], rand:{n:5, pool:['normal','cone','bucket']} },
      { t:74, z:['bucket','bucket','bucket','cone','normal','normal','normal'], rand:{n:6, pool:['normal','cone','bucket']} },
      { t:86, z:['bucket','bucket','cone','cone','cone','normal','normal','normal'], rand:{n:7, pool:['normal','cone','bucket']} },
      { t:99, z:['bucket','bucket','bucket','bucket','cone','cone','cone','normal','normal','normal','zamboni','zamboni'], rand:{n:8, pool:['normal','cone','bucket']}, huge:true },
    ],
  },

  {
    id:3, mode:'conveyor', name:'第三关 · 樱桃炸弹',
    tip:'只给樱桃炸弹（Swapspamton），传送带不断送来，最多存 4 张。\n点一张牌，再点格子放下去，炸掉周围一片。\n等 Spamton 聚堆了再炸更划算。',
    conveyor:['cherry'],
    conveyEvery:2.2,
    handMax:4,
    waves:[
      { t:8,  z:['normal','normal'] },
      { t:18, z:['normal','normal','normal'] },
      { t:28, z:['cone','normal','normal'] },
      { t:39, z:['cone','normal','normal','normal','normal'] },
      { t:51, z:['bucket','cone','cone','normal','normal'] },
      { t:64, z:['bucket','bucket','cone','cone','normal','normal','normal','zamboni'] },
      { t:78, z:['bucket','bucket','bucket','cone','cone','cone','normal','normal','normal'] },
      { t:94, z:['bucket','bucket','bucket','bucket','cone','cone','cone','normal','normal','normal','normal','zamboni','zamboni'], huge:true },
    ],
  },
  {
    id:4, mode:'normal', name:'第四关 · 模仿者',
    tip:'只给模仿者（下楼的那位）。放下去它会倒计时，\n然后随机变成一种植物，或者变成一只 Spamton。\n运气也是实力的一部分。',
    plants:['imitator'],
    startSun:200,
    skySunMin:3, skySunMax:5,      // 阳光来得快，才能一直试运气
    transformSunBonus:25,          // 每变身一次给一点阳光补偿
    waves:[
      { t:26,  z:['normal'] },
      { t:48,  z:['normal','normal'] },
      { t:70,  z:['normal','cone'] },
      { t:95,  z:['normal','normal','cone'] },
      { t:120, z:['cone','bucket','normal'] },
      { t:148, z:['normal','cone','cone','bucket'] },
      { t:178, z:['bucket','bucket','cone','normal','normal','zamboni'], huge:true },
    ],
  },
];
