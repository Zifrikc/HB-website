import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

// Helpers de UI — fuerzan display directamente sin depender de !important
function showEl(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('visible');
  el.style.removeProperty('display');
}
function hideEl(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('visible'); // CRÍTICO: quitar visible antes de ocultar
  el.classList.add('hidden');
  el.style.display = 'none';      // Forzar inline (gana sobre cualquier CSS)
}

// ==========================================
// CONFIGURACIÓN BASE THREE.JS
// ==========================================
const container = document.getElementById('canvas-container') as HTMLElement;
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 30;

// ==========================================
// LUCES
// ==========================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffbe0, 1.2);
sunLight.position.set(15, 30, 15);
sunLight.castShadow = true;
scene.add(sunLight);

const fillLight = new THREE.PointLight(0x8a2be2, 1.5, 80);
fillLight.position.set(-10, 8, 5);
scene.add(fillLight);

// ==========================================
// ANIMATION MIXERS
// ==========================================
const mixers: THREE.AnimationMixer[] = [];

// ==========================================
// PARTÍCULAS MÁGICAS
// ==========================================
const particleGeometry = new THREE.BufferGeometry();
const particleCount = 400;
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) positions[i] = (Math.random() - 0.5) * 50;
particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particleMaterial = new THREE.PointsMaterial({
  size: 0.12, color: 0x00ffff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending
});
const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// ==========================================
// AUDIO
// ==========================================
const bgm = new Audio('/sounds/narutos-theme-song intro.mp3');
bgm.loop = true; bgm.volume = 0.5;

const finalBgm = new Audio('/sounds/naruto ost konoha peace 2.mp3');
finalBgm.loop = true; finalBgm.volume = 0.5;

const tojiAudio  = new Audio('/sounds/toji-fushiguro.mp3');
const painAudio  = new Audio('/sounds/pain-shinra-tensei-ha.mp3');
const gojoAudio  = new Audio('/sounds/gojo purple murasaki.mp3');
const kaidoAudio = new Audio('/sounds/kaido-laugh-one-piece.mp3');

tojiAudio.addEventListener('ended', () => bgm.play());

// ==========================================
// MANGA BUBBLES (HISTORIA)
// ==========================================
let storyTimeout: ReturnType<typeof setTimeout> | null = null;

function showStoryBubble(text: string, durationMs = 5000) {
  const el = document.getElementById('story-text');
  if (!el) return;
  if (storyTimeout) clearTimeout(storyTimeout);

  el.innerHTML = text;
  el.style.display = 'block';
  el.style.animation = 'none';
  void el.offsetHeight;
  el.style.animation = `fadeInOutManga ${durationMs / 1000}s forwards`;

  storyTimeout = setTimeout(() => {
    el.style.display = 'none';
  }, durationMs);
}

// ==========================================
// LOADER
// ==========================================
const loader = new GLTFLoader();

// ==========================================
// FASE 1: PORTAL
// ==========================================
let portalModel: THREE.Group | null = null;
let skyboxPhase1: THREE.Mesh | null = null;
let inPhase1 = true;

// Skybox esférico fase 1
const skyGeo = new THREE.SphereGeometry(120, 32, 32);
const skyMat = new THREE.MeshBasicMaterial({
  color: 0x87ceeb,
  side: THREE.BackSide
});
skyboxPhase1 = new THREE.Mesh(skyGeo, skyMat);
scene.add(skyboxPhase1);

function onPortalReady() {
  // Triple seguro para ocultar el loading
  hideEl('loading');
  const loading = document.getElementById('loading')!;
  loading.style.cssText = 'display: none !important;'; // nuclear option
  loading.setAttribute('hidden', '');
  showEl('cta-text');
}

loader.load('/Models/portal/scene.gltf',
  (gltf) => {
    portalModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(portalModel);
    const center = box.getCenter(new THREE.Vector3());
    portalModel.position.sub(center);
    scene.add(portalModel);
    onPortalReady();
  },
  undefined,
  () => {
    const geo = new THREE.TorusGeometry(3, 0.5, 16, 100);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a2be2, emissive: 0x4a0080 });
    portalModel = new THREE.Mesh(geo, mat) as unknown as THREE.Group;
    scene.add(portalModel);
    onPortalReady();
  }
);

