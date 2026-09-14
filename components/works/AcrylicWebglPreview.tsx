'use client';

import { useEffect, useRef, useState } from 'react';

type AcrylicWebglPreviewProps = {
  acrylicSrc: string;
  artworkSrc: string;
  backSrc: string;
  edgeSrc: string;
  highlightSrc: string;
  sideSrc: string;
  rotationY: number;
  leftHighlight: number;
  rightShade: number;
  backLeftHighlight: number;
  backRightShade: number;
  finish: 'normal' | 'color' | 'hologram';
  acrylicColor: string;
};

type TextureLayer = {
  depth: number;
  opacity: number;
  surface: number;
  textureIndex: number;
  geometry?: 'plane' | 'sideWall';
};

type Renderer = {
  render: (
    rotationY: number,
    leftHighlight: number,
    rightShade: number,
    backLeftHighlight: number,
    backRightShade: number,
    finish: 'normal' | 'color' | 'hologram',
    acrylicColor: [number, number, number],
  ) => void;
  setImages: (images: HTMLImageElement[], finish: 'normal' | 'color' | 'hologram') => void;
  dispose: () => void;
};

const HALF_HEIGHT = 1;
const ACRYLIC_BODY_DEPTH_PX = 10;
const VERTEX_COMPONENT_COUNT = 5;
const TEXTURE_BACK = 0;
const TEXTURE_SIDE = 1;
const TEXTURE_EDGE = 2;
const TEXTURE_ACRYLIC = 3;
const TEXTURE_ARTWORK = 4;
const TEXTURE_HIGHLIGHT = 5;
const TEXTURE_BACKGROUND = 6;
const TEXTURE_COUNT = 7;
const ACRYLIC_BACKGROUND_SRC = '/works/Acrylic/bg.png';
const SURFACE_DEFAULT = 0;
const SURFACE_FRONT_ACRYLIC = 1;
const SURFACE_ARTWORK = 2;
const SURFACE_FRONT_HIGHLIGHT = 3;
const SURFACE_REAR_EDGE = 4;
const SURFACE_REAR_ARTWORK_HIGHLIGHT = 5;
const SURFACE_BACK = 6;
const SURFACE_SIDE_WALL = 7;
const SURFACE_REAR_COLOR_ACRYLIC = 8;

