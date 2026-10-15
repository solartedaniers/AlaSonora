import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ClassificationProgress, ClassificationStage } from '../classification-progress';

type StepState = 'done' | 'current' | 'pending';

// Los tres pasos visibles; "encendiendo el motor" es parte del análisis.
const STEPS: { id: 'upload' | 'verify' | 'analyze'; stages: ClassificationStage[] }[] = [
  { id: 'upload', stages: ['uploading'] },
  { id: 'verify', stages: ['verifying'] },
  { id: 'analyze', stages: ['waking', 'analyzing'] },
];

/** Barra de progreso de la clasificación: porcentaje, etapa en texto y, si falla, el error con Reintentar. */
@Component({
  selector: 'app-classification-progress',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './classification-progress.component.html',
  styleUrl: './classification-progress.component.scss',
})
export class ClassificationProgressComponent {
  readonly progress = input.required<ClassificationProgress>();
  readonly retry = output<void>();

  readonly rounded = computed(() => Math.round(this.progress().percent()));
  readonly stageKey = computed(() => `recording.progress.${this.progress().stage() ?? 'uploading'}`);
  readonly steps = computed(() => {
    const stage = this.progress().stage();
    const currentIndex = stage === 'done' ? STEPS.length : STEPS.findIndex((step) => stage !== null && step.stages.includes(stage));
    return STEPS.map((step, index) => ({
      labelKey: `recording.progress.steps.${step.id}`,
      state: (index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending') as StepState,
    }));
  });
}
