console.log('game.js loaded');

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8B4513);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Directional light for Mars shadows
const light = new THREE.DirectionalLight(0xff9999, 0.8);
light.position.set(25, 50, 25);
light.castShadow = true;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
light.shadow.camera.left = -50;
light.shadow.camera.right = 50;
light.shadow.camera.top = 50;
light.shadow.camera.bottom = -50;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 200;
scene.add(light);

// Handle resize and orientation change
function resizeRenderer() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}
window.addEventListener('resize', resizeRenderer);
window.addEventListener('orientationchange', resizeRenderer);
resizeRenderer();

// Socket.IO
const socket = io();
const otherPlayers = {};
let localUsername = null;
let hasJoined = false;

// Name labels container
const nameLabels = document.getElementById('nameLabels');
const playerNames = {};

// Mars colony landscape
function createMarsColony() {
    const mars = new THREE.Group();
    const buildingSegments = [];

    const groundGeo = new THREE.PlaneGeometry(1000, 1000);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x964B00 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    mars.add(ground);

    const buildingData = [
        { type: 'dome', radius: 10, height: 5, x: -400, z: -400 },
        { type: 'pod', width: 8, height: 4, depth: 8, x: -350, z: 300 },
        { type: 'dome', radius: 12, height: 6, x: 200, z: -300 },
        { type: 'pod', width: 10, height: 5, depth: 10, x: 300, z: 400 },
        { type: 'dome', radius: 15, height: 7, x: -200, z: 200 },
        { type: 'pod', width: 6, height: 3, depth: 6, x: 400, z: -200 },
        { type: 'dome', radius: 8, height: 4, x: -300, z: -100 },
        { type: 'pod', width: 12, height: 6, depth: 12, x: 100, z: 350 },
    ];

    buildingData.forEach(data => {
        let building;
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        if (data.type === 'dome') {
            const geo = new THREE.SphereGeometry(data.radius, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            building = new THREE.Mesh(geo, mat);
            building.position.set(data.x, data.height / 2, data.z);
        } else {
            const geo = new THREE.BoxGeometry(data.width, data.height, data.depth);
            building = new THREE.Mesh(geo, mat);
            building.position.set(data.x, data.height / 2, data.z);
        }
        building.castShadow = true;
        building.receiveShadow = true;
        mars.add(building);
        buildingSegments.push(building);
    });

    const rockGeo = new THREE.DodecahedronGeometry(5, 0);
    const rockMat = new THREE.MeshBasicMaterial({ color: 0x8c2f00 });
    for (let i = 0; i < 50; i++) {
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(
            (Math.random() - 0.5) * 900,
            2.5,
            (Math.random() - 0.5) * 900
        );
        rock.scale.set(
            Math.random() * 2 + 0.5,
            Math.random() * 2 + 0.5,
            Math.random() * 2 + 0.5
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        mars.add(rock);
    }

    const canyonGeo = new THREE.BoxGeometry(100, 20, 20);
    const canyonMat = new THREE.MeshBasicMaterial({ color: 0x8c2f00 });
    for (let i = 0; i < 5; i++) {
        const canyon = new THREE.Mesh(canyonGeo, canyonMat);
        canyon.position.set(
            (Math.random() - 0.5) * 800,
            -10,
            (Math.random() - 0.5) * 800
        );
        canyon.rotation.y = Math.random() * Math.PI;
        canyon.receiveShadow = true;
        mars.add(canyon);
    }

    scene.add(mars);
    return { mars, buildingSegments };
}

const { mars, buildingSegments } = createMarsColony();

// Global FBXLoader instance (should already be earlier in your file)
let loader;
if (typeof THREE.FBXLoader !== 'undefined') {
    loader = new THREE.FBXLoader();
} else {
    console.error('THREE.FBXLoader not available');
}

// Player (rigged FBX model) - EDITING HERE
console.log('Initializing player');
const player = new THREE.Group();
player.position.set(0, 0, 0);
player.isShooting = false;
player.health = 10;
player.kills = 0;
let mixer;

if (loader) {
    console.log('Loading FBX from:', '/models/textured_mesh-3.fbx');
    loader.load(
        '/models/textured_mesh-3.fbx',
        (fbx) => {
            console.log('FBX loaded successfully');
            const model = fbx;
            model.scale.set(1, 1, 1); // Keeping your working scale
            model.position.y = 0;
            model.rotation.y = Math.PI / 25; // Add this to face forward
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            player.add(model);

            mixer = new THREE.AnimationMixer(model);
            console.log('Available animations:', fbx.animations); // Add this
            const walkAction = mixer.clipAction(fbx.animations.find(anim => anim.name.toLowerCase().includes('walk')) || fbx.animations[0]);
            if (walkAction) {
                walkAction.play();
                walkAction.paused = true;
            } else {
                console.log('No walk animation found');
            }
        },
        (xhr) => console.log((xhr.loaded / xhr.total * 100) + '% loaded'),
        (error) => console.error('Error loading FBX model:', error)
    );
    scene.add(player);
}

// Enemies (green aliens)
const enemies = [];
function createAlienEnemy() {
    const enemy = new THREE.Group();
    enemy.position.set((Math.random() - 0.5) * 900, 0, (Math.random() - 0.5) * 900);
    enemy.shootTimer = Math.random() * 120;
    enemy.target = null;
    enemy.wanderDirection = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    enemy.health = 3;
    enemy.legAngle = 0;
    enemy.legSpeed = 0.1;
    
    const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const alienMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const head = new THREE.Mesh(headGeo, alienMat);
    head.position.set(0, 1.8, 0);
    head.castShadow = true;
    enemy.add(head);
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1, 16);
    const body = new THREE.Mesh(bodyGeo, alienMat);
    body.position.set(0, 1, 0);
    body.castShadow = true;
    enemy.add(body);
    const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 16);
    const leftArm = new THREE.Mesh(armGeo, alienMat);
    leftArm.position.set(-0.5, 1, 0);
    leftArm.castShadow = true;
    enemy.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, alienMat);
    rightArm.position.set(0.5, 1, 0);
    rightArm.castShadow = true;
    enemy.add(rightArm);
    const legGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16);
    const leftLeg = new THREE.Mesh(legGeo, alienMat);
    leftLeg.position.set(-0.2, 0.4, 0);
    leftLeg.castShadow = true;
    enemy.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, alienMat);
    rightLeg.position.set(0.2, 0.4, 0);
    rightLeg.castShadow = true;
    enemy.add(rightLeg);
    
    enemy.leftLeg = leftLeg;
    enemy.rightLeg = rightLeg;
    scene.add(enemy);
    return enemy;
}
for (let i = 0; i < 30; i++) {
    enemies.push(createAlienEnemy());
}

