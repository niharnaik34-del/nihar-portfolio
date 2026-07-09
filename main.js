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

/* particle shatter finale — triggers as the camera clears the last poster */
const SHATTER_START = 0.86;
const SHATTER_END = 0.99;
const ACCENT_HEX = [0xE23A2A, 0x1F2AE0, 0xEFB92A, 0x9CC93A, 0xffffff];

function basePose(i){
  const side = i % 2 === 0 ? -1 : 1;
  return {
    x: side * 2.5 + Math.sin(i * 0.9) * 0.5,
    y: Math.sin(i * 1.15) * 1.1,
    rotY: -side * 0.32,
    z: posterZ(i),
  };
}

/* ---------------------------------------------------------
   DOM refs
--------------------------------------------------------- */
const spacer        = document.querySelector('.experience-spacer');
const layer          = document.querySelector('.experience-layer');
const canvas          = document.querySelector('#gl');
const loaderEl        = document.querySelector('.loader');
const loaderBar       = document.querySelector('.loader-bar');
const heroCopy         = document.querySelector('.hero-copy');
const captionsEl       = document.querySelector('.captions');
const fallbackGrid     = document.querySelector('.fallback-grid');
const progressFill     = document.querySelector('.progress-fill');

/* ---------------------------------------------------------
   3D Modeling cards — tap to toggle wireframe on touch
   devices (hover already handles this on desktop via CSS)
--------------------------------------------------------- */
document.querySelectorAll('.model-media').forEach((el) => {
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', 'Toggle wireframe view');
  el.addEventListener('click', () => el.classList.toggle('is-active'));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.classList.toggle('is-active');
    }
  });
});

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
  const lastIndex = posters.length - 1;

  posters.forEach((p, i) => {
    texLoader.load(`images/${p.file}`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;

      const pose = basePose(i);
      const width = 3.4;
      const height = width * (tex.image.height / tex.image.width);

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      mesh.position.set(pose.x, pose.y, pose.z);
      mesh.rotation.y = pose.rotY;
      scene.add(mesh);

      meshes.push({ mesh, baseX: pose.x, baseY: pose.y, baseRotY: pose.rotY, z: pose.z, index: i, isLast: i === lastIndex });
    });
  });

  /* --- particle shatter finale, centered on the last poster --- */
  const origin = basePose(lastIndex);
  const SHATTER_COUNT = 420;
  const shatterOffsets = [];
  const shatterPositions = new Float32Array(SHATTER_COUNT * 3);
  const shatterColors = new Float32Array(SHATTER_COUNT * 3);

  for (let idx = 0; idx < SHATTER_COUNT; idx++) {
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    const dist = 1.5 + Math.random() * 5.5;
    shatterOffsets.push({ dir, dist, spin: Math.random() * Math.PI * 2 });

    shatterPositions[idx * 3] = origin.x;
    shatterPositions[idx * 3 + 1] = origin.y;
    shatterPositions[idx * 3 + 2] = origin.z;

    const c = new THREE.Color(ACCENT_HEX[idx % ACCENT_HEX.length]);
    shatterColors[idx * 3] = c.r;
    shatterColors[idx * 3 + 1] = c.g;
    shatterColors[idx * 3 + 2] = c.b;
  }

  const shatterGeo = new THREE.BufferGeometry();
  shatterGeo.setAttribute('position', new THREE.BufferAttribute(shatterPositions, 3));
  shatterGeo.setAttribute('color', new THREE.BufferAttribute(shatterColors, 3));
  const shatterMat = new THREE.PointsMaterial({
    size: 0.09, vertexColors: true, transparent: true, opacity: 0, depthWrite: false,
  });
  const shatterPoints = new THREE.Points(shatterGeo, shatterMat);
  scene.add(shatterPoints);

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

    /* shatter amount — 0 until near the very end of the corridor */
    const shatterAmount = THREE.MathUtils.smoothstep(scrollProgress, SHATTER_START, SHATTER_END);

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
      let s = THREE.MathUtils.lerp(m.mesh.scale.x || 1, targetScale, 0.08);

      if (m.isLast) {
        s *= 1 - shatterAmount * 0.4;
        m.mesh.material.opacity = 1 - shatterAmount;
      }
      m.mesh.scale.setScalar(s);
    });

    /* animate the shatter particles outward from the last poster */
    if (shatterAmount > 0.001) {
      const posAttr = shatterGeo.attributes.position;
      for (let idx = 0; idx < SHATTER_COUNT; idx++) {
        const { dir, dist, spin } = shatterOffsets[idx];
        const travel = shatterAmount * dist;
        posAttr.array[idx * 3]     = origin.x + dir.x * travel;
        posAttr.array[idx * 3 + 1] = origin.y + dir.y * travel + Math.sin(t * 2 + spin) * 0.06 * shatterAmount;
        posAttr.array[idx * 3 + 2] = origin.z + dir.z * travel;
      }
      posAttr.needsUpdate = true;
    }
    const fadeIn = THREE.MathUtils.smoothstep(shatterAmount, 0, 0.12);
    const fadeOut = 1 - THREE.MathUtils.smoothstep(shatterAmount, 0.7, 1);
    shatterMat.opacity = fadeIn * fadeOut * 0.9;

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
