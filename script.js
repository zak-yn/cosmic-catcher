// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// --- Game Constants ---
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// PLAYER (Spaceship)
const PLAYER_WIDTH = 60; // Adjust if using an image
const PLAYER_HEIGHT = 40; // Adjust if using an image
const PLAYER_SPEED = 25;
// const PLAYER_COLOR = '#2c3e50'; // Will use image or new color

// COLLECTIBLES (Stars/Crystals) & HAZARDS (Asteroids)
const OBJECT_SIZE = 30; // Approx size for images, adjust as needed
const STAR_COLOR = '#f1c40f'; // Yellow for stars (fallback)
const ASTEROID_COLOR = '#808080'; // Gray for asteroids (fallback)

const OBJECT_FALL_SPEED_MIN = 1;
const OBJECT_FALL_SPEED_MAX = 3;
const OBJECT_SPAWN_INTERVAL = 1200; // Milliseconds
const ASTEROID_CHANCE = 0.3; // 30% chance an object is an asteroid

// --- Image Loading (NEW) ---
let spaceshipImg, starImg, asteroidImg;
let imagesLoaded = 0;
const totalImages = 3; // Set to 0 if not using images

function loadImages() {
    if (totalImages === 0) { // Skip if not using images
        preloadDone();
        return;
    }

    spaceshipImg = new Image();
    spaceshipImg.src = 'images/spaceship.png'; // Make sure path is correct
    spaceshipImg.onload = imageLoaded;
    spaceshipImg.onerror = () => console.error("Failed to load spaceship.png. Using fallback color.");

    starImg = new Image();
    starImg.src = 'images/star.png';
    starImg.onload = imageLoaded;
    starImg.onerror = () => console.error("Failed to load star.png. Using fallback color.");


    asteroidImg = new Image();
    asteroidImg.src = 'images/asteroid.png';
    asteroidImg.onload = imageLoaded;
    asteroidImg.onerror = () => console.error("Failed to load asteroid.png. Using fallback color.");
}

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        preloadDone();
    }
}

function preloadDone() {
    // This function is called when all images are loaded (or if no images)
    // Now it's safe to start the game or draw initial screen with images
    console.log("Preloading complete. Ready to draw initial screen.");
    drawInitialScreen(); // Draw initial screen once images (if any) are ready
}


// --- Background Stars (NEW) ---
const bgStars = [];
const numBgStars = 50;
function createBgStars() {
    for (let i = 0; i < numBgStars; i++) {
        bgStars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            radius: Math.random() * 1.5, // Small stars
            alpha: Math.random() * 0.5 + 0.5 // Varying brightness
        });
    }
}
createBgStars(); // Create them once

function drawBgStars() {
    ctx.fillStyle = '#000011'; // Dark space background
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    bgStars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();
    });
}


// --- Game State Variables ---
let score;
let lives;
let gameObjects; // Array to hold falling stars and asteroids
let gameIntervalId;
let objectSpawnTimerId;
let animationFrameId;
let isGameRunning = false;

// --- Player Object ---
const player = {
    x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: CANVAS_HEIGHT - PLAYER_HEIGHT - 10,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    // color: PLAYER_COLOR, // Removed, will use image or new color
    speed: PLAYER_SPEED
};

// --- Game Initialization ---
function initGame() {
    score = 0;
    lives = 3;
    gameObjects = [];
    player.x = CANVAS_WIDTH / 2 - player.width / 2;
    isGameRunning = true;

    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    gameOverScreen.classList.add('hidden');
    startButton.classList.add('hidden');

    if (objectSpawnTimerId) clearInterval(objectSpawnTimerId);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    objectSpawnTimerId = setInterval(spawnObject, OBJECT_SPAWN_INTERVAL);
    gameLoop();
}

// --- Drawing Functions ---
function drawPlayer() {
    if (spaceshipImg && spaceshipImg.complete && spaceshipImg.naturalWidth !== 0) {
        ctx.drawImage(spaceshipImg, player.x, player.y, player.width, player.height);
    } else {
        // Fallback if image fails to load or not used
        ctx.fillStyle = '#7f8c8d'; // Grayish spaceship color
        ctx.fillRect(player.x, player.y, player.width, player.height);
        // Simple triangle for nose
        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 2, player.y - 5);
        ctx.lineTo(player.x, player.y);
        ctx.lineTo(player.x + player.width, player.y);
        ctx.closePath();
        ctx.fillStyle = '#95a5a6';
        ctx.fill();
    }
}

function drawGameObjects() {
    gameObjects.forEach(obj => {
        if (obj.isAsteroid) {
            if (asteroidImg && asteroidImg.complete && asteroidImg.naturalWidth !== 0) {
                ctx.drawImage(asteroidImg, obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
            } else {
                // Fallback asteroid (circle)
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, obj.size / 2, 0, Math.PI * 2);
                ctx.fillStyle = ASTEROID_COLOR;
                ctx.fill();
                ctx.strokeStyle = "#595959";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.closePath();
            }
        } else { // It's a star/collectible
            if (starImg && starImg.complete && starImg.naturalWidth !== 0) {
                ctx.drawImage(starImg, obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
            } else {
                // Fallback star (drawing a simple star shape)
                ctx.fillStyle = STAR_COLOR;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(
                        obj.x + (obj.size / 2) * Math.cos( (18 + i * 72) * Math.PI / 180 ),
                        obj.y + (obj.size / 2) * Math.sin( (18 + i * 72) * Math.PI / 180 )
                    );
                    ctx.lineTo(
                        obj.x + (obj.size / 4) * Math.cos( (54 + i * 72) * Math.PI / 180 ),
                        obj.y + (obj.size / 4) * Math.sin( (54 + i * 72) * Math.PI / 180 )
                    );
                }
                ctx.closePath();
                ctx.fill();
            }
        }
    });
}

