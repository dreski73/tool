const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size to match browser window
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Calculate the position and size of the centered rectangle panel
const panelAspectRatio = 100 / 150; // Width to height ratio
let panelWidth, panelHeight, panelX, panelY;

const MAX_HISTORY = 50;
let history = [];
let historyIndex = -1;

function saveState() {
    const state = JSON.stringify(layers);
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    history.push(state);
    if (history.length > MAX_HISTORY) {
        history.shift();
    }
    historyIndex = history.length - 1;
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        layers = JSON.parse(history[historyIndex]);
        updateLayerList();
        redrawCanvas();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        layers = JSON.parse(history[historyIndex]);
        updateLayerList();
        redrawCanvas();
    }
}

function updatePanelSize() {
    if (canvas.width / canvas.height > panelAspectRatio) {
        panelHeight = canvas.height * 0.8;
        panelWidth = panelHeight * panelAspectRatio;
    } else {
        panelWidth = canvas.width * 0.8;
        panelHeight = panelWidth / panelAspectRatio;
    }
    panelX = (canvas.width - panelWidth) / 2;
    panelY = (canvas.height - panelHeight) / 2;
}

updatePanelSize();

// Get the control elements from the HTML
const lineCountSlider = document.getElementById('lineCountSlider');
const lineCountDisplay = document.getElementById('lineCountDisplay');
const rotationSlider = document.getElementById('rotationSlider');
const degreeIncrementSlider = document.getElementById('degreeIncrementSlider');
const degreeIncrementDisplay = document.getElementById('degreeIncrementDisplay');
const layerListElement = document.getElementById('layerList');

// Color palette
const colorPalette = [
    { name: 'Heavy Traffic', hex: '#222020' },
    { name: 'Vermillion', hex: '#DB3F2C' },
    { name: 'Favoriet', hex: '#a2a6b1' },
    { name: 'Pink', hex: '#f9b9c2' },
    { name: 'Wauw', hex: '#9cd4e9' },
    { name: 'Paars', hex: '#a59bc6' },
    { name: 'Snoes', hex: '#00A2C4' },
    { name: 'Broccoli', hex: '#456941' },
    { name: 'Appel', hex: '#ecd763' },
    { name: 'Daytona Red', hex: '#9c2722' },
    { name: 'Rose Pink', hex: '#f7cadd' },
    { name: 'Silver Lake Blue', hex: '#5f8abf' },
    { name: 'white', hex: 'white' }

];

// Function to safely add event listeners
function addShapeButtonListeners() {
    const shapes = ['rectangle', 'circle', 'triangle'];
    shapes.forEach(shape => {
        const button = document.getElementById(`${shape}Button`);
        if (button) {
            button.addEventListener('click', () => createShapeLayer(shape));
        } else {
            console.warn(`${shape}Button not found in the DOM`);
        }
    });
}

// Layer system
let layers = [
    {
        type: 'background',
        color: '#FFFFFF',
        visible: true
    }
];

const MAX_FONT_SIZE = 100;
const MIN_FONT_SIZE = 10;  // Minimum font size

let currentLayerIndex = 0;
let selectedLayer = null;
let isDragging = false;
let isResizing = false;
let isRotating = false;
let lastMouseX, lastMouseY;
const handleSize = 8;

// Band properties
let lineCount = 10; // Default to 10 lines
let degreeIncrement = 0; // Default to 0 degrees increment

// Update slider defaults
if (lineCountSlider) {
    lineCountSlider.value = lineCount;
}
if (lineCountDisplay) {
    lineCountDisplay.textContent = lineCount;
}
if (degreeIncrementSlider) {
    degreeIncrementSlider.value = degreeIncrement;
}
if (degreeIncrementDisplay) {
    degreeIncrementDisplay.textContent = degreeIncrement;
}

// Add event listeners to the sliders
if (lineCountSlider) {
    lineCountSlider.addEventListener('input', () => {
        lineCount = parseInt(lineCountSlider.value);
        if (lineCountDisplay) {
            lineCountDisplay.textContent = lineCount;
        }
        updateCurrentLayer();
        redrawCanvas();
    });
}

