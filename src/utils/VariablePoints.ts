/**
 * VariablePoints extends the original Points class and considers the "size"
 * and "ca" buffers of the given buffer geometry in order to render points of
 * variable sizes and colors. Each point is drawn in circle with the diameter
 * in pixels specified by the size buffer.
 */

import {
  Box3,
  BufferGeometry,
  Intersection,
  Matrix4,
  Plane,
  Points,
  Raycaster,
  ShaderMaterial,
  Sphere,
  Vector3,
} from "three";

const _screenRadii = new Vector3();
const _topRight = new Vector3();
const _bottomLeft = new Vector3();
const _temp = new Vector3();
const _box3 = new Box3();
const _intersectPoint = new Vector3();

// intersection testing function
function testPoint(
  screenPosition: Vector3,
  pixelSize: number,
  screenWidth: number,
  screenHeight: number,
  unprojectMatrix: Matrix4,
  raycaster: Raycaster,
  intersects: Intersection[],
  index: number,
  object: VariablePoints
) {
  // unprojects the top right and bottom left point of the screen-space
  // circle's bounding box to world space to perform ray casting with Box3
  _screenRadii.set(pixelSize / screenWidth, pixelSize / screenHeight, 0);
  _topRight
    .copy(screenPosition)
    .add(_screenRadii)
    .applyMatrix4(unprojectMatrix);
  _bottomLeft
    .copy(screenPosition)
    .sub(_screenRadii)
    .applyMatrix4(unprojectMatrix);
  _temp.copy(_topRight);
  _topRight.max(_bottomLeft);
  _bottomLeft.min(_temp);

  _box3.set(_bottomLeft, _topRight);
  if (raycaster.ray.intersectBox(_box3, _intersectPoint)) {
    intersects.push({
      distance: raycaster.ray.origin.distanceTo(_intersectPoint),
      point: _intersectPoint.clone(),
      index,
      face: null,
      object: object,
    });
  }
}

const _screenPosition = new Vector3();
const _sphere = new Sphere();
const _modelViewProjectionMatrix = new Matrix4();
const _unprojectMatrix = new Matrix4();

export class VariablePoints extends Points<BufferGeometry, ShaderMaterial> {
  constructor(width: number, height: number, geometry?: BufferGeometry) {
    const material = new ShaderMaterial({
      uniforms: {},
      vertexShader: `
              attribute float size;
              attribute vec3 ca;
  
              varying vec3 vertexCa;
  
              void main() {
                  vertexCa = ca;
                  gl_PointSize = size;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
              }
          `,
      fragmentShader: `
              varying vec3 vertexCa;
              void main() {
                  float dist = distance(gl_PointCoord, vec2(0.5, 0.5));
  
                  if (dist >= 0.5) {
                      discard;
                  } else {
                      gl_FragColor = vec4(vertexCa, 1.0);
                  }
              }
          `,
    });

    super(geometry, material);

    this.userData.width = width;
    this.userData.height = height;
  }

  raycast(raycaster: Raycaster, intersects: Intersection[]): void {
    if (raycaster.camera === null) {
      console.error(
        'VariablePoints: "Raycaster.camera" needs to be set in order to raycast.'
      );
    } else if (!this.userData.width || !this.userData.height) {
      console.error(
        "VariablePoints: needs screen width and height in userData in order to raycast."
      );
    }

    const geometry = this.geometry;
    const matrixWorld = this.matrixWorld;
    const threshold = raycaster.params.Points?.threshold || 1.0;

    // Checking boundingSphere distance to ray
    if (geometry.boundingSphere === null) geometry.computeBoundingSphere();

    if (geometry.boundingSphere) {
      _sphere.copy(geometry.boundingSphere);
      _sphere.applyMatrix4(matrixWorld);
      _sphere.radius += threshold;
    }
    if (raycaster.ray.intersectsSphere(_sphere) === false) return;

    const index = this.geometry.index;
    const attributes = this.geometry.attributes;
    const positions = attributes.position.array;
    const sizes = attributes.size.array;

    _modelViewProjectionMatrix
      .copy(this.matrixWorld)
      .premultiply(raycaster.camera.matrixWorldInverse)
      .premultiply(raycaster.camera.projectionMatrix);

    _unprojectMatrix
      .copy(raycaster.camera.projectionMatrixInverse)
      .premultiply(raycaster.camera.matrixWorld);

    if (index !== null) {
      const indices = index.array;

      for (let i = 0, il = indices.length; i < il; i++) {
        const a = indices[i];

        _screenPosition
          .fromArray(positions, a * 3)
          .applyMatrix4(_modelViewProjectionMatrix);
        const size = sizes[a];

        testPoint(
          _screenPosition,
          size,
          this.userData.width,
          this.userData.height,
          _unprojectMatrix,
          raycaster,
          intersects,
          a,
          this
        );
      }
    } else {
      for (let i = 0, l = positions.length / 3; i < l; i++) {
        _screenPosition
          .fromArray(positions, i * 3)
          .applyMatrix4(_modelViewProjectionMatrix);
        const size = sizes[i];

        testPoint(
          _screenPosition,
          size,
          this.userData.width,
          this.userData.height,
          _unprojectMatrix,
          raycaster,
          intersects,
          i,
          this
        );
      }
    }
  }

  copy(source: VariablePoints) {
    Points.prototype.copy.call(this, source);

    this.material = source.material;
    this.userData.width = source.userData.width;
    this.userData.height = source.userData.height;

    return this;
  }
}
