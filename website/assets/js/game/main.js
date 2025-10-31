import { getSessionDetails } from "../auth/login.js";
import { gameScene } from "./gameScene.js";

// Checking if user is logged in
const currentUser = sessionStorage.getItem('currentUser');
if (!currentUser) {
    sessionStorage.setItem('loginMessage', 'Please log in to access the game!');
    window.location.href = '../html/landing_page.html';
}

// Tutorial System
const tutorialSteps = [
    {
        title: "🎮 Welcome to The Undead Protocol",
        content: "Survive waves of zombies in this intense FPS experience. Let's learn the basics!"
    },
    {
        title: "🏃 Movement Controls",
        content: "Use <span style='color: #ff0000; font-weight: bold;'>WASD</span> keys to move around. Press <span style='color: #ff0000; font-weight: bold;'>Shift</span> while moving to sprint at double speed. Use your <span style='color: #ff0000; font-weight: bold;'>Mouse</span> to look around 360°."
    },
    {
        title: "🔫 Combat Essentials",
        content: "<span style='color: #ff0000; font-weight: bold;'>Left Click</span> to shoot your weapon. Press <span style='color: #ff0000; font-weight: bold;'>R</span> to reload when you're low on ammo. Switch weapons using <span style='color: #ff0000; font-weight: bold;'>1, 2, 3</span> keys (Pistol, Shotgun, Rifle)."
    },
    {
        title: "💀 Survive the Undead!",
        content: "Kill zombies to earn points and progress through waves. Each wave spawns more zombies! Press <span style='color: #ff0000; font-weight: bold;'>ESC</span> anytime to view controls. Good luck, survivor!"
    }
];

let currentTutorialStep = 0;

function checkFirstTime() {
    const user = getSessionDetails();
    const username = user['username'];
    const tutorialKey = username + '_tutorialCompleted';
    return !localStorage.getItem(tutorialKey);
}

function showTutorial() {
    const tutorialOverlay = document.getElementById('tutorialOverlay');
    if (tutorialOverlay) {
        tutorialOverlay.style.display = 'flex';
        updateTutorialStep();
    }
}

function updateTutorialStep() {
    const step = tutorialSteps[currentTutorialStep];
    document.getElementById('tutorialTitle').innerHTML = step.title;
    document.getElementById('tutorialText').innerHTML = step.content;

    // Update progress dots
    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach((dot, index) => {
        if (index === currentTutorialStep) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    // Update button text on last step
    const nextBtn = document.getElementById('nextTutorial');
    if (currentTutorialStep === tutorialSteps.length - 1) {
        nextBtn.textContent = 'Start Game!';
    } else {
        nextBtn.textContent = 'Next →';
    }
}

function nextTutorialStep() {
    if (currentTutorialStep < tutorialSteps.length - 1) {
        currentTutorialStep++;
        updateTutorialStep();
    } else {
        closeTutorial();
    }
}

function closeTutorial() {
    const user = getSessionDetails();
    const username = user['username'];
    const tutorialKey = username + '_tutorialCompleted';
    localStorage.setItem(tutorialKey, 'true');

    const tutorialOverlay = document.getElementById('tutorialOverlay');
    if (tutorialOverlay) {
        tutorialOverlay.style.display = 'none';
    }

    // Request pointer lock for game controls
    canvas.requestPointerLock();
}

// Tutorial event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nextTutorial')?.addEventListener('click', nextTutorialStep);
    document.getElementById('skipTutorial')?.addEventListener('click', closeTutorial);
});

// Setting up Babylon.js game engine
const canvas = document.getElementById('canvas');
const engine = new BABYLON.Engine(canvas, true);
const currentScene = new BABYLON.Scene(engine);

// Game over screen reference
const gameOverScreen = document.getElementById('gameOverDiv')

// Initialising gameplay variables
let health = 100;
let ammo =  30;
let maxAmmo = 30;
let score =  0;
let currentWave = 1;
let zombiesKilledThisWave = 0;
let zombiesPerWave = 5; // Starting with 5 zombies per wave

