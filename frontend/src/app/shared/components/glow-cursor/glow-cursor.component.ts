import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  Input,
  inject,
  effect,
} from '@angular/core';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { ThemeService } from '../../../core/services/theme.service';

type BlendMode = 'screen' | 'normal' | 'lighten';

// Lightness of the rainbow trail per theme: darker on light backgrounds so the
// hues stay saturated and visible instead of washing out against white.
const THEME_LIGHTNESS: Record<'dark' | 'light', number> = { dark: 0.62, light: 0.42 };

const VERTEX_SHADER = `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

function buildFragmentShader(trailLength: number): string {
  return `
    precision highp float;
    #define TRAIL_LENGTH ${trailLength}
    uniform vec2 uResolution;
    uniform vec2 uTrail[TRAIL_LENGTH];
    uniform float uIntensity;
    uniform float uWidth;
    uniform float uTime;
    uniform float uLightness;
    varying vec2 vUv;

    vec3 hsl2rgb(vec3 hsl) {
      vec3 rgb = clamp(abs(mod(hsl.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return hsl.z + hsl.y * (rgb - 0.5) * (1.0 - abs(2.0 * hsl.z - 1.0));
    }

    void main() {
      vec2 fragCoord = vUv * uResolution;
      float totalGlow = 0.0;
      vec3 colorSum = vec3(0.0);
      for (int i = 0; i < TRAIL_LENGTH; i++) {
        float weight = 1.0 - float(i) / float(TRAIL_LENGTH);
        float dist = distance(fragCoord, uTrail[i]);
        float falloff = weight * weight * exp(-(dist * dist) / (uWidth * uWidth));
        float hue = fract(float(i) / float(TRAIL_LENGTH) - uTime * 0.15);
        colorSum += falloff * hsl2rgb(vec3(hue, 1.0, uLightness));
        totalGlow += falloff;
      }
      float glow = totalGlow * uIntensity;
      vec3 color = totalGlow > 0.0001 ? colorSum / totalGlow : vec3(0.0);
      gl_FragColor = vec4(color * glow, glow);
    }
  `;
}

/**
 * Global bioluminescent cursor trail rendered on a fullscreen WebGL canvas (OGL).
 * Mounted once at the app root; follows the pointer with a short rainbow glow
 * trail whose lightness adapts to the active theme so it never washes out.
 */
@Component({
  selector: 'app-glow-cursor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <canvas
      #canvas
      class="fixed inset-0 pointer-events-none z-50"
      [class.mix-blend-screen]="blendMode === 'screen'"
      [class.mix-blend-lighten]="blendMode === 'lighten'"
      aria-hidden="true"
    ></canvas>
  `,
})
export class GlowCursorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() trailLength = 26;
  @Input() trailWidth = 16;
  @Input() glowIntensity = 1.4;
  @Input() pulseSpeed = 1.6;
  @Input() blendMode: BlendMode = 'screen';
  @Input() idleFadeDelayMs = 300;
  @Input() idleFadeDurationMs = 700;

  private readonly theme = inject(ThemeService);
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private renderer?: Renderer;
  private program?: Program;
  private mesh?: Mesh;
  private trail: number[] = [];
  private readonly pointer = { x: -1000, y: -1000 };
  private hasPointer = false;
  private lastMoveAt = 0;
  private frameId = 0;

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.pointer.x = event.clientX;
    this.pointer.y = window.innerHeight - event.clientY;
    this.hasPointer = true;
    this.lastMoveAt = performance.now();
  };

  private readonly onResize = (): void => this.resize();

  constructor() {
    effect(() => {
      const theme = this.theme.resolvedTheme();
      if (this.program) this.program.uniforms['uLightness'].value = THEME_LIGHTNESS[theme];
    });
  }

  ngAfterViewInit(): void {
    if (this.reducedMotion) return;

    this.trail = new Array(this.trailLength * 2).fill(0);
    this.renderer = new Renderer({
      canvas: this.canvasRef.nativeElement,
      alpha: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    const gl = this.renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    this.program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: buildFragmentShader(this.trailLength),
      transparent: true,
      depthTest: false,
      uniforms: {
        uResolution: { value: [0, 0] },
        uTrail: { value: this.trail },
        uIntensity: { value: 0 },
        uWidth: { value: this.trailWidth },
        uTime: { value: 0 },
        uLightness: { value: THEME_LIGHTNESS[this.theme.resolvedTheme()] },
      },
    });
    this.mesh = new Mesh(gl, { geometry: new Triangle(gl), program: this.program });

    this.resize();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });

    this.frameId = requestAnimationFrame(this.tick);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
  }

  private resize(): void {
    if (!this.renderer || !this.program) return;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.program.uniforms['uResolution'].value = [window.innerWidth, window.innerHeight];
  }

  private readonly tick = (): void => {
    this.advanceTrail();
    this.applyIntensity();
    this.program!.uniforms['uTime'].value = performance.now() * 0.001;
    this.renderer!.render({ scene: this.mesh! });
    this.frameId = requestAnimationFrame(this.tick);
  };

  private advanceTrail(): void {
    for (let i = this.trailLength - 1; i > 0; i--) {
      this.trail[i * 2] = this.trail[(i - 1) * 2];
      this.trail[i * 2 + 1] = this.trail[(i - 1) * 2 + 1];
    }
    this.trail[0] = this.pointer.x;
    this.trail[1] = this.pointer.y;
  }

  private applyIntensity(): void {
    if (!this.hasPointer) return;
    const idleFor = performance.now() - this.lastMoveAt;
    const fadeProgress = Math.max(0, Math.min(1, (idleFor - this.idleFadeDelayMs) / this.idleFadeDurationMs));
    const pulse = 1 + 0.15 * Math.sin(performance.now() * 0.001 * this.pulseSpeed);
    this.program!.uniforms['uIntensity'].value = this.glowIntensity * pulse * (1 - fadeProgress);
  }
}
