// ─── AUDIO PARA TIERRA ───────────────────────────────────────────────────────
// Agrega fftDirt a tus variables globales y llama setupDirtAudio() en setup()
setupDirtAudio();  // tierra
setupLeafAudio();  // hojas

let fftDirt;
let plantDensityMultiplier = 100;

function setupDirtAudio() {
    fftDirt = new p5.FFT(0.6, 64);
}

// Devuelve [hue, sat, bri] de tierra reactivo al audio en ese instante
function getAudioDirtColor() {
    if (!fftDirt) return randomDirtColor();

    fftDirt.analyze();

    let bass   = fftDirt.getEnergy("bass")   / 255; // 20–140 Hz  → hue
    let mid    = fftDirt.getEnergy("mid")    / 255; // 400–2600 Hz → saturación
    let treble = fftDirt.getEnergy("treble") / 255; // 2600+ Hz   → brillo

    return [
        lerp(14, 34, bass)    + random(-4, 4),  // café frío ↔ café rojizo
        lerp(18, 48, mid)     + random(-3, 3),  // tierra seca ↔ húmeda
        lerp(32, 68, treble)  + random(-6, 6)   // tierra oscura ↔ clara
    ];
}

// ─── CLASE PLANTBOWL ─────────────────────────────────────────────────────────

class PlantBowl {
    constructor(_x, _y, _width, _height) {
        this.bowlX = _x;
        this.bowlY = _y;
        this.bowlWidth = _width;
        this.bowlHeight = _height;

        this.bowlThickness = random(0.08, 0.14) * min(_width, _height);

        this.bowlType = 1;
        this.isPlantDrawn = false;

        if (random() < 0.06) {
            this.bowlType = 3;
            this.isPlantDrawn = true;
        }

        let minSide = min(_width, _height);

        this.paddingLeft   = random(0, 0.06) * minSide;
        this.paddingRight  = random(0, 0.06) * minSide;
        this.paddingTop    = random(0, 0.06) * minSide;
        this.paddingBottom = random(0, 0.06) * minSide;

        let paddingRandom = random();
        if (paddingRandom < 0.1) {
            this.paddingLeft   = 0;
            this.paddingRight  = 0;
            this.paddingTop    = 0;
            this.paddingBottom = 0;
        }
        else if (paddingRandom < 0.3) {
            this.paddingRight  = this.paddingLeft;
            this.paddingTop    = this.paddingLeft;
            this.paddingBottom = this.paddingLeft;
        }
        else if (paddingRandom < 0.8) {
            let newPadding = random(0.02, 0.06) * minSide;

            if (_width > _height) {
                this.paddingTop    = newPadding;
                this.paddingBottom = newPadding;

                let spacePadding = _width - _height - 2 * newPadding;
                let spaceRatio   = random();

                this.paddingLeft  = newPadding + spacePadding * spaceRatio;
                this.paddingRight = newPadding + spacePadding * (1 - spaceRatio);
            } else {
                this.paddingLeft  = newPadding;
                this.paddingRight = newPadding;

                let spacePadding = _height - _width - 2 * newPadding;
                let spaceRatio   = random();

                this.paddingTop    = newPadding + spacePadding * spaceRatio;
                this.paddingBottom = newPadding + spacePadding * (1 - spaceRatio);
            }

            if (random() < 0.5)
                this.bowlType = 2;
        }

        this.plantX      = this.bowlX + this.paddingLeft + this.bowlThickness;
        this.plantY      = this.bowlY + this.paddingTop  + this.bowlThickness;
        this.plantWidth  = this.bowlWidth  - 2 * this.bowlThickness - this.paddingLeft - this.paddingRight;
        this.plantHeight = this.bowlHeight - 2 * this.bowlThickness - this.paddingTop  - this.paddingBottom;

        if (this.bowlType <= 1)
            this.plantSize = random(0.3, 1.2) * min(this.plantWidth, this.plantHeight);
        else if (this.bowlType == 2)
            this.plantSize = random(0.3, 0.8) * min(this.plantWidth, this.plantHeight);
    }

    // ─── TIERRA ──────────────────────────────────────────────────────────────