if (rotationSlider) {
    rotationSlider.addEventListener('input', () => {
        if (selectedLayer && (selectedLayer.type === 'lines' || selectedLayer.type === 'text')) {
            selectedLayer.rotation = parseFloat(rotationSlider.value) * Math.PI / 180;
            redrawCanvas();
        }
    });
}

if (degreeIncrementSlider) {
    degreeIncrementSlider.addEventListener('input', () => {
        degreeIncrement = parseFloat(degreeIncrementSlider.value);
        if (degreeIncrementDisplay) {
            degreeIncrementDisplay.textContent = degreeIncrement.toFixed(1);
        }
        updateCurrentLayer();
        redrawCanvas();
    });
}

// Function to redraw the canvas
function redrawCanvas() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set the canvas background to light gray
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw the panel
    drawPanel();
}

// Function to draw the panel and its contents
function drawPanel() {
    ctx.save();
    ctx.beginPath();
    ctx.rect(panelX, panelY, panelWidth, panelHeight);
    ctx.clip();

    layers.forEach(layer => {
        if (layer.visible) {
            if (layer.type === 'background') {
                ctx.fillStyle = layer.color;
                ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
            } else if (layer.type === 'lines') {
                drawLines(layer);
            } else if (layer.type === 'text') {
                drawText(layer);
            } else if (layer.type === 'shape') {
                drawShape(layer);
            }
        }
    });

    ctx.restore();

    // Draw the panel border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
}

