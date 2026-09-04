import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { OfflineStorageService } from '../../../core/services/offline-storage.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (offline.pendingCount() > 0) {
      <div class="w-full bg-secondary-container/40 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <span class="material-symbols-outlined text-secondary text-lg animate-pulse">cloud_sync</span>
          <p class="text-sm text-on-secondary-container">
            <span class="font-semibold">{{ 'workers.offlineBannerTitle' | translate }}:</span>
            {{ offline.pendingCount() }} {{ 'workers.syncPending' | translate }}
          </p>
        </div>
        <button
          type="button"
          class="text-xs font-semibold text-on-secondary-container underline hover:text-on-surface transition-colors"
        >
          {{ 'workers.forceSync' | translate }}
        </button>
      </div>
    }
  `,
})
export class OfflineBannerComponent {
  readonly offline = inject(OfflineStorageService);
}
