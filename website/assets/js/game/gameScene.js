// Create ground plane with textured material and physics
function createGround(BABYLON, scene){
   const ground = BABYLON.MeshBuilder.CreateGround('ground', {width:100, height:100}, scene);

   // Create material with diffuse and normal textures
   const groundMaterial = new BABYLON.StandardMaterial('groundMat', scene)
   const diffuseTex = new BABYLON.Texture('../assets/textures/groundTexDiffuse.jpg', scene)
    const normalTex = new BABYLON.Texture('../assets/textures/groundTexNormal.jpg', scene)
    groundMaterial.diffuseTexture = diffuseTex
    groundMaterial.normalTexture = normalTex
    ground.material = groundMaterial

    // Scale textures for tiling effect
    diffuseTex.uScale = 10
    diffuseTex.vScale = 10
    normalTex.uScale = 10
    normalTex.vScale = 10

    // Remove specular highlights
    groundMaterial.specularColor = new BABYLON.Color3(0,0,0)

    // Add physics to ground (static body with mass 0)
    new BABYLON.PhysicsAggregate(
        ground,
        BABYLON.PhysicsShapeType.BOX,
        { mass: 0 },
        scene
    );

    return ground
}


// Create invisible walls around the game area to keep player and zombies contained
function gameBoundaries(BABYLON, scene){
    const wallHeight = 3;
    const wallThickness = 0.1;
    const wallLength = 100;

    // Create left wall
    const wall1 = BABYLON.MeshBuilder.CreateBox('wall1', { width: wallThickness, height: wallHeight, depth: wallLength }, scene);
    wall1.position = new BABYLON.Vector3(-50, wallHeight / 2, 0);
    wall1.checkCollisions = true
    new BABYLON.PhysicsAggregate(wall1, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, scene);

    // Create right wall
    const wall2 = BABYLON.MeshBuilder.CreateBox('wall2', { width: wallThickness, height: wallHeight, depth: wallLength }, scene);
    wall2.position = new BABYLON.Vector3(50, wallHeight / 2, 0);
    wall2.checkCollisions = true
    new BABYLON.PhysicsAggregate(wall2, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, scene);

    // Create back wall
    const wall3 = BABYLON.MeshBuilder.CreateBox('wall3', { width: wallLength, height: wallHeight, depth: wallThickness }, scene);
    wall3.position = new BABYLON.Vector3(0, wallHeight / 2, -50);
    wall3.checkCollisions = true
    new BABYLON.PhysicsAggregate(wall3, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, scene);

    // Create front wall
    const wall4 = BABYLON.MeshBuilder.CreateBox('wall4', { width: wallLength, height: wallHeight, depth: wallThickness }, scene);
    wall4.position = new BABYLON.Vector3(0, wallHeight / 2, 50);
    wall4.checkCollisions = true
    new BABYLON.PhysicsAggregate(wall4, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, scene);

    return
};

// Store building positions globally to avoid spawn overlaps
const buildingPositions = [];

