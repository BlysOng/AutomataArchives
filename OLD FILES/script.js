/* ================================================================
   CONFIG — single source of truth for glitch timing/size.
   All time values in milliseconds, sizes in pixels.
   ================================================================ */
const GLITCH_TIMING = {
  ambientMinDuration: 2000,   // ambient glitch stays visible at least this long
  ambientMaxDuration: 3000,   // and at most this long
  ambientMinInterval: 4000,   // then waits at least this long before the next one
  ambientMaxInterval: 5000,   // and at most this long
  ambientMinSize: 90,         // smallest ambient glitch patch, px
  ambientMaxSize: 240,        // largest ambient glitch patch, px
  clickDuration: 450,         // one-shot glitch length when a button is clicked
};

// Bright neons for the shard fragments themselves (blended over
// whatever's underneath, so brightness isn't a legibility concern).
const SHARD_PALETTE = [
  'var(--cyber-cyan)', 'var(--cyber-magenta)', 'var(--cyber-green)',
  'var(--cyber-yellow)', 'var(--cyber-violet)'
];
// Darker, readable variants for TEXT sitting on the light paper
// background — bright neon text on cream would be hard to read.
const LIGHT_BG_TEXT_COLORS = [
  'var(--glitch-text-1)', 'var(--glitch-text-2)',
  'var(--glitch-text-3)', 'var(--glitch-text-4)'
];
// The button has a dark background, so its own click-glitch text
// uses the bright palette instead — that's what stays readable there.
const DARK_BG_TEXT_COLORS = SHARD_PALETTE;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function randomBetween(min, max){
  return Math.random() * (max - min) + min;
}
function pickRandom(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickRandomColors(pool, count){
  const copy = [...pool];
  const picked = [];
  for (let i = 0; i < count; i++){
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(idx, 1)[0]);
  }
  return picked;
}

/* ----------------------------------------------------------------
   Random irregular shard shape — a jagged, non-convex polygon
   generated fresh every call, so no two glitches share a silhouette
   (never just a rectangle/4-corner shape). Point count and radius
   jitter both vary, giving triangles, stars, splinters, slivers…
   ---------------------------------------------------------------- */
function randomShardClipPath(){
  const pointCount = Math.floor(randomBetween(5, 9));
  const points = [];
  for (let i = 0; i < pointCount; i++){
    const angle = (i / pointCount) * Math.PI * 2 + randomBetween(-0.45, 0.45);
    const radius = randomBetween(22, 52) * randomBetween(0.55, 1.35);
    const x = Math.min(100, Math.max(0, 50 + Math.cos(angle) * radius));
    const y = Math.min(100, Math.max(0, 50 + Math.sin(angle) * radius));
    points.push(x.toFixed(1) + '% ' + y.toFixed(1) + '%');
  }
  return 'polygon(' + points.join(', ') + ')';
}

/* Re-shapes and re-colours every shard inside a .glitch-layer —
   called on every single activation, ambient or click. */
function restyleGlitchLayer(layer){
  const shards = layer.querySelectorAll('.glitch-layer__shard');
  const colors = pickRandomColors(SHARD_PALETTE, shards.length);
  shards.forEach((shard, i) => {
    shard.style.clipPath = randomShardClipPath();
    shard.style.background = colors[i];
    shard.style.transform =
      'translate(' + randomBetween(-4, 4).toFixed(1) + 'px,' +
      randomBetween(-3, 3).toFixed(1) + 'px)';
  });
}

function buildGlitchLayerMarkup(){
  return '<span class="glitch-layer__shard"></span>' +
         '<span class="glitch-layer__shard"></span>' +
         '<span class="glitch-layer__shard glitch-layer__shard--diff"></span>';
}

/* ----------------------------------------------------------------
   AMBIENT GLITCH — a single element fixed to the viewport (not
   confined inside any box), so it can appear anywhere on the
   CURRENT screen, including drifting outside any particular card.
   ---------------------------------------------------------------- */
let ambientGlitchEl = null;
function getAmbientGlitchEl(){
  if (ambientGlitchEl) return ambientGlitchEl;
  const el = document.createElement('div');
  el.className = 'glitch-layer glitch-layer--ambient';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = buildGlitchLayerMarkup();
  document.body.appendChild(el);
  ambientGlitchEl = el;
  return el;
}

