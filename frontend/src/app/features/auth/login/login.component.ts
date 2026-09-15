import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { isAuthApiError } from '@supabase/supabase-js';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../../../shared/components/lang-toggle/lang-toggle.component';
import { SoftAuroraComponent } from '../../../shared/components/soft-aurora/soft-aurora.component';
import { PointerGlowDirective } from '../../../shared/directives/pointer-glow.directive';
import { UserService } from '../../../core/services/user.service';
import { ProfileService } from '../../../core/services/profile.service';

type LoginError = 'invalid-credentials' | 'email-not-confirmed';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    ThemeToggleComponent,
    LangToggleComponent,
    SoftAuroraComponent,
    PointerGlowDirective,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  readonly showPassword = signal(false);
  readonly submitError = signal<LoginError | null>(null);
  readonly submitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [true],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.userService.login(email, password);
      await this.router.navigateByUrl(await this.resolveLandingRoute());
    } catch (error) {
      const isEmailNotConfirmed = isAuthApiError(error) && error.code === 'email_not_confirmed';
      this.submitError.set(isEmailNotConfirmed ? 'email-not-confirmed' : 'invalid-credentials');
    } finally {
      this.submitting.set(false);
    }
  }

  /** Los administradores aterrizan en /admin; el resto, en /dashboard. */
  private async resolveLandingRoute(): Promise<string> {
    try {
      const profile = await this.profileService.getMine();
      return profile.systemRole === 'admin' ? '/admin' : '/dashboard';
    } catch {
      return '/dashboard';
    }
  }
}