    // Detecta si el mouse está sobre la zona de tierra de maceta rectangular
    _isMouseOverDirtRect() {
        let x = this.bowlX + this.paddingLeft  + this.bowlThickness;
        let y = this.bowlY + this.paddingTop   + this.bowlThickness;
        let w = this.bowlWidth  - this.paddingLeft - this.paddingRight  - this.bowlThickness * 2;
        let h = this.bowlHeight - this.paddingTop  - this.paddingBottom - this.bowlThickness * 2;

        let dirtY = y + h * 0.18;
        let dirtH = h * 0.82;

        return mouseX >= x && mouseX <= x + w &&
               mouseY >= dirtY && mouseY <= dirtY + dirtH;
    }

    // Detecta si el mouse está sobre la zona de tierra de maceta redonda
    _isMouseOverDirtRound(centerX, centerY, innerRadius, dirtStartY) {
        let dx = mouseX - centerX;
        let dy = mouseY - centerY;
        return sqrt(dx * dx + dy * dy) < innerRadius &&
               mouseY > dirtStartY;
    }

    // Obtiene los multiplicadores de audio para textura de tierra
    _getAudioTexture(hovered) {
        if (!fftDirt) return { densityMult: 1, thickMult: 1, jitter: 0 };

        fftDirt.analyze();
        let bass   = fftDirt.getEnergy("bass")   / 255;
        let mid    = fftDirt.getEnergy("mid")    / 255;
        let treble = fftDirt.getEnergy("treble") / 255;

        // Bajos  → densidad de líneas (más golpe = tierra más densa)
        let densityMult = lerp(0.7, 2.2, bass);
        // Medios → grosor de trazo (melodía = líneas más gruesas)
        let thickMult   = lerp(0.8, 1.8, mid);
        // Agudos → jitter horizontal (platillos = textura más nerviosa)
        let jitter      = lerp(0, 6, treble);

        if (hovered) {
            densityMult *= 1.6;
            jitter      *= 2.0;
        }

        return { densityMult, thickMult, jitter };
    }

    // Aplica el tinte de hover (empuja hue hacia naranja vivo)
    _applyHoverTint(colorData) {
        return [
            lerp(colorData[0], 28, 0.35),
            lerp(colorData[1], 50, 0.35),
            lerp(colorData[2], 95, 0.35)
        ];
    }

    async drawDirtRect() {
        let endX      = this.bowlX + this.paddingLeft  + this.bowlThickness;
        let endY      = this.bowlY + this.paddingTop   + this.bowlThickness;
        let endWidth  = this.bowlWidth  - this.paddingLeft - this.paddingRight  - this.bowlThickness * 2;
        let endHeight = this.bowlHeight - this.paddingTop  - this.paddingBottom - this.bowlThickness * 2;

        let dirtStartY = endY + endHeight * 0.18;
        let dirtHeight = endHeight * 0.82;

        // Colores reactivos al audio (dos snapshots para el gradiente)
        let dirtColorA = getAudioDirtColor();
        let dirtColorB = getAudioDirtColor();

        // Textura reactiva al audio + hover
        let hovered = this._isMouseOverDirtRect();
        let { densityMult, thickMult, jitter } = this._getAudioTexture(hovered);

        let lineCount = max(3, floor(dirtHeight * lineDensity * 1.35 * densityMult));

        for (let i = 0; i < lineCount; i++) {
            let t    = i / (lineCount - 1);
            let nowY = dirtStartY + t * dirtHeight;

            // Jitter horizontal reactivo al audio y hover
            let jitterL = random(-jitter, jitter);
            let jitterR = random(-jitter, jitter);

            // Grosor reactivo
            strokeWeight(thickMult * (hovered ? 1.4 : 1.0));

            let dirtColorData = NYLerpColorData(dirtColorA, dirtColorB, t);

            // Tinte naranja al hacer hover
            if (hovered)
                dirtColorData = this._applyHoverTint(dirtColorData);

            NYSetColor(dirtColorData[0], dirtColorData[1], dirtColorData[2]);
            NYLine(
                endX - this.bowlThickness * 0.08 + jitterL, nowY,
                endX + endWidth + this.bowlThickness * 0.08 + jitterR, nowY
            );

            if (i % drawBowlLoopCount == 0)
                await sleep(1);
        }
    }

