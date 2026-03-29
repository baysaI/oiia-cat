import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MAX = 100;
const DECAY = 1; 
const INTERVAL = 10000;

const hungerFill = document.getElementById('hungerFill');
const happinessFill = document.getElementById('happinessFill');
const cleanFill = document.getElementById('cleanFill');
const energyFill = document.getElementById('energyFill');

const hungerLabel = document.getElementById('hungerLabel');
const happinessLabel = document.getElementById('happinessLabel');
const cleanLabel = document.getElementById('cleanLabel');
const energyLabel = document.getElementById('energyLabel');
const coinsLabel = document.getElementById('coinsLabel');

const feedBtn = document.getElementById('feedBtn');
const playBtn = document.getElementById('playBtn');
const cleanBtn = document.getElementById('cleanBtn');
const sleepBtn = document.getElementById('sleepBtn');
const restartBtn = document.getElementById('restartBtn');
const threeContainer = document.getElementById('threeContainer');
const minigameOverlay = document.getElementById('minigameOverlay');
const minigameScoreEl = document.getElementById('minigameScore');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const exitGameBtn = document.getElementById('exitGameBtn');

const nameDisplay = document.getElementById('nameDisplay');
const petNameEl = document.getElementById('petName');
const editNameBtn = document.getElementById('editNameBtn');
const nameInput = document.getElementById('nameInput');

const volSlider = document.getElementById('volSlider');

const oiiaSound = new Audio('sound/oiia.mp3');
oiiaSound.volume = 0.5;

let hunger = 100;
let happiness = 100;
let cleanliness = 100;
let energy = 100;
let coins = 0;
let isSleeping = false;
let isMinigame = false;
let catVelocityY = 0;
let catY = 0;
const gravity = 0.012;
const jumpStrength = 0.20;
let pipes = [];
const pipeSpeed = 0.06;
let pipeSpawnTimer = 0;
let minigameScore = 0;
let savedCameraPos = new THREE.Vector3();
let savedCameraRot = new THREE.Euler();
let savedModelPos = new THREE.Vector3();
let savedModelRot = new THREE.Euler();

let timer = null;
let petName = "Oiia Cat";

let scene, camera, renderer, model, mixer, clock, animId, controls;
let actions = []; 
let activeAction = null;
let idleAction = null; 
let danceAction = null; 
let danceFinished = false; 
let isDancing = false; 

const STORAGE_KEYS = {
  hunger: 'tamagotchi.hunger',
  happiness: 'tamagotchi.happiness',
  cleanliness: 'tamagotchi.cleanliness',
  energy: 'tamagotchi.energy',
  coins: 'tamagotchi.coins',
  sleeping: 'tamagotchi.sleeping',
  last: 'tamagotchi.lastTick',
  name: 'tamagotchi.name',
  volume: 'tamagotchi.volume'
}

function clamp(v){return Math.max(0, Math.min(MAX, Math.round(v)))}

function saveState(){
  localStorage.setItem(STORAGE_KEYS.hunger, String(hunger));
  localStorage.setItem(STORAGE_KEYS.happiness, String(happiness));
  localStorage.setItem(STORAGE_KEYS.cleanliness, String(cleanliness));
  localStorage.setItem(STORAGE_KEYS.energy, String(energy));
  localStorage.setItem(STORAGE_KEYS.coins, String(coins));
  localStorage.setItem(STORAGE_KEYS.sleeping, isSleeping ? '1' : '0');
  localStorage.setItem(STORAGE_KEYS.last, String(Date.now()));
}

