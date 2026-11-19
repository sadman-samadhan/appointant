// AM Barbershop menu. Prices in CAD, from the shop's booking site (ambarbershop.barberly.app).
// To change a price or add a service, edit this list.
const MENU = [
  { group: 'Signature', items: [
    { name: 'AM Treatment', price: 120, note: 'Haircut, shaving or beard trim, face massage, scalp massage and shampoo condition.' },
    { name: 'Luxury Shaving', price: 65 },
    { name: 'Wolf Cut', price: 65 },
  ]},
  { group: 'Haircuts', items: [
    { name: 'Regular Haircut', price: 30 },
    { name: 'Skin & Taper Fade', price: 30 },
    { name: 'Blowout Taper', price: 30 },
    { name: 'Textured Haircut', price: 30 },
    { name: 'Senior Haircut', price: 25 },
    { name: 'Kids Haircut (7 to 12 years)', price: 25 },
    { name: 'Kids Haircut (under 7 years)', price: 25 },
  ]},
  { group: 'Combos', items: [
    { name: 'Haircut & Shaving', price: 52 },
    { name: 'Haircut & Beard Trim', price: 50 },
    { name: 'Head Shave & Beard Trim', price: 50 },
  ]},
  { group: 'Beard, Shave & Face', items: [
    { name: 'Head Shaving', price: 30 },
    { name: 'Hot Towel Shave', price: 30 },
    { name: 'Beard Trim', price: 25 },
    { name: 'Facial Massage', price: 30 },
  ]},
];

(function renderMenu() {
  const list = document.getElementById('price-list');
  if (!list) return;
  const html = [];
  MENU.forEach((section, i) => {
    // No group titles on the page, just a thin line between groups.
    if (i) html.push('<li class="group" aria-hidden="true"></li>');
    for (const item of section.items) {
      html.push(`<li><span class="name">${item.name.replace(/&/g, '&amp;')}</span><span class="price">$${item.price}</span></li>`);
      if (item.note) html.push(`<li class="note">${item.note}</li>`);
    }
  });
  list.innerHTML = html.join('');
})();

