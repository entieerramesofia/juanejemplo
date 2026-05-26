
let mic;
let micStarted = false;

function setup() {

    createCanvas(windowWidth, windowHeight);
    mic = new p5.AudioIn();
}


function draw() {

    background(0);

    let vol = micStarted ? mic.getLevel() : 0;

    let diameter = map(vol, 0, 0.3, 40, width);

    noFill();
    stroke(255);
    strokeWeight(3);

    ellipse(width / 2, height / 2, diameter, diameter);

}

function mousePressed() {
    userStartAudio();
    mic.start();
    micStarted = true;
}

function touchStarted() {
    userStartAudio();
    mic.start();
    micStarted = true;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
