import { AudioManager } from './audio.js';
import { VoiceControl } from './voice.js';
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
const micBtn = document.getElementById('mic-toggle');

const audio = new AudioManager();
const voice = new VoiceControl();

// State
let width, height, size, radius;
let angle = 0;
let velocity = 0;
let isSpinning = false;
let friction = 0.985;
let lastTickAngle = 0;
let currentKeyword = 'spin';
let isSettingKeyword = false;

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
    startSpin();
}

function startSpin() {
    if (isSpinning) return;
    
    // Start Spin
    isSpinning = true;
    velocity = 20 + Math.random() * 30; // Random initial speed
    friction = 0.990 - (Math.random() * 0.005); // Randomize friction slightly
    
    uiResult.classList.remove('visible');
    uiInstruction.style.opacity = '0';
    
    requestAnimationFrame(loop);
}

document.addEventListener('pointerdown', (e) => {
    // Prevent spin if clicking the mic button
    if (e.target.closest('#mic-toggle')) return;
    handleTap();
});

// Voice Control Setup
if (!voice.supported) {
    micBtn.style.display = 'none';
} else {
    let pressTimer = null;
    let isLongPress = false;

    const onVoiceResult = (transcript) => {
        const cleanText = transcript.trim().toLowerCase();
        
        if (isSettingKeyword) {
            // New keyword detected
            if (cleanText.length > 0) {
                currentKeyword = cleanText;
                isSettingKeyword = false;
                
                // Feedback
                uiInstruction.textContent = `Keyword set: "${currentKeyword}"`;
                audio.speak(`Keyword is now ${currentKeyword}`);
                
                micBtn.classList.remove('recording-setup');
                micBtn.classList.add('active');
                
                setTimeout(() => {
                    if (voice.isListening) {
                        uiInstruction.textContent = `Say '${currentKeyword}'!`;
                    }
                }, 2000);
            }
        } else {
            // Normal operation
            if (cleanText.includes(currentKeyword)) {
                startSpin();
            }
        }
    };

    const startPress = (e) => {
        if (e.button !== 0 && e.type === 'pointerdown') return;
        
        isLongPress = false;
        micBtn.classList.add('holding');
        
        pressTimer = setTimeout(() => {
            isLongPress = true;
            micBtn.classList.remove('holding');
            
            // Start keyword setup
            isSettingKeyword = true;
            micBtn.classList.add('recording-setup');
            micBtn.classList.remove('active');
            
            uiInstruction.textContent = "Say new keyword...";
            uiInstruction.style.opacity = '1';
            audio.playTick(10);
            audio.resume();
            
            // Ensure listening
            if (!voice.isListening) {
                voice.start(onVoiceResult);
            } else {
                // Update callback just in case, though we use the same function reference
                voice.start(onVoiceResult);
            }
        }, 3000);
    };

    const endPress = () => {
        clearTimeout(pressTimer);
        micBtn.classList.remove('holding');
    };

    micBtn.addEventListener('pointerdown', startPress);
    micBtn.addEventListener('pointerup', endPress);
    micBtn.addEventListener('pointerleave', endPress);

    micBtn.addEventListener('click', () => {
        if (isLongPress) return;

        audio.resume(); // Ensure audio context is ready
        
        if (voice.isListening) {
            voice.stop();
            micBtn.classList.remove('active');
            micBtn.classList.remove('recording-setup');
            isSettingKeyword = false;
            uiInstruction.textContent = "Tap to Spin!";
        } else {
            const started = voice.start(onVoiceResult);
            if (started) {
                micBtn.classList.add('active');
                uiInstruction.textContent = `Say '${currentKeyword}'!`;
            }
        }
    });
}

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
    // Adjust logic to match the visual sectors starting at -11.25 offset from axes
    const segmentAngle = 360 / 16;
    // Shift angle by half a segment to align ticks with color centers
    const currentTick = Math.floor((angle + 11.25) / segmentAngle);
    const lastTick = Math.floor((lastTickAngle + 11.25) / segmentAngle);
    
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
    
    // Normalizing angle to 0-360
    let finalAngle = angle % 360;
    
    // Align with X-grid quadrants
    // Visual sectors are [-45, 45] (Right), [45, 135] (Bottom), etc.
    // adding 45 shifts [-45, 45] to [0, 90] range for easier indexing
    let adjustedAngle = (finalAngle + 45) % 360;
    if (adjustedAngle < 0) adjustedAngle += 360;
    
    const quadrantIndex = Math.floor(adjustedAngle / 90);
    const limb = LIMBS[quadrantIndex];
    
    // Within the quadrant (0-90), determine color
    const angleInQuadrant = adjustedAngle % 90;
    // 4 colors fit in 90 degrees (22.5 each)
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
    
    if (voice.isListening) {
        uiInstruction.textContent = `Say '${currentKeyword}' again`;
    } else {
        uiInstruction.textContent = "Tap to Spin Again";
    }
    
    uiInstruction.style.opacity = '1';

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
    // We rotate context to draw each quadrant aligned with X grid axes
    for (let i = 0; i < 4; i++) {
        ctx.save();
        // Rotate to 0, 90, 180, 270 to center on Right, Bottom, Left, Top
        ctx.rotate((i * 90 * Math.PI) / 180);
        
        // Draw Limb Label
        ctx.fillStyle = '#333';
        ctx.font = `bold ${r * 0.14}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Position text centered on the edge of the triangle
        ctx.save();
        ctx.translate(r * 0.82, 0);
        ctx.rotate(Math.PI / 2); // Rotate text to follow the edge
        ctx.fillText(LIMBS[i], 0, 0);
        ctx.restore();

        // Draw Color Circles for this quadrant
        // Distributed within the +/- 45 degree wedge
        for (let j = 0; j < 4; j++) {
            // Map j (0-3) to angles centered around 0 axis
            // j=0 -> -33.75, j=3 -> +33.75
            const sliceAngle = (j - 1.5) * 22.5;
            const rads = (sliceAngle * Math.PI) / 180;
            
            const dotDist = r * 0.55;
            const x = Math.cos(rads) * dotDist;
            const y = Math.sin(rads) * dotDist;

            ctx.beginPath();
            ctx.arc(x, y, r * 0.085, 0, Math.PI * 2);
            ctx.fillStyle = COLORS[j];
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
    }
    
    // Draw Dividing Lines (X shape)
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 3;
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