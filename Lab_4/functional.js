// --- Глобальні змінні ---
let originalImage = null;
let currentModel = 'RGB'; // «RGB» або «HSL» – позначає активний перемикач
let selection = null;
let isSelecting = false;
let startX = 0, startY = 0, endX = 0, endY = 0;

let imageDataOriginal = null;    // Вихідні дані зображення із завантаженого файлу (RGB)
let imageDataProcessed = null;   // Дані зображення після всіх циклів RGB->HSL->RGB (RGB)
let imageDataCurrent = null;     // Наразі активні дані зображення на полотні для інтерактивного редагування (RGB)
let conversionCycleCount = 0;  // Лічильник циклів RGB->HSL->RGB, які ДІЙСНО ВІДБУЛИСЯ (перехід RGB -> HSL)

let isAlgorithmModified = false;

// --- DOM елементи ---
const imageInput = document.getElementById('image-input');
const imagePlaceholder = document.getElementById('image-placeholder');
const imageCanvas = document.getElementById('image-canvas');
const ctx = imageCanvas.getContext('2d', { willReadFrequently: true });
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const colorSpaceRadios = document.querySelectorAll('input[name="color-space"]');

// Елементи лупи
const magnifier = document.getElementById('magnifier');
const magnifierCanvas = document.getElementById('magnifier-canvas');
const magnifierCtx = magnifierCanvas.getContext('2d');
const magnifierSize = 120;
const zoomFactor = 6;
magnifierCanvas.width = magnifierSize;
magnifierCanvas.height = magnifierSize;

// Елементи піксельної інформації
const pixelHoverInfo = document.getElementById('pixel-hover-info');
const pixelHoverPlaceholder = document.getElementById('pixel-hover-placeholder');
const pixelCoords = document.getElementById('pixel-coords');
const pixelRgbValue = document.getElementById('pixel-rgb-value');
const pixelRgbSwatch = document.getElementById('pixel-rgb-swatch');
const pixelHslValue = document.getElementById('pixel-hsl-value');
const pixelHslSwatch = document.getElementById('pixel-hsl-swatch');

// Елементи звіту про точність перетворення
const analysisDescriptionTitle = document.getElementById('analysis-description-title');
const accuracyVal = document.getElementById('accuracy-val');
const avgErrorVal = document.getElementById('avg-error-val');
const maxErrorVal = document.getElementById('max-error-val');
const maxErrorPixelCoords = document.getElementById('max-error-pixel-coords');
const maxErrOrigColor = document.getElementById('max-err-orig-color');
const maxErrOrigSwatch = document.getElementById('max-err-orig-swatch');
const maxErrConvColor = document.getElementById('max-err-conv-color');
const maxErrConvSwatch = document.getElementById('max-err-conv-swatch');
const minNzErrorVal = document.getElementById('min-nz-error-val');
const percChangedVal = document.getElementById('perc-changed-val');
const channelAvgErrorVal = document.getElementById('channel-avg-error-val');
const channelMaxErrorVal = document.getElementById('channel-max-error-val');
const conversionReportPlaceholder = document.getElementById('conversion-report-placeholder');
const maxErrConvLabel = document.querySelector('#max-err-conv-swatch')?.parentElement?.childNodes[0];


// Контроль насиченості
const rangeFromInput = document.getElementById('range-from');
const rangeToInput = document.getElementById('range-to');
const hueFromSlider = document.getElementById('hue-from-slider');
const hueToSlider = document.getElementById('hue-to-slider');
const hueFromValue = document.getElementById('hue-from-value');
const hueToValue = document.getElementById('hue-to-value');
const hueIndicatorFrom = document.getElementById('hue-range-indicator-from');
const hueIndicatorTo = document.getElementById('hue-range-indicator-to');

const saturationSlider = document.getElementById('saturation-slider');
const saturationValue = document.getElementById('saturation-value');

// Вкладка модифікації
const modifiedAlgorithmCheckbox = document.getElementById('modified-algorithm-checkbox');
const interactiveChangeOutput = document.getElementById('interactive-change-output');

const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');

// --- Ініціалізація ---
// Обробник кліку на placeholder для зображення: ініціює клік на прихований input[type="file"].
imagePlaceholder.addEventListener('click', () => imageInput.click());
// Обробник зміни стану input[type="file"]: викликає функцію завантаження зображення.
imageInput.addEventListener('change', handleImageUpload);

