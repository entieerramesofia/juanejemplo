let mic;
let micStarted = false;

let circles = [];

function setup() {

    createCanvas(windowWidth, windowHeight);

    mic = new p5.AudioIn();

    noFill();
}

function draw() {

    background(0);

    let vol = micStarted ? mic.getLevel() : 0;

    // crear nuevos círculos según el volumen
    if (frameCount % 2 == 0) {

        let size = map(vol, 0, 0.3, 40, width);

        circles.push({

            x: width / 2 + random(-80, 80),
            y: height / 2 + random(-80, 80),

            size: size,

            alpha: 255,

            growth: random(2, 6),

            weight: random(1, 4)
        });
    }

    // dibujar círculos
    for (let i = circles.length - 1; i >= 0; i--) {

        let c = circles[i];

        stroke(255, c.alpha);
        strokeWeight(c.weight);

        // glow
        drawingContext.shadowBlur = 25;
        drawingContext.shadowColor = color(255);

        ellipse(c.x, c.y, c.size);

        // movimiento
        c.size += c.growth;

        // desvanecer
        c.alpha -= 4;

        // eliminar círculos invisibles
        if (c.alpha <= 0) {
            circles.splice(i, 1);
        }
    }

    // círculo central
    let centerSize = map(vol, 0, 0.3, 100, 300);

    stroke(255);
    strokeWeight(3);

    drawingContext.shadowBlur = 40;
    drawingContext.shadowColor = color(255);

    ellipse(width / 2, height / 2, centerSize);

    // texto inicial
    if (!micStarted) {

        noStroke();
        fill(255);

        textAlign(CENTER, CENTER);
        textSize(24);

        text("haz click para activar el micrófono", width / 2, height / 2);
    }
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


