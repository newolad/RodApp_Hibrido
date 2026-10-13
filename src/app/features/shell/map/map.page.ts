import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

declare global {
  interface Window {
    google?: any;
  }
}

type Point = { lat: number; lng: number };
type Endpoint = { point: Point; marker: any };
type RainSegment = {
  number: number;
  probability: number;
  millimeters: number;
  raining: boolean;
  point: Point;
};
type LocalReport = {
  kind: string;
  point: Point;
  time: string;
  expiresAt: number;
};

const BOGOTA: Point = { lat: 4.6486, lng: -74.0636 };
const REPORT_STORAGE_KEY = 'rodapp-map-reports';
const REPORT_TTL_MS = 3 * 60 * 60 * 1000;

@Component({
  selector: 'app-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent],
  templateUrl: './map.page.html',
  styleUrl: './map.page.scss',
})
export class MapPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapCanvas', { static: true }) mapCanvas!: ElementRef<HTMLDivElement>;

  originAddress = '';
  destinationAddress = '';
  status = 'Escribe origen y destino, o selecciónalos en el mapa.';
  routeSummary = '';
  availableRoutes: any[] = [];
  selectedRouteIndex = -1;
  routeMode = '';
  weatherResults: RainSegment[] = [];
  reports: LocalReport[] = [];
  loadingMap = true;
  calculatingRoute = false;
  analyzingRain = false;

  private apiKey = '';
  private map: any;
  private origin: Endpoint | null = null;
  private destination: Endpoint | null = null;
  route: any = null;
  private routePolylines: any[] = [];
  private rainMarkers: any[] = [];
  private reportMarkers: any[] = [];
  private pickMode: 'origin' | 'destination' | null = null;
  private reportMode = false;
  private mapClickListener: any;
  private destroyed = false;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  async ngAfterViewInit(): Promise<void> {
    await this.initializeMap();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.mapClickListener?.remove?.();
    this.clearMapOverlays();
    this.removeEndpointMarker(this.origin);
    this.removeEndpointMarker(this.destination);
  }

  private async initializeMap(): Promise<void> {
    try {
      const configUrl = new URL('assets/maps-config.local.json', document.baseURI);
      const response = await fetch(configUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Falta el archivo local assets/maps-config.local.json.');
      }
      const config = (await response.json()) as { apiKey?: string };
      this.apiKey = config.apiKey?.trim() ?? '';
      if (!this.apiKey) {
        throw new Error('Agrega tu clave de demostración al archivo local de configuración.');
      }

      await this.loadGoogleMapsScript();
      const { Map } = await window.google!.maps.importLibrary('maps');
      this.map = new Map(this.mapCanvas.nativeElement, {
        center: BOGOTA,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false,
      });
      this.mapClickListener = this.map.addListener('click', (event: any) => {
        const point = event.latLng?.toJSON?.();
        if (!point) return;
        if (this.reportMode) {
          this.addReport(point);
        } else if (this.pickMode) {
          this.setEndpoint(this.pickMode, point);
          this.pickMode = null;
          this.status = 'Punto fijado. Completa el otro extremo o calcula la ruta.';
          this.refreshView();
        }
      });
      this.loadingMap = false;
      await this.refreshReports();
      this.status = 'Mapa listo. Escribe las ubicaciones o selecciónalas sobre el mapa.';
    } catch (error) {
      this.loadingMap = false;
      this.status = error instanceof Error ? error.message : 'No se pudo iniciar el mapa.';
    }
    this.refreshView();
  }

  private async loadGoogleMapsScript(): Promise<void> {
    if (window.google?.maps?.importLibrary) return;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.dataset['rodappMaps'] = 'true';
      script.src =
        'https://maps.googleapis.com/maps/api/js?key=' +
        encodeURIComponent(this.apiKey) +
        '&v=weekly&language=es&region=CO';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Maps no cargó. Revisa internet y la clave demo.'));
      document.head.appendChild(script);
    });
  }

  chooseOnMap(which: 'origin' | 'destination'): void {
    this.pickMode = which;
    this.reportMode = false;
    this.status = `Haz clic en el mapa para fijar el ${which === 'origin' ? 'origen' : 'destino'}.`;
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.status = 'Este navegador no permite obtener la ubicación.';
      return;
    }
    this.status = 'Solicitando permiso de ubicación…';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        this.setEndpoint('origin', point);
        this.map?.panTo(point);
        this.map?.setZoom(15);
        this.status = 'Ubicación actual asignada como origen.';
        this.refreshView();
      },
      (error) => {
        this.status = error.code === 1
          ? 'No se concedió permiso. Puedes escribir el origen o elegirlo en el mapa.'
          : 'No se pudo obtener la ubicación; puedes escribir el origen.';
        this.refreshView();
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  private setEndpoint(which: 'origin' | 'destination', point: Point, updateInput = true): void {
    const oldEndpoint = which === 'origin' ? this.origin : this.destination;
    this.removeEndpointMarker(oldEndpoint);
    const isOrigin = which === 'origin';
    const marker = new window.google!.maps.Marker({
      position: point,
      map: this.map,
      title: isOrigin ? 'Origen' : 'Destino',
      label: { text: isOrigin ? 'A' : 'B', color: '#fff' },
      icon: {
        path: window.google!.maps.SymbolPath.CIRCLE,
        scale: 13,
        fillColor: isOrigin ? '#16865f' : '#c45537',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
      },
    });
    const endpoint = { point, marker };
    if (isOrigin) this.origin = endpoint;
    else this.destination = endpoint;
    if (updateInput) {
      const coords = `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
      if (isOrigin) this.originAddress = coords;
      else this.destinationAddress = coords;
    }
  }

  async calculateRoute(): Promise<void> {
    const origin = this.originAddress.trim() || this.origin?.point;
    const destination = this.destinationAddress.trim() || this.destination?.point;
    if (!origin || !destination) {
      this.status = 'Escribe el origen y el destino, o selecciónalos con los botones del mapa.';
      return;
    }

    this.calculatingRoute = true;
    this.status = 'Calculando una ruta para motocicleta…';
    this.refreshView();
    try {
      const { Route } = await window.google!.maps.importLibrary('routes');
      const variants = [
        {
          travelMode: 'TWO_WHEELER',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: true,
          fields: ['path', 'distanceMeters', 'durationMillis', 'routeLabels'],
          label: 'motocicleta con tráfico',
        },
        {
          travelMode: 'TWO_WHEELER',
          computeAlternativeRoutes: true,
          fields: ['path', 'distanceMeters', 'durationMillis', 'routeLabels'],
          label: 'motocicleta',
        },
        {
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: true,
          fields: ['path', 'distanceMeters', 'durationMillis', 'routeLabels'],
          label: 'conducción con tráfico',
        },
        {
          travelMode: 'DRIVE',
          computeAlternativeRoutes: true,
          fields: ['path', 'distanceMeters', 'durationMillis', 'routeLabels'],
          label: 'conducción',
        },
      ];

      let result: any;
      let routeMode = '';
      for (const variant of variants) {
        try {
          const { label, ...request } = variant;
          result = await Route.computeRoutes({ origin, destination, region: 'co', ...request });
          if (result.routes?.length) {
            routeMode = label;
            break;
          }
        } catch (error) {
          console.info(`No está disponible la opción ${variant.label}; probando alternativa.`, error);
        }
      }
      if (!result?.routes?.length) {
        throw new Error('Google no encontró ruta. Revisa la clave demo y las funciones habilitadas.');
      }

      this.clearMapOverlays();
      this.availableRoutes = result.routes;
      const recommendedIndex = this.availableRoutes.findIndex((candidate: any) =>
        candidate.routeLabels?.includes('DEFAULT_ROUTE'),
      );
      this.selectedRouteIndex = recommendedIndex >= 0 ? recommendedIndex : 0;
      this.routeMode = routeMode;
      this.selectRoute(this.selectedRouteIndex, false);
      this.weatherResults = [];
      this.status = this.availableRoutes.length > 1
        ? `Google encontró ${this.availableRoutes.length} rutas. Selecciona una para ver el recorrido y analizar la lluvia.`
        : 'Ruta lista. Google no encontró alternativas para este trayecto; puedes analizar la lluvia.';
    } catch (error) {
      this.status = error instanceof Error ? error.message : 'No se pudo calcular la ruta.';
    } finally {
      this.calculatingRoute = false;
      this.refreshView();
    }
  }

  selectRoute(index: number, notify = true): void {
    const selected = this.availableRoutes[index];
    if (!selected) return;
    this.selectedRouteIndex = index;
    this.route = selected;
    this.clearMapOverlays();

    // Dibuja primero las alternativas y la seleccionada encima, como en una app de navegación.
    const order = this.availableRoutes.map((_: any, routeIndex: number) => routeIndex)
      .filter((routeIndex: number) => routeIndex !== index)
      .concat(index);
    order.forEach((routeIndex: number) => {
      const isSelected = routeIndex === index;
      const lines = this.availableRoutes[routeIndex].createPolylines({
        polylineOptions: {
          map: this.map,
          strokeColor: isSelected ? '#11b4d4' : '#7994a7',
          strokeOpacity: isSelected ? 1 : 0.48,
          strokeWeight: isSelected ? 7 : 4,
          zIndex: isSelected ? 10 : 1,
        },
      });
      this.routePolylines.push(...lines);
    });

    const path: any[] = selected.path ?? [];
    if (!path.length) {
      this.status = 'La ruta seleccionada no devolvió puntos para dibujarla.';
      this.refreshView();
      return;
    }
    const toPoint = (point: any): Point => ({
      lat: typeof point.lat === 'function' ? point.lat() : point.lat,
      lng: typeof point.lng === 'function' ? point.lng() : point.lng,
    });
    this.setEndpoint('origin', toPoint(path[0]), false);
    this.setEndpoint('destination', toPoint(path[path.length - 1]), false);
    const bounds = new window.google!.maps.LatLngBounds();
    path.forEach((point: any) => bounds.extend(point));
    this.map.fitBounds(bounds, { top: 50, right: 35, bottom: 40, left: 35 });
    this.routeSummary = `${this.formatDistance(selected)} · ${this.formatDuration(selected)} · ${this.routeMode}`;
    this.weatherResults = [];
    if (notify) {
      this.status = `Mostrando ${this.routeName(index).toLowerCase()}. El pronóstico se calculará sobre esta ruta.`;
    }
    this.refreshView();
  }

  formatDistance(route: any): string {
    return `${(Number(route?.distanceMeters ?? 0) / 1000).toFixed(1)} km`;
  }

  formatDuration(route: any): string {
    const minutes = Math.max(1, Math.round(Number(route?.durationMillis ?? 0) / 60000));
    return minutes >= 60
      ? `${Math.floor(minutes / 60)} h ${minutes % 60} min`
      : `${minutes} min`;
  }

  routeName(index: number): string {
    const recommended = this.availableRoutes.findIndex((candidate: any) =>
      candidate.routeLabels?.includes('DEFAULT_ROUTE'),
    );
    const recommendedIndex = recommended >= 0 ? recommended : 0;
    if (index === recommendedIndex) return 'Ruta recomendada';
    const number = this.availableRoutes
      .slice(0, index)
      .filter((_: any, currentIndex: number) => currentIndex !== recommendedIndex).length + 1;
    return `Alternativa ${number}`;
  }

  async analyzeRain(): Promise<void> {
    if (!this.route?.path?.length) {
      this.status = 'Calcula primero una ruta para analizar la lluvia.';
      return;
    }
    this.analyzingRain = true;
    this.status = 'Consultando pronóstico horario en varios puntos de la ruta…';
    this.weatherResults = [];
    this.clearRainMarkers();
    this.refreshView();
    try {
      const points = this.samplePath(this.route.path, 5).map((p: any) => ({
        lat: typeof p.lat === 'function' ? p.lat() : p.lat,
        lng: typeof p.lng === 'function' ? p.lng() : p.lng,
      }));
      this.weatherResults = await Promise.all(
        points.map((point, index) => this.forecastAt(point, index + 1)),
      );
      this.weatherResults.forEach((segment) => {
        const color = this.riskColor(segment.probability);
        this.rainMarkers.push(new window.google!.maps.Marker({
          position: segment.point,
          map: this.map,
          title: `Tramo ${segment.number}: probabilidad de lluvia ${segment.probability}%`,
          icon: {
            path: window.google!.maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: color,
            fillOpacity: 0.95,
            strokeColor: '#fff',
            strokeWeight: 3,
          },
          label: { text: String(segment.number), color: '#fff', fontSize: '10px', fontWeight: '700' },
        }));
      });
      this.status = 'Análisis listo: probabilidad máxima pronosticada durante las próximas 3 horas.';
    } catch (error) {
      this.status = error instanceof Error
        ? `No se pudo consultar el pronóstico: ${error.message}`
        : 'No se pudo consultar el pronóstico. Revisa la clave demo y la conexión.';
    } finally {
      this.analyzingRain = false;
      this.refreshView();
    }
  }

  private async forecastAt(point: Point, number: number): Promise<RainSegment> {
    const url = new URL('https://weather.googleapis.com/v1/forecast/hours:lookup');
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('location.latitude', String(point.lat));
    url.searchParams.set('location.longitude', String(point.lng));
    url.searchParams.set('hours', '3');
    url.searchParams.set('pageSize', '3');
    url.searchParams.set('languageCode', 'es');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Weather API respondió ${response.status}.`);
    const data = await response.json();
    const hours: any[] = data.forecastHours ?? [];
    const probability = Math.max(
      0,
      ...hours.map((hour) => Number(hour.precipitation?.probability?.percent ?? 0)),
    );
    const millimeters = hours.reduce(
      (sum, hour) => sum + Number(hour.precipitation?.qpf?.quantity ?? 0),
      0,
    );
    const raining = hours.some((hour) =>
      /RAIN|SHOWERS|THUNDERSTORM/.test(hour.weatherCondition?.type ?? ''),
    );
    return { number, probability, millimeters, raining, point };
  }

  private samplePath(path: any[], count: number): any[] {
    if (path.length <= count) return path;
    return Array.from({ length: count }, (_, index) =>
      path[Math.round(index * (path.length - 1) / (count - 1))],
    );
  }

  riskColor(probability: number): string {
    if (probability >= 70) return '#c94352';
    if (probability >= 45) return '#e87536';
    if (probability >= 20) return '#d8a51d';
    return '#25a875';
  }

  enableReportMode(): void {
    this.reportMode = !this.reportMode;
    this.pickMode = null;
    this.status = this.reportMode
      ? 'Haz clic en el mapa para reportar lluvia, inundación o un peligro.'
      : 'Modo de reporte desactivado.';
  }

  private async addReport(point: Point): Promise<void> {
    const kind = window.prompt(
      '¿Qué quieres reportar? Escribe: Lluvia fuerte, Inundación, Vía bloqueada o Peligro',
      'Lluvia fuerte',
    );
    this.reportMode = false;
    if (!kind?.trim()) {
      this.status = 'Reporte cancelado.';
      this.refreshView();
      return;
    }
    const report: LocalReport = {
      kind: kind.trim().slice(0, 60),
      point,
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      expiresAt: Date.now() + REPORT_TTL_MS,
    };
    this.reports = [...this.readReports(), report];
    this.saveReports();
    this.status = 'Reporte guardado solo en este navegador; vence en 3 horas.';
    this.renderReportMarkers();
    this.refreshView();
  }

  async removeReport(index: number): Promise<void> {
    this.reports.splice(index, 1);
    this.saveReports();
    this.renderReportMarkers();
    this.refreshView();
  }

  private async refreshReports(): Promise<void> {
    this.reports = this.readReports();
    this.saveReports();
    this.renderReportMarkers();
    this.refreshView();
  }

  private readReports(): LocalReport[] {
    try {
      const reports = JSON.parse(localStorage.getItem(REPORT_STORAGE_KEY) ?? '[]') as LocalReport[];
      return reports.filter((report) => report.expiresAt > Date.now());
    } catch {
      return [];
    }
  }

  private saveReports(): void {
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(this.reports));
  }

  private renderReportMarkers(): void {
    this.reportMarkers.forEach((marker) => marker.setMap(null));
    this.reportMarkers = [];
    if (!this.map || !window.google) return;
    this.reports.forEach((report) => {
      const marker = new window.google!.maps.Marker({
        position: report.point,
        map: this.map,
        title: report.kind,
        icon: {
          path: window.google!.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: '#773db4',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 1,
        },
      });
      marker.addListener('click', () => {
        new window.google!.maps.InfoWindow({
          content: `<strong>${this.escapeHtml(report.kind)}</strong><br>Reporte local de prueba`,
        }).open({ map: this.map, anchor: marker });
      });
      this.reportMarkers.push(marker);
    });
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character] ?? character);
  }

  clearRoute(): void {
    this.clearMapOverlays();
    this.removeEndpointMarker(this.origin);
    this.removeEndpointMarker(this.destination);
    this.origin = null;
    this.destination = null;
    this.route = null;
    this.availableRoutes = [];
    this.selectedRouteIndex = -1;
    this.routeMode = '';
    this.originAddress = '';
    this.destinationAddress = '';
    this.routeSummary = '';
    this.weatherResults = [];
    this.status = 'Recorrido limpio. Escribe un origen y un destino para empezar.';
  }

  private clearMapOverlays(): void {
    this.routePolylines.forEach((polyline) => polyline.setMap(null));
    this.routePolylines = [];
    this.clearRainMarkers();
  }

  private clearRainMarkers(): void {
    this.rainMarkers.forEach((marker) => marker.setMap(null));
    this.rainMarkers = [];
  }

  private removeEndpointMarker(endpoint: Endpoint | null): void {
    endpoint?.marker?.setMap(null);
  }

  private refreshView(): void {
    if (!this.destroyed) this.cdr.markForCheck();
  }
}
