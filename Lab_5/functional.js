class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  distanceTo(other) {
    return Math.sqrt(
      Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2)
    );
  }
}

class Coords {
  static MIN_UNIT_COUNT = 1;
  static MAX_UNIT_COUNT = 5000;

  constructor(_unitCount, _canvas) {
    this.unitCount = _unitCount;
    this.canvas = _canvas;
    this.ctx = this.canvas.getContext("2d");

    this.originX_world = 0; 
    this.originY_world = 0; 
    this.isPanning = false;
    this.lastMouseX_canvas = 0;
    this.lastMouseY_canvas = 0;

    this.canvas.addEventListener(
      "wheel",
      (event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();

        const mouseX_canvas = event.offsetX;
        const mouseY_canvas = event.offsetY;

        const boxBefore = this.GetCoordSystemProportions();
        const oldUnitLength = boxBefore.unitLength;

        if (oldUnitLength <= 0 || !isFinite(oldUnitLength)) return; 

        const worldMouseX_before = this.originX_world + (mouseX_canvas - this.canvas.width / 2) / oldUnitLength;
        const worldMouseY_before = this.originY_world - (mouseY_canvas - this.canvas.height / 2) / oldUnitLength;

        const delta = Math.sign(event.deltaY);
        let step = Math.max(1, Math.abs(this.unitCount) / 15);
        step = Math.max(1, Math.floor(step));

        if (delta < 0) {
          this.unitCount = Math.max(
            Coords.MIN_UNIT_COUNT,
            this.unitCount - step
          );
        } else {
          this.unitCount = Math.min(
            Coords.MAX_UNIT_COUNT,
            this.unitCount + step
          );
        }

        let newUnitLength;
        const xLength = this.canvas.width;
        const yLength = this.canvas.height;
        if (this.unitCount !== 0) {
            newUnitLength = Math.min(xLength, yLength) / (Math.abs(this.unitCount) * 2);
        } else {
            newUnitLength = Math.min(xLength, yLength) / (Coords.MIN_UNIT_COUNT * 2);
        }
        if (newUnitLength <= 0 || !isFinite(newUnitLength)) {
            newUnitLength = Math.min(xLength, yLength) / (Coords.MIN_UNIT_COUNT * 2); 
        }
        
        if (newUnitLength <= 0 || !isFinite(newUnitLength)) return; 

        this.originX_world = worldMouseX_before - (mouseX_canvas - this.canvas.width / 2) / newUnitLength;
        this.originY_world = worldMouseY_before + (mouseY_canvas - this.canvas.height / 2) / newUnitLength;

        Redraw(this);
      },
      { passive: false }
    );

    this.canvas.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        this.isPanning = true;
        this.lastMouseX_canvas = event.offsetX;
        this.lastMouseY_canvas = event.offsetY;
        this.canvas.style.cursor = "grabbing";
      }
    });

    this.canvas.addEventListener("mousemove", (event) => {
      if (!this.isPanning) return;

      const dx_canvas = event.offsetX - this.lastMouseX_canvas;
      const dy_canvas = event.offsetY - this.lastMouseY_canvas;

      const currentUnitLength = this.GetCoordSystemProportions().unitLength;

      if (currentUnitLength > 0 && isFinite(currentUnitLength)) {
        this.originX_world -= dx_canvas / currentUnitLength;
        this.originY_world += dy_canvas / currentUnitLength; 
      }

      this.lastMouseX_canvas = event.offsetX;
      this.lastMouseY_canvas = event.offsetY;
      Redraw(this);
    });

    this.canvas.addEventListener("mouseup", (event) => {
      if (event.button === 0) {
        this.isPanning = false;
        this.canvas.style.cursor = "grab";
      }
    });

    this.canvas.addEventListener("mouseleave", () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.style.cursor = "grab"; 
      }
    });
    this.canvas.style.cursor = "grab";
  }

  GetGridParameters() {
    const box = this.GetCoordSystemProportions();
    const pixelsPerUnit = box.unitLength;
    if (pixelsPerUnit <= 0 || isNaN(pixelsPerUnit)) {
        return { interval: 100, pixelStep: 50, precision: 0 };
    }

    const factors = [2, 2.5, 2];
    let currentNumericalInterval = 1;
    let factorIndex = 0;

    const minPixelStep = 40;
    const maxPixelStep = 100;

    while (currentNumericalInterval * pixelsPerUnit < minPixelStep && factorIndex < factors.length * 10) {
        currentNumericalInterval *= factors[factorIndex % factors.length];
        factorIndex++;
    }

    factorIndex = 0;
    const inverseFactors = [0.5, 0.4, 0.5];
    while (currentNumericalInterval * pixelsPerUnit > maxPixelStep && currentNumericalInterval > 0.0000001 && factorIndex < inverseFactors.length * 10) {
        let potentialNextInterval = currentNumericalInterval * inverseFactors[factorIndex % inverseFactors.length];
        if (potentialNextInterval * pixelsPerUnit < minPixelStep / 2 && currentNumericalInterval * pixelsPerUnit > minPixelStep) {
             break;
        }
        currentNumericalInterval = potentialNextInterval;
        factorIndex++;
    }

    currentNumericalInterval = parseFloat(currentNumericalInterval.toPrecision(6));

    let calculatedPrecision = 0;
    if (currentNumericalInterval < 1 && currentNumericalInterval > 0) {
        const s = currentNumericalInterval.toString();
        if (s.includes('.')) {
            let decimalPart = s.split('.')[1];
             calculatedPrecision = decimalPart.length;
        }
    }
    calculatedPrecision = Math.min(Math.max(0, calculatedPrecision), 6);

    return {
        interval: currentNumericalInterval,
        pixelStep: currentNumericalInterval * pixelsPerUnit,
        precision: calculatedPrecision
    };
  }

  DrawCoords() {
    const ctx = this.ctx;
    const fontSizeNumeration = 10;
    const fontSizeDirection = 12;

    const box = this.GetCoordSystemProportions(); 
     if (box.unitLength <= 0 || isNaN(box.unitLength)) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = "#FF0000";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Помилка масштабування", this.canvas.width / 2, this.canvas.height / 2);
        return;
    }
    const gridParams = this.GetGridParameters();
    const segmentLengthInPixels = gridParams.pixelStep;
    const numericalTickInterval = gridParams.interval;
    const currentPrecisionSetting = gridParams.precision;

    const DrawUnitsY = (isNumerate) => {
      const ticksUp = Math.floor((this.canvas.height - box.centerY) / segmentLengthInPixels);
      const ticksDown = Math.floor(box.centerY / segmentLengthInPixels);

      for (let i = -ticksDown; i <= ticksUp; i++) {
        if (i === 0 && isNumerate) {
             const numCheck = -i * numericalTickInterval;
             if (Math.abs(numCheck) > 1e-9) continue; 
        }
        let currentY = box.centerY + i * segmentLengthInPixels;
        ctx.moveTo(box.centerX - box.shtrichSize / 2, currentY);
        ctx.lineTo(box.centerX + box.shtrichSize / 2, currentY);
        if (isNumerate) {
          const num = -i * numericalTickInterval;
          ctx.fillStyle = "#495057";
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillText(
            num.toFixed(currentPrecisionSetting),
            box.centerX - box.shtrichSize / 2 - box.numberShift,
            currentY
          );
        }
      }
    };
    const DrawUnitsX = (isNumerate) => {
      const ticksRight = Math.floor((this.canvas.width - box.centerX) / segmentLengthInPixels);
      const ticksLeft = Math.floor(box.centerX / segmentLengthInPixels);

      for (let i = -ticksLeft; i <= ticksRight; i++) {
         if (i === 0 && isNumerate) {
            const numCheck = i * numericalTickInterval;
            if (Math.abs(numCheck) > 1e-9 && numericalTickInterval !== 0) continue;
         }
        let currentX = box.centerX + i * segmentLengthInPixels; 
        ctx.moveTo(currentX, box.centerY - box.shtrichSize / 2);
        ctx.lineTo(currentX, box.centerY + box.shtrichSize / 2);
        if (isNumerate) {
          const num = i * numericalTickInterval;
          ctx.fillStyle = "#495057";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
           if (Math.abs(num) > 1e-9 || (i === 0 && numericalTickInterval === 0) || (i === 0 && Math.abs(num) < 1e-9)) { 
            ctx.fillText(
              num.toFixed(currentPrecisionSetting),
              currentX,
              box.centerY + box.shtrichSize / 2 + box.numberShift
            );
          }
        }
      }
    };
    const DrawGrid = (gap) => {
        for (let i = 0; box.centerY + i * gap <= canvas.height; i++) { 
            ctx.moveTo(0, box.centerY + i * gap);
            ctx.lineTo(canvas.width, box.centerY + i * gap);
        }
        for (let i = 1; box.centerY - i * gap >= 0; i++) { 
            ctx.moveTo(0, box.centerY - i * gap);
            ctx.lineTo(canvas.width, box.centerY - i * gap);
        }
        for (let i = 0; box.centerX + i * gap <= canvas.width; i++) { 
            ctx.moveTo(box.centerX + i * gap, 0);
            ctx.lineTo(box.centerX + i * gap, canvas.height);
        }
        for (let i = 1; box.centerX - i * gap >= 0; i++) { 
            ctx.moveTo(box.centerX - i * gap, 0);
            ctx.lineTo(box.centerX - i * gap, canvas.height);
        }
    };

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.beginPath();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "#E9ECEF";
    DrawGrid(segmentLengthInPixels);
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#ADB5BD";
    ctx.moveTo(box.centerX, 0);
    ctx.lineTo(box.centerX, this.canvas.height);
    ctx.moveTo(0, box.centerY);
    ctx.lineTo(this.canvas.width, box.centerY);
    ctx.stroke();
    ctx.closePath();

    const arrowSize = 8;
    ctx.beginPath();
    ctx.fillStyle = "#343A40";
    if (box.centerX >=0 && box.centerX <= this.canvas.width){ 
        ctx.moveTo(box.centerX, 0);
        ctx.lineTo(box.centerX - arrowSize / 2, arrowSize);
        ctx.lineTo(box.centerX + arrowSize / 2, arrowSize);
        ctx.fill();
    }
    if (box.centerY >=0 && box.centerY <= this.canvas.height){ 
        ctx.moveTo(this.canvas.width, box.centerY);
        ctx.lineTo(this.canvas.width - arrowSize, box.centerY - arrowSize / 2);
        ctx.lineTo(this.canvas.width - arrowSize, box.centerY + arrowSize / 2);
        ctx.fill();
    }
    ctx.closePath();

    ctx.beginPath();
    ctx.font = `${fontSizeNumeration}px Arial`;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#ADB5BD";
    DrawUnitsY(true);
    DrawUnitsX(true);
    ctx.stroke();
    ctx.closePath();

    ctx.font = `italic ${fontSizeDirection}px Arial`;
    ctx.fillStyle = "#343A40";
    if (box.centerX >= -fontSizeDirection*2 && box.centerX <= this.canvas.width + fontSizeDirection*2) {
        let yLabelX = box.centerX + arrowSize;
        if (yLabelX > this.canvas.width - fontSizeDirection) yLabelX = this.canvas.width - fontSizeDirection; // Keep in bounds
        if (yLabelX < fontSizeDirection) yLabelX = fontSizeDirection; 
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Y", yLabelX, arrowSize / 2);
    }
    if (box.centerY >= -fontSizeDirection*2 && box.centerY <= this.canvas.height + fontSizeDirection*2) {
        let xLabelY = box.centerY - arrowSize;
        if (xLabelY < fontSizeDirection) xLabelY = fontSizeDirection; 
        if (xLabelY > this.canvas.height - fontSizeDirection) xLabelY = this.canvas.height - fontSizeDirection; // Keep in bounds
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText("X", this.canvas.width - arrowSize / 2, xLabelY);
    }
  }

  GetCoordSystemProportions() {
    const shtrichSize = Math.min(this.canvas.width, this.canvas.height) / 100;
    const numberShift = shtrichSize / 2;

    const xLength = this.canvas.width;
    const yLength = this.canvas.height;

    let unitLengthValue = 0;
    if (this.unitCount !== 0) {
        unitLengthValue = Math.min(xLength, yLength) / (Math.abs(this.unitCount) * 2);
    } else {
        unitLengthValue = Math.min(xLength, yLength) / (Coords.MIN_UNIT_COUNT * 2);
    }
    if (unitLengthValue <= 0 || !isFinite(unitLengthValue)) {
        unitLengthValue = Math.min(xLength, yLength) / (Coords.MIN_UNIT_COUNT * 2); 
    }

    const canvasCenterX_px = this.canvas.width / 2;
    const canvasCenterY_px = this.canvas.height / 2;

    const worldOriginX_onCanvas_px = canvasCenterX_px - this.originX_world * unitLengthValue;
    const worldOriginY_onCanvas_px = canvasCenterY_px + this.originY_world * unitLengthValue; // + because canvas Y is down, world Y is up

    return {
      shtrichSize,
      numberShift,
      centerX: worldOriginX_onCanvas_px, 
      centerY: worldOriginY_onCanvas_px, 
      xLength, 
      yLength, 
      unitLength: unitLengthValue,
      yUCount: this.unitCount === 0 ? Coords.MIN_UNIT_COUNT : (yLength / 2 / unitLengthValue),
      xUCount: this.unitCount === 0 ? Coords.MIN_UNIT_COUNT : (xLength / 2 / unitLengthValue),
    };
  }
}

