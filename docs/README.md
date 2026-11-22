# SeisAssist · versión auditada 3.0.0

Landing responsive de Nodus para HCI for UX Design. Una página HTML, una hoja CSS y un script principal, sin compilación ni dependencias de JavaScript externas.

## Qué contiene

Tres recorridos conectados dentro de una misma sesión de navegador: persona que necesita ayuda, equipo de rescate y cuidador. Incluye perfiles locales, validaciones, consentimiento revocable, SOS de prueba, acuse separado de atención, mapa de coordenadas, radar ilustrativo, filtros y copia offline.

**No es un sistema operativo de emergencias.** Utiliza únicamente datos ficticios. No transmite Bluetooth Mesh, no detecta dispositivos, no autentica brigadistas, no realiza rescates ni sincroniza datos con otro teléfono. El control de voz es una simulación explícita por transcripción escrita; no captura audio. El GPS utiliza la API del navegador y requiere permiso. Los perfiles de prueba se guardan en localStorage, sin cifrado clínico. Cambiar de rol permite comprobar las vistas; no establece permisos de una cuenta real.

La selección de 30 HU y sus pruebas están en `matriz_30_HU.csv`, `auditoria.html` y `casos_aceptacion.csv`. El catálogo de HU no se publica dentro de la landing. No se contabilizan navegación decorativa, color, reinicio de ejemplos ni acciones auxiliares como historias adicionales.

## Estructura oficial

```text
assets/
  images/ecosistema-seisassist.svg
  icons/*.svg
  fonts/Inter-variable.ttf
  fonts/OFL.txt
  videos/.gitkeep
css/styles.css
js/main.js
pages/index.html            ← página principal real
docs/README.md
docs/auditoria.html
docs/codigo_completo.html
docs/matriz_30_HU.csv
docs/casos_aceptacion.csv
docs/pruebas-core.cjs
docs/actualizar_cache.py
docs/verificar_integridad.py
docs/validacion_local.json
docs/manifest_archivos.json
index.html                  ← entrada que redirige a pages/index.html
sw.js                       ← copia offline, ámbito de este proyecto
favicon.ico
.gitignore
.nojekyll
README.md
```

Las carpetas oficiales no se renombraron. `assets/videos` permanece vacía: no se utiliza vídeo. `docs/wireframes.pdf` es opcional y no se inventó. La entrada raíz es un archivo adicional; no sustituye `pages/index.html` ni implica una segunda landing.

## Probar antes de subir

1. Descomprime el ZIP y abre la carpeta que contiene `assets`, `css`, `js`, `pages` y `docs`.
2. Usa un servidor local, por ejemplo la extensión Live Server de tu editor, o, si tienes Python, ejecuta desde esa carpeta: `python -m http.server 8000`.
3. Abre `http://localhost:8000/`. Debes llegar a `pages/index.html`.
4. La primera apertura muestra una sesión vacía. Para explorar datos ficticios abre «Escenarios de demostración» y confirma «Cargar casos ficticios».
5. Para registrar un perfil nuevo, selecciona «Cuidador o familiar». Guarda datos ficticios. Autorizar es obligatorio solo si deseas compartir el perfil médico; sin autorización el SOS sigue disponible como señal básica.
6. Activa SOS en «Mi espacio SOS». En «Equipo de rescate», abre `S6-LOCAL` y confirma recepción. Vuelve a los otros roles y compara los estados.
7. «Empezar sin datos» permite repetir los casos vacíos y restablecer la prueba. Pide confirmación antes de reemplazar la sesión.
8. Para pruebas de lógica, con Node instalado: `node docs/pruebas-core.cjs`. No se necesita Node para publicar la página.

Abrir con doble clic (`file://`) permite una revisión limitada, pero no acredita Service Worker, persistencia consistente ni GPS. La verificación debe hacerse por localhost o HTTPS.

## 5.5 · Crear el repositorio, paso a paso

1. Entra en tu cuenta de GitHub y elige **New repository**.
2. Escribe un nombre, por ejemplo `seisassist-landing`. Para el flujo gratuito de Pages, utiliza un repositorio público. No subas perfiles médicos ni datos personales reales.
3. Crea el repositorio. Si añadiste un README inicial, reemplázalo después por el de este proyecto.
4. En la página del repositorio, selecciona **Add file → Upload files**.
5. Sube **el contenido interior** de la carpeta descomprimida. En la raíz de GitHub deben aparecer `assets`, `css`, `js`, `pages`, `docs`, `index.html`, `sw.js` y `favicon.ico`; no una carpeta contenedora extra.
6. Comprueba también `.gitignore`, `.nojekyll` y `assets/videos/.gitkeep`. En Windows, muestra los elementos ocultos si no aparecen. Si tu método de arrastrar archivos omite alguno, usa **Add file → Create new file** y créalo con su ruta exacta; los dos últimos pueden estar vacíos.
7. Añade un mensaje concreto, por ejemplo «Incorporar landing responsive auditada», y guarda los cambios con **Commit changes**.
8. Abre `pages/index.html`: debe contener el HTML completo, no una redirección. La redirección está en `index.html` de la raíz.
9. Copia la URL del repositorio en el informe, punto 5.5. Añade capturas del árbol y del historial de aportes reales. No atribuyas a cada integrante commits que no realizó.
10. Registra la versión o identificador del commit que presentarás. No incluyas el ZIP como sustituto de los archivos fuente.

## 5.6 · Publicar en GitHub Pages, paso a paso

