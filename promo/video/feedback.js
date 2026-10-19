// 读者反馈段，douyin-v1.html 和 bilibili.html 共用。截图登记在 feedback/list.json，render.mjs 读出来交给 setFeedback(items)：
//   items = [{ src, kind: 'phone' | 'card', focus?: [x, y, 宽, 高] }]（src 是图片地址，focus 是截图里要放大的区域，单位是截图像素）
// 两拍：
//   1. 竖图（kind 'phone'，只用第一张）：截图装进手机框浮上来，focus 区域先框出来，再放大成一张卡片浮在手机上面，字看得清；
//      FB.phoneOut 秒退场。没有竖图就跳过这一拍。
//   2. 横条（kind 'card'，如评论区的一条评论，最多 FB.max 张）：从 FB.t0 秒起（没有竖图时从 FB.t0Solo 秒起）每隔 FB.step 秒
//      浮上来一张，竖着叠，左右轻微错开，留到 FB.out 秒。
// 列表为空时画红色虚线占位框（render.mjs 也会拒绝渲染整片），不会渲染出假内容。
// 页面在 render(t) 末尾调用 feedbackFrame(t)，给放大卡片补上“从框里长出来”的动画。
window.setupFeedback = (FB) => {
  const clamp = (x) => Math.min(Math.max(x, 0), 1);
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const box = document.getElementById('feedback');
  let zoom = null;

  window.feedbackFrame = (t) => {
    if (!zoom || t < zoom.tin || t >= FB.phoneOut) return;
    const k = ease((t - zoom.tin) / 0.6);
    zoom.el.style.transform = `translate(${zoom.dx * (1 - k)}px, ${zoom.dy * (1 - k)}px) scale(${zoom.s + (1 - zoom.s) * k})`;
  };

  const el = (cls, style, data) => {
    const d = document.createElement('div');
    d.className = `el ${cls}`;
    Object.assign(d.style, style);
    Object.assign(d.dataset, { ...data });
    box.append(d);
    return d;
  };
  const load = async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
  };

  // 竖图：手机框 + 放大卡片
  const phone = async (item) => {
    const img = await load(item.src);
    const [ax, ay, aw, ah] = FB.area, b = FB.bezel;
    const sh = ah - 2 * b, s = sh / img.naturalHeight, sw = img.naturalWidth * s;
    const px = ax + (aw - sw - 2 * b) * FB.phoneAlign, py = ay;
    const frame = el('fb-phone', { left: `${px}px`, top: `${py}px`, width: `${sw + 2 * b}px`, height: `${ah}px`, borderWidth: `${b}px` }, { in: FB.phoneIn, out: FB.phoneOut, fx: 'up' });
    img.style.width = `${sw}px`;
    frame.append(img);
    const [fx, fy, fw, fh] = item.focus ?? [0, 0, img.naturalWidth, img.naturalHeight];
    // 手机里 focus 区域的位置（舞台坐标）
    const r = { x: px + b + fx * s, y: py + b + fy * s, w: fw * s, h: fh * s };
    el('fb-focus', { left: `${r.x - 8}px`, top: `${r.y - 8}px`, width: `${r.w + 16}px`, height: `${r.h + 16}px` }, { in: FB.callIn - 0.35, out: FB.phoneOut, fx: 'fade' });
    // 放大卡片：宽 FB.callW，竖直方向和 focus 对齐，水平按 FB.callAlign 摆（0.5 居中，1 靠右）
    const cs = FB.callW / fw, ch = fh * cs;
    const cx = ax + (aw - FB.callW) * FB.callAlign, cy = r.y + r.h / 2 - ch / 2;
    const call = el('fb-call', { left: `${cx}px`, top: `${cy}px`, width: `${FB.callW}px`, height: `${ch}px` }, { in: FB.callIn, out: FB.phoneOut, fx: 'fade' });
    const big = img.cloneNode();
    Object.assign(big.style, { width: `${img.naturalWidth * cs}px`, marginLeft: `${-fx * cs}px`, marginTop: `${-fy * cs}px` });
    call.append(big);
    zoom = { el: call, tin: FB.callIn, s: r.w / FB.callW, dx: r.x + r.w / 2 - (cx + FB.callW / 2), dy: 0 };
  };

  // 横条：竖着叠的卡片；占位框也走这里
  const cards = async (list, t0) => {
    const items = list.length
      ? await Promise.all(list.map(async (it) => { const img = await load(it.src); return { img, w: img.naturalWidth, h: img.naturalHeight }; }))
      : [0, 1, 2].map(() => ({ w: 340, h: 85 }));
    const [ax, ay, aw, ah] = FB.area, n = items.length, sway = n > 1 ? FB.sway : 0;
    const fixed = n * 2 * FB.pad + (n - 1) * FB.gap;
    const s = Math.min(FB.scale, (ah - fixed) / items.reduce((a, it) => a + it.h, 0));
    for (const it of items) it.s = Math.min(s, (aw - 2 * FB.pad - 2 * sway) / it.w);
    let y = ay + (ah - fixed - items.reduce((a, it) => a + it.h * it.s, 0)) / 2;
    items.forEach((it, i) => {
      const w = it.w * it.s + 2 * FB.pad, h = it.h * it.s + 2 * FB.pad;
      const card = el(`fb-card${it.img ? '' : ' placeholder'}`, { left: `${ax + (aw - w) / 2 + (i % 2 ? sway : -sway)}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, padding: `${FB.pad - 3}px` }, { in: t0 + i * FB.step, out: FB.out, fx: 'up' });
      if (it.img) {
        Object.assign(it.img.style, { width: `${it.w * it.s}px`, height: `${it.h * it.s}px` });
        card.append(it.img);
      } else card.textContent = '占位：反馈截图放进 promo/video/feedback/ 并登记到 list.json';
      y += h + FB.gap;
    });
  };

  window.setFeedback = async (items) => {
    box.innerHTML = '';
    zoom = null;
    const first = items.find((it) => it.kind === 'phone');
    const list = items.filter((it) => it.kind !== 'phone').slice(0, FB.max);
    if (first) await phone(first);
    if (list.length || !first) await cards(list, first ? FB.t0 : FB.t0Solo);
    return { phone: first ? 1 : 0, cards: list.length };
  };
  return window.setFeedback([]);
};
