// Version B, after juliajohnson.com. Photos and colours come from ../data.js.
// Placeholder prices — set real ones before launch.
const WALLPAPER_PRICE = 5;
const PRINT_SIZES = [ // long edge in inches
  { size: '12″', price: 40 },
  { size: '18″', price: 70 },
  { size: '24″', price: 110 },
  { size: '36″', price: 180 },
];
const ORDER_EMAIL = 'jodo.media1@gmail.com';
const SERIES = ['portrait', 'street', 'concert'];
const ROOT = '../';

const $ = (id) => document.getElementById(id);
const view = $('view');
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const title = (p) => `${cap(p.series)} ${p.id.split('-')[1]}`;
const byId = Object.fromEntries(PHOTOS.map((p) => [p.id, p]));
const wallpaperKind = (p) => p.h > p.w * 1.1 ? 'Phone wallpaper' : p.w > p.h * 1.1 ? 'Desktop wallpaper' : 'Phone + desktop wallpaper';
const alt = (p) => `${title(p)} — photograph by Jo Do`;
const mod = (a, n) => ((a % n) + n) % n;

// Each print hangs a little crooked, with its tape at its own angle (fixed per position, not random).
const tilt = (i) => `--r:${((i * 7) % 9 - 4) * 0.7}deg;--t:${((i * 5) % 7 - 3) * 2}deg`;

// Home sequence: skyline first, then the three series interleaved.
const HOME = (() => {
  const lists = SERIES.map((s) => PHOTOS.filter((p) => p.series === s && p.id !== 'street-21'));
  const out = [byId['street-21']];
  for (let i = 0; lists.some((l) => l[i]); i++) lists.forEach((l) => l[i] && out.push(l[i]));
  return out;
})();

/* ---------- cart (per browser) ---------- */
let cart = [];
try { cart = JSON.parse(localStorage.getItem('jodo-cart-b')) || []; } catch {}
cart = cart.filter((l) => byId[l.id]);
const saveCart = () => { try { localStorage.setItem('jodo-cart-b', JSON.stringify(cart)); } catch {} };
const showCartCount = () => { $('cart-link').textContent = cart.length ? `Cart (${cart.length})` : ''; };

/* ---------- menu ---------- */
const menu = $('menu'), menuBtn = $('menu-btn'), menuImages = $('menu-images');
const MENU_PHOTOS = {
  portrait: ['portrait-02', 'portrait-09', 'portrait-07'],
  street: ['street-05', 'street-13', 'street-08'],
  concert: ['concert-02', 'concert-09', 'concert-06'],
  shop: ['portrait-04', 'concert-01', 'street-01'],
  about: ['portrait-12', 'street-16', 'concert-10'],
};
menuImages.innerHTML = Object.entries(MENU_PHOTOS).map(([key, ids]) =>
  ids.map((id) => `<img data-key="${key}" src="${ROOT + byId[id].thumb}" alt="" loading="lazy">`).join('')).join('');
