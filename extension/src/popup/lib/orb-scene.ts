import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  Group,
  HemisphereLight,
  IUniform,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Uniform,
  Vector3,
  WebGLRenderer
} from "three";

export interface OrbSceneOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
}

export interface OrbSceneHandle {
  start(): void;
  pulse(strength?: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

const BASE_BLUE = new Color("#4d9dff");
const HIGHLIGHT_BLUE = new Color("#b6e7ff");
const CORE_GLOW_BLUE = new Color("#78c5ff");
const PARTICLE_BLUE = new Color("#ccefff");

interface OrbUniforms {
  [uniform: string]: IUniform<unknown>;
  uTime: Uniform<number>;
  uAmplitude: Uniform<number>;
  uBassAmplitude: Uniform<number>;
  uSpectrumTilt: Uniform<number>;
  uBaseColor: Uniform<Color>;
  uHighlightColor: Uniform<Color>;
}

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uBassAmplitude;
  uniform float uSpectrumTilt;
  varying float vRipple;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    float noiseScale = 1.15;
    float time = uTime * 0.6;
    float displacement = snoise(normal * noiseScale + time) * 0.12;
    float fineRipples = snoise(normal * 5.8 + time * 1.9) * 0.022;
    float radial = length(position.xy);
    float wave = sin(radial * 6.0 - time * 2.7 + uSpectrumTilt * 1.8) * 0.05;
    float bassPush = uBassAmplitude * 0.4;
    float spectrumLean = uSpectrumTilt * 0.1;
    float surfaceFlow = displacement + fineRipples + wave;
    vec3 warpedPosition = position + normal * (surfaceFlow + bassPush + spectrumLean);
    vec4 mvPosition = modelViewMatrix * vec4(warpedPosition, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vPosition = mvPosition.xyz;
    vRipple = surfaceFlow;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uAmplitude;
  uniform vec3 uBaseColor;
  uniform vec3 uHighlightColor;
  varying float vRipple;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 2.3);
    float specular = pow(max(dot(reflect(-viewDir, vNormal), vec3(0.0, 1.0, 0.5)), 0.0), 26.0);
    float rippleTint = clamp(vRipple * 4.0 + 0.5, 0.0, 1.0);
    float depthFade = pow(1.0 - clamp(length(vPosition.xy) / 2.3, 0.0, 1.0), 1.4);
    float glow = mix(0.56, 1.05, uAmplitude);
    vec3 color = mix(uBaseColor, uHighlightColor, fresnel + rippleTint * 0.35);
    color += vec3(0.08, 0.11, 0.2) * specular;
    color *= (depthFade + fresnel * 1.3) * glow;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const shellFragmentShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vRipple;
  uniform float uAmplitude;
  uniform vec3 uBaseColor;
  uniform vec3 uHighlightColor;

  void main() {
    float fresnel = pow(1.0 - dot(vNormal, normalize(-vPosition)), 3.0);
    float rim = mix(0.4, 1.0, fresnel);
    float rippleEdge = clamp(vRipple * 4.0 + 0.5, 0.0, 1.0);
    float opacity = mix(0.14, 0.34, uAmplitude + fresnel * 0.5 + rippleEdge * 0.15);
    vec3 color = mix(uBaseColor, uHighlightColor, rim + rippleEdge * 0.2);
    gl_FragColor = vec4(color * (rim + uAmplitude), opacity);
  }
`;

class OrbController implements OrbSceneHandle {
  private readonly container: HTMLElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene: Scene;
  private readonly camera: PerspectiveCamera;
  private readonly clock: Clock;
  private readonly orbGroup: Group;

  private readonly coreGeometry: SphereGeometry;
  private readonly shellGeometry: SphereGeometry;
  private readonly particleGeometry: BufferGeometry;

  private readonly coreMaterial: ShaderMaterial;
  private readonly shellMaterial: ShaderMaterial;
  private readonly particleMaterial: PointsMaterial;

  private frameId: number | null = null;
  private isRunning = false;
  private smoothedAmplitude = 0.1;
  private smoothedBass = 0.08;
  private smoothedTilt = 0;
  private pulseBoost = 0;

  constructor(options: OrbSceneOptions) {
    this.container = options.container;
    const width = options.width ?? Math.max(1, this.container.clientWidth || 34);
    const height = options.height ?? Math.max(1, this.container.clientHeight || 34);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 3.2);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.clock = new Clock();
    this.orbGroup = new Group();
    this.scene.add(this.orbGroup);

    const orbUniforms: OrbUniforms = {
      uTime: new Uniform(0),
      uAmplitude: new Uniform(0.12),
      uBassAmplitude: new Uniform(0.08),
      uSpectrumTilt: new Uniform(0),
      uBaseColor: new Uniform(BASE_BLUE.clone()),
      uHighlightColor: new Uniform(CORE_GLOW_BLUE.clone())
    };

    this.coreMaterial = new ShaderMaterial({
      uniforms: orbUniforms,
      vertexShader,
      fragmentShader
    });

    this.shellMaterial = new ShaderMaterial({
      uniforms: {
        ...orbUniforms,
        uBaseColor: new Uniform(BASE_BLUE.clone()),
        uHighlightColor: new Uniform(HIGHLIGHT_BLUE.clone())
      },
      vertexShader,
      fragmentShader: shellFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending
    });

    this.particleMaterial = new PointsMaterial({
      size: 0.028,
      color: PARTICLE_BLUE,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: AdditiveBlending
    });

    this.coreGeometry = new SphereGeometry(0.79, 96, 96);
    this.shellGeometry = new SphereGeometry(0.86, 96, 96);
    this.particleGeometry = new BufferGeometry();

    this.setupSceneObjects();
    this.setupLights();
  }

  public start(): void {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  public resize(width: number, height: number): void {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    this.camera.aspect = safeWidth / safeHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(safeWidth, safeHeight);
  }

  public pulse(strength = 1): void {
    const normalizedStrength = MathUtils.clamp(strength, 0.25, 2);
    const randomMultiplier = MathUtils.lerp(0.82, 1.42, Math.random());
    this.pulseBoost = MathUtils.clamp(this.pulseBoost + normalizedStrength * 0.3 * randomMultiplier, 0, 1.2);
  }

  public dispose(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.isRunning = false;
    this.coreGeometry.dispose();
    this.shellGeometry.dispose();
    this.particleGeometry.dispose();
    this.coreMaterial.dispose();
    this.shellMaterial.dispose();
    this.particleMaterial.dispose();
    this.renderer.dispose();
    this.scene.clear();
    this.renderer.domElement.remove();
  }

  private setupSceneObjects(): void {
    const core = new Mesh(this.coreGeometry, this.coreMaterial);
    this.orbGroup.add(core);

    const shell = new Mesh(this.shellGeometry, this.shellMaterial);
    this.orbGroup.add(shell);

    const particleCount = 240;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const direction = new Vector3().randomDirection();
      const radius = 1.0 + Math.random() * 0.2;
      const pos = direction.multiplyScalar(radius);
      positions.set([pos.x, pos.y, pos.z], i * 3);
    }
    this.particleGeometry.setAttribute("position", new BufferAttribute(positions, 3));
    const particles = new Points(this.particleGeometry, this.particleMaterial);
    this.orbGroup.add(particles);
  }

  private setupLights(): void {
    const ambient = new AmbientLight("#7fb2ff", 0.7);
    const fill = new HemisphereLight("#dff0ff", "#9ab6ff", 0.82);
    const backLight = new PointLight("#3f7fff", 1.12, 12);
    backLight.position.set(-3, 2, -2);
    const keyLight = new PointLight("#8bc5ff", 0.95, 12);
    keyLight.position.set(3, 1.5, 2);
    this.scene.add(ambient);
    this.scene.add(fill);
    this.scene.add(backLight);
    this.scene.add(keyLight);
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;

    const targetAmplitude = 0.15 + Math.sin(elapsed * 1.15) * 0.03 + Math.sin(elapsed * 0.54) * 0.02;
    const targetBass = 0.09 + Math.sin(elapsed * 0.88 + 0.9) * 0.025;
    const targetTilt = Math.sin(elapsed * 0.36) * 0.26;
    const pulseAmplitude = this.pulseBoost * 0.2;
    const pulseBass = this.pulseBoost * 0.14;
    this.pulseBoost = MathUtils.damp(this.pulseBoost, 0, 4.6, delta);

    this.smoothedAmplitude = MathUtils.damp(this.smoothedAmplitude, targetAmplitude + pulseAmplitude, 2.4, delta);
    this.smoothedBass = MathUtils.damp(this.smoothedBass, targetBass + pulseBass, 2.1, delta);
    this.smoothedTilt = MathUtils.damp(this.smoothedTilt, targetTilt, 2.6, delta);

    this.updateUniforms(elapsed, this.smoothedAmplitude, this.smoothedBass, this.smoothedTilt);
    this.updateCamera(delta, this.smoothedTilt);
    this.updateParticles(this.smoothedAmplitude, this.smoothedTilt, delta);

    this.renderer.render(this.scene, this.camera);
  };

  private updateUniforms(time: number, amplitude: number, bass: number, tilt: number): void {
    this.coreMaterial.uniforms.uTime.value = time;
    this.coreMaterial.uniforms.uAmplitude.value = amplitude;
    this.coreMaterial.uniforms.uBassAmplitude.value = bass;
    this.coreMaterial.uniforms.uSpectrumTilt.value = tilt;

    this.shellMaterial.uniforms.uTime.value = time * 0.86;
    this.shellMaterial.uniforms.uAmplitude.value = amplitude * 0.94;
    this.shellMaterial.uniforms.uBassAmplitude.value = bass * 0.52;
    this.shellMaterial.uniforms.uSpectrumTilt.value = tilt * 0.5;
  }

  private updateCamera(delta: number, tilt: number): void {
    const targetX = tilt * 0.24;
    const targetY = Math.sin(this.clock.elapsedTime * 0.42) * 0.08;
    this.camera.position.x = MathUtils.damp(this.camera.position.x, targetX, 3.2, delta);
    this.camera.position.y = MathUtils.damp(this.camera.position.y, targetY, 3.2, delta);
    this.camera.lookAt(0, 0, 0);
  }

  private updateParticles(amplitude: number, tilt: number, delta: number): void {
    const sizeBase = 0.028 + amplitude * 0.016;
    this.particleMaterial.size = MathUtils.damp(this.particleMaterial.size, sizeBase, 4.8, delta);
    const hueShift = MathUtils.clamp(0.08 * amplitude + tilt * 0.04, -0.18, 0.18);
    const newColor = PARTICLE_BLUE.clone().offsetHSL(hueShift, 0, amplitude * 0.08);
    this.particleMaterial.color.copy(newColor);
    this.particleMaterial.opacity = 0.4 + amplitude * 0.5;
    this.orbGroup.rotation.y += delta * (0.12 + amplitude * 0.2);
    this.orbGroup.rotation.x = Math.sin(this.clock.elapsedTime * 0.33) * 0.06;
  }
}

export function createOrbScene(options: OrbSceneOptions): OrbSceneHandle {
  return new OrbController(options);
}