class Triangle {
  constructor(v1, v2, v3) {
    this.v1 = v1;
    this.v2 = v2;
    this.v3 = v3;
  }

  get centroid() {
    const x = (this.v1.x + this.v2.x + this.v3.x) / 3;
    const y = (this.v1.y + this.v2.y + this.v3.y) / 3;
    return new Point(x, y);
  }

  get farthestVertexFromOrigin() {
    const origin = new Point(0, 0);
    const d1 = this.v1.distanceTo(origin);
    const d2 = this.v2.distanceTo(origin);
    const d3 = this.v3.distanceTo(origin);
    const max = Math.max(d1, d2, d3);

    if (max === d1) return this.v1;
    if (max === d2) return this.v2;
    return this.v3;
  }
}

const getEl = document.querySelector.bind(document);
const canvas = getEl("#myCanvas");

const startUnitCount = 2000;
const animationTime_ms = 3000;
const fps = 60;

const coordSystem = new Coords(startUnitCount, canvas);
let sampleTriangle;
let triangle;
let userScaleFactor = 1.5;
let userTravelDistance = 10;

let isActivated = false;
let isPaused = false;
let isWaiting = true;

window.addEventListener('resize', resizeCanvasAndRedraw, false);

function resizeCanvasAndRedraw() {
    const canvasContainer = getEl("#canvas-area");
    if (canvasContainer.clientWidth > 0 && canvasContainer.clientHeight > 0) {
        canvas.width = canvasContainer.clientWidth;
        canvas.height = canvasContainer.clientHeight;
        Redraw(coordSystem);
    }
}