function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  document.body.classList.toggle('locked', open);
  menu.setAttribute('aria-hidden', !open);
  menuBtn.setAttribute('aria-expanded', open);
  if (!open) setMenuKey('');
}
function setMenuKey(key) {
  menu.dataset.key = key;
  menuImages.querySelectorAll('img').forEach((img) => img.classList.toggle('on', img.dataset.key === key));
}
menuBtn.onclick = () => setMenu(!document.body.classList.contains('menu-open'));
$('menu-links').querySelectorAll('a').forEach((a) => {
  a.addEventListener('mouseenter', () => setMenuKey(a.dataset.key));
  a.addEventListener('mouseleave', () => setMenuKey(''));
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* ---------- infinite canvas: columns of cells that drift, drag and wrap ---------- */
const HEIGHTS = [480, 600, 360]; // cell heights at a 480px cell width, as on the reference
let stopCanvas = null;

function renderCanvas(photos) {
  document.body.classList.remove('page-mode');
  let list = photos;
  while (list.length < 24) list = list.concat(photos); // small series repeat so the wall stays full
  view.innerHTML = `<div class="canvas">${list.map((p, i) =>
    `<div class="cell"><a class="poster${i % 3 ? '' : ' two'}" href="#/shop/${p.id}" draggable="false" style="--c:${p.color};${tilt(i)}"><img src="${ROOT + p.thumb}" alt="${alt(p)}" draggable="false" loading="lazy"></a></div>`).join('')}</div>`;
  const canvas = view.firstElementChild;
  const els = [...canvas.children];
  els.forEach((el) => { const img = el.querySelector('img'); img.onload = () => img.classList.add('in'); if (img.complete) img.classList.add('in'); });

  let cells = [], W = 0, H = 0, unit = 1;
  function layout() {
    const cw = Math.max(innerWidth / 3, 260), pad = cw * 0.09;
    unit = cw / 480;
    const cols = [[], [], [], [], [], []];
    list.forEach((p, i) => {
      const col = i % 6, h = HEIGHTS[(Math.floor(i / 6) + col) % 3] * unit;
      cols[col].push({ el: els[i], p, h });
    });
    W = cw * 6;
    H = Math.max(...cols.map((c) => c.reduce((s, x) => s + x.h, 0)));
    cells = [];
    cols.forEach((col, ci) => {
      const spare = (H - col.reduce((s, x) => s + x.h, 0)) / col.length; // even out column lengths
      let y = 0;
      col.forEach((c) => {
        const iw = cw - 2 * pad, ih = c.h - 2 * pad, ratio = c.p.w / c.p.h;
        const [w, h] = ratio > iw / ih ? [iw, iw / ratio] : [ih * ratio, ih];
        Object.assign(c.el.style, { width: `${cw}px`, height: `${c.h}px` });
        Object.assign(c.el.firstElementChild.style, { width: `${w}px`, height: `${h}px` });
        cells.push({ ...c, bx: ci * cw, by: y, cw });
        y += c.h + spare;
      });
    });
  }

  // Pan state: target follows wheel, drag and drift; current eases toward it.
  let tx = 0, ty = 0, cx = 0, cy = 0, last = performance.now(), raf = 0;
  let drag = null, moved = 0;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!drag && !still) { tx += 30 * unit * dt; ty -= 30 * unit * dt; }
    cx += (tx - cx) * Math.min(1, dt * 7); cy += (ty - cy) * Math.min(1, dt * 7);
    for (const c of cells) {
      const x = mod(c.bx + cx + c.cw, W) - c.cw, y = mod(c.by + cy + c.h, H) - c.h;
      c.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    raf = requestAnimationFrame(frame);
  }

  const onWheel = (e) => { e.preventDefault(); tx -= e.deltaX; ty -= e.deltaY; };
  const onDown = (e) => { drag = { x: e.clientX, y: e.clientY }; moved = 0; };
  const onMove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY };
    moved += Math.abs(dx) + Math.abs(dy);
    tx += dx; ty += dy; cx += dx; cy += dy;
    document.documentElement.classList.toggle('dragging', moved > 6);
  };
  const onUp = () => { drag = null; document.documentElement.classList.remove('dragging'); };
  const onClick = (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } };
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('click', onClick, true);
  addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onUp);
  addEventListener('resize', layout);

  layout();
  raf = requestAnimationFrame(frame);
  stopCanvas = () => {
    cancelAnimationFrame(raf);
    removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp);
    removeEventListener('pointercancel', onUp); removeEventListener('resize', layout);
  };
}

/* ---------- content pages ---------- */
const photoBlock = (p, src = p.src, lazy = true, style = '') =>
  `<span class="poster" style="--c:${p.color};${style}"><img src="${ROOT + src}" alt="${alt(p)}" width="${p.w}" height="${p.h}"${lazy ? ' loading="lazy"' : ''}></span>`;

function renderAbout() {
  view.innerHTML = `<div class="page"><h1>About me</h1><div class="narrow">
    <p>Hi! I’m Johanan, also known as Jo Do. I’m a Brooklyn based photographer and videographer. I began my journey in photography, and more recently videography, in 2020. At a time where fear and uncertainty loomed over us all, I took it upon myself to grab my camera and still find the beauty in such a difficult time.</p>
    <p>Since then I have worked on various projects, music events and collaborated with other content creators and artists. It is my belief that art allows us to access our inner most thoughts, passions, fears and aspirations that other mediums simply cannot. That said, it is my passion and calling to bring your vision to life. Let’s create!</p>
    <div class="row" style="margin-top:40px">
      <a class="action" href="mailto:jodo.media1@gmail.com">jodo.media1@gmail.com</a>
      <a class="action" href="tel:+16464062143">(646) 406-2143</a>
      <a class="action" href="https://www.instagram.com/jo___do/" target="_blank" rel="noopener">Instagram</a>
    </div></div></div>`;
}

