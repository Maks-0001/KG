const canvas = document.getElementById('coordinateCanvas');
const ctx = canvas.getContext('2d');
const drawButton = document.getElementById('drawButton');
const errorOutput = document.getElementById('errorOutput');

canvas.width = 755; 
canvas.height = 755; 
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

const cellSize = 20;

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
        if (x !== 0) {
            ctx.fillText(
                x,
                Math.floor(canvasWidth / 2) + x * cellSize - 5,
                Math.floor(canvasHeight / 2) + 15
            );
        }
    }
    for (let y = -Math.floor(canvasHeight / 2 / cellSize); y <= Math.floor(canvasHeight / 2 / cellSize); y++) {
        if (y !== 0) {
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

// Функція для перевірки координат
function validateCoordinates(x, y) {
    const halfWidth = canvasWidth / (2 * cellSize);
    const halfHeight = canvasHeight / (2 * cellSize);
    return x >= -halfWidth && x <= halfWidth && y >= -halfHeight && y <= halfHeight;
}

// Функція для побудови квадрата
function drawSquare(topLeftX, topLeftY, bottomLeftX, bottomLeftY, color) {
    const vectorX = bottomLeftX - topLeftX;
    const vectorY = bottomLeftY - topLeftY;

    const bottomRightX = bottomLeftX - vectorY;
    const bottomRightY = bottomLeftY + vectorX;
    
    const topRightX = topLeftX - vectorY;
    const topRightY = topLeftY + vectorX;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 2 + topLeftX * cellSize, canvasHeight / 2 - topLeftY * cellSize);
    ctx.lineTo(canvasWidth / 2 + bottomLeftX * cellSize, canvasHeight / 2 - bottomLeftY * cellSize);
    ctx.lineTo(canvasWidth / 2 + bottomRightX * cellSize, canvasHeight / 2 - bottomRightY * cellSize);
    ctx.lineTo(canvasWidth / 2 + topRightX * cellSize, canvasHeight / 2 - topRightY * cellSize);
    ctx.closePath();
    ctx.fill();

    drawPoint(topLeftX, topLeftY, 'red');
    drawPoint(bottomLeftX, bottomLeftY, 'red');
    drawPoint(bottomRightX, bottomRightY, 'red');
    drawPoint(topRightX, topRightY, 'red');
}

// Функція для побудови кола
function drawCircle(centerX, centerY, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
        canvasWidth / 2 + centerX * cellSize,
        canvasHeight / 2 - centerY * cellSize,
        radius * cellSize,
        0,
        2 * Math.PI
    );
    ctx.fill();
}

// Функція для побудови точки
function drawPoint(x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
        canvasWidth / 2 + x * cellSize,
        canvasHeight / 2 - y * cellSize,
        3,
        0,
        2 * Math.PI
    );
    ctx.fill();
}
    
function validateCircleInBounds(centerX, centerY, radius) {
    const points = [
        { x: centerX + radius, y: centerY }, 
        { x: centerX - radius, y: centerY }, 
        { x: centerX, y: centerY + radius }, 
        { x: centerX, y: centerY - radius }  
    ];

    for (const point of points) {
        if (!validateCoordinates(point.x, point.y)) {
            errorOutput.textContent = `Коло виходить за межі координатної площини!
            Проблемна точка: (${Math.floor(point.x * 100) / 100}, ${point.y})`;
            return false;
        }
    }
    return true;
}

drawButton.addEventListener('click', () => {
    const topLeftX = document.getElementById('topLeftX').value;
    const topLeftY = document.getElementById('topLeftY').value;
    const bottomLeftX = document.getElementById('bottomLeftX').value;
    const bottomLeftY = document.getElementById('bottomLeftY').value;
    const squareColor = document.getElementById('squareColor').value;
    const circleColor = document.getElementById('circleColor').value;

    errorOutput.textContent = '';

    if (!topLeftX || !topLeftY || !bottomLeftX || !bottomLeftY) {
        errorOutput.textContent = 'Будь ласка, коректно заповніть усі поля!';
        return;
    }

    const topLeftXNum = parseInt(topLeftX, 10);
    const topLeftYNum = parseInt(topLeftY, 10);
    const bottomLeftXNum = parseInt(bottomLeftX, 10);
    const bottomLeftYNum = parseInt(bottomLeftY, 10);

    const squarePoints = [
        { x: topLeftXNum, y: topLeftYNum },
        { x: bottomLeftXNum, y: bottomLeftYNum },
        { x: bottomLeftXNum + (topLeftYNum - bottomLeftYNum), y: bottomLeftYNum - (topLeftXNum - bottomLeftXNum) },
        { x: topLeftXNum + (topLeftYNum - bottomLeftYNum), y: topLeftYNum - (topLeftXNum - bottomLeftXNum) },
    ];

    if (!validateCoordinates(squarePoints[0].x, squarePoints[0].y) || !validateCoordinates(squarePoints[1].x, squarePoints[1].y)) {
        errorOutput.textContent = 'Координати лівої сторони виходять за межі координатної площини!' +
                ' Будь ласка, введіть координати у межах від -18 до 18 для X та від -18 до 18 для Y.';
        return;
    }

    if(topLeftYNum <= bottomLeftYNum){
        if(bottomLeftYNum < 18) {
            errorOutput.textContent = "Верхня точка повинна бути вище за нижню! Значення Y" +
            " верхньої точки повинно бути більше за: " + bottomLeftYNum;
            return;
        } else {
            errorOutput.textContent = "Нижня точка повинна бути нище за верхню! Значення Y" +
            " нижньої точки повинно бути менше за: " + topLeftYNum;
            return;
        }
    }

    
    if((Math.abs(topLeftXNum - bottomLeftXNum)) >= (topLeftYNum - bottomLeftYNum)) {
        errorOutput.textContent = "Сторона не може бути нахилена більше 45 градусів за"+ 
        " абсолютним значенням відносно осі X! Різниця між координатами по X має бути" + 
        " менша за різницю по Y!";
        return;
    }

    if (!validateCoordinates(squarePoints[2].x, squarePoints[2].y) || 
        !validateCoordinates(squarePoints[3].x, squarePoints[3].y)) {
        errorOutput.textContent = 'Координати правої сторони виходять за межі координатної площини!';
        return;
    }


    const vectorX = bottomLeftXNum - topLeftXNum;
    const vectorY = bottomLeftYNum - topLeftYNum;
    const centerX = (topLeftXNum + bottomLeftXNum - vectorY) / 2;
    const centerY = (topLeftYNum + bottomLeftYNum + vectorX) / 2;
    const radius = Math.sqrt(vectorX * vectorX + vectorY * vectorY) / Math.sqrt(2);

    if (!validateCircleInBounds(centerX, centerY, radius)) {
        return;
    }

    drawPoint(topLeftXNum, topLeftYNum, 'red');
    drawPoint(bottomLeftXNum, bottomLeftYNum, 'red');
    drawCircle(centerX, centerY, radius, circleColor); 
    drawSquare(topLeftXNum, topLeftYNum, bottomLeftXNum, bottomLeftYNum, squareColor); 
});

drawCoordinateSystem();