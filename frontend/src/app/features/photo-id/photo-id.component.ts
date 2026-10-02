import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/services/i18n.service';
import {
  PhotoClassificationResult,
  PhotoClassificationService,
} from '../../core/services/photo-classification.service';

@Component({
  selector: 'app-photo-id',
  standalone: true,
  imports: [DecimalPipe, NavHeaderComponent, ConfidenceBadgeComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './photo-id.component.html',
})
export class PhotoIdComponent {
  private readonly classificationService = inject(PhotoClassificationService);
  private readonly i18n = inject(I18nService);

  readonly previewUrl = signal<string | null>(null);
  readonly classifying = signal(false);
  readonly result = signal<PhotoClassificationResult | null>(null);
  readonly errorMessage = signal<string | null>(null);

  async onPhotoSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.result.set(null);
    this.errorMessage.set(null);
    this.previewUrl.set(URL.createObjectURL(file));
    this.classifying.set(true);
    try {
      this.result.set(await this.classificationService.classify(file));
    } catch (error) {
      console.error('Photo classification failed', error);
      this.errorMessage.set(this.resolveErrorMessage(error));
    } finally {
      this.classifying.set(false);
    }
  }

  reset(): void {
    this.previewUrl.set(null);
    this.result.set(null);
    this.errorMessage.set(null);
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const detail = (error.error as { message?: string } | null)?.message;
      if (detail) return detail;
    }
    // 503: el motor de IA tiene apagada la clasificación por foto. El backend
    // hoy reenvía cualquier fallo del motor como 502, así que ambos
    // significan "esta función no está disponible ahora mismo".
    if (error instanceof HttpErrorResponse && (error.status === 503 || error.status === 502)) {
      return this.i18n.translate('photoId.unavailable');
    }
    return this.i18n.translate('photoId.genericError');
  }
}
