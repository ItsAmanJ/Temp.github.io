/* ================================================================
   AMAN'S PORTFOLIO — script.js  (3D Enhanced Edition)
   ----------------------------------------------------------------
   1.  Three.js hero scene  (replaces 2D particle canvas)
   2.  Typed / rotating tagline
   3.  Navbar scroll-state & mobile menu toggle
   4.  Scroll-reveal  (IntersectionObserver + GSAP enhancements)
   5.  Skill bar animation
   6.  3D Card Tilt  (mouse-reactive perspective transform)
   7.  Custom cursor  (glow dot + lagging ring)
   8.  Footer year auto-update
   9.  Google Slides embed handler
   10. Active nav-link highlight on scroll
================================================================ */


/* ----------------------------------------------------------------
   1.  THREE.JS HERO SCENE
       A wireframe icosahedron nested inside an outer glow shell,
       two orbiting torus rings, and a field of floating particles.
       Everything reacts to mouse movement via camera parallax.
---------------------------------------------------------------- */
(function initThreeHero() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const hero = document.getElementById('hero');
  let W = canvas.offsetWidth  || window.innerWidth;
  let H = canvas.offsetHeight || window.innerHeight;

  /* ── Scene & perspective camera ────────────────────────────── */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200);
  camera.position.z = 14;

  /* ── Renderer — reuse the existing <canvas> element ────────── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);   /* transparent → hero bg shows */

  /* ── Main icosahedron: clean edge-only wireframe ────────────── */
  const icoEdges = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.6, 1));
  const icoLines = new THREE.LineSegments(
    icoEdges,
    new THREE.LineBasicMaterial({ color: 0x2979ff, transparent: true, opacity: 0.55 })
  );
  scene.add(icoLines);

  /* ── Outer shell: larger icosahedron in cyan (depth layer) ──── */
  const outerEdges = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(3.3, 1));
  const outerLines = new THREE.LineSegments(
    outerEdges,
    new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.13 })
  );
  scene.add(outerLines);

  /* ── Occluder: invisible mesh blocks particles behind the ico ── */
  const occluderMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.55, 1),
    new THREE.MeshBasicMaterial({ color: 0x080c14, transparent: true, opacity: 0.7 })
  );
  scene.add(occluderMesh);

  /* ── Helper: create a torus ring ───────────────────────────── */
  function makeRing(radius, tube, color, opacity, rx, ry) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 4, 90),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
    );
    mesh.rotation.x = rx || 0;
    mesh.rotation.y = ry || 0;
    scene.add(mesh);
    return mesh;
  }
  const ring1 = makeRing(5.0, 0.018, 0x2979ff, 0.20, Math.PI * 0.40, 0);
  const ring2 = makeRing(5.8, 0.012, 0x00e5ff, 0.11, Math.PI * 0.20, Math.PI * 0.5);

  /* ── Floating point particles (fewer on mobile) ─────────────── */
  const isMobile = window.matchMedia('(pointer: coarse)').matches;
  const pCount   = isMobile ? 70 : 200;
  const pos      = new Float32Array(pCount * 3);

  for (let i = 0; i < pCount; i++) {
    const r     = 8 + Math.random() * 9;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0x4a8fff,
      size: isMobile ? 0.06 : 0.075,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    })
  );
  scene.add(particles);

  /* ── Mouse tracking (on hero element, not canvas) ───────────── */
  let targetX = 0, targetY = 0, curX = 0, curY = 0;

  if (hero) {
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      targetX =  ((e.clientX - r.left) / r.width  - 0.5) * 2;
      targetY = -((e.clientY - r.top)  / r.height - 0.5) * 2;
    }, { passive: true });
    hero.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; });
  }

  /* ── Scroll-based Z-push (subtle zoom as user scrolls away) ─── */
  let scrollOffset = 0;
  window.addEventListener('scroll', () => {
    scrollOffset = window.scrollY / window.innerHeight;
  }, { passive: true });

  /* ── Resize handler ─────────────────────────────────────────── */
  window.addEventListener('resize', () => {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }, { passive: true });

  /* ── Animation loop ─────────────────────────────────────────── */
  let t = 0;
  (function animate() {
    requestAnimationFrame(animate);
    t += 0.008;

    /* Smooth mouse lerp */
    curX += (targetX - curX) * 0.04;
    curY += (targetY - curY) * 0.04;

    /* Icosahedron: base auto-rotation + mouse tilt */
    icoLines.rotation.y = t * 0.35 + curX * 0.5;
    icoLines.rotation.x = t * 0.22 + curY * 0.3;
    icoLines.rotation.z = t * 0.10;

    /* Occluder mirrors the main geo exactly */
    occluderMesh.rotation.copy(icoLines.rotation);

    /* Outer shell counter-rotates for depth illusion */
    outerLines.rotation.y = -t * 0.15 + curX * 0.2;
    outerLines.rotation.x =  t * 0.10 + curY * 0.15;

    /* Rings orbit independently */
    ring1.rotation.z =  t * 0.12;
    ring2.rotation.y =  t * 0.09;
    ring2.rotation.z = -t * 0.07;

    /* Particle cloud drifts slowly */
    particles.rotation.y = t * 0.05;
    particles.rotation.x = t * 0.02;

    /* Camera parallax + scroll push-back */
    camera.position.x += (curX * 1.2 - camera.position.x) * 0.05;
    camera.position.y += (curY * 1.2 - camera.position.y) * 0.05;
    camera.position.z  = 14 + scrollOffset * 3;  /* pulls back as you scroll */
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  })();
})();


