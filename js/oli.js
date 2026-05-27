// exhibition settings
let drawDensity = 1;
let drawBowlLoopCount = 1;
const AUDIO_FFT_SIZE = 128;

// style parameters
let noiseScaleX = 0.1;
let noiseScaleY = 0.1;

let lineDensity = 2.0;
let dotDensity = 1.0;
let baseLineThickness = 1;
let baseLineLength = 6;


let mainHue = 0;

let curveTypes = []

// leaf settings
let leafCurveValue = 3;
let leafNoiseScale = 0.01;

// color settings
let nowHue = 0;
let nowSat = 0;
let nowBri = 0;
let nowAlpha = 0;

let bowls = [];
let localHash = Math.random().toString(36).slice(2, 10);
let resetButton;
let audioElement;
let audioFileInput;
let audioLoaderButton;
let audioObjectUrl;
let audioContext;
let analyser;
let frequencyData;
let waveformData;
let sourceNode;
let isGenerating = false;
let backgroundArtwork;
let staticArtwork;
let interactivePlantItems = [];
let reactiveLeafStrokes = [];
let flowerStrokes = [];
// escala para reducir el tamaño de las flores en la versión 'oli'
let oliFlowerScale = 0.62;
let isRecordingReactiveLeaves = false;
let currentReactiveLeaf;
let currentInteractiveItemIndex = -1;
let liveLeavesReady = false;
let lastMouseMoveTime = 0;
let audioFrameEnergy = {
  bass: 0,
  mids: 0,
  treble: 0,
  wave: 0
};
let liveLeafColor = {
  hue: 0,
  sat: 0,
  bri: 0,
  weight: 1,
  alpha: 1,
  scale: 1
};

function setup() {
  createCanvas(windowWidth, windowHeight);
	describe("This artwork draws inspiration from potted succulent plants found on the streets. It integrates recursive algorithms to make the layout and uses easing functions to create the leaf shapes.");

  colorMode(HSB);
  pixelDensity(drawDensity);
  frameRate(24);
  background(20);
  noLoop();
  setupResetButton();
  setupAudioLoader();
}

function setupResetButton() {
  resetButton = select("#reset-plants");

  if (resetButton) {
    resetButton.mousePressed(generateNewPlants);
  }
}

function setupAudioLoader() {
  audioElement = document.getElementById("plant-audio");
  audioFileInput = document.getElementById("audio-file");
  audioLoaderButton = select("#audio-loader");

  if (audioFileInput) {
    audioFileInput.addEventListener("change", loadSelectedAudio, false);
  }
}

async function generateNewPlants() {
  if (isGenerating) {
    return;
  }

  isGenerating = true;
  setResetButtonState("generando...", true);

  try {
    noLoop();
    liveLeavesReady = false;
    await startLoadedAudio();
    await sleep(15);
    await drawRandomPlants();

    if (resetButton) {
      resetButton.addClass("has-generated");
    }

    setResetButtonState("nuevo aleatorio", false);
  }
  catch (error) {
    console.error(error);
    setResetButtonState("intentar otra vez", false);
  }
  finally {
    isGenerating = false;
  }
}

async function startLoadedAudio() {
  if (!audioElement || !audioElement.src) {
    return;
  }

  await setupAudioAnalyzer();

  try {
    await audioElement.play();
  }
  catch (error) {
    console.warn("No se pudo reproducir el audio", error);
  }
}

function setResetButtonState(_text, _disabled) {
  if (!resetButton) {
    return;
  }

  resetButton.html(_text);

  if (_disabled) {
    resetButton.attribute("disabled", "");
    resetButton.addClass("is-loading");
  }
  else {
    resetButton.elt.removeAttribute("disabled");
    resetButton.removeClass("is-loading");
  }
}

async function loadSelectedAudio(event) {
  let file = event.target.files[0];

  if (!file || !audioElement) {
    return;
  }

  if (audioObjectUrl) {
    URL.revokeObjectURL(audioObjectUrl);
  }

  audioObjectUrl = URL.createObjectURL(file);
  audioElement.src = audioObjectUrl;
  audioElement.load();
  await setupAudioAnalyzer();

  if (audioLoaderButton) {
    audioLoaderButton.html("cambiar audio");
    audioLoaderButton.addClass("has-audio");
  }

  await startLoadedAudio();

  if ((interactivePlantItems.length > 0 || reactiveLeafStrokes.length > 0) && !isGenerating) {
    generateNewPlants();
  }
}

