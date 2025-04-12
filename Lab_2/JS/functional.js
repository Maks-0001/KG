const canvas = document.getElementById('coordinateCanvas');
const ctx = canvas.getContext('2d');
const canvasWidth = 780;
const canvasHeight = 780;
const cellSize = canvasWidth / 38; 
canvas.width = canvasWidth;
canvas.height = canvasHeight;
// Отримання елементів canvas та контексту для малювання
let vertices = [];
let bezierMethod = 'parametric'; // Метод за замовчуванням

// Функція для побудови декартової системи координат
function drawCoordinateSystem() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = '#e0e0e0';
    for (let x = 0; x <= canvasWidth; x += cellSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }

    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, Math.floor(canvasHeight / 2) + 0.5);
    ctx.lineTo(canvasWidth, Math.floor(canvasHeight / 2) + 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(Math.floor(canvasWidth / 2) + 0.5, 0); 
    ctx.lineTo(Math.floor(canvasWidth / 2) + 0.5, canvasHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvasWidth - 10, Math.floor(canvasHeight / 2) - 5);
    ctx.lineTo(canvasWidth, Math.floor(canvasHeight / 2));
    ctx.lineTo(canvasWidth - 10, Math.floor(canvasHeight / 2) + 5);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(Math.floor(canvasWidth / 2) - 5, 10);
    ctx.lineTo(Math.floor(canvasWidth / 2), 0);
    ctx.lineTo(Math.floor(canvasWidth / 2) + 5, 10);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    for (let x = -Math.floor(canvasWidth / 2 / cellSize); x <= Math.floor(canvasWidth / 2 / cellSize); x++) {
        if (x !== 0 && Math.abs(x) <= 18) {
            ctx.fillText(
            x,
            Math.floor(canvasWidth / 2) + x * cellSize - 5,
            Math.floor(canvasHeight / 2) + 15
            );
        }
    }
    for (let y = -Math.floor(canvasHeight / 2 / cellSize); y <= Math.floor(canvasHeight / 2 / cellSize); y++) {
        if (y !== 0 && Math.abs(y) <= 18) {
            ctx.fillText(
                y,
                Math.floor(canvasWidth / 2) + 10,
                Math.floor(canvasHeight / 2) - y * cellSize + 5
            );
        }
    }

    ctx.fillText('X', canvasWidth - 25, Math.floor(canvasHeight / 2) - 5);
    ctx.fillText('Y', Math.floor(canvasWidth / 2) - 15, 15);

    ctx.lineWidth = 1;
}

// Функція для побудови кривої Безьє
function drawBezierCurve() {
    if (vertices.length < 2) return;

    ctx.strokeStyle = '#ff0000'; // Колір кривої
    ctx.lineWidth = 2;

    if (bezierMethod === 'parametric') {
        drawParametricBezier();
    } else {
        drawRecursiveBezier();
    }

    // Побудова контрольного багатокутника
    ctx.strokeStyle = '#0000ff'; // Колір контрольного багатокутника
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.stroke();

    // Малювання дотичних до першої та останньої вершин
    if (vertices.length >= 2) {
        ctx.strokeStyle = '#00ff00'; // Колір дотичних
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        ctx.lineTo(vertices[1].x, vertices[1].y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(vertices[vertices.length - 2].x, vertices[vertices.length - 2].y);
        ctx.lineTo(vertices[vertices.length - 1].x, vertices[vertices.length - 1].y);
        ctx.stroke();
    }
}

// Параметричний метод побудови кривої Безьє
function drawParametricBezier() {
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.01) {
        const point = calculateParametricBezierPoint(t);
        if (t === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    }
    ctx.stroke();
}

// Рекурсивний метод побудови кривої Безьє
function drawRecursiveBezier() {
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.01) {
        const point = calculateRecursiveBezierPoint(vertices, t);
        if (t === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    }
    ctx.stroke();
}

// Обчислення точки на кривій Безьє за параметричною формулою
function calculateParametricBezierPoint(t) {
    let x = 0, y = 0;
    const n = vertices.length - 1;
    for (let i = 0; i <= n; i++) {
        const binomial = factorial(n) / (factorial(i) * factorial(n - i));
        const coefficient = binomial * Math.pow(1 - t, n - i) * Math.pow(t, i);
        x += coefficient * ((vertices[i].x - canvasWidth / 2) / cellSize);
        y += coefficient * ((canvasHeight / 2 - vertices[i].y) / cellSize);
    }
    return {
        x: x * cellSize + canvasWidth / 2,
        y: canvasHeight / 2 - y * cellSize
    };
}

// Обчислення точки на кривій Безьє за рекурсивною формулою
function calculateRecursiveBezierPoint(points, t) {
    if (points.length === 1) return points[0];
    const newPoints = [];
    for (let i = 0; i < points.length - 1; i++) {
        const x = (1 - t) * points[i].x + t * points[i + 1].x;
        const y = (1 - t) * points[i].y + t * points[i + 1].y;
        newPoints.push({ x, y });
    }
    return calculateRecursiveBezierPoint(newPoints, t);
}

// Функція для обчислення факторіалу
function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }

