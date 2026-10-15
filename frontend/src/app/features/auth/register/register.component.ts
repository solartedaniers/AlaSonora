import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { NavHeaderComponent } from '../../../shared/components/nav-header/nav-header.component';
import { SiteFooterComponent } from '../../../shared/components/site-footer/site-footer.component';
import { AuthPanelComponent } from '../auth-panel/auth-panel.component';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { usernameAvailableValidator, usernameValidators } from '../../../core/validators/username.validator';
import { environment } from '../../../../environments/environment';
import { ObserverRole } from '../../../core/models';

type PasswordTier = 'empty' | 'weak' | 'medium' | 'strong' | 'excellent';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    NavHeaderComponent,
    SiteFooterComponent,
    AuthPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly usernameLimits = environment.username;

  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal(false);
  readonly passwordValue = signal('');

  readonly strengthBars = [0, 1, 2, 3];

  readonly roles: ObserverRole[] = ['ornithologist', 'ranger', 'biologist', 'hobbyist', 'student'];

  readonly form = this.fb.nonNullable.group({
    username: ['', {
      validators: usernameValidators,
      asyncValidators: usernameAvailableValidator((name) => this.userService.checkUsername(name)),
    }],
    role: ['hobbyist' as ObserverRole, Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    consentScience: [false, Validators.requiredTrue],
    consentTerms: [false, Validators.requiredTrue],
  });

  readonly passwordScore = computed(() => {
    const value = this.passwordValue();
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return score;
  });

  readonly passwordTier = computed<PasswordTier>(() => {
    const value = this.passwordValue();
    if (!value) return 'empty';
    const score = this.passwordScore();
    if (score <= 1) return 'weak';
    if (score === 2) return 'medium';
    if (score === 3) return 'strong';
    return 'excellent';
  });

  onPasswordInput(value: string): void {
    this.passwordValue.set(value);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.submitError.set(false);
    try {
      const { username, email, password, role } = this.form.getRawValue();
      // Vuelvo a preguntar justo antes de crear la cuenta: alguien pudo tomarlo mientras escribía.
      const { available } = await this.userService.checkUsername(username.trim());
      if (!available) {
        this.form.controls.username.setErrors({ usernameTaken: true });
        this.form.controls.username.markAsTouched();
        return;
      }
      const hasSession = await this.userService.register(username.trim(), email, password, role);
      this.toast.show('auth.register.confirmEmailToast');
      await this.router.navigateByUrl(hasSession ? '/dashboard' : '/login');
    } catch {
      this.submitError.set(true);
    } finally {
      this.submitting.set(false);
    }
  }
}
