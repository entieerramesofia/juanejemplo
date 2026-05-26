const FFT_SIZE = 64;
const MIN_MOUNTAIN_COUNT = 3;
const MAX_MOUNTAIN_COUNT = 12;
const BASS_BAND_COUNT = 6;
const HORIZONTAL_LINE_COUNT = 40;
const MOUNTAIN_CHANGE_INTERVAL = 18;
const SMOOTHING = 0.8;

let audioElement;
let enterButton;
let audioFileInput;
let audioContext;
let analyser;
let frequencyData;
let sourceNode;
let started = false;
let audioObjectUrl;
let bassEnergy = 0;
let currentMountainCount = MIN_MOUNTAIN_COUNT;
let lastMountainChangeFrame = 0;

function setup() {
    createCanvas(windowWidth, windowHeight);
    pixelDensity(1);
    noFill();
    stroke(255);

    audioElement = document.getElementById("audio");
    enterButton = document.getElementById("enter-btn");
    audioFileInput = document.getElementById("audio-file");

    audioElement.crossOrigin = "anonymous";

    enterButton.addEventListener("click", startAudio, false);
    audioFileInput.addEventListener("change", loadSelectedAudio, false);
}

function draw() {
    background(0);

    if (!started) {
        return;
    }

    analyser.getByteFrequencyData(frequencyData);

    const bass = getBassEnergy(frequencyData);
    const bassHit = max(0, bass - bassEnergy);
    bassEnergy = lerp(bassEnergy, bass, 0.18);
    currentMountainCount = getBassMountainCount(bassEnergy, bassHit);

    const mountains = splitMountains(mirrorSamples(frequencyData), currentMountainCount);
    const elapsedTime = millis() * 0.003;

    push();
    translate(0, height * 0.5);
    scale(1.5, 1.5);
    translate(-(width * 0.25), 0);
    blendMode(HARD_LIGHT);

    for (let mountainIndex = 0; mountainIndex < mountains.length; mountainIndex++) {
        const limits = setLimits(mountains[mountainIndex], elapsedTime, bassEnergy);
        const lines = setLines(limits, HORIZONTAL_LINE_COUNT);

        push();
        const alpha = map(mountainIndex + 1, 1, mountains.length, 0.25, 0.9);
        drawingContext.globalAlpha = alpha;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            strokeWeight(lineIndex * 0.01 + 0.1);
            stroke(gradientStroke(lineIndex, mountainIndex, elapsedTime));
            beginShape();
            drawLine(lines[lineIndex]);
            vertex(width, 0);
            endShape();
        }
        pop();
    }

    blendMode(BLEND);
    pop();
}

async function startAudio() {
    if (started) {
        return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx();

    analyser = audioContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING;

    sourceNode = audioContext.createMediaElementSource(audioElement);
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);

    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    await audioContext.resume();
    await playAudio();

    started = true;
    enterButton.style.display = "none";
}

async function loadSelectedAudio(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    if (audioObjectUrl) {
        URL.revokeObjectURL(audioObjectUrl);
    }

    audioObjectUrl = URL.createObjectURL(file);
    audioElement.src = audioObjectUrl;
    audioElement.load();

    if (started) {
        await audioContext.resume();
        await playAudio();
    }
}

async function playAudio() {
    try {
        await audioElement.play();
    } catch (error) {
        console.warn("No se pudo reproducir el audio todavía.", error);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function mirrorSamples(samples) {
    const list = Array.from(samples);
    return list.slice().reverse().concat(list);
}

function getBassEnergy(samples) {
    let total = 0;
    const bands = min(BASS_BAND_COUNT, samples.length);
    for (let i = 0; i < bands; i++) {
        total += samples[i];
    }
    return total / (bands * 255);
}

function getBassMountainCount(bass, bassHit) {
    const canChange = frameCount - lastMountainChangeFrame > MOUNTAIN_CHANGE_INTERVAL;
    if (!canChange || bassHit < 0.05) {
        return currentMountainCount;
    }

    lastMountainChangeFrame = frameCount;
    const randomPush = random(-0.75, 1.75) * bassHit * 6;
    const count = map(bass, 0, 1, MIN_MOUNTAIN_COUNT, MAX_MOUNTAIN_COUNT) + randomPush;
    return constrain(round(count), MIN_MOUNTAIN_COUNT, MAX_MOUNTAIN_COUNT);
}

function splitMountains(vertices, count) {
    const mountains = [];
    for (let i = 0; i < count; i++) {
        mountains[i] = [];
    }

    let mountainIndex = 0;
    for (let vertexIndex = 0; vertexIndex < vertices.length; vertexIndex++) {
        mountains[mountainIndex].push(vertices[vertexIndex]);
        mountainIndex++;
        if (mountainIndex > count - 1) {
            mountainIndex = 0;
        }
    }

    return mountains;
}

function setLimits(amplitudes, elapsedTime, bass) {
    const limits = [[0, 0], [0, 0]];
    for (let i = 0; i < amplitudes.length; i++) {
        const movement = sin(elapsedTime + i) * (85 + bass * 85);
        const value = amplitudes[i] + movement;
        const mountainHeight = 0.3 + bass * 0.35;
        limits.push([-(value * mountainHeight), (value * mountainHeight)]);
    }
    limits.push([0, 0], [0, 0]);
    return limits;
}

function setLines(limits, count) {
    const lines = [];
    for (let lineIndex = 0; lineIndex < count; lineIndex++) {
        lines[lineIndex] = [];
        const t = (lineIndex + 1) / count;
        for (let i = 0; i < limits.length; i++) {
            const limit = limits[i];
            lines[lineIndex].push(lerp(limit[0], limit[1], t));
        }
    }
    return lines;
}

function drawLine(line) {
    vertex(0, 0);
    const spacingX = width / line.length;

    for (let i = 0; i < line.length - 1; i++) {
        const currentAmplitude = line[i];
        const currentPoint = {
            x: spacingX * i,
            y: i % 2 === 0 ? -currentAmplitude : currentAmplitude
        };
        const nextAmplitude = line[i + 1];
        const nextPoint = {
            x: currentPoint.x + spacingX,
            y: i % 2 === 0 ? nextAmplitude : -nextAmplitude
        };
        const midpointX = (currentPoint.x + nextPoint.x) * 0.5;
        const midpointY = (currentPoint.y + nextPoint.y) * 0.5;
        quadraticVertex(currentPoint.x, currentPoint.y, midpointX, midpointY);
    }
}

function gradientStroke(lineIndex, mountainIndex, elapsedTime) {
    const phase = elapsedTime + (mountainIndex * 0.4) + (lineIndex * 0.06);
    const r = 20 + 220 * abs(sin(phase + 0.5));
    const g = 30 + 220 * abs(sin(phase + 1.8));
    const b = 30 + 220 * abs(sin(phase + 3.1));
    return color(r, g, b);
}
