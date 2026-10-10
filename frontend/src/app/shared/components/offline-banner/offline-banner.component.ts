import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { OfflineStorageService } from '../../../core/services/offline-storage.service';
import { PendingRecordingsSyncService } from '../../../core/services/pending-recordings-sync.service';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * Connection strip under the header: offline notice and/or recordings waiting
 * to sync. Lives in the header so every screen shows it.
 */
@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (!connectivity.online()) {
      <div role="status" class="connection-strip connection-strip--offline">
        <span class="material-symbols-outlined shrink-0" aria-hidden="true">signal_disconnected</span>
        <p><strong>{{ 'workers.offlineTitle' | translate }}</strong> {{ 'workers.offlineBody' | translate }}</p>
      </div>
    }
    @if (offline.pendingCount() > 0) {
      <div role="status" class="connection-strip connection-strip--pending">
        <span class="material-symbols-outlined shrink-0" aria-hidden="true">cloud_sync</span>
        <p class="flex-1">
          <strong>{{ 'workers.offlineBannerTitle' | translate }}:</strong>
          {{ offline.pendingCount() }} {{ 'workers.syncPending' | translate }}
        </p>
        @if (connectivity.online()) {
          <button type="button" class="btn btn--quiet min-h-touch px-4" (click)="pendingSync.syncNow()">
            {{ 'workers.forceSync' | translate }}
          </button>
        }
      </div>
    }
  `,
  styles: `
    .connection-strip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: calc(var(--space-unit) * 3);
      padding: calc(var(--space-unit) * 3) var(--space-gutter);
      font-size: var(--text-sm);
    }
    .connection-strip--offline {
      background: var(--color-warning-container);
      color: var(--color-on-warning-container);
    }
    .connection-strip--pending {
      background: var(--color-surface-container-lowest);
      color: var(--color-on-surface);
      border-block-end: 1px solid var(--color-outline-variant);
    }
  `,
})
export class OfflineBannerComponent {
  readonly offline = inject(OfflineStorageService);
  readonly pendingSync = inject(PendingRecordingsSyncService);
  readonly connectivity = inject(ConnectivityService);
}
