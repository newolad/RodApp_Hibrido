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
import * as maplibregl from 'maplibre-gl';

// MapLibre 6 busca su Web Worker junto a su propio .mjs (`import.meta.url`),
// pero al empaquetar con Angular ese archivo no existe en la raiz del sitio
// (404) y sin worker no se dibuja ninguna capa GeoJSON: ni la ruta ni los
// tramos de lluvia. `angular.json` lo copia a `assets/maplibre/` y aqui se
// le indica la URL absoluta (funciona igual en web y dentro de Capacitor).
maplibregl.setWorkerUrl(new URL('assets/maplibre/maplibre-gl-worker.mjs', document.baseURI).href);

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

/** Puntos de la ruta donde se consulta el pronóstico (Open-Meteo acepta varios en una llamada). */
const RAIN_SAMPLE_COUNT = 8;
/** A partir de esta probabilidad (%) el tramo se marca como "con lluvia" en el mapa. */
const RAIN_THRESHOLD = 20;
const RAIN_ROUTE_SOURCE = 'rain-route-source';
const RAIN_ROUTE_LAYER = 'rain-route-layer';
const RAIN_ROUTE_CASING_LAYER = 'rain-route-casing-layer';
const RAIN_ZONE_SOURCE = 'rain-zone-source';
const RAIN_ZONE_LAYER = 'rain-zone-layer';

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
  /** Tramos con lluvia (≥ umbral) en el último análisis; alimenta la leyenda del mapa. */
  rainyCount = 0;
  forecastCheckedAt = '';
  reports: LocalReport[] = [];
  loadingMap = true;
  calculatingRoute = false;
  analyzingRain = false;

  private map: maplibregl.Map | null = null;
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
      // Estilo directo estándar de OpenStreetMap (100% confiable y sin bloqueos)
      const osmStyle: maplibregl.StyleSpecification = {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      };

      this.map = new maplibregl.Map({
        container: this.mapCanvas.nativeElement,
        style: osmStyle,
        center: [BOGOTA.lng, BOGOTA.lat],
        zoom: 13,
        attributionControl: false,
      });

      this.map.addControl(
        new maplibregl.AttributionControl({
          compact: false,
          customAttribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        }),
        'bottom-right'
      );

      this.map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

      this.map.on('click', (event) => {
        const point: Point = { lat: event.lngLat.lat, lng: event.lngLat.lng };
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

      this.map.on('load', async () => {
        this.loadingMap = false;
        await this.refreshReports();
        this.status = 'Mapa listo (OpenStreetMap). Escribe las ubicaciones o selecciónalas sobre el mapa.';
        this.refreshView();
      });

      // Si las teselas tardan, no bloqueamos la interfaz
      setTimeout(() => {
        if (this.loadingMap) {
          this.loadingMap = false;
          this.refreshView();
        }
      }, 1500);
    } catch (error) {
      this.loadingMap = false;
      this.status = error instanceof Error ? error.message : 'No se pudo iniciar el mapa.';
    }
    this.refreshView();
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
        this.map?.flyTo({ center: [point.lng, point.lat], zoom: 15 });
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
    const el = document.createElement('div');
    el.className = isOrigin ? 'rod-map-marker marker-origin' : 'rod-map-marker marker-destination';
    el.innerText = isOrigin ? 'A' : 'B';

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([point.lng, point.lat])
      .addTo(this.map!);

    const endpoint = { point, marker };
    if (isOrigin) this.origin = endpoint;
    else this.destination = endpoint;
    if (updateInput) {
      const coords = `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
      if (isOrigin) this.originAddress = coords;
      else this.destinationAddress = coords;
    }
  }

  private async resolvePoint(input: string | Point): Promise<Point> {
    if (typeof input !== 'string') return input;
    const trimmed = input.trim();
    // Verifica si ya son coordenadas "lat, lng"
    const match = trimmed.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[3]) };
    }

    // Geocodificación con Nominatim (OpenStreetMap) restringida a Colombia
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', trimmed);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'co');

    const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    if (!res.ok) throw new Error('Error al consultar el servicio de direcciones.');
    const results = await res.json();
    if (!results || results.length === 0) {
      throw new Error(`No se encontró la dirección: "${trimmed}". Intenta con otra referencia.`);
    }
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  }

  async calculateRoute(): Promise<void> {
    const rawOrigin = this.originAddress.trim() || this.origin?.point;
    const rawDestination = this.destinationAddress.trim() || this.destination?.point;
    if (!rawOrigin || !rawDestination) {
      this.status = 'Escribe el origen y el destino, o selecciónalos con los botones del mapa.';
      return;
    }

    this.invalidateRouteResults();
    this.calculatingRoute = true;
    this.status = 'Buscando ubicaciones y calculando ruta con OpenStreetMap…';
    this.refreshView();

    try {
      const originPoint = await this.resolvePoint(rawOrigin);
      const destPoint = await this.resolvePoint(rawDestination);

      this.setEndpoint('origin', originPoint, false);
      this.setEndpoint('destination', destPoint, false);

      // Consulta al motor de enrutamiento OSRM (OpenStreetMap)
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originPoint.lng},${originPoint.lat};${destPoint.lng},${destPoint.lat}?overview=full&geometries=geojson&alternatives=true`;
      const response = await fetch(osrmUrl);
      if (!response.ok) throw new Error('El servicio de rutas no respondió.');
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No se encontró una ruta vial entre los puntos.');
      }

      this.clearMapOverlays();
      this.availableRoutes = data.routes.map((r: any, idx: number) => ({
        distanceMeters: r.distance,
        durationMillis: r.duration * 1000,
        path: r.geometry.coordinates.map((coords: [number, number]) => ({ lng: coords[0], lat: coords[1] })),
        routeLabels: idx === 0 ? ['DEFAULT_ROUTE'] : [],
      }));

      this.selectedRouteIndex = 0;
      this.routeMode = 'Ruta vial estándar (OpenStreetMap)';
      this.selectRoute(this.selectedRouteIndex, false);
      this.weatherResults = [];
      this.status = this.availableRoutes.length > 1
        ? `Se encontraron ${this.availableRoutes.length} rutas. Selecciona una para ver el recorrido y analizar la lluvia.`
        : 'Ruta lista. Puedes analizar la lluvia sobre el recorrido.';
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

    // Dibuja las líneas de ruta en MapLibre mediante GeoJSON
    if (this.map) {
      this.availableRoutes.forEach((r, idx) => {
        const isSelected = idx === index;
        const sourceId = `route-source-${idx}`;
        const layerId = `route-layer-${idx}`;

        const geojson: any = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: r.path.map((p: any) => [p.lng, p.lat]),
              },
            },
          ],
        };

        if (this.map!.getSource(sourceId)) {
          (this.map!.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
        } else {
          this.map!.addSource(sourceId, { type: 'geojson', data: geojson });
          this.map!.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': isSelected ? '#11b4d4' : '#8a99a8',
              'line-width': isSelected ? 7 : 4,
              'line-opacity': isSelected ? 1 : 0.45,
            },
          });
        }
      });
    }

    const path: any[] = selected.path ?? [];
    if (!path.length) {
      this.status = 'La ruta no devolvió puntos para dibujarla.';
      this.refreshView();
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    path.forEach((p: any) => bounds.extend([p.lng, p.lat]));
    this.map?.fitBounds(bounds, { padding: { top: 50, right: 35, bottom: 40, left: 35 } });

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
      const path: Point[] = this.route.path;
      const indices = this.sampleIndices(path.length, RAIN_SAMPLE_COUNT);
      const points = indices.map((i) => ({ lat: path[i].lat, lng: path[i].lng }));
      this.weatherResults = await this.forecastRoute(points);
      this.forecastCheckedAt = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

      // 1. Pinta sobre la misma ruta los tramos donde se espera lluvia.
      this.drawRainOverlay(path, indices, this.weatherResults);
      // 2. Marcadores con el % de lluvia en cada punto consultado.
      this.weatherResults.forEach((segment) => this.addRainMarker(segment));

      const rainy = this.weatherResults.filter((s) => s.probability >= RAIN_THRESHOLD || s.raining).length;
      this.rainyCount = rainy;
      this.status = rainy
        ? `Análisis listo: ${rainy} de ${this.weatherResults.length} tramos con posible lluvia (resaltados en el mapa) en las próximas 3 horas.`
        : 'Análisis listo: no se espera lluvia relevante en la ruta durante las próximas 3 horas.';
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

  /** Índices equidistantes dentro de la ruta donde se consulta el pronóstico. */
  private sampleIndices(length: number, count: number): number[] {
    if (length <= count) return Array.from({ length }, (_, i) => i);
    return Array.from({ length: count }, (_, index) =>
      Math.round(index * (length - 1) / (count - 1)),
    );
  }

  /**
   * Dibuja la lluvia directamente sobre el mapa:
   *  - Cada tramo de la ruta (la porción más cercana a cada punto consultado)
   *    se repinta con el color de riesgo si la probabilidad supera el umbral.
   *  - Un halo translúcido alrededor de cada punto con lluvia marca la "zona".
   */
  private drawRainOverlay(path: Point[], indices: number[], segments: RainSegment[]): void {
    if (!this.map) return;
    this.removeRainLayers();

    // Límites de cada tramo: punto medio entre muestras consecutivas.
    const bounds = [0];
    for (let k = 1; k < indices.length; k++) {
      bounds.push(Math.round((indices[k - 1] + indices[k]) / 2));
    }
    bounds.push(path.length - 1);

    const lineFeatures = segments
      .map((segment, k) => {
        const slice = path.slice(bounds[k], bounds[k + 1] + 1);
        return {
          type: 'Feature',
          properties: {
            probability: segment.probability,
            color: this.riskColor(segment.probability),
            wet: segment.probability >= RAIN_THRESHOLD || segment.raining,
          },
          geometry: { type: 'LineString', coordinates: slice.map((p) => [p.lng, p.lat]) },
        };
      })
      .filter((f) => f.properties.wet && f.geometry.coordinates.length >= 2);

    const zoneFeatures = segments
      .filter((s) => s.probability >= RAIN_THRESHOLD || s.raining)
      .map((s) => ({
        type: 'Feature',
        properties: { probability: s.probability, color: this.riskColor(s.probability) },
        geometry: { type: 'Point', coordinates: [s.point.lng, s.point.lat] },
      }));

    // Halo de zona de lluvia: debajo de las líneas de ruta.
    const beforeRoute = this.map.getLayer('route-layer-0') ? 'route-layer-0' : undefined;
    this.map.addSource(RAIN_ZONE_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: zoneFeatures } as any,
    });
    this.map.addLayer(
      {
        id: RAIN_ZONE_LAYER,
        type: 'circle',
        source: RAIN_ZONE_SOURCE,
        paint: {
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.22,
          'circle-blur': 0.5,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-width': 1,
          'circle-stroke-opacity': 0.5,
          // Crece con el zoom y con la probabilidad de lluvia.
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            9, ['interpolate', ['linear'], ['get', 'probability'], 0, 10, 100, 22],
            13, ['interpolate', ['linear'], ['get', 'probability'], 0, 30, 100, 60],
            16, ['interpolate', ['linear'], ['get', 'probability'], 0, 70, 100, 130],
          ],
        },
      },
      beforeRoute,
    );

    // Tramos mojados de la ruta: encima de la línea cian, con borde blanco.
    this.map.addSource(RAIN_ROUTE_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: lineFeatures } as any,
    });
    this.map.addLayer({
      id: RAIN_ROUTE_CASING_LAYER,
      type: 'line',
      source: RAIN_ROUTE_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 12, 'line-opacity': 0.9 },
    });
    this.map.addLayer({
      id: RAIN_ROUTE_LAYER,
      type: 'line',
      source: RAIN_ROUTE_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 8 },
    });
  }

  private addRainMarker(segment: RainSegment): void {
    if (!this.map) return;
    const wet = segment.probability >= RAIN_THRESHOLD || segment.raining;
    const el = document.createElement('div');
    el.className = wet ? 'rod-rain-pill' : 'rod-rain-pill dry';
    if (segment.probability >= 70) el.classList.add('high');
    el.style.backgroundColor = this.riskColor(segment.probability);
    el.textContent = wet ? `🌧 ${segment.probability}%` : `${segment.probability}%`;
    el.title = `Tramo ${segment.number}: ${segment.probability}% de lluvia`;

    const popup = new maplibregl.Popup({ offset: 14 }).setHTML(
      `<strong>Tramo ${segment.number}${segment.raining ? ' · lluvia prevista' : ''}</strong><br>` +
      `Probabilidad de lluvia: ${segment.probability}%<br>` +
      `Precipitación: ${segment.millimeters.toFixed(1)} mm (próx. 3 h)`,
    );

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([segment.point.lng, segment.point.lat])
      .setPopup(popup)
      .addTo(this.map);
    this.rainMarkers.push(marker);
  }

  private removeRainLayers(): void {
    if (!this.map) return;
    [RAIN_ROUTE_LAYER, RAIN_ROUTE_CASING_LAYER, RAIN_ZONE_LAYER].forEach((id) => {
      if (this.map!.getLayer(id)) this.map!.removeLayer(id);
    });
    [RAIN_ROUTE_SOURCE, RAIN_ZONE_SOURCE].forEach((id) => {
      if (this.map!.getSource(id)) this.map!.removeSource(id);
    });
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
    this.reportMarkers.forEach((marker) => marker.remove?.());
    this.reportMarkers = [];
    if (!this.map) return;
    this.reports.forEach((report) => {
      const el = document.createElement('div');
      el.className = 'rod-map-marker marker-report';
      el.innerText = '⚠';

      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<strong>${this.escapeHtml(report.kind)}</strong><br>Reporte local de prueba`
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([report.point.lng, report.point.lat])
        .setPopup(popup)
        .addTo(this.map!);

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
    if (this.map) {
      for (let i = 0; i < 5; i++) {
        const layerId = `route-layer-${i}`;
        const sourceId = `route-source-${i}`;
        if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
        if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
      }
    }
    this.routePolylines = [];
    this.clearRainMarkers();
  }

  private clearRainMarkers(): void {
    this.rainMarkers.forEach((marker) => marker.remove?.());
    this.rainMarkers = [];
    this.removeRainLayers();
    this.rainyCount = 0;
  }

  private removeEndpointMarker(endpoint: Endpoint | null): void {
    endpoint?.marker?.remove?.();
  }

  private refreshView(): void {
    if (!this.destroyed) this.cdr.markForCheck();
  }
}