function loadState(){
  const h = parseInt(localStorage.getItem(STORAGE_KEYS.hunger));
  const hp = parseInt(localStorage.getItem(STORAGE_KEYS.happiness));
  const cl = parseInt(localStorage.getItem(STORAGE_KEYS.cleanliness));
  const en = parseInt(localStorage.getItem(STORAGE_KEYS.energy));
  const co = parseInt(localStorage.getItem(STORAGE_KEYS.coins));
  const slp = localStorage.getItem(STORAGE_KEYS.sleeping);
  const last = parseInt(localStorage.getItem(STORAGE_KEYS.last));
  const storedName = localStorage.getItem(STORAGE_KEYS.name);
  const storedVol = parseFloat(localStorage.getItem(STORAGE_KEYS.volume));

  if(!Number.isNaN(h)) hunger = clamp(h);
  if(!Number.isNaN(hp)) happiness = clamp(hp);
  if(!Number.isNaN(cl)) cleanliness = clamp(cl);
  if(!Number.isNaN(en)) energy = clamp(en);
  if(!Number.isNaN(co)) coins = Math.max(0, co);
  if(slp === '1') toggleSleep(true);

  if(storedName && storedName.trim() !== "") {
    petName = storedName;
  }
  petNameEl.textContent = petName;

  if(!Number.isNaN(storedVol)){
    volSlider.value = storedVol;
    oiiaSound.volume = storedVol;
  }

  if(!Number.isNaN(last)){
    const now = Date.now();
    const elapsed = now - last;
    const ticks = Math.floor(elapsed / INTERVAL);
    if(ticks > 0){
      if (isSleeping) {
        energy = clamp(energy + ticks * 10);
        hunger = clamp(hunger - ticks * DECAY * 0.5);
        happiness = clamp(happiness - ticks * DECAY * 0.5);
        cleanliness = clamp(cleanliness - ticks * DECAY * 0.5);
      } else {
        const loss = ticks * DECAY;
        hunger = clamp(hunger - loss);
        happiness = clamp(happiness - loss);
        cleanliness = clamp(cleanliness - loss);
        energy = clamp(energy - loss);
      }
      localStorage.setItem(STORAGE_KEYS.last, String(now));
    }
  }
}

function updateUI(){
  hungerFill.style.width = hunger + '%';
  happinessFill.style.width = happiness + '%';
  cleanFill.style.width = cleanliness + '%';
  energyFill.style.width = energy + '%';

  hungerLabel.textContent = hunger + '%';
  happinessLabel.textContent = happiness + '%';
  cleanLabel.textContent = cleanliness + '%';
  energyLabel.textContent = energy + '%';
  
  coinsLabel.textContent = coins;
}

function toggleSleep(forceSleep = null) {
  if (forceSleep !== null) {
    isSleeping = forceSleep;
  } else {
    isSleeping = !isSleeping;
  }
  
  if (isSleeping) {
    threeContainer.classList.add('sleeping');
    sleepBtn.textContent = 'Uyandır';
    feedBtn.disabled = true;
    playBtn.disabled = true;
    cleanBtn.disabled = true;
  } else {
    threeContainer.classList.remove('sleeping');
    sleepBtn.textContent = 'Uyku';
    feedBtn.disabled = false;
    playBtn.disabled = false;
    cleanBtn.disabled = false;
  }
  saveState();
}

function checkDeath(){
  if(hunger <= 0 || happiness <= 0 || cleanliness <= 0 || energy <= 0){
    setDead();
    return true;
  }
  return false;
}

function setDead(){
  feedBtn.disabled = true;
  playBtn.disabled = true;
  cleanBtn.disabled = true;
  sleepBtn.disabled = true;
  restartBtn.classList.remove('hidden');
  clearInterval(timer);
  saveState();
  if(activeAction) activeAction.stop();
  if(model){
    model.traverse((c)=>{
      if(c.material) c.material.color.setHex(0x666666);
    });
  }
  if(animId) cancelAnimationFrame(animId);
}

function revive(){
  hunger = 100; happiness = 100; cleanliness = 100; energy = 100;
  if(isSleeping) toggleSleep(false);
  feedBtn.disabled = false;
  playBtn.disabled = false;
  cleanBtn.disabled = false;
  sleepBtn.disabled = false;
  restartBtn.classList.add('hidden');
  saveState();
  startTimer();
  updateUI();
  if(model){
    model.traverse((c)=>{
      if(c.material) c.material.color.setHex(0xffffff);
    });
  }
  if(idleAction){
    if(activeAction && activeAction !== idleAction) activeAction.stop();
    activeAction = idleAction;
    activeAction.play();
  }
  animate();
}

function tick(){
  if(isSleeping) {
    energy = clamp(energy + 10);
    hunger = clamp(hunger - DECAY * 0.5);
    happiness = clamp(happiness - DECAY * 0.5);
    cleanliness = clamp(cleanliness - DECAY * 0.5);
  } else {
    hunger = clamp(hunger - DECAY);
    happiness = clamp(happiness - DECAY);
    cleanliness = clamp(cleanliness - DECAY);
    energy = clamp(energy - DECAY);
  }
  updateUI();
  saveState();
  checkDeath();
}