document.getElementById('cta-text')?.addEventListener('click', enterPortal);

function enterPortal() {
  if (!inPhase1 || !portalModel) return;
  inPhase1 = false;

  bgm.play().catch(() => {});

  hideEl('cta-text');
  showStoryBubble('¡Bienvenida a tu Cumpleaños! 🌀<br/>Un mundo cruzado de animes te espera al otro lado del portal...', 4500);

  gsap.to(portalModel.rotation, { y: Math.PI * 4, duration: 3, ease: 'power2.inOut' });
  gsap.to(camera.position, {
    z: 5, y: 1, duration: 3, ease: 'power2.inOut',
    onComplete: loadPhase2Models
  });
}

// ==========================================
// FASE 2: ALDEA DE KONOHA
// ==========================================
let nezukoBox: THREE.Group | null = null;
let tojiStatic: THREE.Group | null = null;
let inPhase2 = false;
const phase2Objects: THREE.Object3D[] = [];
const narutoInstances: THREE.Group[] = [];

const HOUSE_JOKES = [
  "¡Feliz Cumpleaños! Te iba a preparar Ramen de Ichiraku, pero Naruto se cruzó y se lo comió TODO. ¡Dattebayo! 🍜",
  "¡Felicidades! Eres Hechicera de Categoría Especial. Sopla las velas antes de que Gojo expanda su dominio. 🤞✨",
  "El One Piece es real... igual que tu regalo. Mentira, Zoro era el encargado y se perdió en otra isla 🗺️⚔️",
  "¡Eres tan especial como el Jutsu Prohibido de Orochimaru! No porque sea malo, sino porque nadie más lo tiene. 🐍✨",
  "Kakashi llegó tarde a desearte feliz cumpleaños. Se le fue el tiempo leyendo Icha Icha. 📚😅",
  "¡Si Luffy puede ser Rey de los Piratas sin saber nadar, tú puedes lograr TODO lo que te propongas! 🏴‍☠️",
  "Itachi te dedica este momento de paz. Hoy no importa el pasado, solo que cumplas muchos más. 🌸",
  "¡Un año más y sigues siendo más poderosa que el Modo Sabio de Jiraiya! Eso no es poco. 🐸✨",
];