// Camera setup
camera.position.set(0, 5, 0);
camera.rotation.y = Math.PI;

// Joystick controls
const joystick = document.getElementById('joystick');
const knob = document.getElementById('knob');
let moveX = 0, moveZ = 0, moveY = 0;

function startDrag(e) {
    if (!hasJoined) return;
    e.preventDefault();
    const rect = joystick.getBoundingClientRect();
    const getTouchPos = (event) => {
        const touch = event.touches ? event.touches[0] : event;
        return {
            x: touch.clientX - rect.left - 50,
            y: touch.clientY - rect.top - 50
        };
    };

    const drag = (ev) => {
        const pos = getTouchPos(ev);
        moveX = pos.x / 50;
        moveZ = -pos.y / 50;
        moveX = Math.max(-1, Math.min(1, moveX));
        moveZ = Math.max(-1, Math.min(1, moveZ));
        knob.style.left = (moveX * 25 + 25) + 'px';
        knob.style.top = (-moveZ * 25 + 25) + 'px';
    };

    drag(e);
    const moveHandler = (ev) => drag(ev);
    const endHandler = () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', endHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', endHandler);
        moveX = moveZ = 0;
        knob.style.left = '25px';
        knob.style.top = '25px';
        player.isShooting = false;
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler, { once: true });
    document.addEventListener('touchmove', moveHandler);
    document.addEventListener('touchend', endHandler, { once: true });
}