function startTimer(){
  if(timer) clearInterval(timer);
  timer = setInterval(tick, INTERVAL);
}

function showFloatingText(elementId, messages, colorClass) {
  const labelEl = document.getElementById(elementId);
  if(!labelEl) return;
  const container = labelEl.closest('.bar-box');
  if(!container) return;

  const msg = messages[Math.floor(Math.random() * messages.length)];
  const floatEl = document.createElement('div');
  floatEl.className = 'floating-feedback';
  floatEl.style.color = colorClass;
  floatEl.textContent = msg;

  container.appendChild(floatEl);
  setTimeout(() => { floatEl.remove(); }, 1000);
}

function enableNameEdit(){
  nameInput.value = petName;
  nameDisplay.classList.add('hidden');
  nameInput.classList.remove('hidden');
  nameInput.focus();
}

function saveName(){
  const newName = nameInput.value.trim();
  if(newName.length > 0){
    petName = newName;
    petNameEl.textContent = petName;
    localStorage.setItem(STORAGE_KEYS.name, petName);
  }
  nameInput.classList.add('hidden');
  nameDisplay.classList.remove('hidden');
}

editNameBtn.addEventListener('click', enableNameEdit);

nameInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    saveName();
  } else if(e.key === 'Escape'){
    nameInput.classList.add('hidden');
    nameDisplay.classList.remove('hidden');
  }
});

nameInput.addEventListener('blur', saveName);

volSlider.addEventListener('input', (e)=>{
  const val = parseFloat(e.target.value);
  oiiaSound.volume = val;
  localStorage.setItem(STORAGE_KEYS.volume, String(val));
});

function initThree(){
  try{
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
    camera.position.set(0, 0.8, 2.2);
    renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    const w = threeContainer.clientWidth || 200;
    const h = threeContainer.clientHeight || 200;
    renderer.setSize(w, h);
    threeContainer.appendChild(renderer.domElement);

    renderer.domElement.addEventListener('pointerdown', (event) => {
      if(isMinigame && gameOverScreen.classList.contains('hidden')) {
        flap();
        return;
      }
      if (isSleeping || feedBtn.disabled || isMinigame) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(scene, true);
      if (intersects.length > 0) {
        happiness = clamp(happiness + 5);
        coins += 1;
        updateUI();
        saveState();
        oiiaSound.currentTime = 0;
        oiiaSound.play().catch(e => console.log('Audio play failed:', e));
        triggerDanceAnimation();
        showFloatingText('happinessLabel', ['Miyav!', 'Purr...'], '#8ee5b8');
        showFloatingText('coinsLabel', ['+1 Altın'], '#ffd700');
      }
    });

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.152.2/examples/jsm/libs/draco/');

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3,10,10);
    scene.add(dir);

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    const candidates = ['model/cat.glb','model.glb','model/cat.gltf','model.gltf'];
    let tried = 0;
    function tryLoadNext(){
      if(tried >= candidates.length){
        createFallbackModel();
        return;
      }
      const url = candidates[tried++];
      loader.load(url, (gltf)=>{
        model = gltf.scene;
        normalizeModel(model);
        scene.add(model);
        frameModel(model);
        if(gltf.animations && gltf.animations.length){
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip)=>{
            const action = mixer.clipAction(clip);
            actions.push(action);
            const clipName = clip.name.toLowerCase();
            if(clipName.includes('static')){
              idleAction = action;
            } else if(clipName.includes('take 001') || clipName.includes('take001')){
              danceAction = action;
            }
          });
          if(idleAction){
            activeAction = idleAction;
            activeAction.clampWhenFinished = true;
          }
          if(danceAction){
            try{
              danceAction.setLoop(THREE.LoopOnce, 0);
              danceAction.clampWhenFinished = true;
            }catch(e){}
          }
          if(mixer && typeof mixer.addEventListener === 'function'){
            mixer.addEventListener('finished', (ev)=>{
              try{
                if(ev.action === danceAction){
                  danceFinished = true;
                  isDancing = false;
                  returnToIdle();
                }
              }catch(err){}
            });
          }
        }
        animate();
      }, undefined, (err)=>{
        tryLoadNext();
      });
    }
    tryLoadNext();

    window.addEventListener('resize', onWindowResize);
  }catch(e){
    console.error('three.js init failed', e);
  }
}

