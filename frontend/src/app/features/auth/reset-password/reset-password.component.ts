import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../../../shared/components/lang-toggle/lang-toggle.component';
import { SoftAuroraComponent } from '../../../shared/components/soft-aurora/soft-aurora.component';
import { PointerGlowDirective } from '../../../shared/directives/pointer-glow.directive';
import { UserService } from '../../../core/services/user.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';

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
  readonly submitError = signal(false);
  readonly validRecoveryLink = signal(true);

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator }
  );

  async ngOnInit(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this.validRecoveryLink.set(data.session !== null);
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
      const { password } = this.form.getRawValue();
      await this.userService.updatePassword(password);
      await this.router.navigateByUrl('/login');
    } catch {
      this.submitError.set(true);
    } finally {
      this.submitting.set(false);
    }
  }
}