function rectsOverlap(a, b){
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

// Text elements eligible to change colour when the glitch lands on them.
const TEXT_HIT_SELECTOR = [
  '.stat__value', '.stat__label', '.card__title', '.card__desc', '.card__eyebrow',
  '.hero h1 .line', '.hero__lede', '.hero__body', '.hero__stamp',
  '.nav__brand', '.nav__links a', '.platform__head h2', '.platform__tag',
  '.footer span'
].join(', ');

/* Checks which text elements the glitch's rect currently overlaps
   and flips them to a readable glitch colour for the same duration
   as the glitch itself — e.g. "24/7 — workflows that never clock
   out" changes colour only while the glitch is actually over it. */
function applyTextGlitchHits(glitchRect, duration){
  document.querySelectorAll(TEXT_HIT_SELECTOR).forEach(textEl => {
    const r = textEl.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (!rectsOverlap(glitchRect, r)) return;
    textEl.style.setProperty('--text-glitch-color', pickRandom(LIGHT_BG_TEXT_COLORS));
    textEl.classList.add('text-glitch-hit');
    setTimeout(() => textEl.classList.remove('text-glitch-hit'), duration);
  });
}

function activateAmbientGlitch(){
  const layer = getAmbientGlitchEl();

  const w = randomBetween(GLITCH_TIMING.ambientMinSize, GLITCH_TIMING.ambientMaxSize);
  const h = randomBetween(GLITCH_TIMING.ambientMinSize * 0.6, GLITCH_TIMING.ambientMaxSize * 0.75);
  const x = randomBetween(0, Math.max(0, window.innerWidth - w));
  const y = randomBetween(0, Math.max(0, window.innerHeight - h));

  layer.style.width  = w + 'px';
  layer.style.height = h + 'px';
  layer.style.left   = x + 'px';
  layer.style.top    = y + 'px';
  restyleGlitchLayer(layer);
  layer.classList.add('is-active');

  const duration = randomBetween(GLITCH_TIMING.ambientMinDuration, GLITCH_TIMING.ambientMaxDuration);
  applyTextGlitchHits({ left: x, top: y, right: x + w, bottom: y + h }, duration);
  setTimeout(() => layer.classList.remove('is-active'), duration);
}

/* Main ambient loop: waits a random 4-5s, fires one glitch
   somewhere on the current screen for 2-3s, then repeats. */
function scheduleAmbientGlitch(){
  const gap = randomBetween(GLITCH_TIMING.ambientMinInterval, GLITCH_TIMING.ambientMaxInterval);
  setTimeout(() => {
    if (!prefersReducedMotion) activateAmbientGlitch();
    scheduleAmbientGlitch();
  }, gap);
}

/* ----------------------------------------------------------------
   CLICK GLITCH — covers the whole button every time it's clicked,
   and briefly recolours the button's own label too.
   ---------------------------------------------------------------- */
function injectGlitchLayer(el){
  const layer = document.createElement('span');
  layer.className = 'glitch-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = buildGlitchLayerMarkup();
  el.appendChild(layer);
}
function initButtonGlitchLayers(){
  document.querySelectorAll('.btn').forEach(injectGlitchLayer);
}

function triggerButtonGlitch(btn){
  const layer = btn.querySelector(':scope > .glitch-layer');
  if (!layer) return;

  layer.style.width  = '100%';
  layer.style.height = '100%';
  layer.style.left   = '0';
  layer.style.top    = '0';
  restyleGlitchLayer(layer);
  layer.classList.remove('is-active');
  void layer.offsetWidth; // restart the animation even on rapid re-clicks
  layer.classList.add('is-active');

  // .btn is solid dark ink (needs bright text), .btn--ghost sits on
  // the plain light page background instead (needs dark/readable text)
  const palette = btn.classList.contains('btn--ghost') ? LIGHT_BG_TEXT_COLORS : DARK_BG_TEXT_COLORS;
  btn.style.setProperty('--text-glitch-color', pickRandom(palette));
  btn.classList.remove('text-glitch-hit');
  void btn.offsetWidth;
  btn.classList.add('text-glitch-hit');

  setTimeout(() => {
    layer.classList.remove('is-active');
    btn.classList.remove('text-glitch-hit');
  }, GLITCH_TIMING.clickDuration);
}

function initButtonGlitchClicks(){
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', () => triggerButtonGlitch(btn));
  });
}