// Додавання вершини
document.getElementById('addVertexBtn').addEventListener('click', () => {
    const xInput = document.getElementById('vertexX');
    const yInput = document.getElementById('vertexY');

    const xValue = xInput.value;
    const yValue = yInput.value;

    // Перевірка, чи заповнені обидва поля X та Y
    if (xValue === '' || yValue === '') {
        alert('Будь ласка, заповніть обидва поля X та Y перед додаванням вершини.');
        return;
    }

    const x = parseFloat(xValue);
    const y = parseFloat(yValue);

    // Перевірка, чи є введені значення коректними числами у діапазоні від -18 до 18
    if (isNaN(x) || isNaN(y) || x < -18 || x > 18 || y < -18 || y > 18) {
        alert('Будь ласка, введіть коректні числові значення для X та Y (від -18 до 18).');
        return;
    }

    const canvasX = x * cellSize + canvasWidth / 2;
    const canvasY = canvasHeight / 2 - y * cellSize;

    // Перевірка на дублювання координат
    if (vertices.some(vertex => vertex.x === canvasX && vertex.y === canvasY)) {
        alert('Вершина з такими координатами вже існує. Будь ласка, введіть інші координати.');
        return;
    }

    // Додавання нової вершини до списку
    vertices.push({ x: canvasX, y: canvasY });
    updateVerticesList();
    drawCoordinateSystem();

    // Перемалювання точок та міток для вершин
    ctx.fillStyle = '#0000ff'; // Колір точок
    ctx.font = '12px Arial'; // Шрифт для міток
    vertices.forEach((vertex, index) => {
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, 5, 0, 2 * Math.PI); // Малювання точки
        ctx.fill();
        ctx.fillText(index + 1, vertex.x + 5, vertex.y - 5); // Додавання мітки
    });

    // Якщо всі вершини валідні та їх кількість >= 2, побудувати криву Безьє
    if (vertices.every(v => v.x !== null && v.y !== null) && vertices.length >= 2) {
        drawBezierCurve();

        // Перемалювання точок та міток для вершин
        ctx.fillStyle = '#0000ff'; 
        ctx.font = '12px Arial'; 
        vertices.forEach((vertex, index) => {
            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, 5, 0, 2 * Math.PI); 
            ctx.fill();
            ctx.fillText(index + 1, vertex.x + 5, vertex.y - 5);
        });
    }

    // Малювання точок та міток для вершин
    ctx.fillStyle = '#0000ff'; 
    ctx.font = '12px Arial'; 
    vertices.forEach((vertex, index) => {
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, 5, 0, 2 * Math.PI); 
        ctx.fill();
        ctx.fillText(index + 1, vertex.x + 5, vertex.y - 5); 
    });

    // Якщо кількість вершин >= 2, побудувати криву Безьє
    if (vertices.length >= 2) {
        drawBezierCurve();
    }

    // Очищення полів вводу після успішного додавання
    xInput.value = '';
    yInput.value = '';
});

