import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../../../shared/components/lang-toggle/lang-toggle.component';
import { SoftAuroraComponent } from '../../../shared/components/soft-aurora/soft-aurora.component';
import { PointerGlowDirective } from '../../../shared/directives/pointer-glow.directive';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-forgot-password',
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
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);

  readonly submitting = signal(false);
  readonly submitError = signal(false);
  readonly submitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.submitError.set(false);
    try {
      const { email } = this.form.getRawValue();
      await this.userService.sendPasswordResetEmail(email);
      this.submitted.set(true);
    } catch {
      this.submitError.set(true);
    } finally {
      this.submitting.set(false);
    }
  }
}