window.onload = function () {
  setTimeout(() => {
      resizeCanvasAndRedraw();
      SetBoundaries();
      canvas.style.cursor = 'grab'; 

      const forms = [
        getEl("#triangle-config-form"),
        getEl("#movement-config-form"),
      ];
      const paramFields = forms
        .flatMap((form) => Array.from(form.querySelectorAll("input.text-edit")))
        .map((field) => ({
          field: field,
          errorId: `#${field.getAttribute("id")}-error`,
        }));

      paramFields.forEach(({ field, errorId }) => {
        field.addEventListener("input", (event) => {
          hideErrorMessage(event.target, errorId);
          checkInterval(event, errorId);
          if (field.getAttribute("id") === "scaleFactor" || field.getAttribute("id") === "travelDistance") {
             UpdateMovementParams();
          }
        });
      });

      const scaleFactorInput = getEl("#scaleFactor");
      if (scaleFactorInput) {
        scaleFactorInput.value = userScaleFactor;
      }
      const travelDistanceInput = getEl("#travelDistance");
      if (travelDistanceInput) {
          travelDistanceInput.value = userTravelDistance;
      }
  }, 0);
};

function SetBoundaries() {
  const triangleForm = getEl("#triangle-config-form");
  const movementForm = getEl("#movement-config-form");

  const v1x = triangleForm["v1x"];
  const v1y = triangleForm["v1y"];
  const v2x = triangleForm["v2x"];
  const v2y = triangleForm["v2y"];
  const v3x = triangleForm["v3x"];
  const v3y = triangleForm["v3y"];

  const scaleFactorInput = movementForm["scaleFactor"];
  const travelDistanceInput = movementForm["travelDistance"];

  const maxCoord = Coords.MAX_UNIT_COUNT;
  const minCoord = -Coords.MAX_UNIT_COUNT;

  [v1x, v1y, v2x, v2y, v3x, v3y].forEach(input => {
    if (input) {
        input.min = minCoord;
        input.max = maxCoord;
        input.step = "any";
    }
  });

  if (scaleFactorInput) {
    scaleFactorInput.min = 0.1;
    scaleFactorInput.max = 10;
    scaleFactorInput.step = "0.01"; 
  }
  if (travelDistanceInput) {
    travelDistanceInput.min = -Coords.MAX_UNIT_COUNT * 2;
    travelDistanceInput.max = Coords.MAX_UNIT_COUNT * 2;
    travelDistanceInput.step = "any";
  }
}

