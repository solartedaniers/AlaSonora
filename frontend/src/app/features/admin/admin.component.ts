import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { SoftAuroraComponent } from '../../shared/components/soft-aurora/soft-aurora.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SpeciesNamePipe } from '../../shared/pipes/species-name.pipe';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { LettersOnlyDirective } from '../../shared/directives/letters-only.directive';
import { PointerGlowDirective } from '../../shared/directives/pointer-glow.directive';
import { AdminUsersService } from '../../core/services/admin-users.service';
import { DetectionsService } from '../../core/services/detections.service';
import { nameValidator } from '../../core/validators/name.validator';
import { passwordStrengthValidator } from '../../core/validators/password-strength.validator';
import { Detection, ObserverRole, Profile } from '../../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    DatePipe,
    NavHeaderComponent,
    SoftAuroraComponent,
    TranslatePipe,
    SpeciesNamePipe,
    ConfidenceBadgeComponent,
    ReactiveFormsModule,
    LettersOnlyDirective,
    PointerGlowDirective,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private readonly adminUsers = inject(AdminUsersService);
  private readonly detectionsService = inject(DetectionsService);
  private readonly fb = inject(FormBuilder);

  readonly roles: ObserverRole[] = ['ornithologist', 'ranger', 'biologist', 'hobbyist', 'student'];

  readonly loading = signal(true);
  readonly users = signal<Profile[]>([]);
  readonly searchTerm = signal('');

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.users();
    return this.users().filter((u) => u.displayName.toLowerCase().includes(term));
  });

  readonly createModalOpen = signal(false);
  readonly creating = signal(false);
  readonly createForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, nameValidator]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordStrengthValidator]],
  });

  readonly editingUser = signal<Profile | null>(null);
  readonly saving = signal(false);
  readonly editForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, nameValidator]],
    role: ['hobbyist' as ObserverRole, Validators.required],
    institution: [''],
    orcidId: [''],
    stationName: [''],
  });

  readonly historyUser = signal<Profile | null>(null);
  readonly historyLoading = signal(false);
  readonly userDetections = signal<Detection[]>([]);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  openCreateModal(): void {
    this.createForm.reset({ displayName: '', email: '', password: '' });
    this.createModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.createModalOpen.set(false);
  }

  async submitCreate(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    try {
      const { displayName, email, password } = this.createForm.getRawValue();
      await this.adminUsers.create({ displayName, email, password });
      this.createModalOpen.set(false);
      await this.reload();
    } finally {
      this.creating.set(false);
    }
  }

  openEditModal(user: Profile): void {
    this.editingUser.set(user);
    this.editForm.setValue({
      displayName: user.displayName,
      role: user.role,
      institution: user.institution ?? '',
      orcidId: user.orcidId ?? '',
      stationName: user.stationName ?? '',
    });
  }

  closeEditModal(): void {
    this.editingUser.set(null);
  }

  async submitEdit(): Promise<void> {
    const user = this.editingUser();
    if (!user || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const { displayName, role, institution, orcidId, stationName } = this.editForm.getRawValue();
      await this.adminUsers.update(user.id, {
        displayName,
        role,
        institution: institution || undefined,
        orcidId: orcidId || undefined,
        stationName: stationName || undefined,
      });
      this.editingUser.set(null);
      await this.reload();
    } finally {
      this.saving.set(false);
    }
  }

  async toggleSuspended(user: Profile): Promise<void> {
    if (user.suspended) {
      await this.adminUsers.activate(user.id);
    } else {
      await this.adminUsers.suspend(user.id);
    }
    await this.reload();
  }

  async toggleSystemRole(user: Profile): Promise<void> {
    await this.adminUsers.setSystemRole(user.id, user.systemRole === 'admin' ? 'user' : 'admin');
    await this.reload();
  }

  async openHistory(user: Profile): Promise<void> {
    this.historyUser.set(user);
    this.historyLoading.set(true);
    try {
      this.userDetections.set(await this.detectionsService.getForUser(user.id));
    } finally {
      this.historyLoading.set(false);
    }
  }

  closeHistory(): void {
    this.historyUser.set(null);
    this.userDetections.set([]);
  }

  async deleteDetection(detection: Detection): Promise<void> {
    await this.detectionsService.deleteAsAdmin(detection.id);
    this.userDetections.update((list) => list.filter((d) => d.id !== detection.id));
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      this.users.set(await this.adminUsers.list());
    } finally {
      this.loading.set(false);
    }
  }
}
