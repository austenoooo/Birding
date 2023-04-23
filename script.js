import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from 'three/addons/loaders/FBXLoader'
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

let scene, camera, renderer;
let controls;

// models
let forest;

let environment;

const gltfLoader = new GLTFLoader();

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
  let backgroundColor = new THREE.Color(0xffffff);
  renderer.setClearColor(backgroundColor);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1, 
    1000
  );

  camera.position.set(0, 10, 0);
  camera.lookAt(10, 20, 10);

  // add light
  // const directionalLight = new THREE.DirectionalLight(0xffffc9, 1);
  // scene.add( directionalLight );
  // directionalLight.position.set(100, 100, 100);
  // directionalLight.lookAt(0, 0, 0);

  const light = new THREE.AmbientLight( 0xffffff ); // soft white light
  scene.add( light ); 


  // helper functions
  const axesHelper = new THREE.AxesHelper(30);
  scene.add(axesHelper);
  const gridHelper = new THREE.GridHelper(200, 200);
  scene.add(gridHelper);

  controls = new OrbitControls(camera, renderer.domElement);

  environmentMap();
  loadForestModel();

  loop();

}

function environmentMap() {
  let loader = new RGBELoader();
  loader.load("./textures/studio.hdr", (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    environment = texture;
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
    shininess: 100,
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

function loop() {

  renderer.render(scene, camera);

  window.requestAnimationFrame(loop);

}

init();