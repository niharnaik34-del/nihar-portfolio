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

/* the 3D car is the final stop — right before the corridor ends
   and hands off to the flat 3D Modeling / Show Reel sections */
const CAR_INDEX = posters.length;      // 8
const TOTAL_STOPS = posters.length + 1; // 9
const CAR_Z = posterZ(CAR_INDEX);
const END_Z = CAR_Z - 9;

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

/* shatter window — starts as the camera reaches the car, finishes
   right before the corridor hands off to the sections below */
const progressAtCar = (START_Z - CAR_Z) / (START_Z - END_Z);
const SHATTER_START = Math.max(progressAtCar - 0.03, 0.05);
const SHATTER_END = 0.99;

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
    spacer.style.height = `${window.innerHeight * (TOTAL_STOPS + 1)}px`;
  }
  sizeSpacer();

  /* --- captions: one per poster, plus one for the car --- */
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
  const carCaption = document.createElement('div');
  carCaption.className = 'caption';
  carCaption.innerHTML = `
    <span class="caption-tag">3D Modeling</span>
    <h3>Low-Poly Build</h3>
    <p>A car built straight in 3D — right before it comes apart into pieces.</p>
  `;
  captionsEl.appendChild(carCaption);
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

      const pose = basePose(i);
      const width = 3.4;
      const height = width * (tex.image.height / tex.image.width);

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      mesh.position.set(pose.x, pose.y, pose.z);
      mesh.rotation.y = pose.rotY;
      scene.add(mesh);

      meshes.push({ mesh, baseX: pose.x, baseY: pose.y, baseRotY: pose.rotY, z: pose.z, index: i });
    });
  });

  /* --- a simple low-poly 3D car, built straight from geometry --- */
  const carGroup = new THREE.Group();
  const carParts = [];

  function addCarPart(geo, color, x, y, z, rotX = 0){
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    if (rotX) mesh.rotation.x = rotX;
    carGroup.add(mesh);
    carParts.push(mesh);
    return mesh;
  }

  addCarPart(new THREE.BoxGeometry(2.6, 0.55, 1.15), 0xE23A2A, 0, 0.35, 0);       // body
  addCarPart(new THREE.BoxGeometry(1.3, 0.5, 1.02), 0x15130F, -0.1, 0.85, 0);    // cabin
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 18);
  [[0.95, 0.62], [0.95, -0.62], [-0.95, 0.62], [-0.95, -0.62]].forEach(([x, z]) => {
    addCarPart(wheelGeo, 0x0a0a0a, x, 0, z, Math.PI / 2);
  });
  [[1.28, 0.35, 0.35], [1.28, 0.35, -0.35]].forEach(([x, y, z]) => {
    addCarPart(new THREE.BoxGeometry(0.08, 0.14, 0.22), 0xEFB92A, x, y, z);       // headlights
  });

  carGroup.position.set(0, 0, CAR_Z);
  scene.add(carGroup);

  /* --- particle shatter, bursts from the car once the camera reaches it --- */
  const SHATTER_COUNT = 460;
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

    shatterPositions[idx * 3] = 0;
    shatterPositions[idx * 3 + 1] = 0;
    shatterPositions[idx * 3 + 2] = CAR_Z;

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

    /* shatter amount — 0 until the camera reaches the car */
    const shatterAmount = THREE.MathUtils.smoothstep(scrollProgress, SHATTER_START, SHATTER_END);

    /* car: slow showcase spin + bob, then shrink/fade as it shatters */
    carGroup.position.y = Math.sin(t * 0.6) * 0.12;
    carGroup.rotation.y = t * 0.35;
    const carShrink = 1 - shatterAmount * 0.55;
    carGroup.scale.setScalar(carShrink);
    carParts.forEach((part) => { part.material.opacity = 1 - shatterAmount; });

    /* shatter particles burst outward from the car's position */
    if (shatterAmount > 0.001) {
      const posAttr = shatterGeo.attributes.position;
      for (let idx = 0; idx < SHATTER_COUNT; idx++) {
        const { dir, dist, spin } = shatterOffsets[idx];
        const travel = shatterAmount * dist;
        posAttr.array[idx * 3]     = dir.x * travel;
        posAttr.array[idx * 3 + 1] = dir.y * travel + Math.sin(t * 2 + spin) * 0.06 * shatterAmount;
        posAttr.array[idx * 3 + 2] = CAR_Z + dir.z * travel;
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
