const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const cropXInput = document.getElementById('cropX');
const cropYInput = document.getElementById('cropY');
const cropWidthInput = document.getElementById('cropWidth');
const cropHeightInput = document.getElementById('cropHeight');
const downloadBtn = document.getElementById('downloadBtn');
const statusEl = document.getElementById('status');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const HANDLE_SIZE = 10;

const state = {
  image: null,
  crop: {
    x: Number(cropXInput.value),
    y: Number(cropYInput.value),
    width: Number(cropWidthInput.value),
    height: Number(cropHeightInput.value),
  },
  interaction: {
    active: false,
    mode: null,
    handle: null,
    pointerStartX: 0,
    pointerStartY: 0,
    cropStartX: 0,
    cropStartY: 0,
    cropStartWidth: 0,
    cropStartHeight: 0,
  },
};

browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (file) loadImageFile(file);
});

['dragenter', 'dragover'].forEach((evt) => {
  dropZone.addEventListener(evt, (event) => {
    event.preventDefault();
    dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((evt) => {
  dropZone.addEventListener(evt, (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
  });
});

dropZone.addEventListener('drop', (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (file) loadImageFile(file);
});

[cropXInput, cropYInput, cropWidthInput, cropHeightInput].forEach((input) => {
  input.addEventListener('input', updateCropFromInputs);
});

downloadBtn.addEventListener('click', downloadCroppedImage);

canvas.addEventListener('pointerdown', startPointerInteraction);
canvas.addEventListener('pointermove', updateCursor);
window.addEventListener('pointermove', movePointerInteraction);
window.addEventListener('pointerup', endPointerInteraction);
window.addEventListener('pointercancel', endPointerInteraction);

function loadImageFile(file) {
  if (!file.type.startsWith('image/')) {
    setStatus('Please upload a valid image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const image = new Image();
    image.onload = () => {
      state.image = image;
      canvas.width = image.width;
      canvas.height = image.height;

      state.crop.width = clamp(Number(cropWidthInput.value) || 1, 1, image.width);
      state.crop.height = clamp(Number(cropHeightInput.value) || 1, 1, image.height);
      state.crop.x = clamp(
        Math.floor((image.width - state.crop.width) / 2),
        0,
        image.width - state.crop.width
      );
      state.crop.y = clamp(
        Math.floor((image.height - state.crop.height) / 2),
        0,
        image.height - state.crop.height
      );

      downloadBtn.disabled = false;
      syncInputsFromCrop();
      setStatus(`Loaded: ${file.name}. Drag or resize the crop box.`);
      render();
    };
    image.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateCropFromInputs() {
  if (!state.image) return;

  const image = state.image;
  const parsedWidth = parseOptionalNumber(cropWidthInput.value);
  const parsedHeight = parseOptionalNumber(cropHeightInput.value);
  const parsedX = parseOptionalNumber(cropXInput.value);
  const parsedY = parseOptionalNumber(cropYInput.value);

  const width = clamp(
    parsedWidth === null ? state.crop.width : parsedWidth,
    1,
    image.width
  );
  const height = clamp(
    parsedHeight === null ? state.crop.height : parsedHeight,
    1,
    image.height
  );
  let x = clamp(parsedX === null ? state.crop.x : parsedX, 0, image.width - 1);
  let y = clamp(parsedY === null ? state.crop.y : parsedY, 0, image.height - 1);

  x = clamp(x, 0, image.width - width);
  y = clamp(y, 0, image.height - height);

  state.crop.x = x;
  state.crop.y = y;
  state.crop.width = width;
  state.crop.height = height;

  const allInputsAreNumbers =
    parsedWidth !== null &&
    parsedHeight !== null &&
    parsedX !== null &&
    parsedY !== null;
  if (allInputsAreNumbers) syncInputsFromCrop();
  render();
}

function parseOptionalNumber(value) {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function startPointerInteraction(event) {
  if (!state.image) return;

  const pos = getPointerPos(event);
  const handle = getHandleAtPoint(pos.x, pos.y);

  if (!handle && !pointInCrop(pos.x, pos.y)) return;

  event.preventDefault();
  state.interaction.active = true;
  state.interaction.mode = handle ? 'resize' : 'move';
  state.interaction.handle = handle;
  state.interaction.pointerStartX = pos.x;
  state.interaction.pointerStartY = pos.y;
  state.interaction.cropStartX = state.crop.x;
  state.interaction.cropStartY = state.crop.y;
  state.interaction.cropStartWidth = state.crop.width;
  state.interaction.cropStartHeight = state.crop.height;
}

function movePointerInteraction(event) {
  if (!state.interaction.active || !state.image) return;

  const pos = getPointerPos(event);

  if (state.interaction.mode === 'resize') {
    resizeCropFromHandle(pos.x, pos.y, state.interaction.handle);
  } else {
    moveCropByPointerDelta(pos.x, pos.y);
  }
}

function endPointerInteraction() {
  state.interaction.active = false;
  state.interaction.mode = null;
  state.interaction.handle = null;
}

function moveCropByPointerDelta(pointerX, pointerY) {
  const image = state.image;
  const deltaX = pointerX - state.interaction.pointerStartX;
  const deltaY = pointerY - state.interaction.pointerStartY;
  const nextX = clamp(
    Math.round(state.interaction.cropStartX + deltaX),
    0,
    image.width - state.crop.width
  );
  const nextY = clamp(
    Math.round(state.interaction.cropStartY + deltaY),
    0,
    image.height - state.crop.height
  );

  state.crop.x = nextX;
  state.crop.y = nextY;
  syncInputsFromCrop();
  render();
}

function resizeCropFromHandle(pointerX, pointerY, handle) {
  const image = state.image;
  const start = state.interaction;
  const startX = start.cropStartX;
  const startY = start.cropStartY;
  const startRight = start.cropStartX + start.cropStartWidth;
  const startBottom = start.cropStartY + start.cropStartHeight;

  let x = startX;
  let y = startY;
  let right = startRight;
  let bottom = startBottom;

  if (handle === 'nw') {
    x = clamp(Math.round(pointerX), 0, startRight - 1);
    y = clamp(Math.round(pointerY), 0, startBottom - 1);
  }

  if (handle === 'ne') {
    right = clamp(Math.round(pointerX), startX + 1, image.width);
    y = clamp(Math.round(pointerY), 0, startBottom - 1);
  }

  if (handle === 'sw') {
    x = clamp(Math.round(pointerX), 0, startRight - 1);
    bottom = clamp(Math.round(pointerY), startY + 1, image.height);
  }

  if (handle === 'se') {
    right = clamp(Math.round(pointerX), startX + 1, image.width);
    bottom = clamp(Math.round(pointerY), startY + 1, image.height);
  }

  state.crop.x = x;
  state.crop.y = y;
  state.crop.width = right - x;
  state.crop.height = bottom - y;
  syncInputsFromCrop();
  render();
}

function getHandleAtPoint(x, y) {
  const corners = [
    { name: 'nw', x: state.crop.x, y: state.crop.y },
    { name: 'ne', x: state.crop.x + state.crop.width, y: state.crop.y },
    { name: 'sw', x: state.crop.x, y: state.crop.y + state.crop.height },
    { name: 'se', x: state.crop.x + state.crop.width, y: state.crop.y + state.crop.height },
  ];
  const threshold = HANDLE_SIZE * 1.2;

  for (const corner of corners) {
    if (Math.abs(x - corner.x) <= threshold && Math.abs(y - corner.y) <= threshold) {
      return corner.name;
    }
  }

  return null;
}

function updateCursor(event) {
  if (!state.image) {
    canvas.style.cursor = 'default';
    return;
  }

  const pos = getPointerPos(event);
  const handle = getHandleAtPoint(pos.x, pos.y);

  if (handle === 'nw' || handle === 'se') {
    canvas.style.cursor = 'nwse-resize';
    return;
  }

  if (handle === 'ne' || handle === 'sw') {
    canvas.style.cursor = 'nesw-resize';
    return;
  }

  if (pointInCrop(pos.x, pos.y)) {
    canvas.style.cursor = 'move';
    return;
  }

  canvas.style.cursor = 'default';
}

function pointInCrop(x, y) {
  return (
    x >= state.crop.x &&
    x <= state.crop.x + state.crop.width &&
    y >= state.crop.y &&
    y <= state.crop.y + state.crop.height
  );
}

function getPointerPos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function syncInputsFromCrop() {
  cropXInput.value = state.crop.x;
  cropYInput.value = state.crop.y;
  cropWidthInput.value = state.crop.width;
  cropHeightInput.value = state.crop.height;
}

function render() {
  if (!state.image) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const x = state.crop.x;
  const y = state.crop.y;
  const width = state.crop.width;
  const height = state.crop.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.image, 0, 0);

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, canvas.width, y);
  ctx.fillRect(0, y, x, height);
  ctx.fillRect(x + width, y, canvas.width - (x + width), height);
  ctx.fillRect(0, y + height, canvas.width, canvas.height - (y + height));

  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  drawHandle(x, y, HANDLE_SIZE);
  drawHandle(x + width, y, HANDLE_SIZE);
  drawHandle(x, y + height, HANDLE_SIZE);
  drawHandle(x + width, y + height, HANDLE_SIZE);
  ctx.restore();
}

function drawHandle(centerX, centerY, size) {
  const half = size / 2;
  ctx.fillStyle = '#00d4ff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.fillRect(centerX - half, centerY - half, size, size);
  ctx.strokeRect(centerX - half, centerY - half, size, size);
}

function downloadCroppedImage() {
  if (!state.image) return;

  const output = document.createElement('canvas');
  output.width = state.crop.width;
  output.height = state.crop.height;
  const outputCtx = output.getContext('2d');

  outputCtx.drawImage(
    state.image,
    state.crop.x,
    state.crop.y,
    state.crop.width,
    state.crop.height,
    0,
    0,
    state.crop.width,
    state.crop.height
  );

  output.toBlob((blob) => {
    if (!blob) {
      setStatus('Failed to generate cropped image.');
      return;
    }
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'cropped-image.png';
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function setStatus(message) {
  statusEl.textContent = message;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
