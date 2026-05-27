import * as THREE from 'three';

export function createParticles() {

  const geometry = new THREE.BufferGeometry();

  const count = 40000;

  const positions =
    new Float32Array(count * 3);

  for(let i=0;i<count*3;i++){

    positions[i] =
      (Math.random()-0.5)*8000;
  }

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      positions,
      3
    )
  );

  const material =
    new THREE.PointsMaterial({

      size: 2,

      color: 0xffffff,

      transparent: true,

      opacity: 0.4,

      blending: THREE.AdditiveBlending,

      depthWrite: false
    });

  return new THREE.Points(
    geometry,
    material
  );
}