// Create random building obstacles with collision barriers (async to ensure barriers load first)
async function createRandomObstacles(BABYLON, scene, numberOfObstacles) {
    const loadPromises = [];

    for (let i = 0; i < numberOfObstacles; i++) {
        // Generate random position within game area
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        const scale = Math.random() * 2 + 1; // Random scale between 1 and 3

        // Store building position and radius for safe spawn checking
        buildingPositions.push({ x: x, z: z, radius: scale * 5 });

        // Load cottage model asynchronously
        const loadPromise = BABYLON.SceneLoader.ImportMeshAsync("", "../assets/models/", "cottage.glb", scene)
            .then((result) => {
                const building = result.meshes[0];
                building.position = new BABYLON.Vector3(x, 0, z);
                building.scaling = new BABYLON.Vector3(scale, scale, scale);

                // Enable collision detection for all building meshes
                result.meshes.forEach(mesh => {
                    mesh.checkCollisions = true;
                    if (mesh.material) {
                        mesh.material.backFaceCulling = true; // Prevent seeing inside building
                    }
                });

                // Create invisible cylindrical barrier around building
                const barrierRadius = scale * 5 + 1.5; // Building radius + 1.5m buffer
                const barrier = BABYLON.MeshBuilder.CreateCylinder('buildingBarrier', {
                    diameter: barrierRadius * 2,
                    height: 15,
                    tessellation: 32 // More tessellation = smoother circular collision
                }, scene);
                barrier.position = new BABYLON.Vector3(x, 7.5, z);
                barrier.visibility = 0; // Make barrier invisible
                barrier.checkCollisions = true; // Enable collision for player

                // Add physics to barrier for zombie collisions
                const barrierPhysics = new BABYLON.PhysicsAggregate(
                    barrier,
                    BABYLON.PhysicsShapeType.CYLINDER,
                    { mass: 0, restitution: 0, friction: 0 },
                    scene
                );
                barrierPhysics.body.setCollisionCallbackEnabled(true);

                // Add physics to building using BOX shape (MESH shape causes geometry errors)
                const buildingPhysics = new BABYLON.PhysicsAggregate(
                    building,
                    BABYLON.PhysicsShapeType.BOX,
                    { mass: 0, restitution: 0, friction: 0 },
                    scene
                );
                buildingPhysics.body.setCollisionCallbackEnabled(true);
            })
            .catch((error) => {
                console.error("Error loading building model:", error);
            });

        loadPromises.push(loadPromise);
    }

    // Wait for all buildings and barriers to load before continuing
    await Promise.all(loadPromises);
    console.log("All buildings and barriers loaded!");
}

// Check if spawn position is safe (not too close to buildings)
function isSafePosition(x, z, minDistance = 5) {
    for (let building of buildingPositions) {
        const dx = x - building.x;
        const dz = z - building.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Check if position is too close to building
        if (distance < building.radius + minDistance) {
            return false;
        }
    }
    return true;
}

// Generate random spawn position away from buildings
function getRandomSafePosition(minDistance = 5, maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;

        if (isSafePosition(x, z, minDistance)) {
            return { x: x, z: z };
        }
    }
    // Fallback to origin if no safe spot found
    return { x: 0, z: 0 };
}



