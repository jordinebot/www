(() => {
  const target = document.querySelector('main h1');
  if (!target) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const PALETTE = ['#e11d48', '#f97316', '#fbbf24', '#10b981', '#06b6d4', '#3b82f6', '#9333ea'];
  const MIN_WGHT_DEFAULT = 400;
  const MIN_WGHT_WHO = 600;
  let paletteIdx = 0;

  const wrapChars = (node, ctx = { insideLink: false, insideWho: false }) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        const tokens = child.textContent.match(/\s+|\S+/g) || [];
        for (const token of tokens) {
          if (/^\s+$/.test(token)) {
            frag.appendChild(document.createTextNode(token));
          } else {
            const word = document.createElement('span');
            word.className = 'word';
            for (const ch of token) {
              const span = document.createElement('span');
              span.className = 'char';
              span.textContent = ch;
              span.dataset.minWght = ctx.insideWho ? MIN_WGHT_WHO : MIN_WGHT_DEFAULT;
              if (!ctx.insideLink) {
                span.style.setProperty('--target-color', PALETTE[paletteIdx % PALETTE.length]);
                paletteIdx++;
              }
              word.appendChild(span);
            }
            frag.appendChild(word);
          }
        }
        child.parentNode.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        wrapChars(child, {
          insideLink: ctx.insideLink || child.tagName === 'A',
          insideWho: ctx.insideWho || (child.classList && child.classList.contains('who')),
        });
      }
    }
  };
  wrapChars(target);

  const chars = Array.from(target.querySelectorAll('.char'));
  const mins = chars.map((c) => Number(c.dataset.minWght));
  const RADIUS = 220;
  const MAX_WGHT = 900;
  const ATTACK_TAU = 0.04;
  const DECAY_TAU = 0.45;
  const SETTLE_EPSILON = 0.003;

  let centers = [];
  let currentT = new Array(chars.length).fill(0);
  let mx = -9999, my = -9999;
  let active = false;
  let raf = null;
  let lastTime = 0;

  const measure = () => {
    centers = chars.map((c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  };

  const render = (now) => {
    const dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0;
    lastTime = now;
    let settling = false;
    for (let i = 0; i < chars.length; i++) {
      const c = centers[i];
      let goal = 0;
      if (active) {
        const dx = mx - c.x;
        const dy = my - c.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        let t = Math.max(0, 1 - d / RADIUS);
        goal = t * t * (3 - 2 * t);
      }
      const cur = currentT[i];
      const tau = goal > cur ? ATTACK_TAU : DECAY_TAU;
      const k = dt > 0 ? 1 - Math.exp(-dt / tau) : 0;
      const next = cur + (goal - cur) * k;
      currentT[i] = next;
      if (Math.abs(goal - next) > SETTLE_EPSILON) settling = true;
      const minW = mins[i];
      const w = Math.round(minW + (MAX_WGHT - minW) * next);
      chars[i].style.fontVariationSettings = `"wght" ${w}`;
      chars[i].style.setProperty('--t', next.toFixed(3));
    }
    if (settling) {
      raf = requestAnimationFrame(render);
    } else {
      raf = null;
      lastTime = 0;
    }
  };

  const schedule = () => {
    if (raf == null) {
      lastTime = 0;
      raf = requestAnimationFrame(render);
    }
  };

  const onLoad = () => { measure(); schedule(); };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(onLoad);
  } else {
    onLoad();
  }

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    active = true;
    if (!centers.length) measure();
    schedule();
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    active = false;
    schedule();
  });

  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t) return;
    mx = t.clientX;
    my = t.clientY;
    active = true;
    if (!centers.length) measure();
    schedule();
  }, { passive: true });

  const onTouchEnd = () => {
    active = false;
    schedule();
  };
  document.addEventListener('touchend', onTouchEnd);
  document.addEventListener('touchcancel', onTouchEnd);

  window.addEventListener('resize', () => { measure(); schedule(); });
  window.addEventListener('scroll', () => { measure(); schedule(); }, { passive: true });
})();
