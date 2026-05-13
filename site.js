(() => {
  const target = document.querySelector('main h1');
  if (!target) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const PALETTE = ['#e11d48', '#f97316', '#fbbf24', '#10b981', '#06b6d4', '#3b82f6', '#9333ea'];
  let paletteIdx = 0;

  const wrapChars = (node, insideLink = false) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const ch of child.textContent) {
          if (/\s/.test(ch)) {
            frag.appendChild(document.createTextNode(ch));
          } else {
            const span = document.createElement('span');
            span.className = 'char';
            span.textContent = ch;
            if (!insideLink) {
              span.style.setProperty('--target-color', PALETTE[paletteIdx % PALETTE.length]);
              paletteIdx++;
            }
            frag.appendChild(span);
          }
        }
        child.parentNode.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        wrapChars(child, insideLink || child.tagName === 'A');
      }
    }
  };
  wrapChars(target);

  const chars = Array.from(target.querySelectorAll('.char'));
  const RADIUS = 220;
  const MIN_WGHT = 350;
  const MAX_WGHT = 900;

  let centers = [];
  let mx = -9999, my = -9999;
  let active = false;
  let raf = null;

  const measure = () => {
    centers = chars.map((c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  };

  const render = () => {
    raf = null;
    for (let i = 0; i < chars.length; i++) {
      const c = centers[i];
      let t = 0;
      if (active) {
        const dx = mx - c.x;
        const dy = my - c.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        t = Math.max(0, 1 - d / RADIUS);
        t = t * t * (3 - 2 * t);
      }
      const w = Math.round(MIN_WGHT + (MAX_WGHT - MIN_WGHT) * t);
      chars[i].style.fontVariationSettings = `"wght" ${w}`;
      chars[i].style.setProperty('--t', t.toFixed(3));
    }
  };

  const schedule = () => {
    if (raf == null) raf = requestAnimationFrame(render);
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

  window.addEventListener('resize', () => { measure(); schedule(); });
  window.addEventListener('scroll', () => { measure(); schedule(); }, { passive: true });
})();