// Phone menu
(function mobileMenu() {
  const toggle = document.querySelector('.nav__toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;
  const set = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
  };
  toggle.addEventListener('click', () => set(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  // Close it if the window grows wide enough for the full top bar.
  window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => { if (e.matches) set(false); });
})();

// Google reviews from AM Barbershop's public Google Maps listing, as of 16 Nov 2026, newest first.
// `date` is worked out from what Google showed that day ("3 weeks ago" and so on).
// To add one: copy the name, stars, text and roughly when it was posted.
const REVIEWS = [
  { name: "Nash Thomas", stars: 5, date: '2026-11-09',
    text: "They are alway's on point with a haircut, cannot go wrong at all. I highly recommend" },
  { name: "Angeles Busa", stars: 5, date: '2026-10-26',
    text: "Sulaiman did an awesome job for my boys specially my youngest who had always hated getting haircuts, which was always challenging for us. He was patient with us and listened to our preferences. He also checked in with us often, and offered to do some touch-ups. Nice and clean place, too! The boys loved their cuts and would definitely come back!" },
  { name: "Abdullah Seyya", stars: 5, date: '2026-10-26',
    text: "Great experience! Special thanks to the professional barber MO for his neat work and great style. Highly recommended!" },
  { name: "Johnny Deep", stars: 5, date: '2026-10-26',
    text: "One of the best barbershops I’ve been to. Professional staff, sharp fades, and a welcoming vibe. You can tell they really care about their work and their customer." },
  { name: "Damian", stars: 5, date: '2026-10-16',
    text: "Absolutely incredible! Im beyond happy with the hair cut and beard trim. My first time there, I will Absolutely be going back every single time now. You prevailed above expectations and im grateful!" },
  { name: "Zach Thibodeau", stars: 5, date: '2026-10-16',
    text: "In and out in 15 minutes. Got exactly what I asked for. 10/10 service would highly recommend, Mou was great" },
  { name: "Graeme Pearce", stars: 5, date: '2026-09-16',
    text: "What a great experience. The shop was clean, Mou is a great barber. His attention to detail is awesome. He gave me exactly what I wanted and is super talented. Will definitely be coming back!" },
  { name: "Joey Theroux", stars: 5, date: '2026-09-16',
    text: "Great service, very accommodating, clean & professional! He cut my son's hair before going back to school and was very patient." },
  { name: "Laura Daou", stars: 5, date: '2026-09-16',
    text: "They were efficient and had a relaxing atmosphere. My son has been all smiles since getting his hair cut and has been showing off his new cut to everyone. Great service and a great location!" },
  { name: "Omar M", stars: 5, date: '2026-09-16',
    text: "Even though i changed my appointment 3 times no one brought it up came back after some time for an adjustment and did it free of charge and told me if there is anything i can always come back 100% would recommend very friendly and professional" },
  { name: "Marie Michaud", stars: 5, date: '2026-09-16',
    text: "Excellent service, it's my son go to, we don't visit any other barbershop." },
  { name: "Andrew Thompson", stars: 5, date: '2026-08-16',
    text: "Sully is the goat of trimming beards. He’s a great barber and a great man. I always leave his shop extremely satisfied." },
  { name: "Charles Hartford", stars: 5, date: '2026-07-16',
    text: "They did a great job of cleaning up a \"not great\" haircut that I had received. He was quick and the price was great. Also nicely decorated. Stepping into some barbershops they can appear dingey and dark." },
  { name: "Ryan Demontigny", stars: 5, date: '2026-07-16',
    text: "Good haircut, skin fade was nice and quick. Great customer service and care. Went back and once again got good service and the buzzcut/fade was on point. I defeated recommend this sport for fades and customer service in Fredericton area." },
  { name: "Maddox Khoury", stars: 5, date: '2026-06-16',
    text: "One of the best haircuts I’ve ever gotten! It was very fast and clean. I would definitely recommend if you want a good haircut." },
];

function timeAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso + 'T12:00:00').getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days < 7) return days === 1 ? 'a day ago' : `${days} days ago`;
  if (days < 30) { const w = Math.round(days / 7); return w <= 1 ? 'a week ago' : `${w} weeks ago`; }
  if (days < 365) { const m = Math.round(days / 30); return m <= 1 ? 'a month ago' : `${m} months ago`; }
  const y = Math.round(days / 365); return y <= 1 ? 'a year ago' : `${y} years ago`;
}
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const AVATAR_COLOURS = ['#8a6618', '#1f6f5c', '#6b3fa0', '#b5462b', '#2f5d9c', '#7a5c2e'];
const G_ICON = '<svg class="review__g" viewBox="0 0 48 48" aria-label="Google review"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>';

(function renderReviews() {
  const track = document.getElementById('review-track');
  if (!track) return;
  track.innerHTML = REVIEWS.map((r, i) => `
    <article class="review">
      <div class="review__head">
        <span class="review__avatar" style="background:${AVATAR_COLOURS[i % AVATAR_COLOURS.length]}" aria-hidden="true">${esc(r.name.trim()[0].toUpperCase())}</span>
        <div class="review__who"><p class="review__name">${esc(r.name)}</p><p class="review__when">${timeAgo(r.date)}</p></div>
        ${G_ICON}
      </div>
      <p class="review__stars" aria-label="${r.stars} out of 5 stars">${'&#9733;'.repeat(r.stars)}${'&#9734;'.repeat(5 - r.stars)}</p>
      <p class="review__text">${esc(r.text)}</p>
      <button class="review__more" type="button" hidden>Read more</button>
    </article>`).join('');
  // "Read more" only on reviews that are actually cut off.
  const fit = () => track.querySelectorAll('.review').forEach((card) => {
    const text = card.querySelector('.review__text');
    const btn = card.querySelector('.review__more');
    if (card.classList.contains('is-open')) return;
    btn.hidden = text.scrollHeight <= text.clientHeight + 1;
  });
  track.addEventListener('click', (e) => {
    const btn = e.target.closest('.review__more');
    if (!btn) return;
    const card = btn.closest('.review');
    const open = card.classList.toggle('is-open');
    btn.textContent = open ? 'Show less' : 'Read more';
  });
  fit();
  window.addEventListener('resize', fit);
  document.fonts && document.fonts.ready.then(fit);
})();