function loadPhase2Models() {
  inPhase2 = true;

  // Remover skybox fase 1 y portal
  if (skyboxPhase1) { scene.remove(skyboxPhase1); skyboxPhase1 = null; }
  if (portalModel)  { scene.remove(portalModel);  portalModel = null; }

  // Desactivar niebla
  scene.fog = null;

  // Pasto base — color tierra/café
  const grassGeo = new THREE.PlaneGeometry(200, 200);
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x7a5c2e }); // Café tierra
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -2.2;
  scene.add(grass);
  phase2Objects.push(grass);

  // Cargar entorno de Konoha — como FONDO detrás de los personajes
  loader.load('/Models/naruto home konoha/scene.gltf', (gltf) => {
    const konohaEnv = gltf.scene;
    const box = new THREE.Box3().setFromObject(konohaEnv);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z);
    const targetWidth = 60;
    const s = targetWidth / maxDim;
    konohaEnv.scale.set(s, s, s);
    // Posicionar detrás de los personajes (que estarán en z:+4 to +10)
    // La aldea queda de fondo en z negativo
    const scaledBox = new THREE.Box3().setFromObject(konohaEnv);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    konohaEnv.position.set(-scaledCenter.x, -2.2, -scaledCenter.z - 5);
    scene.add(konohaEnv);
    phase2Objects.push(konohaEnv);
  });

  // Caja fallback Nezuko (rosa)
  const boxGeo = new THREE.BoxGeometry(3, 3, 3);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xff66aa });
  nezukoBox = new THREE.Mesh(boxGeo, boxMat) as unknown as THREE.Group;
  nezukoBox.position.set(-5, 0.5, 2);
  scene.add(nezukoBox);
  phase2Objects.push(nezukoBox);

  // Cylinder fallback Toji
  const tojiGeo = new THREE.CylinderGeometry(1.2, 1.2, 4);
  const tojiMat = new THREE.MeshStandardMaterial({ color: 0x444466 });
  tojiStatic = new THREE.Mesh(tojiGeo, tojiMat) as unknown as THREE.Group;
  tojiStatic.position.set(5, 0, 2);
  scene.add(tojiStatic);
  phase2Objects.push(tojiStatic);

  // Modelos reales — fuera del anillo de la aldea, en el área delantera de hierba
  loader.load('/Models/kimetsu_no_yaiba_box/scene.gltf', (gltf) => {
    scene.remove(nezukoBox!);
    phase2Objects.splice(phase2Objects.indexOf(nezukoBox!), 1);
    nezukoBox = gltf.scene;
    nezukoBox.position.set(-3, 0.3, -7);   // Zona Hokage, ligeramente elevada
    nezukoBox.scale.set(1.35, 1.35, 1.35); // 10% menos que 1.5
    scene.add(nezukoBox);
    phase2Objects.push(nezukoBox);
  });

  loader.load('/Models/jujutsu sushiguro static model/scene.gltf', (gltf) => {
    scene.remove(tojiStatic!);
    phase2Objects.splice(phase2Objects.indexOf(tojiStatic!), 1);
    tojiStatic = gltf.scene;
    tojiStatic.position.set(3, 0.3, -7);  // Junto a Nezuko, zona Hokage
    tojiStatic.scale.set(5, 5, 5);
    scene.add(tojiStatic);
    phase2Objects.push(tojiStatic);
    // Animación idle de Toji
    gsap.to(tojiStatic.rotation, { y: Math.PI * 2, duration: 8, repeat: -1, ease: 'none' });
    gsap.to(tojiStatic.position, { y: 0.8, duration: 1.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  });

  // Narutos agrupados cerca de la zona del Hokage (fondo de la aldea), elevados sobre el piso
  const narutoPositions: [number, number, number][] = [
    [ 0,  0.5, -9],  // Centro frente al monumento
    [-2,  0.5, -9],  // Izquierda
    [ 2,  0.5, -9],  // Derecha
    [-1,  0.5, -11], // Segunda fila izq
    [ 1,  0.5, -11], // Segunda fila der
    [ 0,  0.5, -12], // Fondo centro
    [-2.5,0.5, -7],  // Ligeramente más adelante izq
    [ 2.5,0.5, -7],  // Ligeramente más adelante der
  ];

  narutoPositions.forEach((pos, i) => {
    loader.load('/Models/narutosPJs/scene.gltf', (gltf) => {
      const naruto = gltf.scene;
      naruto.position.set(pos[0], pos[1], pos[2]);
      naruto.scale.set(0.4, 0.4, 0.4);
      // Mirar hacia la cámara (está en z:12, y:5)
      naruto.lookAt(0, pos[1], 12);
      naruto.userData = { isNaruto: true, jokeIndex: i % HOUSE_JOKES.length };
      scene.add(naruto);
      narutoInstances.push(naruto);
      phase2Objects.push(naruto);

      // Activar animaciones si existen
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(naruto);
        const runClip = gltf.animations.find(a => /run|walk|jog/i.test(a.name)) ?? gltf.animations[0];
        mixer.clipAction(runClip).play();
        mixers.push(mixer);
      }
    });
  });

  // Historia secuencial
  showStoryBubble('¡Has llegado a la Aldea Oculta de Konoha! 🏘️<br/>¡Haz clic en los Narutos para escuchar sus mensajes!', 5000);
  setTimeout(() => showStoryBubble('La caja de Nezuko 🌸 y el guerrero de la derecha también tienen sorpresas... 👀', 4000), 6000);
  setTimeout(() => showStoryBubble('¡Espera! Siento una perturbación en el chakra... ⚡ ¡Alguien se acerca!', 4000), 13000);
  setTimeout(() => {
    showEl('danger-btn');
    showEl('instruction-overlay');
  }, 17000);

  // Cámara cercana mirando hacia la zona del Hokage donde están todos los personajes
  gsap.to(camera.position, { x: 0, y: 5, z: 12, duration: 2 });
  controls.target.set(0, 1, -9);  // Apuntar directamente al grupo cerca del Hokage
  controls.update();
}