async function setupAudioAnalyzer() {
  if (!audioElement) {
    return;
  }

  if (!audioContext) {
    let AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx();
  }

  if (!analyser) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = AUDIO_FFT_SIZE;
    analyser.smoothingTimeConstant = 0.82;
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    waveformData = new Uint8Array(analyser.fftSize);
  }

  if (!sourceNode) {
    sourceNode = audioContext.createMediaElementSource(audioElement);
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);
  }

  await audioContext.resume();
}

function getAudioReactiveLeafColor(_plantHue, _plantSat, _plantBri, _layerT, _leafT) {
  let bass = getFrequencyRangeEnergy(0, 0.2);
  let mids = getFrequencyRangeEnergy(0.18, 0.58);
  let treble = getFrequencyRangeEnergy(0.58, 1.5);
  let band = getFrequencyBandEnergy(_leafT);

  let hue = map(band + treble * 0.6, 0, 1.6, 82, 148) + random(-4, 4);
  let sat = _plantSat + map(mids, 0, 1, 8, 50) + random(-5, 5);
  let bri = _plantBri + map(bass, 0, 1, -6, 34) + map(_layerT, 0, 1, 24, 0) + random(-4, 4);

  return [
    constrain(hue, 76, 154),
    constrain(sat, 18, 100),
    constrain(bri, 25, 100)
  ];
}

function getFrequencyRangeEnergy(_from, _to) {
  if (!frequencyData) {
    return 0;
  }

  let start = floor(constrain(_from, 0, 1) * (frequencyData.length - 1));
  let end = max(start + 1, floor(constrain(_to, 0, 1) * frequencyData.length));
  let total = 0;

  for (let i = start; i < end; i++) {
    total += frequencyData[i];
  }

  return total / ((end - start) * 255);
}

function getFrequencyBandEnergy(_position) {
  if (!frequencyData) {
    return 0;
  }

  let index = floor(constrain(_position, 0, 0.999) * frequencyData.length);
  let previous = max(0, index - 1);
  let next = min(frequencyData.length - 1, index + 1);
  return (frequencyData[previous] + frequencyData[index] + frequencyData[next]) / (3 * 255);
}

function beginReactiveLeaf(_layerT, _leafT, _baseBriAdd, _centerX, _centerY) {
  currentReactiveLeaf = {
    layerT: _layerT,
    leafT: _leafT,
    baseBriAdd: _baseBriAdd,
    centerX: _centerX,
    centerY: _centerY
  };
}

function recordReactiveLeafStroke(_x1, _y1, _x2, _y2, _strokeT) {
  if (!isRecordingReactiveLeaves || !currentReactiveLeaf) {
    return;
  }

  let centerX = currentReactiveLeaf.centerX;
  let centerY = currentReactiveLeaf.centerY;
  let bandIndex = floor(constrain(currentReactiveLeaf.leafT, 0, 0.999) * (AUDIO_FFT_SIZE / 2));

  reactiveLeafStrokes.push({
    x1: _x1,
    y1: _y1,
    x2: _x2,
    y2: _y2,
    dx1: _x1 - centerX,
    dy1: _y1 - centerY,
    dx2: _x2 - centerX,
    dy2: _y2 - centerY,
    strokeT: _strokeT,
    layerT: currentReactiveLeaf.layerT,
    leafT: currentReactiveLeaf.leafT,
    bandIndex: bandIndex,
    phase: currentReactiveLeaf.leafT * TWO_PI + _strokeT * PI,
    itemIndex: currentInteractiveItemIndex,
    baseBriAdd: currentReactiveLeaf.baseBriAdd,
    centerX: centerX,
    centerY: centerY
  });
}

function drawReactiveLeaves() {
  if (!backgroundArtwork || reactiveLeafStrokes.length === 0) {
    return;
  }

  drawInteractiveScene();
}

