let mic;

function setup() {
    // Definimos el tamaño de nuestro canvas, 400px de ancho y 400 de alto
    createCanvas(windowWidth, windowHeight);
    // Inicializamos nuestro input de micrófono
    mic = new p5.AudioIn();
    mic.start();
}
function draw() {
    background(0); // Limpiamos el canvas en cada frame
    // La función getLevel nos devuelve la amplitud del sonido en un rango de 0 a 1
    let vol = mic.getLevel();
    console.log(vol);
    // Calculamos la posición de y según el volumen/amplitud del sonido
    let diameter = vol * width;
    noFill();
    stroke(vol * 255, 0, 255);
    strokeWeight(vol * 1000);
    // Dibujamos nuestra elipse con nuestros valores almacenados en variables
    ellipse(width / 2, height/2, diameter, diameter);
}