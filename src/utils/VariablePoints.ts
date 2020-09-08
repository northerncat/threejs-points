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

const _intersectPoint = new Vector3();
const _intersectScreenPoint = new Vector3();

const _plane = new Plane();

// intersection testing function
function testPoint(
  screenPosition: Vector3,
  worldPosition: Vector3,
  pixelSizeSq: number,
  screenWidthSq: number,
  screenHeightSq: number,
  cameraDirection: Vector3,
  viewProjectionMatrix: Matrix4,
  raycaster: Raycaster,
  intersects: Intersection[],
  index: number,
  object: VariablePoints
) {
  _plane.setFromNormalAndCoplanarPoint(cameraDirection, worldPosition);

  if (raycaster.ray.intersectPlane(_plane, _intersectPoint)) {
    _intersectScreenPoint
      .copy(_intersectPoint)
      .applyMatrix4(viewProjectionMatrix);
    _intersectScreenPoint.sub(screenPosition);
    const pixelDistSq =
      _intersectScreenPoint.x * _intersectScreenPoint.x * screenWidthSq +
      _intersectScreenPoint.y * _intersectScreenPoint.y * screenHeightSq;
    if (pixelDistSq <= pixelSizeSq) {
      intersects.push({
        distance: raycaster.ray.origin.distanceTo(_intersectPoint),
        point: _intersectPoint.clone(),
        index,
        face: null,
        object: object,
      });
    }
  }
}

const _position = new Vector3();

const _screenPosition = new Vector3();
const _worldPosition = new Vector3();
const _sphere = new Sphere();
const _modelViewProjectionMatrix = new Matrix4();
const _viewProjectionMatrix = new Matrix4();
const _cameraDirection = new Vector3();

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

    this.userData.widthSq = width * width;
    this.userData.heightSq = height * height;
  }

  raycast(raycaster: Raycaster, intersects: Intersection[]): void {
    if (raycaster.camera === null) {
      console.error(
        'VariablePoints: "Raycaster.camera" needs to be set in order to raycast.'
      );
    } else if (!this.userData.widthSq || !this.userData.heightSq) {
      console.error(
        "VariablePoints: needs screen width and height squares in userData in order to raycast."
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

    _viewProjectionMatrix
      .copy(raycaster.camera.matrixWorldInverse)
      .premultiply(raycaster.camera.projectionMatrix);

    _modelViewProjectionMatrix
      .copy(this.matrixWorld)
      .premultiply(_viewProjectionMatrix);

    raycaster.camera.getWorldDirection(_cameraDirection);
    _cameraDirection.negate();

    if (index !== null) {
      const indices = index.array;

      for (let i = 0, il = indices.length; i < il; i++) {
        const a = indices[i];

        _position.fromArray(positions, a * 3);
        _screenPosition
          .copy(_position)
          .applyMatrix4(_modelViewProjectionMatrix);
        _worldPosition.copy(_position).applyMatrix4(this.matrixWorld);
        const size = sizes[a];

        testPoint(
          _screenPosition,
          _worldPosition,
          size * size,
          this.userData.widthSq,
          this.userData.heightSq,
          _cameraDirection,
          _viewProjectionMatrix,
          raycaster,
          intersects,
          a,
          this
        );
      }
    } else {
      for (let i = 0, l = positions.length / 3; i < l; i++) {
        _position.fromArray(positions, i * 3);
        _screenPosition
          .copy(_position)
          .applyMatrix4(_modelViewProjectionMatrix);
        _worldPosition.copy(_position).applyMatrix4(this.matrixWorld);
        const size = sizes[i];

        testPoint(
          _screenPosition,
          _worldPosition,
          size * size,
          this.userData.widthSq,
          this.userData.heightSq,
          _cameraDirection,
          _viewProjectionMatrix,
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