function drawShape(layer) {
    ctx.save();
    ctx.translate(panelX + layer.x, panelY + layer.y);
    ctx.rotate(layer.rotation);

    ctx.fillStyle = layer.color;
    if (layer.fillPattern === 'solid') {
        // Use the current fillStyle
    } else if (layer.fillPattern === 'stripes') {
        const pattern = ctx.createPattern(createStripesPattern(), 'repeat');
        ctx.fillStyle = pattern;
    } else if (layer.fillPattern === 'dots') {
        const pattern = ctx.createPattern(createDotsPattern(), 'repeat');
        ctx.fillStyle = pattern;
    }

    if (layer.shapeType === 'rectangle') {
        ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
    } else if (layer.shapeType === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, layer.width / 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (layer.shapeType === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(0, -layer.height / 2);
        ctx.lineTo(layer.width / 2, layer.height / 2);
        ctx.lineTo(-layer.width / 2, layer.height / 2);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function createStripesPattern() {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 10;
    patternCanvas.height = 10;
    const patternCtx = patternCanvas.getContext('2d');
    patternCtx.strokeStyle = 'black';
    patternCtx.lineWidth = 2;
    patternCtx.beginPath();
    patternCtx.moveTo(0, 0);
    patternCtx.lineTo(10, 10);
    patternCtx.stroke();
    return patternCanvas;
}

function createDotsPattern() {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 10;
    patternCanvas.height = 10;
    const patternCtx = patternCanvas.getContext('2d');
    patternCtx.fillStyle = 'black';
    patternCtx.beginPath();
    patternCtx.arc(5, 5, 2, 0, Math.PI * 2);
    patternCtx.fill();
    return patternCanvas;
}

// Function to draw lines
function drawLines(layer) {
    ctx.save();
    
    // Move to the center of the panel for rotation
    ctx.translate(panelX + panelWidth / 2, panelY + panelHeight / 2);
    ctx.rotate(layer.rotation || 0);
    
    const totalBandHeight = panelHeight;
    const lineAndGapHeight = totalBandHeight / layer.lineCount;
    const lineHeight = lineAndGapHeight / 2; // Each line takes up half of the line-and-gap height

    // Calculate the diagonal length of the panel to ensure lines extend beyond panel edges
    const diagonalLength = Math.sqrt(panelWidth * panelWidth + panelHeight * panelHeight);

    // Calculate additional lines needed for rotation
    const rotationFactor = Math.abs(Math.sin(layer.rotation || 0));
    const additionalLines = Math.ceil(panelWidth * rotationFactor / lineAndGapHeight);
    const totalLines = layer.lineCount + additionalLines * 2; // Add lines on both top and bottom

    // Calculate the start position to center the original lines
    const startY = -totalBandHeight / 2 - additionalLines * lineAndGapHeight;

    for (let i = 0; i < totalLines; i++) {
        const lineY = startY + i * lineAndGapHeight;
        const lineRotation = (i - additionalLines - Math.floor(layer.lineCount / 2)) * layer.degreeIncrement * Math.PI / 180;

        ctx.save();
        ctx.rotate(lineRotation);
        ctx.fillStyle = layer.color;
        // Draw a line that extends beyond the panel edges
        ctx.fillRect(-diagonalLength / 2, lineY, diagonalLength, lineHeight);
        ctx.restore();
    }

    ctx.restore();
}

// Function to draw text
function drawText(layer) {
    ctx.save();
    ctx.translate(panelX + layer.x, panelY + layer.y);
    ctx.rotate(layer.rotation);
    ctx.font = `${layer.fontSize}px ${layer.font}`;
    ctx.fillStyle = layer.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(layer.text, 0, 0);

    if (layer === selectedLayer) {
        const metrics = ctx.measureText(layer.text);
        const width = metrics.width;
        const height = layer.fontSize;
        
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.strokeRect(-width/2, -height/2, width, height);
        
        // Draw resize handle
        ctx.fillStyle = 'blue';
        const handleSize = 10;
        ctx.fillRect(width/2 - handleSize/2, height/2 - handleSize/2, handleSize, handleSize);
        
        // Draw rotation handle
        ctx.beginPath();
        ctx.moveTo(0, -height/2);
        ctx.lineTo(0, -height/2 - 20);
        ctx.stroke();
        ctx.fillRect(-handleSize/2, -height/2 - 20 - handleSize/2, handleSize, handleSize);
    }
    
    ctx.restore();
}

function createShapeLayer(type) {
    const newLayer = {
        type: 'shape',
        shapeType: type,
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)].hex,
        x: panelWidth / 2,
        y: panelHeight / 2,
        width: 100,
        height: 100,
        rotation: 0,
        fillPattern: 'solid',
        visible: true
    };
    layers.push(newLayer);
    currentLayerIndex = layers.length - 1;
    selectedLayer = newLayer;
    updateLayerList();
    redrawCanvas();
    saveState();
}

// Function to create a new layer
function createLayer() {
    const newLayer = {
        type: 'lines',
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)].hex,
        lineCount: lineCount,
        rotation: 0,
        degreeIncrement: degreeIncrement,
        visible: true
    };
    layers.push(newLayer);
    currentLayerIndex = layers.length - 1;
    selectedLayer = newLayer;
    updateLayerList();
    redrawCanvas();
}

// Function to create a new text layer
function createTextLayer() {
    const newLayer = {
        type: 'text',
        text: 'United Painting',
        font: 'Impact',
        fontSize: Math.min(30, MAX_FONT_SIZE), // Ensure default size doesn't exceed max
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)].hex,
        x: panelWidth / 2,
        y: panelHeight / 2,
        rotation: 0,
        visible: true
    };
    layers.push(newLayer);
    currentLayerIndex = layers.length - 1;
    selectedLayer = newLayer;
    updateLayerList();
    redrawCanvas();
}

// Function to delete a layer
function deleteLayer(index) {
    if (index === 0) return; // Prevent deleting the background layer
    layers.splice(index, 1);
    if (currentLayerIndex >= layers.length) {
        currentLayerIndex = layers.length - 1;
    }
    selectedLayer = null;
    updateLayerList();
    redrawCanvas();
}

// Function to toggle layer visibility
function toggleLayerVisibility(index) {
    layers[index].visible = !layers[index].visible;
    updateLayerList();
    redrawCanvas();
}