    async drawDirtRound() {
        let drawWidth  = this.bowlWidth  - this.paddingLeft - this.paddingRight;
        let drawHeight = this.bowlHeight - this.paddingTop  - this.paddingBottom;

        let centerX = this.bowlX + this.paddingLeft + drawWidth  / 2;
        let centerY = this.bowlY + this.paddingTop  + drawHeight / 2;

        let innerRadius = drawWidth / 2 - this.bowlThickness;

        let dirtStartY = centerY - innerRadius * 0.65;
        let dirtEndY   = centerY + innerRadius;

        // Colores reactivos al audio (dos snapshots para el gradiente)
        let dirtColorA = getAudioDirtColor();
        let dirtColorB = getAudioDirtColor();

        // Textura reactiva al audio + hover
        let hovered = this._isMouseOverDirtRound(centerX, centerY, innerRadius, dirtStartY);
        let { densityMult, thickMult, jitter } = this._getAudioTexture(hovered);

        let lineCount = max(3, floor((dirtEndY - dirtStartY) * lineDensity * 1.35 * densityMult));

        for (let i = 0; i < lineCount; i++) {
            let t    = i / (lineCount - 1);
            let nowY = dirtStartY + t * (dirtEndY - dirtStartY);

            let dy    = nowY - centerY;
            let chord = sqrt(max(0, innerRadius * innerRadius - dy * dy));

            let jitterL = random(-jitter, jitter);
            let jitterR = random(-jitter, jitter);

            strokeWeight(thickMult * (hovered ? 1.4 : 1.0));

            let dirtColorData = NYLerpColorData(dirtColorA, dirtColorB, t);

            if (hovered)
                dirtColorData = this._applyHoverTint(dirtColorData);

            NYSetColor(dirtColorData[0], dirtColorData[1], dirtColorData[2]);
            NYLine(
                centerX - chord + jitterL, nowY,
                centerX + chord + jitterR, nowY
            );

            if (i % drawBowlLoopCount == 0)
                await sleep(1);
        }
    }

    // ─── BOWL ────────────────────────────────────────────────────────────────

    async drawBowlRect() {
        let bowlColorA = randomBowlColor();
        let bowlColorB = [];
        bowlColorB[0] = bowlColorA[0] + random(-10, 10);
        bowlColorB[1] = bowlColorA[1] + random(-10, 10);
        bowlColorB[2] = bowlColorA[2] + random(-20, 20);

        let thickness  = random(0.03, 0.3) * min(this.bowlWidth, this.bowlHeight);
        let lineCount  = max(2, floor(thickness * lineDensity));

        let startX      = this.bowlX + this.paddingLeft;
        let startY      = this.bowlY + this.paddingTop;
        let startWidth  = this.bowlWidth  - this.paddingLeft - this.paddingRight;
        let startHeight = this.bowlHeight - this.paddingTop  - this.paddingBottom;

        let endX      = this.bowlX + this.paddingLeft + this.bowlThickness;
        let endY      = this.bowlY + this.paddingTop  + this.bowlThickness;
        let endWidth  = this.bowlWidth  - this.paddingLeft - this.paddingRight - this.bowlThickness * 2;
        let endHeight = this.bowlHeight - this.paddingTop  - this.paddingBottom - this.bowlThickness * 2;

        for (let i = 0; i < lineCount; i++) {
            let t = i / (lineCount - 1);

            let nowX      = lerp(startX,      endX,      t);
            let nowY      = lerp(startY,      endY,      t);
            let nowWidth  = lerp(startWidth,  endWidth,  t);
            let nowHeight = lerp(startHeight, endHeight, t);

            let bowlColorData = NYLerpColorData(bowlColorA, bowlColorB, t);
            NYSetColor(bowlColorData[0], bowlColorData[1], bowlColorData[2]);
            NYRectFrame(nowX, nowY, nowWidth, nowHeight);

            if (i % drawBowlLoopCount == 0)
                await sleep(1);
        }

        await this.drawDirtRect();
    }

