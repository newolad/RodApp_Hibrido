import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { Preferences } from '@capacitor/preferences';

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
  forecastCheckedAt = '';
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

  private readonly alertController = inject(AlertController);

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
          this.invalidateRouteResults();
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
        this.invalidateRouteResults();
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

  onLocationInput(which: 'origin' | 'destination', value: string): void {
    if (which === 'origin') this.originAddress = value;
    else this.destinationAddress = value;
    this.invalidateRouteResults();
    this.status = 'Ubicaciones actualizadas. Calcula la ruta para ver el nuevo recorrido.';
    this.refreshView();
  }

  swapLocations(): void {
    const oldOriginAddress = this.originAddress;
    const oldDestinationAddress = this.destinationAddress;
    const oldOriginPoint = this.origin?.point ?? null;
    const oldDestinationPoint = this.destination?.point ?? null;

    this.invalidateRouteResults();
    this.originAddress = oldDestinationAddress;
    this.destinationAddress = oldOriginAddress;
    if (oldDestinationPoint) this.setEndpoint('origin', oldDestinationPoint, false);
    if (oldOriginPoint) this.setEndpoint('destination', oldOriginPoint, false);

    this.status = 'Origen y destino intercambiados. Calcula la ruta para continuar.';
    this.refreshView();
  }

  private invalidateRouteResults(): void {
    this.clearMapOverlays();
    this.removeEndpointMarker(this.origin);
    this.removeEndpointMarker(this.destination);
    this.origin = null;
    this.destination = null;
    this.route = null;
    this.availableRoutes = [];
    this.selectedRouteIndex = -1;
    this.routeMode = '';
    this.routeSummary = '';
    this.weatherResults = [];
    this.forecastCheckedAt = '';
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

    this.invalidateRouteResults();
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
    this.forecastCheckedAt = '';
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
    this.forecastCheckedAt = '';
    this.clearRainMarkers();
    this.refreshView();
    try {
      const points = this.samplePath(this.route.path, 5).map((p: any) => ({
        lat: typeof p.lat === 'function' ? p.lat() : p.lat,
        lng: typeof p.lng === 'function' ? p.lng() : p.lng,
      }));
      this.weatherResults = await this.forecastRoute(points);
      this.forecastCheckedAt = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
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
        : 'No se pudo consultar el pronóstico. Revisa la conexión e intenta de nuevo.';
    } finally {
      this.analyzingRain = false;
      this.refreshView();
    }
  }

  private async forecastRoute(points: Point[]): Promise<RainSegment[]> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', points.map((point) => String(point.lat)).join(','));
    url.searchParams.set('longitude', points.map((point) => String(point.lng)).join(','));
    url.searchParams.set('hourly', 'precipitation_probability,precipitation,rain,showers,weather_code');
    url.searchParams.set('forecast_hours', '3');
    url.searchParams.set('timezone', 'America/Bogota');

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}.`);
    const payload = await response.json();
    const locations: any[] = Array.isArray(payload) ? payload : [payload];
    if (locations.length !== points.length) {
      throw new Error('El pronóstico no devolvió datos para todos los tramos.');
    }

    return locations.map((location, index) => {
      const hourly = location.hourly ?? {};
      const probabilities: number[] = hourly.precipitation_probability ?? [];
      const precipitation: number[] = hourly.precipitation ?? [];
      const rain: number[] = hourly.rain ?? [];
      const showers: number[] = hourly.showers ?? [];
      const weatherCodes: number[] = hourly.weather_code ?? [];
      const probability = Math.max(0, ...probabilities.map((value) => Number(value ?? 0)));
      const millimeters = precipitation.reduce((sum, value) => sum + Number(value ?? 0), 0);
      const raining = rain.some((value) => Number(value) > 0)
        || showers.some((value) => Number(value) > 0)
        || weatherCodes.some((code) => (code >= 51 && code <= 67) || (code >= 80 && code <= 99));
      return { number: index + 1, probability, millimeters, raining, point: points[index] };
    });
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
    this.reportMode = false;
    const dialog = await this.alertController.create({
      header: 'Reportar un punto',
      message: 'Selecciona lo que ocurre en este lugar.',
      inputs: [
        { type: 'radio', label: 'Lluvia fuerte', value: 'Lluvia fuerte', checked: true },
        { type: 'radio', label: 'Inundación', value: 'Inundación' },
        { type: 'radio', label: 'Vía bloqueada', value: 'Vía bloqueada' },
        { type: 'radio', label: 'Peligro', value: 'Peligro' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Guardar', role: 'confirm' },
      ],
    });
    await dialog.present();
    const { data, role } = await dialog.onDidDismiss();
    const kind = role === 'confirm' ? (data?.values ?? 'Lluvia fuerte') : '';
    if (!kind) {
      this.status = 'Reporte cancelado.';
      this.refreshView();
      return;
    }

    const report: LocalReport = {
      kind: String(kind).trim().slice(0, 60),
      point,
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      expiresAt: Date.now() + REPORT_TTL_MS,
    };
    this.reports = [...await this.readReports(), report];
    await this.saveReports();
    this.status = 'Reporte guardado en este dispositivo; vence en 3 horas.';
    this.renderReportMarkers();
    this.refreshView();
  }

  async removeReport(index: number): Promise<void> {
    this.reports = this.reports.filter((_, currentIndex) => currentIndex !== index);
    await this.saveReports();
    this.renderReportMarkers();
    this.refreshView();
  }

  private async refreshReports(): Promise<void> {
    this.reports = await this.readReports();
    await this.saveReports();
    this.renderReportMarkers();
    this.refreshView();
  }

  private async readReports(): Promise<LocalReport[]> {
    try {
      const { value } = await Preferences.get({ key: REPORT_STORAGE_KEY });
      const reports = JSON.parse(value ?? '[]') as LocalReport[];
      return reports.filter((report) => report.expiresAt > Date.now());
    } catch {
      return [];
    }
  }

  private async saveReports(): Promise<void> {
    try {
      await Preferences.set({ key: REPORT_STORAGE_KEY, value: JSON.stringify(this.reports) });
    } catch (error) {
      console.warn('No se pudieron guardar los reportes locales.', error);
    }
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
    this.invalidateRouteResults();
    this.originAddress = '';
    this.destinationAddress = '';
    this.pickMode = null;
    this.reportMode = false;
    this.status = 'Recorrido limpio. Escribe un origen y un destino para empezar.';
    this.refreshView();
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
