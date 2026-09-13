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

interface CursorPalette {
  colorA: string;
  colorB: string;
}

// Vivid defaults per theme: dark mode stays bright cyan/violet so the trail
// pops against dark surfaces; light mode drops to a deeper emerald/teal so
// it stays visible without looking neon on light surfaces.
const THEME_PALETTES: Record<'dark' | 'light', CursorPalette> = {
  dark: { colorA: '#67E8F9', colorB: '#A78BFA' },
  light: { colorA: '#334155', colorB: '#64748b' },
};

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
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying vec2 vUv;

    void main() {
      vec2 fragCoord = vUv * uResolution;
      float glow = 0.0;
      for (int i = 0; i < TRAIL_LENGTH; i++) {
        float weight = 1.0 - float(i) / float(TRAIL_LENGTH);
        float dist = distance(fragCoord, uTrail[i]);
        glow += weight * weight * exp(-(dist * dist) / (uWidth * uWidth));
      }
      glow *= uIntensity;
      vec3 color = mix(uColorB, uColorA, clamp(glow, 0.0, 1.0));
      gl_FragColor = vec4(color * glow, glow);
    }
  `;
}

/**
 * Global bioluminescent cursor trail rendered on a fullscreen WebGL canvas (OGL).
 * Mounted once at the app root; follows the pointer with a short glowing trail
 * and switches its palette reactively based on the active theme.
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
      this.theme.resolvedTheme();
      this.applyThemeColors();
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
        uColorA: { value: [1, 1, 1] },
        uColorB: { value: [1, 1, 1] },
      },
    });
    this.mesh = new Mesh(gl, { geometry: new Triangle(gl), program: this.program });

    this.applyThemeColors();
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

  private applyThemeColors(): void {
    if (!this.program) return;
    const palette = THEME_PALETTES[this.theme.resolvedTheme()];
    this.program.uniforms['uColorA'].value = this.hexToRgb(palette.colorA);
    this.program.uniforms['uColorB'].value = this.hexToRgb(palette.colorB);
  }

  private hexToRgb(hex: string): [number, number, number] {
    const match = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!match) return [1, 1, 1];
    const int = parseInt(match[1], 16);
    return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
  }
}
