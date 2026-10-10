# 暗世界保卫战 · Deltarune x PvZ

一个受《植物大战僵尸》启发的塔防小游戏，角色来自 Deltarune 暗世界。
纯前端（HTML + Canvas），无需安装任何东西，双击或部署到网页即可玩。

## 目录

| 路径 | 说明 |
|---|---|
| `index.html` | 入口页面 |
| `style.css` | 界面样式 |
| `js/config.js` | **所有数值与角色配置（想调手感改这里）** |
| `js/assets.js` | 图片加载（有图用图，没图用色块占位） |
| `js/game.js` | 游戏主逻辑 |
| `assets/plants/` | 植物图 |
| `assets/zombies/` | 僵尸图 |
| `assets/bg/` | 背景图 |
| `assets/sun.png` | 阳光图 |

## 怎么玩

用本地服务器打开（直接双击 html 也能玩，但建议起服务）：

```bash
cd D:\PvZ-Deltarune
python -m http.server 8901
```

然后浏览器访问 <http://127.0.0.1:8901>

**网址后加 `?level=N` 可直接进第 N 关**，例如 `?level=2`。

操作：点顶栏卡片 -> 点草坪格子种下。空格暂停，Esc 退出到选关。

## 四个关卡

| 关卡 | 玩法 |
|---|---|
| 第一关 · 前院 | 普通关卡，阳光 + 卡片冷却 |
| 第二关 · 坚果保龄球 | 坚果自动补给，点某一行滚出去撞僵尸 |
| 第三关 · 樱桃炸弹 | 传送带只给樱桃炸弹，点格子放下去炸一片 |
| 第四关 · 模仿者 | 只有模仿者，1-2 秒后随机变植物或僵尸 |

## 角色对应

**植物**

| 游戏位置 | 角色 | 图片文件 |
|---|---|---|
| 向日葵 | Flowery | `assets/plants/flowery.png` |
| 双头向日葵 | Tenna | `assets/plants/tenna.png` |
| 豌豆射手 | Green | `assets/plants/green.png` |
| 机枪豌豆 | Yellow | `assets/plants/yellow.png` |
| 坚果 | 饮水机 | `assets/plants/dispenser.png` |
| 土豆地雷 | Swaptenna | `assets/plants/swaptenna.png` |
| 地刺 | Ralsai | `assets/plants/ralsai.png` |
| 樱桃炸弹 | Swapspamton | `assets/plants/swapspamton.png` |
| 模仿者 | （待定） | `assets/plants/imitator.png` |
| 铲子 | Lancer | `assets/plants/lancer.png` |

**僵尸**（都是 Spamton 的不同形态）

| 类型 | 图片文件 |
|---|---|
| 普通 | `assets/zombies/spamton.png` |
| 路障 | `assets/zombies/spamton_cone.png` |
| 铁桶 | `assets/zombies/spamton_bucket.png` |
| 舞王 | `assets/zombies/spamton_dancer.png` |

**其他**

| 用途 | 文件 |
|---|---|
| 阳光 | `assets/sun.png` |
| 背景（可选） | `assets/bg/lawn.png` |

## 画图要求

- 格式：**PNG，透明背景**
- 尺寸：**32x32**（僵尸建议 32x40），脚本会自动按整数倍放大
- 像素风：关掉抗锯齿笔刷，边缘保持硬；每色角色 4-6 个颜色够用
- **放进去刷新页面就自动替换占位色块，不用改代码**
- 文件名必须和上表一致

没放图时显示色块 + 名字，游戏照样能玩。

## 想改数值

都在 `js/config.js`：

```javascript
const CFG = {
  sunValue: 50,          // 每朵阳光值
  autoSun: true,         // 阳光自动收集
  skySunMin: 11,         // 天降阳光间隔（秒）
  skySunMax: 16,
  bulletSpeed: 420,      // 子弹速度
  nutDamage: 460,        // 保龄球伤害（普通1下/路障2下/铁桶3下）
  nutExplodeRadius: 1.9, // 爆炸坚果范围
  imitatorZombieHp: 0.6, // 模仿者变出的僵尸血量倍率
  imitatorZombieSpeed: 0.7,
};
```

植物和僵尸的数值也在同一个文件的 `PLANTS` 和 `ZOMBIES` 里。

## 部署

推到 GitHub 后，在仓库 Settings -> Pages 里选 `main` 分支根目录即可。
