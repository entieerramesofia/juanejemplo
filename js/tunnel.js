import * as THREE from 'three';

export function createTunnel() {

  const group = new THREE.Group();

  for(let z=-10000; z<0; z+=120){

    const geo =
      new THREE.TorusGeometry(
        300 + Math.sin(z*0.01)*80,
        3,
        16,
        100
      );

    const mat =
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(
          `hsl(${(z*0.02)%360},100%,60%)`
        ),
        transparent:true,
        opacity:0.05
      });

    const mesh =
      new THREE.Mesh(geo, mat);

    mesh.position.z = z;

    group.add(mesh);
  }

  return group;
}