function renderShop() {
  view.innerHTML = `<div class="page"><h1>Wallpapers &amp; prints</h1>
    <p class="small narrow">Every photograph is available as a high-resolution wallpaper file and as an archival print, made to order in Brooklyn. Pick a photo to see options.</p>
    ${SERIES.map((s) => `<section class="shop-series"><p>${cap(s)}</p><div class="shop-grid">
      ${PHOTOS.filter((p) => p.series === s).map((p, i) => `<a href="#/shop/${p.id}">${photoBlock(p, p.thumb, true, tilt(i))}<span class="cap">${title(p)}</span></a>`).join('')}
    </div></section>`).join('')}</div>`;
}

function renderProduct(p) {
  let size = 1;
  view.innerHTML = `<div class="page product">
    ${photoBlock(p, p.src, false, '--r:-1deg')}
    <div>
      <h1>${title(p)}</h1>
      <p class="small">${p.w} × ${p.h} px original</p>
      <div class="opt">
        <p>${wallpaperKind(p)} — $${WALLPAPER_PRICE}</p>
        <p class="small">Full-resolution file. Instant download after checkout.</p>
        <div class="row"><button class="action" type="button" data-add="wallpaper">Add to cart</button></div>
      </div>
      <div class="opt">
        <p>Archival print — <span id="print-price"></span></p>
        <p class="small">Pigment print on matte paper. Size is the long edge.</p>
        <div class="row">${PRINT_SIZES.map((s, i) => `<button class="size" type="button" data-size="${i}">${s.size}</button>`).join('')}</div>
        <div class="row"><button class="action" type="button" data-add="print">Add to cart</button></div>
      </div>
      <p class="opt small" id="added" aria-live="polite"></p>
    </div>
  </div>`;
  const sizeBtns = view.querySelectorAll('[data-size]');
  const pickSize = (i) => { size = i; sizeBtns.forEach((b, j) => b.classList.toggle('on', j === i)); $('print-price').textContent = `$${PRINT_SIZES[i].price}`; };
  sizeBtns.forEach((b) => b.onclick = () => pickSize(+b.dataset.size));
  pickSize(size);
  view.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => {
    cart.push(b.dataset.add === 'print'
      ? { id: p.id, kind: 'print', size: PRINT_SIZES[size].size, price: PRINT_SIZES[size].price }
      : { id: p.id, kind: 'wallpaper', price: WALLPAPER_PRICE });
    saveCart(); showCartCount();
    $('added').innerHTML = `Added. <a href="#/cart" style="text-decoration:underline">View cart</a>`;
  });
}

const lineName = (l) => `${title(byId[l.id])} — ${l.kind === 'print' ? `print ${l.size}` : wallpaperKind(byId[l.id]).toLowerCase()}`;

function renderCart() {
  const total = cart.reduce((s, l) => s + l.price, 0);
  const body = cart.map((l) => `${lineName(l)} — $${l.price}`).join('\n') + `\n\nTotal: $${total}`;
  const mailto = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent('Order — JoDo Media')}&body=${encodeURIComponent(`Hi Jo,\n\nI'd like to order:\n\n${body}\n\nShip to (prints only):\n`)}`;
  view.innerHTML = `<div class="page"><h1>Cart</h1><div class="narrow">${cart.length ? `
    <ul class="lines">
      ${cart.map((l, i) => `<li><a href="#/shop/${l.id}">${lineName(l)}</a><span>$${l.price}</span><button type="button" class="small" data-rm="${i}">Remove</button></li>`).join('')}
      <li class="total"><span>Total</span><span>$${total}</span><span></span></li>
    </ul>
    <div class="row" style="margin-top:40px"><a class="action" href="${mailto}">Order by email</a><a class="action" href="#/shop">Keep browsing</a></div>
    <p class="small" style="margin-top:40px">Card checkout is coming soon. For now, email the order and Jo will reply with payment details.</p>`
    : `<p>Your cart is empty.</p><div class="row"><a class="action" href="#/shop">Browse wallpapers &amp; prints</a></div>`}</div></div>`;
  view.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { cart.splice(+b.dataset.rm, 1); saveCart(); showCartCount(); renderCart(); });
}

/* ---------- router ---------- */
function route() {
  if (stopCanvas) { stopCanvas(); stopCanvas = null; }
  const [, a, b] = (location.hash || '#/').split('/');
  document.body.classList.add('page-mode');
  if (SERIES.includes(a)) renderCanvas(PHOTOS.filter((p) => p.series === a));
  else if (a === 'shop' && byId[b]) renderProduct(byId[b]);
  else if (a === 'shop') renderShop();
  else if (a === 'cart') renderCart();
  else if (a === 'about') renderAbout();
  else renderCanvas(HOME);
  showCartCount();
  setMenu(false);
  scrollTo(0, 0);
}
addEventListener('hashchange', route);
route();