// Оновлення списку вершин з перевірками
function updateVerticesList() {
    const list = document.getElementById('verticesList');
    list.innerHTML = '';
    vertices.forEach((vertex, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${index + 1}: 
            <input type="number" value="${((vertex.x - canvasWidth / 2) / cellSize).toFixed(2)}" data-index="${index}" class="vertex-x">
            <input type="number" value="${((canvasHeight / 2 - vertex.y) / cellSize).toFixed(2)}" data-index="${index}" class="vertex-y">
        `;
        list.appendChild(li);
    });

    //  Обчислення поліномів Бернштейна
    document.getElementById('calculatePolynomialsBtn').onclick = () => {
    const tInput = document.getElementById('tValue').value;
    const t = parseFloat(tInput);

    if (vertices.length < 2) {
        alert('Будь ласка, додайте принаймні 2 вершини для побудови кривої.');
        return;
    }

    if (isNaN(t) || t < 0 || t > 1) {
        alert('Будь ласка, введіть значення t у діапазоні [0, 1].');
        return;
    }

    const n = vertices.length - 1;

    if (n <= 2) {
        alert(
            'Щоб обчислити поліноми Бернштейна, потрібно принаймні 4 контрольні вершини.\n' +
            'Це пов’язано з тим, що ми обчислюємо лише перші (n - 2) поліноми при заданому значенні параметра t,\n' +
            'де n — це степінь кривої Безьє (n = кількість вершин - 1).\n\n' +
            `У вас зараз ${n + 1} вершин, тому n = ${n}, і n - 2 = ${n - 2}, тобто поліномів обчислити неможливо.`
        );
        return;
    }
    

    const polynomialsTable = document.getElementById('polynomialsTable');
    polynomialsTable.querySelector('tbody').innerHTML = ''; // Очистити попередні результати

    // Обчислюємо перші n-2 поліноми Бернштейна: B_{n,i}(t)
    for (let i = 0; i < n - 2; i++) {
    const binomial = factorial(n) / (factorial(i) * factorial(n - i));
    const bernsteinValue = binomial * Math.pow(t, i) * Math.pow(1 - t, n - i);

    const row = document.createElement('tr');
    row.innerHTML = `<td>B<sub>${n}, ${i}</sub>(t)</td><td>${bernsteinValue.toFixed(4)}</td>`;
    polynomialsTable.querySelector('tbody').appendChild(row);
}
}

    // Додавання обробників подій для оновлення вершин
    document.querySelectorAll('.vertex-x, .vertex-y').forEach(input => {
        const index = parseInt(input.dataset.index);

        input.addEventListener('input', (e) => {
            const newValue = parseFloat(e.target.value);
            const isX = e.target.classList.contains('vertex-x');
            const errorMessageId = `error-${index}-${isX ? 'x' : 'y'}`;
            let errorMessage = document.getElementById(errorMessageId);

            // Перевірка, чи нове значення знаходиться в межах дозволеного діапазону [-18, 18]
            if (isNaN(newValue) || newValue < -18 || newValue > 18) {
                e.target.style.borderColor = 'red';

                if (errorMessage) {
                    errorMessage.remove();
                }

                errorMessage = document.createElement('small');
                errorMessage.id = errorMessageId;
                errorMessage.style.color = 'red';
                errorMessage.style.fontSize = '10px';
                errorMessage.style.position = 'relative';
                errorMessage.style.marginTop = '5px';
                errorMessage.style.left = '0';
                errorMessage.textContent = `Будь ласка, введіть коректне значення для ${isX ? 'X' : 'Y'} (від -18 до 18).`;
                e.target.parentNode.appendChild(errorMessage);

                // Скидаємо координату вершини на null, якщо вона недійсна
                if (isX) vertices[index].x = null;
                else vertices[index].y = null;

                drawCoordinateSystem(); // Очистити криву негайно
                return;
            }

            // Перевірте наявність дублікатів координат
            if (
                vertices.some((vertex, idx) => idx !== index &&
                    vertex.x === (isX ? newValue * cellSize + canvasWidth / 2 : vertices[index].x) &&
                    vertex.y === (isX ? vertices[index].y : canvasHeight / 2 - newValue * cellSize))
            ) {
                e.target.style.borderColor = 'red';

                if (errorMessage) {
                    errorMessage.remove();
                }

                errorMessage = document.createElement('small');
                errorMessage.id = errorMessageId;
                errorMessage.style.color = 'red';
                errorMessage.style.fontSize = '10px';
                errorMessage.style.position = 'relative';
                errorMessage.style.marginTop = '5px';

    
                drawCoordinateSystem();
                errorMessage.style.left = '0';
                errorMessage.textContent = `Координати вершини не можуть співпадати з іншими вершинами.`;
                e.target.parentNode.appendChild(errorMessage);
                return;
            }

            // Якщо дійсна, оновлення координат вершини
            e.target.style.borderColor = '';
            if (errorMessage) {
                errorMessage.remove();
            }
            if (isX) {
                vertices[index].x = newValue * cellSize + canvasWidth / 2;
            } else {
                vertices[index].y = canvasHeight / 2 - newValue * cellSize;
            }

            drawCoordinateSystem();
            const hasInvalidInputs = document.querySelectorAll('input[style*="border-color: red"]').length > 0;

            if (
                hasInvalidInputs ||
                vertices.some(v => v.x === null || v.y === null) ||
                vertices.length < 2
            ) {
                drawCoordinateSystem();
                return;
            }

            drawBezierCurve();

            ctx.fillStyle = '#0000ff';
            ctx.font = '12px Arial';
            vertices.forEach((vertex, index) => {
                ctx.beginPath();
                ctx.arc(vertex.x, vertex.y, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillText(index + 1, vertex.x + 5, vertex.y - 5);
            });
        });

        input.addEventListener('blur', (e) => {
            const newValue = parseFloat(e.target.value);
            const isX = e.target.classList.contains('vertex-x');
        
            if (
                e.target.value === '' || 
                isNaN(newValue) || 
                newValue < -18 || 
                newValue > 18 || 
                vertices.some((vertex, idx) => idx !== index &&
                    vertex.x === (isX ? newValue * cellSize + canvasWidth / 2 : vertices[index].x) &&
                    vertex.y === (isX ? vertices[index].y : canvasHeight / 2 - newValue * cellSize))
            ) {
                e.target.style.borderColor = 'red';
                if (e.target.value === '') {
                    if (isX) vertices[index].x = null;
                    else vertices[index].y = null;
                }
                drawCoordinateSystem(); // Очистити криву, якщо будь-яке поле порожнє або є помилка
                return;
            } else {
                e.target.style.borderColor = ''; // Скинути колір рамки
                if (isX) {
                    vertices[index].x = newValue * cellSize + canvasWidth / 2;
                } else {
                    vertices[index].y = canvasHeight / 2 - newValue * cellSize;
                }
            }

            // Перевірка на наявність помилок перед побудовою кривої
            if (
                vertices.some(v => v.x === null || v.y === null || v.x < 0 || v.x > canvasWidth || v.y < 0 || v.y > canvasHeight) ||
                vertices.length < 2
            ) {
                drawCoordinateSystem(); // Очистити криву, якщо є помилки
                return;
            }

            drawCoordinateSystem();

            // Малювання точок та міток для вершин
            ctx.fillStyle = '#0000ff'; 
            ctx.font = '12px Arial'; 
            vertices.forEach((vertex, index) => {
                ctx.beginPath();
                ctx.arc(vertex.x, vertex.y, 5, 0, 2 * Math.PI); 
                ctx.fill();
                ctx.fillText(index + 1, vertex.x + 5, vertex.y - 5); 
            });

            drawBezierCurve();
        });
    });

    drawCoordinateSystem();

    ctx.fillStyle = '#0000ff'; 
    ctx.font = '12px Arial'; 
    vertices.forEach((vertex, index) => {
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, 5, 0, 2 * Math.PI); 
        ctx.fill();
        ctx.fillText(index + 1, vertex.x + 5, vertex.y - 5); 
    });

    if (vertices.every(v => v.x !== null && v.y !== null) && vertices.length >= 2) {
        drawBezierCurve();
    }
}

// Перемикання між методами
document.querySelectorAll('input[name="method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        bezierMethod = e.target.value;
        drawCoordinateSystem();

        const hasInvalidInputs = document.querySelectorAll('input[style*="border-color: red"]').length > 0;
        if (
            hasInvalidInputs ||
            vertices.some(v => v.x === null || v.y === null) ||
            vertices.length < 2
        ) {
            return;
        }

        drawBezierCurve();

        // Перемалювання точок та міток для вершин
        ctx.fillStyle = '#0000ff'; 
        ctx.font = '12px Arial'; 
        vertices.forEach((vertex, index) => {
            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, 5, 0, 2 * Math.PI); 
            ctx.fill();
            ctx.fillText(index + 1, vertex.x + 5, vertex.y - 5); 
        });
    });
});

// Перемикання між вікнами
const editVerticesWindow = document.getElementById('editVerticesWindow');
const outputPointsWindow = document.getElementById('outputPointsWindow');
const bernsteinPolynomialsWindow = document.getElementById('bernsteinPolynomialsWindow');

document.getElementById('editVerticesBtn').addEventListener('click', () => {
    document.querySelectorAll('.nav-menu button').forEach(button => button.classList.remove('active-button'));
    document.getElementById('editVerticesBtn').classList.add('active-button');
    editVerticesWindow.classList.add('active');
    editVerticesWindow.classList.remove('hidden');
    outputPointsWindow.classList.remove('active');
    outputPointsWindow.classList.add('hidden');
    bernsteinPolynomialsWindow.classList.remove('active');
    bernsteinPolynomialsWindow.classList.add('hidden');
});

document.getElementById('outputPointsBtn').addEventListener('click', () => {
    document.querySelectorAll('.nav-menu button').forEach(button => button.classList.remove('active-button'));
    document.getElementById('outputPointsBtn').classList.add('active-button');
    editVerticesWindow.classList.remove('active');
    editVerticesWindow.classList.add('hidden');
    outputPointsWindow.classList.add('active');
    outputPointsWindow.classList.remove('hidden');
    bernsteinPolynomialsWindow.classList.remove('active');
    bernsteinPolynomialsWindow.classList.add('hidden');
});

document.getElementById('bernsteinPolynomialsBtn').addEventListener('click', () => {
    document.querySelectorAll('.nav-menu button').forEach(button => button.classList.remove('active-button'));
    document.getElementById('bernsteinPolynomialsBtn').classList.add('active-button');
    editVerticesWindow.classList.remove('active');
    editVerticesWindow.classList.add('hidden');
    outputPointsWindow.classList.remove('active');
    outputPointsWindow.classList.add('hidden');
    bernsteinPolynomialsWindow.classList.add('active');
    bernsteinPolynomialsWindow.classList.remove('hidden');
});

// Генерація точок на основі заданої кількості
document.getElementById('generatePointsBtn').addEventListener('click', () => {
    const numPointsInput = document.getElementById('numPoints').value;
    const numPoints = parseInt(numPointsInput, 10);

    if (vertices.length < 2) {
        alert('Крива не побудована. Будь ласка, додайте принаймні дві вершини для побудови кривої.');
        return;
    }

    if (isNaN(numPoints) || numPoints < 2) {
        alert('Будь ласка, введіть коректну кількість точок. Мінімальна кількість точок — 2.');
        return;
    }

    const pointsTable = document.getElementById('pointsTable');
    pointsTable.querySelector('tbody').innerHTML = ''; // Очистити попередні результати
    pointsTable.classList.remove('hidden'); // Показати таблицю з точками

    for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const point = bezierMethod === 'parametric'
            ? calculateParametricBezierPoint(t)
            : (() => {
                const transformedVertices = vertices.map(v => ({
                    x: (v.x - canvasWidth / 2) / cellSize,
                    y: (canvasHeight / 2 - v.y) / cellSize
                }));
                const recursivePoint = calculateRecursiveBezierPoint(transformedVertices, t);
                return {
                    x: recursivePoint.x * cellSize + canvasWidth / 2,
                    y: canvasHeight / 2 - recursivePoint.y * cellSize
                };
            })();

        const row = document.createElement('tr');
        row.innerHTML = `<td>${t.toFixed(2)}</td><td>${((point.x - canvasWidth / 2) / cellSize).toFixed(2)}</td><td>${((canvasHeight / 2 - point.y) / cellSize).toFixed(2)}</td>`;
        pointsTable.querySelector('tbody').appendChild(row);
    }
});

// Початкове малювання системи координат
drawCoordinateSystem();


