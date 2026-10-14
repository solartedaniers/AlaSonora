import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { NavHeaderComponent } from '../../../shared/components/nav-header/nav-header.component';
import { SiteFooterComponent } from '../../../shared/components/site-footer/site-footer.component';
import { LettersOnlyDirective } from '../../../shared/directives/letters-only.directive';
import { AuthPanelComponent } from '../auth-panel/auth-panel.component';
import { UserService } from '../../../core/services/user.service';
import { nameValidator } from '../../../core/validators/name.validator';
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
    LettersOnlyDirective,
    AuthPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal(false);
  readonly passwordValue = signal('');

  readonly strengthBars = [0, 1, 2, 3];

  readonly roles: ObserverRole[] = ['ornithologist', 'ranger', 'biologist', 'hobbyist', 'student'];

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, nameValidator]],
    role: ['hobbyist' as ObserverRole, Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    consentScience: [true],
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.submitError.set(false);
    try {
      const { fullName, email, password, role } = this.form.getRawValue();
      await this.userService.register(fullName, email, password, role);
      await this.router.navigateByUrl('/dashboard');
    } catch {
      this.submitError.set(true);
    } finally {
      this.submitting.set(false);
    }
  }
}