// Weapon System
let currentWeapon = 'pistol';
const weapons = {
    pistol: {
        name: 'Pistol',
        damage: 20,
        maxAmmo: 30,
        fireRate: 300,
        bulletSpeed: 50,
        spread: 0
    },
    shotgun: {
        name: 'Shotgun',
        damage: 50,
        maxAmmo: 12,
        fireRate: 800,
        bulletSpeed: 40,
        spread: 0.1,
        pellets: 5
    },
    rifle: {
        name: 'Assault Rifle',
        damage: 100,
        maxAmmo: 90,
        fireRate: 100,
        bulletSpeed: 60,
        spread: 0.05
    }
};

let lastShotTime = 0;

// Update Heads-Up Display (HUD) with current game stats
function updateHUD(){
    document.getElementById('health').innerText = 'Health: ' + health;
    document.getElementById('ammo').innerText = 'Ammo: ' + ammo + '/' + maxAmmo;
    document.getElementById('score').innerText = 'Score: ' +  score;

    // Update weapon display
    const weaponDisplay = document.getElementById('weapon');
    if (weaponDisplay) {
        weaponDisplay.innerText = 'Weapon: ' + weapons[currentWeapon].name;
    }

    // Update wave display
    const waveDisplay = document.getElementById('wave');
    if (waveDisplay) {
        waveDisplay.innerText = 'Wave: ' + currentWave;
    }
}

// Check wave completion and progress to next wave
function checkWaveCompletion() {
    zombiesKilledThisWave++;

    // Check if all zombies in current wave are killed
    if (zombiesKilledThisWave >= zombiesPerWave) {
        currentWave++;
        zombiesKilledThisWave = 0;
        zombiesPerWave += zombiesPerWave; // Double zombies each wave

        // Award bonus score for completing wave
        addScore(100 * currentWave);

        // Display wave complete message
        showWaveComplete();

        // Notify gameScene to increase spawn rate
        if (window.updateWave) {
            window.updateWave(currentWave);
        }
    }

    updateHUD();
}

// Export wave completion check for use in gameScene
window.checkWaveCompletion = checkWaveCompletion;

// Display wave completion message to player
function showWaveComplete() {
    const message = document.createElement('div');
    message.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; color: #00ff00; font-weight: bold; text-shadow: 2px 2px 4px red; z-index: 1000; pointer-events: none;';
    message.textContent = 'WAVE ' + (currentWave - 1) + ' COMPLETE!';
    document.body.appendChild(message);

    // After 2 seconds show next wave starting
    setTimeout(() => {
        message.textContent = 'WAVE ' + currentWave + ' STARTING...';
    }, 2000);

    // Remove message after 4 seconds
    setTimeout(() => {
        document.body.removeChild(message);
    }, 4000);
}

// Switch between different weapons
function switchWeapon(weaponKey) {
    if (weapons[weaponKey]) {
        currentWeapon = weaponKey;
        maxAmmo = weapons[currentWeapon].maxAmmo;
        ammo = maxAmmo;
        window.playSound('reload')
        updateHUD();
        console.log('Switched to ' + weapons[currentWeapon].name);
    }
}

// Sound system with lazy loading
const sounds = {};

// Load sound file only when first played
function loadSound(soundName, path) {
    if (!sounds[soundName]) {
        sounds[soundName] = new Audio(path);
    }
    return sounds[soundName];
}

// Play sound by name
window.playSound = function(soundName) {
    const soundPaths = {
        reload: '../assets/sounds/gun_reloading.mp3',
        shoot: '../assets/sounds/pistolGunshot.mp3',
        hit: '../assets/sounds/playerHit.mp3',
        walk: '../assets/sounds/playerWalk.mp3',
        run: '../assets/sounds/playerRun.mp3',
        zombieAttack: '../assets/sounds/zombieAttack.mp3',
        zombieDying: '../assets/sounds/zombieDying.mp3',
        zombieGrowling: '../assets/sounds/zombieGrowling.mp3',
        zombieSound: '../assets/sounds/zombieSound.mp3',
        zombieScreams: '../assets/sounds/zombieScreams.mp3',
        zombieLaughter: '../assets/sounds/zombieLaughter.mp3',
        backgroundMusic: '../assets/sounds/backgroundMusic.mp3'
    };

    if (soundPaths[soundName]) {
        const sound = loadSound(soundName, soundPaths[soundName]);
        sound.currentTime = 0; // Reset to start
        sound.play().catch(err => console.log('Sound play failed:', err));
    }
}

// Background music system
let backgroundMusic = null;

