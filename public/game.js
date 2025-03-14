import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.module.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x5484b2);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Directional light for shadows
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(50, 100, 50);
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.left = -100;
light.shadow.camera.right = 100;
light.shadow.camera.top = 100;
light.shadow.camera.bottom = -100;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 300;
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

// Socket.IO (global io from socket.io.js)
const socket = io();
const otherPlayers = {};

// City
function createCity() {
    const city = new THREE.Group();
    const buildingSegments = [];
    
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x2b5424 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    city.add(ground);
    
    const buildingData = [
        { width: 12, height: 120, segments: 4, x: 20, z: 10, color: 0x3478c0 },
        { width: 14, height: 130, segments: 4, x: -15, z: -20, color: 0x144a80 },
        { width: 18, height: 100, segments: 3, x: 40, z: -40, color: 0x1e61a7 },
        { width: 16, height: 110, segments: 4, x: -30, z: 50, color: 0x3478c0 },
        { width: 13, height: 140, segments: 5, x: 50, z: 30, color: 0x144a80 },
        { width: 17, height: 90, segments: 3, x: -50, z: -30, color: 0x1e61a7 },
        { width: 20, height: 80, segments: 3, x: 70, z: 70, color: 0x3478c0 },
        { width: 15, height: 100, segments: 4, x: -70, z: 60, color: 0x144a80 },
        { width: 19, height: 85, segments: 3, x: 80, z: -60, color: 0x1e61a7 },
        { width: 14, height: 115, segments: 4, x: -80, z: -70, color: 0x3478c0 },
        { width: 16, height: 125, segments: 5, x: 30, z: -80, color: 0x144a80 },
        { width: 13, height: 95, segments: 3, x: -40, z: 80, color: 0x1e61a7 },
        { width: 17, height: 105, segments: 4, x: 60, z: 0, color: 0x3478c0 },
        { width: 15, height: 135, segments: 5, x: -60, z: 20, color: 0x144a80 }
    ];
    
    for (let i = 0; i < buildingData.length; i++) {
        const data = buildingData[i];
        const segmentHeight = data.height / data.segments;
        const building = new THREE.Group();
        
        let currentY = segmentHeight / 2;
        for (let j = 0; j < data.segments; j++) {
            const width = data.width - j * 2;
            const segmentGeo = new THREE.BoxGeometry(width, segmentHeight, width);
            const windowSize = 0.5;
            const spacing = 2;
            const rows = Math.floor(segmentHeight / spacing) - 1;
            const cols = Math.floor(width / spacing) - 1;
            const vertices = segmentGeo.attributes.position.array;
            const newVertices = [];
            const newColors = [];
            const baseColor = new THREE.Color(data.color);
            const yellow = new THREE.Color(0xffff00);
            
            for (let v = 0; v < vertices.length; v += 3) {
                newVertices.push(vertices[v], vertices[v + 1], vertices[v + 2]);
                newColors.push(baseColor.r, baseColor.g, baseColor.b);
            }
            
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const y = -segmentHeight / 2 + (r + 1) * spacing;
                    const xOffset = -width / 2 + (c + 1) * spacing;
                    const zOffset = -width / 2 + (c + 1) * spacing;
                    const front = [width / 2, y - windowSize / 2, zOffset - windowSize / 2, width / 2, y + windowSize / 2, zOffset - windowSize / 2, width / 2, y + windowSize / 2, zOffset + windowSize / 2, width / 2, y - windowSize / 2, zOffset + windowSize / 2];
                    newVertices.push(...front);
                    newColors.push(yellow.r, yellow.g, yellow.b, yellow.r, yellow.g, yellow.b, yellow.r, yellow.g, yellow.b, yellow.r, yellow.g, yellow.b);
                    const back = [-width / 2, y - windowSize / 2, zOffset - windowSize / 2, -width / 2, y - windowSize / 2, zOffset + windowSize / 2, -width / 2, y + windowSize / 2, zOffset + windowSize / 2, -width / 2, y + windowSize / 2, zOffset - windowSize / 2];
                    newVertices.push(...back);
                    newColors.push(yellow.r, yellow.g, yellow.b, yellow.r, yellow.g, yellow.b, yellow.r, yellow.g, yellow.b, yellow.r, yellow.g, yellow.b);
                    const right = [xOffset - windowSize / 2, y - windowSize / 2, width / 2, xOffset + windowSize / 2, y - windowSize / 2, width / 2, xOffset + windowSize / 2, y + windowSize / 2, width / 2, xOffset - windowSize / 2, y + windowSize / 2, width / 2];
                    newVertices.push(...right);
                    newColors.push(yellow.r, yellow.g, yellow.b, yellow.r, yellow.g, yellow.b, yellow.r, yellow.g, yellow.b, yellow.r, yellow.g, yellow.b);
                    const left = [xOffset - windowSize / 2, y - windowSize / 2, -width / 2, xOffset - windowSize / 2, y + windowSize / 2, -width / 2, xOffset + windowSize / 2, y + windowSize / 2, -width / 2, xOffset + windowSize / 2, y - windowSize / 2, -width / 2];
                    newVertices.push(...left);
                    newColors.push(yellow.r, yellow.g, yellow.b, yellow.r, yellow.g, yellow.b, yellow.r, yellow.g, yellow.b, yellow.r, yellow.g, yellow.b);
                }
            }
            
            const indices = [];
            for (let v = 0; v < segmentGeo.index.array.length; v++) {
                indices.push(segmentGeo.index.array[v]);
            }
            const baseVertexCount = segmentGeo.attributes.position.count;
            for (let k = 0; k < rows * cols * 4; k++) {
                const start = baseVertexCount + k * 4;
                indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
            }
            
            const customGeo = new THREE.BufferGeometry();
            customGeo.setAttribute('position', new THREE.Float32BufferAttribute(newVertices, 3));
            customGeo.setAttribute('color', new THREE.Float32BufferAttribute(newColors, 3));
            customGeo.setIndex(indices);
            
            const segment = new THREE.Mesh(customGeo, new THREE.MeshBasicMaterial({ vertexColors: true }));
            segment.position.set(0, currentY, 0);
            segment.castShadow = true;
            building.add(segment);
            buildingSegments.push(segment);
            
            currentY += segmentHeight;
        }
        building.position.set(data.x, 0, data.z);
        city.add(building);
    }
    
    scene.add(city);
    return { city, buildingSegments };
}

