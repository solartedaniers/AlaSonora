import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { UserService } from '../../core/services/user.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { I18nService, AppLang } from '../../core/services/i18n.service';
import { OfflineStorageService } from '../../core/services/offline-storage.service';
import { UserStats } from '../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NavHeaderComponent, TranslatePipe],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  readonly user = inject(UserService);
  readonly theme = inject(ThemeService);
  readonly i18n = inject(I18nService);
  readonly offline = inject(OfflineStorageService);
  private readonly router = inject(Router);

  readonly stats = signal<UserStats | null>(null);
  readonly gainDb = signal(18);

  readonly themeOptions: { mode: ThemeMode; icon: string; labelKey: string }[] = [
    { mode: 'light', icon: 'light_mode', labelKey: 'theme.light' },
    { mode: 'dark', icon: 'dark_mode', labelKey: 'theme.dark' },
    { mode: 'system', icon: 'brightness_auto', labelKey: 'theme.system' },
  ];

  readonly langOptions: AppLang[] = ['es', 'en'];

  async ngOnInit(): Promise<void> {
    this.stats.set(await this.user.getStats());
  }

  logout(): void {
    // Sesión mock: en la fase de backend esto invalidará el token de
    // Supabase Auth. Los registros offline permanecen en IndexedDB.
    this.router.navigateByUrl('/');
  }
}