// Start looping background music
window.playBackgroundMusic = function() {
    if (!backgroundMusic) {
        backgroundMusic = loadSound('backgroundMusic', '../assets/sounds/backgroundMusic.mp3');
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.3; // Lower volume for background music
    }
    backgroundMusic.play().catch(err => console.log('Background music play failed:', err));
}

// Stop background music
window.stopBackgroundMusic = function() {
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }
}

// Play random zombie ambient sounds at intervals
function playRandomZombieSounds() {
    const randomSounds = ['zombieScreams', 'zombieLaughter', 'zombieGrowling'];
    const randomSound = randomSounds[Math.floor(Math.random() * randomSounds.length)];

    window.playSound(randomSound);

    // Schedule next random sound after 10-30 seconds
    const nextInterval = Math.random() * 20000 + 10000;
    setTimeout(playRandomZombieSounds, nextInterval);
}

// Initialize audio on page load
window.addEventListener('load', () => {
    // Start background music
    window.playBackgroundMusic();

    // Start random ambient sounds after 5 seconds
    setTimeout(playRandomZombieSounds, 5000);
});

// Reload current weapon ammo to max
function reloadAmmo() {
    if (ammo < maxAmmo) {
        ammo = maxAmmo;
        updateHUD();
        console.log('Reloaded!');

        // Play reload sound effect
        if (window.playSound) {
            window.playSound('reload');
        }
    } else {
        console.log('Ammo already full!');
    }
}

// Keyboard controls for UI and weapons
const controlsOverlay = document.getElementById('controlsOverlay');
window.addEventListener('keydown', (event) => {
    // Toggle controls overlay with ESC
    if (event.key === 'Escape') {
        controlsOverlay.style.display = controlsOverlay.style.display === 'none' || controlsOverlay.style.display === '' ? 'block' : 'none';
    }
    // Reload weapon with R key
    if (event.key === 'r' || event.key === 'R') {
        reloadAmmo();
    }
    // Weapon switching with number keys
    if (event.key === '1') {
        switchWeapon('pistol');
    }
    if (event.key === '2') {
        switchWeapon('shotgun');
    }
    if (event.key === '3') {
        switchWeapon('rifle');
    }
});

// Export current weapon data for shooting system
window.getCurrentWeapon = function() {
    return {
        ...weapons[currentWeapon],
        key: currentWeapon
    };
};

// Check if enough time has passed to shoot again (fire rate limiting)
window.canShoot = function() {
    const weapon = weapons[currentWeapon];
    const currentTime = Date.now();
    if (currentTime - lastShotTime >= weapon.fireRate) {
        lastShotTime = currentTime;
        return true;
    }
    return false;
};

// Track shooting statistics for accuracy
let totalShots = 0;
let shotsHit = 0;

window.incrementShots = function() {
    totalShots++;
}

window.incrementHits = function() {
    shotsHit++;
}

// Display game over screen with final stats
function showGameOver(){
    let scoreText = document.getElementById('score').innerText;
    let user =  getSessionDetails()
    let username = user['username']
    let finalScore = parseInt(scoreText.split(': ')[1]) || 0;

    // Calculate total kills
    const totalKills = zombiesKilledThisWave + ((currentWave - 1) * zombiesPerWave);

    // Calculate accuracy
    const accuracy = totalShots > 0 ? Math.round((shotsHit / totalShots) * 100) : 0;

    // Display final score
    document.getElementById('finalScore').innerText = finalScore;

    // Display final wave reached
    document.getElementById('finalWave').innerText = currentWave;

    // Display total zombies killed
    document.getElementById('finalKills').innerText = totalKills;

    // Display accuracy
    document.getElementById('finalAccuracy').innerText = accuracy + '%';

    // Check for personal best
    const userKey = username + '_bestScore';
    const previousBest = localStorage.getItem(userKey);
    if (!previousBest || finalScore > parseInt(previousBest)) {
        localStorage.setItem(userKey, finalScore.toString());
        // Show personal best badge
        document.getElementById('personalBest').style.display = 'inline-block';
    }

    console.log(scoreText)
    // Save stats to leaderboard
    updateLeaderBoard(username, scoreText)
    // Show game over screen and stop rendering
    document.getElementById('gameOverScreen').style.display = 'block';
    engine.stopRenderLoop();

}