// ==========================================
// RAYCASTER — Clic en escena
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
  // Solo reaccionar a clics en el canvas
  if ((event.target as HTMLElement).closest('#canvas-container') === null) return;
  // Si el modal está abierto, ignorar
  const modalEl = document.getElementById('modal-container');
  if (modalEl && !modalEl.classList.contains('hidden')) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  // Fase 5: clic en Kaido
  if (inPhase5 && kaidoModel) {
    const hits = raycaster.intersectObject(kaidoModel, true);
    if (hits.length > 0) {
      kaidoAudio.currentTime = 0;
      kaidoAudio.play().catch(() => {});
      showStoryBubble('¡GWOOAARR! 🐉 ¡El Rey de las Bestias ha rugido! Kaido saludó a la cumpleañera.', 4000);
      return;
    }
  }

  if (!inPhase2) return;

  // Clic en Narutos
  if (narutoInstances.length > 0) {
    const narutoHits = raycaster.intersectObjects(narutoInstances, true);
    if (narutoHits.length > 0) {
      let obj: THREE.Object3D | null = narutoHits[0].object;
      while (obj && !obj.userData.isNaruto) obj = obj.parent;
      if (obj && obj.userData.isNaruto) {
        const idx = obj.userData.jokeIndex as number;
        showStoryBubble(HOUSE_JOKES[idx], 6000);
        return;
      }
    }
  }

  // Clic en Nezuko
  if (nezukoBox) {
    const hits = raycaster.intersectObject(nezukoBox, true);
    if (hits.length > 0) {
      openModal('¡Feliz Cumpleaños Nayleth! 🎂',
        '<iframe title="Nezuko chibi - Demon Slayer" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" src="https://sketchfab.com/models/5e657141fd144768a41815a7418856a6/embed?autostart=1&preload=1&transparent=1"></iframe>',
        'Nezuko Kamado te desea lo mejor. ¡Eres tan especial como una Oni demoníaca adorable! 🎋'
      );
      return;
    }
  }

  // Clic en Toji
  if (tojiStatic) {
    const hits = raycaster.intersectObject(tojiStatic, true);
    if (hits.length > 0) {
      openModal('Un Mensaje de Toji Fushiguro ⚔️',
        '<iframe title="Toji Fushiguro" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" src="https://sketchfab.com/models/379bcc7714ac477fa09fd0fcc5c01569/embed?autostart=1&preload=1&transparent=1"></iframe>',
        '"Sin magia llegué a la cima. Tú tienes algo que yo nunca tuve: personas que te aman. Feliz cumpleaños." — Toji'
      );
      bgm.pause();
      tojiAudio.play();
      return;
    }
  }
});

// ==========================================
// MODALES
// ==========================================
const modalContainer = document.getElementById('modal-container');
const modalTitle     = document.getElementById('modal-title');
const modalBody      = document.getElementById('modal-body');
const modalFooter    = document.getElementById('modal-footer');

document.getElementById('close-modal')?.addEventListener('click', (e) => {
  e.stopPropagation();
  modalContainer?.classList.add('hidden');
  if (modalBody)   modalBody.innerHTML = '';
  if (modalFooter) modalFooter.innerHTML = '';

  if (!tojiAudio.paused) {
    tojiAudio.pause();
    tojiAudio.currentTime = 0;
    bgm.play();
  }
});

