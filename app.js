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
const ALIGN = ['r', 'c', 'l', 'c']; // feed rhythm: right, centre, left, centre

const $ = (id) => document.getElementById(id);
const view = $('view');
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const title = (p) => `${cap(p.series)} ${p.id.split('-')[1]}`;
const byId = Object.fromEntries(PHOTOS.map((p) => [p.id, p]));
const wallpaperKind = (p) => p.h > p.w * 1.1 ? 'Phone wallpaper' : p.w > p.h * 1.1 ? 'Desktop wallpaper' : 'Phone + desktop wallpaper';

// Home sequence: skyline first, then the three series interleaved.
const HOME = (() => {
  const lists = SERIES.map((s) => PHOTOS.filter((p) => p.series === s && p.id !== 'street-21'));
  const out = [byId['street-21']];
  for (let i = 0; lists.some((l) => l[i]); i++) lists.forEach((l) => l[i] && out.push(l[i]));
  return out;
})();

/* ---------- cart (per browser) ---------- */
let cart = [];
try { cart = JSON.parse(localStorage.getItem('jodo-cart')) || []; } catch {}
cart = cart.filter((l) => byId[l.id]);
const saveCart = () => { try { localStorage.setItem('jodo-cart', JSON.stringify(cart)); } catch {} };
const cartLabel = () => `Cart (${cart.length})`;

/* ---------- bar + info panel ---------- */
const progress = $('progress'), infoBtn = $('info-btn'), panel = $('panel');
function setInfo(open) {
  document.body.classList.toggle('info-open', open);
  document.body.classList.toggle('locked', open);
  panel.setAttribute('aria-hidden', !open);
  infoBtn.textContent = open ? 'Close' : 'Info';
}
infoBtn.onclick = () => setInfo(!document.body.classList.contains('info-open'));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setInfo(false); });

function updateProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.textContent = `${max > 0 ? Math.round(Math.min(1, scrollY / max) * 100) : 0}%`;
}
addEventListener('scroll', updateProgress, { passive: true });

/* ---------- photo block: colour fill until the image loads ---------- */
const ph = (p, { src = p.src, ratio = true, lazy = true } = {}) =>
  `<span class="ph" style="--c:${p.color}${ratio ? `;aspect-ratio:${p.w}/${p.h}` : ''}"><img src="${src}" alt="${title(p)} — photograph by Jo Do"${lazy ? ' loading="lazy"' : ''}></span>`;

function wirePhotos() {
  view.querySelectorAll('.ph img').forEach((img) => {
    const done = () => img.parentNode.classList.add('loaded');
    if (img.complete && img.naturalWidth) done(); else img.addEventListener('load', done);
  });
}

const captionObserver = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('seen'); captionObserver.unobserve(e.target); }
}), { threshold: 0.5 });

/* Page background takes the colours of the photo that is 25–75% in view (hero: up to 75%) */
function setBackground(top = '#ffffff', bottom = '#ffffff') {
  document.documentElement.style.setProperty('--bgFrom', top);
  document.documentElement.style.setProperty('--bgTo', bottom);
}
const bgObserver = new IntersectionObserver((entries) => entries.forEach((e) => {
  const p = byId[e.target.dataset.id], min = e.target.classList.contains('hero') ? 0 : 0.25;
  if (e.intersectionRatio >= min && e.intersectionRatio <= 0.75 && e.isIntersecting) setBackground(p.top, p.bottom);
}), { threshold: [0, 0.25, 0.5, 0.75] });

/* ---------- views ---------- */
function renderFeed(list) {
  const [hero, ...rest] = list;
  bgObserver.disconnect();
  setBackground(hero.top, hero.bottom);
  view.innerHTML = `<div class="feed">
    <article class="hero" data-id="${hero.id}"><img src="${hero.src}" alt="${title(hero)} — photograph by Jo Do"></article>
    ${rest.map((p, i) => `<article class="${ALIGN[i % ALIGN.length]}" data-id="${p.id}"><figure>
      <a href="#/shop/${p.id}">${ph(p)}</a>
      <figcaption><aside>${cap(p.series)}</aside><h2>${title(p)}<br><a href="#/shop/${p.id}">Wallpaper &amp; prints</a></h2></figcaption>
    </figure></article>`).join('')}
  </div>`;
  view.querySelectorAll('figcaption').forEach((c) => captionObserver.observe(c));
  view.querySelectorAll('.feed article').forEach((a) => bgObserver.observe(a));
}

const pageNav = (left) => `<nav class="page-nav"><a href="${left[1]}">${left[0]}</a><a href="#/cart" id="cart-link">${cartLabel()}</a></nav>`;