// Function to shuffle layer colors
function shuffleColors() {
    // Create a copy of the color palette
    let availableColors = [...colorPalette];
    
    // Shuffle the available colors
    for (let i = availableColors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableColors[i], availableColors[j]] = [availableColors[j], availableColors[i]];
    }

    layers.forEach((layer, index) => {
        // If we've used all colors, reset the available colors
        if (index >= availableColors.length) {
            availableColors = [...colorPalette];
            // Shuffle again
            for (let i = availableColors.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availableColors[i], availableColors[j]] = [availableColors[j], availableColors[i]];
            }
        }
        
        // Assign the next available color
        layer.color = availableColors[index % availableColors.length].hex;
    });

    updateLayerList();
    redrawCanvas();
}

// Function to update the current layer
function updateCurrentLayer() {
    if (currentLayerIndex > 0 && layers[currentLayerIndex].type === 'lines') {
        layers[currentLayerIndex].lineCount = lineCount;
        layers[currentLayerIndex].degreeIncrement = degreeIncrement;
    }
}

// Function to change the layer color
function changeLayerColor(color) {
    if (selectedLayer) {
        selectedLayer.color = color;
        updateLayerList();
        redrawCanvas();
    }
}

// Function to update the layer list UI
function updateLayerList() {
    layerListElement.innerHTML = '';
    layers.forEach((layer, index) => {
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        if (layer === selectedLayer) {
            layerItem.classList.add('selected');
        }
        
        const colorBox = document.createElement('span');
        colorBox.className = 'color-box';
        colorBox.style.backgroundColor = layer.color;
        
        const layerInfo = document.createElement('span');
        if (layer.type === 'text') {
            layerInfo.textContent = `Text: ${layer.text.substring(0, 10)}${layer.text.length > 10 ? '...' : ''}`;
        } else {
            layerInfo.textContent = `${layer.type} ${index > 0 ? index : ''}`;
        }
        
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'layer-controls';

        if (index !== 0) {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'x';
            deleteButton.className = 'delete-button';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteLayer(index);
            });
            controlsContainer.appendChild(deleteButton);

            // Add drag handle
            const dragHandle = document.createElement('span');
            dragHandle.textContent = '☰';
            dragHandle.className = 'drag-handle';
            dragHandle.draggable = true;
            dragHandle.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
            });
            controlsContainer.appendChild(dragHandle);
        }

        const visibilityToggle = document.createElement('button');
        visibilityToggle.innerHTML = layer.visible ? '👁️' : '👁️‍🗨️';
        visibilityToggle.className = 'visibility-toggle';
        visibilityToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLayerVisibility(index);
        });
        controlsContainer.appendChild(visibilityToggle);
        
        layerItem.appendChild(colorBox);
        layerItem.appendChild(layerInfo);
        layerItem.appendChild(controlsContainer);
        layerItem.addEventListener('click', () => selectLayer(index));
        
        // Add drag and drop event listeners
        layerItem.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        layerItem.addEventListener('drop', (e) => {
            e.preventDefault();
            const oldIndex = parseInt(e.dataTransfer.getData('text/plain'));
            reorderLayers(oldIndex, index);
        });
        
        layerListElement.appendChild(layerItem);
    });
}

function reorderLayers(oldIndex, newIndex) {
    if (oldIndex < 1 || oldIndex >= layers.length || newIndex < 1 || newIndex >= layers.length) return;
    const [removed] = layers.splice(oldIndex, 1);
    layers.splice(newIndex, 0, removed);
    updateLayerList();
    redrawCanvas();
}

// Function to select a layer
function selectLayer(index) {
    currentLayerIndex = index;
    selectedLayer = layers[index];
    if (selectedLayer.type === 'lines') {
        lineCount = selectedLayer.lineCount;
        degreeIncrement = selectedLayer.degreeIncrement;
        lineCountSlider.value = lineCount;
        lineCountDisplay.textContent = lineCount;
        degreeIncrementSlider.value = degreeIncrement;
        degreeIncrementDisplay.textContent = degreeIncrement.toFixed(1);
    }
    rotationSlider.value = (selectedLayer.rotation || 0) * 180 / Math.PI;
    updateLayerList();
    redrawCanvas();
}