function drawInteractiveScene() {
  if (!backgroundArtwork) {
    return;
  }

  image(backgroundArtwork, 0, 0);

  for (let i = 0; i < interactivePlantItems.length; i++) {
    let item = interactivePlantItems[i];

    if (!item) {
      continue;
    }

    if (item.image) {
      let hovered = isMouseInsidePlantItem(item);

      if (hovered) {
        drawingContext.filter = "saturate(6) contrast(1.08)";
      }

      image(item.image, item.x + item.offsetX, item.y + item.offsetY);

      if (hovered) {
        drawingContext.filter = "none";
      }
    }
  }

  if (reactiveLeafStrokes.length === 0) {
    return;
  }

  updateAudioFrameEnergy();

  blendMode(BLEND);
  strokeCap(ROUND);

  for (let i = 0; i < reactiveLeafStrokes.length; i++) {
    let leafStroke = reactiveLeafStrokes[i];
    let leafColor = getLiveGreenLeafColor(leafStroke);
    let item = interactivePlantItems[leafStroke.itemIndex];
    let offsetX = item ? item.offsetX : 0;
    let offsetY = item ? item.offsetY : 0;
    let scale = leafColor.scale;
    let centerX = leafStroke.centerX + offsetX;
    let centerY = leafStroke.centerY + offsetY;
    let x1 = centerX + leafStroke.dx1 * scale;
    let y1 = centerY + leafStroke.dy1 * scale;
    let x2 = centerX + leafStroke.dx2 * scale;
    let y2 = centerY + leafStroke.dy2 * scale;

    stroke(leafColor.hue, leafColor.sat * 0.8, min(100, leafColor.bri + 18), 0.20);
    strokeWeight(leafColor.weight * 2);
    line(x1, y1, x2, y2);

    stroke(leafColor.hue, leafColor.sat, leafColor.bri, leafColor.alpha);
    strokeWeight(leafColor.weight);
    line(x1, y1, x2, y2);
  }

  drawFlowerStrokes();
}

function getLiveGreenLeafColor(_leafStroke) {
  let bass = audioFrameEnergy.bass;
  let mids = audioFrameEnergy.mids;
  let treble = audioFrameEnergy.treble;
  let wave = audioFrameEnergy.wave;
  let band = getFrequencyBandEnergyAtIndex(_leafStroke.bandIndex);
  let shimmer = sin(frameCount * 0.04 + _leafStroke.phase);
  let pulse = constrain(bass * 0.85 + mids * 0.6 + band * 1.1 + treble * 0.35 + wave * 0.8, 0, 2.2);

  let hue = map(band + treble * 1.2, 0, 2.2, 68, 158) + shimmer * 9;
  let sat = map(mids + band * 0.75, 0, 1.75, 30, 100) + _leafStroke.layerT * 12;
  let bri = map(bass + band * 0.9 + treble * 0.35 + wave * 0.5, 0, 2.7, 12, 100) + _leafStroke.baseBriAdd * 0.42;
  let weight = map(pulse, 0, 2.2, 0.65, 4.6);
  let alpha = map(pulse, 0, 2.2, 0.5, 0.98);
  let scale = map(pulse, 0, 2.2, 1.0, 1.12);

  liveLeafColor.hue = constrain(hue, 66, 160);
  liveLeafColor.sat = constrain(sat, 28, 100);
  liveLeafColor.bri = constrain(bri, 10, 100);
  liveLeafColor.weight = weight;
  liveLeafColor.alpha = alpha;
  liveLeafColor.scale = scale;

  return liveLeafColor;
}

function updateAudioFrameEnergy() {
  if (analyser && frequencyData) {
    analyser.getByteFrequencyData(frequencyData);
  }

  if (analyser && waveformData) {
    analyser.getByteTimeDomainData(waveformData);
  }

  audioFrameEnergy.bass = getFrequencyRangeEnergy(0, 0.18);
  audioFrameEnergy.mids = getFrequencyRangeEnergy(0.18, 0.58);
  audioFrameEnergy.treble = getFrequencyRangeEnergy(0.58, 1);
  audioFrameEnergy.wave = getWaveformEnergy();
}