// Функція для обробки завантаження зображення.
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
        imageCanvas.width = img.width;
        imageCanvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        imageCanvas.style.display = 'block';
        imagePlaceholder.style.display = 'none';
        if (conversionReportPlaceholder) conversionReportPlaceholder.style.display = 'none';

        originalImage = img;
        imageDataOriginal = ctx.getImageData(0, 0, img.width, img.height);

        imageDataProcessed = new ImageData(
            new Uint8ClampedArray(imageDataOriginal.data),
            imageDataOriginal.width,
            imageDataOriginal.height
        );
        conversionCycleCount = 0;
        currentModel = 'RGB';

        document.querySelector('input[name="color-space"][value="RGB"]').checked = true;
        document.querySelector('input[name="color-space"][value="HSL"]').checked = false;

        applyAndDisplayProcessedImage();
        updateConversionAccuracyReport();
        updateInteractiveChangeReport();
        selection = null;
        isSelecting = false;
        drawSelection();
    };
    img.src = URL.createObjectURL(file);
}

// Функція для застосування оброблених даних зображення до канвасу та оновлення відображення.
function applyAndDisplayProcessedImage() {
    if (!imageDataProcessed) return;

    imageDataCurrent = new ImageData(
        new Uint8ClampedArray(imageDataProcessed.data),
        imageDataProcessed.width,
        imageDataProcessed.height
    );
    ctx.putImageData(imageDataCurrent, 0, 0);
    drawSelection();
    updateInteractiveChangeReport();
}

// Функція для обробки одного циклу конвертації RGB -> HSL -> RGB.
function processImageCycle() {
    if (!imageDataProcessed) return;

    const { width, height, data: currentProcessedData } = imageDataProcessed;
    const newProcessedDataArray = new Uint8ClampedArray(currentProcessedData.length);

    for (let i = 0; i < currentProcessedData.length; i += 4) {
        let [h, s, l] = rgbToHsl(currentProcessedData[i], currentProcessedData[i + 1], currentProcessedData[i + 2]);

        h = parseFloat(h.toFixed(3));
        s = parseFloat(s.toFixed(3));
        l = parseFloat(l.toFixed(3));

        let rgbResult;
        if (isAlgorithmModified) {
            rgbResult = hslToRgb_modified(h, s, l);
        } else {
            rgbResult = hslToRgb(h, s, l);
        }
        newProcessedDataArray[i] = rgbResult[0];
        newProcessedDataArray[i + 1] = rgbResult[1];
        newProcessedDataArray[i + 2] = rgbResult[2];
        newProcessedDataArray[i + 3] = currentProcessedData[i + 3]; // Alpha
    }
    imageDataProcessed = new ImageData(newProcessedDataArray, width, height);
    conversionCycleCount++;
}

// Обробник кліків на кнопки вкладок: перемикає активну вкладку та відповідну панель.
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const tabPanelId = btn.dataset.tab;
        const tabPanelToShow = document.getElementById(tabPanelId);
        if (tabPanelToShow) {
            tabPanelToShow.classList.add('active');
        }
    });
});

// Обробник зміни стану радіокнопок вибору колірної моделі.
colorSpaceRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (!originalImage) return;

        const previousModel = currentModel;
        const newSelectedModel = radio.value;

        currentModel = newSelectedModel;

        // Цикл конвертації відбувається тільки при переході з RGB на HSL.
        if (previousModel === 'RGB' && newSelectedModel === 'HSL') {
            processImageCycle();
        }

        applyAndDisplayProcessedImage();
        updateConversionAccuracyReport();
    });
});

// Обробник зміни стану чекбоксу модифікованого алгоритму.
modifiedAlgorithmCheckbox.addEventListener('change', () => {
    isAlgorithmModified = modifiedAlgorithmCheckbox.checked;

    if (originalImage) { // Оновлювати звіт, тільки якщо є зображення
        updateConversionAccuracyReport();
    }
});

// Функція конвертації кольору з RGB в HSL.
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0; // ахроматичний 
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

// Функція конвертації кольору з HSL в RGB (стандартний алгоритм).
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // ахроматичний
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Функція конвертації кольору з HSL в RGB (модифікований алгоритм).
// Збільшує насиченість для червоних відтінків та зменшує для синіх.
function hslToRgb_modified(h, s, l) {
    let newS = s;

    if ((h >= 0 && h < 30/360) || (h >= 330/360 && h <= 1)) {
        newS = Math.min(1, s * 1.2);
    }
    else if (h >= 200/360 && h < 260/360) {
        newS = s * 0.8;
    }
    return hslToRgb(h, newS, l); 
}

