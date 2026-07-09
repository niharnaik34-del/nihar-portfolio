import * as THREE from './vendor/three.module.min.js';

/* ---------------------------------------------------------
   Data — one entry per poster, in gallery order
--------------------------------------------------------- */
const posters = [
  { file: 'pop-out.jpg',          title: 'Pop Out',              tag: 'Collage / Fashion',
    desc: 'A maximalist collage poster layering K-fashion editorial imagery with sticker-style type and Hangul accents.' },
  { file: 'khana-time.jpg',       title: 'Khana Time',           tag: 'Typography / Culture',
    desc: 'A Devanagari-led poster built around warm, weathered food-stall photography and vernacular type.' },
  { file: 'super-model.jpg',      title: 'Super Model',          tag: 'Editorial / Fashion',
    desc: 'A high-fashion editorial layering oversized display type over portraiture with a hand-scribbled finish.' },
  { file: 'hold-your-vision.jpg', title: 'Hold Your Vision',     tag: 'Typography / Concept',
    desc: 'A type-driven concept on perception and reality — torn paper reveals the eyes.' },
  { file: 'embrace-horizon.jpg',  title: 'Embrace the Horizon',  tag: 'Poster / Lifestyle',
    desc: 'Script and serif type set against a single bloom, built around a quiet idea of freedom.' },
  { file: 'supreme-god.jpg',      title: 'Supreme God',          tag: 'Editorial / Mythology',
    desc: 'An editorial cover treating Vishnu as a cosmic subject, with celestial texture and gold detail.' },
  { file: 'every-wave.jpg',       title: 'Every Wave',           tag: 'Typography / Experimental',
    desc: 'Type as texture — oversized letterforms overwhelm a lone figure at the shoreline.' },
  { file: 'what-is-real.jpg',     title: 'What Is Real',         tag: 'Typography / Experimental',
    desc: 'A pixel-type poster built like a scattered thought, set in raw bitmap type.' },
];

const SPACING = 7;
const posterZ = (i) => -10 - i * SPACING;
const START_Z = 14;
const END_Z = posterZ(posters.length - 1) - 9;

/* ---------------------------------------------------------
   DOM refs
--------------------------------------------------------- */
const workWrap    = document.querySelector('.work-wrap');
const spacer       = document.querySelector('.experience-spacer');
const layer        = document.querySelector('.experience-layer');
const canvas        = document.querySelector('#gl');
const loaderEl      = document.querySelector('.loader');
const loaderBar     = document.querySelector('.loader-bar');
const heroCopy       = document.querySelector('.hero-copy');
const captionsEl     = document.querySelector('.captions');
const fallbackGrid   = document.querySelector('.fallback-grid');
const progressFill   = document.querySelector('.progress-fill');

