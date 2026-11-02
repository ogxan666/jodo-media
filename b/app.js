// Version B. Photos and colours come from ../data.js.
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

// Hairline frame: the DESIGN-2 accent nearest the photo's most vivid hue; black for neutral photos.
function frameColor(p) {
  const hex = [p.top, p.bottom].find((c) => c !== '#e9e6e1');
  if (!hex) return '#000000';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 330) return '#e21715'; // vermillion
  if (h < 40) return '#f2572c';             // marigold
  if (h < 70) return '#b3813c';             // brass
  if (h < 170) return '#5bc52c';            // fern
  return '#086392';                         // cobalt
}
const vars = (p) => `--f:${frameColor(p)};--c:${p.color}`;
const img = (p, src = p.src, lazy = true) => `<img src="${ROOT + src}" alt="${title(p)} — photograph by Jo Do" width="${p.w}" height="${p.h}"${lazy ? ' loading="lazy"' : ''}>`;

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

/* ---------- views ---------- */
// Masonry, broken by a full-width landscape roughly every eight tiles (and at the very top).
function renderGallery(list) {
  const parts = [];
  let tiles = [];
  list.forEach((p, i) => {
    if (p.w > p.h * 1.3 && (i === 0 || tiles.length >= 8)) {
      if (tiles.length) parts.push(`<div class="masonry">${tiles.join('')}</div>`);
      tiles = [];
      parts.push(`<a class="break" href="#/shop/${p.id}" style="${vars(p)}">${img(p, p.src, i > 0)}</a>`);
    } else {
      tiles.push(`<a class="tile" href="#/shop/${p.id}" style="${vars(p)}"><span class="frame">${img(p)}</span><span class="cap">${title(p)}</span></a>`);
    }
  });
  if (tiles.length) parts.push(`<div class="masonry">${tiles.join('')}</div>`);
  view.innerHTML = parts.join('');
}

function renderInfo() {
  view.innerHTML = `<div class="page">
    <h2>About Johanan</h2>
    <p>Hi! I’m Johanan, also known as Jo Do. I’m a Brooklyn based photographer and videographer. I began my journey in photography, and more recently videography, in 2020. At a time where fear and uncertainty loomed over us all, I took it upon myself to grab my camera and still find the beauty in such a difficult time.</p>
    <p>Since then I have worked on various projects, music events and collaborated with other content creators and artists. It is my belief that art allows us to access our inner most thoughts, passions, fears and aspirations that other mediums simply cannot. That said, it is my passion and calling to bring your vision to life. Let’s create!</p>
    <div class="row" style="margin-top:43px">
      <a class="action" href="mailto:jodo.media1@gmail.com">jodo.media1@gmail.com</a>
      <a class="action" style="--f:#2e99c9" href="tel:+16464062143">(646) 406-2143</a>
      <a class="action" href="https://www.instagram.com/jo___do/" target="_blank" rel="noopener">Instagram</a>
    </div>
  </div>`;
}

function renderShop() {
  view.innerHTML = `<div class="page"><h2>Wallpapers &amp; prints</h2>
    <p class="small">Every photograph is available as a high-resolution wallpaper file and as an archival print, made to order in Brooklyn. Pick a photo to see options.</p></div>
    ${SERIES.map((s) => {
      const list = PHOTOS.filter((p) => p.series === s);
      return `<section class="shop-series"><p>${cap(s)}</p><div class="masonry">
        ${list.map((p) => `<a class="tile" href="#/shop/${p.id}" style="${vars(p)}"><span class="frame">${img(p, p.thumb)}</span><span class="cap">${title(p)}</span></a>`).join('')}
      </div></section>`;
    }).join('')}`;
}

function renderProduct(p) {
  let size = 1;
  view.innerHTML = `<div class="page product" style="${vars(p)}">
    <span class="frame">${img(p, p.src, false)}</span>
    <div>
      <h2>${title(p)}</h2>
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
    $('added').innerHTML = `Added. <a class="cap" href="#/cart">View cart</a>`;
  });
}

const lineName = (l) => `${title(byId[l.id])} — ${l.kind === 'print' ? `print ${l.size}` : wallpaperKind(byId[l.id]).toLowerCase()}`;

function renderCart() {
  const total = cart.reduce((s, l) => s + l.price, 0);
  const body = cart.map((l) => `${lineName(l)} — $${l.price}`).join('\n') + `\n\nTotal: $${total}`;
  const mailto = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent('Order — JoDo Media')}&body=${encodeURIComponent(`Hi Jo,\n\nI'd like to order:\n\n${body}\n\nShip to (prints only):\n`)}`;
  view.innerHTML = `<div class="page"><h2>Cart</h2>${cart.length ? `
    <ul class="lines">
      ${cart.map((l, i) => `<li><a href="#/shop/${l.id}">${lineName(l)}</a><span>$${l.price}</span><button type="button" class="small" data-rm="${i}">Remove</button></li>`).join('')}
      <li class="total"><span>Total</span><span>$${total}</span><span></span></li>
    </ul>
    <div class="row" style="margin-top:43px"><a class="action" href="${mailto}">Order by email</a><a class="action" style="--f:#2e99c9" href="#/shop">Keep browsing</a></div>
    <p class="small" style="margin-top:43px">Card checkout is coming soon. For now, email the order and Jo will reply with payment details.</p>`
    : `<p>Your cart is empty.</p><div class="row"><a class="action" href="#/shop">Browse wallpapers &amp; prints</a></div>`}</div>`;
  view.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { cart.splice(+b.dataset.rm, 1); saveCart(); showCartCount(); renderCart(); });
}

/* ---------- router (remembers scroll position per page) ---------- */
const scrollMemo = {};
let current = null;
function route() {
  if (current !== null) scrollMemo[current] = scrollY;
  current = location.hash || '#/';
  const [, a, b] = current.split('/');
  if (SERIES.includes(a)) renderGallery(PHOTOS.filter((p) => p.series === a));
  else if (a === 'shop' && byId[b]) renderProduct(byId[b]);
  else if (a === 'shop') renderShop();
  else if (a === 'cart') renderCart();
  else if (a === 'info') renderInfo();
  else renderGallery(HOME);
  document.querySelectorAll('.nav a').forEach((l) => l.classList.toggle('on', l.getAttribute('href') === `#/${a}`));
  showCartCount();
  scrollTo(0, scrollMemo[current] || 0);
}
addEventListener('hashchange', route);
route();