imageCanvas.addEventListener('mousemove', handleCanvasMouseMove);
imageCanvas.addEventListener('mouseleave', handleCanvasMouseLeave);

// Функція, що викликається при русі миші над канвасом.
function handleCanvasMouseMove(e) {
    if (!originalImage || !imageDataCurrent) return;

    const rect = imageCanvas.getBoundingClientRect();
    const scaleX = imageCanvas.width / rect.width;
    const scaleY = imageCanvas.height / rect.height;
    const canvasX = Math.floor((e.clientX - rect.left) * scaleX);
    const canvasY = Math.floor((e.clientY - rect.top) * scaleY);

    if (canvasX < 0 || canvasX >= imageCanvas.width || canvasY < 0 || canvasY >= imageCanvas.height) {
        handleCanvasMouseLeave();
        return;
    }

    magnifier.style.display = 'block';
    const magnifierOffsetX = 15;
    const magnifierOffsetY = -magnifierSize / 2;

    let magnierLeft = e.clientX + magnifierOffsetX;
    let magnierTop = e.clientY + magnifierOffsetY;

    const bodyRect = document.body.getBoundingClientRect();
    if (magnierLeft + magnifierSize > bodyRect.right) {
        magnierLeft = e.clientX - magnifierSize - magnifierOffsetX;
    }
    if (magnierTop + magnifierSize > bodyRect.bottom) {
        magnierTop = bodyRect.bottom - magnifierSize - 5;
    }
    if (magnierTop < bodyRect.top) {
        magnierTop = bodyRect.top + 5;
    }
     if (magnierLeft < bodyRect.left) {
        magnierLeft = bodyRect.left + 5;
    }

    magnifier.style.left = `${magnierLeft}px`;
    magnifier.style.top = `${magnierTop}px`;

    magnifierCtx.fillStyle = 'white';
    magnifierCtx.fillRect(0, 0, magnifierSize, magnifierSize);

    const sourceWidth = magnifierSize / zoomFactor;
    const sourceHeight = magnifierSize / zoomFactor;
    const sourceX = canvasX - Math.floor(sourceWidth / 2);
    const sourceY = canvasY - Math.floor(sourceHeight / 2);

    magnifierCtx.imageSmoothingEnabled = false;
    magnifierCtx.drawImage(
        imageCanvas,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, magnifierSize, magnifierSize
    );
    magnifierCtx.strokeStyle = '#ff000080';
    magnifierCtx.lineWidth = 1;
    magnifierCtx.beginPath();
    magnifierCtx.moveTo(magnifierSize / 2, 0);
    magnifierCtx.lineTo(magnifierSize / 2, magnifierSize);
    magnifierCtx.moveTo(0, magnifierSize / 2);
    magnifierCtx.lineTo(magnifierSize, magnifierSize / 2);
    magnifierCtx.stroke();

    pixelHoverInfo.style.display = 'block';
    pixelHoverPlaceholder.style.display = 'none';
    pixelCoords.textContent = `X: ${canvasX}, Y: ${canvasY}`;

    const pixelIndex = (canvasY * imageDataCurrent.width + canvasX) * 4;
    const r = imageDataCurrent.data[pixelIndex];
    const g = imageDataCurrent.data[pixelIndex + 1];
    const b = imageDataCurrent.data[pixelIndex + 2];

    pixelRgbValue.textContent = `${r}, ${g}, ${b}`;
    pixelRgbSwatch.style.backgroundColor = `rgb(${r},${g},${b})`;

    const [h, s, l] = rgbToHsl(r, g, b);
    pixelHslValue.textContent = `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
    const [swatchR, swatchG, swatchB] = hslToRgb(h,s,l);
    pixelHslSwatch.style.backgroundColor = `rgb(${swatchR},${swatchG},${swatchB})`;
}

// Функція, що викликається, коли курсор миші залишає канвас.
function handleCanvasMouseLeave() {
    magnifier.style.display = 'none';
    if (pixelHoverInfo) pixelHoverInfo.style.display = 'none';
    if (pixelHoverPlaceholder) pixelHoverPlaceholder.style.display = 'block';
}

// Функція для оновлення звіту про точність конвертації кольорів.
function updateConversionAccuracyReport() {
    if (!imageDataOriginal || !imageDataProcessed) {
        if (conversionReportPlaceholder) conversionReportPlaceholder.style.display = 'block';
        if (analysisDescriptionTitle) analysisDescriptionTitle.textContent = 'Завантажте зображення для аналізу.';
        accuracyVal.textContent = '-';
        avgErrorVal.textContent = '-';
        maxErrorVal.textContent = '-';
        maxErrorPixelCoords.textContent = '-';
        maxErrOrigColor.textContent = '-';
        maxErrOrigSwatch.style.backgroundColor = 'transparent';
        maxErrConvColor.textContent = '-';
        maxErrConvSwatch.style.backgroundColor = 'transparent';
        minNzErrorVal.textContent = '-';
        percChangedVal.textContent = '-';
        channelAvgErrorVal.textContent = '-';
        channelMaxErrorVal.textContent = '-';
        if(maxErrConvLabel) maxErrConvLabel.textContent = "Після перетворень:";
        return;
    }

    if (conversionReportPlaceholder) conversionReportPlaceholder.style.display = 'none';

    const dataToCompare = imageDataProcessed.data;
    let comparisonText = "Порівняння: Оригінал з поточним зображенням";

    // Додаємо інформацію про модифікований алгоритм, якщо він був застосований
    // під час ОСТАННЬОГО фактичного перетворення RGB->HSL (тобто коли currentModel === 'HSL' і conversionCycleCount > 0)
    if (currentModel === 'HSL' && conversionCycleCount > 0 && isAlgorithmModified) {
        comparisonText += " (останнє перетворення RGB->HSL з модифікованим алгоритмом)";
    }

    if (analysisDescriptionTitle) analysisDescriptionTitle.textContent = comparisonText;
    if(maxErrConvLabel) maxErrConvLabel.textContent = "Поточний:";


    const constTolerance = 1; // Допустима похибка, при якій піксель вважається незмінним.
    const significantChangeThreshold = 15; // Поріг, вище якого зміна вважається суттєвою.

    let unchangedPixels = 0; // Кількість незмінних пікселів.
    let significantlyChangedPixels = 0; // Кількість суттєво змінених пікселів.
    let totalPixels = imageDataOriginal.width * imageDataOriginal.height; // Загальна кількість пікселів.

    let sumAbsError = 0; // Сума абсолютних помилок для всіх пікселів.
    let maxError = 0;    // Максимальна помилка для одного пікселя.
    let minNzError = Infinity; // Мінімальна ненульова помилка.

    let maxErrorPixel = { x: -1, y: -1, origR: 0, origG: 0, origB: 0, convR: 0, convG: 0, convB: 0 };

    let sumAbsErrorR = 0, sumAbsErrorG = 0, sumAbsErrorB = 0; // Суми абсолютних помилок по каналах.
    let maxAbsErrorR = 0, maxAbsErrorG = 0, maxAbsErrorB = 0; // Максимальні абсолютні помилки по каналах.

    const origData = imageDataOriginal.data;

    for (let i = 0; i < origData.length; i += 4) {
        const r1 = origData[i], g1 = origData[i+1], b1 = origData[i+2];
        const r2 = dataToCompare[i] !== undefined ? dataToCompare[i] : 0;
        const g2 = dataToCompare[i+1] !== undefined ? dataToCompare[i+1] : 0;
        const b2 = dataToCompare[i+2] !== undefined ? dataToCompare[i+2] : 0;

        const diffR = Math.abs(r1 - r2);
        const diffG = Math.abs(g1 - g2);
        const diffB = Math.abs(b1 - b2);
        const currentPixelError = diffR + diffG + diffB; // Сумарна помилка для поточного пікселя.

        sumAbsError += currentPixelError;
        sumAbsErrorR += diffR; sumAbsErrorG += diffG; sumAbsErrorB += diffB;

        if (diffR > maxAbsErrorR) maxAbsErrorR = diffR;
        if (diffG > maxAbsErrorG) maxAbsErrorG = diffG;
        if (diffB > maxAbsErrorB) maxAbsErrorB = diffB;

        if (currentPixelError <= constTolerance) {
            unchangedPixels++;
        } else {
            if (currentPixelError < minNzError) minNzError = currentPixelError;
            if (currentPixelError > significantChangeThreshold) {
                significantlyChangedPixels++;
            }
        }

        if (currentPixelError > maxError) {
            maxError = currentPixelError;
            const pixelIndexInRow = (i / 4) % imageDataOriginal.width;
            maxErrorPixel = {
                x: pixelIndexInRow,
                y: Math.floor((i / 4) / imageDataOriginal.width),
                origR: r1, origG: g1, origB: b1,
                convR: r2, convG: g2, convB: b2
            };
        }
    }

    accuracyVal.textContent = totalPixels > 0 ? ((unchangedPixels / totalPixels) * 100).toFixed(2) : '-';
    avgErrorVal.textContent = totalPixels > 0 ? (sumAbsError / totalPixels).toFixed(2) : '-';
    maxErrorVal.textContent = maxError.toFixed(2);

    if (maxErrorPixel.x !== -1) {
        maxErrorPixelCoords.textContent = `X:${maxErrorPixel.x}, Y:${maxErrorPixel.y}`;
        maxErrOrigColor.textContent = `${maxErrorPixel.origR},${maxErrorPixel.origG},${maxErrorPixel.origB}`;
        maxErrOrigSwatch.style.backgroundColor = `rgb(${maxErrorPixel.origR},${maxErrorPixel.origG},${maxErrorPixel.origB})`;
        maxErrConvColor.textContent = `${maxErrorPixel.convR},${maxErrorPixel.convG},${maxErrorPixel.convB}`;
        maxErrConvSwatch.style.backgroundColor = `rgb(${maxErrorPixel.convR},${maxErrorPixel.convG},${maxErrorPixel.convB})`;
    } else {
         maxErrorPixelCoords.textContent = '-'; maxErrOrigColor.textContent = '-'; maxErrConvColor.textContent = '-';
         maxErrOrigSwatch.style.backgroundColor = 'transparent'; maxErrConvSwatch.style.backgroundColor = 'transparent';
    }

    minNzErrorVal.textContent = (minNzError === Infinity || totalPixels === 0) ? (totalPixels === 0 ? '-' : '0') : minNzError.toFixed(2);
    percChangedVal.textContent = totalPixels > 0 ? ((significantlyChangedPixels / totalPixels) * 100).toFixed(2) : '-';

    channelAvgErrorVal.textContent = totalPixels > 0 ? `${(sumAbsErrorR / totalPixels).toFixed(2)}, ${(sumAbsErrorG / totalPixels).toFixed(2)}, ${(sumAbsErrorB / totalPixels).toFixed(2)}` : '-';
    channelMaxErrorVal.textContent = `${maxAbsErrorR}, ${maxAbsErrorG}, ${maxAbsErrorB}`;
}

// Функція для оновлення звіту про інтерактивні зміни (зміни насиченості у виділеній області).
function updateInteractiveChangeReport() {
    if (!originalImage || !imageDataCurrent || !imageDataProcessed) {
        interactiveChangeOutput.textContent = 'Завантажте зображення та взаємодійте з ним.';
        return;
    }
    const baseData = imageDataProcessed.data; // Дані зображення до інтерактивної зміни.
    const currentInteractiveData = imageDataCurrent.data; // Дані зображення після інтерактивної зміни.
    let diffPixels = 0; // Кількість змінених пікселів.
    let pixelsInSelection = 0; // Кількість пікселів у виділеній області.

    if (selection) { // Якщо є активне виділення.
        for (let y = selection.y; y < selection.y + selection.h; y++) {
            for (let x = selection.x; x < selection.x + selection.w; x++) {
                pixelsInSelection++;
                const idx = (y * imageDataProcessed.width + x) * 4;
                 if (baseData[idx] !== currentInteractiveData[idx] ||
                    baseData[idx+1] !== currentInteractiveData[idx+1] ||
                    baseData[idx+2] !== currentInteractiveData[idx+2]) {
                    diffPixels++;
                }
            }
        }
         if (diffPixels === 0 && pixelsInSelection > 0) {
            interactiveChangeOutput.textContent = 'Немає інтерактивних змін у виділеній області.';
        } else if (pixelsInSelection > 0) {
            interactiveChangeOutput.textContent = `Інтерактивно змінено пікселів у виділенні: ${diffPixels}`;
        } else { // Це може трапитись, якщо виділення було нульового розміру
            interactiveChangeOutput.textContent = 'Зображення не зазнало інтерактивних змін.';
        }

    } else { // Якщо виділення немає, порівнюємо все зображення.
        for (let i = 0; i < baseData.length; i += 4) {
            if (baseData[i] !== currentInteractiveData[i] ||
                baseData[i+1] !== currentInteractiveData[i+1] ||
                baseData[i+2] !== currentInteractiveData[i+2]) {
                diffPixels++;
            }
        }
        if (diffPixels === 0) {
            interactiveChangeOutput.textContent = 'Зображення не зазнало інтерактивних змін.';
        } else {
            interactiveChangeOutput.textContent = `Інтерактивно змінено пікселів на всьому зображенні: ${diffPixels}`;
        }
    }
}

// Обробник натискання кнопки миші на канвасі: починає процес виділення області.
imageCanvas.addEventListener('mousedown', (e) => {
    if (!originalImage || !imageDataProcessed) return;

    // Перед початком нового виділення, копіюємо дані з imageDataProcessed до imageDataCurrent.
    // Це гарантує, що інтерактивні зміни (насиченість) застосовуються до "чистої" версії після конвертації.
    imageDataCurrent = new ImageData(
        new Uint8ClampedArray(imageDataProcessed.data),
        imageDataProcessed.width,
        imageDataProcessed.height
    );
    ctx.putImageData(imageDataCurrent, 0, 0); // Відображаємо цю "чисту" версію.

    selection = null; // Скидаємо попереднє виділення.
    isSelecting = true;
    const rect = imageCanvas.getBoundingClientRect();
    const scaleX = imageCanvas.width / rect.width;
    const scaleY = imageCanvas.height / rect.height;
    startX = Math.floor((e.clientX - rect.left) * scaleX);
    startY = Math.floor((e.clientY - rect.top) * scaleY);
    endX = startX;
    endY = startY;
});

// Обробник руху миші на канвасі (коли кнопка миші натиснута): оновлює розмір виділеної області.
imageCanvas.addEventListener('mousemove', (e) => {
    if (!isSelecting || !imageDataCurrent) return;
    const rect = imageCanvas.getBoundingClientRect();
    const scaleX = imageCanvas.width / rect.width;
    const scaleY = imageCanvas.height / rect.height;
    endX = Math.floor((e.clientX - rect.left) * scaleX);
    endY = Math.floor((e.clientY - rect.top) * scaleY);

    ctx.putImageData(imageDataCurrent, 0, 0); // Перемальовуємо поточне зображення (без змін насиченості)
    drawSelectionRect(Math.min(startX, endX), Math.min(startY, endY), Math.abs(endX - startX), Math.abs(endY - startY));
});

// Обробник відпускання кнопки миші на канвасі: завершує процес виділення та застосовує зміни.
imageCanvas.addEventListener('mouseup', () => {
    if (!isSelecting || !imageDataCurrent) return;
    isSelecting = false;
    selection = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        w: Math.abs(endX - startX),
        h: Math.abs(endY - startY)
    };
    // Якщо виділення занадто мале, ігноруємо його.
    if (selection.w < 5 || selection.h < 5) {
        selection = null;
        ctx.putImageData(imageDataCurrent, 0, 0); // Відновлюємо зображення без рамки виділення
    } else {
        changeSaturationInSelection(); // Застосовуємо зміну насиченості до виділеної області
    }
});

// Обробник виходу курсора миші за межі канвасу (коли кнопка миші натиснута): завершує виділення.
imageCanvas.addEventListener('mouseleave', (e) => {
    if (isSelecting && imageDataCurrent) { // Якщо процес виділення активний
        isSelecting = false;
        selection = {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            w: Math.abs(endX - startX),
            h: Math.abs(endY - startY)
        };
        if (selection.w < 5 || selection.h < 5) {
            selection = null;
            ctx.putImageData(imageDataCurrent, 0, 0);
        } else {
            changeSaturationInSelection();
        }
    }
});

// Обробник кліку миші на тілі документа: скидає виділення, якщо клік був поза канвасом та сайдбаром.
document.body.addEventListener('mousedown', (e) => {
    // Перевіряємо, чи клік був не на канвасі і не всередині елемента з класом 'sidebar'.
    if (e.target !== imageCanvas && !e.target.closest('.sidebar') && selection && imageDataProcessed) {
        selection = null; // Скидаємо виділення.
        // Відновлюємо imageDataCurrent до стану imageDataProcessed (до інтерактивних змін).
        imageDataCurrent = new ImageData(
            new Uint8ClampedArray(imageDataProcessed.data),
            imageDataProcessed.width,
            imageDataProcessed.height
        );
        ctx.putImageData(imageDataCurrent, 0, 0); // Перемальовуємо канвас.
        updateInteractiveChangeReport(); // Оновлюємо звіт про зміни.
    }
});

// Функція для малювання прямокутника виділення.
function drawSelectionRect(x, y, w, h) {
    if (w > 0 && h > 0) {
        ctx.save();
        ctx.setLineDash([4, 2]); // Пунктирна лінія
        ctx.strokeStyle = '#ff4e4e'; // Яскравий колір для видимості
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }
}

// Функція для перемальовування канвасу та рамки виділення (якщо вона є).
function drawSelection() {
    if (!originalImage || !imageDataCurrent) return;
    ctx.putImageData(imageDataCurrent, 0, 0); // Спочатку малюємо поточне зображення
    if (selection && selection.w > 0 && selection.h > 0) { // Потім, якщо є виділення, малюємо його
        drawSelectionRect(selection.x, selection.y, selection.w, selection.h);
    }
}

// Функція для оновлення індикатора та текстового значення для слайдерів відтінків.
function updateHueIndicator(slider, indicator, valueDisplay) {
    const value = parseInt(slider.value);
    valueDisplay.textContent = `${value}`; // Оновлюємо текстове значення (наприклад, "30°")
    indicator.style.left = `${(value / 360) * 100}%`; // Позиціонуємо індикатор на спектрі

    // Оновлюємо значення відповідного прихованого input[type="number"]
    if (slider.id === 'hue-from-slider') {
        rangeFromInput.value = value;
    } else if (slider.id === 'hue-to-slider') {
        rangeToInput.value = value;
    }
}

// Обробник події input для слайдера "Відтінок ВІД".
hueFromSlider.addEventListener('input', () => {
    updateHueIndicator(hueFromSlider, hueIndicatorFrom, hueFromValue);
    // Якщо є виділення та завантажене оброблене зображення,
    // відновлюємо imageDataCurrent до imageDataProcessed і застосовуємо зміни насиченості.
    if (selection && originalImage && imageDataProcessed) {
        imageDataCurrent = new ImageData( new Uint8ClampedArray(imageDataProcessed.data), imageDataProcessed.width, imageDataProcessed.height);
        changeSaturationInSelection();
    }
});

// Обробник події input для слайдера "Відтінок ДО".
hueToSlider.addEventListener('input', () => {
    updateHueIndicator(hueToSlider, hueIndicatorTo, hueToValue);
    if (selection && originalImage && imageDataProcessed) {
        imageDataCurrent = new ImageData( new Uint8ClampedArray(imageDataProcessed.data), imageDataProcessed.width, imageDataProcessed.height);
        changeSaturationInSelection();
    }
});

// Обробник події input для слайдера насиченості.
saturationSlider.addEventListener('input', () => {
    saturationValue.textContent = `${saturationSlider.value}%`;
    if (selection && originalImage && imageDataProcessed) {
        imageDataCurrent = new ImageData( new Uint8ClampedArray(imageDataProcessed.data), imageDataProcessed.width, imageDataProcessed.height);
        changeSaturationInSelection();
    }
});

// Функція для зміни насиченості пікселів у виділеній області.
function changeSaturationInSelection() {
    if (!selection || !imageDataCurrent) return; // Потрібне активне виділення та поточні дані зображення.

    let fromHue = parseInt(rangeFromInput.value, 10); // Початковий відтінок з поля вводу.
    let toHue = parseInt(rangeToInput.value, 10);     // Кінцевий відтінок з поля вводу.
    let satMultiplier = parseInt(saturationSlider.value, 10) / 100; // Множник насиченості зі слайдера.

    let data = imageDataCurrent.data; // Працюємо з даними поточного зображення на канвасі.

    for (let y = selection.y; y < selection.y + selection.h; y++) {
        for (let x = selection.x; x < selection.x + selection.w; x++) {
            let idx = (y * imageDataCurrent.width + x) * 4; // Індекс червоного каналу пікселя.
            let rOrig = data[idx], gOrig = data[idx+1], bOrig = data[idx+2]; // Оригінальні RGB значення.

            let [h_norm, s_norm, l_norm] = rgbToHsl(rOrig, gOrig, bOrig); // Конвертуємо в HSL.
            let h_deg = h_norm * 360; // Відтінок в градусах (0-360).

            // Перевіряємо, чи поточний відтінок пікселя знаходиться у вибраному діапазоні.
            if (isHueInRange(h_deg, fromHue, toHue)) {
                let new_s = Math.max(0, Math.min(1, s_norm * satMultiplier)); // Розраховуємо нову насиченість.
                let [nr, ng, nb] = hslToRgb(h_norm, new_s, l_norm); // Конвертуємо назад в RGB.
                data[idx] = nr;
                data[idx+1] = ng;
                data[idx+2] = nb;
            }
        }
    }
    drawSelection(); // Перемальовуємо канвас з оновленими пікселями та рамкою виділення.
    updateInteractiveChangeReport(); // Оновлюємо звіт про кількість змінених пікселів.
}

// Функція для перевірки, чи знаходиться відтінок `hue` в діапазоні `from` до `to`.
// Враховує ситуацію, коли діапазон перетинає 0/360 градусів (наприклад, від 330 до 30).
function isHueInRange(hue, from, to) {
    if (from <= to) return hue >= from && hue <= to; // Нормальний діапазон (наприклад, 60-120).
    return hue >= from || hue <= to; // Діапазон, що перетинає 0/360 (наприклад, 330-30).
}

// Обробник кліку на кнопку "Зберегти зображення".
saveBtn.addEventListener('click', () => {
    if (!originalImage || !imageDataCurrent) return; // Потрібне зображення для збереження.
    const link = document.createElement('a');
    link.download = 'modified-image.png'; // Назва файлу за замовчуванням.
    // Важливо: перед збереженням, переконуємося, що на канвасі відображені саме imageDataCurrent,
    // але без рамки виділення. Рамка - це просто візуальний ефект.
    ctx.putImageData(imageDataCurrent, 0, 0); // Малюємо фінальне зображення на канвас.
    link.href = imageCanvas.toDataURL('image/png'); // Отримуємо дані зображення у форматі PNG.
    link.click(); // Ініціюємо завантаження.
    // Після збереження, якщо було виділення, малюємо його знову для візуальної послідовності.
    if (selection) {
      drawSelection();
    }
});

// Обробник кліку на кнопку "Скинути".
resetBtn.addEventListener('click', () => {
    // Скидаємо всі глобальні змінні, пов'язані із зображенням.
    originalImage = null;
    imageDataOriginal = null;
    imageDataProcessed = null;
    imageDataCurrent = null;
    selection = null;
    isSelecting = false;
    conversionCycleCount = 0;

    // Ховаємо канвас і показуємо placeholder.
    imageCanvas.style.display = 'none';
    imagePlaceholder.style.display = '';
    imageInput.value = ''; // Скидаємо значення поля вибору файлу.
    // Очищуємо канвас, якщо він мав розміри.
    if (imageCanvas.width > 0 && imageCanvas.height > 0) {
      ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    }

    // Скидаємо вибір колірної моделі на RGB.
    currentModel = 'RGB';
    document.querySelector('input[name="color-space"][value="RGB"]').checked = true;
    document.querySelector('input[name="color-space"][value="HSL"]').checked = false;

    // Скидаємо налаштування модифікованого алгоритму.
    isAlgorithmModified = false;
    modifiedAlgorithmCheckbox.checked = false;

    // Скидаємо слайдери діапазону відтінків до значень за замовчуванням.
    hueFromSlider.value = 0;
    hueToSlider.value = 30;
    updateHueIndicator(hueFromSlider, hueIndicatorFrom, hueFromValue);
    updateHueIndicator(hueToSlider, hueIndicatorTo, hueToValue);
    rangeFromInput.value = 0; // Також приховані поля
    rangeToInput.value = 30;

    // Скидаємо слайдер насиченості до значення за замовчуванням.
    saturationSlider.value = 100;
    saturationValue.textContent = '100%';

    // Оновлюємо звіти (вони покажуть, що дані відсутні).
    updateConversionAccuracyReport();
    updateInteractiveChangeReport();
    handleCanvasMouseLeave(); // Прибираємо лупу та інфо про піксель, якщо вони були активні.
});

// Початкове встановлення текстового значення для насиченості та індикаторів відтінків.
saturationValue.textContent = `${saturationSlider.value}%`;
updateHueIndicator(hueFromSlider, hueIndicatorFrom, hueFromValue);
updateHueIndicator(hueToSlider, hueIndicatorTo, hueToValue);

// Початкове оновлення звітів (покажуть, що зображення не завантажено).
updateConversionAccuracyReport();
updateInteractiveChangeReport();