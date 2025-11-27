import { AudioManager } from './audio.js';
import confetti from 'confetti';

// Game Constants
const LIMBS = ['LEFT FOOT', 'RIGHT FOOT', 'RIGHT HAND', 'LEFT HAND']; // Counter-clockwise order usually on board
const COLORS = ['#008F00', '#FFCF00', '#0000D3', '#E70000']; // Green, Yellow, Blue, Red
const COLOR_NAMES = ['GREEN', 'YELLOW', 'BLUE', 'RED'];

// Setup Canvas
const canvas = document.getElementById('spinner-canvas');
const ctx = canvas.getContext('2d');
const uiResult = document.getElementById('result-display');
const uiInstruction = document.getElementById('instruction');

const audio = new AudioManager();

// State
let width, height, size, radius;
let angle = 0;
let velocity = 0;
let isSpinning = false;
let friction = 0.985;
let lastTickAngle = 0;

// Resize Handler
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Calculate board size (fit to shortest dimension with padding)
    size = Math.min(width, height) * 0.9;
    radius = size / 2;
    
    draw();
}

window.addEventListener('resize', resize);

// Input Handler
function handleTap() {
    audio.resume();
    
    if (isSpinning) return;
    
    // Start Spin
    isSpinning = true;
    velocity = 20 + Math.random() * 30; // Random initial speed
    friction = 0.990 - (Math.random() * 0.005); // Randomize friction slightly
    
    uiResult.classList.remove('visible');
    uiInstruction.style.opacity = '0';
    
    requestAnimationFrame(loop);
}

document.addEventListener('pointerdown', handleTap);

// Animation Loop
function loop() {
    if (!isSpinning) return;

    // Physics
    angle += velocity;
    velocity *= friction;

    // Normalize angle
    if (angle >= 360) angle %= 360;

    // Tick Sound Logic (16 segments = 22.5 degrees per segment)
    // We check if we crossed a segment boundary
    const segmentAngle = 360 / 16;
    const currentTick = Math.floor(angle / segmentAngle);
    const lastTick = Math.floor(lastTickAngle / segmentAngle);
    
    if (currentTick !== lastTick) {
        audio.playTick(velocity);
    }
    lastTickAngle = angle;

    draw();

    // Stop condition
    if (velocity < 0.1) {
        isSpinning = false;
        velocity = 0;
        determineResult();
    } else {
        requestAnimationFrame(loop);
    }
}

// Result Logic
function determineResult() {
    // Determine which segment the arrow points to
    // The visual arrow points UP (270 deg) usually, but we rotate the board or the arrow.
    // In our draw function, we rotate the ARROW.
    // So if arrow is at `angle`, the tip is pointing at `angle`.
    
    // Normalizing angle to 0-360
    let finalAngle = (angle + 45) % 360;
    
    // Calculate Segment
    // The board is divided into 4 quadrants (Limbs)
    // Each quadrant is divided into 4 colors.
    // Let's assume Quadrants start at:
    // 0-90: Limb 0
    // 90-180: Limb 1
    // 180-270: Limb 2
    // 270-360: Limb 3
    
    // Within each quadrant (90 degrees), there are 4 colors (22.5 degrees each)
    
    const quadrantIndex = Math.floor(finalAngle / 90);
    const limb = LIMBS[quadrantIndex];
    
    const angleInQuadrant = finalAngle % 90;
    const colorIndex = Math.floor(angleInQuadrant / 22.5);
    const colorHex = COLORS[colorIndex];
    const colorName = COLOR_NAMES[colorIndex];
    
    showResult(limb, colorName, colorHex);
}

function showResult(limb, colorName, colorHex) {
    audio.playLand();
    
    uiResult.textContent = `${limb} ${colorName}`;
    uiResult.style.borderColor = colorHex;
    uiResult.style.color = colorHex === '#FFFF00' ? '#D4AC0D' : colorHex; // Darker yellow for text
    uiResult.classList.add('visible');
    uiInstruction.style.opacity = '1';
    uiInstruction.textContent = "Tap to Spin Again";

    // Text to Speech
    setTimeout(() => {
        audio.speak(`${limb} ${colorName}`);
    }, 500);

    // Confetti explosion
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [colorHex, '#ffffff']
    });
}

// Drawing Functions
function draw() {
    ctx.clearRect(0, 0, width, height);
    
    const cx = width / 2;
    const cy = height / 2;

    ctx.save();
    ctx.translate(cx, cy);

    // Draw Board Background
    drawBoard(ctx, radius);

    // Draw Spinner Arrow
    ctx.rotate((angle * Math.PI) / 180);
    drawArrow(ctx, radius * 0.8);

    ctx.restore();
}

function drawBoard(ctx, r) {
    // Draw Square Board base
    ctx.fillStyle = '#fbfbfb';
    const boardSize = r * 2.1;
    
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    
    // Cardboard shape
    ctx.beginPath();
    ctx.roundRect(-boardSize/2, -boardSize/2, boardSize, boardSize, 20);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Draw Quadrants
    // We rotate context to draw each quadrant easily
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate(((i * 90 - 45) * Math.PI) / 180);
        
        // Draw Limb Label in the corner
        // This is visually centered in the 90 degree slice
        ctx.fillStyle = '#333';
        ctx.font = `bold ${r * 0.12}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Position text
        // Angle 45deg, distance r*0.75
        const textDist = r * 0.85;
        const textAngle = 45 * Math.PI / 180;
        ctx.translate(Math.cos(textAngle) * textDist, Math.sin(textAngle) * textDist);
        
        // Rotate text to face center? Or face reader?
        // Let's rotate it -45 so it's upright relative to the corner
        ctx.rotate((45 * Math.PI) / 180); // Makes it perpendicular to corner diagonal
        ctx.rotate((-90 * Math.PI) / 180); // Makes it readable from "bottom" of that quadrant
        
        ctx.fillText(LIMBS[i], 0, 0);
        
        ctx.restore();

        // Draw Color Circles for this quadrant
        // 4 colors between 0 and 90 degrees
        // Positions: 11.25, 33.75, 56.25, 78.75
        for (let j = 0; j < 4; j++) {
            const sliceAngle = (j * 22.5 + 11.25);
            const rads = (sliceAngle * Math.PI) / 180;
            
            // Adjust loop rotation
            const totalRot = (i * 90 * Math.PI) / 180;
            
            const dotDist = r * 0.55;
            const x = Math.cos(rads + totalRot) * dotDist;
            const y = Math.sin(rads + totalRot) * dotDist;

            ctx.beginPath();
            ctx.arc(x, y, r * 0.08, 0, Math.PI * 2);
            ctx.fillStyle = COLORS[j];
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    // Draw Dividing Lines
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, -r);
    ctx.lineTo(r, r);
    ctx.moveTo(r, -r);
    ctx.lineTo(-r, r);
    ctx.stroke();

    // Center Hub
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#888';
    ctx.fill();
}

function drawArrow(ctx, len) {
    // Arrow pointing to 0 degrees (East in canvas, but we want it to act like a spinner)
    // Let's draw it pointing right (0 radians)
    
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    ctx.fillStyle = '#333';
    ctx.beginPath();
    // Tip
    ctx.moveTo(len, 0);
    // Back Wide
    ctx.lineTo(-len * 0.2, len * 0.1);
    // Center Indent
    ctx.lineTo(-len * 0.1, 0);
    // Back Wide
    ctx.lineTo(-len * 0.2, -len * 0.1);
    ctx.closePath();
    ctx.fill();

    // Central Pin
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.arc(0, 0, len * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
}

// Initial Call
resize();