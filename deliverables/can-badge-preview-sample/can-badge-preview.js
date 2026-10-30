(() => {
  'use strict';

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
    vec3 artworkColor = mix(vec3(1.0), artwork.rgb, artwork.a);
    color = mix(vec3(1.0), artworkColor, uHasArtwork);
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
    vec3 artworkColor = mix(vec3(1.0), artwork.rgb, artwork.a);
    color = mix(vec3(1.0), artworkColor, uHasArtwork);
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

  function appendVertex(target, position, uv, normal, surface) {
    target.push(...position, ...uv, ...normal, surface);
  }

  function createBadgeMesh() {
    const vertices = [];
    const frontPosition = (radius, angle) => [
      Math.cos(angle) * radius * FRONT_FACE_RADIUS,
      Math.sin(angle) * radius * FRONT_FACE_RADIUS,
      FRONT_FACE_DEPTH,
    ];
    const appendTriangle = (surface, first, second, third) => {
      appendVertex(vertices, first.position, first.uv, first.normal, surface);
      appendVertex(vertices, second.position, second.uv, second.normal, surface);
      appendVertex(vertices, third.position, third.uv, third.normal, surface);
    };
    const frontPoint = (radius, angle) => {
      const x = Math.cos(angle) * radius * FRONT_FACE_RADIUS;
      const y = Math.sin(angle) * radius * FRONT_FACE_RADIUS;
      return {
        position: frontPosition(radius, angle),
        uv: [(x / FRONT_FACE_RADIUS + 1) / 2, 1 - (y / FRONT_FACE_RADIUS + 1) / 2],
        normal: [0, 0, 1],
      };
    };
    const backPoint = (radius, angle) => {
      const x = Math.cos(angle) * radius * BACK_PLATE_RADIUS;
      const y = Math.sin(angle) * radius * BACK_PLATE_RADIUS;
      return {
        position: [x, y, BACK_PLATE_DEPTH],
        uv: [(x + 1) / 2, 1 - (y + 1) / 2],
        normal: [0, 0, -1],
      };
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

    const lipPoint = (step, angle) => {
      const progress = step / LIP_STEP_COUNT;
      const inverseProgress = 1 - progress;
      const radius = (
        inverseProgress ** 3 * FRONT_FACE_RADIUS
        + 3 * inverseProgress ** 2 * progress * SHELL_OUTER_RADIUS
        + 3 * inverseProgress * progress ** 2 * SHELL_OUTER_RADIUS
        + progress ** 3 * BACK_PLATE_RADIUS
      );
      const depth = (
        inverseProgress ** 3 * FRONT_FACE_DEPTH
        + 3 * inverseProgress ** 2 * progress * FRONT_FACE_DEPTH
        + 3 * inverseProgress * progress ** 2 * BACK_PLATE_DEPTH
        + progress ** 3 * BACK_PLATE_DEPTH
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

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('シェーダーを作成できませんでした');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'シェーダーをコンパイルできませんでした';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function createRenderer(canvas) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
    if (!gl) return null;

    const program = gl.createProgram();
    if (!program) return null;
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'WebGLプログラムを作成できませんでした');
    }

    const buffer = gl.createBuffer();
    if (!buffer) return null;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const mesh = createBadgeMesh();
    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);

    const stride = 9 * Float32Array.BYTES_PER_ELEMENT;
    const locations = {
      position: gl.getAttribLocation(program, 'aPosition'),
      uv: gl.getAttribLocation(program, 'aUv'),
      normal: gl.getAttribLocation(program, 'aNormal'),
      surface: gl.getAttribLocation(program, 'aSurface'),
      rotation: gl.getUniformLocation(program, 'uRotation'),
      artwork: gl.getUniformLocation(program, 'uArtwork'),
      hasArtwork: gl.getUniformLocation(program, 'uHasArtwork'),
      artworkAspect: gl.getUniformLocation(program, 'uArtworkAspect'),
      leftHighlight: gl.getUniformLocation(program, 'uLeftHighlight'),
      rightShade: gl.getUniformLocation(program, 'uRightShade'),
    };

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
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );

    const render = (rotationY, leftHighlightAmount, rightShadeAmount) => {
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
      gl.enableVertexAttribArray(locations.position);
      gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(locations.uv);
      gl.vertexAttribPointer(locations.uv, 2, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
      if (locations.normal >= 0) {
        gl.enableVertexAttribArray(locations.normal);
        gl.vertexAttribPointer(locations.normal, 3, gl.FLOAT, false, stride, 5 * Float32Array.BYTES_PER_ELEMENT);
      }
      gl.enableVertexAttribArray(locations.surface);
      gl.vertexAttribPointer(locations.surface, 1, gl.FLOAT, false, stride, 8 * Float32Array.BYTES_PER_ELEMENT);
      gl.uniform1f(locations.rotation, (rotationY * Math.PI) / 180);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, artworkTexture);
      gl.uniform1i(locations.artwork, 0);
      gl.uniform1f(locations.hasArtwork, artworkLoaded ? 1 : 0);
      gl.uniform1f(locations.artworkAspect, artworkAspectRatio);
      gl.uniform1f(locations.leftHighlight, leftHighlightAmount);
      gl.uniform1f(locations.rightShade, rightShadeAmount);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 9);
    };

    return {
      render,
      setArtwork(image) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, artworkTexture);
        if (image) {
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          artworkLoaded = true;
          artworkAspectRatio = image.naturalWidth / image.naturalHeight;
          return;
        }
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array([255, 255, 255, 255]),
        );
        artworkLoaded = false;
        artworkAspectRatio = 1;
      },
      dispose() {
        gl.deleteBuffer(buffer);
        gl.deleteTexture(artworkTexture);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
      },
    };
  }

  class CanBadgePreview {
    constructor(root) {
      this.root = root;
      this.canvas = root.querySelector('[data-can-badge-canvas]');
      this.input = root.querySelector('[data-can-badge-input]');
      this.selectButton = root.querySelector('[data-can-badge-select]');
      this.dragArea = root.querySelector('[data-can-badge-drag-area]');
      this.error = root.querySelector('[data-can-badge-error]');
      this.status = root.querySelector('[data-can-badge-status]');
      this.rotationY = 0;
      this.rotationVelocityY = 0;
      this.rotationStartX = 0;
      this.rotationStartY = 0;
      this.lastPointerX = 0;
      this.lastPointerTime = 0;
      this.isRotating = false;
      this.inertiaFrame = null;
      this.resizeObserver = null;

      if (!this.canvas || !this.input || !this.selectButton || !this.dragArea || !this.error || !this.status) {
        throw new Error('缶バッジプレビューの必須DOM要素が足りません');
      }

      try {
        this.renderer = createRenderer(this.canvas);
        if (!this.renderer) {
          this.showWebglError();
          return;
        }
      } catch (error) {
        this.showWebglError();
        return;
      }

      this.selectButton.addEventListener('click', () => this.input.click());
      this.input.addEventListener('change', () => {
        this.loadArtwork(this.input.files ? this.input.files[0] : undefined);
        this.input.value = '';
      });
      this.dragArea.addEventListener('pointerdown', (event) => this.startRotation(event));
      this.dragArea.addEventListener('pointermove', (event) => this.moveRotation(event));
      this.dragArea.addEventListener('pointerup', (event) => this.stopRotation(event));
      this.dragArea.addEventListener('pointercancel', (event) => this.stopRotation(event));
      this.dragArea.addEventListener('lostpointercapture', () => {
        this.isRotating = false;
        this.dragArea.classList.remove('is-rotating');
      });

      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => this.render());
        this.resizeObserver.observe(this.canvas);
      } else {
        window.addEventListener('resize', () => this.render());
      }
      this.render();
    }

    showWebglError() {
      this.error.hidden = false;
      this.selectButton.disabled = true;
      this.status.textContent = 'WebGLが無効なためプレビューを初期化できませんでした';
    }

    getLightAmounts() {
      const radians = (this.rotationY * Math.PI) / 180;
      const isBackSide = Math.cos(radians) < 0;
      const sideFacing = Math.sin(radians);
      const leftFacingAmount = Math.max(0, -sideFacing);
      return {
        leftHighlight: isBackSide
          ? 0
          : Math.max(0, (leftFacingAmount - HIGHLIGHT_VISIBLE_START) / (1 - HIGHLIGHT_VISIBLE_START)),
        rightShade: Math.max(0, sideFacing),
      };
    }

    render() {
      if (!this.renderer) return;
      const light = this.getLightAmounts();
      this.renderer.render(this.rotationY, light.leftHighlight, light.rightShade);
    }

    startRotation(event) {
      if (!this.renderer) return;
      event.preventDefault();
      if (this.inertiaFrame !== null) cancelAnimationFrame(this.inertiaFrame);
      this.inertiaFrame = null;
      this.rotationVelocityY = 0;
      this.isRotating = true;
      this.dragArea.classList.add('is-rotating');
      this.rotationStartX = event.clientX;
      this.rotationStartY = this.rotationY;
      this.lastPointerX = event.clientX;
      this.lastPointerTime = performance.now();
      this.dragArea.setPointerCapture(event.pointerId);
    }

    moveRotation(event) {
      if (!this.isRotating) return;
      event.preventDefault();
      const width = Math.max(1, this.dragArea.getBoundingClientRect().width);
      const deltaX = event.clientX - this.rotationStartX;
      const now = performance.now();
      const elapsed = Math.max(16, now - this.lastPointerTime);
      this.rotationVelocityY = ((event.clientX - this.lastPointerX) / width) * 130 * (16 / elapsed);
      this.lastPointerX = event.clientX;
      this.lastPointerTime = now;
      this.rotationY = this.rotationStartY + (deltaX / width) * 130;
      this.render();
    }

    stopRotation(event) {
      if (!this.isRotating) return;
      this.isRotating = false;
      this.dragArea.classList.remove('is-rotating');
      if (this.dragArea.hasPointerCapture(event.pointerId)) {
        this.dragArea.releasePointerCapture(event.pointerId);
      }
      if (Math.abs(event.clientX - this.rotationStartX) < 6) {
        this.rotationVelocityY = 0;
        return;
      }
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.runInertia();
    }

    runInertia() {
      if (this.inertiaFrame !== null) cancelAnimationFrame(this.inertiaFrame);
      const tick = () => {
        if (Math.abs(this.rotationVelocityY) < ROTATION_MIN_SPEED) {
          this.inertiaFrame = null;
          return;
        }
        this.rotationY += this.rotationVelocityY;
        this.render();
        this.inertiaFrame = requestAnimationFrame(tick);
      };
      this.inertiaFrame = requestAnimationFrame(tick);
    }

    loadArtwork(file) {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        this.status.textContent = '画像ファイルを選択してください';
        return;
      }

      const imageUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(imageUrl);
        this.renderer.setArtwork(image);
        this.render();
        this.status.textContent = `${file.name} を前面に貼り付けました`;
      };
      image.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        this.status.textContent = '画像を読み込めませんでした';
      };
      image.src = imageUrl;
    }
  }

  document.querySelectorAll('[data-can-badge-preview]').forEach((root) => {
    try {
      new CanBadgePreview(root);
    } catch (error) {
      const status = root.querySelector('[data-can-badge-status]');
      if (status) status.textContent = error instanceof Error ? error.message : 'プレビューを初期化できませんでした';
    }
  });
})();