// Function to handle mouse down events
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    console.log('Mouse down at:', mouseX, mouseY);

    let found = false;
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (layer.type === 'text' && layer.visible) {
            const localMouseX = mouseX - (panelX + layer.x);
            const localMouseY = mouseY - (panelY + layer.y);
            const rotatedX = localMouseX * Math.cos(-layer.rotation) - localMouseY * Math.sin(-layer.rotation);
            const rotatedY = localMouseX * Math.sin(-layer.rotation) + localMouseY * Math.cos(-layer.rotation);
            
            ctx.save();
            ctx.font = `${layer.fontSize}px ${layer.font}`;
            const metrics = ctx.measureText(layer.text);
            const width = metrics.width;
            const height = layer.fontSize;
            ctx.restore();

            console.log('Checking text layer:', layer.text, 'at', layer.x, layer.y);
            console.log('Rotated mouse position:', rotatedX, rotatedY);
            console.log('Text bounds:', -width/2, width/2, -height/2, height/2);
            
            if (rotatedX >= -width/2 && rotatedX <= width/2 && rotatedY >= -height/2 && rotatedY <= height/2) {
                selectedLayer = layer;
                currentLayerIndex = i;
                isDragging = true;
                lastMouseX = mouseX;
                lastMouseY = mouseY;
                found = true;
                break;
            }
            
            // Check if clicking on resize handle
            const handleX = width / 2;
            const handleY = height / 2;
            const handleSize = 10;
            if (rotatedX >= handleX - handleSize && rotatedX <= handleX + handleSize &&
                rotatedY >= handleY - handleSize && rotatedY <= handleY + handleSize) {
                selectedLayer = layer;
                currentLayerIndex = i;
                isResizing = true;
                initialFontSize = layer.fontSize;
                initialMouseDistance = Math.sqrt(localMouseX * localMouseX + localMouseY * localMouseY);
                found = true;
                break;
            }
            
            // Check if clicking on rotation handle
            if (rotatedX >= -handleSize/2 && rotatedX <= handleSize/2 && 
                rotatedY >= -height/2 - 20 - handleSize/2 && rotatedY <= -height/2 - 20 + handleSize/2) {
                selectedLayer = layer;
                currentLayerIndex = i;
                isRotating = true;
                lastMouseX = mouseX;
                lastMouseY = mouseY;
                found = true;
                break;
            }
        }
    }

    if (!found) {
        selectedLayer = null;
        currentLayerIndex = -1;
    }

    updateLayerList();
    redrawCanvas();
});

// Function to handle mouse move events
canvas.addEventListener('mousemove', (e) => {
    if (!selectedLayer || selectedLayer.type !== 'text') return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
        selectedLayer.x += (mouseX - lastMouseX);
        selectedLayer.y += (mouseY - lastMouseY);
    } else if (isResizing) {
        const localMouseX = mouseX - (panelX + selectedLayer.x);
        const localMouseY = mouseY - (panelY + selectedLayer.y);
        const currentMouseDistance = Math.sqrt(localMouseX * localMouseX + localMouseY * localMouseY);
        
        const scaleFactor = currentMouseDistance / initialMouseDistance;
        let newFontSize = initialFontSize * scaleFactor;

        // Clamp the new font size
        newFontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, newFontSize));
        selectedLayer.fontSize = newFontSize;
    } else if (isRotating) {
        console.log('Rotating');
        const dx = mouseX - (panelX + selectedLayer.x);
        const dy = mouseY - (panelY + selectedLayer.y);
        selectedLayer.rotation = Math.atan2(dy, dx) + Math.PI/2;
    }

    lastMouseX = mouseX;
    lastMouseY = mouseY;
    redrawCanvas();
});

// Function to handle mouse up events
canvas.addEventListener('mouseup', () => {
    console.log('Mouse up');
    isDragging = false;
    isResizing = false;
    isRotating = false;
});

// Function to handle mouse leave events
canvas.addEventListener('mouseleave', () => {
    console.log('Mouse left canvas');
    isDragging = false;
    isResizing = false;
    isRotating = false;
});

// Function to handle double click for text editing
canvas.addEventListener('dblclick', (e) => {
    if (selectedLayer && selectedLayer.type === 'text') {
        const newText = prompt('Enter new text:', selectedLayer.text);
        if (newText !== null) {
            selectedLayer.text = newText;
            redrawCanvas();
            updateLayerList();
        }
    }
});