    async drawBowlRound() {
        let drawWidth  = this.bowlWidth  - this.paddingLeft - this.paddingRight;
        let drawHeight = this.bowlHeight - this.paddingTop  - this.paddingBottom;

        let drawX = this.bowlX + this.paddingLeft + drawWidth  / 2;
        let drawY = this.bowlY + this.paddingTop  + drawHeight / 2;

        let drawCount = max(2, floor(this.bowlThickness * lineDensity));

        let bowlColorA = randomBowlColor();
        let bowlColorB = [];
        bowlColorB[0] = bowlColorA[0] + random(-10, 10);
        bowlColorB[1] = bowlColorA[1] + random(-10, 10);
        bowlColorB[2] = bowlColorA[2] + random(-20, 50);

        for (let i = 0; i < drawCount; i++) {
            let t          = i / (drawCount - 1);
            let fromRadius = drawWidth / 2;
            let toRadius   = drawWidth / 2 - this.bowlThickness;

            let bowlColorData = NYLerpColorData(bowlColorA, bowlColorB, t);
            NYSetColor(bowlColorData[0], bowlColorData[1], bowlColorData[2], 0.8);
            NYCircle(drawX, drawY, lerp(fromRadius, toRadius, t));

            if (i % drawBowlLoopCount == 0)
                await sleep(1);
        }

        await this.drawDirtRound();
    }

    // ─── PLANT ───────────────────────────────────────────────────────────────

    async drawPlant() {
        if (this.bowlType <= 1) {
            let sizeRatio  = abs(this.plantWidth - this.plantHeight) / min(this.plantWidth, this.plantHeight);
            let plantCount = floor((random(8, 30) + random(5, 30) * sizeRatio) * plantDensityMultiplier); //PARA CONTEO PLANTAS

            for (let i = 0; i < plantCount; i++) {
                let spawnX    = this.plantX + random(0.15, 0.85) * this.plantWidth;
                let spawnY    = this.plantY + random(0.15, 0.85) * this.plantHeight;
                let plantSize = this.plantSize * random(0.45, 0.75);

                if (i == 0) {
                    spawnX    = this.plantX + this.plantWidth  / 2;
                    spawnY    = this.plantY + this.plantHeight / 2;
                    plantSize = this.plantSize * random(0.65, 0.9);
                }

                let layers        = floor(random(5, 14));
                let countPerLayer = floor(random(7, 28));

                await drawPlantB(spawnX, spawnY, plantSize, 0, layers, countPerLayer);

                if (typeof drawFlowerCluster === "function") {
                    drawFlowerCluster(spawnX, spawnY, plantSize);
                }
            }
        } else if (this.bowlType == 2) {
            let plantCount = floor(random(20, 30) * plantDensityMultiplier);

            for (let i = 0; i < plantCount; i++) {
                let spawnX    = this.plantX + this.plantWidth  / 2 + random(-0.28, 0.28) * this.plantWidth;
                let spawnY    = this.plantY + this.plantHeight / 2 + random(-0.28, 0.28) * this.plantHeight;
                let plantSize = this.plantSize * random(0.5, 1);

                if (i == 0) {
                    spawnX    = this.plantX + this.plantWidth  / 2;
                    spawnY    = this.plantY + this.plantHeight / 2;
                    plantSize = this.plantSize * random(0.75, 1);
                }

                let layers        = floor(random(5, 24));
                let countPerLayer = floor(random(7, 28));

                await drawPlantB(spawnX, spawnY, plantSize, 0, layers, countPerLayer);

                if (typeof drawFlowerCluster === "function") {
                    drawFlowerCluster(spawnX, spawnY, plantSize);
                }
            }
        }

        this.isPlantDrawn = true;
    }
}

// ─── HELPERS (sin cambios) ────────────────────────────────────────────────────

function NYCircle(_x, _y, _radius) {
    let circleLineLength  = 2 * PI * _radius;
    let drawStrokeCount   = max(3, floor(circleLineLength * lineDensity * 0.1));

    for (let i = 0; i < drawStrokeCount; i++) {
        let t    = i / drawStrokeCount;
        let nowX = _x + _radius * cos(t * 2 * PI);
        let nowY = _y + _radius * sin(t * 2 * PI);

        randomBrushColor(10, 15, 60);
        NYStrokePoint(nowX, nowY);
    }
}

function NYRectFrame(_x, _y, _width, _height) {
    NYLine(_x,          _y,           _x + _width, _y);
    NYLine(_x + _width, _y,           _x + _width, _y + _height);
    NYLine(_x + _width, _y + _height, _x,          _y + _height);
    NYLine(_x,          _y + _height, _x,          _y);
}