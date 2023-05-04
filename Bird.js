import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class Bird{

  constructor(x, y, z, angle, scene, birdName){
    this.x = x;
    this.y = y;
    this.z = z;
    this.birdName = birdName;
    this.angle = angle

    this.model;

    const gltfLoader = new GLTFLoader();

    // load the place the model in the environment
    gltfLoader.load("./model/" + birdName + ".gltf", function (gltf) {
      let model = gltf.scene;
  
      model.traverse(function (object){
        if (object.isMesh){
          object.material.metalness = 0.8;
          object.material.roughness = 0.2;
        }
      });
  
      model.scale.set(0.5, 0.5, 0.5);
      model.position.set(x, y, z);
      model.rotation.set(0, Math.PI / 2 + angle, 0);
      scene.add(model);
      
    });
  }
}

