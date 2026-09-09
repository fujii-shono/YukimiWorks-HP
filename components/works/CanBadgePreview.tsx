'use client';

import { type PointerEvent, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/format';

const ROTATION_MIN_SPEED = 0.015;
const HIGHLIGHT_VISIBLE_START = 0.78;
const RING_COUNT = 64;
const SEGMENT_COUNT = 96;
const FRONT_FACE_DEPTH = 0.04;
const FRONT_FACE_RADIUS = 0.94;
const BACK_PLATE_DEPTH = -0.075;
const BACK_PLATE_RADIUS = 0.94;
const SHELL_OUTER_RADIUS = 1.025;
const LIP_STEP_COUNT = 12;

type Rotation = { y: number };

type Renderer = {
  render: (rotationY: number, leftHighlight: number, rightShade: number) => void;
  setArtwork: (image: HTMLImageElement | null) => void;
  dispose: () => void;
};

const vertexShaderSource = `
attribute vec3 aPosition;
attribute vec2 aUv;
attribute vec3 aNormal;
attribute float aSurface;
uniform float uRotation;
varying vec2 vUv;
varying vec3 vNormal;
varying float vSurface;

void main() {
  float cosine = cos(uRotation);
  float sine = sin(uRotation);
  vec3 worldPosition = vec3(
    aPosition.x * cosine + aPosition.z * sine,
    aPosition.y,
    -aPosition.x * sine + aPosition.z * cosine
  );
  vNormal = normalize(vec3(
    aNormal.x * cosine + aNormal.z * sine,
    aNormal.y,
    -aNormal.x * sine + aNormal.z * cosine
  ));
  float tiltCosine = cos(-0.16);
  float tiltSine = sin(-0.16);
  worldPosition = vec3(
    worldPosition.x,
    worldPosition.y * tiltCosine - worldPosition.z * tiltSine,
    worldPosition.y * tiltSine + worldPosition.z * tiltCosine
  );
  vNormal = normalize(vec3(
    vNormal.x,
    vNormal.y * tiltCosine - vNormal.z * tiltSine,
    vNormal.y * tiltSine + vNormal.z * tiltCosine
  ));
  vUv = aUv;
  vSurface = aSurface;
  float perspective = 3.3 / (3.3 - worldPosition.z);
  gl_Position = vec4(worldPosition.xy * perspective * 0.72, -worldPosition.z / 3.3, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform sampler2D uArtwork;
uniform float uHasArtwork;
uniform float uArtworkAspect;
uniform float uLeftHighlight;
uniform float uRightShade;
varying vec2 vUv;
varying vec3 vNormal;
varying float vSurface;

vec2 artworkUv(vec2 uv) {
  if (uArtworkAspect > 1.0) {
    return vec2((uv.x - 0.5) / uArtworkAspect + 0.5, uv.y);
  }
  return vec2(uv.x, (uv.y - 0.5) * uArtworkAspect + 0.5);
}

float taperedArcStroke(vec2 radialPosition, float startAngle, float endAngle) {
  const float strokeRadius = 0.975;
  const float edgeSoftness = 0.003;
  float radialDistance = length(radialPosition);
  float arcAngle = atan(radialPosition.y, radialPosition.x);
  float body = step(startAngle, arcAngle) * step(arcAngle, endAngle);
  float progress = clamp((arcAngle - startAngle) / (endAngle - startAngle), 0.0, 1.0);
  float strokeHalfWidth = mix(0.003, 0.020, sin(progress * 3.14159265));
  return body * (1.0 - smoothstep(strokeHalfWidth, strokeHalfWidth + edgeSoftness, abs(radialDistance - strokeRadius)));
}

void main() {
  vec3 color;

  if (vSurface < 0.5) {
    vec4 artwork = texture2D(uArtwork, artworkUv(vUv));
    vec3 fallbackColor = vec3(1.0);
    vec3 artworkColor = mix(vec3(1.0), artwork.rgb, artwork.a);
    color = mix(fallbackColor, artworkColor, uHasArtwork);
    vec3 acrylicMultiply = mix(vec3(1.0), vec3(142.0, 146.0, 158.0) / 255.0, 30.0 / 255.0);
    color *= acrylicMultiply;
    float lowerRightOverlay = smoothstep(0.48, 1.62, vUv.x + vUv.y);
    color *= 1.0 - lowerRightOverlay * 0.08;
    float upperLeftGradient = 1.0 - smoothstep(0.12, 1.36, vUv.x + vUv.y);
    vec2 radialPosition = (vUv - 0.5) * 2.0;
    float upperLeftEdgeHighlight = taperedArcStroke(radialPosition, -2.76, -1.74);
    float lowerRightEdgeHighlight = taperedArcStroke(radialPosition, 0.84, 0.942);
    color = mix(color, vec3(1.0), uLeftHighlight * upperLeftGradient * 0.95);
    color = mix(color, vec3(1.0), max(upperLeftEdgeHighlight, lowerRightEdgeHighlight));
    color *= 1.0 - uRightShade * 0.14;
  } else if (vSurface < 1.5) {
    vec4 artwork = texture2D(uArtwork, artworkUv(vUv));
    vec3 fallbackColor = vec3(1.0);
    vec3 artworkColor = mix(vec3(1.0), artwork.rgb, artwork.a);
    color = mix(fallbackColor, artworkColor, uHasArtwork);
    color *= mix(vec3(1.0), vec3(142.0, 146.0, 158.0) / 255.0, 30.0 / 255.0);
    float lowerRightOverlay = smoothstep(0.48, 1.62, vUv.x + vUv.y);
    color *= 1.0 - lowerRightOverlay * 0.08;
    float upperLeftGradient = 1.0 - smoothstep(0.12, 1.36, vUv.x + vUv.y);
    color = mix(color, vec3(1.0), uLeftHighlight * upperLeftGradient * 0.95);
    color *= 1.0 - uRightShade * 0.14;
  } else {
    color = vec3(0.16, 0.19, 0.23);
  }
  gl_FragColor = vec4(color, 1.0);
}
`;

function appendVertex(target: number[], position: number[], uv: number[], normal: number[], surface: number) {
  target.push(...position, ...uv, ...normal, surface);
}

function createBadgeMesh() {
  const vertices: number[] = [];
  const frontPosition = (radius: number, angle: number) => {
    return [Math.cos(angle) * radius * FRONT_FACE_RADIUS, Math.sin(angle) * radius * FRONT_FACE_RADIUS, FRONT_FACE_DEPTH];
  };
  const frontNormal = () => [0, 0, 1];
  const appendTriangle = (
    surface: number,
    first: { position: number[]; uv: number[]; normal: number[] },
    second: { position: number[]; uv: number[]; normal: number[] },
    third: { position: number[]; uv: number[]; normal: number[] },
  ) => {
    appendVertex(vertices, first.position, first.uv, first.normal, surface);
    appendVertex(vertices, second.position, second.uv, second.normal, surface);
    appendVertex(vertices, third.position, third.uv, third.normal, surface);
  };
  const frontPoint = (radius: number, angle: number) => {
    const x = Math.cos(angle) * radius * FRONT_FACE_RADIUS;
    const y = Math.sin(angle) * radius * FRONT_FACE_RADIUS;
    return { position: frontPosition(radius, angle), uv: [(x / FRONT_FACE_RADIUS + 1) / 2, 1 - (y / FRONT_FACE_RADIUS + 1) / 2], normal: frontNormal() };
  };
  const backPoint = (radius: number, angle: number) => {
    const x = Math.cos(angle) * radius * BACK_PLATE_RADIUS;
    const y = Math.sin(angle) * radius * BACK_PLATE_RADIUS;
    return { position: [x, y, BACK_PLATE_DEPTH], uv: [(x + 1) / 2, 1 - (y + 1) / 2], normal: [0, 0, -1] };
  };

  for (let ring = 0; ring < RING_COUNT; ring += 1) {
    const innerRadius = ring / RING_COUNT;
    const outerRadius = (ring + 1) / RING_COUNT;
    for (let segment = 0; segment < SEGMENT_COUNT; segment += 1) {
      const start = (segment / SEGMENT_COUNT) * Math.PI * 2;
      const end = ((segment + 1) / SEGMENT_COUNT) * Math.PI * 2;
      const innerStart = frontPoint(innerRadius, start);
      const innerEnd = frontPoint(innerRadius, end);
      const outerStart = frontPoint(outerRadius, start);
      const outerEnd = frontPoint(outerRadius, end);
      appendTriangle(0, innerStart, outerStart, outerEnd);
      appendTriangle(0, innerStart, outerEnd, innerEnd);

      const backInnerStart = backPoint(innerRadius, start);
      const backInnerEnd = backPoint(innerRadius, end);
      const backOuterStart = backPoint(outerRadius, start);
      const backOuterEnd = backPoint(outerRadius, end);
      appendTriangle(2, backInnerStart, backOuterEnd, backOuterStart);
      appendTriangle(2, backInnerStart, backInnerEnd, backOuterEnd);
    }
  }

  const lipPoint = (step: number, angle: number) => {
    const progress = step / LIP_STEP_COUNT;
    const inverseProgress = 1 - progress;
    // A rounded rim joins the almost-flat front face to the smaller, flat back plate.
    // The two horizontal tangents keep the transitions visually smooth without a separate side band.
    const radius = (
      inverseProgress * inverseProgress * inverseProgress * FRONT_FACE_RADIUS
      + 3 * inverseProgress * inverseProgress * progress * SHELL_OUTER_RADIUS
      + 3 * inverseProgress * progress * progress * SHELL_OUTER_RADIUS
      + progress * progress * progress * BACK_PLATE_RADIUS
    );
    const depth = (
      inverseProgress * inverseProgress * inverseProgress * FRONT_FACE_DEPTH
      + 3 * inverseProgress * inverseProgress * progress * FRONT_FACE_DEPTH
      + 3 * inverseProgress * progress * progress * BACK_PLATE_DEPTH
      + progress * progress * progress * BACK_PLATE_DEPTH
    );
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return {
      position: [x, y, depth],
      uv: [(x / FRONT_FACE_RADIUS + 1) / 2, 1 - (y / FRONT_FACE_RADIUS + 1) / 2],
      normal: [Math.cos(angle), Math.sin(angle), 0],
    };
  };
  for (let step = 0; step < LIP_STEP_COUNT; step += 1) {
    for (let segment = 0; segment < SEGMENT_COUNT; segment += 1) {
      const start = (segment / SEGMENT_COUNT) * Math.PI * 2;
      const end = ((segment + 1) / SEGMENT_COUNT) * Math.PI * 2;
      const innerStart = lipPoint(step, start);
      const innerEnd = lipPoint(step, end);
      const outerStart = lipPoint(step + 1, start);
      const outerEnd = lipPoint(step + 1, end);
      appendTriangle(1, innerStart, outerStart, outerEnd);
      appendTriangle(1, innerStart, outerEnd, innerEnd);
    }
  }

  return new Float32Array(vertices);
}

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

function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
  if (!gl) return null;
  const program = gl.createProgram();
  if (!program) return null;
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'WebGLプログラムを作成できませんでした');

  const buffer = gl.createBuffer();
  if (!buffer) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const mesh = createBadgeMesh();
  gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
  const stride = 9 * Float32Array.BYTES_PER_ELEMENT;
  const position = gl.getAttribLocation(program, 'aPosition');
  const uv = gl.getAttribLocation(program, 'aUv');
  const normal = gl.getAttribLocation(program, 'aNormal');
  const surface = gl.getAttribLocation(program, 'aSurface');
  const rotation = gl.getUniformLocation(program, 'uRotation');
  const artwork = gl.getUniformLocation(program, 'uArtwork');
  const hasArtwork = gl.getUniformLocation(program, 'uHasArtwork');
  const artworkAspect = gl.getUniformLocation(program, 'uArtworkAspect');
  const leftHighlight = gl.getUniformLocation(program, 'uLeftHighlight');
  const rightShade = gl.getUniformLocation(program, 'uRightShade');
  const artworkTexture = gl.createTexture();
  if (!artworkTexture) return null;
  let artworkLoaded = false;
  let artworkAspectRatio = 1;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, artworkTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

  const render = (rotationY: number, leftHighlightAmount: number, rightShadeAmount: number) => {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
    if (normal >= 0) {
      gl.enableVertexAttribArray(normal);
      gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, stride, 5 * Float32Array.BYTES_PER_ELEMENT);
    }
    gl.enableVertexAttribArray(surface);
    gl.vertexAttribPointer(surface, 1, gl.FLOAT, false, stride, 8 * Float32Array.BYTES_PER_ELEMENT);
    gl.uniform1f(rotation, (rotationY * Math.PI) / 180);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, artworkTexture);
    gl.uniform1i(artwork, 0);
    gl.uniform1f(hasArtwork, artworkLoaded ? 1 : 0);
    gl.uniform1f(artworkAspect, artworkAspectRatio);
    gl.uniform1f(leftHighlight, leftHighlightAmount);
    gl.uniform1f(rightShade, rightShadeAmount);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 9);
  };

  return {
    render,
    setArtwork: (image) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, artworkTexture);
      if (image) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        artworkLoaded = true;
        artworkAspectRatio = image.naturalWidth / image.naturalHeight;
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
        artworkLoaded = false;
        artworkAspectRatio = 1;
      }
    },
    dispose: () => {
      gl.deleteBuffer(buffer);
      gl.deleteTexture(artworkTexture);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    },
  };
}