function getFrequencyBandEnergyAtIndex(_index) {
  if (!frequencyData) {
    return 0;
  }

  let index = constrain(_index, 0, frequencyData.length - 1);
  let previous = max(0, index - 1);
  let next = min(frequencyData.length - 1, index + 1);
  return (frequencyData[previous] + frequencyData[index] + frequencyData[next]) / (3 * 255);
}

function getWaveformEnergy() {
  if (!waveformData) {
    return 0;
  }

  let total = 0;

  for (let i = 0; i < waveformData.length; i++) {
    total += abs(waveformData[i] - 128);
  }

  return constrain(total / (waveformData.length * 128), 0, 1);
}

function recordFlowerPetal(_x, _y, _width, _height, _hue, _sat, _bri, _alpha) {
  if (!isRecordingReactiveLeaves) {
    return;
  }

  flowerStrokes.push({
    x: _x,
    y: _y,
    width: _width * oliFlowerScale,
    height: _height * oliFlowerScale,
    hue: _hue,
    sat: _sat,
    bri: _bri,
    alpha: _alpha,
    itemIndex: currentInteractiveItemIndex
  });
}

function drawFlowerStrokes() {
  noStroke();

  for (let i = 0; i < flowerStrokes.length; i++) {
    let flower = flowerStrokes[i];
    let item = interactivePlantItems[flower.itemIndex];
    let offsetX = item ? item.offsetX : 0;
    let offsetY = item ? item.offsetY : 0;

    fill(flower.hue, flower.sat, flower.bri, flower.alpha);
    ellipse(flower.x + offsetX, flower.y + offsetY, flower.width, flower.height);
  }
}

function createInteractivePlantItems() {
  interactivePlantItems = [];

  if (!backgroundArtwork || !staticArtwork) {
    return;
  }

  for (let i = 0; i < bowls.length; i++) {
    let bowl = bowls[i];

    if (bowl.bowlType == 3) {
      interactivePlantItems.push(null);
      continue;
    }

    let margin = max(18, bowl.bowlThickness * 2 + baseLineLength * 2);
    let x = floor(max(0, bowl.bowlX - margin));
    let y = floor(max(0, bowl.bowlY - margin));
    let right = ceil(min(width, bowl.bowlX + bowl.bowlWidth + margin));
    let bottom = ceil(min(height, bowl.bowlY + bowl.bowlHeight + margin));
    let cropWidth = max(1, right - x);
    let cropHeight = max(1, bottom - y);
    let potImage = staticArtwork.get(x, y, cropWidth, cropHeight);
    let bgImage = backgroundArtwork.get(x, y, cropWidth, cropHeight);

    makeDifferentPixelsVisible(potImage, bgImage);

    interactivePlantItems.push({
      x: x,
      y: y,
      width: cropWidth,
      height: cropHeight,
      offsetX: 0,
      offsetY: 0,
      boundsX: bowl.bowlX,
      boundsY: bowl.bowlY,
      boundsW: bowl.bowlWidth,
      boundsH: bowl.bowlHeight,
      image: potImage
    });
  }
}

function makeDifferentPixelsVisible(_image, _background) {
  _image.loadPixels();
  _background.loadPixels();

  for (let i = 0; i < _image.pixels.length; i += 4) {
    let diff =
      abs(_image.pixels[i] - _background.pixels[i]) +
      abs(_image.pixels[i + 1] - _background.pixels[i + 1]) +
      abs(_image.pixels[i + 2] - _background.pixels[i + 2]);

    if (diff < 18) {
      _image.pixels[i + 3] = 0;
    }
  }

  _image.updatePixels();
}

function handleInteractiveMouse() {
  if (isGenerating || interactivePlantItems.length === 0 || millis() - lastMouseMoveTime < 180) {
    return;
  }

  for (let i = interactivePlantItems.length - 1; i >= 0; i--) {
    let item = interactivePlantItems[i];

    if (!item || !isMouseInsidePlantItem(item)) {
      continue;
    }

    movePlantItemRandomly(item);
    lastMouseMoveTime = millis();
    drawInteractiveScene();

    return;
  }
}

function isMouseInsidePlantItem(_item) {
  let x = _item.x + _item.offsetX;
  let y = _item.y + _item.offsetY;
  return mouseX >= x && mouseX <= x + _item.width && mouseY >= y && mouseY <= y + _item.height;
}