const { city, buildingSegments } = createCity();

// Global material for thrusters
const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });

// Player (local player)
const player = new THREE.Group();
player.position.set(0, 0, 0);
player.isShooting = false;
player.health = 10;
player.kills = 0;

// Head with helmet and visor
const helmetGeo = new THREE.SphereGeometry(0.35, 16, 16);
const helmetMat = new THREE.MeshBasicMaterial({ color: 0x404040 });
const helmet = new THREE.Mesh(helmetGeo, helmetMat);
helmet.position.set(0, 1.8, 0);
helmet.castShadow = true;
player.add(helmet);
const visorGeo = new THREE.BoxGeometry(0.4, 0.1, 0.2);
const visorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
const visor = new THREE.Mesh(visorGeo, visorMat);
visor.position.set(0, 1.8, 0.25);
visor.castShadow = true;
player.add(visor);

// Torso with armor plates
const torsoGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16);
const torsoMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const torso = new THREE.Mesh(torsoGeo, torsoMat);
torso.position.set(0, 1.2, 0);
torso.castShadow = true;
player.add(torso);
const chestPlateGeo = new THREE.BoxGeometry(0.5, 0.4, 0.1);
const chestPlateMat = new THREE.MeshBasicMaterial({ color: 0x808080 });
const chestPlate = new THREE.Mesh(chestPlateGeo, chestPlateMat);
chestPlate.position.set(0, 1.4, 0.25);
chestPlate.castShadow = true;
player.add(chestPlate);

// Arms with joints
const upperArmGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 16);
const armMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const leftUpperArm = new THREE.Mesh(upperArmGeo, armMat);
leftUpperArm.position.set(-0.5, 1.3, 0);
leftUpperArm.castShadow = true;
player.add(leftUpperArm);
const rightUpperArm = new THREE.Mesh(upperArmGeo, armMat);
rightUpperArm.position.set(0.5, 1.3, 0);
rightUpperArm.castShadow = true;
player.add(rightUpperArm);
const lowerArmGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 16);
const leftLowerArm = new THREE.Mesh(lowerArmGeo, armMat);
leftLowerArm.position.set(0, -0.4, 0);
leftLowerArm.castShadow = true;
leftUpperArm.add(leftLowerArm);
const rightLowerArm = new THREE.Mesh(lowerArmGeo, armMat);
rightLowerArm.position.set(0, -0.4, 0);
rightLowerArm.castShadow = true;
rightUpperArm.add(rightLowerArm);