joystick.addEventListener('mousedown', startDrag);
joystick.addEventListener('touchstart', startDrag);

// Keyboard controls
const keys = { w: false, a: false, s: false, d: false, space: false, e: false, q: false, b: false };
document.addEventListener('keydown', (e) => {
    if (!hasJoined) return;
    if (e.key === 'w') keys.w = true;
    if (e.key === 'a') keys.a = true;
    if (e.key === 's') keys.s = true;
    if (e.key === 'd') keys.d = true;
    if (e.key === ' ') keys.space = true;
    if (e.key === 'e') keys.e = true;
    if (e.key === 'q') keys.q = true;
    if (e.key === 'b') keys.b = true;
});
document.addEventListener('keyup', (e) => {
    if (!hasJoined) return;
    if (e.key === 'w') keys.w = false;
    if (e.key === 'a') keys.a = false;
    if (e.key === 's') keys.s = false;
    if (e.key === 'd') keys.d = false;
    if (e.key === ' ') keys.space = false;
    if (e.key === 'e') { keys.e = false; moveY = 0; }
    if (e.key === 'q') { keys.q = false; moveY = 0; }
    if (e.key === 'b') keys.b = false;
});

// Bullet pool
const bulletPool = [];
for (let i = 0; i < 20; i++) {
    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
    bullet.active = false;
    bullet.isPlayerBullet = false;
    scene.add(bullet);
    bulletPool.push(bullet);
}

// Shoot button
const shootBtn = document.getElementById('shoot');

function triggerShoot(e) {
    if (!hasJoined) return;
    e.preventDefault();
    shoot();
}

shootBtn.addEventListener('click', triggerShoot);
shootBtn.addEventListener('touchstart', triggerShoot);

// Fly button
const flyBtn = document.getElementById('flyBtn');

function startFly(e) {
    if (!hasJoined) return;
    e.preventDefault();
    keys.e = true;
}

function stopFly(e) {
    if (!hasJoined) return;
    e.preventDefault();
    keys.e = false;
}

flyBtn.addEventListener('mousedown', startFly);
flyBtn.addEventListener('touchstart', startFly);
flyBtn.addEventListener('mouseup', stopFly);
flyBtn.addEventListener('touchend', stopFly);

// Shoot function
function shoot() {
    const bullet = bulletPool.find(b => !b.active);
    if (bullet) {
        bullet.position.copy(player.position);
        bullet.position.y = 1.5;
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
        bullet.velocity = direction.multiplyScalar(10);
        bullet.active = true;
        bullet.isPlayerBullet = true;
        setTimeout(() => bullet.active = false, 2000);
        player.isShooting = true;
        setTimeout(() => player.isShooting = false, 500);
    }
}

// Full-screen toggle
const canvas = renderer.domElement;
canvas.addEventListener('dblclick', () => {
    if (!hasJoined) return;
    if (!document.fullscreenElement) {
        canvas.requestFullscreen().catch(err => console.log(`Fullscreen failed: ${err}`));
    } else {
        document.exitFullscreen();
    }
});

// Kill counter and respawn counter
const killCounter = document.getElementById('kills');
const respawnCounter = document.getElementById('respawn');

// Respawn functions
function respawnEnemy(enemy) {
    scene.remove(enemy);
    const newEnemy = createAlienEnemy();
    enemies[enemies.indexOf(enemy)] = newEnemy;
}
function respawnPlayer() {
    player.position.set(0, 0, 0);
    player.health = 10;
    player.isShooting = false;
    scene.add(player);
    respawnCounter.textContent = '';
}

// Animation variables
let isOnBike = false;
let bikeSpeed = 0;
const maxBikeSpeed = 0.5;
const bikeAcceleration = 0.02;
const bikeDeceleration = 0.01;

const clock = new THREE.Clock();