const vertexShaderSource = `
attribute vec3 aPosition;
attribute vec2 aUv;
uniform float uRotation;
uniform float uDepth;
uniform float uHalfDepth;
varying vec2 vUv;

void main() {
  float cosine = cos(uRotation);
  float sine = sin(uRotation);
  float localDepth = uDepth + aPosition.z * uHalfDepth;
  vec3 worldPosition = vec3(
    aPosition.x * cosine + localDepth * sine,
    aPosition.y,
    -aPosition.x * sine + localDepth * cosine
  );
  float clipW = 1.0 - worldPosition.z / 3.0;
  gl_Position = vec4(worldPosition.xy, -worldPosition.z / 3.0, clipW);
  vUv = aUv;
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform sampler2D uTexture;
uniform sampler2D uArtworkMask;
uniform sampler2D uSideMask;
uniform sampler2D uBackMask;
uniform sampler2D uBackground;
uniform float uOpacity;
uniform float uRightShade;
uniform float uLeftHighlight;
uniform float uBackRightShade;
uniform float uBackLeftHighlight;
uniform float uSurface;
uniform vec2 uTexelSize;
uniform float uFrontFacing;
uniform float uFinish;
uniform vec3 uAcrylicColor;
uniform float uMaterialRotation;
uniform vec2 uResolution;
uniform vec2 uBackgroundUvOrigin;
uniform vec2 uBackgroundUvPerPixel;
varying vec2 vUv;

const float COLOR_SIDE_BRIGHTNESS = 1.28;

float randomValue(vec2 seed) {
  return fract(sin(dot(seed, vec2(127.1, 311.7))) * 43758.5453);
}

float crossProduct(vec2 first, vec2 second) {
  return first.x * second.y - first.y * second.x;
}

float triangleMask(vec2 point, vec2 first, vec2 second, vec2 third) {
  float winding = sign(crossProduct(second - first, third - first));
  float firstEdge = winding * crossProduct(second - first, point - first) / length(second - first);
  float secondEdge = winding * crossProduct(third - second, point - second) / length(third - second);
  float thirdEdge = winding * crossProduct(first - third, point - third) / length(first - third);
  return smoothstep(0.0, 0.028, min(firstEdge, min(secondEdge, thirdEdge)));
}

float hologramShardMask(vec2 uv) {
  // Work in material space so the pattern keeps its proportions and remains
  // attached to the acrylic while the object rotates.
  float textureAspect = uTexelSize.y / max(uTexelSize.x, 0.000001);
  vec2 shardPosition = vec2(uv.x * textureAspect, uv.y) * 12.0;
  vec2 cell = floor(shardPosition);
  vec2 localPosition = fract(shardPosition) - 0.5;
  float visible = step(0.24, randomValue(cell + vec2(2.7, 8.3)));
  vec2 offset = vec2(
    randomValue(cell + vec2(4.1, 1.9)),
    randomValue(cell + vec2(7.4, 5.6))
  ) - 0.5;
  localPosition -= offset * 0.16;

  float angle = randomValue(cell + vec2(9.2, 3.8)) * 6.2831853;
  float cosine = cos(angle);
  float sine = sin(angle);
  localPosition = mat2(cosine, -sine, sine, cosine) * localPosition;

  float halfWidth = mix(0.22, 0.39, randomValue(cell + vec2(6.6, 2.2)));
  float halfHeight = mix(0.25, 0.43, randomValue(cell + vec2(1.3, 9.7)));
  float topSkew = mix(-0.13, 0.13, randomValue(cell + vec2(8.8, 7.1)));
  float leftHeight = mix(0.19, 0.37, randomValue(cell + vec2(3.5, 6.4)));
  float rightHeight = mix(0.19, 0.37, randomValue(cell + vec2(5.9, 4.6)));
  vec2 first = vec2(topSkew, -halfHeight);
  vec2 second = vec2(-halfWidth, leftHeight);
  vec2 third = vec2(
    halfWidth * mix(0.72, 1.08, randomValue(cell + vec2(7.8, 0.9))),
    rightHeight
  );
  return visible * triangleMask(localPosition, first, second, third);
}

float hologramShardVisibility(vec2 uv) {
  float textureAspect = uTexelSize.y / max(uTexelSize.x, 0.000001);
  vec2 cell = floor(vec2(uv.x * textureAspect, uv.y) * 12.0);
  float phase = randomValue(cell + vec2(0.8, 6.2)) * 6.2831853;
  float responseSpeed = mix(2.2, 3.8, randomValue(cell + vec2(4.7, 9.1)));
  float angleResponse = 0.5 + 0.5 * cos(uMaterialRotation * responseSpeed + phase);
  // Each foil shard catches the light at a different angle. The narrow
  // transition changes its strength, while a faint reflection always remains.
  return mix(0.2, 1.0, smoothstep(0.34, 0.68, angleResponse));
}

void main() {
  vec4 color = texture2D(uTexture, vUv);
  color.a *= uOpacity;
  if (uFinish > 0.5 && uFinish < 1.5) {
    if (uSurface > 5.5 && uSurface < 6.5) discard;
    float acrylicMask = texture2D(uSideMask, vUv).a > 0.004 ? 1.0 : 0.0;
    vec2 screenPosition = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
    vec2 backgroundUv = uBackgroundUvOrigin + screenPosition * uBackgroundUvPerPixel;
    vec4 backgroundColor = texture2D(uBackground, backgroundUv);
    if (uSurface > 6.5 && uSurface < 7.5) {
      vec3 sideColor = min(uAcrylicColor * COLOR_SIDE_BRIGHTNESS, vec3(1.0));
      gl_FragColor = vec4(backgroundColor.rgb * sideColor, uOpacity);
      return;
    }
    vec4 backingColor = texture2D(uBackMask, vUv);
    vec3 backdropColor = mix(backgroundColor.rgb, backingColor.rgb, backingColor.a);
    if (uSurface > 0.5 && uSurface < 1.5) {
      gl_FragColor = vec4(backdropColor * uAcrylicColor, acrylicMask * uFrontFacing);
      return;
    }
    if (uSurface > 7.5 && uSurface < 8.5) {
      gl_FragColor = vec4(backdropColor * uAcrylicColor, acrylicMask * (1.0 - uFrontFacing));
      return;
    }
  }
  bool isFrontHologramSurface = uSurface > 0.5 && uSurface < 1.5;
  bool isRearHologramSurface = uSurface > 5.5 && uSurface < 6.5;
  if ((isFrontHologramSurface || isRearHologramSurface) && uFinish > 1.5) {
    float acrylicMask = texture2D(uSideMask, vUv).a > 0.004 ? 1.0 : 0.0;
    float surfaceFacing = isFrontHologramSurface ? uFrontFacing : 1.0 - uFrontFacing;
    float shardMask = hologramShardMask(vUv) * hologramShardVisibility(vUv) * surfaceFacing;
    float prismPhase = vUv.x * 6.2 - vUv.y * 4.6 + uMaterialRotation * 2.4;
    float sparkle = 0.5 + 0.5 * sin(vUv.x * 18.0 + vUv.y * 14.0 + uMaterialRotation * 4.0);
    sparkle = smoothstep(0.72, 1.0, sparkle);
    vec3 prism = vec3(
      0.5 + 0.5 * cos(prismPhase),
      0.5 + 0.5 * cos(prismPhase + 2.1),
      0.5 + 0.5 * cos(prismPhase + 4.2)
    );
    float rotationGlow = 0.5 + 0.5 * cos(prismPhase);
    // White ink makes fully saturated RGB look like a dark multiply layer.
    // Keep the rear reflection close to white so it reads as a bright pearl.
    vec3 hologramColor = isRearHologramSurface ? mix(vec3(1.0), prism, 0.28) : prism;
    color.rgb = mix(color.rgb, hologramColor, shardMask * 0.88);
    color.a = max(
      color.a,
      acrylicMask * shardMask * (0.12 + rotationGlow * 0.32 + sparkle * 0.1)
    );
  }
  // Front coating and print exist only on the front-facing physical plane.
  // The rear hologram is rendered separately on the physical rear surface.
  if (uSurface > 0.5 && uSurface < 2.5) color.a *= uFrontFacing;
  if (uSurface > 1.5 && uSurface < 2.5) color.rgb *= 1.0 - uRightShade * 0.14;
  if (uSurface > 2.5 && uSurface < 3.5) {
    // Keep the faint reflection over the whole front acrylic plane.
    color.a *= uLeftHighlight * 0.08;
  }
  if (uSurface > 4.5 && uSurface < 5.5) {
    // The stronger reflection follows the print but belongs on the rear inner
    // plane where the artwork is applied, rather than on the acrylic front.
    float artworkCoverage = smoothstep(0.05, 0.8, texture2D(uArtworkMask, vUv).a);
    // Compensate for the 0.08 front layer so their combined white opacity
    // remains equal to the previous 0.18 artwork reflection.
    color.a *= uLeftHighlight * artworkCoverage * 0.1087;
  }
  if (uSurface > 3.5 && uSurface < 4.5) {
    float edgeAlpha = 0.0;
    for (int y = -2; y <= 2; y += 1) {
      for (int x = -2; x <= 2; x += 1) {
        edgeAlpha = max(edgeAlpha, texture2D(uTexture, vUv + vec2(float(x), float(y)) * uTexelSize).a);
      }
    }
    // Only enlarge toward the interior of the actual side mask, so the rear
    // outline becomes visible without extending beyond the acrylic edge.
    float insideAcrylic = step(0.004, texture2D(uSideMask, vUv).a);
    color = vec4(108.0 / 255.0, 112.0 / 255.0, 124.0 / 255.0, min(1.0, edgeAlpha * 1.8) * insideAcrylic);
  }
  if (uSurface > 5.5 && !(uFinish > 1.5 && isRearHologramSurface)) {
    color.rgb *= 1.0 - uBackRightShade * 0.14;
    color.rgb = mix(color.rgb, vec3(1.0), uBackLeftHighlight * 0.18);
  }
  if (uSurface > 6.5 && uSurface < 7.5) {
    if (uFinish > 0.5 && uFinish < 1.5) {
      discard;
    } else {
      // The edge is clear acrylic, not a grey solid. Keep only a faint white
      // reflection so the background remains visible through the thickness.
      color = vec4(1.0, 1.0, 1.0, 0.055 * uOpacity);
    }
  }
  if (uSurface > 7.5 && uSurface < 8.5) {
    discard;
  }
  if (color.a < 0.004) discard;
  gl_FragColor = color;
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('シェーダーを作成できませんでした');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'シェーダーをコンパイルできませんでした');
  }
  return shader;
}

function addSideWallQuad(
  vertices: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  height: number,
) {
  const toClipX = (x: number) => (x / width) * 2 - 1;
  const toClipY = (y: number) => 1 - (y / height) * 2;
  const pushVertex = (x: number, y: number, z: number) => {
    vertices.push(toClipX(x), toClipY(y), z, x / width, y / height);
  };

  pushVertex(x0, y0, -1);
  pushVertex(x1, y1, -1);
  pushVertex(x1, y1, 1);
  pushVertex(x0, y0, -1);
  pushVertex(x1, y1, 1);
  pushVertex(x0, y0, 1);
}

function createSideWallMesh(image: HTMLImageElement) {
  const width = Math.max(1, image.naturalWidth);
  const height = Math.max(1, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return new Float32Array();
  context.drawImage(image, 0, 0);
  const alpha = context.getImageData(0, 0, width, height).data;
  const isInside = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height && alpha[(y * width + x) * 4 + 3] > 3;
  const vertices: number[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isInside(x, y)) continue;
      if (!isInside(x, y - 1)) addSideWallQuad(vertices, x, y, x + 1, y, width, height);
      if (!isInside(x + 1, y)) addSideWallQuad(vertices, x + 1, y, x + 1, y + 1, width, height);
      if (!isInside(x, y + 1)) addSideWallQuad(vertices, x + 1, y + 1, x, y + 1, width, height);
      if (!isInside(x - 1, y)) addSideWallQuad(vertices, x, y + 1, x, y, width, height);
    }
  }

  return new Float32Array(vertices);
}

function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
  if (!gl) return null;

  const program = gl.createProgram();
  if (!program) return null;
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'WebGLプログラムを作成できませんでした');
  }

  const planeBuffer = gl.createBuffer();
  const sideWallBuffer = gl.createBuffer();
  if (!planeBuffer || !sideWallBuffer) return null;
  const mesh = new Float32Array([
    -1, HALF_HEIGHT, 0, 0, 0,
    -1, -HALF_HEIGHT, 0, 0, 1,
    1, -HALF_HEIGHT, 0, 1, 1,
    -1, HALF_HEIGHT, 0, 0, 0,
    1, -HALF_HEIGHT, 0, 1, 1,
    1, HALF_HEIGHT, 0, 1, 0,
  ]);
  gl.bindBuffer(gl.ARRAY_BUFFER, planeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, 'aPosition');
  const uv = gl.getAttribLocation(program, 'aUv');
  const rotation = gl.getUniformLocation(program, 'uRotation');
  const depth = gl.getUniformLocation(program, 'uDepth');
  const halfDepthUniform = gl.getUniformLocation(program, 'uHalfDepth');
  const texture = gl.getUniformLocation(program, 'uTexture');
  const artworkMask = gl.getUniformLocation(program, 'uArtworkMask');
  const sideMask = gl.getUniformLocation(program, 'uSideMask');
  const backMask = gl.getUniformLocation(program, 'uBackMask');
  const background = gl.getUniformLocation(program, 'uBackground');
  const opacity = gl.getUniformLocation(program, 'uOpacity');
  const rightShade = gl.getUniformLocation(program, 'uRightShade');
  const leftHighlight = gl.getUniformLocation(program, 'uLeftHighlight');
  const backRightShade = gl.getUniformLocation(program, 'uBackRightShade');
  const backLeftHighlight = gl.getUniformLocation(program, 'uBackLeftHighlight');
  const surface = gl.getUniformLocation(program, 'uSurface');
  const texelSize = gl.getUniformLocation(program, 'uTexelSize');
  const frontFacing = gl.getUniformLocation(program, 'uFrontFacing');
  const finish = gl.getUniformLocation(program, 'uFinish');
  const acrylicColor = gl.getUniformLocation(program, 'uAcrylicColor');
  const materialRotation = gl.getUniformLocation(program, 'uMaterialRotation');
  const resolution = gl.getUniformLocation(program, 'uResolution');
  const backgroundUvOrigin = gl.getUniformLocation(program, 'uBackgroundUvOrigin');
  const backgroundUvPerPixel = gl.getUniformLocation(program, 'uBackgroundUvPerPixel');
  const textures = Array.from({ length: TEXTURE_COUNT }, () => gl.createTexture());
  if (textures.some((item) => !item)) return null;
  let layers: TextureLayer[] = [];
  let textureWidth = 1;
  let textureHeight = 1;
  let sideWallVertexCount = 0;
  let imagesRef: HTMLImageElement[] = [];

  const configureTexture = (nextTexture: WebGLTexture, smooth = false) => {
    gl.bindTexture(gl.TEXTURE_2D, nextTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // PNG masks already define the final contour. Only the photographic
    // background uses linear filtering to match CSS background rendering.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, smooth ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, smooth ? gl.LINEAR : gl.NEAREST);
  };

  const render = (
    rotationY: number,
    leftHighlightAmount: number,
    rightShadeAmount: number,
    backLeftHighlightAmount: number,
    backRightShadeAmount: number,
    finishMode: 'normal' | 'color' | 'hologram',
    acrylicColorValue: [number, number, number],
  ) => {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * pixelRatio));
    const halfDepth = ACRYLIC_BODY_DEPTH_PX / Math.max(1, bounds.width);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.enableVertexAttribArray(uv);
    const rotationRadians = (rotationY * Math.PI) / 180;
    gl.uniform1f(rotation, rotationRadians);
    gl.uniform1f(halfDepthUniform, halfDepth);
    gl.uniform1i(texture, 0);
    gl.uniform1i(artworkMask, 1);
    gl.uniform1i(sideMask, 2);
    gl.uniform2f(texelSize, 1 / textureWidth, 1 / textureHeight);
    if (finishMode === 'color') {
      gl.uniform1i(backMask, 3);
      gl.uniform1i(background, 4);
      gl.uniform2f(resolution, width, height);
      const previewWrap = canvas.closest<HTMLElement>('.acrylic-preview-wrap');
      const backgroundImage = imagesRef[TEXTURE_BACKGROUND];
      if (previewWrap && backgroundImage) {
        const wrapBounds = previewWrap.getBoundingClientRect();
        const positioningWidth = Math.max(1, previewWrap.clientWidth);
        const positioningHeight = Math.max(1, previewWrap.clientHeight);
        const positioningLeft = wrapBounds.left + previewWrap.clientLeft;
        const positioningTop = wrapBounds.top + previewWrap.clientTop;
        const backgroundScale = Math.max(
          positioningWidth / Math.max(1, backgroundImage.naturalWidth),
          positioningHeight / Math.max(1, backgroundImage.naturalHeight),
        );
        const backgroundWidth = Math.max(1, backgroundImage.naturalWidth * backgroundScale);
        const backgroundHeight = Math.max(1, backgroundImage.naturalHeight * backgroundScale);
        const backgroundLeft = positioningLeft + (positioningWidth - backgroundWidth) / 2;
        const backgroundTop = positioningTop + (positioningHeight - backgroundHeight) / 2;
        gl.uniform2f(
          backgroundUvOrigin,
          (bounds.left - backgroundLeft) / backgroundWidth,
          (bounds.top - backgroundTop) / backgroundHeight,
        );
        gl.uniform2f(
          backgroundUvPerPixel,
          bounds.width / width / backgroundWidth,
          bounds.height / height / backgroundHeight,
        );
      } else {
        gl.uniform2f(backgroundUvOrigin, 0, 0);
        gl.uniform2f(backgroundUvPerPixel, 1 / width, 1 / height);
      }
    }
    // Do not fade the print with the viewing angle. Fading it exposed the white
    // ink backing underneath and made both left and right rotations look white.
    // The print stays opaque on the front hemisphere and switches off only once
    // the physical rear face points toward the viewer.
    const faceDirection = Math.cos(rotationRadians);
    gl.uniform1f(frontFacing, faceDirection >= 0 ? 1 : 0);
    gl.uniform1f(finish, finishMode === 'color' ? 1 : finishMode === 'hologram' ? 2 : 0);
    gl.uniform3fv(acrylicColor, acrylicColorValue);
    gl.uniform1f(materialRotation, rotationRadians);
    gl.uniform1f(leftHighlight, leftHighlightAmount);
    gl.uniform1f(rightShade, rightShadeAmount);
    gl.uniform1f(backLeftHighlight, backLeftHighlightAmount);
    gl.uniform1f(backRightShade, backRightShadeAmount);
    const artworkTexture = textures[TEXTURE_ARTWORK];
    if (artworkTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, artworkTexture);
    }
    const sideMaskTexture = textures[TEXTURE_SIDE];
    if (sideMaskTexture) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, sideMaskTexture);
    }
    if (finishMode === 'color') {
      const backMaskTexture = textures[TEXTURE_BACK];
      if (backMaskTexture) {
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, backMaskTexture);
      }
      const backgroundTexture = textures[TEXTURE_BACKGROUND];
      if (backgroundTexture) {
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
      }
    }

    const depthDirection = faceDirection;
    const orderedLayers = [...layers]
      .sort((first, second) => (first.depth - second.depth) * depthDirection);

    orderedLayers.forEach((layer) => {
      const layerTexture = textures[layer.textureIndex];
      if (!layerTexture) return;
      const isSideWall = layer.geometry === 'sideWall';
      if (isSideWall && sideWallVertexCount === 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, isSideWall ? sideWallBuffer : planeBuffer);
      gl.vertexAttribPointer(
        position,
        3,
        gl.FLOAT,
        false,
        VERTEX_COMPONENT_COUNT * Float32Array.BYTES_PER_ELEMENT,
        0,
      );
      gl.vertexAttribPointer(
        uv,
        2,
        gl.FLOAT,
        false,
        VERTEX_COMPONENT_COUNT * Float32Array.BYTES_PER_ELEMENT,
        3 * Float32Array.BYTES_PER_ELEMENT,
      );
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, layerTexture);
      gl.uniform1f(depth, layer.depth * halfDepth);
      gl.uniform1f(opacity, layer.opacity);
      gl.uniform1f(surface, layer.surface);
      gl.drawArrays(gl.TRIANGLES, 0, isSideWall ? sideWallVertexCount : 6);
    });
  };

  return {
    render,
    setImages: (images, finishMode) => {
      imagesRef = images;
      textureWidth = Math.max(1, images[TEXTURE_EDGE]?.naturalWidth ?? 1);
      textureHeight = Math.max(1, images[TEXTURE_EDGE]?.naturalHeight ?? 1);
      const sideWallMesh = images[TEXTURE_SIDE] ? createSideWallMesh(images[TEXTURE_SIDE]) : new Float32Array();
      sideWallVertexCount = sideWallMesh.length / VERTEX_COMPONENT_COUNT;
      gl.bindBuffer(gl.ARRAY_BUFFER, sideWallBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, sideWallMesh, gl.STATIC_DRAW);
      layers = [
        // For color acrylic, white ink is attached directly behind the front
        // print, rather than being placed on the distant rear acrylic face.
        ...(finishMode === 'color'
          ? []
          : [{ depth: -1, opacity: 1, surface: SURFACE_BACK, textureIndex: TEXTURE_BACK }]),
        ...(finishMode === 'color'
          ? [{ depth: -1, opacity: 1, surface: SURFACE_REAR_COLOR_ACRYLIC, textureIndex: TEXTURE_SIDE }]
          : []),
        ...(finishMode === 'color'
          ? []
          : [{ depth: -1, opacity: 1, surface: SURFACE_REAR_EDGE, textureIndex: TEXTURE_EDGE }]),
        { depth: 0, opacity: 1, surface: SURFACE_SIDE_WALL, textureIndex: TEXTURE_SIDE, geometry: 'sideWall' },
        // Color acrylic is the sheet below the print. Place the print in front
        // of its surface so its original colors are never tinted.
        { depth: finishMode === 'color' ? 1.02 : -0.96, opacity: 1, surface: SURFACE_ARTWORK, textureIndex: TEXTURE_ARTWORK },
        { depth: finishMode === 'color' ? -1 : -0.95, opacity: 1, surface: SURFACE_REAR_ARTWORK_HIGHLIGHT, textureIndex: TEXTURE_HIGHLIGHT },
        { depth: finishMode === 'color' ? 0.97 : 1, opacity: 1, surface: SURFACE_FRONT_ACRYLIC, textureIndex: TEXTURE_ACRYLIC },
        ...(finishMode === 'color'
          ? []
          : [{ depth: 1, opacity: 0.95, surface: SURFACE_DEFAULT, textureIndex: TEXTURE_EDGE }]),
        { depth: 1, opacity: 1, surface: SURFACE_FRONT_HIGHLIGHT, textureIndex: TEXTURE_HIGHLIGHT },
      ];
      images.forEach((image, index) => {
        const layerTexture = textures[index];
        if (!layerTexture) return;
        configureTexture(layerTexture, index === TEXTURE_BACKGROUND);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      });
    },
    dispose: () => {
      gl.deleteBuffer(planeBuffer);
      gl.deleteBuffer(sideWallBuffer);
      textures.forEach((textureItem) => {
        if (textureItem) gl.deleteTexture(textureItem);
      });
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    },
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('プレビュー画像を読み込めませんでした'));
    image.src = src;
  });
}

function hexToRgb(color: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return [1, 0.56, 0.72];
  const value = Number.parseInt(match[1], 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export function AcrylicWebglPreview({
  acrylicSrc,
  artworkSrc,
  backSrc,
  edgeSrc,
  highlightSrc,
  sideSrc,
  rotationY,
  leftHighlight,
  rightShade,
  backLeftHighlight,
  backRightShade,
  finish,
  acrylicColor,
}: AcrylicWebglPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const renderValuesRef = useRef({ rotationY, leftHighlight, rightShade, backLeftHighlight, backRightShade, finish, acrylicColor });
  const [isWebglAvailable, setIsWebglAvailable] = useState(true);
  renderValuesRef.current = { rotationY, leftHighlight, rightShade, backLeftHighlight, backRightShade, finish, acrylicColor };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const renderer = createRenderer(canvas);
      if (!renderer) {
        setIsWebglAvailable(false);
        return;
      }
      rendererRef.current = renderer;
      const observer = new ResizeObserver(() => {
        const values = renderValuesRef.current;
        renderer.render(
          values.rotationY,
          values.leftHighlight,
          values.rightShade,
          values.backLeftHighlight,
          values.backRightShade,
          values.finish,
          hexToRgb(values.acrylicColor),
        );
      });
      observer.observe(canvas);
      return () => {
        observer.disconnect();
        renderer.dispose();
        rendererRef.current = null;
      };
    } catch {
      setIsWebglAvailable(false);
    }
  // The WebGL context lives for the component lifetime; source changes upload textures below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sources = [backSrc, sideSrc, edgeSrc, acrylicSrc, artworkSrc, highlightSrc];
    if (finish === 'color') sources.push(ACRYLIC_BACKGROUND_SRC);
    void Promise.all(sources.map(loadImage))
      .then((images) => {
        if (cancelled || !rendererRef.current) return;
        rendererRef.current.setImages(images, finish);
        const values = renderValuesRef.current;
        rendererRef.current.render(
          values.rotationY,
          values.leftHighlight,
          values.rightShade,
          values.backLeftHighlight,
          values.backRightShade,
          values.finish,
          hexToRgb(values.acrylicColor),
        );
      })
      .catch(() => {
        if (!cancelled) setIsWebglAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [acrylicSrc, artworkSrc, backSrc, edgeSrc, finish, highlightSrc, sideSrc]);

  useEffect(() => {
    rendererRef.current?.render(rotationY, leftHighlight, rightShade, backLeftHighlight, backRightShade, finish, hexToRgb(acrylicColor));
  }, [acrylicColor, backLeftHighlight, backRightShade, finish, leftHighlight, rightShade, rotationY]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="acrylic-preview-canvas"
        aria-label="回転可能な3Dアクリルプレビュー"
        role="img"
      />
      {!isWebglAvailable ? <p className="acrylic-webgl-error">このブラウザでは3Dプレビューを表示できません。</p> : null}
    </>
  );
}