function createFallbackModel(){
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({color:0xffcc88, roughness:0.6, metalness:0.0});
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), bodyMat);
  body.position.y = 0.3;
  group.add(body);
  const eyeMat = new THREE.MeshStandardMaterial({color:0x222222});
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.24,0.45,0.72);
  eyeR.position.set(0.24,0.45,0.72);
  group.add(eyeL, eyeR);
  scene.add(group);
  model = group;
  animate();
}

function normalizeModel(obj){
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if(maxDim > 0){
    const target = 4.2; 
    const scale = target / maxDim;
    obj.scale.setScalar(scale);
  }
  const box2 = new THREE.Box3().setFromObject(obj);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  obj.position.sub(center);
  const box3 = new THREE.Box3().setFromObject(obj);
  const min = box3.min;
  obj.position.y += -min.y + 0.02;
  obj.position.x = 0;
  obj.position.z = 0;
  obj.position.y -= 0.8;
}

function frameModel(obj){
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function onWindowResize(){
  if(!renderer) return;
  const width = Math.max(160, threeContainer.clientWidth);
  const height = Math.max(160, threeContainer.clientHeight);
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate(){
  animId = requestAnimationFrame(animate);
  const dt = clock ? clock.getDelta() : 0.016;
  if(mixer){
    mixer.update(dt);
  }
  if(controls && !isMinigame){
    controls.update();
  }
  
  if(isMinigame && gameOverScreen.classList.contains('hidden') && model) {
    catVelocityY -= gravity;
    catY += catVelocityY;
    model.position.y = savedModelPos.y + catY;
    
    pipeSpawnTimer--;
    if(pipeSpawnTimer <= 0) {
      spawnPipe();
      pipeSpawnTimer = 75;
    }
    
    const cx = -1.5;

    for(let i=pipes.length-1; i>=0; i--) {
      const p = pipes[i];
      p.position.x -= pipeSpeed;
      
      const px = p.position.x;
      // Cat width ~0.5, Pipe width ~0.8
      if (px - 0.4 < cx + 0.25 && px + 0.4 > cx - 0.25) {
        const gapY = p.userData.gapY;
        const gapSize = p.userData.gapSize;
        const topLimit = gapY + gapSize/2;
        const botLimit = gapY - gapSize/2;
        // Cat height ~0.6
        if (catY + 0.3 > topLimit || catY - 0.3 < botLimit) {
          endMinigame();
        }
      }
      
      if(!p.userData.passed && p.position.x < cx) {
        p.userData.passed = true;
        minigameScore++;
        minigameScoreEl.textContent = minigameScore;
        
        oiiaSound.currentTime = 0;
        oiiaSound.play().catch(e => {});
      }
      
      if(p.position.x < -12) {
        scene.remove(p);
        pipes.splice(i, 1);
      }
    }
    
    if(catY > 4.5 || catY < -4.5) {
      endMinigame();
    }
  }

  if(renderer) renderer.render(scene, camera);
}

function returnToIdle(){
  if(idleAction && mixer && !feedBtn.disabled){
    if(activeAction && activeAction !== idleAction) activeAction.stop();
    activeAction = idleAction;
    activeAction.reset();
    activeAction.clampWhenFinished = true;
    activeAction.play();
    danceFinished = false;
    isDancing = false;
  }
}

function triggerDanceAnimation(){
  if(!danceAction) return;
  if(isDancing) return;
  isDancing = true;
  danceFinished = false;

  try{ danceAction.setLoop(THREE.LoopOnce, 0); }catch(e){}
  danceAction.clampWhenFinished = true;
  danceAction.enabled = true;
  danceAction.setEffectiveTimeScale(typeof DANCE_SPEED !== 'undefined' ? DANCE_SPEED : 1.0);
  danceAction.setEffectiveWeight(1);

  if(activeAction && activeAction !== danceAction){
    try{ activeAction.stop(); }catch(e){}
  }

  activeAction = danceAction;
  activeAction.reset();
  activeAction.play();
}

initThree();

feedBtn.addEventListener('click', ()=>{
  if(feedBtn.disabled || isSleeping || isMinigame) return;
  if(coins < 10) {
    showFloatingText('coinsLabel', ['Yetersiz Altın!'], '#ff6b6b');
    return;
  }
  coins -= 10;
  hunger = clamp(hunger + 20);
  updateUI();
  saveState();
  
  showFloatingText('hungerLabel', ['Afiyet Olsun!'], '#ff9f4a');
  showFloatingText('coinsLabel', ['-10 Altın'], '#ff6b6b');

  oiiaSound.currentTime = 0;
  oiiaSound.play().catch(e => console.log('Audio play failed:', e));
  
  triggerDanceAnimation();
});

playBtn.addEventListener('click', ()=>{
  if(playBtn.disabled || isSleeping || isMinigame) return;
  startMinigame();
});

cleanBtn.addEventListener('click', ()=>{
  if(cleanBtn.disabled || isSleeping || isMinigame) return;
  if(coins < 5) {
    showFloatingText('coinsLabel', ['Yetersiz Altın!'], '#ff6b6b');
    return;
  }
  coins -= 5;
  cleanliness = clamp(cleanliness + 40);
  updateUI();
  saveState();

  showFloatingText('cleanLabel', ['Tertemiz!'], '#5ab1ff');
  showFloatingText('coinsLabel', ['-5 Altın'], '#ff6b6b');

  triggerDanceAnimation();
});

sleepBtn.addEventListener('click', ()=>{
  if(sleepBtn.disabled) return;
  toggleSleep();
});

restartBtn.addEventListener('click', ()=>{
  revive();
});

loadState();
updateUI();
if(!checkDeath()) startTimer();

function flap() {
  if (!isMinigame || !gameOverScreen.classList.contains('hidden')) return;
  catVelocityY = jumpStrength;
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (isMinigame && gameOverScreen.classList.contains('hidden')) {
      e.preventDefault();
      flap();
    }
  }
});

