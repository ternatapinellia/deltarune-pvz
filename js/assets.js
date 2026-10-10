/* =========================================================
   资源加载 + 像素级绘制
   —— 图按“整数倍”放大，保证像素锐利不糊
   —— 没图时画方块 + 名字占位
   ========================================================= */

const Assets = (function () {

  const cache = {};

  function pathFor(key) {
    if (key.indexOf('plant:') === 0)  return 'assets/plants/'  + key.slice(6) + '.png';
    if (key.indexOf('zombie:') === 0) return 'assets/zombies/' + key.slice(7) + '.png';
    if (key === 'bg')                 return 'assets/bg/lawn.png';
    if (key === 'sun')                return 'assets/sun.png';
    return 'assets/' + key + '.png';
  }

  function colorFor(key) {
    if (key.indexOf('plant:') === 0)  return COLORS[key.slice(6)] || '#7a6fa8';
    if (key.indexOf('zombie:') === 0) return COLORS[key.slice(7)] || '#d8d3e0';
    return '#4a4258';
  }

  function get(key) {
    if (key in cache) return cache[key];
    const img = new Image();
    cache[key] = null;
    img.onload  = function () { cache[key] = img; };
    img.onerror = function () { cache[key] = null; };
    img.src = pathFor(key);
    return null;
  }

  /* 选一个“整数或有理”倍率，保证像素网格对齐
     先试放大 4/3/2 倍，再试 1 倍，最后按 1/2、1/3、1/4 缩小 */
  const SCALES = [4, 3, 2, 1, 0.5, 0.3334, 0.25];
  function fitScale(iw, ih, maxW, maxH) {
    for (let i = 0; i < SCALES.length; i++) {
      const s = SCALES[i];
      if (iw * s <= maxW && ih * s <= maxH) return s;
    }
    return 0.25;
  }

  function draw(ctx, key, name, cx, cy, maxW, maxH) {
    const img = get(key);

    if (img && img.complete && img.naturalWidth) {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const s  = fitScale(iw, ih, maxW, maxH);
      const w  = Math.round(iw * s), h = Math.round(ih * s);
      ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
      return;
    }

    /* ---- 占位：像素风方块 ---- */
    const w = Math.round(maxW), h = Math.round(maxH);
    const x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);

    ctx.fillStyle = colorFor(key);
    ctx.fillRect(x, y, w, h);

    /* 深色描边（像素风用硬边） */
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(x, y, w, 3);
    ctx.fillRect(x, y + h - 3, w, 3);
    ctx.fillRect(x, y, 3, h);
    ctx.fillRect(x + w - 3, y, 3, h);

    /* 左上高光 */
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(x + 6, y + 6, w - 12, 8);

    if (name) {
      ctx.fillStyle = 'rgba(0,0,0,.78)';
      ctx.font = 'bold 11px "Courier New",Consolas,monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, cx, cy, w - 8);
    }
  }

  return { get: get, draw: draw, pathFor: pathFor, fitScale: fitScale };
})();