/* ================================================================
   WORKFLOW BROWSER — search box + quick-filter chips + a
   list/grid view toggle + a details modal with its own download
   button. Everything renders from a plain per-page data array, so
   adding a new project later is "add one object to that page's
   array + drop its .json file in the matching folder" — never
   hand-written list/card/modal markup.

   Each page calls initWorkflowBrowser({...}) from its own small
   inline <script>, AFTER loading this file but BEFORE
   DOMContentLoaded fires — so the modal + first render already
   exist in the DOM by the time initFrames() / initButtonGlitchLayers()
   below do their querySelectorAll sweep, and pick up the modal's
   corners/glitch-layer for free with no extra wiring.
   ================================================================ */
function escapeHTML(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ----------------------------------------------------------------
   SECURITY / PRIVACY GUARD — every piece of workflow text that
   reaches the page (title, description, tags, stage names) passes
   through here first. This is a last-line-of-defence scrub, NOT a
   substitute for cleaning the exported .json yourself — n8n/Zapier/
   Make exports can carry webhook URLs, API keys, credential IDs,
   emails, or your server's IP inside node parameters or sticky
   notes. ALWAYS strip those out of the workflow file itself before
   dropping it in /n8n, /zapier or /make. This function only catches
   obvious IPs/emails/raw URLs that accidentally end up in the short
   text fields you type into the WORKFLOWS array below.
   ---------------------------------------------------------------- */
function sanitizeText(str){
  if (!str) return str;
  return String(str)
    .replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, '[redacted]')                 // IPv4
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted]')     // emails
    .replace(/https?:\/\/\S+/g, '[link removed]');                              // raw URLs
}

function buildArchChips(stages){
  return stages.map((stage, i) => {
    const arrow = i < stages.length - 1 ? '<span class="arch__arrow">›</span>' : '';
    return '<span class="arch__node">' + escapeHTML(sanitizeText(stage)) + '</span>' + arrow;
  }).join('');
}

function buildTagPills(tags){
  return (tags || []).map(t => '<span class="wf-tag">' + escapeHTML(sanitizeText(t)) + '</span>').join('');
}

// Common business-automation categories used as the quick-filter
// chips. Shared here (not per-page) so n8n/zapier/make all filter
// the same way — a workflow just needs a matching entry in its own
// "tags" array for a chip to surface it.
const COMMON_WORKFLOW_TAGS = [
  'AI Agent', 'Chatbot Assistant', 'RAG', 'Inventory System',
  'Lead Generation', 'Email Automation', 'Document Processing',
  'Data Sync', 'CRM Automation', 'Content Generation'
];

/* A small "blueprint" thumbnail: a mini version of the .arch chip
   chain (same trigger=olive / mid=brass / output=rust colour logic)
   rendered as a tiny zigzag node diagram — so every workflow gets a
   distinct-ish thumbnail with zero image assets to manage. */
function buildThumbnailSVG(stageCount){
  const n = Math.max(3, Math.min(stageCount || 3, 5));
  const w = 96, h = 64;
  const gapX = w / (n + 1);
  let dots = '', lines = '', prevX = 0, prevY = 0;
  for (let i = 0; i < n; i++){
    const x = gapX * (i + 1);
    const y = h / 2 + (i % 2 === 0 ? -10 : 10);
    if (i > 0){
      lines += '<line x1="' + prevX + '" y1="' + prevY + '" x2="' + x + '" y2="' + y +
               '" stroke="var(--brass)" stroke-width="1.5"/>';
    }
    const fill = i === 0 ? 'var(--olive)' : (i === n - 1 ? 'var(--rust)' : 'var(--brass)');
    dots += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + fill + '"/>';
    prevX = x; prevY = y;
  }
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
         lines + dots + '</svg>';
}

function matchesSearch(wf, term){
  if (!term) return true;
  const haystack = (wf.title + ' ' + wf.description + ' ' + (wf.tags || []).join(' ')).toLowerCase();
  return haystack.includes(term.toLowerCase());
}

/* -- horizontal list item (default view) -- */
function buildWorkflowListItem(wf, onOpen){
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'wf-list__item';
  item.innerHTML =
    '<span class="wf-thumb">' + buildThumbnailSVG((wf.stages || []).length) + '</span>' +
    '<span class="wf-list__body">' +
      '<span class="wf-list__title">' + escapeHTML(sanitizeText(wf.title)) + '</span>' +
      '<span class="wf-list__desc">' + escapeHTML(sanitizeText(wf.description)) + '</span>' +
      '<span class="wf-list__tags">' + buildTagPills(wf.tags) + '</span>' +
    '</span>';
  item.addEventListener('click', () => onOpen(wf));
  return item;
}