// Main game scene initialization
async function gameScene(BABYLON, currentScene, engine, canvas) {
    const scene = new BABYLON.Scene(engine);

    // Initialize Havok physics engine
    const havokInstance = await HavokPhysics();
    const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);
    scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), havokPlugin);

    // Store gravity vector for physics calculations
    const gravity = new BABYLON.Vector3(0, -9.81, 0);

    // Create first-person camera at player eye height (1.6m)
    const cam = new BABYLON.FreeCamera('FPSCamera', new BABYLON.Vector3(0, 1.6, -10), scene);
    cam.setTarget(BABYLON.Vector3.Zero());
    cam.attachControl(canvas, true);
    cam.checkCollisions = true;
    cam.applyGravity = false;
    cam.ellipsoid = new BABYLON.Vector3(0.5, 0.9, 0.5); // Capsule-shaped collision

    // Enable pointer lock for FPS mouse controls
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
        if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
    });

    // Exit pointer lock on ESC key
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
            if (document.exitPointerLock) {
                document.exitPointerLock();
            }
        }
    });

    // Handle pointer lock changes (cross-browser compatibility)
    document.addEventListener('pointerlockchange', () => {
        if (!document.pointerLockElement) {
            console.log('Pointer lock released - click canvas to re-enable FPS controls');
        }
    });

    document.addEventListener('mozpointerlockchange', () => {
        if (!document.mozPointerLockElement) {
            console.log('Pointer lock released - click canvas to re-enable FPS controls');
        }
    });

    document.addEventListener('webkitpointerlockchange', () => {
        if (!document.webkitPointerLockElement) {
            console.log('Pointer lock released - click canvas to re-enable FPS controls');
        }
    });

    // Create ambient hemisphere light
    const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Create directional sunlight
    const dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1,-2,-1), scene)
    dirLight.position = new BABYLON.Vector3(0,5,0)
    dirLight.intensity = 0.5

    // Create environment
    createGround(BABYLON, scene)
    gameBoundaries(BABYLON, scene)

    // Wait for all buildings to load before spawning entities
    await createRandomObstacles(BABYLON, scene, 5)

    // Create invisible collision body for player physics
    const playerCollisionBody = BABYLON.MeshBuilder.CreateBox('playerCollision', {size:1}, scene)

    // Spawn player at safe position away from buildings
    const playerSafePos = getRandomSafePosition(10);
    playerCollisionBody.position = new BABYLON.Vector3(playerSafePos.x, 1.6, playerSafePos.z);

    playerCollisionBody.visibility = 0
    playerCollisionBody.checkCollisions = true
    playerCollisionBody.ellipsoid = new BABYLON.Vector3(0.8, 1.0, 0.8); // Larger collision shape to prevent clipping
    playerCollisionBody.ellipsoidOffset = new BABYLON.Vector3(0, 0, 0);

    // Add physics to player collision body so zombies can detect collision
    const playerAggregate = new BABYLON.PhysicsAggregate(
        playerCollisionBody,
        BABYLON.PhysicsShapeType.BOX,
        { mass: 0 },  // mass 0 = static body (won't be pushed by zombies)
        scene
    );

    // Enable collision callbacks for player
    playerAggregate.body.setCollisionCallbackEnabled(true);

    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR; 
    scene.fogStart = 20;
    scene.fogEnd = 50; 

    // Movement Variable
    const walkSpeed = 0.1;
    const runSpeed = 0.2;
    let keys = {}


    window.addEventListener('keydown', (event) => {
        keys[event.key] = true;
    } )

    window.addEventListener('keyup', (event) => {
        keys[event.key] = false;
    })


    // Enemies spawning logic
    const enemies = []
    const spawnRate = 2000

    async function spawnEnemy(){
        const result = await BABYLON.SceneLoader.ImportMeshAsync('', '../assets/models/', 'Zombie.glb', scene);

        // Get all imported meshes and animations
        const meshes = result.meshes;
        const rootMesh = meshes[0];
        const animationGroups = result.animationGroups;

        // Store animations by name for easy access
        const animations = {};
        animationGroups.forEach(anim => {
            animations[anim.name.toLowerCase()] = anim;
            anim.stop(); 
        });

        console.log('Available animations:', Object.keys(animations));

        // Create a simple collision box as the physics body
        const collisionBox = BABYLON.MeshBuilder.CreateBox('enemyCollision', {width: 0.5, height: 2, depth: 0.4}, scene);
        // Get a safe spawn position away from buildings
        const safePos = getRandomSafePosition(5);
        collisionBox.position = new BABYLON.Vector3(safePos.x, 1, safePos.z);
        collisionBox.visibility = 0; // Make it invisible
        collisionBox.checkCollisions = true;

        // Parent the visual zombie mesh to the physics body (not the other way around)
        rootMesh.parent = collisionBox;
        rootMesh.position = new BABYLON.Vector3(0, -1, 0); // Offset so zombie's feet are at ground level

        // Apply physics to the collision box
        const enemyAggregate = new BABYLON.PhysicsAggregate(
            collisionBox,
            BABYLON.PhysicsShapeType.BOX,
            { mass: 1, restitution: 0, friction: 0.5 },
            scene
        );

        // Lock rotation so zombies don't fall over
        enemyAggregate.body.setAngularDamping(10);
        enemyAggregate.body.setMassProperties({ inertia: BABYLON.Vector3.Zero() });

        // Reduce linear damping so zombies can move
        enemyAggregate.body.setLinearDamping(0.5);

        // Enable collision detection with buildings
        enemyAggregate.body.setCollisionCallbackEnabled(true);

        // Add health system and animation state
        const enemyData = {
            mesh: rootMesh,
            physics: enemyAggregate,
            collisionBox: collisionBox,
            health: 100,
            maxHealth: 100,
            speed: 2, 
            normalSpeed: 2,
            slowedSpeed: 0,  
            lastAttackTime: 0,  
            attackCooldown: 2500,  
            animations: animations,
            currentAnimation: null,
            state: 'idle',  
            isDead: false,
            isSlowed: false
        };

        // Helper function to play animation
        enemyData.playAnimation = function(animName, force = false) {
            // Don't play if dead, unless forced or it's the death animation
            if (this.isDead && animName !== 'death') return;

            // Don't play same animation unless forced (for hit animations that need to replay)
            if (this.currentAnimation === animName && !force) return;

            // Stop current animation
            if (this.currentAnimation && this.animations[this.currentAnimation]) {
                this.animations[this.currentAnimation].stop();
            }

            // Play new animation
            if (this.animations[animName]) {
                // Loop = true, Speed = 1.0, Reset to start, Loop enabled
                this.animations[animName].start(true, 1.0);
                this.currentAnimation = animName;
            }
        };

        // Start with idle animation
        enemyData.playAnimation('idle');

        // Attack will be handled by distance check in main game loop instead of collision

        enemies.push(enemyData);
    }


    
    setInterval(spawnEnemy, spawnRate)



   scene.registerBeforeRender(() => {
    const forward = cam.getDirection(BABYLON.Axis.Z); // Forward direction
    const right = cam.getDirection(BABYLON.Axis.X); // Right direction

    const movement = new BABYLON.Vector3(0, 0, 0); // Initialize movement vector

    // Determine current speed based on Shift key
    const currentSpeed = keys['Shift'] ? runSpeed : walkSpeed;

    // Update movement vector based on key states
    if (keys['w']) {
        movement.addInPlace(forward.scale(currentSpeed)); // Move forward
    }
    if (keys['s']) {
        movement.subtractInPlace(forward.scale(currentSpeed)); // Move backward
    }
    if (keys['a']) {
        movement.subtractInPlace(right.scale(currentSpeed)); // Move left
    }
    if (keys['d']) {
        movement.addInPlace(right.scale(currentSpeed)); // Move right
    }

    // Move the player collision body with collision detection
    playerCollisionBody.moveWithCollisions(movement);

    // Update camera position to match the collision body, keeping the camera's height fixed
    cam.position.x = playerCollisionBody.position.x; // Update X position
    cam.position.z = playerCollisionBody.position.z; // Update Z position
    cam.position.y = 1.6; // Keep the camera height fixed
    playerCollisionBody.position.y = 1.6

    // AI: Move zombies toward player
    enemies.forEach(enemy => {
        if (!enemy.collisionBox || !enemy.physics || enemy.isDead) return;

        // Skip AI if zombie is in hit state (playing takenHit animation)
        if (enemy.state === 'hit') return;

        // Get direction from zombie to player
        const zombiePos = enemy.collisionBox.position;
        const playerPos = playerCollisionBody.position;
        const direction = playerPos.subtract(zombiePos);
        direction.y = 0; // Keep movement horizontal only
        const distance = direction.length();

        // Always rotate zombie to face player
        if (distance > 0.1) {
            direction.normalize();
            const angle = Math.atan2(direction.x, direction.z);
            const targetRotation = new BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, angle);
            enemy.physics.body.transformNode.rotationQuaternion = targetRotation;
        }

        // Determine animation based on distance and state
        const attackRange = 1.2; // Attack range

        if (distance > attackRange) {
            // Moving toward player - check for obstacles
            // Raycast to check if there's a building in the way
            const ray = new BABYLON.Ray(zombiePos, direction, distance);
            const hit = scene.pickWithRay(ray, (mesh) => {
                return mesh.name.includes('buildingBarrier') || mesh.name.includes('Cottage');
            });

            // Only move if path is clear (no building blocking)
            if (!hit || !hit.hit) {
                // Calculate velocity for zombie to move toward player at full speed
                const velocity = direction.scale(enemy.speed);

                // Get current velocity and update only X and Z (keep Y for gravity)
                const currentVelocity = enemy.physics.body.getLinearVelocity();
                enemy.physics.body.setLinearVelocity(new BABYLON.Vector3(
                    velocity.x,
                    currentVelocity.y, // Preserve vertical velocity (gravity)
                    velocity.z
                ));

                // Play running animation when far, walking when closer
                if (distance > 5) {
                    enemy.playAnimation('running');
                } else {
                    enemy.playAnimation('waling');
                }
            } else {
                // Building in the way - stop movement and idle
                const currentVelocity = enemy.physics.body.getLinearVelocity();
                enemy.physics.body.setLinearVelocity(new BABYLON.Vector3(0, currentVelocity.y, 0));
                enemy.playAnimation('idle');
            }
        } else {
            // Within attack range - stop and attack
            const currentVelocity = enemy.physics.body.getLinearVelocity();
            enemy.physics.body.setLinearVelocity(new BABYLON.Vector3(0, currentVelocity.y, 0));

            // Check if enough time has passed since last attack (cooldown)
            const currentTime = Date.now();
            if (currentTime - enemy.lastAttackTime >= enemy.attackCooldown) {
                enemy.lastAttackTime = currentTime;

                // Play attack animation and sound
                enemy.playAnimation('attack');
                if (window.playSound) {
                    window.playSound('zombieAttack');
                }

                // Deal damage to player after short delay (animation timing)
                setTimeout(() => {
                    if (window.takeDamage) {
                        window.takeDamage(10);  // 10 damage per hit
                    }
                    // Play player hit sound
                    if (window.playSound) {
                        window.playSound('hit');
                    }
                }, 300);
            } else {
                // Cooldown active - play idle if not attacking
                if (enemy.currentAnimation !== 'attack') {
                    enemy.playAnimation('idle');
                }
            }
        }
    });
});

