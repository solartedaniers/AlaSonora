import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../../../shared/components/lang-toggle/lang-toggle.component';
import { LettersOnlyDirective } from '../../../shared/directives/letters-only.directive';
import { PointerGlowDirective } from '../../../shared/directives/pointer-glow.directive';
import { SoftAuroraComponent } from '../../../shared/components/soft-aurora/soft-aurora.component';
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
    ThemeToggleComponent,
    LangToggleComponent,
    LettersOnlyDirective,
    PointerGlowDirective,
    SoftAuroraComponent,
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