/* -- grid/card view (alternate view) -- */
function buildWorkflowGridItem(wf, onOpen){
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'card frame';
  card.innerHTML =
    '<div>' +
      '<div class="card__eyebrow">STATUS: ' + escapeHTML(wf.status || 'LIVE') + '</div>' +
      '<div class="card__title">' + escapeHTML(sanitizeText(wf.title)) + '</div>' +
      '<p class="card__desc">' + escapeHTML(sanitizeText(wf.description)) + '</p>' +
      '<div class="arch">' + buildArchChips(wf.stages || []) + '</div>' +
    '</div>';
  card.addEventListener('click', () => onOpen(wf));
  return card;
}

/* ----------------------------------------------------------------
   DETAILS MODAL — one shared, reused element (not rebuilt per
   click). Main column has the full write-up; the right-hand side
   panel holds the download button, per the brief.
   ---------------------------------------------------------------- */
let workflowModalEl = null;
let workflowModalLastFocus = null;

function createWorkflowModal(){
  if (workflowModalEl) return workflowModalEl;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal frame" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
      '<button type="button" class="modal__close" aria-label="Close">×</button>' +
      '<div class="modal__shot" id="modalShotWrap">' +
        '<img class="modal__shot-img" id="modalShot" alt="" draggable="false">' +
        '<span class="modal__shot-draghint" id="modalShotDragHint" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="var(--paper)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M8 5 L3 12 L8 19"/><path d="M16 5 L21 12 L16 19"/>' +
          '</svg>' +
        '</span>' +
        '<span class="modal__shot-placeholder" id="modalShotPlaceholder">SCREENSHOT ON FILE<br>NOT YET UPLOADED</span>' +
      '</div>' +
      '<div class="modal__body">' +
        '<div class="modal__main">' +
          '<div class="modal__eyebrow" id="modalEyebrow"></div>' +
          '<h3 class="modal__title" id="modalTitle"></h3>' +
          '<p class="modal__desc" id="modalDesc"></p>' +
          '<div class="modal__arch">' +
            '<div class="modal__side-label">ARCHITECTURE</div>' +
            '<div class="arch" id="modalArch"></div>' +
          '</div>' +
          '<div class="modal__tags" id="modalTags"></div>' +
        '</div>' +
        '<div class="modal__side">' +
          '<div class="modal__side-label">DOWNLOAD</div>' +
          '<a href="#" class="btn" id="modalDownload">↓ DOWNLOAD .JSON</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeWorkflowModal(); });
  overlay.querySelector('.modal__close').addEventListener('click', closeWorkflowModal);
  overlay.querySelector('#modalDownload').addEventListener('click', (e) => {
    if (e.currentTarget.classList.contains('is-disabled')) e.preventDefault();
  });
  initShotDrag(overlay.querySelector('#modalShotWrap'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeWorkflowModal();
  });

  workflowModalEl = overlay;
  return overlay;
}

/* ----------------------------------------------------------------
   SCREENSHOT DRAG-TO-PAN — the screenshot box is a fixed height and
   the image keeps its natural aspect ratio, so wide workflow-canvas
   screenshots run wider than the box. Click/tap-and-drag left or
   right (mouse or touch, via pointer events) pans across the full
   image instead of the browser's native scrollbar. Wired up once on
   the shared modal; works the same on every page (n8n/zapier/make).
   ---------------------------------------------------------------- */
function initShotDrag(shotWrap){
  let isDown = false;
  let startX = 0;
  let startScroll = 0;
  let moved = false;

  shotWrap.addEventListener('pointerdown', (e) => {
    if (shotWrap.scrollWidth <= shotWrap.clientWidth) return; // nothing to pan
    isDown = true;
    moved = false;
    startX = e.clientX;
    startScroll = shotWrap.scrollLeft;
    shotWrap.classList.add('is-dragging');
    shotWrap.setPointerCapture(e.pointerId);
  });
  shotWrap.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    shotWrap.scrollLeft = startScroll - dx;
  });
  function endDrag(e){
    if (!isDown) return;
    isDown = false;
    shotWrap.classList.remove('is-dragging');
    if (e && e.pointerId !== undefined && shotWrap.hasPointerCapture && shotWrap.hasPointerCapture(e.pointerId)){
      shotWrap.releasePointerCapture(e.pointerId);
    }
  }
  shotWrap.addEventListener('pointerup', endDrag);
  shotWrap.addEventListener('pointercancel', endDrag);
  shotWrap.addEventListener('pointerleave', endDrag);
  // Dragging shouldn't also fire a click on whatever's underneath.
  shotWrap.addEventListener('click', (e) => { if (moved) e.stopPropagation(); }, true);
}