function ValidateForm(form) {
  if (!form) {
    console.error(`Форма не знайдена.`);
    return false;
  }

  const paramFields = Array.from(form.querySelectorAll("input.text-edit"));
  let isValid = true;

  paramFields.forEach((f) => {
    const errorId = `#${f.getAttribute("id")}-error`;
    hideErrorMessage(f, errorId);
    if (!f.value.trim()) {
      f.classList.add("error-border");
      showErrorMessage(`Це поле має бути заповнене`, errorId);
      isValid = false;
    } else {
        const value = parseFloat(f.value);
        const min = parseFloat(f.min);
        const max = parseFloat(f.max);
        if (isNaN(value) || value > max || value < min) {
            f.classList.add("error-border");
            const message = `${f.value} поза діапазоном [${min}, ${max}]`;
            showErrorMessage(message, errorId);
            isValid = false;
        } else {
            f.classList.remove("error-border");
        }
    }
  });
  return isValid;
}

function checkInterval(event, errorId) {
  const inputField = event.target;
  const valueStr = inputField.value.trim();

  inputField.classList.remove("error-border");
  hideErrorMessage(inputField, errorId);


  if (valueStr === "") {
      return;
  }

  const value = parseFloat(valueStr);
  const min = parseFloat(inputField.min);
  const max = parseFloat(inputField.max);

  if (isNaN(value) || value < min || value > max) {
    showErrorMessage(`${valueStr} поза діапазоном [${min}, ${max}]`, errorId);
    inputField.classList.add("error-border");
  } else {
    inputField.classList.remove("error-border");
  }
}