1. Abre **Settings → Pages** dentro del repositorio.
2. En **Build and deployment**, selecciona **Deploy from a branch**.
3. Elige la rama que contiene estos archivos, normalmente **main**, y la carpeta **/(root)**.
4. Pulsa **Save**. No elijas `/docs`: esa carpeta contiene documentación, no la landing.
5. Revisa la pestaña **Actions** y espera a que el despliegue de Pages finalice correctamente. Si falla, abre su registro; no marques 5.6 como cumplido.
6. Vuelve a **Settings → Pages** y abre la URL que GitHub proporciona, normalmente `https://TU-USUARIO.github.io/seisassist-landing/`.
7. La entrada debe redirigir a `.../seisassist-landing/pages/index.html`. También puedes abrir esta segunda dirección directamente.
8. Ejecuta los 30 casos de `casos_aceptacion.csv` en escritorio y en un teléfono real. Conserva resultado, fecha, navegador, ancho, URL de evidencia y commit. Los resultados de Pages están pendientes en la plantilla, no aprobados por anticipado.
9. Comprueba sin errores de carga las imágenes, Inter, estilos, JavaScript y favicon. No debe haber rutas a `C:\Users`, recursos con mayúsculas diferentes ni referencias al localhost de la auditoría.
10. En el punto 5.6 del informe, añade la URL pública, la configuración de Pages y capturas de los tres roles en escritorio y móvil, además del resultado del despliegue.

## Cambiar el proyecto después de publicarlo

Sí, se puede modificar el repositorio y la página cuantas veces sea necesario. Los cambios guardados en la rama de publicación activan otra publicación.

1. Edita los archivos necesarios, manteniendo sus nombres y rutas.
2. Si modificas HTML, CSS, JS, fuentes o imágenes, ejecuta `python docs/actualizar_cache.py` desde la raíz. Actualiza la lista y la versión de la copia offline. También actualiza `docs/codigo_completo.html` para que siga correspondiendo a los archivos completos.
3. Si no usas Python, actualiza manualmente el sufijo de `CACHE` en `sw.js` por un valor nuevo y añade a `PATHS` cada recurso nuevo. No repitas una versión de caché anterior.
4. Sube también `sw.js`, guarda el commit y espera al nuevo despliegue de Pages.
5. Guarda los formularios abiertos. Cierra todas las pestañas de ese proyecto y vuelve a abrirlo: la nueva copia offline se activa cuando termina de utilizarse la versión anterior. Una recarga forzada por sí sola no garantiza que cambie el Service Worker.
6. Repite los casos afectados y actualiza las evidencias del informe. La auditoría y el manifiesto suministrados describen esta entrega; después de modificarla, vuelve a verificarlos. El script de integridad detecta diferencias, no actualiza una aprobación automáticamente.

## Reglas de datos y recuperación

- La clave local está aislada por la ruta del proyecto: `seisassist:v3:<ruta>`. Otro repositorio del mismo dominio no comparte esta copia por accidente.
- Un SOS repetido conserva acuse y estado. Para un nuevo escenario utiliza el reinicio confirmado.
- Un reintento conserva el paquete inicial. Revocar consentimiento siempre elimina su perfil médico. Los cambios posteriores autorizados se reflejan en una alerta ya emitida; durante un fallo se conserva la instantánea del intento.
- El navegador puede bloquear o borrar localStorage. Se muestra «solo en esta sesión» si no guarda; no se anuncia un éxito falso.
- Si otra pestaña modifica los mismos datos, se bloquea la siguiente escritura y se solicita recargar. No existe fusión ni sincronización remota.
- Las fechas se almacenan como ISO y se presentan en la zona horaria del navegador. Las coordenadas de ejemplo nunca se presentan como una captura GPS real.
- La consulta offline requiere una primera visita correcta y que el navegador conserve la caché. El indicador de red informa `navigator.onLine`; no demuestra disponibilidad de Internet ni de rescatistas.

## Créditos y referencias

Equipo Nodus: Alcántara Espinoza Aldair Victor; Escriba Michue Juan David; Hichcas Clemente David Daniel; Juyo Leo Rosa Enma; Palacios Salazar Jonatan Elias.

- Marca, favicon e iconos base: recursos aportados en el ZIP SeisAssist. El ZIP no identificaba un autor o licencia independiente para esos recursos; el equipo debe conservar/aclarar su procedencia antes de una distribución ajena al trabajo académico. No se les atribuye una licencia inventada.
- Inter: Rasmus Andersson / The Inter Project Authors, distribuida con SIL Open Font License 1.1. La licencia completa está en `assets/fonts/OFL.txt`. Fuente obtenida de [Google Fonts](https://github.com/google/fonts/tree/main/ofl/inter).
- Diagrama del ecosistema y chevron: SVG de código creados para esta revisión; el diagrama resume los tres roles y no acredita una conexión física.
- Referencias del equipo: [mockups](https://www.figma.com/design/UdaPhMkilyz6mWH6QxqBQX/Sin-t%C3%ADtulo?node-id=0-1) y [prototipo](https://www.figma.com/make/MZYoSaIhB1m2wr6RlHFd9a/Prototipo-interactivo-SeisAssist?fullscreen=1).
- [Publicación desde una rama en GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Las comprobaciones realizadas no constituyen una certificación integral de conformidad.

Auditoría entregada el 21 de noviembre de 2026. Repositorio público y URL de Pages: pendientes de creación por el equipo.
