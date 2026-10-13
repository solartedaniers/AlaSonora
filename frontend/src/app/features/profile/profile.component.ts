import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { UserService } from '../../core/services/user.service';
import { ProfileService } from '../../core/services/profile.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { I18nService, AppLang } from '../../core/services/i18n.service';
import { LettersOnlyDirective } from '../../shared/directives/letters-only.directive';
import { nameValidator } from '../../core/validators/name.validator';
import { ObserverRole, Profile } from '../../core/models';

// Tiempo que se muestra la confirmación de guardado.
const SAVED_NOTICE_MS = 3200;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    NavHeaderComponent,
    TranslatePipe,
    ReactiveFormsModule,
    LettersOnlyDirective,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  readonly user = inject(UserService);
  readonly theme = inject(ThemeService);
  readonly i18n = inject(I18nService);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly uploadingAvatar = signal(false);
  readonly avatarUrl = signal<string | undefined>(undefined);
  readonly avatarError = signal<string | null>(null);
  /** Solo estado de vista: avisa si el perfil no cargó, para no editar sobre un formulario vacío. */
  readonly loadFailed = signal(false);
  /** Solo estado de vista: confirma un guardado exitoso. */
  readonly justSaved = signal(false);

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
    try {
      this.applyProfile(await this.profileService.getMine());
    } catch (error) {
      console.error('Profile load failed', error);
      this.loadFailed.set(true);
    }
  }

  startEditing(): void {
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.avatarError.set(null);
    this.uploadingAvatar.set(true);
    try {
      // Leo la sesión directamente y no el signal `currentUser`, que se llena cuando
      // resuelve getSession() (ver UserService.isAuthenticated). Con `currentUser()?.id`
      // la subida no hacía nada si la página abría antes de que el signal resolviera.
      const userId = await this.user.getUserId();
      if (!userId) {
        this.avatarError.set(this.i18n.translate('profile.avatarUploadError'));
        return;
      }
      this.avatarUrl.set(await this.profileService.uploadAvatar(userId, file));
    } catch (error) {
      console.error('Avatar upload failed', error);
      this.avatarError.set(this.i18n.translate('profile.avatarUploadError'));
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
      this.justSaved.set(true);
      setTimeout(() => this.justSaved.set(false), SAVED_NOTICE_MS);
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