function hideErrorMessage(fieldElement, errorId) {
  let errorElement = getEl(errorId);
  if (errorElement) {
    errorElement.textContent = "";
  }
  if (fieldElement && typeof fieldElement.classList !== 'undefined') {
    fieldElement.classList.remove("error-border");
  } else if (typeof fieldElement === 'string') { 
      const el = getEl(fieldElement);
      if (el) el.classList.remove("error-border");
  }


  const panelName = getEl(".panel-main-title");
  let hasErrors = false;
  document.querySelectorAll('.error-message').forEach(el => {
      if (el.textContent.trim() !== '') {
          hasErrors = true;
      }
  });
   document.querySelectorAll('input.text-edit.error-border').forEach(_ => { // Removed el as it's not used
      hasErrors = true;
  });

  if (!hasErrors && panelName) {
    panelName.classList.remove("with-error");
  }
}


function showErrorMessage(message, where) {
  let errorElement = getEl(where);
  if (errorElement) errorElement.textContent = message;

  const fieldId = where.replace("-error", "").replace("#","");
  const fieldElement = getEl(`#${fieldId}`);
  if(fieldElement) fieldElement.classList.add("error-border");


  if (message.length > 0 && (where.includes("-config-error") || where.includes("movement-config-error"))) {
    const panelName = getEl(".panel-main-title");
    if (panelName) panelName.classList.add("with-error");
  }
}

async function UpdateMovementParams() {
  const movementForm = getEl("#movement-config-form");
  if (!movementForm) return false;

  let scaleFactorIsValid = true;
  let travelDistanceIsValid = true;

  const scaleFactorInput = movementForm["scaleFactor"];
  const travelDistanceInput = movementForm["travelDistance"];

  if (scaleFactorInput) {
      const sfErrorId = `#${scaleFactorInput.id}-error`;
      hideErrorMessage(scaleFactorInput, sfErrorId);
      if (!scaleFactorInput.value.trim()){
          showErrorMessage(`Це поле має бути заповнене`, sfErrorId);
          scaleFactorInput.classList.add("error-border");
          scaleFactorIsValid = false;
      } else {
          const sfVal = parseFloat(scaleFactorInput.value);
          const sfMin = parseFloat(scaleFactorInput.min);
          const sfMax = parseFloat(scaleFactorInput.max);
          if (isNaN(sfVal) || sfVal < sfMin || sfVal > sfMax) {
              showErrorMessage(`${scaleFactorInput.value} поза діапазоном [${sfMin}, ${sfMax}]`, sfErrorId);
              scaleFactorInput.classList.add("error-border");
              scaleFactorIsValid = false;
          } else {
              scaleFactorInput.classList.remove("error-border");
          }
      }
  } else { scaleFactorIsValid = false; }

  if (travelDistanceInput) {
      const tdErrorId = `#${travelDistanceInput.id}-error`;
      hideErrorMessage(travelDistanceInput, tdErrorId);
      if (!travelDistanceInput.value.trim()){
          showErrorMessage(`Це поле має бути заповнене`, tdErrorId);
          travelDistanceInput.classList.add("error-border");
          travelDistanceIsValid = false;
      } else {
          const tdVal = parseFloat(travelDistanceInput.value);
          const tdMin = parseFloat(travelDistanceInput.min);
          const tdMax = parseFloat(travelDistanceInput.max);
          if (isNaN(tdVal) || tdVal < tdMin || tdVal > tdMax) {
              showErrorMessage(`${travelDistanceInput.value} поза діапазоном [${tdMin}, ${tdMax}]`, tdErrorId);
              travelDistanceInput.classList.add("error-border");
              travelDistanceIsValid = false;
          } else {
              travelDistanceInput.classList.remove("error-border");
          }
      }
  } else { travelDistanceIsValid = false; }


  if (!scaleFactorIsValid || !travelDistanceIsValid) {
      showErrorMessage("Перевірте параметри руху та масштабування.", "#movement-config-error");
      return false;
  }

  hideErrorMessage(null, "#movement-config-error");

  if(scaleFactorInput) userScaleFactor = parseFloat(scaleFactorInput.value);
  if(travelDistanceInput) userTravelDistance = parseFloat(travelDistanceInput.value);

  isPaused = true;
  while (!isWaiting && isActivated) await sleep(10);

  isPaused = false;
  return true;
}

