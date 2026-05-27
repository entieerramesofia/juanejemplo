import * as THREE from 'three';

export function setupAudio(camera) {

  const listener =
    new THREE.AudioListener();

  camera.add(listener);

  const sound =
    new THREE.Audio(listener);

  const loader =
    new THREE.AudioLoader();

  loader.load('audio/tool.mp3', buffer => {

    sound.setBuffer(buffer);

    sound.setLoop(true);

    sound.setVolume(0.5);

    sound.play();
  });

  const analyser =
    new THREE.AudioAnalyser(sound, 512);

  return analyser;
}