export function CanBadgePreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const artworkImageRef = useRef<HTMLImageElement | null>(null);
  const isRotatingRef = useRef(false);
  const inertiaFrameRef = useRef<number | null>(null);
  const rotationStartPointerRef = useRef({ x: 0, y: 0 });
  const rotationStartValueRef = useRef<Rotation>({ y: 0 });
  const rotationVelocityRef = useRef<Rotation>({ y: 0 });
  const lastPointerRef = useRef({ x: 0, time: 0 });
  const [rotation, setRotation] = useState<Rotation>({ y: 0 });
  const [isRotating, setIsRotating] = useState(false);
  const [isWebglAvailable, setIsWebglAvailable] = useState(true);
  const [status, setStatus] = useState('イラストを選択すると前面に貼り付けます');

  const isBackSide = Math.cos((rotation.y * Math.PI) / 180) < 0;
  const sideFacing = Math.sin((rotation.y * Math.PI) / 180);
  const leftFacingAmount = Math.max(0, -sideFacing);
  const leftHighlightOpacity = isBackSide ? 0 : Math.max(0, (leftFacingAmount - HIGHLIGHT_VISIBLE_START) / (1 - HIGHLIGHT_VISIBLE_START));
  const rightShadeOpacity = Math.max(0, sideFacing);

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
      if (artworkImageRef.current) renderer.setArtwork(artworkImageRef.current);
      const observer = new ResizeObserver(() => renderer.render(rotation.y, leftHighlightOpacity, rightShadeOpacity));
      observer.observe(canvas);
      renderer.render(rotation.y, leftHighlightOpacity, rightShadeOpacity);
      return () => {
        observer.disconnect();
        renderer.dispose();
        rendererRef.current = null;
      };
    } catch {
      setIsWebglAvailable(false);
    }
  // WebGL resources are intentionally initialized once; current values are rendered by the effect below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rendererRef.current?.render(rotation.y, leftHighlightOpacity, rightShadeOpacity);
  }, [leftHighlightOpacity, rightShadeOpacity, rotation.y]);

  useEffect(() => () => {
    if (inertiaFrameRef.current !== null) window.cancelAnimationFrame(inertiaFrameRef.current);
  }, []);

  const runInertia = () => {
    if (inertiaFrameRef.current !== null) window.cancelAnimationFrame(inertiaFrameRef.current);
    const tick = () => {
      const velocity = rotationVelocityRef.current;
      if (Math.abs(velocity.y) < ROTATION_MIN_SPEED) {
        inertiaFrameRef.current = null;
        return;
      }
      setRotation((current) => ({ y: current.y + velocity.y }));
      inertiaFrameRef.current = window.requestAnimationFrame(tick);
    };
    inertiaFrameRef.current = window.requestAnimationFrame(tick);
  };

  const stopRotation = (event: PointerEvent<HTMLDivElement>) => {
    if (!isRotatingRef.current) return;
    isRotatingRef.current = false;
    setIsRotating(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (Math.abs(event.clientX - rotationStartPointerRef.current.x) < 6) {
      rotationVelocityRef.current = { y: 0 };
      return;
    }
    runInertia();
  };

  const loadArtwork = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus('画像ファイルを選択してください');
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      artworkImageRef.current = image;
      rendererRef.current?.setArtwork(image);
      rendererRef.current?.render(rotation.y, leftHighlightOpacity, rightShadeOpacity);
      setStatus(`${file.name} を前面に貼り付けました`);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      setStatus('画像を読み込めませんでした');
    };
    image.src = imageUrl;
  };

  return (
    <div className="can-badge-tool">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="visually-hidden"
        onChange={(event) => {
          loadArtwork(event.currentTarget.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      <p className="can-badge-tool-intro">左右にドラッグして缶バッジを回転できます</p>
      <div className="can-badge-preview-wrap">
        <div
          className={cn('can-badge-preview', isRotating && 'is-rotating')}
          onPointerDown={(event) => {
            event.preventDefault();
            if (inertiaFrameRef.current !== null) window.cancelAnimationFrame(inertiaFrameRef.current);
            inertiaFrameRef.current = null;
            rotationVelocityRef.current = { y: 0 };
            isRotatingRef.current = true;
            setIsRotating(true);
            rotationStartPointerRef.current = { x: event.clientX, y: event.clientY };
            rotationStartValueRef.current = rotation;
            lastPointerRef.current = { x: event.clientX, time: performance.now() };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!isRotatingRef.current) return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            const deltaX = event.clientX - rotationStartPointerRef.current.x;
            const now = performance.now();
            const elapsed = Math.max(16, now - lastPointerRef.current.time);
            rotationVelocityRef.current = { y: ((event.clientX - lastPointerRef.current.x) / rect.width) * 130 * (16 / elapsed) };
            lastPointerRef.current = { x: event.clientX, time: now };
            setRotation({ y: rotationStartValueRef.current.y + (deltaX / rect.width) * 130 });
          }}
          onPointerUp={stopRotation}
          onPointerCancel={stopRotation}
          onLostPointerCapture={() => {
            isRotatingRef.current = false;
            setIsRotating(false);
          }}
        >
          <canvas ref={canvasRef} className="can-badge-canvas" aria-label="回転可能な3D缶バッジのプレビュー" role="img" />
          {!isWebglAvailable ? <p className="can-badge-webgl-error">このブラウザでは3Dプレビューを表示できません。</p> : null}
        </div>
      </div>
      <div className="acrylic-tool-actions">
        <button type="button" className="acrylic-file-button" onClick={() => inputRef.current?.click()}>
          イラストを選択
        </button>
      </div>
      <p className="acrylic-tool-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