// Legs with boots and thrusters
const upperLegGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 16);
const legMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const leftUpperLeg = new THREE.Mesh(upperLegGeo, legMat);
leftUpperLeg.position.set(-0.2, 0.6, 0);
leftUpperLeg.castShadow = true;
player.add(leftUpperLeg);
const rightUpperLeg = new THREE.Mesh(upperLegGeo, legMat);
rightUpperLeg.position.set(0.2, 0.6, 0);
rightUpperLeg.castShadow = true;
player.add(rightUpperLeg);
const leftLeg = leftUpperLeg;
const rightLeg = rightUpperLeg;
const bootGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.3, 16);
const bootMat = new THREE.MeshBasicMaterial({ color: 0x404040 });
const leftBoot = new THREE.Mesh(bootGeo, bootMat);
leftBoot.position.set(0, -0.35, 0);
leftBoot.castShadow = true;
leftUpperLeg.add(leftBoot);
const rightBoot = new THREE.Mesh(bootGeo, bootMat);
rightBoot.position.set(0, -0.35, 0);
rightBoot.castShadow = true;
rightUpperLeg.add(rightBoot);
const legThrusterGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16);
const leftLegThruster = new THREE.Mesh(legThrusterGeo, thrusterMat);
leftLegThruster.position.set(-0.25, 0.4, 0);
leftLegThruster.castShadow = true;
player.add(leftLegThruster);
const rightLegThruster = new THREE.Mesh(legThrusterGeo, thrusterMat);
rightLegThruster.position.set(0.25, 0.4, 0);
rightLegThruster.castShadow = true;
player.add(rightLegThruster);

// Jetpack with vents
const jetpackGeo = new THREE.BoxGeometry(0.6, 0.6, 0.4);
const jetpackMat = new THREE.MeshBasicMaterial({ color: 0x808080 });
const jetpack = new THREE.Mesh(jetpackGeo, jetpackMat);
jetpack.position.set(0, 1.2, -0.5);
jetpack.castShadow = true;
player.add(jetpack);
const ventGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);
const ventMat = new THREE.MeshBasicMaterial({ color: 0x404040 });
const leftVent = new THREE.Mesh(ventGeo, ventMat);
leftVent.position.set(-0.35, 1.2, -0.5);
leftVent.castShadow = true;
player.add(leftVent);
const rightVent = new THREE.Mesh(ventGeo, ventMat);
rightVent.position.set(0.35, 1.2, -0.5);
rightVent.castShadow = true;
player.add(rightVent);
const flameGeo = new THREE.ConeGeometry(0.2, 0.8, 8);
const flameMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
const flame = new THREE.Mesh(flameGeo, flameMat);
flame.position.set(0, 0.8, -0.5);
flame.rotation.x = Math.PI;
flame.visible = false;
player.add(flame);

scene.add(player);

// Motorcycle
const motorcycle = new THREE.Group();
motorcycle.position.set(5, 0, 5);
const bikeBodyGeo = new THREE.BoxGeometry(2, 0.5, 0.8);
const bikeBodyMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const bikeBody = new THREE.Mesh(bikeBodyGeo, bikeBodyMat);
bikeBody.position.set(0, 0.25, 0);
bikeBody.castShadow = true;
motorcycle.add(bikeBody);
const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16);
const wheelMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
frontWheel.position.set(0.8, 0.15, 0);
frontWheel.rotation.z = Math.PI / 2;
frontWheel.castShadow = true;
motorcycle.add(frontWheel);
const rearWheel = new THREE.Mesh(wheelGeo, wheelMat);
rearWheel.position.set(-0.8, 0.15, 0);
rearWheel.rotation.z = Math.PI / 2;
rearWheel.castShadow = true;
motorcycle.add(rearWheel);
const thrusterGeo = new THREE.ConeGeometry(0.2, 0.8, 8);
const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
thruster.position.set(-0.8, 0.25, 0);
thruster.rotation.x = Math.PI;
thruster.visible = false;
motorcycle.add(thruster);
scene.add(motorcycle);

