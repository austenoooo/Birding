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

let scene, camera, renderer, composer;
// models
let forest;
let birdModels = [];
let birdNames = [];

let birdNum = 4;
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
  // document.getElementById("environment").appendChild(renderer.domElement);
  document.body.appendChild(renderer.domElement);

  // background color
  let backgroundColor = new THREE.Color(0xe0ffef);
  renderer.setClearColor(backgroundColor);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.set(-5.5, 10, 5.5);
  camera.lookAt(6, 10, -6);

  // lighting
  const light = new THREE.AmbientLight(0xd9ffe2, 0.5); // soft white light
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

    loadBird(0, 5, 0, 0, "American_Robin");
    loadBird(3.2, 6, 4.8, Math.PI / 6, "Northern_Cardinal", true);
    loadBird(-1, 5, -1, 0, "Blue_Jay");
    loadBird(-1, 5, 0, 0, "Red-winged_Black_Bird");
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
  }
  // camera was zoomed
  else {
    cameraZoomed = false;

    // hide binocular
    binocularView.style.opacity = 0;
  }
}

function createBirdIntesection() {
  // center of the screen
  let mouse = new THREE.Vector2(0, 0);

  let rayCaster = new THREE.Raycaster();
  document.addEventListener("click", (e) => {
    rayCaster.setFromCamera(mouse, camera);
    const intersects = rayCaster.intersectObjects(birdModels);

    if (intersects.length > 0) {
      console.log(intersects[0].object.name);
    }
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
    scene.add(model);

    if (enableSound) {
    
      const audioLoader = new THREE.AudioLoader();

      let audioSource = new THREE.PositionalAudio(audioListener);

      audioLoader.load("audio/" + birdName + ".wav", function (buffer) {
        audioSource.setBuffer(buffer);
        audioSource.setDistanceModel("exponential");
        audioSource.setRefDistance(3);
        audioSource.setRolloffFactor(2);
        audioSource.setLoop(true);
        audioSource.play();
      });

      model.add(audioSource);
    }

    birdNames.push(birdName);
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

      // case "Escape":
      //   ui.style.opacity = 1;
      //   ui.style.pointerEvents = "auto";
      //   audioSource.pause();
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

  document.addEventListener("click", function () {
    controls.lock();
  });
}

function loop() {
  if (birdNames.length == birdNum && !birdIntersection) {
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

  prevTime = time;

  // make the audio listener follow the orbit control
  audioListener.position.set(
    Math.round(controls.getObject().position.x),
    Math.round(controls.getObject().position.y),
    Math.round(controls.getObject().position.z)
  );

  // renderer.render(scene, camera);
  postprocessing.composer.render(0.1);

  window.requestAnimationFrame(loop);
}

init();