function openWorkflowModal(wf){
  const overlay = createWorkflowModal();
  overlay.querySelector('#modalEyebrow').textContent = 'STATUS: ' + (wf.status || 'LIVE');
  overlay.querySelector('#modalTitle').textContent = sanitizeText(wf.title);
  overlay.querySelector('#modalDesc').textContent = sanitizeText(wf.description);
  overlay.querySelector('#modalArch').innerHTML = buildArchChips(wf.stages || []);
  overlay.querySelector('#modalTags').innerHTML = buildTagPills(wf.tags);

  // -- screenshot: every workflow shows the same fixed-HEIGHT box
  // (see .modal__shot / .modal__shot-img in styles.css). The image
  // keeps its natural aspect ratio rather than being cropped, so a
  // wide canvas screenshot overflows sideways — the small drag hint
  // (only shown once we confirm it actually overflows) tells the
  // user they can drag left/right to see the rest of it. No wf.image
  // yet -> show the placeholder instead of a broken image.
  const shotWrap = overlay.querySelector('#modalShotWrap');
  const shotImg = overlay.querySelector('#modalShot');
  const shotPlaceholder = overlay.querySelector('#modalShotPlaceholder');
  shotWrap.classList.remove('is-draggable');
  shotWrap.scrollLeft = 0;
  if (wf.image){
    shotImg.alt = sanitizeText(wf.title) + ' — workflow screenshot';
    shotImg.style.display = 'block';
    shotPlaceholder.style.display = 'none';
    const checkOverflow = () => {
      shotWrap.scrollLeft = 0;
      if (shotWrap.scrollWidth > shotWrap.clientWidth + 1) shotWrap.classList.add('is-draggable');
    };
    if (shotImg.complete && shotImg.src === wf.image){
      checkOverflow();
    } else {
      shotImg.onload = checkOverflow;
    }
    shotImg.src = wf.image;
  } else {
    shotImg.onload = null;
    shotImg.removeAttribute('src');
    shotImg.style.display = 'none';
    shotPlaceholder.style.display = 'flex';
  }

  // -- download: disabled (rather than pointing nowhere) if a page
  // hasn't attached a real file path for this workflow yet.
  const dl = overlay.querySelector('#modalDownload');
  if (wf.file){
    dl.setAttribute('href', wf.file);
    dl.setAttribute('download', wf.downloadName || '');
    dl.classList.remove('is-disabled');
    dl.removeAttribute('aria-disabled');
  } else {
    dl.setAttribute('href', '#');
    dl.removeAttribute('download');
    dl.classList.add('is-disabled');
    dl.setAttribute('aria-disabled', 'true');
  }

  workflowModalLastFocus = document.activeElement;
  overlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  overlay.querySelector('.modal__close').focus();
}

function closeWorkflowModal(){
  if (!workflowModalEl) return;
  workflowModalEl.classList.remove('is-open');
  document.body.style.overflow = '';
  if (workflowModalLastFocus && workflowModalLastFocus.focus) workflowModalLastFocus.focus();
}

/* ----------------------------------------------------------------
   ORCHESTRATOR — wires the search box, quick chips and view toggle
   to a single render() call, then does the first (list) render.
   ---------------------------------------------------------------- */
