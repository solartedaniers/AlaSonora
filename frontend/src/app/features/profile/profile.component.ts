import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { UserService } from '../../core/services/user.service';
import { ProfileService } from '../../core/services/profile.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { I18nService, AppLang } from '../../core/services/i18n.service';
import { usernameAvailableValidator, usernameValidators } from '../../core/validators/username.validator';
import { environment } from '../../../environments/environment';
import { ObserverRole, Profile } from '../../core/models';
import { LoggerService } from '../../core/services/logger.service';

// Tiempo que se muestra la confirmación de guardado.
const SAVED_NOTICE_MS = 3200;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    NavHeaderComponent,
    TranslatePipe,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  readonly user = inject(UserService);
  private readonly logger = inject(LoggerService);
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

  readonly usernameLimits = environment.username;
  /** Usuario guardado: no lo marco como ocupado si el observador lo deja igual. */
  private savedUsername = '';

  readonly roles: ObserverRole[] = ['ornithologist', 'ranger', 'biologist', 'hobbyist', 'student'];

  readonly form = this.fb.nonNullable.group({
    username: ['', {
      validators: usernameValidators,
      asyncValidators: usernameAvailableValidator(
        (name) => this.user.checkUsername(name),
        () => this.savedUsername
      ),
    }],
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
      this.logger.error('Profile', 'load failed', error);
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
      this.logger.error('Profile', 'avatar upload failed', error);
      this.avatarError.set(this.i18n.translate('profile.avatarUploadError'));
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const { username, role, institution, orcidId, stationName } = this.form.getRawValue();
      const updated = await this.profileService.update({
        username: username.trim(),
        role,
        avatarUrl: this.avatarUrl(),
        institution: institution || undefined,
        orcidId: orcidId || undefined,
        stationName: stationName || undefined,
      });
      await this.user.syncMetadata({
        username: updated.username,
        avatar_url: updated.avatarUrl,
        institution: updated.institution,
        orcid_id: updated.orcidId,
        station_name: updated.stationName,
      });
      this.savedUsername = updated.username;
      this.editing.set(false);
      this.justSaved.set(true);
      setTimeout(() => this.justSaved.set(false), SAVED_NOTICE_MS);
    } catch (error) {
      // El backend vuelve a validar: si alguien lo tomó entre la comprobación y el guardado, responde 409.
      const code = error instanceof HttpErrorResponse ? (error.error as { errorCode?: string } | null)?.errorCode : undefined;
      if (code !== 'USERNAME_TAKEN' && code !== 'USERNAME_INVALID') throw error;
      this.form.controls.username.setErrors(code === 'USERNAME_TAKEN' ? { usernameTaken: true } : { pattern: true });
      this.form.controls.username.markAsTouched();
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
    this.savedUsername = profile.username;
    this.form.setValue({
      username: profile.username,
      role: profile.role,
      institution: profile.institution ?? '',
      orcidId: profile.orcidId ?? '',
      stationName: profile.stationName ?? '',
    });
  }
}