// --- Game Logic Functions ---
function spawnObject() {
    if (!isGameRunning) return;

    const x = Math.random() * (CANVAS_WIDTH - OBJECT_SIZE) + OBJECT_SIZE / 2;
    const y = -OBJECT_SIZE / 2; // Start just above the canvas
    const speed = Math.random() * (OBJECT_FALL_SPEED_MAX - OBJECT_FALL_SPEED_MIN) + OBJECT_FALL_SPEED_MIN;
    const isAsteroid = Math.random() < ASTEROID_CHANCE;

    gameObjects.push({
        x,
        y,
        size: OBJECT_SIZE, // Using a single size for simplicity, can be randomized
        speed,
        isAsteroid
    });
}

function updateGameObjects() {
    for (let i = gameObjects.length - 1; i >= 0; i--) {
        const obj = gameObjects[i];
        obj.y += obj.speed;

        // Collision detection (simplified, treats player as rectangle, objects as circles from center)
        // More accurate would be AABB (Axis-Aligned Bounding Box) for two rects
        // or checking if object's rect overlaps player's rect.
        // For circle-like objects and rect player:
        const objCenterX = obj.x;
        const objCenterY = obj.y;
        const objRadius = obj.size / 2;

        // Find closest point on player rectangle to object's center
        const closestX = Math.max(player.x, Math.min(objCenterX, player.x + player.width));
        const closestY = Math.max(player.y, Math.min(objCenterY, player.y + player.height));

        // Calculate distance between object's center and closest point
        const distanceX = objCenterX - closestX;
        const distanceY = objCenterY - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        if (distanceSquared < (objRadius * objRadius)) { // Collision!
            if (obj.isAsteroid) {
                lives--;
                livesDisplay.textContent = lives;
                // playMissSound(); // You'd implement sound functions
                if (lives <= 0) {
                    endGame();
                }
            } else { // Caught a star
                score++;
                scoreDisplay.textContent = score;
                // playCatchSound();
            }
            gameObjects.splice(i, 1); // Remove caught/collided object
        }
        // Check if object missed (hit bottom)
        else if (obj.y - obj.size / 2 > CANVAS_HEIGHT) {
            if (!obj.isAsteroid) { // Only lose a life if a STAR is missed
                lives--;
                livesDisplay.textContent = lives;
                // playMissSound();
                if (lives <= 0) {
                    endGame();
                }
            }
            gameObjects.splice(i, 1); // Remove missed object
        }
    }
}

function endGame() {
    isGameRunning = false;
    clearInterval(objectSpawnTimerId);
    cancelAnimationFrame(animationFrameId);

    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.remove('hidden');
    startButton.classList.remove('hidden');
    startButton.textContent = "Restart Mission";
}

// --- Game Loop ---
function gameLoop() {
    if (!isGameRunning) return;

    // 1. Clear canvas (done by drawBgStars)
    drawBgStars(); // This also clears by drawing the solid background

    // 2. Update
    updateGameObjects();

    // 3. Draw
    drawPlayer();
    drawGameObjects();

    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---
function handleKeyDown(event) {
    if (!isGameRunning) return;

    if (event.key === 'ArrowLeft' || event.key === 'a') {
        player.x -= player.speed;
        if (player.x < 0) player.x = 0;
    } else if (event.key === 'ArrowRight' || event.key === 'd') {
        player.x += player.speed;
        if (player.x + player.width > CANVAS_WIDTH) {
            player.x = CANVAS_WIDTH - player.width;
        }
    }
}
document.addEventListener('keydown', handleKeyDown);

startButton.addEventListener('click', () => {
    if (!isGameRunning) {
        initGame();
    }
});

restartButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    initGame();
});

// --- Initial Setup ---
function drawInitialScreen() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBgStars(); // Draw the starry background

    // Draw the player in its starting position if images are ready or using fallback
    if ((spaceshipImg && spaceshipImg.complete) || totalImages === 0) {
         drawPlayer();
    }

    ctx.font = "bold 28px Orbitron, sans-serif";
    ctx.fillStyle = "#00ffea"; // Cyan/teal text
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 255, 234, 0.7)";
    ctx.shadowBlur = 10;
    ctx.fillText("Press Start to Launch!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.font = "16px Orbitron, sans-serif";
    ctx.fillText("Use Arrow Keys or A/D to Move", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    ctx.shadowColor = "transparent"; // Reset shadow
    ctx.shadowBlur = 0;
}

// Start image loading, which will then call drawInitialScreen
loadImages(); // THIS IS IMPORTANT - starts the loading process