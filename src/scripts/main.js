import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Keeanu Developer Portfolio - 3D WebGL Desktop Setup (Three.js)
 * Optimizacion de alto rendimiento con CacheStorage y carga binaria GLB instantanea
 */

// 1. Activar sistema de cache en memoria interna de Three.js
THREE.Cache.enabled = true;

document.addEventListener('DOMContentLoaded', () => {
  initStarsBackground();
  initThreeDeskScene();
});

/**
 * Recupera el modelo 3D desde la CacheStorage persistente del navegador
 * o lo descarga una unica vez y lo almacena para visitas y recargas instantaneas (0ms de red).
 */
async function fetchModelWithPersistentCache(modelUrl) {
  const CACHE_NAME = 'keeanu-portfolio-3d-cache-v1';

  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(modelUrl);

      if (cachedResponse) {
        return await cachedResponse.arrayBuffer();
      }

      const networkResponse = await fetch(modelUrl);
      if (networkResponse.ok) {
        // Almacenar clon en la cache permanente del navegador
        cache.put(modelUrl, networkResponse.clone());
        return await networkResponse.arrayBuffer();
      }
    } catch (cacheError) {
      console.warn('CacheStorage no disponible o bloqueado, cargando directo:', cacheError);
    }
  }

  // Fallback directo en caso de navegadores sin Cache API
  const fallbackResponse = await fetch(modelUrl);
  return await fallbackResponse.arrayBuffer();
}

function initThreeDeskScene() {
  const canvas = document.getElementById('three-canvas');
  const container = canvas ? canvas.parentElement : null;

  if (!canvas || !container) return;

  // 1. Escena
  const scene = new THREE.Scene();

  // 2. Camara de perspectiva calibrada
  const getContainerWidth = () => container.clientWidth || window.innerWidth;
  const getContainerHeight = () => container.clientHeight || 550;

  let width = getContainerWidth();
  let height = getContainerHeight();

  // Camara con FOV amplio para que el escritorio completo quepa en el canvas sin recortes
  const camera = new THREE.PerspectiveCamera(26, width / height, 0.1, 1000);
  camera.position.set(20, 3.5, 5);

  // 3. Renderizador WebGL de alto rendimiento con sombras suaves
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  // 4. Iluminacion realista
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x141414, 2.5);
  scene.add(hemisphereLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 4.0);
  pointLight.position.set(0, 4, 1);
  scene.add(pointLight);

  const spotLight = new THREE.SpotLight(0xffffff, 6.0);
  spotLight.position.set(-20, 50, 10);
  spotLight.angle = 0.15;
  spotLight.penumbra = 1;
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.bias = -0.0001;
  scene.add(spotLight);

  const accentLight = new THREE.PointLight(0x6366f1, 3.0, 15);
  accentLight.position.set(4, 2, -2);
  scene.add(accentLight);

  // 5. Controles de rotacion orbital (OrbitControls)
  const controls = new OrbitControls(camera, canvas);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI / 2;
  controls.minPolarAngle = Math.PI / 2;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = false;
  // Centrar el eje de giro sobre el setup
  controls.target.set(0, 0, 0);

  // 6. Carga y parseo inmediato del modelo 3D binario unificado (.glb)
  let desktopModel = null;
  const gltfLoader = new GLTFLoader();
  const MODEL_URL = 'src/assets/models/desktop_pc/scene.glb';

  const applyModelTransform = (model) => {
    const isMobile = window.innerWidth <= 640;
    if (isMobile) {
      model.scale.setScalar(0.42);
      model.position.set(0, -1.5, -0.3);
      controls.target.set(0, 0, -0.3);
      model.rotation.set(-0.01, -0.25, -0.05);
    } else {
      // Escala contenida (0.52) desplazado un poco a la derecha (Z: -0.5)
      model.scale.setScalar(0.62);
      model.position.set(0, -2.3, -2.25);
      controls.target.set(0, 0, -0.5);
      model.rotation.set(-0.01, -0.25, -0.05);
    }
  };

  fetchModelWithPersistentCache(MODEL_URL)
    .then((arrayBuffer) => {
      gltfLoader.parse(
        arrayBuffer,
        'src/assets/models/desktop_pc/',
        (gltf) => {
          desktopModel = gltf.scene;

          desktopModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.roughness = Math.max(child.material.roughness || 0, 0.2);
              }
            }
          });

          applyModelTransform(desktopModel);
          scene.add(desktopModel);

          // Aparicion inmediata y suave del canvas sin pantallas intermedias
          requestAnimationFrame(() => {
            canvas.classList.remove('opacity-0');
            canvas.classList.add('opacity-100');
          });
        },
        (parseError) => {
          console.error('Error al procesar modelo GLB:', parseError);
        }
      );
    })
    .catch((networkError) => {
      console.error('Error al descargar modelo GLB:', networkError);
    });

  // 7. Bucle continuo de renderizado
  let animationFrameId;
  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  // 8. Gestion responsive al redimensionar la ventana
  const handleResize = () => {
    width = getContainerWidth();
    height = getContainerHeight();

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (desktopModel) {
      applyModelTransform(desktopModel);
    }
  };

  window.addEventListener('resize', handleResize);

  // Limpieza al salir de la pagina
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(animationFrameId);
    renderer.dispose();
  });
}

/**
 * Campo de estrellas animado y suspendido en el fondo cósmico (Stars Background)
 */
function initStarsBackground() {
  const canvas = document.getElementById('stars-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const stars = [];
  const starCount = 95;

  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.3 + 0.4,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.2 + 0.05,
      pulseSpeed: Math.random() * 0.02 + 0.008,
      pulseVal: Math.random() * Math.PI * 2,
      isViolet: Math.random() > 0.75
    });
  }

  function renderStars() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.y -= s.speed;
      s.pulseVal += s.pulseSpeed;

      if (s.y < 0) {
        s.y = height;
        s.x = Math.random() * width;
      }

      const currentAlpha = Math.max(0.12, s.alpha + Math.sin(s.pulseVal) * 0.25);

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = s.isViolet
        ? `rgba(145, 94, 255, ${currentAlpha})`
        : `rgba(255, 255, 255, ${currentAlpha})`;
      ctx.fill();
    }

    requestAnimationFrame(renderStars);
  }

  renderStars();

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });
}