function openModal(title: string, iframeHTML: string, footerText?: string) {
  if (modalTitle) modalTitle.innerText = title;
  if (modalBody)  modalBody.innerHTML  = iframeHTML;
  if (modalFooter) modalFooter.innerHTML = footerText
    ? `<p class="modal-quote">${footerText}</p>` : '';
  modalContainer?.classList.remove('hidden');
  gsap.fromTo('.modal-content', { scale: 0.8, opacity: 0, y: 40 }, { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' });
}

// ==========================================
// FASE 3 Y 4: PAIN vs GOJO
// ==========================================
document.getElementById('danger-btn')?.addEventListener('click', () => {
  document.getElementById('close-modal')?.click();
  document.getElementById('danger-btn')?.classList.add('hidden');
  document.getElementById('instruction-overlay')?.classList.add('hidden');
  inPhase2 = false;

  showStoryBubble('¡CUIDADO! Una presencia abrumadora acaba de descender del cielo... 💀', 4000);

  bgm.pause();
  tojiAudio.pause();
  painAudio.play();

  // Temblor de cámara
  gsap.to(camera.position, { x: '+=0.4', y: '+=0.4', z: '+=0.4', duration: 0.08, yoyo: true, repeat: 240 });

  container.classList.add('canvas-danger');

  const cinematicContainer = document.getElementById('cinematic-container');
  const iframeWrapper = document.getElementById('cinematic-iframe-wrapper');
  cinematicContainer?.classList.remove('hidden');
  if (iframeWrapper) {
    iframeWrapper.innerHTML = '<iframe title="Pain (Naruto Shippuden)" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" src="https://sketchfab.com/models/141e19ae1e714616b68a990b27ce0697/embed?autostart=1&preload=1&transparent=1"></iframe>';
  }

  setTimeout(() => showStoryBubble('«Este mundo conocerá el dolor...» — Pain 💫', 4000), 14000);
  setTimeout(triggerExplosionAndGIF, 19000);
});

function triggerExplosionAndGIF() {
  const iframeWrapper = document.getElementById('cinematic-iframe-wrapper');
  if (iframeWrapper) iframeWrapper.innerHTML = '';

  const flash = document.getElementById('explosion-flash');
  if (flash) {
    flash.style.opacity = '1';
    flash.classList.remove('hidden');
    gsap.to(flash, { opacity: 0, duration: 2, onComplete: () => flash.classList.add('hidden') });
  }

  gsap.to(camera.position, { x: '+=1.2', y: '+=1.2', duration: 0.06, yoyo: true, repeat: 35 });

  document.getElementById('transition-gif-container')?.classList.remove('hidden');
  setTimeout(triggerGojo, 4500);
}

function triggerGojo() {
  document.getElementById('transition-gif-container')?.classList.add('hidden');

  showStoryBubble('¡El hechicero más fuerte ha llegado para protegerte! ♾️<br/>Expansión de Dominio: ¡Vacío Infinito!', 5000);

  const iframeWrapper = document.getElementById('cinematic-iframe-wrapper');
  if (iframeWrapper) {
    iframeWrapper.innerHTML = '<iframe title="Gojo Satoru - Murasaki" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" src="https://sketchfab.com/models/efdf29937c5b4c9086b7c9bbf5a58976/embed?autostart=1&preload=1&transparent=1"></iframe>';
  }

  gojoAudio.play().catch(() => {});

  setTimeout(() => showStoryBubble('El Vacío Púrpura vs el Shinra Tensei...<br/>¡El universo entero tembló! 🌌', 4000), 9000);
  setTimeout(collapseDOM, 20000);
}

// ==========================================
// FASE 5: FINAL (KAIDO + SUNNY GO)
// ==========================================
let kaidoModel: THREE.Group | null = null;
let sunnyGoModel: THREE.Group | null = null;
let inPhase5 = false;

function collapseDOM() {
  const cinematicContainer = document.getElementById('cinematic-container');

  gsap.to(cinematicContainer, { scale: 0, rotation: 720, opacity: 0, duration: 2, ease: 'power3.in' });
  gsap.to(container, {
    opacity: 0, duration: 2, delay: 1,
    onComplete: () => {
      // Limpiar cinemática
      if (cinematicContainer) { cinematicContainer.innerHTML = ''; cinematicContainer.classList.add('hidden'); }

      // Limpiar todos los objetos de Fase 2
      phase2Objects.forEach(obj => scene.remove(obj));
      phase2Objects.length = 0;

      container.classList.remove('canvas-danger');

      // Cámara muy cercana para hacer zoom al barco y Kaido
      gsap.killTweensOf(camera.position);
      camera.position.set(0, 5, 10);
      controls.target.set(0, 3, 0);
      controls.minDistance = 2;
      controls.maxDistance = 30;
      controls.update();

      // Skybox para la fase final (cielo claro)
      const finalSkyGeo = new THREE.SphereGeometry(200, 32, 32);
      const finalSkyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
      const finalSky = new THREE.Mesh(finalSkyGeo, finalSkyMat);
      scene.add(finalSky);

      // Océano
      const oceanGeo = new THREE.PlaneGeometry(300, 300);
      const oceanMat = new THREE.MeshStandardMaterial({ color: 0x006994, transparent: true, opacity: 0.85 });
      const ocean = new THREE.Mesh(oceanGeo, oceanMat);
      ocean.rotation.x = -Math.PI / 2;
      ocean.position.y = -5;
      scene.add(ocean);

      inPhase5 = true;
      finalBgm.play();

      gsap.to(container, { opacity: 1, duration: 1.5 });

      // Cargar Sunny Go — grande y cercano, ocupa buena parte de la pantalla
      loader.load('/Models/sunny_go_ship/scene.gltf', (gltf) => {
        sunnyGoModel = gltf.scene;
        const box = new THREE.Box3().setFromObject(sunnyGoModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 14 / maxDim;   // Más grande (antes 8)
        sunnyGoModel.scale.set(scale, scale, scale);
        sunnyGoModel.position.set(0, -2, -5);  // Mucho más cerca (antes z:-8)
        scene.add(sunnyGoModel);
        gsap.to(sunnyGoModel.position, { y: -1, duration: 2.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      }, undefined, (err) => console.error('SunnyGo error:', err));

      // Cargar Kaido — horizontal, cara hacia la cámara, detrás del Sunny Go
      loader.load('/Models/kaido_dragon_form/scene.gltf', (gltf) => {
        kaidoModel = gltf.scene;
        const box = new THREE.Box3().setFromObject(kaidoModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 14 / maxDim;
        kaidoModel.scale.set(scale, scale, scale);

        // Rotación horizontal: probamos las 4 orientaciones posibles del modelo
        // rotation.y = Math.PI hace que mire hacia +Z (hacia cámara)
        // rotation.x = 0 para que sea completamente horizontal (no mire arriba ni abajo)
        kaidoModel.rotation.set(
          0,           // X: 0 = completamente horizontal
          Math.PI,     // Y: 180° = cara hacia +Z (cámara)
          0.1          // Z: leve alabeo
        );

        kaidoModel.position.set(0, -30, -12);
        scene.add(kaidoModel);

        // Emerge detrás del barco y avanza
        gsap.to(kaidoModel.position, {
          y: 2, z: -8, duration: 5, ease: 'power2.out'
        });

        // Balanceo lateral suave
        const kaidoCaptured = kaidoModel;
        setTimeout(() => {
          if (kaidoCaptured) {
            gsap.to(kaidoCaptured.rotation, {
              z: -0.1, duration: 2.5, yoyo: true, repeat: -1, ease: 'sine.inOut'
            });
          }
        }, 5500);
      }, undefined, (err) => console.error('Kaido error:', err));

      // Mensajes finales
      setTimeout(() => showStoryBubble('¡El Vacío Púrpura y el Shinra Tensei destruyeron todo... 💥<br/>¡Pero sobrevivimos! ¡Tu tesoro está aquí! 🏴‍☠️✨', 6000), 2000);
      setTimeout(() => showStoryBubble('¡Kaido el Rey de las Bestias apareció encima del Sunny Go! 🐉<br/>¡Hazle clic para escuchar su rugido!', 5000), 9000);
      setTimeout(() => showStoryBubble('¡Feliz Cumpleaños Nayleth! 🎂🌸<br/>Que este año esté lleno de aventuras épicas como esta.', 7000), 15000);

      // Mostrar UI final
      setTimeout(() => showEl('final-screen'), 2000);
    }
  });
}

document.getElementById('restart-btn')?.addEventListener('click', () => window.location.reload());

// ==========================================
// RENDER LOOP
// ==========================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const t = clock.getElapsedTime();

  // Actualizar animaciones de Narutos
  mixers.forEach(m => m.update(delta));

  particles.rotation.y = t * 0.04;

  if (portalModel && inPhase1) {
    portalModel.rotation.y = Math.sin(t * 0.5) * 0.2;
    portalModel.position.y = Math.sin(t) * 0.15;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ==========================================
// RESIZE
// ==========================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