function movePlantItemRandomly(_item) {
  let margin = min(width, height) * 0.06;
  let nextX = random(margin, max(margin, width - _item.width - margin));
  let nextY = random(margin, max(margin, height - _item.height - margin));

  _item.offsetX = nextX - _item.x;
  _item.offsetY = nextY - _item.y;
}

function createEcosystemPlantItem(_x, _y, _size) {
  let boundsSize = _size * 2.2;
  let x = _x - boundsSize * 0.5;
  let y = _y - boundsSize * 0.5;

  interactivePlantItems.push({
    x: x,
    y: y,
    width: boundsSize,
    height: boundsSize,
    offsetX: 0,
    offsetY: 0,
    image: null
  });

  return interactivePlantItems.length - 1;
}

function drawJungleMist() {
  let vineCount = floor(width / 38);

  for (let i = 0; i < vineCount; i++) {
    let x = random(width);
    let y = random(-height * 0.15, height * 0.45);
    let vineLength = random(height * 0.18, height * 0.55);
    let hueValue = processHue(mainHue + random(-18, 20));

    stroke(hueValue, random(20, 46), random(18, 42), random(0.12, 0.28));
    strokeWeight(random(0.4, 1.4));
    noFill();

    beginShape();
    for (let s = 0; s < 8; s++) {
      let t = s / 7;
      let wave = sin(t * TWO_PI + random(-0.8, 0.8)) * random(8, 24);
      vertex(x + wave, y + vineLength * t);
    }
    endShape();
  }
}

async function drawRandomPlants() {
  bowls = [];
  interactivePlantItems = [];
  reactiveLeafStrokes = [];
  flowerStrokes = [];

  localHash = Math.random().toString(36).slice(2, 10);
  background(20);

  dotDensity = random(0.08, 0.22);
  lineDensity = random(0.35, 0.65);

  noiseScaleX = random(0.0001, 0.01);
  noiseScaleY = random(0.0001, 0.01);

  baseLineThickness = random(0.8, 4.5);
  baseLineLength = random(5, 11);

  mainHue = random(95, 150);

  if (curveTypes.length === 0) {
    curveTypes.push(easeOutSine);
    curveTypes.push(easeOutCubic);
    curveTypes.push(easeOutQuart);
    curveTypes.push(easeOutQuint);
    curveTypes.push(easeOutExpo);
    curveTypes.push(easeInOutSine);
    curveTypes.push(easeInOutBounce);
    curveTypes.push(easeOutBounce);
    curveTypes.push(easeOutElastic);
    curveTypes.push(easeInSine);
    curveTypes.push(easeOutBack);
  }
	
  let bgHueA = processHue(mainHue + random(-16, 8));
  let bgHueB = processHue(mainHue + random(8, 28));
  let bgSatA = random(20, 42);
  let bgSatB = random(22, 50);
  let bgBriA = random(8, 22);
  let bgBriB = random(16, 34);
  let bgLineCount = max(2, floor(height * lineDensity));

  let lastDotDensity = dotDensity;

  for (let y = 0; y < bgLineCount; y++) {
    let t = y / (bgLineCount - 1);
    let nowY = height * t;

    NYSetColorLerp(bgHueA, bgSatA, bgBriA, bgHueB, bgSatB, bgBriB, t);
    NYDotLine(0, nowY, width, nowY);

    if(y % 10 == 0)
    await sleep(1);
  }

  drawJungleMist();
  dotDensity = lastDotDensity;
  backgroundArtwork = get();

  staticArtwork = backgroundArtwork;
  isRecordingReactiveLeaves = true;

  if (analyser && frequencyData) {
    updateAudioFrameEnergy();
  }

  let plantCount = floor(constrain(width * height / 23000, 34, 78));
  let minSide = min(width, height);
  let ecosystemPlants = [];

  for (let i = 0; i < plantCount; i++) {
    let y = random(height * 0.08, height * 0.98);
    let depth = map(y, height * 0.08, height * 0.98, 0.45, 1.35);
    let size = random(minSide * 0.035, minSide * 0.13) * depth;

    ecosystemPlants.push({
      x: random(-width * 0.04, width * 1.04),
      y: y,
      size: size,
      type: random() < 0.42 ? "fern" : "rosette",
      layers: floor(random(4, 11)),
      countPerLayer: floor(random(7, 22)),
      frondCount: floor(random(6, 14))
    });
  }

  ecosystemPlants.sort(function(a, b) {
    return a.y - b.y;
  });

  for (let i = 0; i < ecosystemPlants.length; i++) {
    let plant = ecosystemPlants[i];

    currentInteractiveItemIndex = createEcosystemPlantItem(plant.x, plant.y, plant.size);

    if (plant.type === "fern" && typeof drawFernPlant === "function") {
      await drawFernPlant(plant.x, plant.y, plant.size, plant.frondCount);

      if (random() < 0.28) {
        await drawPlantB(
          plant.x + random(-0.18, 0.18) * plant.size,
          plant.y + random(-0.12, 0.18) * plant.size,
          plant.size * random(0.35, 0.62),
          0,
          floor(random(3, 7)),
          floor(random(5, 14))
        );
      }
    }
    else {
      await drawPlantB(plant.x, plant.y, plant.size, 0, plant.layers, plant.countPerLayer);
    }

    if (typeof drawFlowerCluster === "function" && random() < 0.72) {
      drawFlowerCluster(plant.x, plant.y, plant.size * oliFlowerScale);
    }

    if (i % 4 == 0) {
      await sleep(1);
    }
  }

  isRecordingReactiveLeaves = false;
  currentReactiveLeaf = null;
  currentInteractiveItemIndex = -1;
  liveLeavesReady = reactiveLeafStrokes.length > 0;

  if (analyser && frequencyData) {
    loop();
  }
}


