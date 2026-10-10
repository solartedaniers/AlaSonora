import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { NavHeaderComponent } from '../../../shared/components/nav-header/nav-header.component';
import { SiteFooterComponent } from '../../../shared/components/site-footer/site-footer.component';
import { FieldBackdropComponent } from '../../../shared/components/field-backdrop/field-backdrop.component';
import { AuthPanelComponent } from '../auth-panel/auth-panel.component';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    NavHeaderComponent,
    SiteFooterComponent,
    FieldBackdropComponent,
    AuthPanelComponent,
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
