import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { isAuthApiError, isAuthWeakPasswordError } from '@supabase/supabase-js';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../../../shared/components/lang-toggle/lang-toggle.component';
import { SoftAuroraComponent } from '../../../shared/components/soft-aurora/soft-aurora.component';
import { PointerGlowDirective } from '../../../shared/directives/pointer-glow.directive';
import { UserService } from '../../../core/services/user.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { passwordStrengthValidator } from '../../../core/validators/password-strength.validator';

type ResetPasswordError = 'same-password' | 'pwned-password' | 'weak-password' | 'generic';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
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
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly router = inject(Router);

  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<ResetPasswordError | null>(null);
  readonly validRecoveryLink = signal(true);
  readonly passwordValue = signal('');

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator }
  );

  // Checklist reactivo mostrado bajo el campo de contraseña: cada requisito
  // se marca en tiempo real a medida que el usuario escribe.
  readonly hasMinLength = computed(() => this.passwordValue().length >= 8);
  readonly hasUppercase = computed(() => /[A-Z]/.test(this.passwordValue()));
  readonly hasNumber = computed(() => /[0-9]/.test(this.passwordValue()));

  async ngOnInit(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this.validRecoveryLink.set(data.session !== null);
  }

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
    this.submitError.set(null);
    try {
      const { password } = this.form.getRawValue();
      await this.userService.updatePassword(password);
      await this.router.navigateByUrl('/login');
    } catch (error) {
      this.submitError.set(this.toResetPasswordError(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private toResetPasswordError(error: unknown): ResetPasswordError {
    if (isAuthWeakPasswordError(error)) {
      return error.reasons.includes('pwned') ? 'pwned-password' : 'weak-password';
    }
    if (isAuthApiError(error) && error.code === 'same_password') {
      return 'same-password';
    }
    return 'generic';
  }
}
