// Отримання DOM-елементів
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusElement = document.getElementById('status');

// Параметри фракталу
const params = {
    fractalType: 'sincos', 
    cReal: 0.1, // Реальна частина c
    cImag: 0.1, // Уявна частина c
    maxIterations: 100,
    escapeRadius: 10, 
    colorScheme: 'fire',
    randomRange: 50, 
    cornerColors: ['#000000', '#ffffff', '#ff0000', '#0000ff'] 
};

// Початкові параметри відображення
let centerX = 0, centerY = 0, scale = 200, isDragging = false, lastX = 0, lastY = 0;

// Функція для зміни розміру canvas
function resizeCanvas() {
    const container = document.querySelector('.canvas-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.displayWidth = containerWidth;
    canvas.displayHeight = containerHeight;
    drawCoordinateSystem(); // Малювання координатної системи
    generateFractal(); // Генерація фракталу
}
window.addEventListener('resize', resizeCanvas); // Виклик resizeCanvas при зміні розміру вікна

// Оновлення відображення параметрів
function updateParameterDisplay() {
    document.getElementById('c-real-value').textContent = params.cReal.toFixed(2);
    document.getElementById('c-imag-value').textContent = params.cImag.toFixed(2);
    document.getElementById('max-iterations-value').textContent = params.maxIterations;
    document.getElementById('escape-radius-value').textContent = params.escapeRadius;
    document.getElementById('random-range-value').textContent = params.randomRange; // Оновлення межі випадкового числа
}

// Обробник зміни типу фракталу
document.getElementById('fractal-type').addEventListener('change', function () {
    params.fractalType = this.value;
    document.getElementById('sincos-params').style.display = this.value === 'sincos' ? 'block' : 'none';
    document.getElementById('plasma-params').style.display = this.value === 'plasma' ? 'block' : 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Очищення canvas
    statusElement.textContent = 'Готовий';
});

// Обробники зміни параметрів для z*sin(z)+c
document.getElementById('c-real').addEventListener('input', function() {
    params.cReal = parseFloat(this.value);
    updateParameterDisplay();
    generateFractal();
});

document.getElementById('c-imag').addEventListener('input', function() {
    params.cImag = parseFloat(this.value);
    updateParameterDisplay();
    generateFractal();
});

document.getElementById('max-iterations').addEventListener('input', function() {
    params.maxIterations = parseInt(this.value);
    updateParameterDisplay();
    generateFractal();
});

document.getElementById('escape-radius').addEventListener('input', function() {
    params.escapeRadius = parseInt(this.value);
    updateParameterDisplay();
    generateFractal();
});

document.getElementById('color-scheme').addEventListener('change', function() {
    params.colorScheme = this.value;
    generateFractal();
});

// Обробник зміни межі випадкового числа
document.getElementById('random-range').addEventListener('input', function () {
    params.randomRange = parseInt(this.value);
    updateParameterDisplay();
});

// Генерація фракталу
function generateFractal() {
    if (params.fractalType === 'sincos') {
        drawSinCosFractal(); // Генерація фракталу z*sin(z)+c
    } else if (params.fractalType === 'plasma') {
        // Оновлення параметрів для Плазми
        params.cornerColors = [
            document.getElementById('corner-color-1').value,
            document.getElementById('corner-color-2').value,
            document.getElementById('corner-color-3').value,
            document.getElementById('corner-color-4').value
        ];
        params.randomRange = parseInt(document.getElementById('random-range').value);
        updateParameterDisplay();
        drawPlasmaFractal(); // Генерація фракталу Плазма
    }
}

// Малювання координатної системи
function drawCoordinateSystem() {
    const width = canvas.displayWidth;
    const height = canvas.displayHeight;
    const x0 = width / 2;
    const y0 = height / 2;
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(width, y0);
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Перетворення координат екрану в координати світу
function screenToWorld(x, y) {
    const width = canvas.displayWidth;
    const height = canvas.displayHeight;
    return {
        x: (x - width / 2) / scale + centerX,
        y: (height / 2 - y) / scale + centerY
    };
}

// Перетворення координат світу в координати екрану
function worldToScreen(x, y) {
    const width = canvas.displayWidth;
    const height = canvas.displayHeight;
    return {
        x: (x - centerX) * scale + width / 2,
        y: (centerY - y) * scale + height / 2
    };
}

// Генерація фракталу z*sin(z)+c
function drawSinCosFractal() {
    statusElement.textContent = 'Генерація фракталу...';
    setTimeout(() => {
        const width = canvas.width;
        const height = canvas.height;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = width;
        offCanvas.height = height;
        const offCtx = offCanvas.getContext('2d');
        const imgData = offCtx.createImageData(width, height);
        const data = imgData.data;
        const c = { re: params.cReal, im: params.cImag };

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const zx = (x - width / 2) / scale + centerX;
                const zy = (height / 2 - y) / scale + centerY;
                let z = { re: zx, im: zy };
                let iter = 0;
                while (iter < params.maxIterations && z.re * z.re + z.im * z.im < params.escapeRadius * params.escapeRadius) {
                    const sin = {
                        re: Math.sin(z.re) * Math.cosh(z.im),
                        im: Math.cos(z.re) * Math.sinh(z.im)
                    };
                    z = {
                        re: z.re * sin.re - z.im * sin.im + c.re,
                        im: z.re * sin.im + z.im * sin.re + c.im
                    };
                    iter++;
                }
                const i = (y * width + x) * 4;
                const col = getColor(iter, params.maxIterations, params.colorScheme);
                data[i] = col[0];
                data[i + 1] = col[1];
                data[i + 2] = col[2];
                data[i + 3] = 255;
            }
        }

        offCtx.putImageData(imgData, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offCanvas, 0, 0);
        statusElement.textContent = 'Готово';
    }, 10);
}

