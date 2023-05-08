import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { Bird } from "./Bird.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";

// game progress control
let gameStart = false;

let scene, camera, renderer, composer;
// models
let forest;
let birdModels = [];

let birdNum = 24;
let birdCurrentNum = 0;
let birdIntersection = false;

let environment;

const gltfLoader = new GLTFLoader();

// controls
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let controls;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let cameraZoomed = false;

const binocularView = document.getElementById("binocular");
const startButton = document.getElementById("start-game");
const startButtonText = document.getElementById("start");
const startPage = document.getElementById("start-page");
const birdInfo = document.getElementById("bird-info");
const birdImage = document.getElementById("bird-info-image");
const closeButton = document.getElementById("close-button");
const gameEnvironment = document.getElementById("game-environment");
const pausePage = document.getElementById("pauese-page");
const learnImage = document.getElementById("learn-image");
const gameTitle = document.getElementById("game-title");

const postprocessing = {};

let audioListener;

function init() {
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // enable shadow
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
  document.getElementById("game-environment").appendChild(renderer.domElement);
  // document.body.appendChild(renderer.domElement);

  // background color
  let backgroundColor = new THREE.Color(0xe0ffef);
  renderer.setClearColor(backgroundColor);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  // camera.position.set(-5.5, 10, 5.5);
  // camera.lookAt(6, 10, -6);
  camera.position.set(0, 18, 11);
  camera.lookAt(0, 18, 0);
  

  // lighting
  const light = new THREE.AmbientLight(0xd9ffe2, 2); // soft white light
  scene.add(light);

  var hemiLight = new THREE.HemisphereLight(0xffff85, 0xffff85, 0.5);
  hemiLight.position.set(0, 500, 0);
  scene.add(hemiLight);

  var dirLight = new THREE.DirectionalLight(0xffffed, 1);
  dirLight.position.set(-1, 0.75, 1);
  dirLight.position.multiplyScalar(50);
  scene.add(dirLight);


  audioListener = new THREE.AudioListener();
  scene.add(audioListener);

  createControl();
  createBinocular();

  environmentMap();

  initPostprocessing();
  renderer.autoClear = false;

  loop();
}

function initPostprocessing() {
  const renderPass = new RenderPass(scene, camera);

  const bokehPass = new BokehPass(scene, camera, {
    focus: 3,
    aperture: 0.0004,
    maxblur: 0.005,
  });

  const composer = new EffectComposer(renderer);

  composer.addPass(renderPass);
  composer.addPass(bokehPass);

  postprocessing.composer = composer;
  postprocessing.bokeh = bokehPass;
}

function environmentMap() {
  let loader = new RGBELoader();
  loader.load("./textures/sky.hdr", (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    environment = texture;

    // scene.background = texture;

    loadForestModel();
  });
}

function createBinocular() {
  document.addEventListener("keydown", (e) => {
    if (e.code == "Space") {
      zoomCamera();
    }
  });
}

function zoomCamera() {
  // camera wasn't zoomed
  if (!cameraZoomed) {
    cameraZoomed = true;

    // show binocular
    binocularView.style.opacity = 1;
    binocularView.style.top = "0vh";
  }
  // camera was zoomed
  else {
    cameraZoomed = false;

    // hide binocular
    binocularView.style.opacity = 0;
    binocularView.style.top = "100vh";
  }
}

function createBirdIntesection() {
  // center of the screen
  let mouse = new THREE.Vector2(0, 0);

  let rayCaster = new THREE.Raycaster();
  gameEnvironment.addEventListener("click", (e) => {
    rayCaster.setFromCamera(mouse, camera);
    const intersects = rayCaster.intersectObjects(birdModels);

    if (intersects.length > 0) {
      controls.unlock();

      console.log(intersects[0].object.name);

      // show image of the bird
      let name = intersects[0].object.name;
      birdImage.src = "./textures/" + name + ".png";
      birdInfo.style.opacity = 1;
      birdInfo.style.top = "0vh";
      
    }
  });
}

function startPageModel(){
  const gltfLoader = new GLTFLoader();

  gltfLoader.load("./model/American_Robin.gltf", function (gltf) {
    let model = gltf.scene;

    model.scale.set(0.5, 0.5, 0.5);
    model.rotation.set(0, Math.PI * 1.3, 0);
    model.position.set(-1.5, 17, 8.5);
    scene.add(model);
  });
}

function loadBird(x, y, z, angle, birdName, enableSound = false) {
  const gltfLoader = new GLTFLoader();

  // load the place the model in the environment
  gltfLoader.load("./model/" + birdName + ".gltf", function (gltf) {
    let model = gltf.scene;

    model.traverse(function (object) {
      if (object.isMesh) {
        object.material.metalness = 0.8;
        object.material.roughness = 0.2;
        object.name = birdName;
      }
    });

    model.scale.set(0.5, 0.5, 0.5);
    model.position.set(x, y, z);
    model.rotation.set(0, Math.PI / 2 + angle, 0);
    forest.add(model);

    if (enableSound) {
    
      const audioLoader = new THREE.AudioLoader();

      let audioSource = new THREE.PositionalAudio(audioListener);

      audioLoader.load("audio/" + birdName + ".wav", function (buffer) {
        audioSource.setBuffer(buffer);
        audioSource.setDistanceModel("exponential");
        audioSource.setRefDistance(3);
        audioSource.setRolloffFactor(2);
        audioSource.setLoop(true);
        audioSource.setVolume( 0.8 );
        audioSource.play();
      });

      model.add(audioSource);
    }

    birdCurrentNum += 1;

    birdModels.push(model);
  });
}