function SubdivideRect(_x, _y, _width, _height, _depth) {

  let doSplit = random(0, 1) < 0.9;

  if (_depth == 0)
    doSplit = true;

  if (min(_width, _height) < 120) {
    doSplit = false;
  }

  if (doSplit) {
    let splitRatio = random(0.4, 0.6);

    // split X
    if (random() < 0.5) {
      let rectA_x = _x;
      let rectA_y = _y;
      let rectA_width = _width * splitRatio;
      let rectA_height = _height;

      let rectB_x = _x + _width * splitRatio;
      let rectB_y = _y;
      let rectB_width = _width * (1 - splitRatio);
      let rectB_height = _height;

      let rectA = SubdivideRect(rectA_x, rectA_y, rectA_width, rectA_height, _depth + 1);
      let rectB = SubdivideRect(rectB_x, rectB_y, rectB_width, rectB_height, _depth + 1);

      return rectA.concat(rectB);
    }
    // split Y
    else {
      let rectA_x = _x;
      let rectA_y = _y;
      let rectA_width = _width;
      let rectA_height = _height * splitRatio;

      let rectB_x = _x;
      let rectB_y = _y + _height * splitRatio;
      let rectB_width = _width;
      let rectB_height = _height * (1 - splitRatio);

      let rectA = SubdivideRect(rectA_x, rectA_y, rectA_width, rectA_height, _depth + 1);
      let rectB = SubdivideRect(rectB_x, rectB_y, rectB_width, rectB_height, _depth + 1);

      return rectA.concat(rectB);
    }
  }
  else {
    return [{ x: _x, y: _y, w: _width, h: _height, depth: _depth }];
  }
}

function draw() {
  if (!liveLeavesReady || isGenerating) {
    return;
  }

  handleInteractiveMouse();
  drawReactiveLeaves();
}

function mouseMoved() {
  handleInteractiveMouse();
}

function mouseDragged() {
  handleInteractiveMouse();
}

function mousePressed() {
  handleInteractiveMouse();
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function keyPressed(e) {
  if (e.key == 's') {
    let hash = typeof fxhash !== 'undefined' ? fxhash : localHash;
    saveCanvas(`succulent-${width}-${height}-${hash}.png`);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(20);
  backgroundArtwork = null;
  staticArtwork = null;
  interactivePlantItems = [];
  reactiveLeafStrokes = [];
  flowerStrokes = [];
  liveLeavesReady = false;
  noLoop();
}