function initWorkflowBrowser(config){
  const container = document.querySelector(config.containerSelector);
  if (!container) return;
  const searchInput = document.querySelector(config.searchSelector);
  const chipsContainer = document.querySelector(config.chipsSelector);
  const viewToggle = document.querySelector(config.viewToggleSelector);
  const viewButtons = viewToggle ? viewToggle.querySelectorAll('[data-view]') : [];

  createWorkflowModal();

  // Pager container sits right after the list/grid — created once,
  // reused every render (same pattern as the shared modal).
  const pager = document.createElement('div');
  pager.className = 'wf-pager';
  container.insertAdjacentElement('afterend', pager);

  const PAGE_SIZE = 10; // hard cap per page — page 11+ workflows via Prev/Next instead of one long list

  let currentView = 'list';   // horizontal list is the default per the brief
  let currentTerm = '';
  let currentPage = 1;

  function render(){
    container.innerHTML = '';
    pager.innerHTML = '';
    container.className = currentView === 'list' ? 'wf-list' : 'platform__grid';
    const filtered = config.data.filter(wf => matchesSearch(wf, currentTerm));

    if (!filtered.length){
      const empty = document.createElement('div');
      empty.className = 'wf-empty';
      empty.textContent = currentTerm
        ? 'No workflows match "' + currentTerm + '" yet.'
        : 'No workflows here yet.';
      container.appendChild(empty);
      return;
    }

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pageCount);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    pageItems.forEach(wf => {
      const item = currentView === 'list'
        ? buildWorkflowListItem(wf, openWorkflowModal)
        : buildWorkflowGridItem(wf, openWorkflowModal);
      container.appendChild(item);
    });
    if (currentView === 'grid') initFrames(); // new .frame cards need corners

    // Only show pager controls once there's more than one page
    // (i.e. once the list actually reaches 11+ workflows).
    if (pageCount > 1) renderPager(pageCount, filtered.length);
  }

  function renderPager(pageCount, totalCount){
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'wf-pager__btn';
    prev.textContent = '‹ PREV';
    prev.disabled = currentPage === 1;
    prev.addEventListener('click', () => { currentPage--; render(); });
    pager.appendChild(prev);

    const nums = document.createElement('div');
    nums.className = 'wf-pager__nums';
    for (let p = 1; p <= pageCount; p++){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wf-pager__page' + (p === currentPage ? ' is-active' : '');
      btn.textContent = String(p);
      btn.setAttribute('aria-current', p === currentPage ? 'page' : 'false');
      btn.addEventListener('click', () => { currentPage = p; render(); });
      nums.appendChild(btn);
    }
    pager.appendChild(nums);

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'wf-pager__btn';
    next.textContent = 'NEXT ›';
    next.disabled = currentPage === pageCount;
    next.addEventListener('click', () => { currentPage++; render(); });
    pager.appendChild(next);

    const info = document.createElement('span');
    info.className = 'wf-pager__info';
    info.textContent = totalCount + ' workflows on file';
    pager.appendChild(info);
  }

  function setTerm(term){
    currentTerm = term;
    currentPage = 1; // a new search always starts back at page 1
    if (searchInput) searchInput.value = term;
    if (chipsContainer){
      chipsContainer.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.toggle('is-active', chip.textContent.toLowerCase() === term.toLowerCase());
      });
    }
    render();
  }

  if (searchInput){
    searchInput.addEventListener('input', (e) => setTerm(e.target.value));
  }

  if (chipsContainer){
    COMMON_WORKFLOW_TAGS.forEach(tag => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'filter-chip';
      chip.textContent = tag;
      chip.addEventListener('click', () => {
        setTerm(chip.classList.contains('is-active') ? '' : tag);
      });
      chipsContainer.appendChild(chip);
    });
  }

  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      currentPage = 1; // switching list/grid starts back at page 1
      viewButtons.forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      render();
    });
  });

  render();
}

/* ================================================================
   Reusable corner-frame injector — any element with class="frame"
   automatically gets four brass corner brackets. Keeps the corner
   markup out of the HTML so it's defined in exactly one place.
   Idempotent (skips elements that already have corners) since the
   workflow browser can re-render — and re-.frame — the grid view
   on every search/filter/view change.
   ================================================================ */
function initFrames(){
  document.querySelectorAll('.frame').forEach(frame => {
    if (frame.querySelector(':scope > .corner')) return;
    ['tl','tr','bl','br'].forEach(pos => {
      const span = document.createElement('span');
      span.className = 'corner corner--' + pos;
      frame.appendChild(span);
    });
  });
}

/* ================================================================
   Highlights whichever nav link matches the page currently open
   (compares the href against the current filename), so this is
   automatic on every page instead of hand-set per file.
   ================================================================ */
function markCurrentNavLink(){
  const currentPage = location.pathname.split('/').pop() || 'automation.html';
  document.querySelectorAll('.nav__links a').forEach(link => {
    if (link.getAttribute('href') === currentPage){
      link.classList.add('is-current');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initFrames();
  initButtonGlitchLayers();
  initButtonGlitchClicks();
  scheduleAmbientGlitch();
  markCurrentNavLink();
});