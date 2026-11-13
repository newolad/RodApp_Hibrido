import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { AdminService } from '@core/services/admin.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { AdminUsuario } from '@core/models/models';

// Fechas en espanol ("12 nov 2026") sin cambiar el LOCALE_ID global de la app.
registerLocaleData(localeEs, 'es');

type Filtro = 'todos' | 'activos' | 'suspendidos' | 'admins';

/**
 * Panel de administrador: usuarios registrados, sus motos y la opcion de
 * suspender / habilitar cuentas. Solo accesible con `rol = 'admin'`
 * (adminGuard en el cliente + validacion en las RPC de Supabase).
 */
@Component({
  selector: 'app-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
  templateUrl: './admin-users.page.html',
  styleUrl: './admin-users.page.scss',
})
export class AdminUsersPage implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly alertCtrl = inject(AlertController);

  readonly usuarios = signal<AdminUsuario[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly filtro = signal<Filtro>('todos');
  /** Usuarios con la lista de motos desplegada. */
  readonly expandidos = signal<ReadonlySet<string>>(new Set());
  /** Usuario cuya suspension se esta guardando (deshabilita su boton). */
  readonly procesando = signal<string | null>(null);

  readonly miId = computed(() => this.auth.sesion()?.userId ?? null);

  readonly filtros: { id: Filtro; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'activos', label: 'Activos' },
    { id: 'suspendidos', label: 'Suspendidos' },
    { id: 'admins', label: 'Admins' },
  ];

  readonly stats = computed(() => {
    const lista = this.usuarios();
    const suspendidos = lista.filter((u) => u.suspendido).length;
    return {
      total: lista.length,
      activos: lista.length - suspendidos,
      suspendidos,
      motos: lista.reduce((n, u) => n + u.motos.length, 0),
    };
  });

  readonly visibles = computed(() => {
    const q = this.normalizar(this.busqueda());
    const filtro = this.filtro();
    return this.usuarios().filter((u) => {
      if (filtro === 'activos' && u.suspendido) return false;
      if (filtro === 'suspendidos' && !u.suspendido) return false;
      if (filtro === 'admins' && u.rol !== 'admin') return false;
      if (!q) return true;
      const texto = [
        this.nombreCompleto(u),
        u.correo ?? '',
        ...u.motos.map((m) => `${m.marca} ${m.modelo} ${m.placa}`),
      ].join(' ');
      return this.normalizar(texto).includes(q);
    });
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(event?: CustomEvent): Promise<void> {
    if (!event) this.cargando.set(true);
    this.error.set(null);
    try {
      this.usuarios.set(await this.admin.listarUsuarios());
    } catch (e) {
      this.error.set(this.mensajeError(e));
    } finally {
      this.cargando.set(false);
      (event?.target as HTMLIonRefresherElement | undefined)?.complete();
    }
  }

  onBuscar(valor: string): void {
    this.busqueda.set(valor);
  }

  toggleMotos(id: string): void {
    this.expandidos.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  async suspender(u: AdminUsuario): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: `Suspender a ${this.nombreCompleto(u)}`,
      message: 'No podra iniciar sesion ni ver sus datos hasta que lo habilites de nuevo.',
      inputs: [
        {
          name: 'motivo',
          type: 'textarea',
          placeholder: 'Motivo (opcional, el usuario lo vera al intentar entrar)',
          attributes: { maxlength: 200 },
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Suspender', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    const motivo = String(data?.values?.motivo ?? '').trim();
    await this.aplicarCambio(u, true, motivo);
  }

  async habilitar(u: AdminUsuario): Promise<void> {
    const ok = await this.notify.confirm(
      'Habilitar cuenta',
      `${this.nombreCompleto(u)} podra volver a iniciar sesion y usar RodApp.`,
      'Habilitar',
    );
    if (ok) await this.aplicarCambio(u, false);
  }

  nombreCompleto(u: AdminUsuario): string {
    return [u.name, u.lastname].filter(Boolean).join(' ').trim() || 'Sin nombre';
  }

  iniciales(u: AdminUsuario): string {
    return (
      this.nombreCompleto(u)
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || 'RA'
    );
  }

  private async aplicarCambio(u: AdminUsuario, suspender: boolean, motivo?: string): Promise<void> {
    this.procesando.set(u.id);
    try {
      await this.admin.cambiarSuspension(u.id, suspender, motivo);
      this.usuarios.update((lista) =>
        lista.map((x) =>
          x.id === u.id
            ? {
                ...x,
                suspendido: suspender,
                suspendido_en: suspender ? new Date().toISOString() : null,
                suspendido_motivo: suspender ? motivo || null : null,
              }
            : x,
        ),
      );
      await this.notify.success(
        suspender
          ? `${this.nombreCompleto(u)} fue suspendido.`
          : `${this.nombreCompleto(u)} fue habilitado.`,
      );
    } catch (e) {
      await this.notify.error(this.mensajeError(e));
    } finally {
      this.procesando.set(null);
    }
  }

  private mensajeError(e: unknown): string {
    const err = e as { message?: string; code?: string };
    const msg = err?.message ?? '';
    // Mensajes propios de las RPC (ya vienen en espanol).
    if (['42501', '22023', 'P0002'].includes(err?.code ?? '')) return msg;
    if (err?.code === 'PGRST202' || msg.includes('Could not find the function')) {
      return 'Falta aplicar la migracion del panel de administrador en Supabase (npm run db:push).';
    }
    if (msg.toLowerCase().includes('failed to fetch')) {
      return 'Sin conexion con el servidor. Verifica tu internet.';
    }
    return 'No se pudo completar la operacion. Intenta de nuevo.';
  }

  private normalizar(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  }
}
