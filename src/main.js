import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';

import { OrbitControls }
from 'https://cdn.skypack.dev/three/examples/jsm/controls/OrbitControls.js';

import { EffectComposer }
from 'https://cdn.skypack.dev/three/examples/jsm/postprocessing/EffectComposer.js';

import { RenderPass }
from 'https://cdn.skypack.dev/three/examples/jsm/postprocessing/RenderPass.js';

import { UnrealBloomPass }
from 'https://cdn.skypack.dev/three/examples/jsm/postprocessing/UnrealBloomPass.js';

// =====================================================
// SCENE
// =====================================================

const scene = new THREE.Scene();

scene.fog = new THREE.FogExp2(0x000000, 0.0008);

// =====================================================
// CAMERA
// =====================================================

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  20000
);

camera.position.z = 900;

// =====================================================
// RENDERER
// =====================================================

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setPixelRatio(devicePixelRatio);

document.body.appendChild(renderer.domElement);

// =====================================================
// BLOOM
// =====================================================

const composer = new EffectComposer(renderer);

composer.addPass(
  new RenderPass(scene, camera)
);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(
    window.innerWidth,
    window.innerHeight
  ),
  2.0,
  1.0,
  0.05
);

composer.addPass(bloomPass);

// =====================================================
// CONTROLS
// =====================================================

const controls =
  new OrbitControls(camera, renderer.domElement);

controls.enableDamping = true;

// =====================================================
// LIGHTS
// =====================================================

const light = new THREE.PointLight(
  0xffffff,
  2
);

light.position.set(0,0,300);

scene.add(light);

// =====================================================
// ANIMATE
// =====================================================

function animate() {

  requestAnimationFrame(animate);

  controls.update();

  composer.render();
}

animate();