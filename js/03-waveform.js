// Source audio file for this sketch.
const WAVE_AUDIO_PATH = "/audio/ItsOnlyNatural.mp3";

// p5.SoundFile instance controlled by user interaction.
let waveSong;
// FFT analyzer used for waveform extraction.
let waveFft;
// Amplitude analyzer for global level.
let waveAmplitude;
// Smoothed level used for ribbon thickness.
let waveLevel = 0;

function preload() {
  soundFormats("mp3");
  waveSong = loadSound(WAVE_AUDIO_PATH);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  waveFft = new p5.FFT(0.82, 1024);
  waveFft.setInput(waveSong);
  waveAmplitude = new p5.Amplitude();
  waveAmplitude.setInput(waveSong);
  noFill();
}

function draw() {
  waveLevel = lerp(waveLevel, waveAmplitude.getLevel(), 0.14);
  background(7, 10, 18, 55);

  const waveform = waveFft.waveform();
  const bandHeight = map(waveLevel, 0, 0.3, height * 0.1, height * 0.42, true);

  translate(0, height / 2);
  stroke(83, 214, 200, 40);
  strokeWeight(1);
  line(0, 0, width, 0);

  for (let layer = 0; layer < 3; layer++) {
    stroke(255 - layer * 32, 143 + layer * 20, 63 + layer * 30, 200 - layer * 45);
    strokeWeight(map(waveLevel, 0, 0.3, 1.5, 7, true) - layer);
    beginShape();
    for (let i = 0; i < waveform.length; i++) {
      const x = map(i, 0, waveform.length - 1, 0, width);
      const y = waveform[i] * bandHeight * (1 + layer * 0.18);
      curveVertex(x, y);
    }
    endShape();
  }
}

function toggleWaveSong() {
  userStartAudio();
  if (!waveSong || !waveSong.isLoaded()) {
    return;
  }

  if (waveSong.isPlaying()) {
    waveSong.pause();
  } else {
    waveSong.loop();
  }
}

function mousePressed() {
  toggleWaveSong();
}

function touchStarted() {
  toggleWaveSong();
  return false;
}

function keyPressed() {
  if (key === " ") {
    toggleWaveSong();
    return false;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}