/* ---------------------------------------------------------
   Capability check — fall back to the static grid when
   WebGL is unavailable or the user prefers reduced motion
--------------------------------------------------------- */
function hasWebGL(){
  try {
    const test = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (test.getContext('webgl') || test.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!hasWebGL() || prefersReducedMotion) {
  layer.style.display = 'none';
  spacer.style.display = 'none';
  loaderEl.style.display = 'none';
  fallbackGrid.style.display = 'block';
} else {
  runExperience();
}

/* ---------------------------------------------------------
   3D experience
--------------------------------------------------------- */
function runExperience(){
  fallbackGrid.style.display = 'none';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15130f);
  scene.fog = new THREE.FogExp2(0x15130f, 0.032);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
  camera.position.set(0, 0, START_Z);

  function sizeCanvas(){
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  sizeCanvas();

  function sizeSpacer(){
    spacer.style.height = `${window.innerHeight * (posters.length + 1)}px`;
  }
  sizeSpacer();

  /* --- captions, built once from data --- */
  posters.forEach((p) => {
    const el = document.createElement('div');
    el.className = 'caption';
    el.innerHTML = `
      <span class="caption-tag">${p.tag}</span>
      <h3>${p.title}</h3>
      <p>${p.desc}</p>
    `;
    captionsEl.appendChild(el);
  });
  const captionEls = Array.from(captionsEl.children);

  /* --- loading manager --- */
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    loaderBar.style.width = `${Math.round((loaded / total) * 100)}%`;
  };
  manager.onLoad = () => {
    loaderEl.classList.add('is-hidden');
    setTimeout(() => { loaderEl.style.display = 'none'; }, 700);
  };
  const texLoader = new THREE.TextureLoader(manager);

  /* --- build poster meshes --- */
  const meshes = [];

  posters.forEach((p, i) => {
    texLoader.load(`images/${p.file}`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;

      const width = 3.4;
      const height = width * (tex.image.height / tex.image.width);
      const side = i % 2 === 0 ? -1 : 1;
      const baseX = side * 2.5 + Math.sin(i * 0.9) * 0.5;
      const baseY = Math.sin(i * 1.15) * 1.1;
      const baseRotY = -side * 0.32;
      const z = posterZ(i);

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      mesh.position.set(baseX, baseY, z);
      mesh.rotation.y = baseRotY;
      scene.add(mesh);

      meshes.push({ mesh, baseX, baseY, baseRotY, z, index: i });
    });
  });

  /* --- scroll progress (0 → 1 across the whole spacer) --- */
  let scrollProgress = 0;
  function updateProgress(){
    const rect = spacer.getBoundingClientRect();
    const total = spacer.offsetHeight - window.innerHeight;
    const scrolled = -rect.top;
    scrollProgress = THREE.MathUtils.clamp(scrolled / Math.max(total, 1), 0, 1);

    if (scrollProgress >= 0.999) {
      layer.classList.add('is-hidden');
    } else {
      layer.classList.remove('is-hidden');
    }
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  window.addEventListener('resize', () => {
    sizeCanvas();
    sizeSpacer();
    updateProgress();
  });

  /* --- render loop --- */
  const clock = new THREE.Clock();

  function animate(){
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    const camZ = THREE.MathUtils.lerp(START_Z, END_Z, scrollProgress);
    const drift = 0.35;
    camera.position.z = camZ;
    camera.position.x = Math.sin(t * 0.15) * drift * 0.6;
    camera.position.y = Math.sin(t * 0.2) * drift * 0.4;
    camera.lookAt(camera.position.x, camera.position.y - 0.1, camera.position.z - 10);

    /* hero copy fade-out over the first ~9% of scroll */
    const heroFade = 1 - THREE.MathUtils.smoothstep(scrollProgress, 0, 0.09);
    heroCopy.style.opacity = heroFade;
    heroCopy.style.transform = `translateY(${(1 - heroFade) * -24}px)`;
    heroCopy.style.pointerEvents = heroFade < 0.05 ? 'none' : 'auto';

    /* find nearest poster to camera for the "active" pulse */
    let activeIndex = -1;
    let bestDist = Infinity;
    meshes.forEach((m) => {
      const dist = Math.abs(camera.position.z - m.z);
      if (dist < bestDist) { bestDist = dist; activeIndex = m.index; }
    });

    meshes.forEach((m) => {
      const bob = Math.sin(t * 0.5 + m.index * 1.7) * 0.14;
      const wobbleY = Math.sin(t * 0.3 + m.index) * 0.05;
      const wobbleZ = Math.sin(t * 0.22 + m.index * 2) * 0.02;

      m.mesh.position.y = m.baseY + bob;
      m.mesh.rotation.y = m.baseRotY + wobbleY;
      m.mesh.rotation.z = wobbleZ;

      const dist = Math.abs(camera.position.z - m.z);
      const isActive = m.index === activeIndex && dist < SPACING * 0.62;
      const targetScale = isActive ? 1.08 : 1.0;
      const s = THREE.MathUtils.lerp(m.mesh.scale.x || 1, targetScale, 0.08);
      m.mesh.scale.setScalar(s);
    });

    captionEls.forEach((el, i) => {
      const dist = Math.abs(camera.position.z - posterZ(i));
      const op = THREE.MathUtils.clamp(1 - dist / (SPACING * 0.58), 0, 1);
      el.style.opacity = op;
      el.style.transform = `translateY(${(1 - op) * 16}px)`;
      el.style.pointerEvents = op > 0.5 ? 'auto' : 'none';
    });

    progressFill.style.transform = `scaleY(${scrollProgress})`;

    renderer.render(scene, camera);
  }
  animate();
}
