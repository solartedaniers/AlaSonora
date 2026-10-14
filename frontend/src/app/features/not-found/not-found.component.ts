import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer.component';
import { FrequencyAxisComponent } from '../../shared/components/frequency-axis/frequency-axis.component';

// La placa vacía usa la misma banda que Grabar y Resultado.
const PLATE_MAX_KHZ = 12;

/** Ruta inexistente: una placa de espectrograma en silencio, con salidas al inicio y al mapa. */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, TranslatePipe, NavHeaderComponent, SiteFooterComponent, FrequencyAxisComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
})
export class NotFoundComponent {
  readonly plateMaxKhz = PLATE_MAX_KHZ;
}
