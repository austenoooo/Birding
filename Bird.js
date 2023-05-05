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

    
  }
}