// Function to save the current design
function saveDesign() {
    const designName = prompt('Enter a name for your design:');
    if (designName === null || designName.trim() === '') {
        alert('Please enter a valid name for your design');
        return;
    }

    const design = {
        name: designName.trim(),
        layers: layers,
        currentLayerIndex: currentLayerIndex
    };

    let savedDesigns = JSON.parse(localStorage.getItem('savedDesigns')) || [];
    savedDesigns.push(design);
    localStorage.setItem('savedDesigns', JSON.stringify(savedDesigns));

    updateSavedDesignsList();
}

// Function to update the saved designs list
function updateSavedDesignsList() {
    const savedDesignsList = document.getElementById('savedDesignsList');
    savedDesignsList.innerHTML = '';

    const savedDesigns = JSON.parse(localStorage.getItem('savedDesigns')) || [];

    savedDesigns.forEach((design, index) => {
        const designElement = document.createElement('div');
        designElement.className = 'saved-design';
        designElement.innerHTML = `
            <span>${design.name}</span>
            <div class="saved-design-buttons">
                <button onclick="loadDesign(${index})">Load</button>
                <button onclick="deleteDesign(${index})">X</button>
            </div>
        `;
        savedDesignsList.appendChild(designElement);
    });
}

// Function to load a saved design
function loadDesign(index) {
    const savedDesigns = JSON.parse(localStorage.getItem('savedDesigns')) || [];
    const design = savedDesigns[index];

    if (design) {
        layers = design.layers;
        currentLayerIndex = design.currentLayerIndex;
        selectedLayer = layers[currentLayerIndex];
        updateLayerList();
        redrawCanvas();
    }
}

// Function to delete a saved design
function deleteDesign(index) {
    let savedDesigns = JSON.parse(localStorage.getItem('savedDesigns')) || [];
    savedDesigns.splice(index, 1);
    localStorage.setItem('savedDesigns', JSON.stringify(savedDesigns));
    updateSavedDesignsList();
}

// Function to reset the design
function resetDesign() {
    layers = [
        {
            type: 'background',
            color: '#FFFFFF',
            visible: true
        }
    ];
    currentLayerIndex = 0;
    selectedLayer = null;
    lineCount = 10;
    degreeIncrement = 0;
    lineCountSlider.value = lineCount;
    lineCountDisplay.textContent = lineCount;
    degreeIncrementSlider.value = degreeIncrement;
    degreeIncrementDisplay.textContent = degreeIncrement;
    rotationSlider.value = 0;
    updateLayerList();
    redrawCanvas();
}

// Create color palette buttons
function createColorPalette() {
    const colorPaletteElement = document.getElementById('colorPalette');
    colorPalette.forEach(color => {
        const colorButton = document.createElement('button');
        colorButton.className = 'color-button';
        colorButton.style.backgroundColor = color.hex;
        colorButton.title = color.name;
        colorButton.addEventListener('click', () => changeLayerColor(color.hex));
        colorPaletteElement.appendChild(colorButton);
    });
}

// Initial setup
createColorPalette();
updateLayerList();
updateSavedDesignsList();
redrawCanvas();

// Redraw on window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updatePanelSize();
    redrawCanvas();
});

document.addEventListener('DOMContentLoaded', addShapeButtonListeners);

// Add event listeners for buttons
document.getElementById('lineButton').addEventListener('click', createLayer);
document.getElementById('textButton').addEventListener('click', createTextLayer);
document.getElementById('rectangleButton').addEventListener('click', () => createShapeLayer('rectangle'));
document.getElementById('circleButton').addEventListener('click', () => createShapeLayer('circle'));
document.getElementById('shuffleButton').addEventListener('click', shuffleColors);
document.getElementById('saveButton').addEventListener('click', saveDesign);
document.getElementById('resetButton').addEventListener('click', resetDesign);
document.getElementById('undoButton').addEventListener('click', undo);
document.getElementById('redoButton').addEventListener('click', redo);
