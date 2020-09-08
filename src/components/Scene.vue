<template>
  <div
    class="scene"
    ref="scene"
    v-on:dblclick="onDblClick"
    v-on:mousemove="onMouseMove"
    v-bind:style="{ cursor: pointerStyle }"
  />
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { VariablePoints } from "../utils/VariablePoints";

const NUM_POINTS = 100;
const CAMERA_SCALE = 200.0;
const CANVAS_SCALE = 0.95;
const MAX_POINT_SIZE = 100.0;

@Component<Scene>({
  data() {
    return {
      pointerStyle: "auto"
    };
  },

  mounted() {
    const [width, height] = this.getTargetClientRectSize();
    const [[minX, maxX], [minY, maxY]] = this.getCameraFrustum();

    this.camera = new THREE.OrthographicCamera(
      minX,
      maxX,
      maxY,
      minY,
      0.1,
      1000
    );
    this.renderer.setSize(width, height);
    const el = this.$refs.scene as Element;
    el.appendChild(this.renderer.domElement);

    if (!this.raycaster.params.Points) {
      this.raycaster.params.Points = { threshold: 0.1 };
    } else {
      this.raycaster.params.Points.threshold = 0.1;
    }

    this.points = this.generatePoints(NUM_POINTS);
    this.scene.add(this.points);
    this.camera.position.z = 5;

    this.renderer.render(this.scene, this.camera);

    this.orbitControl = new OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    window.addEventListener("resize", this.onResize);

    const animate = () => {
      this.orbitControl.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(animate);
    };
    animate();
  },

  destroyed() {
    window.removeEventListener("resize", this.onResize);
  },

  methods: {
    onDblClick: function() {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      this.points = this.generatePoints(NUM_POINTS);
      this.scene.add(this.points);
      this.renderer.render(this.scene, this.camera);
    },

    onMouseMove: function(event) {
      const [width, height] = this.getTargetClientRectSize();
      const mousePosition = new THREE.Vector2(
        (event.clientX / width) * 2 - 1,
        1 - (event.clientY / height) * 2
      );
      this.raycaster.setFromCamera(mousePosition, this.camera);

      // calculate objects intersecting the picking ray
      const intersects = this.raycaster.intersectObjects([this.points]);

      if (intersects.length) {
        this.$data.pointerStyle = "pointer";
      } else {
        this.$data.pointerStyle = "auto";
      }

      this.renderer.render(this.scene, this.camera);
    }
  }
})
export default class Scene extends Vue {
  private camera!: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
  private scene: THREE.Scene = new THREE.Scene();
  private points!: VariablePoints;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private orbitControl!: OrbitControls;

  private onResize() {
    const [width, height] = this.getTargetClientRectSize();
    this.renderer.setSize(width, height);

    this.points.userData.width = width;
    this.points.userData.height = height;

    const [[minX, maxX], [minY, maxY]] = this.getCameraFrustum();
    this.camera.left = minX;
    this.camera.right = maxX;
    this.camera.top = maxY;
    this.camera.bottom = minY;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  private getTargetClientRectSize() {
    return [
      window.innerWidth * CANVAS_SCALE,
      window.innerHeight * CANVAS_SCALE
    ];
  }

  private getCameraFrustum() {
    const [width, height] = this.getTargetClientRectSize();
    const minX = -width / CAMERA_SCALE;
    const maxX = width / CAMERA_SCALE;
    const minY = -height / CAMERA_SCALE;
    const maxY = height / CAMERA_SCALE;

    return [
      [minX, maxX],
      [minY, maxY]
    ];
  }

  private generatePoints(nVertices = NUM_POINTS) {
    const [[minX, maxX], [minY, maxY]] = this.getCameraFrustum();
    const positions = new Float32Array(nVertices * 3);
    const colors = new Float32Array(nVertices * 3);
    const sizes = new Float32Array(nVertices);

    for (let i = 0; i < nVertices; i++) {
      positions[i * 3] = minX + Math.random() * (maxX - minX);
      positions[i * 3 + 1] = minY + Math.random() * (maxY - minY);
      positions[i * 3 + 2] = -2 + Math.random() * 4;

      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();

      sizes[i] = Math.random() * MAX_POINT_SIZE;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("ca", new THREE.BufferAttribute(colors, 3));

    const [width, height] = this.getTargetClientRectSize();
    return new VariablePoints(width, height, geometry);
  }
}
</script>

<style scoped>
.scene {
  width: 100%;
  height: 100%;
}
</style>
