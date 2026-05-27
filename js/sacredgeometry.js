import * as THREE from 'three';

export function createFlowerOfLife() {

  const group = new THREE.Group();

  const radius = 120;

  const geometry =
    new THREE.TorusGeometry(
      radius,
      1.5,
      16,
      100
    );

  const material =
    new THREE.MeshBasicMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.2
    });

  function addRing(x,y,z,rx,ry,rz) {

    const mesh =
      new THREE.Mesh(geometry, material);

    mesh.position.set(x,y,z);

    mesh.rotation.set(rx,ry,rz);

    group.add(mesh);
  }

  // centro
  addRing(0,0,0,0,0,0);

  // hexágono
  for(let i=0;i<6;i++){

    const a = (Math.PI*2/6)*i;

    addRing(
      Math.cos(a)*radius,
      Math.sin(a)*radius,
      0,
      0,
      0,
      0
    );
  }

  // profundidad 3D
  for(let i=0;i<6;i++){

    const a = (Math.PI*2/6)*i;

    addRing(
      Math.cos(a)*radius*1.5,
      Math.sin(a)*radius*1.5,
      150,
      Math.PI/2,
      0,
      0
    );

    addRing(
      Math.cos(a)*radius*1.5,
      Math.sin(a)*radius*1.5,
      -150,
      0,
      Math.PI/2,
      0
    );
  }

  return group;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
}

function draw() {
  fill(255);
  circle(mouseX, mouseY, 20);
}