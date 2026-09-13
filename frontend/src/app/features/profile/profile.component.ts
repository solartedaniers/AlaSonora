import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { UserService } from '../../core/services/user.service';
import { ProfileService } from '../../core/services/profile.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { I18nService, AppLang } from '../../core/services/i18n.service';
import { OfflineStorageService } from '../../core/services/offline-storage.service';
import { LettersOnlyDirective } from '../../shared/directives/letters-only.directive';
import { PointerGlowDirective } from '../../shared/directives/pointer-glow.directive';
import { CountUpComponent } from '../../shared/components/count-up/count-up.component';
import { SoftAuroraComponent } from '../../shared/components/soft-aurora/soft-aurora.component';
import { nameValidator } from '../../core/validators/name.validator';
import { ObserverRole, Profile, UserStats } from '../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    NavHeaderComponent,
    TranslatePipe,
    ReactiveFormsModule,
    LettersOnlyDirective,
    PointerGlowDirective,
    CountUpComponent,
    SoftAuroraComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  readonly user = inject(UserService);
  readonly theme = inject(ThemeService);
  readonly i18n = inject(I18nService);
  readonly offline = inject(OfflineStorageService);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly stats = signal<UserStats | null>(null);
  readonly gainDb = signal(18);

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly uploadingAvatar = signal(false);
  readonly avatarUrl = signal<string | undefined>(undefined);

  readonly roles: ObserverRole[] = ['ornithologist', 'ranger', 'biologist', 'hobbyist', 'student'];

  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, nameValidator]],
    role: ['hobbyist' as ObserverRole, Validators.required],
    institution: [''],
    orcidId: [''],
    stationName: [''],
  });

  readonly themeOptions: { mode: ThemeMode; icon: string; labelKey: string }[] = [
    { mode: 'light', icon: 'light_mode', labelKey: 'theme.light' },
    { mode: 'dark', icon: 'dark_mode', labelKey: 'theme.dark' },
    { mode: 'system', icon: 'brightness_auto', labelKey: 'theme.system' },
  ];

  readonly langOptions: AppLang[] = ['es', 'en'];

  async ngOnInit(): Promise<void> {
    this.stats.set(await this.user.getStats());
    this.applyProfile(await this.profileService.getMine());
  }

  startEditing(): void {
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    const userId = this.user.currentUser()?.id;
    if (!file || !userId) return;

    this.uploadingAvatar.set(true);
    try {
      this.avatarUrl.set(await this.profileService.uploadAvatar(userId, file));
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const { displayName, role, institution, orcidId, stationName } = this.form.getRawValue();
      const updated = await this.profileService.update({
        displayName,
        role,
        avatarUrl: this.avatarUrl(),
        institution: institution || undefined,
        orcidId: orcidId || undefined,
        stationName: stationName || undefined,
      });
      await this.user.syncMetadata({
        full_name: updated.displayName,
        avatar_url: updated.avatarUrl,
        institution: updated.institution,
        orcid_id: updated.orcidId,
        station_name: updated.stationName,
      });
      this.editing.set(false);
    } finally {
      this.saving.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.user.logout();
    await this.router.navigateByUrl('/');
  }

  private applyProfile(profile: Profile): void {
    this.avatarUrl.set(profile.avatarUrl);
    this.form.setValue({
      displayName: profile.displayName,
      role: profile.role,
      institution: profile.institution ?? '',
      orcidId: profile.orcidId ?? '',
      stationName: profile.stationName ?? '',
    });
  }
}