// Enemies
const enemies = [];
function createHumanoidEnemy() {
    const enemy = new THREE.Group();
    enemy.position.set((Math.random() - 0.5) * 180, 0, (Math.random() - 0.5) * 180);
    enemy.shootTimer = Math.random() * 120;
    enemy.target = null;
    enemy.wanderDirection = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    enemy.health = 3;
    enemy.legAngle = 0;
    enemy.legSpeed = 0.1;
    
    const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.8, 0);
    head.castShadow = true;
    enemy.add(head);
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1, 16);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1, 0);
    body.castShadow = true;
    enemy.add(body);
    const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 16);
    const armMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.5, 1, 0);
    leftArm.castShadow = true;
    enemy.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.5, 1, 0);
    rightArm.castShadow = true;
    enemy.add(rightArm);
    const legGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16);
    const legMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.2, 0.4, 0);
    leftLeg.castShadow = true;
    enemy.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.2, 0.4, 0);
    rightLeg.castShadow = true;
    enemy.add(rightLeg);
    
    enemy.leftLeg = leftLeg;
    enemy.rightLeg = rightLeg;
    scene.add(enemy);
    return enemy;
}
for (let i = 0; i < 10; i++) {
    enemies.push(createHumanoidEnemy());
}

// Camera setup
camera.position.set(0, 5, 0);
camera.rotation.y = Math.PI;

// Joystick controls
const joystick = document.getElementById('joystick');
const knob = document.getElementById('knob');
let moveX = 0, moveZ = 0, moveY = 0;

