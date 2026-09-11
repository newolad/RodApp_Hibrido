import { addIcons } from 'ionicons';
import {
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  personOutline,
  personCircleOutline,
  chevronBackOutline,
  logoGoogle,
  logInOutline,
  logOutOutline,
  homeOutline,
  home,
  bicycleOutline,
  bicycle,
  mapOutline,
  map,
  timeOutline,
  time,
  person,
  addOutline,
  documentTextOutline,
  buildOutline,
  waterOutline,
  notificationsOutline,
  bulbOutline,
  settingsOutline,
  chevronForwardOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
  shieldCheckmarkOutline,
  cloudOfflineOutline,
  createOutline,
  trashOutline,
} from 'ionicons/icons';

/**
 * Registro CENTRAL de iconos de RodApp.
 *
 * Con la API standalone de Ionic los iconos no se cargan solos: hay que
 * registrarlos con `addIcons`. Hacerlo en un unico lugar garantiza que el
 * MISMO icono se use con el MISMO nombre en todas las vistas (coherencia
 * pedida en el brief) y evita duplicar imports en cada pagina.
 *
 * Se invoca una vez desde `AppComponent`.
 */
export function registrarIconos(): void {
  addIcons({
    // Formularios / autenticacion
    'mail-outline': mailOutline,
    'lock-closed-outline': lockClosedOutline,
    'eye-outline': eyeOutline,
    'eye-off-outline': eyeOffOutline,
    'person-outline': personOutline,
    'person-circle-outline': personCircleOutline,
    'chevron-back-outline': chevronBackOutline,
    'logo-google': logoGoogle,
    'log-in-outline': logInOutline,
    'log-out-outline': logOutOutline,

    // Navegacion por tabs (par outline / relleno para estado activo)
    'home-outline': homeOutline,
    home: home,
    'bicycle-outline': bicycleOutline,
    bicycle: bicycle,
    'map-outline': mapOutline,
    map: map,
    'time-outline': timeOutline,
    time: time,
    person: person,

    // Acciones y secciones de negocio
    'add-outline': addOutline,
    'document-text-outline': documentTextOutline,
    'build-outline': buildOutline,
    'water-outline': waterOutline,
    'notifications-outline': notificationsOutline,
    'bulb-outline': bulbOutline,
    'settings-outline': settingsOutline,
    'chevron-forward-outline': chevronForwardOutline,
    'create-outline': createOutline,
    'trash-outline': trashOutline,

    // Feedback (toasts / estados)
    'alert-circle-outline': alertCircleOutline,
    'checkmark-circle-outline': checkmarkCircleOutline,
    'information-circle-outline': informationCircleOutline,
    'shield-checkmark-outline': shieldCheckmarkOutline,
    'cloud-offline-outline': cloudOfflineOutline,
  });
}