/* ----------------------------------------------------------------
   2.  TYPED / ROTATING TAGLINE
---------------------------------------------------------------- */
(function initTyped() {
  const el = document.getElementById('typedRole');
  if (!el) return;

  const roles = [
    'JEE Aspirant',
    'Creative Editor',
    'Android Modder',
    'Robotics Builder',
    'Linux Explorer',
    'Badminton Player',
  ];

  let roleIdx = 0, charIdx = 0, isErasing = false;
  const TYPE_SPEED  = 85;
  const ERASE_SPEED = 45;
  const PAUSE_FULL  = 2200;
  const PAUSE_EMPTY = 400;

  function tick() {
    const current = roles[roleIdx];
    if (!isErasing) {
      charIdx++;
      el.textContent = current.slice(0, charIdx);
      if (charIdx === current.length) {
        isErasing = true;
        setTimeout(tick, PAUSE_FULL);
        return;
      }
      setTimeout(tick, TYPE_SPEED);
    } else {
      charIdx--;
      el.textContent = current.slice(0, charIdx);
      if (charIdx === 0) {
        isErasing = false;
        roleIdx = (roleIdx + 1) % roles.length;
        setTimeout(tick, PAUSE_EMPTY);
        return;
      }
      setTimeout(tick, ERASE_SPEED);
    }
  }

  setTimeout(tick, 1800);
})();


/* ----------------------------------------------------------------
   3.  NAVBAR — scroll state + mobile hamburger toggle
---------------------------------------------------------------- */
(function initNav() {
  const navbar     = document.getElementById('navbar');
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  function handleScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  hamburger?.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
    mobileMenu.classList.toggle('open', isOpen);
    mobileMenu.setAttribute('aria-hidden', !isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
})();

/* Global close-menu (called from mobile link onclicks in HTML) */
function closeMenu() {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.classList.remove('open');
  hamburger?.setAttribute('aria-expanded', false);
  mobileMenu?.classList.remove('open');
  mobileMenu?.setAttribute('aria-hidden', true);
  document.body.style.overflow = '';
}


/* ----------------------------------------------------------------
   4.  SCROLL REVEAL  (IntersectionObserver)
       Adds .visible to .reveal elements entering the viewport.
       Also triggers skill bars and optional GSAP enhancements.
---------------------------------------------------------------- */
(function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('visible');

      /* Skill bar fill animation */
      el.querySelectorAll('.skill-fill').forEach(bar => {
        setTimeout(() => {
          bar.style.width = bar.style.getPropertyValue('--p') ||
                            getComputedStyle(bar).getPropertyValue('--p');
        }, 200);
      });

      /* ── GSAP enhancements (gracefully skipped if GSAP absent) ── */
      if (typeof gsap !== 'undefined') {

        /* Tag cloud: tags scatter in from scale-0 with random stagger */
        const tags = el.querySelectorAll('.tag');
        if (tags.length > 0) {
          gsap.from(tags, {
            scale: 0,
            opacity: 0,
            duration: 0.35,
            stagger: { amount: 0.8, from: 'random' },
            ease: 'back.out(1.5)',
            delay: 0.3,
          });
        }

        /* Stat numbers: bounce in from small scale */
        const statNums = el.querySelectorAll('.stat-num');
        if (statNums.length > 0) {
          gsap.from(statNums, {
            scale: 0.4,
            opacity: 0,
            duration: 0.55,
            stagger: 0.1,
            ease: 'back.out(2)',
            delay: 0.3,
          });
        }

        /* Timeline cards: slide in from the right */
        const tlCards = el.querySelectorAll('.timeline-card');
        if (tlCards.length > 0) {
          gsap.from(tlCards, {
            x: 30,
            opacity: 0,
            duration: 0.6,
            ease: 'power3.out',
            delay: 0.1,
          });
        }
      }

      observer.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();


/* ----------------------------------------------------------------
   5.  SKILL BAR FILL (DOMContentLoaded fallback)
       Fills bars that are already in the viewport on first load.
---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.skill-fill').forEach(bar => {
    const target = bar.style.getPropertyValue('--p');
    if (target) setTimeout(() => { bar.style.width = target; }, 600);
  });
});


/* ----------------------------------------------------------------
   6.  3D CARD TILT
       On mousemove: perspective rotateX/rotateY toward cursor.
       On mouseleave: smoothly springs back to flat.
       A spotlight radial gradient follows the cursor inside the card.
---------------------------------------------------------------- */
function initCardTilt() {
  document.querySelectorAll('.skill-card, .hobby-card').forEach(card => {
    let raf;

    card.addEventListener('mousemove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width  - 0.5;   /* -0.5 → +0.5 */
        const y = (e.clientY - rect.top)  / rect.height - 0.5;

        /* Fast transition so the tilt tracks the mouse instantly */
        card.style.transition =
          'transform 0.1s ease, box-shadow var(--trans), border-color var(--trans), background var(--trans)';
        card.style.transform =
          `perspective(700px) rotateX(${-y * 14}deg) rotateY(${x * 14}deg) translateZ(8px)`;

        /* Spotlight position (used by CSS ::after radial-gradient) */
        card.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
        card.style.setProperty('--my', `${(y + 0.5) * 100}%`);
      });
    });

    card.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      /* Slow spring-back on leave */
      card.style.transition =
        'transform 0.55s cubic-bezier(.4,0,.2,1), box-shadow var(--trans), border-color var(--trans), background var(--trans)';
      card.style.transform = '';
    });
  });
}