// Carousels (barbers and reviews): arrows, dots, and the arrows switch off at either end.
document.querySelectorAll('.carousel').forEach((box) => {
  const track = box.querySelector('.carousel__track');
  const prev = box.querySelector('.carousel__arrow--prev');
  const next = box.querySelector('.carousel__arrow--next');
  const dotsBox = box.nextElementSibling && box.nextElementSibling.classList.contains('carousel__dots') ? box.nextElementSibling : null;
  if (!track || !track.children.length) return;
  const step = () => track.children[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || '0');
  // How many cards fit at once; the arrows and dots move a whole screenful at a time.
  const perView = () => Math.max(1, Math.round((track.clientWidth + parseFloat(getComputedStyle(track).columnGap || '0')) / step()));
  const pageWidth = () => perView() * step();
  const pages = () => Math.ceil(track.children.length / perView());
  const current = () => {
    const max = track.scrollWidth - track.clientWidth;
    if (track.scrollLeft >= max - 6) return pages() - 1;
    return Math.min(pages() - 1, Math.round(track.scrollLeft / pageWidth()));
  };

  function update() {
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 6;
    next.disabled = track.scrollLeft >= max - 6;
    if (dotsBox) [...dotsBox.children].forEach((b, i) => b.classList.toggle('is-on', i === current()));
  }
  function drawDots() {
    if (dotsBox) {
      const n = pages();
      dotsBox.innerHTML = n > 1 ? Array.from({ length: n }, (_, i) => `<button aria-label="Show page ${i + 1}"></button>`).join('') : '';
      [...dotsBox.children].forEach((b, i) => b.addEventListener('click', () => track.scrollTo({ left: i * pageWidth(), behavior: 'smooth' })));
    }
    update();
  }
  prev.addEventListener('click', () => track.scrollBy({ left: -pageWidth(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: pageWidth(), behavior: 'smooth' }));
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', drawDots);
  drawDots();
});

// Back-to-top button and the active link in the top bar.
(function scrollBits() {
  const btn = document.querySelector('.to-top');
  const links = [...document.querySelectorAll('.nav__side a[href^="#"]')];
  const targets = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const onScroll = () => {
    btn.classList.toggle('is-visible', window.scrollY > 600);
    let active = links[0];
    targets.forEach((t, i) => { if (t.getBoundingClientRect().top < 120) active = links[i]; });
    links.forEach((a) => a.classList.toggle('is-active', a === active));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Slide things in as they scroll into view: from below, the left or the right.
(function reveal() {
  const plan = [
    ['.intro .framed', 'left'], ['.intro__text', 'right'],
    ['.kicker', 'up'], ['.ornament', 'zoom'], ['.section-title', 'up'], ['.section-sub', 'up'],
    ['.price-list', 'left'], ['.feature', 'right'],
    ['.barbers .carousel', 'up'],
    ['.about__side', 'left'], ['.about__main', 'right'],
    ['.script-title', 'up'], ['.rating', 'zoom'], ['.carousel--reviews', 'up'], ['.rating__link', 'up'],
    ['.info-card', 'up'], ['.cta-title', 'up'], ['main .center', 'up'],
    ['.footer__logo', 'zoom'], ['.footer__col', 'up'],
  ];
  const items = [];
  plan.forEach(([sel, dir]) => document.querySelectorAll(sel).forEach((el, i) => {
    if (el.hasAttribute('data-reveal') || el.closest('[data-reveal]')) return;
    el.setAttribute('data-reveal', dir);
    // Cards side by side come in one after another.
    if (/info-card|footer__col/.test(sel)) el.style.setProperty('--d', `${i * 0.15}s`);
    items.push(el);
  }));
  const show = (el) => el.classList.add('is-in');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(show);
    return;
  }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  items.forEach((el) => io.observe(el));
  // Fast scrolling or a menu link can jump past things: show anything already above the fold.
  let left = items;
  const catchUp = () => {
    left = left.filter((el) => {
      if (el.getBoundingClientRect().top < innerHeight * 0.9) { show(el); io.unobserve(el); return false; }
      return true;
    });
    if (!left.length) window.removeEventListener('scroll', catchUp);
  };
  window.addEventListener('scroll', catchUp, { passive: true });
})();

document.getElementById('year').textContent = new Date().getFullYear();
