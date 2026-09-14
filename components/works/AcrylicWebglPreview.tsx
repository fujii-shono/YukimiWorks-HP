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
  ) => void;
  setImages: (images: HTMLImageElement[]) => void;
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
const TEXTURE_COUNT = 6;
const SURFACE_DEFAULT = 0;
const SURFACE_FRONT_ACRYLIC = 1;
const SURFACE_ARTWORK = 2;
const SURFACE_FRONT_HIGHLIGHT = 3;
const SURFACE_REAR_EDGE = 4;
const SURFACE_REAR_ARTWORK_HIGHLIGHT = 5;
const SURFACE_BACK = 6;
const SURFACE_SIDE_WALL = 7;

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
uniform float uOpacity;
uniform float uRightShade;
uniform float uLeftHighlight;
uniform float uBackRightShade;
uniform float uBackLeftHighlight;
uniform float uSurface;
uniform vec2 uTexelSize;
uniform float uFrontFacing;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(uTexture, vUv);
  color.a *= uOpacity;
  // Acrylic coating and print exist only on the front-facing physical plane.
  // WebGL planes are otherwise double-sided, which exposed them from the rear.
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
  if (uSurface > 5.5) {
    color.rgb *= 1.0 - uBackRightShade * 0.14;
    color.rgb = mix(color.rgb, vec3(1.0), uBackLeftHighlight * 0.18);
  }
  if (uSurface > 6.5 && uSurface < 7.5) {
    // The edge is clear acrylic, not a grey solid. Keep only a faint white
    // reflection so the background remains visible through the thickness.
    color = vec4(1.0, 1.0, 1.0, 0.055 * uOpacity);
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
  const opacity = gl.getUniformLocation(program, 'uOpacity');
  const rightShade = gl.getUniformLocation(program, 'uRightShade');
  const leftHighlight = gl.getUniformLocation(program, 'uLeftHighlight');
  const backRightShade = gl.getUniformLocation(program, 'uBackRightShade');
  const backLeftHighlight = gl.getUniformLocation(program, 'uBackLeftHighlight');
  const surface = gl.getUniformLocation(program, 'uSurface');
  const texelSize = gl.getUniformLocation(program, 'uTexelSize');
  const frontFacing = gl.getUniformLocation(program, 'uFrontFacing');
  const textures = Array.from({ length: TEXTURE_COUNT }, () => gl.createTexture());
  if (textures.some((item) => !item)) return null;
  let layers: TextureLayer[] = [];
  let textureWidth = 1;
  let textureHeight = 1;
  let sideWallVertexCount = 0;

  const configureTexture = (nextTexture: WebGLTexture) => {
    gl.bindTexture(gl.TEXTURE_2D, nextTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // PNG masks already define the final contour. Filtering softens alpha and
    // makes the outline look as though it extends past the physical side.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  };

  const render = (
    rotationY: number,
    leftHighlightAmount: number,
    rightShadeAmount: number,
    backLeftHighlightAmount: number,
    backRightShadeAmount: number,
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
    // Do not fade the print with the viewing angle. Fading it exposed the white
    // ink backing underneath and made both left and right rotations look white.
    // The print stays opaque on the front hemisphere and switches off only once
    // the physical rear face points toward the viewer.
    const faceDirection = Math.cos(rotationRadians);
    gl.uniform1f(frontFacing, faceDirection >= 0 ? 1 : 0);
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
    setImages: (images) => {
      textureWidth = Math.max(1, images[TEXTURE_EDGE]?.naturalWidth ?? 1);
      textureHeight = Math.max(1, images[TEXTURE_EDGE]?.naturalHeight ?? 1);
      const sideWallMesh = images[TEXTURE_SIDE] ? createSideWallMesh(images[TEXTURE_SIDE]) : new Float32Array();
      sideWallVertexCount = sideWallMesh.length / VERTEX_COMPONENT_COUNT;
      gl.bindBuffer(gl.ARRAY_BUFFER, sideWallBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, sideWallMesh, gl.STATIC_DRAW);
      layers = [
        // The white ink backing is physically behind the artwork and remains
        // visible from the rear. It is distinct from the front-only reflection.
        { depth: -1, opacity: 1, surface: SURFACE_BACK, textureIndex: TEXTURE_BACK },
        { depth: -1, opacity: 1, surface: SURFACE_REAR_EDGE, textureIndex: TEXTURE_EDGE },
        { depth: 0, opacity: 1, surface: SURFACE_SIDE_WALL, textureIndex: TEXTURE_SIDE, geometry: 'sideWall' },
        { depth: -0.96, opacity: 1, surface: SURFACE_ARTWORK, textureIndex: TEXTURE_ARTWORK },
        { depth: -0.95, opacity: 1, surface: SURFACE_REAR_ARTWORK_HIGHLIGHT, textureIndex: TEXTURE_HIGHLIGHT },
        { depth: 1, opacity: 1, surface: SURFACE_FRONT_ACRYLIC, textureIndex: TEXTURE_ACRYLIC },
        { depth: 1, opacity: 0.95, surface: SURFACE_DEFAULT, textureIndex: TEXTURE_EDGE },
        { depth: 1, opacity: 1, surface: SURFACE_FRONT_HIGHLIGHT, textureIndex: TEXTURE_HIGHLIGHT },
      ];
      images.forEach((image, index) => {
        const layerTexture = textures[index];
        if (!layerTexture) return;
        configureTexture(layerTexture);
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
}: AcrylicWebglPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const renderValuesRef = useRef({ rotationY, leftHighlight, rightShade, backLeftHighlight, backRightShade });
  const [isWebglAvailable, setIsWebglAvailable] = useState(true);
  renderValuesRef.current = { rotationY, leftHighlight, rightShade, backLeftHighlight, backRightShade };

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
    void Promise.all(sources.map(loadImage))
      .then((images) => {
        if (cancelled || !rendererRef.current) return;
        rendererRef.current.setImages(images);
        const values = renderValuesRef.current;
        rendererRef.current.render(
          values.rotationY,
          values.leftHighlight,
          values.rightShade,
          values.backLeftHighlight,
          values.backRightShade,
        );
      })
      .catch(() => {
        if (!cancelled) setIsWebglAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [acrylicSrc, artworkSrc, backSrc, edgeSrc, highlightSrc, sideSrc]);

  useEffect(() => {
    rendererRef.current?.render(rotationY, leftHighlight, rightShade, backLeftHighlight, backRightShade);
  }, [backLeftHighlight, backRightShade, leftHighlight, rightShade, rotationY]);

  return (
    <>
      <canvas ref={canvasRef} className="acrylic-preview-canvas" aria-label="回転可能な3Dアクリルプレビュー" role="img" />
      {!isWebglAvailable ? <p className="acrylic-webgl-error">このブラウザでは3Dプレビューを表示できません。</p> : null}
    </>
  );
}