function renderShop() {
  view.innerHTML = `<div class="page">${pageNav(['All work', '#/'])}
    <p class="lede">Wallpapers &amp; prints. Every photograph here is available as a high-resolution wallpaper file and as an archival print, made to order in Brooklyn.</p>
    ${SERIES.map((s) => {
      const list = PHOTOS.filter((p) => p.series === s);
      return `<section class="series"><p>${cap(s)} <span class="muted">${list.length}</span></p><div class="grid">
        ${list.map((p) => `<a href="#/shop/${p.id}">${ph(p, { src: p.thumb, ratio: false })}<span>${title(p)}</span></a>`).join('')}
      </div></section>`;
    }).join('')}</div>`;
}

function renderProduct(p) {
  let size = 1;
  view.innerHTML = `<div class="page">${pageNav(['Shop', '#/shop'])}
    <div class="product">
      ${ph(p, { lazy: false })}
      <div>
        <p>${title(p)}</p>
        <p class="muted">${p.w} × ${p.h} px original</p>
        <div class="opt">
          <p>${wallpaperKind(p)} — $${WALLPAPER_PRICE}</p>
          <p class="muted">Full-resolution file. Instant download after checkout.</p>
          <div class="row"><button type="button" data-add="wallpaper">Add to cart</button></div>
        </div>
        <div class="opt">
          <p>Archival print — <span id="print-price"></span></p>
          <p class="muted">Pigment print on matte paper. Size is the long edge.</p>
          <div class="row">${PRINT_SIZES.map((s, i) => `<button type="button" data-size="${i}">${s.size}</button>`).join('')}</div>
          <div class="row"><button type="button" data-add="print">Add to cart</button></div>
        </div>
        <p class="opt muted" id="added" aria-live="polite"></p>
      </div>
    </div></div>`;
  const sizeBtns = view.querySelectorAll('[data-size]');
  const pickSize = (i) => { size = i; sizeBtns.forEach((b, j) => b.classList.toggle('on', j === i)); $('print-price').textContent = `$${PRINT_SIZES[i].price}`; };
  sizeBtns.forEach((b) => b.onclick = () => pickSize(+b.dataset.size));
  pickSize(size);
  view.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => {
    cart.push(b.dataset.add === 'print'
      ? { id: p.id, kind: 'print', size: PRINT_SIZES[size].size, price: PRINT_SIZES[size].price }
      : { id: p.id, kind: 'wallpaper', price: WALLPAPER_PRICE });
    saveCart();
    $('cart-link').textContent = cartLabel();
    $('added').innerHTML = `Added. <a href="#/cart">View cart</a>`;
  });
}

const lineName = (l) => `${title(byId[l.id])} — ${l.kind === 'print' ? `print ${l.size}` : wallpaperKind(byId[l.id]).toLowerCase()}`;

function renderCart() {
  const total = cart.reduce((s, l) => s + l.price, 0);
  const body = cart.map((l) => `${lineName(l)} — $${l.price}`).join('\n') + `\n\nTotal: $${total}`;
  const mailto = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent('Order — JoDo Media')}&body=${encodeURIComponent(`Hi Jo,\n\nI'd like to order:\n\n${body}\n\nShip to (prints only):\n`)}`;
  view.innerHTML = `<div class="page">${pageNav(['Shop', '#/shop'])}${cart.length ? `
    <ul class="lines">
      ${cart.map((l, i) => `<li><a href="#/shop/${l.id}">${lineName(l)}</a><span>$${l.price}</span><button type="button" data-rm="${i}">Remove</button></li>`).join('')}
      <li class="total"><span>Total</span><span>$${total}</span><span></span></li>
    </ul>
    <div class="actions"><a href="${mailto}">Order by email</a><a href="#/shop">Keep browsing</a></div>
    <p class="muted" style="margin-top:2.4em">Card checkout is coming soon. For now, email the order and Jo will reply with payment details.</p>`
    : `<p>Your cart is empty. <a href="#/shop">Browse wallpapers &amp; prints</a></p>`}</div>`;
  view.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { cart.splice(+b.dataset.rm, 1); saveCart(); renderCart(); wirePhotos(); });
}

/* ---------- router (remembers scroll position per page) ---------- */
const scrollMemo = {};
let current = null;
function route() {
  if (current !== null) scrollMemo[current] = scrollY;
  current = location.hash || '#/';
  const [, a, b] = current.split('/');
  bgObserver.disconnect();
  setBackground();
  if (SERIES.includes(a)) renderFeed(PHOTOS.filter((p) => p.series === a));
  else if (a === 'shop' && byId[b]) renderProduct(byId[b]);
  else if (a === 'shop') renderShop();
  else if (a === 'cart') renderCart();
  else renderFeed(HOME);
  wirePhotos();
  setInfo(false);
  scrollTo(0, scrollMemo[current] || 0);
  updateProgress();
}
addEventListener('hashchange', route);
route();