function startDrag(e) {
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
const keys = { w: false, a: false, s: false, d: false, space: false, e: false, q: false };
document.addEventListener('keydown', (e) => {
    if (e.key === 'w') keys.w = true;
    if (e.key === 'a') keys.a = true;
    if (e.key === 's') keys.s = true;
    if (e.key === 'd') keys.d = true;
    if (e.key === ' ') keys.space = true;
    if (e.key === 'e') keys.e = true;
    if (e.key === 'q') keys.q = true;
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'w') keys.w = false;
    if (e.key === 'a') keys.a = false;
    if (e.key === 's') keys.s = false;
    if (e.key === 'd') keys.d = false;
    if (e.key === ' ') keys.space = false;
    if (e.key === 'e') { 
        keys.e = false;
        moveY = 0;
    }
    if (e.key === 'q') { 
        keys.q = false;
        moveY = 0;
    }
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
    e.preventDefault();
    shoot();
}

shootBtn.addEventListener('click', triggerShoot);
shootBtn.addEventListener('touchstart', triggerShoot);

// Fly button
const flyBtn = document.getElementById('flyBtn');

function startFly(e) {
    e.preventDefault();
    keys.e = true; // Match E key (fly up)
}

function stopFly(e) {
    e.preventDefault();
    keys.e = false; // Drop with gravity
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
    if (!document.fullscreenElement) {
        canvas.requestFullscreen().catch(err => {
            console.log(`Fullscreen failed: ${err}`);
        });
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
    const newEnemy = createHumanoidEnemy();
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
let legAngle = 0;
let legSpeed = 0.1;
let isOnBike = false;
let bikeSpeed = 0;
const maxBikeSpeed = 0.5;
const bikeAcceleration = 0.02;
const bikeDeceleration = 0.01;

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
    console.log('Received legAngle:', data.legAngle);
    if (otherPlayers[data.id]) {
        otherPlayers[data.id].position.set(data.x, data.y, data.z);
        otherPlayers[data.id].rotation.y = data.rotationY;
        // Sync leg and arm movements
        if (data.legAngle !== undefined) {
            otherPlayers[data.id].leftUpperLeg.rotation.x = data.legAngle;
            otherPlayers[data.id].rightUpperLeg.rotation.x = -data.legAngle;
            otherPlayers[data.id].leftUpperArm.rotation.x = -data.legAngle;
            otherPlayers[data.id].rightUpperArm.rotation.x = data.legAngle;
        } else {
            otherPlayers[data.id].leftUpperLeg.rotation.x = 0;
            otherPlayers[data.id].rightUpperLeg.rotation.x = 0;
            otherPlayers[data.id].leftUpperArm.rotation.x = 0;
            otherPlayers[data.id].rightUpperArm.rotation.x = 0;
        }
    } else {
        console.log('Player not found, adding:', data.id);
        addOtherPlayer(data.id, data);
    }
});

socket.on('playerDisconnected', (id) => {
    console.log('Player disconnected:', id);
    if (otherPlayers[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

function addOtherPlayer(id, data) {
    const otherPlayer = new THREE.Group();

    // Head with helmet and visor
    const otherHelmetGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const otherHelmetMat = new THREE.MeshBasicMaterial({ color: 0x404040 });
    const otherHelmet = new THREE.Mesh(otherHelmetGeo, otherHelmetMat);
    otherHelmet.position.set(0, 1.8, 0);
    otherHelmet.castShadow = true;
    otherPlayer.add(otherHelmet);
    const otherVisorGeo = new THREE.BoxGeometry(0.4, 0.1, 0.2);
    const otherVisorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const otherVisor = new THREE.Mesh(otherVisorGeo, otherVisorMat);
    otherVisor.position.set(0, 1.8, 0.25);
    otherVisor.castShadow = true;
    otherPlayer.add(otherVisor);

    // Torso with armor plates
    const otherTorsoGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16);
    const otherTorsoMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const otherTorso = new THREE.Mesh(otherTorsoGeo, otherTorsoMat);
    otherTorso.position.set(0, 1.2, 0);
    otherTorso.castShadow = true;
    otherPlayer.add(otherTorso);
    const otherChestPlateGeo = new THREE.BoxGeometry(0.5, 0.4, 0.1);
    const otherChestPlateMat = new THREE.MeshBasicMaterial({ color: 0x808080 });
    const otherChestPlate = new THREE.Mesh(otherChestPlateGeo, otherChestPlateMat);
    otherChestPlate.position.set(0, 1.4, 0.25);
    otherChestPlate.castShadow = true;
    otherPlayer.add(otherChestPlate);

    // Arms with joints
    const otherUpperArmGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 16);
    const otherArmMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const otherLeftUpperArm = new THREE.Mesh(otherUpperArmGeo, otherArmMat);
    otherLeftUpperArm.position.set(-0.5, 1.3, 0);
    otherLeftUpperArm.castShadow = true;
    otherPlayer.add(otherLeftUpperArm);
    const otherRightUpperArm = new THREE.Mesh(otherUpperArmGeo, otherArmMat);
    otherRightUpperArm.position.set(0.5, 1.3, 0);
    otherRightUpperArm.castShadow = true;
    otherPlayer.add(otherRightUpperArm);
    const otherLowerArmGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 16);
    const otherLeftLowerArm = new THREE.Mesh(otherLowerArmGeo, otherArmMat);
    otherLeftLowerArm.position.set(0, -0.4, 0);
    otherLeftLowerArm.castShadow = true;
    otherLeftUpperArm.add(otherLeftLowerArm);
    const otherRightLowerArm = new THREE.Mesh(otherLowerArmGeo, otherArmMat);
    otherRightLowerArm.position.set(0, -0.4, 0);
    otherRightLowerArm.castShadow = true;
    otherRightUpperArm.add(otherRightLowerArm);

    // Legs with boots and thrusters
    const otherUpperLegGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 16);
    const otherLegMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const otherLeftUpperLeg = new THREE.Mesh(otherUpperLegGeo, otherLegMat);
    otherLeftUpperLeg.position.set(-0.2, 0.6, 0);
    otherLeftUpperLeg.castShadow = true;
    otherPlayer.add(otherLeftUpperLeg);
    const otherRightUpperLeg = new THREE.Mesh(otherUpperLegGeo, otherLegMat);
    otherRightUpperLeg.position.set(0.2, 0.6, 0);
    otherRightUpperLeg.castShadow = true;
    otherPlayer.add(otherRightUpperLeg);
    const otherBootGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.3, 16);
    const otherBootMat = new THREE.MeshBasicMaterial({ color: 0x404040 });
    const otherLeftBoot = new THREE.Mesh(otherBootGeo, otherBootMat);
    otherLeftBoot.position.set(0, -0.35, 0);
    otherLeftBoot.castShadow = true;
    otherLeftUpperLeg.add(otherLeftBoot);
    const otherRightBoot = new THREE.Mesh(otherBootGeo, otherBootMat);
    otherRightBoot.position.set(0, -0.35, 0);
    otherRightBoot.castShadow = true;
    otherRightUpperLeg.add(otherRightBoot);
    const otherLegThrusterGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16);
    const otherLeftLegThruster = new THREE.Mesh(otherLegThrusterGeo, thrusterMat);
    otherLeftLegThruster.position.set(-0.25, 0.4, 0);
    otherLeftLegThruster.castShadow = true;
    otherPlayer.add(otherLeftLegThruster);
    const otherRightLegThruster = new THREE.Mesh(otherLegThrusterGeo, thrusterMat);
    otherRightLegThruster.position.set(0.25, 0.4, 0);
    otherRightLegThruster.castShadow = true;
    otherPlayer.add(otherRightLegThruster);

    // Jetpack with vents
    const otherJetpackGeo = new THREE.BoxGeometry(0.6, 0.6, 0.4);
    const otherJetpackMat = new THREE.MeshBasicMaterial({ color: 0x808080 });
    const otherJetpack = new THREE.Mesh(otherJetpackGeo, otherJetpackMat);
    otherJetpack.position.set(0, 1.2, -0.5);
    otherJetpack.castShadow = true;
    otherPlayer.add(otherJetpack);
    const otherVentGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const otherVentMat = new THREE.MeshBasicMaterial({ color: 0x404040 });
    const otherLeftVent = new THREE.Mesh(otherVentGeo, otherVentMat);
    otherLeftVent.position.set(-0.35, 1.2, -0.5);
    otherLeftVent.castShadow = true;
    otherPlayer.add(otherLeftVent);
    const otherRightVent = new THREE.Mesh(otherVentGeo, otherVentMat);
    otherRightVent.position.set(0.35, 1.2, -0.5);
    otherRightVent.castShadow = true;
    otherPlayer.add(otherRightVent);
    const otherFlameGeo = new THREE.ConeGeometry(0.2, 0.8, 8);
    const otherFlameMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
    const otherFlame = new THREE.Mesh(otherFlameGeo, otherFlameMat);
    otherFlame.position.set(0, 0.8, -0.5);
    otherFlame.rotation.x = Math.PI;
    otherFlame.visible = false;
    otherPlayer.add(otherFlame);

    // Store references for leg and arm syncing
    otherPlayer.leftUpperLeg = otherLeftUpperLeg;
    otherPlayer.rightUpperLeg = otherRightUpperLeg;
    otherPlayer.leftUpperArm = otherLeftUpperArm;
    otherPlayer.rightUpperArm = otherRightUpperArm;

    otherPlayer.position.set(data.x, data.y, data.z);
    otherPlayer.rotation.y = data.rotationY;
    scene.add(otherPlayer);
    otherPlayers[id] = otherPlayer;
    console.log('Added other player:', id, 'at', data.x, data.y, data.z);
}

