/* ==================================================================*/
/* ==================== INVENTORY BAG MODE =========================*/
/* ==================================================================*/

export const inventoryBag = (() => {

  let engine, matterLoaded = false, animFrameId = null;
  let wallBodies = [], itemBodies = [], itemElements = [];
  let containerW = 0, containerH = 0, currentUnit = 38;
  let activeFilter = 'all', resizeObs = null;
  let currentItems = [], tipEl = null, popOpenId = null;

  const PAD = 8, PACK = 0.42, MIN_U = 14, MAX_U = 50;

  const CAT = {
    'Consumables':         { c:'7,243,113',   ic:'M12 10L12 5L20 5L20 10M10 10L10 30C10 34 22 34 22 30L22 10ZM10 18L22 18', gw:1, gh:1 },
    'Weapons':             { c:'255,70,50',    ic:'M16 4L16 28M12 6L16 4L20 6M10 28L22 28M12 28L12 32M20 28L20 32M10 32L22 32', gw:1, gh:4 },
    'Armor & clothing':    { c:'6,173,228',    ic:'M8 8C8 4 24 4 24 8L24 26C24 28 8 28 8 26ZM14 8L14 14L18 14L18 8', gw:2, gh:3 },
    'Magic & curiosities': { c:'191,94,255',   ic:'M16 4L16 28M10 10L16 6L22 10M10 22L16 26L22 22M6 16L26 16', gw:2, gh:2 },
    'Tools':               { c:'244,162,97',   ic:'M6 26L22 6M22 6L28 12M6 26L12 32M20 10L26 16', gw:2, gh:1 },
    'Scrap & parts':       { c:'150,160,140',  ic:'M16 6A10 10 0 1 1 16 26A10 10 0 1 1 16 6M16 10L16 16L20 16', gw:1, gh:1 },
    'Keys':                { c:'255,169,39',   ic:'M10 10A6 6 0 1 1 10 22A6 6 0 1 1 10 10M16 16L28 28M24 28L28 28L28 24', gw:1, gh:1 },
    'Documents':           { c:'180,180,180',  ic:'M6 4L26 4L26 28L6 28ZM6 10L26 10M10 16L22 16M10 20L18 20', gw:2, gh:3 },
  };
  const DEF = { c:'150,150,150', ic:'M8 8L24 8L24 24L8 24Z', gw:1, gh:1 };

  const FI = {
    all:     '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
    equip:   '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><path d="M8 12l3 3 5-5" stroke-width="2.5"/>',
    attune:  '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>',
  };

  function injectCSS() {}

  // ── Matter loader ────────────────────────────────────────────────
  function loadMatter() {
    return new Promise((res, rej) => {
      if (window.Matter) { matterLoaded = true; res(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
      s.onload = () => { matterLoaded = true; res(); };
      s.onerror = () => rej(new Error('Failed to load Matter.js'));
      document.head.appendChild(s);
    });
  }

  // ── Fabric.js loader ─────────────────────────────────────────────
  let fabricLoaded = false;
  function loadFabric() {
    return new Promise((res, rej) => {
      if (window.fabric) { fabricLoaded = true; res(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
      s.onload = () => { fabricLoaded = true; res(); };
      s.onerror = () => rej(new Error('Failed to load Fabric.js'));
      document.head.appendChild(s);
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────
  function getCfg(b) { const t = Array.isArray(b.blockType) ? b.blockType[0] : b.blockType; return CAT[t] || DEF; }
  function catClr(b, a) { return 'rgba(' + getCfg(b).c + ',' + a + ')'; }
  function stClr(b, a) {
    return catClr(b, a);
  }

  function processBlocks(blocks) {
    return blocks.map(b => {
      const cfg = getCfg(b), gw = b.bagGW || cfg.gw, gh = b.bagGH || cfg.gh;
      let cells;
      if (b.bagCells && b.bagCells.length) {
        cells = b.bagCells;
      } else {
        cells = [];
        for (let r = 0; r < gh; r++) for (let c = 0; c < gw; c++) cells.push({ r, c });
      }
      return { block: b, gw, gh, cells, bb: { r1:0, c1:0, r2:gh-1, c2:gw-1, gw, gh }, cfg };
    });
  }

  function calcU(items) {
    let t = 0; items.forEach(i => t += i.cells.length);
    if (!t) return MAX_U;
    return Math.floor(Math.max(MIN_U, Math.min(MAX_U, Math.sqrt(containerW * containerH * PACK / t))));
  }

  function decompose(cells, bb) {
    const g = [];
    for (let r = 0; r < bb.gh; r++) { g[r] = []; for (let c = 0; c < bb.gw; c++) g[r][c] = false; }
    cells.forEach(cl => g[cl.r - bb.r1][cl.c - bb.c1] = true);
    const runs = [];
    for (let r = 0; r < bb.gh; r++) { const rr = []; let c = 0; while (c < bb.gw) { if (g[r][c]) { const s = c; while (c < bb.gw && g[r][c]) c++; rr.push({c1:s,c2:c-1}); } else c++; } runs.push(rr); }
    const eq = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i].c1 !== b[i].c1 || a[i].c2 !== b[i].c2) return false; return true; };
    const rects = []; let r = 0;
    while (r < bb.gh) { if (!runs[r].length) { r++; continue; } const sr = r; while (r+1 < bb.gh && eq(runs[r], runs[r+1])) r++; runs[sr].forEach(run => rects.push({r1:sr,r2:r,c1:run.c1,c2:run.c2})); r++; }
    return rects;
  }

  function makeBody(item, x, y, u) {
    const B = Matter.Bodies, Bo = Matter.Body;
    const rects = decompose(item.cells, item.bb);
    const opts = { restitution:.02, friction:.9, frictionStatic:.7, frictionAir:.05, sleepThreshold:20, chamfer:{radius:1.5} };
    if (rects.length === 1) { const r = rects[0]; const b = B.rectangle(x,y,(r.c2-r.c1+1)*u-0,(r.r2-r.r1+1)*u-0,opts); b._ox=0;b._oy=0; return b; }
    const cx0 = item.bb.gw*u/2, cy0 = item.bb.gh*u/2;
    const parts = rects.map(r => B.rectangle((r.c1+r.c2+1)/2*u-cx0,(r.r1+r.r2+1)/2*u-cy0,(r.c2-r.c1+1)*u-0,(r.r2-r.r1+1)*u-0));
    const b = Bo.create(Object.assign({parts},opts));
    b._ox = b.position.x; b._oy = b.position.y;
    Bo.setPosition(b,{x,y}); return b;
  }

  function buildWalls() {
    wallBodies.forEach(w => Matter.Composite.remove(engine.world, w));
    const bt = PAD, bb = containerH - PAD, bl = PAD, br = containerW - PAD;
    const wallH = bb - bt + 20;
    const o = {isStatic:true, friction:.8, restitution:.02};
    wallBodies = [
      Matter.Bodies.rectangle(containerW/2, bb+8, br-bl+20, 16, o),
      Matter.Bodies.rectangle(bl-8, (bt+bb)/2, 16, wallH, o),
      Matter.Bodies.rectangle(br+8, (bt+bb)/2, 16, wallH, o)
    ];
    Matter.Composite.add(engine.world, wallBodies);
  }

  function drawBag(ctx) {
    ctx.clearRect(0,0,containerW,containerH);
    const bt=PAD, bb=containerH-PAD, bl=PAD, br=containerW-PAD, r=8;
    ctx.beginPath();
    ctx.moveTo(bl+r,bt);ctx.lineTo(br-r,bt);ctx.arcTo(br,bt,br,bt+r,r);
    ctx.lineTo(br,bb-r);ctx.arcTo(br,bb,br-r,bb,r);
    ctx.lineTo(bl+r,bb);ctx.arcTo(bl,bb,bl,bb-r,r);
    ctx.lineTo(bl,bt+r);ctx.arcTo(bl,bt,bl+r,bt,r);
    ctx.closePath();
    ctx.fillStyle='rgba(30,22,12,.08)';ctx.fill();
    ctx.strokeStyle='rgba(110,85,45,.12)';ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.stroke();
  }

  function cleanCellImage(src, callback) {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < d.data.length; i += 4) {
          // If pixel is close to the old dark background (20,20,20), make transparent
          if (d.data[i] < 35 && d.data[i+1] < 35 && d.data[i+2] < 35) {
            d.data[i+3] = 0;
          }
        }
        ctx.putImageData(d, 0, 0);
        callback(c.toDataURL('image/png'));
      };
      img.src = src;
    }

  function mkEl(item, u) {
    const pw = item.bb.gw*u, ph = item.bb.gh*u;
    const w = document.createElement('div'); w.className = 'bi'; w.style.width=pw+'px'; w.style.height=ph+'px';
    const bdrClr = stClr(item.block, 0.25);
    const bg = stClr(item.block,.06), dc = stClr(item.block,.55);
    const vw = item.gw<=2?item.gw*32:item.gw*28, vh = item.gh<=2?item.gh*32:item.gh*28;
    // Build a set of occupied cells for neighbor checks
    const cellSet = new Set(item.cells.map(c => c.r+','+c.c));
    item.cells.forEach(c => {
      const d = document.createElement('div'); d.className='bc';
      d.style.left=((c.c-item.bb.c1)*u)+'px'; d.style.top=((c.r-item.bb.r1)*u)+'px';
      d.style.width=u+'px'; d.style.height=u+'px'; d.style.background=bg;
      // Border only on outer edges
      const bT = !cellSet.has((c.r-1)+','+c.c) ? '1px solid '+bdrClr : 'none';
      const bR = !cellSet.has(c.r+','+(c.c+1)) ? '1px solid '+bdrClr : 'none';
      const bB = !cellSet.has((c.r+1)+','+c.c) ? '1px solid '+bdrClr : 'none';
      const bL = !cellSet.has(c.r+','+(c.c-1)) ? '1px solid '+bdrClr : 'none';
      d.style.borderTop=bT; d.style.borderRight=bR; d.style.borderBottom=bB; d.style.borderLeft=bL;
      if (item.block.bagCellImgs && item.block.bagCellImgs[c.r+','+c.c]) {
        const img = document.createElement('img');
        img.style.cssText='width:100%;height:100%;display:block;pointer-events:none;position:relative;z-index:1';
        cleanCellImage(item.block.bagCellImgs[c.r+','+c.c], (cleanSrc) => { img.src = cleanSrc; });
        d.appendChild(img);      } else {
        d.innerHTML='<svg viewBox="'+((c.c-item.bb.c1)*32)+' '+((c.r-item.bb.r1)*32)+' 32 32"><path d="'+item.cfg.ic+'" fill="none" stroke="'+dc+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      }
      w.appendChild(d);
    });
    w.addEventListener('mouseenter', () => showTip(item, w));
    w.addEventListener('mouseleave', hideTip);
    w.addEventListener('click', e => { e.stopPropagation(); showPop(item, w); });
    return w;
  }

  function showTip(item, el) {
    hideTip();
    if (popOpenId === item.block.id) return;
    tipEl = document.createElement('div');
    tipEl.classList.add('text-tooltip');
    tipEl.textContent = item.block.title;
    tipEl.style.padding = '8px 12px';
    tipEl.style.opacity = '0';
    tipEl.style.transition = 'opacity 0.15s ease';
    document.body.appendChild(tipEl);
    const r = el.getBoundingClientRect();
    tipEl.style.left = (r.left + r.width / 2 - tipEl.offsetWidth / 2) + 'px';
    tipEl.style.top = (r.top - tipEl.offsetHeight - 6) + 'px';
    tipEl.offsetHeight; // force reflow
    tipEl.style.opacity = '1';
  }
  function hideTip() {
    if (tipEl) {
      const el = tipEl;
      tipEl = null;
      el.style.opacity = '0';
      el.addEventListener('transitionend', () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 200); // fallback
    }
  }

  function showPop(item, srcEl) {
    const L = document.getElementById('bag-pl'); if (!L) return; L.innerHTML='';
    popOpenId = item.block.id;
    hideTip();
    const b = item.block, cc = item.cfg.c, bt = Array.isArray(b.blockType)?b.blockType[0]:(b.blockType||'Item');
    let st = '';
    if (b.equipped) st+='<span style="color:#ff8c00;background:rgba(255,140,0,.1);border:1px solid rgba(255,140,0,.2)">Equipped</span>';
    if (b.attuned) st+='<span style="color:#06ade4;background:rgba(6,173,228,.1);border:1px solid rgba(6,173,228,.2)">Attuned</span>';
    let tg = b.tags&&b.tags.length ? '<div class="bpp-tg">'+b.tags.map(t=>'<span>'+t+'</span>').join('')+'</div>' : '';
    const p = document.createElement('div'); p.className='bpp';
    // Position near the clicked item, clamped to stay in view
    const cn = document.getElementById('bag-cn');
p._srcEl = srcEl;
    p._cn = cn;
    p.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div class="bpp-n" style="margin:0">${b.title}</div>
        <div class="block-actions" style="position:static;flex-shrink:0">
          <div class="block-actions-menu">
            <div class="block-actions-reveal">
              <button class="action-button remove-button red-button" data-id="${b.id}" title="Remove">×</button>
              <button class="action-button duplicate-button blue-button" data-id="${b.id}" title="Copy">❐</button>
              <button class="action-button edit-button orange-button" data-id="${b.id}" title="Edit">✎</button>
            </div>
            <button class="actions-trigger" title="Actions">···</button>
          </div>
        </div>
      </div>
      <span class="bpp-t" style="background:rgba(${cc},.12);color:rgba(${cc},.7)">${bt}</span>
      ${st?'<div class="bpp-s">'+st+'</div>':''}
      <div class="bpp-b">${b.text||'<em style="color:var(--gray-500)">No description</em>'}</div>
      ${tg}`;

    // Wire the ··· trigger (same toggle as existing blocks)
    const menu = p.querySelector('.block-actions-menu');
    const trigger = p.querySelector('.actions-trigger');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('menu-open');
    });

    // Wire delete
    p.querySelector('.remove-button').addEventListener('click', async (e) => {
      e.stopPropagation();
      const { appManager } = await import('./appManager.js');
      const { blockActionsHandler } = await import('./blockActionsHandler.js');
      blockActionsHandler.showDeletePopup(b.id, e, (deletedId) => {
        const deletedBlock = appManager.removeBlock(deletedId);
        blockActionsHandler.recordLastDeleted(appManager.getActiveTab(), deletedBlock);
        // Remove from physics
        const idx = currentItems.findIndex(ci => ci.block.id === deletedId);
        if (idx !== -1) {
          Matter.Composite.remove(engine.world, itemBodies[idx]);
          itemElements[idx].remove();
          currentItems.splice(idx, 1);
          itemBodies.splice(idx, 1);
          itemElements.splice(idx, 1);
          // Wake remaining bodies so they settle into the gap
          itemBodies.forEach(bd => Matter.Sleeping.set(bd, false));
        }
        L.innerHTML = '';
        // Update filter bar
        const allBlocks = JSON.parse(localStorage.getItem('userBlocks_tab6') || '[]');
        const fb = document.querySelector('.bfb');
        if (fb) { fb.outerHTML = buildFilterHTML(allBlocks); wireFilterBar(); }
      });
    });

    // Wire duplicate
    p.querySelector('.duplicate-button').addEventListener('click', async (e) => {
      e.stopPropagation();
      const { appManager } = await import('./appManager.js');
      const extras = {
        requiresAttunement: b.requiresAttunement === true,
        equipable: b.equipable === true,
        attuned: b.attuned === true,
        equipped: b.equipped === true,
        ...(b.bagGW ? { bagGW: b.bagGW, bagGH: b.bagGH, bagCells: b.bagCells, bagCellImgs: b.bagCellImgs } : {})
      };
      const newId = appManager.saveBlock('tab6', b.title, b.text, [...(b.tags||[])], [...(b.uses||[])], [], b.blockType, null, null, extras);
      L.innerHTML = ''; popOpenId = null;
      // Drop the new block into the existing bag
      const newBlocks = JSON.parse(localStorage.getItem('userBlocks_tab6') || '[]');
      const newBlock = newBlocks.find(nb => nb.id === newId);
      if (newBlock && engine) {
        const items = processBlocks([newBlock]);
        const itm = items[0];
        currentItems.push(itm);
        const oldU = currentUnit;
        currentUnit = calcU(currentItems);
        if (oldU !== currentUnit) {
          buildWalls();
          rescaleIP(containerW, containerH, oldU, containerW, containerH, currentUnit);
        }
        const pw = itm.bb.gw * currentUnit;
        const tl = PAD + 10, tr = containerW - PAD - 10;
        const x = tl + pw/2 + Math.random() * (tr - tl - pw);
        const y = -itm.bb.gh * currentUnit - 20;
        const bd = makeBody(itm, x, y, currentUnit);
        Matter.Body.setAngle(bd, Math.random() * 0.2 - 0.1);
        bd._item = itm;
        itemBodies.push(bd);
        Matter.Composite.add(engine.world, bd);
        const el = mkEl(itm, currentUnit);
        document.getElementById('bag-il').appendChild(el);
        itemElements.push(el);
        // Update filter bar
        const allBlocks = JSON.parse(localStorage.getItem('userBlocks_tab6') || '[]');
        const fb = document.querySelector('.bfb');
        if (fb) { fb.outerHTML = buildFilterHTML(allBlocks); wireFilterBar(); }
      }
    });

    // Wire edit — open edit overlay
    p.querySelector('.edit-button').addEventListener('click', (e) => {
      e.stopPropagation();
      L.innerHTML = ''; popOpenId = null;
      showEditOverlay(item);
    });

    // Append hidden, measure, then position
    p.style.visibility = 'hidden';
    L.appendChild(p);

    const srcE = p._srcEl, cnE = p._cn || document.getElementById('bag-cn');
    if (srcE && cnE) {
      const cr = cnE.getBoundingClientRect();
      const ir = srcE.getBoundingClientRect();
      const popW = p.offsetWidth, popH = p.offsetHeight;
      let px = (ir.left - cr.left) + ir.width/2 - popW/2;
      let py = (ir.top - cr.top) - 6 - popH;
      if (py < 4) py = (ir.bottom - cr.top) + 6;
      px = Math.max(4, Math.min(px, cr.width - popW - 4));
      py = Math.max(4, Math.min(py, cr.height - popH - 4));
      p.style.left = px + 'px';
      p.style.top = py + 'px';
    } else {
      p.style.left = '50%'; p.style.top = '50%'; p.style.transform = 'translate(-50%,-50%)';
    }
    p.style.visibility = '';
    p._srcEl = null; p._cn = null;
  }

  // Helper to re-wire filter bar after updating it
  function wireFilterBar() {
    document.querySelectorAll('.bf[data-f]').forEach(btn => btn.addEventListener('click', () => { activeFilter = btn.dataset.f; render(null); }));
    const ddTrigger = document.querySelector('.bf-dd-trigger');
    const ddMenu = document.querySelector('.bf-dd-menu');
    if (ddTrigger && ddMenu) {
      ddTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = ddMenu.style.display !== 'none';
        ddMenu.style.display = open ? 'none' : 'flex';
        ddTrigger.querySelector('.bf-dd-chev').style.transform = open ? '' : 'rotate(180deg)';
      });
      ddMenu.querySelectorAll('.bf-dd-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          activeFilter = (activeFilter === item.dataset.f) ? 'all' : item.dataset.f;
          render(null);
        });
      });
      document.addEventListener('click', function closeDD(e) {
        if (!e.target.closest('.bf-dd')) { ddMenu.style.display = 'none'; ddTrigger.querySelector('.bf-dd-chev').style.transform = ''; }
      });
    }
    const ab = document.getElementById('bag-add-btn'); if (ab) ab.addEventListener('click', () => showAddOverlay());
  }

  function filterBlks(all) {
    if (activeFilter==='all') return all;
    if (activeFilter==='equipped') return all.filter(b=>b.equipped);
    if (activeFilter==='attuned') return all.filter(b=>b.attuned);
    return all.filter(b=>{ const t=Array.isArray(b.blockType)?b.blockType[0]:b.blockType; return t===activeFilter; });
  }

  function buildFilterHTML(all) {
    const ac = all.filter(b=>b.attuned).length, am = parseInt(localStorage.getItem('tab6_attunement_max')||'3');
    const cSvg = '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>';
    const cnt = k => { if(k==='all')return all.length; if(k==='equipped')return all.filter(b=>b.equipped).length; if(k==='attuned')return all.filter(b=>b.attuned).length; return all.filter(b=>{const t=Array.isArray(b.blockType)?b.blockType[0]:b.blockType;return t===k;}).length; };
    let h = '<div class="bfb">';
    const FL = { all:'All', equipped:'Equipped', attuned:'Attuned' };
    ['all','equipped','attuned'].forEach(k=>{
      h+=`<button class="bf${activeFilter===k?' on':''}" data-f="${k}">${FL[k]}<span class="bfc">${cnt(k)}</span></button>`;
    });
    h+='<span class="bfd"></span>';
    const catKeys = Object.keys(CAT);
    const isCatFilter = catKeys.includes(activeFilter);
    const ddLabel = isCatFilter ? (activeFilter.length > 12 ? activeFilter.split(' ')[0] : activeFilter) : 'Type';
    h+=`<div class="bf-dd"><button class="bf bf-dd-trigger${isCatFilter?' on':''}">`;
    h+=ddLabel;
    if(isCatFilter) h+=`<span class="bfc">${cnt(activeFilter)}</span>`;
    h+=`<svg class="bf-dd-chev" viewBox="0 0 12 12"><path d="M3 4.5L6 7.5L9 4.5"/></svg></button>`;
    h+=`<div class="bf-dd-menu" style="display:none">`;
    catKeys.forEach(k=>{
      const label = k.length > 12 ? k.split(' ')[0] : k;
      h+=`<button class="bf-dd-item${activeFilter===k?' on':''}" data-f="${k}">${label}<span class="bf-dd-cnt">${cnt(k)}</span></button>`;
    });
    h+=`</div></div>`;
    h+=`<span class="bat"><svg viewBox="0 0 24 24">${cSvg}</svg>${ac}/${am}</span>`;
    h+=`<button class="bf bag-add-btn" id="bag-add-btn" title="Add item"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>`;
    h+='</div>';
    return h;
  }

  function rescaleIP(oW,oH,oU,nW,nH,nU) {
    const pos = itemBodies.map(b=>({x:b.position.x/oW*nW,y:b.position.y/oH*nH,a:b.angle}));
    itemBodies.forEach(b=>Matter.Composite.remove(engine.world,b)); itemBodies=[];
    itemElements.forEach(el=>el.remove()); itemElements=[];
    const il = document.getElementById('bag-il');
    currentItems.forEach((item,i)=>{
      const pw=item.bb.gw*nU, ph=item.bb.gh*nU;
      const px=pos[i]?Math.max(PAD+pw/2,Math.min(nW-PAD-pw/2,pos[i].x)):nW/2;
      const py=pos[i]?Math.min(nH-PAD-ph/2,pos[i].y):nH/2;
      const angle=pos[i]?pos[i].a:0;
      const b=makeBody(item,px,py,nU);
      Matter.Body.setAngle(b,angle);
      Matter.Body.setVelocity(b,{x:0,y:0}); Matter.Body.setAngularVelocity(b,0);
      b._item=item; itemBodies.push(b); Matter.Composite.add(engine.world,b);
      const el=mkEl(item,nU);
      // Position element immediately to prevent flash at (0,0)
      const ox=b._ox||0, oy=b._oy||0;
      const cos=Math.cos(angle), sin=Math.sin(angle);
      el.style.left=(px-(ox*cos-oy*sin)-pw/2)+'px';
      el.style.top=(py-(ox*sin+oy*cos)-ph/2)+'px';
      el.style.transform='rotate('+angle+'rad)';
      il.appendChild(el); itemElements.push(el);
    });
  }

  function destroy() {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
    if (engine) { Matter.Engine.clear(engine); engine = null; }
    wallBodies=[]; itemBodies=[]; itemElements=[]; currentItems=[];
  }

  // ── Main render ──────────────────────────────────────────────────
  const render = async (filteredBlocks = null) => {
    injectCSS();
    const all = JSON.parse(localStorage.getItem('userBlocks_tab6') || '[]');
    const display = filteredBlocks || all;
    const layout = document.querySelector('#tab6 .inventory-layout');
    const rs = document.getElementById('results_section_6');
    if (!layout || !rs) return;
    layout.classList.add('inv-bag-mode');

    if (display.length === 0) {
      destroy();
      rs.innerHTML = buildFilterHTML(all) + '<div class="bem">No items in inventory</div>';
      wireFilterBar();
      return;
    }

    rs.innerHTML = buildFilterHTML(all) + `<div class="bcn" id="bag-cn"><canvas id="bag-cv"></canvas><div class="bil" id="bag-il"></div><div class="bpl" id="bag-pl"></div></div>`;
    wireFilterBar();
    document.getElementById('bag-cn').addEventListener('click',e=>{if(!e.target.closest('.bi')&&!e.target.closest('.bpp')){document.getElementById('bag-pl').innerHTML='';popOpenId=null;}});

    const cn = document.getElementById('bag-cn');
    containerW = cn.offsetWidth||400; containerH = cn.offsetHeight||300;
    if (containerH < 200) { cn.style.minHeight='300px'; containerH=300; }
    const cv = document.getElementById('bag-cv');
    cv.width=containerW;cv.height=containerH;cv.style.width=containerW+'px';cv.style.height=containerH+'px';

    const visible = filterBlks(display);
    currentItems = processBlocks(visible);
    currentUnit = calcU(currentItems);

    if (!matterLoaded) { try { await loadMatter(); } catch(e) { rs.innerHTML+='<div style="color:var(--color-red);text-align:center;padding:10px;font-size:12px">Failed to load physics</div>'; return; } }
    if (engine) Matter.Engine.clear(engine);

    engine = Matter.Engine.create({gravity:{x:0,y:2},enableSleeping:true,positionIterations:14,velocityIterations:10});
    buildWalls();

    itemBodies=[]; itemElements=[];
    const tl=PAD+10, tr=containerW-PAD-10;
    const il = document.getElementById('bag-il');

    currentItems.forEach((item,i)=>{
      const pw=item.bb.gw*currentUnit;
      const x=tl+pw/2+Math.random()*(tr-tl-pw);
      const y=-item.bb.gh*currentUnit-i*42-20;
      const b=makeBody(item,x,y,currentUnit);
      Matter.Body.setAngle(b,Math.random()*.2-.1);
      b._item=item; itemBodies.push(b); Matter.Composite.add(engine.world,b);
      const el=mkEl(item,currentUnit); il.appendChild(el); itemElements.push(el);
    });

    const mouse=Matter.Mouse.create(cn);
    const mc=Matter.MouseConstraint.create(engine,{mouse,constraint:{stiffness:.1,damping:.02}});
    mouse.element.removeEventListener('mousewheel',mouse.mousewheel);
    mouse.element.removeEventListener('DOMMouseScroll',mouse.mousewheel);
    Matter.Composite.add(engine.world,mc);

    const ctx=cv.getContext('2d');
    if (animFrameId) cancelAnimationFrame(animFrameId);
    function upd() {
      Matter.Engine.update(engine,1000/60); drawBag(ctx);
      itemBodies.forEach((b,i)=>{
        const it=b._item,el=itemElements[i]; if(!it||!el) return;
        const u=currentUnit,pw=it.bb.gw*u,ph=it.bb.gh*u;
        const ox=b._ox||0,oy=b._oy||0,cos=Math.cos(b.angle),sin=Math.sin(b.angle);
        el.style.left=(b.position.x-(ox*cos-oy*sin)-pw/2)+'px';
        el.style.top=(b.position.y-(ox*sin+oy*cos)-ph/2)+'px';
        el.style.transform='rotate('+b.angle+'rad)';
      });
      animFrameId=requestAnimationFrame(upd);
    }
    upd();

    if (resizeObs) resizeObs.disconnect();
    let resizeTimer = null;
    resizeObs = new ResizeObserver(()=>{
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(()=>{
        const nW=cn.offsetWidth, nH=cn.offsetHeight;
        if(nW===containerW&&nH===containerH) return; if(nW<10||nH<10) return;
        const oW=containerW,oH=containerH,oU=currentUnit;
        containerW=nW;containerH=nH;
        cv.width=containerW;cv.height=containerH;cv.style.width=containerW+'px';cv.style.height=containerH+'px';
        currentUnit=calcU(currentItems); buildWalls(); rescaleIP(oW,oH,oU,containerW,containerH,currentUnit);
      }, 100);
    });
    resizeObs.observe(cn);
  };

  const isEnabled = () => localStorage.getItem('inventoryBagMode') === 'true';

  // ── Add-item overlay ─────────────────────────────────────────────
// ── Drawing overlay (shared Fabric.js logic) ─────────────────────
  const GRID = 5, GCELL = 42;
  let ovCat = 'Consumables';
  let activeFc = null; // active fabric canvas reference
  let clipboardPaths = null;

  function setupFabricCanvas(canvasId, goId, catColor) {
    const S = GCELL * GRID;
    const fc = new fabric.Canvas(canvasId, {
      isDrawingMode: true,
      width: S, height: S,
      selection: true,
    });
    fc.skipOffscreen = false;

    fc._updateDrawCursor = function() {
      if (!this.freeDrawingBrush) return;
      const size = this.freeDrawingBrush.width;
      const r = Math.max(size * 0.85, 2);
      const d = Math.ceil(r * 2 + 4);
      const c = d / 2;
      const dpr = window.devicePixelRatio || 1;
      const tmp = document.createElement('canvas');
      tmp.width = d * dpr; tmp.height = d * dpr;
      const ctx = tmp.getContext('2d');
      ctx.scale(dpr, dpr);
      if (this._isEraserActive) {
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.fillStyle = this.freeDrawingBrush.color || 'rgba(255,255,255,0.5)';
        ctx.fill();
      }
      this.freeDrawingCursor = 'url(' + tmp.toDataURL() + ') ' + (c * dpr) + ' ' + (c * dpr) + ', crosshair';
      this.upperCanvasEl.style.cursor = this.freeDrawingCursor;
    };

    // Style the wrapper — background is CSS so destination-out erasers only cut drawn content
    const wrapper = fc.wrapperEl;
    wrapper.style.background = 'rgba(20,20,20,0.8)';
    wrapper.style.border = '2px solid rgba(' + catColor + ',.25)';
    wrapper.style.borderRadius = '5px';
    wrapper.style.overflow = 'hidden';

// ── Capped-speed brush smoothing ─────────────────────────────────
    let _brushPos = null;
    let _cursorPos = null;
    let _brushRAF = null;
    const MAX_BRUSH_SPEED = 1.2;
    const origGetPointer = fc.getPointer.bind(fc);

    fc.getPointer = function(e, ignoreZoom) {
      const p = origGetPointer(e, ignoreZoom);
      p.x = Math.max(0, Math.min(S, p.x));
      p.y = Math.max(0, Math.min(S, p.y));
      return p;
    };

    function brushTick() {
      if (!fc._isCurrentlyDrawing || !fc.isDrawingMode || !_brushPos || !_cursorPos || fc._isEraserActive) {
        _brushRAF = null;
        return;
      }
      const dx = _cursorPos.x - _brushPos.x, dy = _cursorPos.y - _brushPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.3) {
        const speed = Math.min(MAX_BRUSH_SPEED, dist * 0.06);
        const move = Math.max(0.15, speed);
        const angle = Math.atan2(dy, dx);
        _brushPos.x += Math.cos(angle) * move;
        _brushPos.y += Math.sin(angle) * move;
        fc.freeDrawingBrush.onMouseMove(
          { x: _brushPos.x, y: _brushPos.y },
          { e: { shiftKey: false }, pointer: { x: _brushPos.x, y: _brushPos.y } }
        );
      }
      _brushRAF = requestAnimationFrame(brushTick);
    }

    const _origMouseDown = fc._onMouseDownInDrawingMode;
    fc._onMouseDownInDrawingMode = function(e) {
      _origMouseDown.call(this, e);
      if (this.isDrawingMode && this._isCurrentlyDrawing && !this._isEraserActive) {
        const p = this.getPointer(e);
        _brushPos = { x: p.x, y: p.y };
        _cursorPos = { x: p.x, y: p.y };
        if (!_brushRAF) _brushRAF = requestAnimationFrame(brushTick);
      }
    };

    let _drawingOutside = false;
    const _origDrawMove = fc._onMouseMoveInDrawingMode;
    fc._onMouseMoveInDrawingMode = function(e) {
      if (this._isEraserActive) {
        const p = origGetPointer(e);
        const outside = p.x < 0 || p.x >= S || p.y < 0 || p.y >= S;
        if (this._isCurrentlyDrawing && outside && !_drawingOutside) {
          _drawingOutside = true;
          this.freeDrawingBrush.onMouseUp({ e: e, pointer: this.getPointer(e) });
        } else if (!outside && _drawingOutside) {
          _drawingOutside = false;
          if (e.buttons > 0) {
            this._isCurrentlyDrawing = true;
            const pointer = this.getPointer(e);
            this.freeDrawingBrush.onMouseDown(pointer, { e: e, pointer: pointer });
          }
        } else if (!outside) {
          _origDrawMove.call(this, e);
        }
        return;
      }

      const p = origGetPointer(e);
      const clamped = { x: Math.max(0, Math.min(S, p.x)), y: Math.max(0, Math.min(S, p.y)) };
      const outside = p.x < 0 || p.x >= S || p.y < 0 || p.y >= S;

      if (this._isCurrentlyDrawing && outside && !_drawingOutside) {
        _drawingOutside = true;
        cancelAnimationFrame(_brushRAF); _brushRAF = null;
        this.freeDrawingBrush.onMouseUp({ e: e, pointer: _brushPos || clamped });
      } else if (!outside && _drawingOutside) {
        _drawingOutside = false;
        if (e.buttons > 0) {
          this._isCurrentlyDrawing = true;
          _brushPos = { x: clamped.x, y: clamped.y };
          _cursorPos = { x: clamped.x, y: clamped.y };
          this.freeDrawingBrush.onMouseDown(clamped, { e: e, pointer: clamped });
          if (!_brushRAF) _brushRAF = requestAnimationFrame(brushTick);
        }
      } else if (!outside && this._isCurrentlyDrawing) {
        _cursorPos = { x: clamped.x, y: clamped.y };
        if (this.freeDrawingCursor) this.upperCanvasEl.style.cursor = this.freeDrawingCursor;
      }
    };

    const _origMouseUpDraw = fc._onMouseUpInDrawingMode;
    fc._onMouseUpInDrawingMode = function(e) {
      cancelAnimationFrame(_brushRAF); _brushRAF = null;
      _origMouseUpDraw.call(this, e);
    };

    fc.on('mouse:up', () => {
      _brushPos = null;
      _cursorPos = null;
      cancelAnimationFrame(_brushRAF); _brushRAF = null;
      _drawingOutside = false;
      if (_altCloneActive) { _altCloneActive = false; detectFabricCells(fc, goId, CAT[ovCat]?.c || DEF.c); }
      if (fc.contextTop) fc.clearContext(fc.contextTop);
      fc.renderAll();
    });

    // Set default brush
    fc.freeDrawingBrush = new fabric.PencilBrush(fc);
    fc.freeDrawingBrush.color = 'rgba(' + catColor + ',.65)';
    fc.freeDrawingBrush.width = 1.8;

    // Grid lines are handled by the CSS overlay, not drawn on canvas

    // Customise selection handles and stroke behaviour
    fabric.Object.prototype.set({
      cornerColor: 'rgba(' + catColor + ',0.8)',
      cornerStyle: 'circle',
      cornerSize: 8,
      borderColor: 'rgba(' + catColor + ',0.4)',
      transparentCorners: false,
      borderScaleFactor: 1.5,
      padding: 4,
      strokeUniform: true,
    });

    // Keyboard: delete, copy, paste
    const keyHandler = (e) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        const active = fc.getActiveObjects();
        if (active.length) {
          active.forEach(obj => fc.remove(obj));
          fc.discardActiveObject();
          fc.renderAll();
          detectFabricCells(fc, goId, CAT[ovCat]?.c || DEF.c);
        }
      }

      if (mod && e.key === 'c') {
        const sel = fc.getActiveObject();
        if (!sel) return;
        const objects = fc.getActiveObjects().filter(o => !o._isEraser);
        if (!objects.length) return;
        e.preventDefault();
        if (sel.type === 'activeSelection') {
          clipboardPaths = objects.map(obj => {
            const d = obj.toObject();
            d.left = sel.left + obj.left;
            d.top = sel.top + obj.top;
            return d;
          });
        } else {
          clipboardPaths = [sel.toObject()];
        }
      }

      if (mod && e.key === 'v' && clipboardPaths && clipboardPaths.length) {
        e.preventDefault();
        const cc = CAT[ovCat]?.c || DEF.c;
        const strokeColor = 'rgba(' + cc + ',.65)';
        fabric.util.enlivenObjects(clipboardPaths, (objects) => {
          fc.discardActiveObject();
          objects.forEach(obj => {
            obj.set({ stroke: strokeColor, strokeUniform: true });
            fc.add(obj);
          });
          if (objects.length === 1) {
            fc.setActiveObject(objects[0]);
          } else if (objects.length > 1) {
            const sel = new fabric.ActiveSelection(objects, { canvas: fc });
            fc.setActiveObject(sel);
          }
          fc.renderAll();
          detectFabricCells(fc, goId, CAT[ovCat]?.c || DEF.c);
        });
      }

      if (mod && e.key === 'z') {
        e.preventDefault();
        if (fc._bagUndo) fc._bagUndo();
      }

    };
    document.addEventListener('keydown', keyHandler);
    fc._bagKeyHandler = keyHandler;

    // Alt+drag to duplicate selected objects (uses object:moving to avoid interfering with drawing)
    let _altCloneActive = false;
    fc.on('object:moving', (opt) => {
      if (!opt.e.altKey || _altCloneActive) return;
      _altCloneActive = true;
      const sel = fc.getActiveObject();
      if (!sel) return;
      if (sel.type === 'activeSelection') {
        sel.getObjects().forEach(obj => {
          obj.clone(cloned => {
            cloned.set({ left: sel.left + obj.left, top: sel.top + obj.top, strokeUniform: true });
            fc.add(cloned);
          });
        });
      } else {
        sel.clone(cloned => {
          cloned.set({ strokeUniform: true });
          fc.add(cloned);
        });
      }
      fc.renderAll();
    });

    // Build cell highlight overlay
    const goEl = document.getElementById(goId);
    if (goEl) {
      goEl.innerHTML = '';
      for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
        const d = document.createElement('div');
        d.className = 'bag-ov-gc'; d.dataset.r = r; d.dataset.c = c;
        d.style.cssText = 'left:' + (c * GCELL) + 'px;top:' + (r * GCELL) + 'px;width:' + GCELL + 'px;height:' + GCELL + 'px';
        goEl.appendChild(d);
      }
    }
    fc._updateDrawCursor();
    activeFc = fc;
    return fc;
  }

  function detectFabricCells(fc, goId, catColor) {
    const S = GCELL * GRID;
    const tmp = document.createElement('canvas');
    tmp.width = S; tmp.height = S;
    const tCtx = tmp.getContext('2d', { willReadFrequently: true });
    fc.getObjects().forEach(obj => {
      tCtx.save();
      if (obj._isEraser) tCtx.globalCompositeOperation = 'destination-out';
      obj.render(tCtx);
      tCtx.restore();
    });
    const oc = [];

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const imgData = tCtx.getImageData(c * GCELL, r * GCELL, GCELL, GCELL).data;
        let found = false;
        for (let i = 3; i < imgData.length && !found; i += 16) {
          if (imgData[i] > 20) found = true;
        }
        if (found) oc.push({ r, c });
      }
    }

    // Fill holes — any empty cell that can't reach the grid edge is interior
    const occSet = new Set(oc.map(o => o.r + ',' + o.c));
    const exterior = new Set();
    const queue = [];
    // Seed with all unoccupied edge cells
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if ((r === 0 || r === GRID-1 || c === 0 || c === GRID-1) && !occSet.has(r+','+c)) {
          exterior.add(r+','+c);
          queue.push({r, c});
        }
      }
    }
    // Flood fill exterior
    while (queue.length) {
      const {r, c} = queue.shift();
      [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr, nc]) => {
        const key = nr+','+nc;
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !occSet.has(key) && !exterior.has(key)) {
          exterior.add(key);
          queue.push({r: nr, c: nc});
        }
      });
    }
    // Any cell that's neither occupied nor exterior is a hole — fill it
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const key = r+','+c;
        if (!occSet.has(key) && !exterior.has(key)) {
          oc.push({r, c});
        }
      }
    }

    // Check connectivity (4-directional only)
    let connected = true;
    if (oc.length > 1) {
      const ocSet = new Set(oc.map(o => o.r + ',' + o.c));
      const visited = new Set();
      const q = [oc[0]];
      visited.add(oc[0].r + ',' + oc[0].c);
      while (q.length) {
        const { r, c } = q.shift();
        [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr, nc]) => {
          const key = nr + ',' + nc;
          if (ocSet.has(key) && !visited.has(key)) {
            visited.add(key);
            q.push({ r: nr, c: nc });
          }
        });
      }
      connected = visited.size === oc.length;
    }

    // Update highlights
    const cc = catColor;
    document.querySelectorAll('#' + goId + ' .bag-ov-gc').forEach(el => {
      const r = +el.dataset.r, c = +el.dataset.c;
      const h = oc.some(o => o.r === r && o.c === c);
      el.style.background = h ? 'rgba(' + cc + ',.12)' : 'transparent';
      el.style.borderColor = h ? 'rgba(' + cc + ',.15)' : 'rgba(255,255,255,.03)';
    });

    // Update info text with connectivity warning
    const detId = goId.replace('-go', '-det');
    const di = document.getElementById(detId);
    if (di) {
      if (!oc.length) { di.textContent = 'Draw to set shape'; di.className = 'bag-ov-det em'; di.style.color = ''; }
      else if (!connected) { di.innerHTML = '<b>' + oc.length + '</b> cells — must be connected'; di.className = 'bag-ov-det'; di.style.color = '#ff6b6b'; }
      else { di.innerHTML = '<b>' + oc.length + '</b> cells'; di.className = 'bag-ov-det'; di.style.color = ''; }
    }

    oc._connected = connected;
    return oc;
  }

  function exportFabricCells(fc, cells, r1, c1) {
    const S = GCELL * GRID;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = S; exportCanvas.height = S;
    const expCtx = exportCanvas.getContext('2d', { willReadFrequently: true });
    fc.getObjects().forEach(obj => {
      expCtx.save();
      if (obj._isEraser) expCtx.globalCompositeOperation = 'destination-out';
      obj.render(expCtx);
      expCtx.restore();
    });

    const cellImgs = {};
    cells.forEach(o => {
      const t = document.createElement('canvas');
      t.width = GCELL; t.height = GCELL;
      t.getContext('2d').drawImage(exportCanvas, o.c * GCELL, o.r * GCELL, GCELL, GCELL, 0, 0, GCELL, GCELL);
      cellImgs[(o.r - r1) + ',' + (o.c - c1)] = t.toDataURL('image/png');
    });
    return cellImgs;
  }

  function splitIntoRegions(sourceCanvas) {
    const w = sourceCanvas.width, h = sourceCanvas.height;
    const ctx = sourceCanvas.getContext('2d');
    const data = ctx.getImageData(0, 0, w, h).data;
    const labels = new Int32Array(w * h);
    let nextLabel = 1;
    const regions = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (labels[idx] !== 0 || data[idx * 4 + 3] <= 10) continue;
        const queue = [idx];
        labels[idx] = nextLabel;
        let minX = x, maxX = x, minY = y, maxY = y;
        while (queue.length) {
          const i = queue.pop();
          const cx = i % w, cy = (i - cx) / w;
          if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const ni = ny * w + nx;
            if (labels[ni] === 0 && data[ni * 4 + 3] > 10) { labels[ni] = nextLabel; queue.push(ni); }
          }
        }
        regions.push({ minX, maxX, minY, maxY, label: nextLabel });
        nextLabel++;
      }
    }
    return regions.map(r => {
      const rw = r.maxX - r.minX + 1, rh = r.maxY - r.minY + 1;
      const c = document.createElement('canvas'); c.width = rw; c.height = rh;
      const src = ctx.getImageData(r.minX, r.minY, rw, rh);
      for (let py = 0; py < rh; py++) for (let px = 0; px < rw; px++) {
        if (labels[(r.minY + py) * w + (r.minX + px)] !== r.label) src.data[(py * rw + px) * 4 + 3] = 0;
      }
      c.getContext('2d').putImageData(src, 0, 0);
      return { canvas: c, x: r.minX, y: r.minY };
    });
  }

  function wireToolButtons(fc, prefix, goId, catColorGetter) {
    function clearToolHighlight() {
      document.querySelectorAll('#' + prefix + '-tools .bag-ov-tb').forEach(t => t.classList.remove('on'));
    }
    let undoStack = [];

    // Track paths for undo — eraser flattens canvas so erasure is permanent
    fc.on('path:created', (e) => {
      if (fc._isEraserActive) {
        e.path.set({
          globalCompositeOperation: 'destination-out',
          stroke: 'rgba(255,255,255,1)',
          strokeUniform: true,
          _isEraser: true
        });
        const preState = JSON.stringify(fc.toJSON(['_isEraser']));
        const S = fc.width;
        const tmp = document.createElement('canvas');
        tmp.width = S; tmp.height = S;
        const ctx = tmp.getContext('2d', { willReadFrequently: true });
        fc.getObjects().forEach(obj => {
          ctx.save();
          if (obj._isEraser || obj.globalCompositeOperation === 'destination-out')
            ctx.globalCompositeOperation = 'destination-out';
          obj.render(ctx);
          ctx.restore();
        });
        const parts = splitIntoRegions(tmp);
        fc.clear();
        if (!parts.length) {
          fc.renderAll();
          undoStack.push({ _flatten: true, _state: preState });
          detectFabricCells(fc, goId, catColorGetter());
          return;
        }
        let loaded = 0;
        parts.forEach(part => {
          fabric.Image.fromURL(part.canvas.toDataURL('image/png'), (img) => {
            img.set({ left: part.x, top: part.y, originX: 'left', originY: 'top' });
            fc.add(img);
            loaded++;
            if (loaded === parts.length) {
              fc.renderAll();
              undoStack.push({ _flatten: true, _state: preState });
              detectFabricCells(fc, goId, catColorGetter());
            }
          });
        });
        return;
      }
      e.path.set({ strokeUniform: true });
      undoStack.push(e.path);
      fc.renderAll();
    });

    // t1: Select
    document.getElementById(prefix + '-t1').onclick = () => {
      fc.isDrawingMode = false;
      fc._isEraserActive = false;
      clearToolHighlight();
      document.getElementById(prefix + '-t1').classList.add('on');
    };
    // t2: Fine pen
    document.getElementById(prefix + '-t2').onclick = () => {
      fc.isDrawingMode = true;
      fc._isEraserActive = false;
      fc.freeDrawingBrush = new fabric.PencilBrush(fc);
      fc.freeDrawingBrush.color = 'rgba(' + catColorGetter() + ',.65)';
      fc.freeDrawingBrush.width = 1.8;
      clearToolHighlight();
      document.getElementById(prefix + '-t2').classList.add('on');
      fc._updateDrawCursor();
    };
    // t3: Pen
    document.getElementById(prefix + '-t3').onclick = () => {
      fc.isDrawingMode = true;
      fc._isEraserActive = false;
      fc.freeDrawingBrush = new fabric.PencilBrush(fc);
      fc.freeDrawingBrush.color = 'rgba(' + catColorGetter() + ',.65)';
      fc.freeDrawingBrush.width = 3;
      clearToolHighlight();
      document.getElementById(prefix + '-t3').classList.add('on');
      fc._updateDrawCursor();
    };
    // t4: Eraser — draws a preview stroke, then path:created marks it destination-out
    document.getElementById(prefix + '-t4').onclick = () => {
      fc.isDrawingMode = true;
      fc._isEraserActive = true;
      fc.freeDrawingBrush = new fabric.PencilBrush(fc);
      fc.freeDrawingBrush.color = 'rgba(255,255,255,0.25)';
      fc.freeDrawingBrush.width = 18;
      clearToolHighlight();
      document.getElementById(prefix + '-t4').classList.add('on');
      fc._updateDrawCursor();
    };
    // t5: Undo (action — no tool highlight change)
    fc._bagUndo = () => {
      const last = undoStack.pop();
      if (!last) return;
      if (last._flatten) {
        fc.loadFromJSON(last._state, () => {
          fc.backgroundColor = '';
          const restored = fc.getObjects();
          undoStack.length = 0;
          restored.forEach(obj => {
            obj.set({ strokeUniform: true });
            if (obj._isEraser) obj.set({ selectable: false, evented: false });
            undoStack.push(obj);
          });
          fc.renderAll();
          detectFabricCells(fc, goId, catColorGetter());
        });
      } else {
        fc.remove(last);
        fc.renderAll();
        detectFabricCells(fc, goId, catColorGetter());
      }
    };
    document.getElementById(prefix + '-t5').onclick = fc._bagUndo;
    // t6: Clear (action — no tool highlight change)
    document.getElementById(prefix + '-t6').onclick = () => {
      fc.clear();
      fc.renderAll();
      undoStack = [];
      detectFabricCells(fc, goId, catColorGetter());
    };
  }

  function destroyFabricCanvas(fc) {
    if (fc._bagKeyHandler) {
      document.removeEventListener('keydown', fc._bagKeyHandler);
    }
    fc.dispose();
    activeFc = null;
  }

  function toolButtonsHTML(prefix) {
    return `<div class="bag-ov-tw" id="${prefix}-tools">
      <button class="bag-ov-tb" id="${prefix}-t1" title="Select / Move"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51z"/><path d="M13 13l6 6"/></svg></button>
      <button class="bag-ov-tb on" id="${prefix}-t2" title="Fine pen"><div class="bag-ov-dd" style="width:2px;height:2px"></div></button>
      <button class="bag-ov-tb" id="${prefix}-t3" title="Pen"><div class="bag-ov-dd" style="width:4px;height:4px"></div></button>      <button class="bag-ov-tb" id="${prefix}-t4" title="Eraser"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(12,10) rotate(-15)"><rect x="-4" y="-9" width="8" height="18" rx="1"/><line x1="-4" y1="3" x2="4" y2="3"/></g><line x1="3" y1="21" x2="9" y2="21" opacity="0.35" stroke-dasharray="2 2"/><line x1="15" y1="21" x2="21" y2="21"/></svg>
      <button class="bag-ov-tb" id="${prefix}-t5" title="Undo"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h10a5 5 0 0 1 0 10H9"/><path d="M3 10l4-4M3 10l4 4"/></svg></button>
      <button class="bag-ov-tb" id="${prefix}-t6" title="Clear all"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M5 6v14a1 1 0 001 1h12a1 1 0 001-1V6"/></svg></button>
    </div>`;
  }

  function showAddOverlay() {
    let ovEl = document.getElementById('bag-add-ov');
    if (ovEl) { ovEl.remove(); if (activeFc) destroyFabricCanvas(activeFc); return; }

    ovCat = 'Consumables';
    const S = GCELL * GRID;

    const catBtns = Object.keys(CAT).map(k => {
      const c = CAT[k].c;
      const sel = k === ovCat;
      return `<button class="bag-ov-cat${sel ? ' on' : ''}" data-cat="${k}" style="${sel ? 'background:rgba(' + c + ',.12);border-color:rgba(' + c + ',.3);color:rgba(' + c + ',.8)' : ''}">` +
        (k.length > 12 ? k.split(' ')[0] : k) + '</button>';
    }).join('');

    const ov = document.createElement('div');
    ov.className = 'bag-ov'; ov.id = 'bag-add-ov';
    ov.innerHTML = `<div class="bag-ov-card">
      <div class="bag-ov-title">Add Item</div>
      <div><div class="bag-ov-label">Name</div><input class="bag-ov-input" id="bov-name" placeholder="Item name..."></div>
      <div><div class="bag-ov-label">Type</div><div class="bag-ov-cats" id="bov-cats">${catBtns}</div></div>
      <div class="bag-ov-toggles">
        <label class="bag-ov-tgl"><input type="checkbox" id="bov-attune"> Requires attunement</label>
        <label class="bag-ov-tgl"><input type="checkbox" id="bov-equip"> Equipable</label>
      </div>
      <div><div class="bag-ov-label">Draw your item</div>
        <div class="bag-ov-cw">
          <div class="bag-ov-da" style="width:${S}px;height:${S}px">
            <canvas id="bov-cv" width="${S}" height="${S}"></canvas>
            <div class="bag-ov-gc-wrap" id="bov-go"></div>
          </div>
          ${toolButtonsHTML('bov')}
          <div class="bag-ov-det em" id="bov-det">Draw to set shape</div>
        </div>
      </div>
      <div><div class="bag-ov-label">Description (optional)</div><textarea class="bag-ov-textarea" id="bov-desc" placeholder="Item description..."></textarea></div>
      <div class="bag-ov-btns">
        <button class="bag-ov-btn bag-ov-cn" id="bov-cancel">Cancel</button>
        <button class="bag-ov-btn bag-ov-sv" id="bov-save">Add to bag</button>
      </div>
    </div>`;
    document.body.appendChild(ov);

    // Load Fabric and initialize
    loadFabric().then(() => {
      const cc = CAT[ovCat]?.c || DEF.c;
      const fc = setupFabricCanvas('bov-cv', 'bov-go', cc);

      // Detect cells after each path drawn
      fc.on('path:created', () => { if (!fc._isEraserActive) detectFabricCells(fc, 'bov-go', CAT[ovCat]?.c || DEF.c); });
      fc.on('object:modified', () => detectFabricCells(fc, 'bov-go', CAT[ovCat]?.c || DEF.c));

      wireToolButtons(fc, 'bov', 'bov-go', () => CAT[ovCat]?.c || DEF.c);

      // Category buttons
      ov.querySelectorAll('.bag-ov-cat').forEach(b => b.addEventListener('click', () => {
        ovCat = b.dataset.cat;
        ov.querySelectorAll('.bag-ov-cat').forEach(x => { x.classList.remove('on'); x.style.background = ''; x.style.borderColor = ''; x.style.color = ''; });
        b.classList.add('on');
        const nc = CAT[ovCat]?.c || DEF.c;
        b.style.background = 'rgba(' + nc + ',.12)'; b.style.borderColor = 'rgba(' + nc + ',.3)'; b.style.color = 'rgba(' + nc + ',.8)';
        // Update brush color
        if (fc.isDrawingMode && fc.freeDrawingBrush) {
          fc.freeDrawingBrush.color = 'rgba(' + nc + ',.65)';
        }
        fc.getObjects().forEach(obj => {
          if (!obj._isEraser) obj.set({ stroke: 'rgba(' + nc + ',.65)' });
        });
        fc.wrapperEl.style.border = '2px solid rgba(' + nc + ',.25)';
        detectFabricCells(fc, 'bov-go', nc);
        fc._updateDrawCursor();
        fabric.Object.prototype.set({
          cornerColor: 'rgba(' + nc + ',0.8)',
          borderColor: 'rgba(' + nc + ',0.4)',
        });
        fc.getObjects().forEach(obj => obj.set({
          cornerColor: 'rgba(' + nc + ',0.8)',
          borderColor: 'rgba(' + nc + ',0.4)',
        }));
        const sel = fc.getActiveObject();
        if (sel) { fc.discardActiveObject(); fc.setActiveObject(sel); }
        fc.renderAll();
      }));

      // Cancel
      document.getElementById('bov-cancel').onclick = () => { destroyFabricCanvas(fc); ov.remove(); };

      // Save
      document.getElementById('bov-save').onclick = async () => {
        const name = document.getElementById('bov-name').value.trim();
        if (!name) { document.getElementById('bov-name').style.borderColor = 'rgba(255,107,107,.5)'; return; }
        const oc = detectFabricCells(fc, 'bov-go', CAT[ovCat]?.c || DEF.c);
        if (!oc.length) { document.getElementById('bov-det').textContent = 'Please draw something'; document.getElementById('bov-det').style.color = '#ff6b6b'; return; }
        if (!oc._connected) { return; }

        let r1 = GRID, r2 = -1, c1 = GRID, c2 = -1;
        oc.forEach(o => { if (o.r < r1) r1 = o.r; if (o.r > r2) r2 = o.r; if (o.c < c1) c1 = o.c; if (o.c > c2) c2 = o.c; });
        const gw = c2 - c1 + 1, gh = r2 - r1 + 1;
        const cellImgs = exportFabricCells(fc, oc, r1, c1);
        const fabricData = JSON.stringify(fc.toJSON());
        const cells = oc.map(o => ({ r: o.r - r1, c: o.c - c1 }));
        const desc = document.getElementById('bov-desc').value.trim();
        const reqAttune = document.getElementById('bov-attune').checked;
        const equipable = document.getElementById('bov-equip').checked;

        const { appManager } = await import('./appManager.js');
        appManager.saveBlock('tab6', name, desc, [], [], [], ovCat, null, null, {
          requiresAttunement: reqAttune, equipable, attuned: false, equipped: false,
          bagGW: gw, bagGH: gh, bagCells: cells, bagCellImgs: cellImgs, bagFabricData: fabricData,
        });

        destroyFabricCanvas(fc); ov.remove();

        // Drop new item into existing bag
        const newBlocks = JSON.parse(localStorage.getItem('userBlocks_tab6') || '[]');
        const newBlock = newBlocks.find(nb => nb.title === name && nb.blockType === ovCat);
        if (newBlock && engine) {
          const items = processBlocks([newBlock]);
          const itm = items[0];
          currentItems.push(itm);
          const oldU = currentUnit;
          currentUnit = calcU(currentItems);
          if (oldU !== currentUnit) { buildWalls(); rescaleIP(containerW, containerH, oldU, containerW, containerH, currentUnit); }
          const pw = itm.bb.gw * currentUnit;
          const tl = PAD + 10, tr = containerW - PAD - 10;
          const x = tl + pw / 2 + Math.random() * (tr - tl - pw);
          const y = -itm.bb.gh * currentUnit - 20;
          const bd = makeBody(itm, x, y, currentUnit);
          Matter.Body.setAngle(bd, Math.random() * 0.2 - 0.1);
          bd._item = itm; itemBodies.push(bd); Matter.Composite.add(engine.world, bd);
          const el = mkEl(itm, currentUnit);
          document.getElementById('bag-il').appendChild(el); itemElements.push(el);
          const allBlocks = JSON.parse(localStorage.getItem('userBlocks_tab6') || '[]');
          const fb = document.querySelector('.bfb');
          if (fb) { fb.outerHTML = buildFilterHTML(allBlocks); wireFilterBar(); }
        } else {
          const { filterManager } = await import('./filterManager.js');
          filterManager.applyFilters('6');
        }
      };
    });
  }

  function showEditOverlay(item) {
    let ovEl = document.getElementById('bag-edit-ov');
    if (ovEl) { ovEl.remove(); if (activeFc) destroyFabricCanvas(activeFc); }

    const b = item.block;
    const currentType = Array.isArray(b.blockType) ? b.blockType[0] : (b.blockType || '');
    ovCat = currentType || 'Consumables';
    const S = GCELL * GRID;

    const catBtns = Object.keys(CAT).map(k => {
      const c = CAT[k].c;
      const sel = k === currentType;
      return `<button class="bag-ov-cat${sel ? ' on' : ''}" data-cat="${k}" style="${sel ? 'background:rgba(' + c + ',.12);border-color:rgba(' + c + ',.3);color:rgba(' + c + ',.8)' : ''}">` +
        (k.length > 12 ? k.split(' ')[0] : k) + '</button>';
    }).join('');

    const ov = document.createElement('div');
    ov.className = 'bag-ov'; ov.id = 'bag-edit-ov';
    ov.innerHTML = `<div class="bag-ov-card">
      <div class="bag-ov-title">Edit Item</div>
      <div><div class="bag-ov-label">Name</div><input class="bag-ov-input" id="bev-name" value="${b.title.replace(/"/g, '&quot;')}"></div>
      <div><div class="bag-ov-label">Type</div><div class="bag-ov-cats" id="bev-cats">${catBtns}</div></div>
      <div class="bag-ov-toggles">
        <label class="bag-ov-tgl"><input type="checkbox" id="bev-attune"${b.requiresAttunement ? ' checked' : ''}> Requires attunement</label>
        <label class="bag-ov-tgl"><input type="checkbox" id="bev-equip"${b.equipable ? ' checked' : ''}> Equipable</label>
      </div>
      <div><div class="bag-ov-label">Redraw item (leave blank to keep current)</div>
        <div class="bag-ov-cw">
          <div class="bag-ov-da" style="width:${S}px;height:${S}px">
            <canvas id="bev-cv" width="${S}" height="${S}"></canvas>
            <div class="bag-ov-gc-wrap" id="bev-go"></div>
          </div>
          ${toolButtonsHTML('bev')}
          <div class="bag-ov-det em" id="bev-det">Draw to change shape</div>
        </div>
      </div>
      <div><div class="bag-ov-label">Description</div><textarea class="bag-ov-textarea" id="bev-desc">${b.text || ''}</textarea></div>
      <div class="bag-ov-btns">
        <button class="bag-ov-btn bag-ov-cn" id="bev-cancel">Cancel</button>
        <button class="bag-ov-btn bag-ov-sv" id="bev-save">Save changes</button>
      </div>
    </div>`;
    document.body.appendChild(ov);

    loadFabric().then(() => {
      const cc = CAT[ovCat]?.c || DEF.c;
      const fc = setupFabricCanvas('bev-cv', 'bev-go', cc);

      // Load existing drawing — prefer Fabric data for editable strokes, fall back to cell images
      if (b.bagFabricData) {
        fc.loadFromJSON(b.bagFabricData, () => {
          fc.backgroundColor = '';
          fc.getObjects().forEach(obj => obj.set({ strokeUniform: true }));
          fc.renderAll();
          detectFabricCells(fc, 'bev-go', cc);
        });
      } else if (b.bagCellImgs && b.bagCells && b.bagCells.length) {
        let loaded = 0;
        const total = b.bagCells.length;
        b.bagCells.forEach(c => {
          const key = c.r + ',' + c.c;
          const src = b.bagCellImgs[key];
          if (!src) { loaded++; return; }
          fabric.Image.fromURL(src, (img) => {
            img.set({ left: c.c * GCELL, top: c.r * GCELL, scaleX: 1, scaleY: 1 });
            fc.add(img);
            loaded++;
            if (loaded >= total) {
              fc.renderAll();
              detectFabricCells(fc, 'bev-go', cc);
            }
          });
        });
      }

      fc.on('path:created', () => { if (!fc._isEraserActive) detectFabricCells(fc, 'bev-go', CAT[ovCat]?.c || DEF.c); });
      fc.on('object:modified', () => detectFabricCells(fc, 'bev-go', CAT[ovCat]?.c || DEF.c));

      wireToolButtons(fc, 'bev', 'bev-go', () => CAT[ovCat]?.c || DEF.c);

      // Category buttons
      ov.querySelectorAll('.bag-ov-cat').forEach(btn => btn.addEventListener('click', () => {
        ovCat = btn.dataset.cat;
        ov.querySelectorAll('.bag-ov-cat').forEach(x => { x.classList.remove('on'); x.style.background = ''; x.style.borderColor = ''; x.style.color = ''; });
        btn.classList.add('on');
        const nc = CAT[ovCat]?.c || DEF.c;
        btn.style.background = 'rgba(' + nc + ',.12)'; btn.style.borderColor = 'rgba(' + nc + ',.3)'; btn.style.color = 'rgba(' + nc + ',.8)';
        if (fc.isDrawingMode && fc.freeDrawingBrush) fc.freeDrawingBrush.color = 'rgba(' + nc + ',.65)';
        fc.getObjects().forEach(obj => {
          if (!obj._isEraser) obj.set({ stroke: 'rgba(' + nc + ',.65)' });
        });
        fc.wrapperEl.style.border = '2px solid rgba(' + nc + ',.25)';
        detectFabricCells(fc, 'bev-go', nc);
        fc._updateDrawCursor();
        fabric.Object.prototype.set({
          cornerColor: 'rgba(' + nc + ',0.8)',
          borderColor: 'rgba(' + nc + ',0.4)',
        });
        fc.getObjects().forEach(obj => obj.set({
          cornerColor: 'rgba(' + nc + ',0.8)',
          borderColor: 'rgba(' + nc + ',0.4)',
        }));
        const sel = fc.getActiveObject();
        if (sel) { fc.discardActiveObject(); fc.setActiveObject(sel); }
        fc.renderAll();
      }));

      document.getElementById('bev-cancel').onclick = () => { destroyFabricCanvas(fc); ov.remove(); };

      document.getElementById('bev-save').onclick = async () => {
        const name = document.getElementById('bev-name').value.trim();
        if (!name) { document.getElementById('bev-name').style.borderColor = 'rgba(255,107,107,.5)'; return; }
        const desc = document.getElementById('bev-desc').value.trim();
        const reqAttune = document.getElementById('bev-attune').checked;
        const equipable = document.getElementById('bev-equip').checked;

        const oc = detectFabricCells(fc, 'bev-go', CAT[ovCat]?.c || DEF.c);
        if (oc.length > 0 && !oc._connected) { return; }
        let extras = { requiresAttunement: reqAttune, equipable, attuned: reqAttune ? (b.attuned || false) : false, equipped: equipable ? (b.equipped || false) : false };

        if (oc.length > 0) {
          let r1 = GRID, r2 = -1, c1 = GRID, c2 = -1;
          oc.forEach(o => { if (o.r < r1) r1 = o.r; if (o.r > r2) r2 = o.r; if (o.c < c1) c1 = o.c; if (o.c > c2) c2 = o.c; });
          extras.bagGW = c2 - c1 + 1; extras.bagGH = r2 - r1 + 1;
          extras.bagCellImgs = exportFabricCells(fc, oc, r1, c1);
          extras.bagCells = oc.map(o => ({ r: o.r - r1, c: o.c - c1 }));
          extras.bagFabricData = JSON.stringify(fc.toJSON());
        } else {
          if (b.bagGW) extras.bagGW = b.bagGW;
          if (b.bagGH) extras.bagGH = b.bagGH;
          if (b.bagCells) extras.bagCells = b.bagCells;
          if (b.bagCellImgs) extras.bagCellImgs = b.bagCellImgs;
        }

        const { appManager } = await import('./appManager.js');
        appManager.saveBlock('tab6', name, desc, b.tags || [], b.uses || [], [], ovCat, b.id, b.timestamp, extras);
        destroyFabricCanvas(fc); ov.remove();

        // Update just this block
        const idx = currentItems.findIndex(ci => ci.block.id === b.id);
        const updatedBlocks = JSON.parse(localStorage.getItem('userBlocks_tab6') || '[]');
        const updatedBlock = updatedBlocks.find(nb => nb.id === b.id);
        if (idx !== -1 && updatedBlock) {
          const newItems = processBlocks([updatedBlock]);
          currentItems[idx] = newItems[0];
          const oldEl = itemElements[idx];
          const newEl = mkEl(currentItems[idx], currentUnit);
          newEl.style.left = oldEl.style.left; newEl.style.top = oldEl.style.top; newEl.style.transform = oldEl.style.transform;
          oldEl.replaceWith(newEl); itemElements[idx] = newEl;
          if (oc.length > 0) {
            const oldBody = itemBodies[idx];
            const pos = { x: oldBody.position.x, y: oldBody.position.y };
            const angle = oldBody.angle;
            Matter.Composite.remove(engine.world, oldBody);
            const newBody = makeBody(currentItems[idx], pos.x, pos.y, currentUnit);
            Matter.Body.setAngle(newBody, angle); newBody._item = currentItems[idx];
            itemBodies[idx] = newBody; Matter.Composite.add(engine.world, newBody);
            // Wake all bodies so they settle around the changed shape
            itemBodies.forEach(bd => Matter.Sleeping.set(bd, false));
          } else { itemBodies[idx]._item = currentItems[idx]; }
          const fb = document.querySelector('.bfb');
          if (fb) { fb.outerHTML = buildFilterHTML(updatedBlocks); wireFilterBar(); }
        }
      };
    });
  }

  return { render, isEnabled, showAddOverlay };
})();