/* ----------------------------------------------------------------
   7.  CUSTOM CURSOR  (fine-pointer / desktop only)
       A glowing dot tracks the mouse exactly.
       A larger ring lags behind for a kinetic feel.
       Both scale up when hovering over interactive elements.
---------------------------------------------------------------- */
function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;

  /* Only show on devices with a fine (mouse) pointer */
  if (!window.matchMedia('(pointer: fine)').matches) {
    cursor.style.display = 'none';
    return;
  }

  const dot  = cursor.querySelector('.cursor-dot');
  const ring = cursor.querySelector('.cursor-ring');
  let mx = -200, my = -200;
  let rx = -200, ry = -200;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });

  /* Independent rAF loop so the ring always interpolates smoothly */
  (function updateCursor() {
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
    rx += (mx - rx) * 0.1;
    ry += (my - ry) * 0.1;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(updateCursor);
  })();

  /* Expand ring + change colour on interactive elements */
  document.querySelectorAll('a, button, .skill-card, .hobby-card, .tag, .timeline-card, .btn').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
  });
}


/* ----------------------------------------------------------------
   8.  FOOTER — dynamic copyright year
---------------------------------------------------------------- */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();


/* ----------------------------------------------------------------
   9.  GOOGLE SLIDES EMBED
       Hides the placeholder overlay once a real URL is set.
---------------------------------------------------------------- */
(function initSlidesEmbed() {
  const iframe = document.getElementById('robotSlides');
  const ph     = document.getElementById('slidesPH');
  if (!iframe || !ph) return;
  const src = iframe.getAttribute('src') || '';
  if (src.startsWith('http')) ph.classList.add('hidden');
  iframe.addEventListener('load', () => {
    if ((iframe.getAttribute('src') || '').startsWith('http')) ph.classList.add('hidden');
  });
})();


/* ----------------------------------------------------------------
   10. ACTIVE NAV LINK — highlight whichever section is in view
---------------------------------------------------------------- */
(function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-link');

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute('id');
      links.forEach(link => {
        link.style.color =
          link.getAttribute('href') === `#${id}` ? 'var(--accent)' : '';
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(sec => obs.observe(sec));
})();


/* ----------------------------------------------------------------
   BOOT — initialise card tilt and cursor after DOM is parsed.
   (Script is at bottom of <body> so DOM is already available,
    but DOMContentLoaded is used as a safe guard.)
---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initCardTilt();
  initCursor();
});