// Animate loop
function animate() {
    requestAnimationFrame(animate);

    let keyboardMoveX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    let keyboardMoveZ = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
    let keyboardMoveY = (keys.e ? 4 : 0) - (keys.q ? 1 : 0);
    moveX = Math.max(-1, Math.min(1, moveX + keyboardMoveX));
    moveZ = Math.max(-1, Math.min(1, moveZ + keyboardMoveZ));
    moveY = Math.max(-1, Math.min(4, moveY + keyboardMoveY));

    if (keys.space && !player.isShooting) shoot();

    if (!isOnBike && !keys.e && !keys.q) {
        moveY = -4;
    }

    const flame = player.children.find(child => child.geometry.type === 'ConeGeometry');
    if (flame) {
        flame.visible = !isOnBike && moveY > 0;
        if (flame.visible) {
            flame.scale.y = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
        }
    }

    const thruster = motorcycle.children.find(child => child.geometry.type === 'ConeGeometry');
    if (thruster) {
        thruster.visible = isOnBike && moveY > 0;
        if (thruster.visible) {
            thruster.scale.y = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
        }
    }

    if (!player.isShooting && scene.children.includes(player)) {
        const baseSpeed = 0.05;
        const flySpeed = 0.15;
        const horizontalSpeed = (!isOnBike && moveY > 0) ? flySpeed : baseSpeed;

        const newX = isOnBike ? motorcycle.position.x : player.position.x - moveX * horizontalSpeed;
        const newZ = isOnBike ? motorcycle.position.z : player.position.z + moveZ * horizontalSpeed;
        let newY = (isOnBike ? motorcycle.position.y : player.position.y) + moveY * 0.05;
        const distance = Math.sqrt(newX * newX + newZ * newZ);

        console.log('y:', player.position.y);
        if (isOnBike) {
            if (moveZ > 0) bikeSpeed = Math.min(bikeSpeed + bikeAcceleration, maxBikeSpeed);
            else if (moveZ < 0) bikeSpeed = Math.max(bikeSpeed - bikeAcceleration, -maxBikeSpeed);
            else bikeSpeed *= (1 - bikeDeceleration);

            const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), motorcycle.rotation.y);
            motorcycle.position.add(direction.multiplyScalar(bikeSpeed));

            if (moveX) {
                motorcycle.rotation.y -= moveX * 0.05;
            }
            motorcycle.position.y = Math.max(0, Math.min(200, newY));
        } else {
            let collisionX = false;
            let collisionZ = false;
            let collisionY = false;
            let adjustedX = newX;
            let adjustedZ = newZ;
            let adjustedY = newY;

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

            if (distance <= 100) {
                if (!collisionX) player.position.x = newX;
                else player.position.x = adjustedX;
                if (!collisionZ) player.position.z = newZ;
                else player.position.z = adjustedZ;
            } else {
                const angle = Math.atan2(newZ, newX);
                player.position.x = Math.cos(angle) * 100;
                player.position.z = Math.sin(angle) * 100;
            }
            if (!collisionY) {
                player.position.y = Math.max(0, Math.min(200, newY));
            } else {
                player.position.y = adjustedY;
            }

            if (!isOnBike && (moveX || moveZ)) {
                player.rotation.y = Math.atan2(-moveX, moveZ);
            }

            if (!isOnBike && (moveX || moveZ) && player.position.y < 0.1) {
                legAngle += legSpeed;
                if (legAngle > 0.5 || legAngle < -0.5) legSpeed = -legSpeed;
                leftLeg.rotation.x = legAngle;
                rightLeg.rotation.x = -legAngle;
                leftUpperArm.rotation.x = -legAngle;
                rightUpperArm.rotation.x = legAngle;
            } else {
                leftLeg.rotation.x = 0;
                rightLeg.rotation.x = 0;
                leftUpperArm.rotation.x = 0;
                rightUpperArm.rotation.x = 0;
                legAngle = 0;
            }

            console.log('Raw legAngle:', legAngle); // New
            console.log('Sending legAngle:', (!isOnBike && (moveX || moveZ) && player.position.y < 0.1) ? legAngle : undefined);
            socket.emit('updatePosition', {
                x: player.position.x,
                y: player.position.y,
                z: player.position.z,
                rotationY: player.rotation.y,
                legAngle: (!isOnBike && (moveX || moveZ) && player.position.y < 0.1) ? legAngle : undefined
            });
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'b' && !isOnBike && player.position.distanceTo(motorcycle.position) < 2) {
            isOnBike = true;
            scene.remove(player);
        } else if (e.key === 'b' && isOnBike) {
            isOnBike = false;
            player.position.copy(motorcycle.position);
            player.position.y = 0;
            scene.add(player);
        }
    }, { once: true });

    if (scene.children.includes(player)) {
        enemies.forEach(enemy => {
            if (scene.children.includes(enemy)) {
                const distance = player.position.distanceTo(enemy.position);
                if (distance < 1) {
                    const pushDir = player.position.clone().sub(enemy.position).normalize().multiplyScalar(0.05);
                    player.position.add(pushDir);
                    enemy.position.sub(pushDir);
                    if (player.position.length() > 100) player.position.clampLength(0, 100);
                    if (enemy.position.length() > 100) enemy.position.clampLength(0, 100);
                }
            }
        });
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
                if (enemy.position.length() > 100) enemy.position.clampLength(0, 100);
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
                if (typeof player.health === 'number') { // Prevent crash if health is undefined
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
            (isOnBike ? motorcycle.position.x : player.position.x),
            (isOnBike ? motorcycle.position.y : player.position.y) + 5,
            (isOnBike ? motorcycle.position.z : player.position.z) - 10
        );
    }

    renderer.render(scene, camera);
}
animate();