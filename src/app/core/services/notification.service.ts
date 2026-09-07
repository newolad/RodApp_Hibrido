import { Injectable, inject } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular/standalone';

/**
 * Envoltorio de los componentes de feedback de Ionic (toast, alert, loading).
 *
 * Centralizarlos aqui evita repetir la misma configuracion (posicion, duracion,
 * color, textos) en cada pagina y mantiene la coherencia visual pedida en el brief.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly loadingCtrl = inject(LoadingController);

  /** Toast breve de exito (verde, abajo). */
  async success(message: string): Promise<void> {
    await this.present(message, 'success', 'checkmark-circle-outline');
  }

  /** Toast de error (rojo, abajo). */
  async error(message: string): Promise<void> {
    await this.present(message, 'danger', 'alert-circle-outline', 3500);
  }

  /** Toast informativo (cian de marca). */
  async info(message: string): Promise<void> {
    await this.present(message, 'primary', 'information-circle-outline');
  }

  /** Crea y muestra un `ion-loading`. Devuelve la referencia para cerrarlo. */
  async showLoading(message = 'Cargando...'): Promise<HTMLIonLoadingElement> {
    const loading = await this.loadingCtrl.create({ message, spinner: 'crescent' });
    await loading.present();
    return loading;
  }

  /** Alerta de confirmacion (Aceptar / Cancelar). Resuelve a true si se acepta. */
  async confirm(header: string, message: string, okText = 'Aceptar'): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: okText, role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  private async present(
    message: string,
    color: string,
    icon: string,
    duration = 2500,
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      icon,
      duration,
      position: 'bottom',
      cssClass: 'rod-toast',
    });
    await toast.present();
  }
}
