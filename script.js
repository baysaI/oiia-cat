import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MAX = 100;
const DECAY = 1; 
const INTERVAL = 10000;

const hungerFill = document.getElementById('hungerFill');
const happinessFill = document.getElementById('happinessFill');
const hungerLabel = document.getElementById('hungerLabel');
const happinessLabel = document.getElementById('happinessLabel');
const feedBtn = document.getElementById('feedBtn');
const playBtn = document.getElementById('playBtn');
const restartBtn = document.getElementById('restartBtn');
const threeContainer = document.getElementById('threeContainer');

const nameDisplay = document.getElementById('nameDisplay');
const petNameEl = document.getElementById('petName');
const editNameBtn = document.getElementById('editNameBtn');
const nameInput = document.getElementById('nameInput');

const volSlider = document.getElementById('volSlider');

const oiiaSound = new Audio('sound/oiia.mp3');
oiiaSound.volume = 0.5;

let hunger = 100;
let happiness = 100;
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
  last: 'tamagotchi.lastTick',
  name: 'tamagotchi.name',
  volume: 'tamagotchi.volume'
}

function clamp(v){return Math.max(0, Math.min(MAX, Math.round(v)))}

function saveState(){
  localStorage.setItem(STORAGE_KEYS.hunger, String(hunger));
  localStorage.setItem(STORAGE_KEYS.happiness, String(happiness));
  localStorage.setItem(STORAGE_KEYS.last, String(Date.now()));
}

function loadState(){
  const h = parseInt(localStorage.getItem(STORAGE_KEYS.hunger));
  const m = parseInt(localStorage.getItem(STORAGE_KEYS.happiness));
  const last = parseInt(localStorage.getItem(STORAGE_KEYS.last));
  const storedName = localStorage.getItem(STORAGE_KEYS.name);
  const storedVol = parseFloat(localStorage.getItem(STORAGE_KEYS.volume));

  if(!Number.isNaN(h)) hunger = clamp(h);
  if(!Number.isNaN(m)) happiness = clamp(m);

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
      const loss = ticks * DECAY;
      hunger = clamp(hunger - loss);
      happiness = clamp(happiness - loss);
      localStorage.setItem(STORAGE_KEYS.last, String(now));
    }
  }
}

function updateUI(){
  hungerFill.style.width = hunger + '%';
  happinessFill.style.width = happiness + '%';
  hungerLabel.textContent = hunger + '%';
  happinessLabel.textContent = happiness + '%';
}

function checkDeath(){
  if(hunger <= 0 || happiness <= 0){
    setDead();
    return true;
  }
  return false;
}

function setDead(){
  feedBtn.disabled = true;
  playBtn.disabled = true;
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
  hunger = 100; happiness = 100;
  feedBtn.disabled = false;
  playBtn.disabled = false;
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
  hunger = clamp(hunger - DECAY);
  happiness = clamp(happiness - DECAY);
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
  if(controls){
    controls.update();
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
  if(feedBtn.disabled) return;
  hunger = clamp(hunger + 20);
  updateUI();
  saveState();
  
  showFloatingText('hungerLabel', ['Afiyet Olsun!', 'Leziz!', 'Mmmh!', 'Doydum!'], '#ff9f4a');

  oiiaSound.currentTime = 0;
  oiiaSound.play().catch(e => console.log('Audio play failed:', e));
  
  triggerDanceAnimation();
});

playBtn.addEventListener('click', ()=>{
  if(playBtn.disabled) return;
  happiness = clamp(happiness + 20);
  updateUI();
  saveState();

  showFloatingText('happinessLabel', ['Çok Eğlenceli!', 'Harika!', 'Yaşasın!', 'Mutluyum!'], '#8ee5b8');

  oiiaSound.currentTime = 0;
  oiiaSound.play().catch(e => console.log('Audio play failed:', e));

  triggerDanceAnimation();
});

restartBtn.addEventListener('click', ()=>{
  revive();
});

loadState();
updateUI();
if(!checkDeath()) startTimer();