// Update leaderboard with player stats
function updateLeaderBoard(username, score){
    let leaderboardObj = localStorage.getItem('leaderboard')
    let leaderboard = leaderboardObj ? JSON.parse(leaderboardObj) : []

    // Calculate total kills for this game
    const totalKills = zombiesKilledThisWave + ((currentWave - 1) * (zombiesPerWave / 2));

    // Add new entry with all player stats
    leaderboard.push({
        'username': username,
        'score': parseInt(score.split(': ')[1]) || 0,
        'wave': currentWave,
        'kills': totalKills
    })

    leaderboard.sort((a, b) => b.score - a.score);

    // Save back to localStorage
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard))
}


// Reduce player health and show damage effect
function takeDamage(amount){
    if (health > 0) {
        health -= amount
        updateHUD();

        // Flash red damage overlay on screen
        const damageOverlay = document.getElementById('damageOverlay');
        if (damageOverlay) {
            damageOverlay.style.opacity = '1';
            setTimeout(() => {
                damageOverlay.style.opacity = '0';
            }, 200);
        }
    }
    // Check if player died
    if (health <= 0){
        showGameOver()
    }
}

// Export takeDamage to be accessible from gameScene
window.takeDamage = takeDamage;

// Increase player score
function addScore(points) {
    score += points;
    updateHUD();
}

// Export addScore to be accessible from gameScene
window.addScore = addScore;

// Restore player health (capped at 100)
function addHealth(amount) {
    health = Math.min(health + amount, 100); // Cap at 100
    updateHUD();
}

// Export addHealth
window.addHealth = addHealth;

// Add ammo to current weapon (capped at maxAmmo)
function addAmmo(amount) {
    ammo = Math.min(ammo + amount, maxAmmo); // Cap at maxAmmo
    updateHUD();
}

// Export addAmmo
window.addAmmo = addAmmo;

// Decrease ammo when firing weapon
function fireAmmo(){
    if(ammo > 0){
        ammo--
    } else if(ammo <= 0){
        console.log('Out of ammo')
    }
}

// Check if player is already dead
if (health <= 0){
    showGameOver()
}

// Initialize HUD display
updateHUD();

// Create first-person camera
const camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5, -10), currentScene);
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, true); 


// Crosshair animation system
const crosshair = document.getElementById('crosshair');

function showShootingCrosshair() {
    crosshair.classList.add('shooting');
    setTimeout(() => {
        crosshair.classList.remove('shooting');
    }, 100);
}

// Hit marker display function
window.showHitMarker = function() {
    const hitMarker = document.createElement('div');
    hitMarker.className = 'hit-marker';
    document.body.appendChild(hitMarker);

    setTimeout(() => {
        document.body.removeChild(hitMarker);
    }, 300);
}

// Main game initialization function
async function main(BABYLON, currentScene, engine) {
    // Check if first time user and show tutorial
    if (checkFirstTime()) {
        showTutorial();
    } else {
        // Request pointer lock for returning users
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock();
        }, { once: true });
    }

    // Initialize game scene with player, zombies, and environment
    const scene = await gameScene(BABYLON, currentScene, engine, canvas);

    // Mouse click to shoot weapon
    canvas.addEventListener('click', () => {
        if (ammo > 0 && window.canShoot && window.canShoot()) {
            const weapon = window.getCurrentWeapon();

            // Play gunshot sound
            window.playSound('shoot');

            // Show shooting crosshair animation
            showShootingCrosshair();

            // Track shots fired for accuracy
            window.incrementShots();

            // Shotgun fires multiple pellets in spread
            if (weapon.key === 'shotgun' && weapon.pellets) {
                for (let i = 0; i < weapon.pellets; i++) {
                    window.shootBullet(weapon);
                }
            } else {
                // Single bullet for pistol and rifle
                window.shootBullet(weapon);
            }

            ammo--;
            updateHUD();
        } else if (ammo <= 0) {
            console.log('Out of ammo!');
        }
    });

    // Start game render loop
    engine.runRenderLoop(() => {
        scene.render();
    });
}

// Start the game
main(BABYLON, currentScene, engine);

// Handle window resize
window.addEventListener('resize', function() {
    engine.resize();
});

// Restart game by reloading the page
document.getElementById('restartButton').addEventListener('click', () =>{
    location.reload();
})