function loadForestModel() {
  const loader = new THREE.TextureLoader();
  const forestDiffuse = loader.load("model/textures/forest_diffuse.png");
  const forestNormal = loader.load("model/textures/forest_normal.png");
  const forestOcculusion = loader.load("model/textures/forest_occlusion.png");
  const forestSpecular = loader.load(
    "model/textures/forest_specularGlossiness.png"
  );

  forestDiffuse.wrapS = forestDiffuse.wrapT = THREE.RepeatWrapping;
  forestNormal.wrapS = forestNormal.wrapT = THREE.RepeatWrapping;
  forestOcculusion.wrapS = forestOcculusion.wrapT = THREE.RepeatWrapping;
  forestSpecular.wrapS = forestSpecular.wrapT = THREE.RepeatWrapping;

  forestDiffuse.magFilter = THREE.NearestFilter;
  forestNormal.magFilter = THREE.NearestFilter;
  forestOcculusion.magFilter = THREE.NearestFilter;
  forestSpecular.magFilter = THREE.NearestFilter;

  forestDiffuse.flipY = false;
  forestNormal.flipY = false;
  forestOcculusion.flipY = false;
  forestSpecular.flipY = false;

  const forestMaterial = new THREE.MeshPhongMaterial({
    map: forestDiffuse,
    normalMap: forestNormal,
    aoMap: forestOcculusion,
    specularMap: forestSpecular,
    shininess: 0,
    envMap: environment,
    // transparent: true,
    alphaTest: 0.5,
    reflectivity: 0.8,
  });

  gltfLoader.load("model/scene.gltf", function (gltf) {
    forest = gltf.scene;
    forest.traverse(function (object) {
      if (object.isMesh) {
        object.material = forestMaterial;
        object.castShadow = true;
        object.receiveShadow = true;
      }

      loadBird(0.5, 5, -1, Math.PI / 3, "American_Robin", true);
      loadBird(3, 14, -4.5, Math.PI, "Northern_Cardinal", true);
      loadBird(-5, 13, -8, Math.PI / 6, "Blue_Jay", true);
      loadBird(8.2, 9, 6.8, -Math.PI / 6, "Red-winged_Black_Bird", true);
      startPageModel();

    });

    forest.position.set(0, 0, 0);
    // forest.scale.set(0.1, 0.1, 0.1);
    scene.add(forest);
  });
}



function createControl() {
  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  const onKeyDown = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;

      case "Escape":
        // if (gameStart){
        //   pausePage.style.opacity = 1;
        //   pausePage.style.top = "0vh";
        // }
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  gameEnvironment.addEventListener("click", function () {
    if (gameStart){
      controls.lock();
    }
  });
}

function loop() {
  if (birdCurrentNum == birdNum && !birdIntersection) {
    
    createBirdIntesection();
    birdIntersection = true;
  }

  const time = performance.now();

  if (controls.isLocked == true) {
    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // ensures consistent movements in all directions

    if (moveForward || moveBackward) {
      velocity.z -= direction.z * 40.0 * delta;
    }
    if (moveLeft || moveRight) {
      velocity.x -= direction.x * 40.0 * delta;
    }

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // TODO: Confine the camera position between -15 to 15
  }

  // update the camera zoom
  if (cameraZoomed) {
    camera.zoom = camera.zoom + (5 - camera.zoom) / 2;
    camera.updateProjectionMatrix();
  } else {
    camera.zoom = camera.zoom - (camera.zoom - 1) / 2;
    camera.updateProjectionMatrix();
  }

  // update camera position when game start
  // camera y value change from 19 to 10
  if (gameStart){
    if (camera.position.y > 10){
      camera.position.y = camera.position.y - (camera.position.y - 10) / 20;
      camera.updateProjectionMatrix();
    }
  }

  prevTime = time;

  // make the audio listener follow the orbit control
  audioListener.position.set(
    Math.round(controls.getObject().position.x),
    Math.round(controls.getObject().position.y),
    Math.round(controls.getObject().position.z)
  );

  console.log(camera.position.x + ", " + camera.position.z);
  
 
  // renderer.render(scene, camera);
  postprocessing.composer.render(0.1);

  window.requestAnimationFrame(loop);
}

init();




let learnIndex = 0;


startButton.addEventListener("click", () => {
  if (learnIndex == 0){
    learnImage.style.display = "block";
    gameTitle.style.display = "none";
    startButtonText.innerText = "NEXT";
  }

  if (learnIndex == 1){
    learnImage.src = "./textures/learn_1.png";
  }

  if (learnIndex == 2){
    learnImage.src = "./textures/learn_2.png";
    startButtonText.innerText = "START BIRDING!";
    startButton.style.width = "200px";
    startButton.style.marginLeft = "calc(50vw - 100px)";
  }

  if (learnIndex == 3){
    gameStart = true;
    startPage.style.top = "-100vh";
    controls.lock();
  }

  learnIndex += 1;
});

closeButton.addEventListener("click", () => {
  console.log("closing");

  birdInfo.style.opacity = 0;
  birdInfo.style.top = "100vh";
  controls.lock();
 
});