// Socket.IO event handlers
socket.on('currentPlayers', (serverPlayers) => {
    console.log('Received currentPlayers:', serverPlayers);
    Object.keys(serverPlayers).forEach(id => {
        if (id !== socket.id && !otherPlayers[id]) {
            addOtherPlayer(id, serverPlayers[id]);
        }
    });
});

socket.on('newPlayer', (data) => {
    console.log('New player joined:', data);
    if (!otherPlayers[data.id]) {
        addOtherPlayer(data.id, data);
    }
});

socket.on('playerMoved', (data) => {
    console.log('Player moved:', data);
    if (otherPlayers[data.id]) {
        otherPlayers[data.id].position.set(data.x, data.y, data.z);
        otherPlayers[data.id].rotation.y = data.rotationY;
        updatePlayerNamePosition(data.id, otherPlayers[data.id]);
    }
});

socket.on('playerDisconnected', (id) => {
    console.log('Player disconnected:', id);
    if (otherPlayers[id]) {
        scene.remove(otherPlayers[id]);
        if (playerNames[id]) {
            nameLabels.removeChild(playerNames[id]);
            delete playerNames[id];
        }
        delete otherPlayers[id];
    }
});

socket.on('usernameSet', (data) => {
    if (otherPlayers[data.id]) {
        updatePlayerName(data.id, data.username);
    }
});

function addOtherPlayer(id, data) {
    const otherPlayer = new THREE.Group();
    loader.load(
        '/models/textured_mesh-3.fbx',
        (fbx) => {
            const model = fbx;
            model.scale.set(1, 1, 1);
            model.position.y = 25;
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            otherPlayer.add(model);
        }
    );
    otherPlayer.position.set(data.x, data.y, data.z);
    otherPlayer.rotation.y = data.rotationY;
    scene.add(otherPlayer);
    otherPlayers[id] = otherPlayer;
    updatePlayerName(id, data.username || 'Player' + id.slice(0, 4));
    console.log('Added other player:', id, 'at', data.x, data.y, data.z);
}

// Username handling with CSS
function updatePlayerName(id, username) {
    let nameDiv = playerNames[id];
    if (!nameDiv) {
        nameDiv = document.createElement('div');
        nameDiv.className = 'player-name';
        nameDiv.id = `name-${id}`;
        nameLabels.appendChild(nameDiv);
        playerNames[id] = nameDiv;
    }
    nameDiv.textContent = username;
    updatePlayerNamePosition(id, id === socket.id ? player : otherPlayers[id]);
}

function updatePlayerNamePosition(id, playerObj) {
    if (!playerNames[id] || !playerObj) return;
    const vector = new THREE.Vector3();
    playerObj.getWorldPosition(vector);
    const distance = camera.position.distanceTo(vector);
    const maxDistance = 50;
    const maxFontSize = 16;
    const fontSize = Math.max(0, maxFontSize * (1 - distance / maxDistance));
    const nameDiv = playerNames[id];
    vector.y += 2.5;
    vector.project(camera);
    if (vector.z > 1) {
        nameDiv.style.display = 'none';
        return;
    } else {
        nameDiv.style.display = 'block';
    }
    nameDiv.style.fontSize = `${fontSize}px`;
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    nameDiv.style.left = `${x}px`;
    nameDiv.style.top = `${y}px`;
    nameDiv.style.transform = 'translate(-50%, -100%)';
}

window.addEventListener('usernameSubmitted', (e) => {
    hasJoined = true;
    localUsername = e.detail;
    updatePlayerName(socket.id, localUsername);
    socket.emit('setUsername', localUsername);
});

