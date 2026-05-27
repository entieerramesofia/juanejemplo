// ============================================================
// GEOMETRÍA SAGRADA 3D — p5.js WEBGL
// mouse = controla rotación del universo
// ============================================================

let particles = [];
let zoff = 0;

const NUM_PARTICLES = 1200;
const R = 120;
const PHI = 1.6180339887;

let flowerPoints = [];

// ------------------------------------------------------------
// SETUP
// ------------------------------------------------------------
function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);

  colorMode(HSB, 360, 100, 100, 1);

  strokeCap(ROUND);

  flowerPoints = buildFlower3D(R);

  for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push(new Particle());
  }

  background(0);
}

// ------------------------------------------------------------
// DRAW
// ------------------------------------------------------------
function draw() {

  // fondo transparente para trails
  background(240, 40, 5, 0.08);

  // ----------------------------------------------------------
  // CONTROL ESPACIAL CON MOUSE
  // ----------------------------------------------------------

  rotateX(map(mouseY, 0, height, -PI/3, PI/3));
  rotateY(map(mouseX, 0, width, -PI, PI));

  // respiración cósmica
  let pulse = sin(frameCount * 0.01) * 0.08 + 1;

  scale(pulse);

  // ----------------------------------------------------------
  // DIBUJAR GEOMETRÍA
  // ----------------------------------------------------------

  drawFlowerOfLife3D();
  drawMetatron3D();
  drawMerkaba3D();
  drawGoldenSpiral3D();

  // ----------------------------------------------------------
  // PARTICULAS
  // ----------------------------------------------------------

  for (let p of particles) {
    p.update();
    p.display();
  }

  zoff += 0.003;
}

// ============================================================
// FLOR DE LA VIDA 3D
// ============================================================

function buildFlower3D(r) {

  let pts = [];

  pts.push(createVector(0, 0, 0));

  // primera corona
  for (let i = 0; i < 6; i++) {

    let a = TWO_PI / 6 * i;

    pts.push(
      createVector(
        cos(a) * r,
        sin(a) * r,
        0
      )
    );
  }

  // segunda capa en Z
  for (let i = 0; i < 6; i++) {

    let a = TWO_PI / 6 * i;

    pts.push(
      createVector(
        cos(a) * r * 1.5,
        sin(a) * r * 1.5,
        r
      )
    );

    pts.push(
      createVector(
        cos(a) * r * 1.5,
        sin(a) * r * 1.5,
        -r
      )
    );
  }

  return pts;
}

// ============================================================
// DIBUJOS
// ============================================================

function drawFlowerOfLife3D() {

  stroke(200, 40, 100, 0.16);
  strokeWeight(1);
  noFill();

  for (let p of flowerPoints) {

    push();

    translate(p.x, p.y, p.z);

    // círculos en distintos planos
    for (let i = 0; i < 3; i++) {

      push();

      if (i === 0) rotateX(HALF_PI);
      if (i === 1) rotateY(HALF_PI);

      ellipse(0, 0, R * 2);

      pop();
    }

    pop();
  }
}

// ============================================================
// METATRON 3D
// ============================================================

function drawMetatron3D() {

  stroke(280, 70, 100, 0.12);
  strokeWeight(0.7);

  for (let i = 0; i < flowerPoints.length; i++) {

    for (let j = i + 1; j < flowerPoints.length; j++) {

      let a = flowerPoints[i];
      let b = flowerPoints[j];

      line(
        a.x, a.y, a.z,
        b.x, b.y, b.z
      );
    }
  }
}

// ============================================================
// MERKABA 3D
// ============================================================

function drawMerkaba3D() {

  stroke(180, 80, 100, 0.3);
  strokeWeight(1.2);
  noFill();

  // tetraedro arriba
  beginShape(LINES);

  tetraLines(1);

  endShape();

  // tetraedro invertido
  beginShape(LINES);

  tetraLines(-1);

  endShape();
}

function tetraLines(dir) {

  let s = R * 1.2;

  let pts = [
    createVector(0, -s, 0),
    createVector(-s, s, s * dir),
    createVector(s, s, s * dir),
    createVector(0, s, -s * dir)
  ];

  connectAll(pts);
}

function connectAll(pts) {

  for (let i = 0; i < pts.length; i++) {

    for (let j = i + 1; j < pts.length; j++) {

      vertex(pts[i].x, pts[i].y, pts[i].z);
      vertex(pts[j].x, pts[j].y, pts[j].z);
    }
  }
}

// ============================================================
// ESPIRAL DORADA 3D
// ============================================================

function drawGoldenSpiral3D() {

  stroke(45, 90, 100, 0.35);
  strokeWeight(1.5);
  noFill();

  beginShape();

  for (let a = 0; a < TWO_PI * 8; a += 0.05) {

    let rr = 3 * pow(PHI, a / TWO_PI);

    let x = cos(a) * rr;
    let y = sin(a) * rr;

    // helicoidal
    let z = map(a, 0, TWO_PI * 8, -300, 300);

    vertex(x, y, z);
  }

  endShape();
}

// ============================================================
// PARTICULAS 3D
// ============================================================

class Particle {

  constructor() {
    this.reset();
  }

  reset() {

    this.pos = p5.Vector.random3D().mult(random(50, 400));

    this.prev = this.pos.copy();

    this.life = random(100, 300);

    this.speed = random(0.5, 2.0);

    this.hue = random(360);
  }

  update() {

    this.prev = this.pos.copy();

    // flow field 3D
    let n =
      noise(
        this.pos.x * 0.003,
        this.pos.y * 0.003,
        this.pos.z * 0.003 + zoff
      );

    let theta = n * TWO_PI * 4;
    let phi   = n * PI * 2;

    let dir = createVector(
      sin(phi) * cos(theta),
      sin(phi) * sin(theta),
      cos(phi)
    );

    // atracción geométrica al centro
    let centerForce = this.pos.copy().mult(-0.0008);

    dir.add(centerForce);

    dir.normalize();

    this.pos.add(dir.mult(this.speed));

    this.life--;

    if (
      this.life <= 0 ||
      this.pos.mag() > 900
    ) {
      this.reset();
    }
  }

  display() {

    stroke(this.hue, 80, 100, 0.55);
    strokeWeight(1);

    line(
      this.prev.x,
      this.prev.y,
      this.prev.z,

      this.pos.x,
      this.pos.y,
      this.pos.z
    );
  }
}

// ------------------------------------------------------------

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}