function ToCanvas(point, coords) {
  const box = coords.GetCoordSystemProportions(); 
   if (box.unitLength <= 0 || !isFinite(box.unitLength)) {
        return new Point(coords.canvas.width / 2, coords.canvas.height / 2);
    }
  return new Point(
    box.centerX + point.x * box.unitLength,    
    box.centerY - point.y * box.unitLength    
  );
}

function ClearCanvas(canvasToClear) {
  const Ctx = canvasToClear.getContext("2d");
  Ctx.clearRect(0, 0, canvasToClear.width, canvasToClear.height);
}

function Redraw(coords) {
  if (!coords || !coords.canvas) return;
  ClearCanvas(coords.canvas);
  coords.DrawCoords();
  DrawLineYX(coords);
  if (triangle) DrawTriangle(coords, triangle);
}

function DrawTriangle(coords, triangleToDraw) {
  const ctx = coords.ctx;
  const v1_canvas = ToCanvas(triangleToDraw.v1, coords);
  const v2_canvas = ToCanvas(triangleToDraw.v2, coords);
  const v3_canvas = ToCanvas(triangleToDraw.v3, coords);

  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || "#007AFF";
  ctx.fillStyle = "rgba(0, 123, 255, 0.1)";
  ctx.moveTo(v1_canvas.x, v1_canvas.y);
  ctx.lineTo(v2_canvas.x, v2_canvas.y);
  ctx.lineTo(v3_canvas.x, v3_canvas.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function DrawLineYX(coords) {
  const ctx = coords.ctx;
  const box = coords.GetCoordSystemProportions();
  if (box.unitLength <= 0 || !isFinite(box.unitLength)) return;

  const canvasWidthInUnits = coords.canvas.width / box.unitLength;
  const canvasHeightInUnits = coords.canvas.height / box.unitLength;

  const worldViewMinX = coords.originX_world - canvasWidthInUnits / 2;
  const worldViewMaxX = coords.originX_world + canvasWidthInUnits / 2;
  const worldViewMinY = coords.originY_world - canvasHeightInUnits / 2;
  const worldViewMaxY = coords.originY_world + canvasHeightInUnits / 2;

  const lineMin = Math.max(worldViewMinX, worldViewMinY);
  const lineMax = Math.min(worldViewMaxX, worldViewMaxY);
  
  const margin = Math.max(canvasWidthInUnits, canvasHeightInUnits) * 0.1;

  const p1_math = new Point(lineMin - margin, lineMin - margin);
  const p2_math = new Point(lineMax + margin, lineMax + margin);


  const p1_canvas = ToCanvas(p1_math, coords);
  const p2_canvas = ToCanvas(p2_math, coords);

  ctx.beginPath();
  ctx.strokeStyle = "#DC3545";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.moveTo(p1_canvas.x, p1_canvas.y);
  ctx.lineTo(p2_canvas.x, p2_canvas.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.closePath();
}


async function CreateTriangleBut() {
  isActivated = false;
  isPaused = true;
  isWaiting = true;

  const triangleForm = getEl("#triangle-config-form");
  if (!ValidateForm(triangleForm)) {
    showErrorMessage("Перевірте правильність введених координат.", "#triangle-config-error");
    return;
  }
  hideErrorMessage(null, "#triangle-config-error");

  const v1x = parseFloat(triangleForm["v1x"].value);
  const v1y = parseFloat(triangleForm["v1y"].value);
  const v2x = parseFloat(triangleForm["v2x"].value);
  const v2y = parseFloat(triangleForm["v2y"].value);
  const v3x = parseFloat(triangleForm["v3x"].value);
  const v3y = parseFloat(triangleForm["v3y"].value);

  const p1 = new Point(v1x, v1y);
  const p2 = new Point(v2x, v2y);
  const p3 = new Point(v3x, v3y);

  const checkCollinear = (p1.y - p2.y) * (p2.x - p3.x) - (p2.y - p3.y) * (p1.x - p2.x);
  if (Math.abs(checkCollinear) < 1e-9) {
      showErrorMessage("Вершини трикутника лежать на одній прямій або збігаються.", "#triangle-config-error");
      return;
  }
   hideErrorMessage(null, "#triangle-config-error");

  sampleTriangle = new Triangle(p1, p2, p3);
  triangle = new Triangle(new Point(p1.x, p1.y), new Point(p2.x, p2.y), new Point(p3.x, p3.y));

  const paramsUpdated = await UpdateMovementParams();
  if (!paramsUpdated) {
        const scaleFactorInput = getEl("#scaleFactor");
        if(scaleFactorInput) {
            userScaleFactor = parseFloat(scaleFactorInput.value) || 1.5;
            if(isNaN(userScaleFactor)) userScaleFactor = 1.5;
            scaleFactorInput.value = userScaleFactor;
        }

        const travelDistanceInput = getEl("#travelDistance");
        if(travelDistanceInput){
            userTravelDistance = parseFloat(travelDistanceInput.value) || 10;
            if(isNaN(userTravelDistance)) userTravelDistance = 10;
            travelDistanceInput.value = userTravelDistance;
        }

        hideErrorMessage(null, "#movement-config-error");
        const movementForm = getEl("#movement-config-form");
        if (movementForm) {
            Array.from(movementForm.querySelectorAll("input.text-edit")).forEach(input => {
               hideErrorMessage(input, `#${input.id}-error`);
           });
        }
  }

  Redraw(coordSystem);
  isPaused = false;
}

async function SaveMatrixBut() {
  if (!sampleTriangle) {
    alert("Спочатку створіть фігуру.");
    return;
  }

  const paramsValid = await UpdateMovementParams();
  if (!paramsValid) {
    alert("Введіть коректні параметри руху та масштабування перед збереженням матриці.");
    return;
  }

  const scaleK = userScaleFactor;
  const displacement = userTravelDistance;

  const centroid = sampleTriangle.centroid;
  const dx_translate = displacement * Math.cos(Math.PI / 4);
  const dy_translate = displacement * Math.sin(Math.PI / 4);

  let M = shift(-centroid.x, -centroid.y);
  M = MultiplyMatrixes(M, scale(scaleK, scaleK));
  M = MultiplyMatrixes(M, shift(centroid.x, centroid.y));
  M = MultiplyMatrixes(M, shift(dx_translate, dy_translate));

  downloadMatrix(M, "transformation_matrix.txt");
}

function SaveFigureBut() {
  if (!sampleTriangle) {
    alert("Спочатку створіть фігуру.");
    return;
  }

  const tempCanvas = document.createElement("canvas");
  const qualityMultiplier = 2;
  const baseWidth = Math.max(canvas.width, 400);
  const baseHeight = Math.max(canvas.height, 300);
  tempCanvas.width = baseWidth * qualityMultiplier;
  tempCanvas.height = baseHeight * qualityMultiplier;

  const farthest = sampleTriangle.farthestVertexFromOrigin;
  let maxAbsCoord = 5;
  if (farthest) {
    maxAbsCoord = Math.max(Math.abs(farthest.x), Math.abs(farthest.y), 5);
  }

  const tempUnitCount = maxAbsCoord * 1.5 * 2; 

  const tempCoords = new Coords(tempUnitCount, tempCanvas);

  tempCoords.DrawCoords();
  DrawTriangle(tempCoords, sampleTriangle);

  const link = document.createElement("a");
  link.download = "initial_figure.png";
  link.href = tempCanvas.toDataURL("image/png");
  link.click();
}

async function StartMotion() {
    if (!triangle || !sampleTriangle) {
        await CreateTriangleBut();
        if (!triangle || !sampleTriangle) {
             alert("Не вдалося створити трикутник. Перевірте параметри.");
            return;
        }
    }

    const triangleForm = getEl("#triangle-config-form");
    if (triangleForm && !ValidateForm(triangleForm)) {
        showErrorMessage("Перевірте параметри трикутника.", "#triangle-config-error");
        alert("Перевірте правильність введених параметрів трикутника.");
        return;
    } else if (triangleForm) {
        hideErrorMessage(null, "#triangle-config-error");
    }

    const movementParamsValid = await UpdateMovementParams();
    if (!movementParamsValid) {
        alert("Перевірте правильність параметрів руху та масштабування.");
        return;
    }

    if (isActivated && !isPaused) return;
    if (isPaused) {
        isPaused = false;
        isWaiting = false;
        return;
    }
    isActivated = true;
    isPaused = false;
    isWaiting = false;

    const originalTriangle = new Triangle(
        new Point(sampleTriangle.v1.x, sampleTriangle.v1.y),
        new Point(sampleTriangle.v2.x, sampleTriangle.v2.y),
        new Point(sampleTriangle.v3.x, sampleTriangle.v3.y)
    );

    let currentScalePhase = 1;    
    const totalFrames = (animationTime_ms / 1000) * fps;
    const deltaProgress = totalFrames > 0 ? 1 / totalFrames : 1;
    let progress = 0;

    while(isActivated) {
        progress += deltaProgress;
        if (progress > 1) progress = 1;

        while (isPaused) {
            isWaiting = true;
            await sleep(100);
            if (!isActivated) break;
        }
        if (!isActivated) break;
        isWaiting = false;

        const centroidOriginal = originalTriangle.centroid;
        let effectiveScale;
        let displacementFactor;

        if (currentScalePhase === 1) {
            effectiveScale = 1 + (userScaleFactor - 1) * progress;
            displacementFactor = progress;
        } else {
            effectiveScale = userScaleFactor + (1 - userScaleFactor) * progress;
            displacementFactor = (1 - progress);
        }

        const currentPathDisplacement = userTravelDistance * displacementFactor;
        const dx = currentPathDisplacement * Math.cos(Math.PI / 4);
        const dy = currentPathDisplacement * Math.sin(Math.PI / 4);

        const originalCoordsMatrix = [
            [originalTriangle.v1.x, originalTriangle.v1.y, 1],
            [originalTriangle.v2.x, originalTriangle.v2.y, 1],
            [originalTriangle.v3.x, originalTriangle.v3.y, 1],
        ];

        let finalTransformForFrame = shift(-centroidOriginal.x, -centroidOriginal.y);
        finalTransformForFrame = MultiplyMatrixes(finalTransformForFrame, scale(effectiveScale, effectiveScale));
        finalTransformForFrame = MultiplyMatrixes(finalTransformForFrame, shift(centroidOriginal.x, centroidOriginal.y));
        finalTransformForFrame = MultiplyMatrixes(finalTransformForFrame, shift(dx, dy));

        let transformedMatrix = MultiplyMatrixes(originalCoordsMatrix, finalTransformForFrame);

        triangle.v1 = new Point(transformedMatrix[0][0], transformedMatrix[0][1]);
        triangle.v2 = new Point(transformedMatrix[1][0], transformedMatrix[1][1]);
        triangle.v3 = new Point(transformedMatrix[2][0], transformedMatrix[2][1]);

        Redraw(coordSystem);
        await sleep(Math.max(0, animationTime_ms / (totalFrames > 0 ? totalFrames : 1) ));

        if (progress >= 1) {
            progress = 0;
            currentScalePhase *= -1;
        }
         if (!isActivated) break;
    }
    isWaiting = true;
}


function StopMotion() {
  isPaused = true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function downloadMatrix(matrix, filename = "matrix.txt") {
  let text = "Матриця афінного перетворення (3x3):\n";
  text += "Множення матриці координат [X Y 1] на цю матрицю.\n\n";

  for (let row of matrix) {
    text += row.map((n) => n.toFixed(6).padStart(15)).join(" ") + "\n";
  }

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


const scale = (sx, sy) => [
  [sx, 0,  0],
  [0,  sy, 0],
  [0,  0,  1],
];

const shift = (dx, dy) => [
  [1,  0,  0],
  [0,  1,  0],
  [dx, dy, 1],
];

function MultiplyMatrixes(A, B) {
  if (!A || !B || A.length === 0 || B.length === 0 || !A[0] || !B[0] || A[0].length !== B.length) {
    console.error("Неможливо перемножити: невідповідність розмірностей матриць або порожні матриці.", "A:", A, "B:", B);
    return [[1,0,0],[0,1,0],[0,0,1]];
  }

  let resMatrix = Array(A.length).fill(null).map(() => Array(B[0].length).fill(0));

  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B[0].length; j++) {
      for (let k = 0; k < A[0].length; k++) {
        if (typeof A[i][k] !== 'number' || typeof B[k][j] !== 'number' || isNaN(A[i][k]) || isNaN(B[k][j])) {
            console.error(`Помилка множення матриць: нечислове значення або NaN. A[${i}][${k}]=${A[i][k]}, B[${k}][${j}]=${B[k][j]}`);
            return [[1,0,0],[0,1,0],[0,0,1]];
        }
        resMatrix[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return resMatrix;
}