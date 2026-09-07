import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

/**
 * Punto de entrada de la aplicacion.
 *
 * Usamos `bootstrapApplication` (API standalone de Angular): no hay NgModule raiz.
 * Toda la configuracion global (router, Ionic, HttpClient, inicializadores...)
 * vive en `appConfig` (ver src/app/app.config.ts).
 */
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
