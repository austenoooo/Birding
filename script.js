import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from 'three/addons/loaders/FBXLoader'
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

let scene, camera, renderer;
// models
let forest;

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

function init() {
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);

  // enable shadow
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
  // document.getElementById("environment").appendChild(renderer.domElement);
  document.body.appendChild(renderer.domElement);

  // background color
  let backgroundColor = new THREE.Color(0xE0FFEF);
  renderer.setClearColor(backgroundColor);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1, 
    1000
  );

  camera.position.set(-6, 10, 6);
  camera.lookAt(6, 10, -6);


  // lighting
  const light = new THREE.AmbientLight( 0xd9ffe2, 0.5); // soft white light
  scene.add( light ); 

  var hemiLight = new THREE.HemisphereLight( 0xffff85, 0xffff85, 0.6 );
  hemiLight.position.set( 0, 500, 0 );
  scene.add( hemiLight );

  var dirLight = new THREE.DirectionalLight( 0xffffed, 1 );
  dirLight.position.set( -1, 0.75, 1 );
  dirLight.position.multiplyScalar( 50);
  scene.add( dirLight );


  // helper functions
  const axesHelper = new THREE.AxesHelper(30);
  // scene.add(axesHelper);
  const gridHelper = new THREE.GridHelper(200, 200);
  // scene.add(gridHelper);

  // controls = new OrbitControls(camera, renderer.domElement);

  createControl();

  environmentMap();
  

  loop();

}

function environmentMap() {
  let loader = new RGBELoader();
  loader.load("./textures/sky.hdr", (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    environment = texture;
    loadForestModel();
  });
}

function loadForestModel() {

  const loader = new THREE.TextureLoader();
  const forestDiffuse = loader.load("model/textures/forest_diffuse.png");
  const forestNormal = loader.load("model/textures/forest_normal.png");
  const forestOcculusion = loader.load("model/textures/forest_occlusion.png");
  const forestSpecular = loader.load("model/textures/forest_specularGlossiness.png");
  

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
    shininess: 200,
    envMap: environment,
    // transparent: true,
    alphaTest: 0.5,
  })
  

  gltfLoader.load("model/scene.gltf", function (gltf) {
    
    forest = gltf.scene;
    forest.traverse(function (object){
      if (object.isMesh){
        object.material = forestMaterial;
      }
    });

    forest.position.set(0, 0, 0);
    // forest.scale.set(0.1, 0.1, 0.1);
    scene.add(forest);
  })
  
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


  prevTime = time;

  renderer.render(scene, camera);

  window.requestAnimationFrame(loop);

}

init();