// Animate loop
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (hasJoined) {
        let keyboardMoveX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
        let keyboardMoveZ = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
        let keyboardMoveY = (keys.e ? 4 : 0) - (keys.q ? 1 : 0);
        moveX = Math.max(-1, Math.min(1, moveX + keyboardMoveX));
        moveZ = Math.max(-1, Math.min(1, moveZ + keyboardMoveZ));
        moveY = Math.max(-1, Math.min(4, moveY + keyboardMoveY));

        if (keys.space && !player.isShooting) shoot();

        if (!keys.e && !keys.q) moveY = -4;

        if (!player.isShooting && scene.children.includes(player)) {
            const baseSpeed = 0.05;
            const flySpeed = 0.15;
            const horizontalSpeed = (moveY > 0) ? flySpeed : baseSpeed;

            const newX = player.position.x - moveX * horizontalSpeed;
            const newZ = player.position.z + moveZ * horizontalSpeed;
            let newY = player.position.y + moveY * 0.05;
            const distance = Math.sqrt(newX * newX + newZ * newZ);

            let collisionX = false, collisionZ = false, collisionY = false;
            let adjustedX = newX, adjustedZ = newZ, adjustedY = newY;

            buildingSegments.forEach(segment => {
                const box = new THREE.Box3().setFromObject(segment);
                const playerBox = new THREE.Box3();
                playerBox.setFromCenterAndSize(
                    new THREE.Vector3(newX, newY, newZ),
                    new THREE.Vector3(1, 2, 1)
                );

                if (box.intersectsBox(playerBox)) {
                    if (moveY <= 0 && newY <= box.max.y && newY > box.max.y - 0.1) {
                        collisionY = true;
                        adjustedY = box.max.y;
                        moveY = 0;
                    }
                    if (moveY > 0 && newY >= box.min.y && player.position.y < box.min.y) {
                        collisionY = true;
                        adjustedY = box.min.y - 2;
                    }
                    if (moveX < 0 && newX < box.max.x && player.position.x >= box.max.x) {
                        collisionX = true;
                        adjustedX = box.max.x + 0.5;
                    }
                    if (moveX > 0 && newX > box.min.x && player.position.x <= box.min.x) {
                        collisionX = true;
                        adjustedX = box.min.x - 0.5;
                    }
                    if (moveZ < 0 && newZ < box.max.z && player.position.z >= box.max.z) {
                        collisionZ = true;
                        adjustedZ = box.max.z + 0.5;
                    }
                    if (moveZ > 0 && newZ > box.min.z && player.position.z <= box.min.z) {
                        collisionZ = true;
                        adjustedZ = box.min.z - 0.5;
                    }
                }
            });

            if (distance <= 500) {
                if (!collisionX) player.position.x = newX;
                else player.position.x = adjustedX;
                if (!collisionZ) player.position.z = newZ;
                else player.position.z = adjustedZ;
            } else {
                const angle = Math.atan2(newZ, newX);
                player.position.x = Math.cos(angle) * 500;
                player.position.z = Math.sin(angle) * 500;
            }
            if (!collisionY) player.position.y = Math.max(0, Math.min(200, newY));
            else player.position.y = adjustedY;

            if (moveX || moveZ) player.rotation.y = Math.atan2(-moveX, moveZ);

            if (mixer) {
                const walkAction = mixer._actions[0];
                if (walkAction) {
                    if ((moveX || moveZ) && player.position.y < 0.1) {
                        walkAction.paused = false;
                    } else {
                        walkAction.paused = true;
                    }
                }
            }

            socket.emit('updatePosition', {
                x: player.position.x,
                y: player.position.y,
                z: player.position.z,
                rotationY: player.rotation.y
            });
        }

        if (scene.children.includes(player)) {
            enemies.forEach(enemy => {
                if (scene.children.includes(enemy)) {
                    const distance = player.position.distanceTo(enemy.position);
                    if (distance < 1) {
                        const pushDir = player.position.clone().sub(enemy.position).normalize().multiplyScalar(0.05);
                        player.position.add(pushDir);
                        enemy.position.sub(pushDir);
                        if (player.position.length() > 500) player.position.clampLength(0, 500);
                        if (enemy.position.length() > 500) enemy.position.clampLength(0, 500);
                    }
                }
            });
        }
    }

    enemies.forEach(enemy => {
        if (scene.children.includes(enemy)) {
            let isMoving = false;

            if (player.position.distanceTo(enemy.position) < 15) {
                let closest = player;
                let minDist = player.position.distanceTo(enemy.position);
                enemies.forEach(other => {
                    if (other !== enemy && scene.children.includes(other)) {
                        const dist = enemy.position.distanceTo(other.position);
                        if (dist < minDist) {
                            minDist = dist;
                            closest = other;
                        }
                    }
                });
                enemy.target = scene.children.includes(closest) ? closest : null;
            } else {
                enemy.target = null;
            }

            if (enemy.target) {
                const direction = enemy.target.position.clone().sub(enemy.position).normalize();
                enemy.rotation.y = Math.atan2(direction.x, direction.z);
                enemy.shootTimer--;
                if (enemy.shootTimer <= 0) {
                    const bullet = bulletPool.find(b => !b.active);
                    if (bullet) {
                        bullet.position.copy(enemy.position);
                        bullet.velocity = direction.clone().multiplyScalar(10);
                        bullet.active = true;
                        bullet.isPlayerBullet = false;
                        setTimeout(() => bullet.active = false, 2000);
                    }
                    enemy.shootTimer = 120;
                }
            } else {
                enemy.position.add(enemy.wanderDirection.clone().multiplyScalar(0.05));
                if (enemy.position.length() > 500) enemy.position.clampLength(0, 500);
                enemy.rotation.y = Math.atan2(enemy.wanderDirection.x, enemy.wanderDirection.z);
                if (Math.random() < 0.01) {
                    enemy.wanderDirection = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
                }
                isMoving = true;
            }

            if (isMoving) {
                enemy.legAngle += enemy.legSpeed;
                if (enemy.legAngle > 0.5 || enemy.legAngle < -0.5) enemy.legSpeed = -enemy.legSpeed;
                enemy.leftLeg.rotation.x = enemy.legAngle;
                enemy.rightLeg.rotation.x = -enemy.legAngle;
            } else {
                enemy.leftLeg.rotation.x = 0;
                enemy.rightLeg.rotation.x = 0;
                enemy.legAngle = 0;
            }
        }
    });

    scene.children.forEach(child => {
        if (child.velocity && child.active) {
            child.position.add(child.velocity.clone().multiplyScalar(0.1));
            enemies.forEach((enemy, index) => {
                if (scene.children.includes(enemy)) {
                    const bulletPosAdjusted = child.position.clone();
                    bulletPosAdjusted.y = 0;
                    const distance = bulletPosAdjusted.distanceTo(enemy.position);
                    if (distance < 1) {
                        enemy.health--;
                        child.active = false;
                        if (enemy.health <= 0) {
                            scene.remove(enemy);
                            if (child.isPlayerBullet) {
                                player.kills++;
                                if (killCounter) killCounter.innerText = `Eliminations: ${player.kills}`;
                            }
                            setTimeout(() => {
                                if (!scene.children.includes(enemy)) respawnEnemy(enemy);
                            }, 10000);
                        }
                    }
                }
            });
            if (scene.children.includes(player) && child.position.distanceTo(player.position) < 0.5) {
                if (typeof player.health === 'number') {
                    player.health--;
                    child.active = false;
                    if (player.health <= 0) {
                        scene.remove(player);
                        let timeLeft = 5;
                        respawnCounter.textContent = `Back in Action: ${timeLeft}s`;
                        const timer = setInterval(() => {
                            timeLeft--;
                            respawnCounter.textContent = `Back in Action: ${timeLeft}s`;
                            if (timeLeft <= 0) clearInterval(timer);
                        }, 1000);
                        setTimeout(() => {
                            if (!scene.children.includes(player)) respawnPlayer();
                        }, 5000);
                    }
                }
            }
        }
    });

    if (scene.children.includes(player)) {
        camera.position.set(
            player.position.x,
            player.position.y + 5,
            player.position.z - 10
        );
        if (hasJoined) updatePlayerNamePosition(socket.id, player);
    }

    Object.keys(otherPlayers).forEach(id => {
        updatePlayerNamePosition(id, otherPlayers[id]);
    });

    renderer.render(scene, camera);
}

animate();