// Генерація фракталу Плазма
function drawPlasmaFractal() {
    statusElement.textContent = 'Генерація фракталу...';
    setTimeout(() => {
        const width = canvas.width;
        const height = canvas.height;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = width;
        offCanvas.height = height;
        const offCtx = offCanvas.getContext('2d');
        const imgData = offCtx.createImageData(width, height);
        const data = imgData.data;
        const randomFactor = params.randomRange / 100;

        function hexToRgb(hex) {
            const bigint = parseInt(hex.slice(1), 16);
            return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
        }

        function interpolate(a, b, t) {
            return a.map((v, i) => Math.round(v + t * (b[i] - v)));
        }

        function setPixel(x, y, color) {
            const i = (y * width + x) * 4;
            data[i] = color[0];
            data[i + 1] = color[1];
            data[i + 2] = color[2];
            data[i + 3] = 255;
        }

        function plasma(x1, y1, x2, y2, c1, c2, c3, c4) {
            if (x2 - x1 < 2 && y2 - y1 < 2) return;
            const mx = Math.floor((x1 + x2) / 2);
            const my = Math.floor((y1 + y2) / 2);
            const center = [
                (c1[0] + c2[0] + c3[0] + c4[0]) / 4 + randomFactor * (Math.random() - 0.5) * 255,
                (c1[1] + c2[1] + c3[1] + c4[1]) / 4 + randomFactor * (Math.random() - 0.5) * 255,
                (c1[2] + c2[2] + c3[2] + c4[2]) / 4 + randomFactor * (Math.random() - 0.5) * 255
            ].map(Math.round);
            const top = interpolate(c1, c2, 0.5);
            const bottom = interpolate(c3, c4, 0.5);
            const left = interpolate(c1, c3, 0.5);
            const right = interpolate(c2, c4, 0.5);
            setPixel(mx, y1, top);
            setPixel(mx, y2, bottom);
            setPixel(x1, my, left);
            setPixel(x2, my, right);
            setPixel(mx, my, center);
            plasma(x1, y1, mx, my, c1, top, left, center);
            plasma(mx, y1, x2, my, top, c2, center, right);
            plasma(x1, my, mx, y2, left, center, c3, bottom);
            plasma(mx, my, x2, y2, center, right, bottom, c4);
        }

        const [c1, c2, c3, c4] = params.cornerColors.map(hexToRgb);
        plasma(0, 0, width - 1, height - 1, c1, c2, c3, c4);

        offCtx.putImageData(imgData, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offCanvas, 0, 0);
        statusElement.textContent = 'Готово';
    }, 10);
}

// Отримання кольору для ітерації
function getColor(i, max, scheme) {
    const t = i / max;
    const smooth = Math.sqrt(t);
    switch (scheme) {
        case 'rainbow': return [255 * Math.sin(2 * Math.PI * smooth), 255 * Math.sin(2 * Math.PI * smooth + 2), 255 * Math.sin(2 * Math.PI * smooth + 4)].map(Math.abs).map(Math.round);
        case 'blueviolet': return [150 * smooth, 0, 255 * smooth].map(Math.round);
        case 'greenyellow': return [255 * (1 - smooth), 255 * smooth, 0].map(Math.round);
        case 'fire': return [255 * Math.min(1, 2 * smooth), 255 * Math.max(0, 3 * smooth - 1), 0].map(Math.round);
        case 'ocean': return [0, 255 * Math.min(1, 2 * smooth), 255 * smooth].map(Math.round);
        default: const v = Math.floor(255 * (1 - smooth)); return [v, v, v];
    }
}

// Обробка подій миші для перетягування canvas
canvas.addEventListener('mousedown', e => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    centerX -= dx / scale;
    centerY += dy / scale;
    lastX = e.clientX;
    lastY = e.clientY;
    generateFractal();
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'crosshair';
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.style.cursor = 'crosshair';
});

// Обробка подій колеса миші для масштабування
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const world = screenToWorld(mouseX, mouseY);
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    scale *= factor;
    centerX = world.x - (mouseX - canvas.displayWidth / 2) / scale;
    centerY = world.y - (canvas.displayHeight / 2 - mouseY) / scale;
    generateFractal();
});

// Обробка кнопки "Згенерувати фрактал"
document.getElementById('generate-btn').addEventListener('click', generateFractal);

// Обробка кнопки "Зберегти як зображення"
document.getElementById('save-btn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `fractal-${params.fractalType}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    statusElement.textContent = 'Зображення збережено!';
});

// Обробка кнопки "Скинути масштаб"
document.getElementById('reset-btn').addEventListener('click', () => {
    centerX = 0;
    centerY = 0;
    scale = 200;
    generateFractal();
    statusElement.textContent = 'Масштаб скинуто';
});

// Ініціалізація при завантаженні сторінки
window.addEventListener('load', () => {
    document.getElementById('sincos-params').style.display = 'block';
    document.getElementById('plasma-params').style.display = 'none';
    resizeCanvas();
    updateParameterDisplay();
});
