import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Detection } from '../../../core/models';

/** Un día de la franja: cuántas grabaciones hubo y su nivel relativo (0 = ninguna, 4 = el día más activo). */
interface ActivityDay {
  key: string;
  count: number;
  level: number;
}

// Doce semanas: suficiente para ver hábitos de salida al campo sin volver ilegible la franja.
const ACTIVITY_DAYS = 84;
const ACTIVITY_LEVELS = 4;
const MS_PER_DAY = 86_400_000;

/**
 * Franja de actividad: cada columna es un día y su altura, cuántos cantos guardaste.
 * Se lee como un sonograma del tiempo; solo usa tus detecciones reales.
 */
@Component({
  selector: 'app-activity-strip',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-strip.component.html',
  styleUrl: './activity-strip.component.scss',
})
export class ActivityStripComponent {
  readonly detections = input.required<Detection[]>();

  readonly days = computed<ActivityDay[]>(() => {
    const counts = new Map<string, number>();
    for (const detection of this.detections()) {
      const key = ActivityStripComponent.dayKey(new Date(detection.recordedAt));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const today = new Date();
    const days = Array.from({ length: ACTIVITY_DAYS }, (_, index) => {
      const key = ActivityStripComponent.dayKey(new Date(today.getTime() - (ACTIVITY_DAYS - 1 - index) * MS_PER_DAY));
      return { key, count: counts.get(key) ?? 0 };
    });
    const max = Math.max(1, ...days.map((day) => day.count));
    return days.map((day) => ({ ...day, level: day.count === 0 ? 0 : Math.ceil((day.count / max) * ACTIVITY_LEVELS) }));
  });

  readonly recordings = computed(() => this.days().reduce((sum, day) => sum + day.count, 0));
  readonly activeDays = computed(() => this.days().filter((day) => day.count > 0).length);

  /** Fecha local (no UTC): una grabación de la noche cuenta en el día en que la hiciste. */
  private static dayKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }
}
