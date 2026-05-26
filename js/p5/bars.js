const BARS_AUDIO_PATH = "/audio/triple.mp3";

let song;
let barsFft;
let barsSong;

let barsFit;

let barsAmplitude;
let songStarted = false;

const barBins = 64;

function preload() {

    soundFormats('mp3');
    song = loadSound(BARS_AUDIO_PATH);
}

function setup() {

    createCanvas(windowWidth, windowHeight);

    barsFft = new p5.FFT(0.88, barBins);
    barsFft.setInput(song);
    barsAmplitude = new p5.Amplitude();
    barsAmplitude.setInput(song);
    noStroke();
}

function draw() {

    const spectrum = barsFft.analyze();
    const level = barsAmplitude.getLevel();
    background(0);

    const margin = 50;
    const availabeWidth = width - margin * 2;
    const barWidth = availabeWidth / spectrum.length;

    for (let i = 0; i < spectrum.length; i++) {
        const x = margin + i * barWidth;
        const energy = spectrum[i];
        const barHeight = map(energy, 0, 255, 10, height * 0.42);
        const alpha = map(energy, 0, 255, 50, 255);

        fill(255, 255, 255);
        rect(x, height / 2 - barHeight, barWidth * 0.8, barHeight);
        rect(x, height / 2, barWidth * 0.8, barHeight);

    }

    if (!songStarted) {
        drawStartMessage();
    }
}

function startSong() {

    userStartAudio();
    if (songStarted || !song.isLoaded()) return;

    song.play();
    songStarted = true;

}

function mousePressed() {

    startSong();

}

function touchStarted() {

    startSong();
    return false;

}

function windowResized() {

    resizeCanvas(windowWidth, windowHeight);
}

function drawStartMessage() {

    push();
    rectMode(CENTER);
    textAlign(CENTER, CENTER);

    fill(0, 210);
    rect(width / 2, height / 2, min(width - 40, 520), 210, 8);

    fill(255);
    textSize(24);
    textStyle(BOLD);
    text("Haz click", width / 2, height / 2 - 44);
    text("para activar la cancion", width / 2, height / 2 - 16);

    textSize(15);
    textStyle(NORMAL);
    text("El navegador necesita una interaccion", width / 2, height / 2 + 28);
    text("para reproducir audio.", width / 2, height / 2 + 50);
    text("Despues, las barras se moveran con la musica.", width / 2, height / 2 + 78);
    pop();
}