// Shooting will be handled in main.js to access ammo variable
// Export the shoot function and camera reference
window.shootBullet = function() {
    // Raycast from screen center (where crosshair is) to get target point
    const ray = scene.createPickingRay(
        scene.getEngine().getRenderWidth() / 2,
        scene.getEngine().getRenderHeight() / 2,
        BABYLON.Matrix.Identity(),
        cam
    );

    // Get the target point - either hit point or max distance point
    const pickInfo = scene.pickWithRay(ray);
    const targetPoint = pickInfo.hit
        ? pickInfo.pickedPoint
        : ray.origin.add(ray.direction.scale(1000)); // Max range if no hit

    // Spawn bullet slightly forward from camera to avoid collision with player
    const spawnOffset = cam.getDirection(BABYLON.Axis.Z).scale(0.5);
    const bulletSpawn = cam.position.add(spawnOffset);

    // Calculate direction from bullet spawn to target
    const shootDirection = targetPoint.subtract(bulletSpawn).normalize();

    shoot(bulletSpawn, shootDirection);
}

function shoot(position, direction){
    // Create muzzle flash using a mesh (more reliable and visible than particles)
    const flash = BABYLON.MeshBuilder.CreatePlane("muzzleFlash", {size: 0.5}, scene);
    flash.position = position.clone();

    // Billboard mode so it always faces camera
    flash.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

    // Create bright emissive material
    const flashMaterial = new BABYLON.StandardMaterial("flashMat", scene);
    flashMaterial.emissiveColor = new BABYLON.Color3(1, 0.7, 0); // Bright orange
    flashMaterial.disableLighting = true;
    flashMaterial.alpha = 0.8;
    flash.material = flashMaterial;

    // Animate flash - scale up quickly then fade out
    let flashTime = 0;
    const flashInterval = setInterval(() => {
        flashTime += 16; // ~60fps
        const progress = flashTime / 100; // 100ms total duration

        if (progress >= 1) {
            clearInterval(flashInterval);
            flash.dispose();
        } else {
            // Scale grows quickly then shrinks
            const scale = progress < 0.3 ? progress * 5 : (1 - progress) * 1.5;
            flash.scaling = new BABYLON.Vector3(scale, scale, scale);
            flashMaterial.alpha = 1 - progress; // Fade out
        }
    }, 16);

    // Create bullet
    const bullet = BABYLON.MeshBuilder.CreateSphere('bullet', {diameter: 0.05}, scene);
    bullet.position = position.clone();
    bullet.checkCollisions = true

    // Add bright material for visibility
    const bulletMaterial = new BABYLON.StandardMaterial('bulletMat', scene);
    bulletMaterial.emissiveColor = new BABYLON.Color3(1, 1, 0); // Bright yellow
    bullet.material = bulletMaterial;

    // Use Physics V2 API - PhysicsAggregate instead of PhysicsImpostor
    const bulletAggregate = new BABYLON.PhysicsAggregate(
        bullet,
        BABYLON.PhysicsShapeType.SPHERE,
        { mass: 1, restitution: 0.1, friction: 0.5 },
        scene
    );

    // Apply velocity using Physics V2 API
    bulletAggregate.body.setLinearVelocity(direction.scale(50));

    // Set up collision detection with zombies
    let bulletDisposed = false;
    bulletAggregate.body.setCollisionCallbackEnabled(true);

    const observable = bulletAggregate.body.getCollisionObservable();
    observable.add((collisionEvent) => {
        if (bulletDisposed) return;

        const collidedWith = collisionEvent.collidedAgainst.transformNode;

        // Check if we hit a zombie collision box
        if (collidedWith && collidedWith.name === 'enemyCollision') {
            // Find the zombie in the enemies array
            const enemyIndex = enemies.findIndex(e => e.collisionBox === collidedWith);
            if (enemyIndex !== -1) {
                const enemy = enemies[enemyIndex];

                // Reduce health by 34 (3 shots to kill)
                enemy.health -= 34;

                // Track successful hit for accuracy
                if (window.incrementHits) {
                    window.incrementHits();
                }

                // Show hit marker on successful hit
                if (window.showHitMarker) {
                    window.showHitMarker();
                }

                // Play hit animation and stop zombie movement (if not dead)
                if (enemy.health > 0 && !enemy.isDead) {
                    // Stop zombie movement
                    enemy.physics.body.setLinearVelocity(new BABYLON.Vector3(0, 0, 0));

                    // Rotate zombie to face direction of bullet (opposite of bullet direction)
                    const zombiePos = enemy.collisionBox.position;
                    const bulletDirection = direction.clone();
                    bulletDirection.y = 0; // Keep rotation horizontal only

                    if (bulletDirection.length() > 0.1) {
                        bulletDirection.normalize();
                        // Use opposite direction since zombie should face where bullet came from
                        const angle = Math.atan2(bulletDirection.x, bulletDirection.z);

                        // Rotate the collision box which rotates the entire zombie
                        enemy.collisionBox.rotation.y = angle;
                    }

                    // Play hit animation (force it to play even if already playing)
                    enemy.playAnimation('takenhit', true);
                    enemy.isSlowed = true;
                    enemy.speed = 0; // Stop completely during hit animation
                    enemy.state = 'hit'; // Set state to prevent AI from overriding

                    // Return to normal speed after hit animation (1.5 seconds)
                    setTimeout(() => {
                        enemy.isSlowed = false;
                        enemy.speed = enemy.normalSpeed;
                        enemy.state = 'idle'; // Reset state
                    }, 1500);
                }

                // Check if zombie is dead
                if (enemy.health <= 0 && !enemy.isDead) {
                    enemy.isDead = true;

                    // Add score for killing zombie
                    if (window.addScore) {
                        window.addScore(100);
                    }

                    // Check wave completion
                    if (window.checkWaveCompletion) {
                        window.checkWaveCompletion();
                    }

                    // Play death animation and sound
                    enemy.playAnimation('death');
                    if (window.playSound) {
                        window.playSound('zombieDying');
                    }

                    // Stop physics movement
                    enemy.physics.body.setLinearVelocity(BABYLON.Vector3.Zero());

                    // Dispose the zombie after death animation plays (2 seconds)
                    setTimeout(() => {
                        enemy.physics.dispose();
                        enemy.collisionBox.dispose();
                        enemy.mesh.dispose();

                        // Remove from array
                        const index = enemies.indexOf(enemy);
                        if (index > -1) {
                            enemies.splice(index, 1);
                        }
                    }, 2000);
                }
            }

            // Dispose the bullet
            if (!bulletDisposed) {
                bulletDisposed = true;
                observable.clear();
                bulletAggregate.dispose();
                bullet.dispose();
            }
        }
    });

    // Dispose bullet after 3 seconds to prevent memory leak
    setTimeout(() => {
        if (!bulletDisposed) {
            bulletDisposed = true;
            observable.clear();
            bulletAggregate.dispose();
            bullet.dispose();
        }
    }, 3000);
}


    await scene.whenReadyAsync();
    currentScene.dispose();
    return scene;
}

export { gameScene };