function spawnPipe() {
  const gapSize = 3.2;
  const gapY = (Math.random() * 2) - 1.0; 
  
  const pipeMat = new THREE.MeshStandardMaterial({color: 0x5ee270, roughness: 0.2});
  const pipeGeo = new THREE.BoxGeometry(0.8, 12, 0.8);
  
  const topPipe = new THREE.Mesh(pipeGeo, pipeMat);
  topPipe.position.set(0, gapY + gapSize/2 + 6, 0);
  
  const bottomPipe = new THREE.Mesh(pipeGeo, pipeMat);
  bottomPipe.position.set(0, gapY - gapSize/2 - 6, 0);
  
  const pipeGroup = new THREE.Group();
  pipeGroup.add(topPipe);
  pipeGroup.add(bottomPipe);
  pipeGroup.userData.passed = false;
  pipeGroup.userData.gapY = gapY;
  pipeGroup.userData.gapSize = gapSize;
  pipeGroup.position.set(10, savedModelPos.y, 0);
  
  scene.add(pipeGroup);
  pipes.push(pipeGroup);
}

function startMinigame() {
  isMinigame = true;
  document.body.classList.add('minigame-active');
  setTimeout(onWindowResize, 50);

  minigameScore = 0;
  minigameScoreEl.textContent = '0';
  pipeSpawnTimer = 0;
  pipes.forEach(p => scene.remove(p));
  pipes = [];
  catVelocityY = 0;
  catY = 0;
  
  if(controls) controls.enabled = false;
  
  savedCameraPos.copy(camera.position);
  savedCameraRot.copy(camera.rotation);
  if(model) {
    savedModelPos.copy(model.position);
    savedModelRot.copy(model.rotation);
    model.position.set(-1.5, savedModelPos.y, 0);
    model.rotation.set(0, Math.PI/2, 0);
  }
  
  camera.position.set(0, savedModelPos.y, 6);
  camera.lookAt(0, savedModelPos.y, 0);
  
  minigameOverlay.classList.remove('hidden');
  gameOverScreen.classList.add('hidden');
}

function endMinigame() {
  gameOverScreen.classList.remove('hidden');
  minigameOverlay.classList.add('hidden');
  finalScoreEl.textContent = minigameScore;
}

exitGameBtn.addEventListener('click', () => {
  coins += minigameScore;
  isMinigame = false;
  document.body.classList.remove('minigame-active');
  setTimeout(onWindowResize, 50);

  if(controls) {
    controls.enabled = true;
    controls.update();
  }
  
  camera.position.copy(savedCameraPos);
  camera.rotation.copy(savedCameraRot);
  if(model) {
    model.position.copy(savedModelPos);
    model.rotation.copy(savedModelRot);
  }
  
  pipes.forEach(p => scene.remove(p));
  pipes = [];
  
  gameOverScreen.classList.add('hidden');
  updateUI();
  saveState();
});