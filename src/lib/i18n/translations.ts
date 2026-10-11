export type Locale = 'es' | 'en';

export interface Translations {
  // Tabs
  tab_create: string;
  tab_minutas: string;
  tab_hymnal: string;
  tab_settings: string;

  // Hymnal
  hymnal_title: string;
  hymnal_search_placeholder: string;
  hymnal_loading: string;
  hymnal_no_results: string;
  hymnal_filters: string;
  hymnal_tempo: string;
  hymnal_tempo_all: string;
  hymnal_tempo_fast: string;
  hymnal_tempo_slow: string;
  hymnal_key_major: string;
  hymnal_key_minor: string;
  hymnal_clear_filters: string;
  hymnal_loading_short: string;

  // Hymn Detail
  hymn_alt: string; // "Hymn #"

  // Minutas
  minutas_title: string;
  minutas_calendar: string;
  minutas_loading: string;
  minutas_empty: string;
  minutas_select: string;
  minutas_cancel: string;
  minutas_delete: string;
  minutas_save: string;
  minutas_name_updated: string;
  minutas_date_updated: string;
  minutas_error_delete: string;
  minutas_error_rename: string;
  minutas_deleted: (n: number) => string;
  minutas_pinned: string;
  minutas_unpinned: string;

  // Create Minuta
  create_title: string;
  create_empty_state: string;
  create_placeholder: string;
  create_preview: string;
  create_approve: string;
  create_saving: string;
  create_edit: string;
  create_corrections: string;
  create_edit_placeholder: string;
  create_processing: string;
  create_saved: string;
  create_discard_title: string;
  create_error_process: string;
  create_error_save: string;
  create_error_correction: string;
  create_upload_photo: string;
  create_reading_image: string;
  create_error_read_image: string;
  create_confirm_photo: string;
  create_retry: string;

  // Portada
  portada_title: string;
  portada_palabra: string;
  portada_oracion: string;
  portada_not_found: string;

  // Settings
  settings_title: string;
  settings_theme: string;
  theme_light_mode: string;
  theme_dark_mode: string;
  settings_theme_light: string;
  settings_theme_dark: string;
  settings_language: string;
  settings_admin: string;
  settings_delete_all: string;
  settings_delete_all_confirm: string;
  settings_delete_all_done: string;
  settings_error_delete: string;
  settings_sign_out: string;
  settings_user: string;
  offline_title: string;
  offline_ready: string;
  offline_preparing: (hechos: number, total: number) => string;
  offline_unsupported: string;
  settings_version: string;

  // Minutas en línea
  minuta_creada_por: string;
  minuta_duplicada_por: string;
  minuta_duplicate: string;
  minuta_duplicated_toast: string;
  minuta_publish_changes: string;
  minuta_changes_published_toast: string;
  minuta_editada_por: string;
  minuta_not_found: string;
  minuta_share: string;
  minuta_fullscreen: string;
  minuta_exit_fullscreen: string;
  minuta_publish: string;
  minuta_make_private: string;
  minuta_badge_public: string;
  minuta_badge_private: string;
  minuta_published_toast: string;
  minuta_private_toast: string;
  minuta_saved_private_toast: string;
  pdf_title: string;
  pdf_description: string;
  pdf_download: string;
  pdf_updated: string;
  minutas_refresh: string;
  minutas_offline: string;
  minutas_hint_select: string;
  minutas_pin: string;

  // Editor de minutas
  editor_title_edit: string;
  editor_mode_manual: string;
  editor_mode_ai: string;
  ia_badge: string;
  ia_checking: string;
  ia_state_on: string;
  ia_state_off: string;
  ia_off_hint: string;
  ia_remaining: (n: number) => string;
  ia_photo_title: string;
  ia_camera: string;
  ia_gallery: string;
  ia_reading_photo: string;
  ia_text_title: string;
  ia_generate: string;
  ia_text_hint: string;
  ia_nothing_found: string;
  ia_review: (total: number, faltan: number) => string;
  ia_note_separator: (cual: 'palabra' | 'oracion', dia: 'miercoles' | 'domingo', porCantos: number | null) => string;
  admin_ia_title: string;
  admin_ia_creators: string;
  admin_ia_creators_desc: string;
  editor_unsaved_title: string;
  editor_unsaved_text: string;
  editor_discard: string;
  editor_discard_new: string;
  editor_unsaved_text_new: string;
  editor_keep_editing: string;
  editor_title_placeholder: string;
  editor_add_song: string;
  editor_done: string;
  editor_empty: string;
  editor_empty_hint: string;
  editor_no_access: string;
  editor_needs_internet: string;
  editor_group: string;
  editor_ungroup: string;
  editor_group_hint: string;
  editor_up: string;
  editor_down: string;

  // Acceso (creadores)
  access_title: string;
  access_intro: string;
  access_request: string;
  access_dialog_title: string;
  access_my_request: string;
  access_my_profile: string;
  access_my_access: string;
  settings_more: string;
  access_dialog_text: string;
  access_send: string;
  access_name_required: string;
  access_pending: string;
  access_check: string;
  access_approved: string;
  access_admin: string;
  access_rejected: string;
  access_disabled: string;
  access_edit_profile: string;

  // Administración
  admin_title: string;
  admin_only: string;
  admin_activate: string;
  admin_activate_button: string;
  admin_key_placeholder: string;
  admin_activated: string;
  admin_people: string;
  admin_history: string;
  admin_pending_requests: string;
  admin_no_people: string;
  admin_requested: string;
  admin_this_device: string;
  admin_role_admin: string;
  admin_state_pending: string;
  admin_state_approved: string;
  admin_state_rejected: string;
  admin_state_disabled: string;
  admin_approve: string;
  admin_reject: string;
  admin_disable: string;
  admin_enable: string;
  admin_restore: string;
  admin_restored: string;
  admin_action_created: string;
  admin_action_edited: string;
  admin_action_deleted: string;
  admin_action_restored: string;
  admin_action_published: string;
  admin_action_private: string;
  admin_action_duplicated: string;

  // Auth
  auth_title: string;
  auth_login_subtitle: string;
  auth_signup_subtitle: string;
  auth_email: string;
  auth_password: string;
  auth_create_password: string;
  auth_loading: string;
  auth_login: string;
  auth_signup: string;
  auth_switch_to_signup: string;
  auth_switch_to_login: string;
  auth_error: string;

  // Profile Setup
  setup_title: string;
  setup_subtitle: string;
  setup_name_placeholder: string;
  setup_color: string;
  setup_saving: string;
  setup_continue: string;
  setup_error: string;

  // Notifications
  notifications_title: string;
  notifications_toggle_label: string;
  notifications_empty: string;
  notifications_created: string;
  notifications_edited: string;
  notifications_deleted: string;
  notifications_registered: string;
  notifications_at: string;
  notifications_loading: string;

  // General
  loading: string;
}

export const es: Translations = {
  tab_create: 'Crear',
  tab_minutas: 'Minutas',
  tab_hymnal: 'Himnario',
  tab_settings: 'Ajustes',

  hymnal_title: 'Himnario',
  hymnal_search_placeholder: 'Buscar por nombre, número o tonalidad...',
  hymnal_loading: 'Cargando himnario...',
  hymnal_no_results: 'No se encontraron himnos',
  hymnal_filters: 'Filtros',
  hymnal_tempo: 'Tempo',
  hymnal_tempo_all: 'Todas',
  hymnal_tempo_fast: 'Rápidas',
  hymnal_tempo_slow: 'Lentas',
  hymnal_key_major: 'Tonalidad mayor',
  hymnal_key_minor: 'Tonalidad menor',
  hymnal_clear_filters: 'Quitar todos los filtros',
  hymnal_loading_short: 'Cargando...',

  hymn_alt: 'Himno #',

  minutas_title: 'Minutas',
  minutas_calendar: 'Calendario',
  minutas_loading: 'Cargando...',
  minutas_empty: 'No hay minutas guardadas',
  minutas_select: 'Seleccionar',
  minutas_cancel: 'Cancelar',
  minutas_delete: 'Eliminar',
  minutas_save: 'Guardar',
  minutas_name_updated: 'Nombre actualizado',
  minutas_date_updated: 'Fecha actualizada',
  minutas_error_delete: 'Error al eliminar',
  minutas_error_rename: 'Error al renombrar',
  minutas_deleted: (n) => `${n} minuta(s) eliminada(s)`,
  minutas_pinned: 'Minuta fijada',
  minutas_unpinned: 'Minuta desfijada',

  create_title: 'Crear Minuta',
  create_empty_state: 'Pega el texto de la lista de canciones y generaré una minuta organizada automáticamente',
  create_placeholder: 'Pega la lista de canciones...',
  create_preview: 'Vista previa',
  create_approve: 'Aprobar',
  create_saving: 'Guardando...',
  create_edit: 'Editar',
  create_corrections: 'Correcciones',
  create_edit_placeholder: 'Ej: Cambiar última por "Heme aquí"',
  create_processing: 'Procesando...',
  create_saved: 'Minuta guardada',
  create_discard_title: 'Descartar y empezar de nuevo',
  create_error_process: 'Error al procesar',
  create_error_save: 'Error al guardar',
  create_error_correction: 'Error al procesar corrección',
  create_upload_photo: 'Subir foto',
  create_reading_image: 'Procesando imagen...',
  create_error_read_image: 'No se pudo leer la imagen. Intenta con otra foto o escribe el texto manualmente.',
  create_confirm_photo: 'Enviar',
  create_retry: 'Reintentar',

  portada_title: 'Minuta',
  portada_palabra: 'PALABRA',
  portada_oracion: 'ORACIÓN',
  portada_not_found: 'no encontrada',

  settings_title: 'Ajustes',
  settings_theme: 'Tema',
  theme_light_mode: 'Modo claro',
  theme_dark_mode: 'Modo oscuro',
  settings_theme_light: 'Claro',
  settings_theme_dark: 'Oscuro',
  settings_language: 'Idioma',
  settings_admin: 'Acciones',
  settings_delete_all: 'Eliminar todas las minutas',
  settings_delete_all_confirm: '¿Eliminar todas las minutas? Esta acción no se puede deshacer.',
  settings_delete_all_done: 'Todas las minutas eliminadas',
  settings_error_delete: 'Error al eliminar',
  settings_sign_out: 'Cerrar sesión',
  settings_user: 'usuario',
  offline_title: 'Uso sin internet',
  offline_ready: 'Listo: todos los himnos están guardados en este dispositivo.',
  offline_preparing: (hechos, total) => `Preparando himnos para usar sin internet… ${hechos} / ${total}`,
  offline_unsupported: 'Abre la app instalada (o con internet) para guardar los himnos.',
  settings_version: 'Versión',

  minuta_creada_por: 'Creada por',
  minuta_duplicada_por: 'Duplicada por',
  minuta_duplicate: 'Duplicar',
  minuta_duplicated_toast: 'Minuta duplicada: la copia es tuya y queda solo para ti.',
  minuta_publish_changes: 'Publicar cambios',
  minuta_changes_published_toast: 'Cambios publicados.',
  minuta_editada_por: 'Editada por',
  minuta_not_found: 'No se encontró esta minuta. Ábrela una vez con internet para guardarla en el celular.',
  minuta_share: 'Compartir por WhatsApp',
  minuta_fullscreen: 'Pantalla completa',
  minuta_exit_fullscreen: 'Salir de pantalla completa',
  minuta_publish: 'Publicar',
  minuta_make_private: 'Volver a privada',
  minuta_badge_public: 'Pública',
  minuta_badge_private: 'Solo tú',
  minuta_published_toast: 'Minuta publicada: ahora la ven todos.',
  minuta_private_toast: 'Ahora solo tú ves esta minuta.',
  minuta_saved_private_toast: 'Guardada. Solo tú la ves hasta que la publiques.',
  pdf_title: 'Himnario en PDF',
  pdf_description: 'La versión más reciente del himnario completo, para descargar o imprimir.',
  pdf_download: 'Descargar PDF',
  pdf_updated: 'Actualizado el',
  minutas_refresh: 'Actualizar',
  minutas_offline: 'Sin conexión: mostrando las minutas guardadas en este celular.',
  minutas_hint_select: 'Mantén presionada una minuta para seleccionarla, fijarla o borrarla.',
  minutas_pin: 'Fijar',

  editor_title_edit: 'Editar minuta',
  editor_mode_manual: 'Manual',
  editor_mode_ai: 'Automático',
  ia_badge: 'IA',
  ia_checking: 'Revisando la IA…',
  ia_state_on: 'Disponible',
  ia_state_off: 'No disponible',
  ia_off_hint: 'La foto con IA está apagada por ahora. Usa el texto o el modo manual.',
  ia_remaining: n => `${n} fotos hoy`,
  ia_photo_title: 'Desde una foto',
  ia_camera: 'Cámara',
  ia_gallery: 'Galería',
  ia_reading_photo: 'Leyendo la foto…',
  ia_text_title: 'Desde texto (por ejemplo, de WhatsApp)',
  ia_generate: 'Generar minuta',
  ia_text_hint: 'Sin IA: lo lee la app, funciona siempre, incluso sin internet.',
  ia_nothing_found: 'No se encontraron cantos en ese texto.',
  ia_review: (total, faltan) => faltan
    ? `Revisa la minuta: ${total} cantos, ${faltan} sin encontrar (en rojo).`
    : `Listo: ${total} cantos. Revísala y guarda.`,
  ia_note_separator: (cual, dia, porCantos) =>
    `La raya se tomó como ${cual === 'oracion' ? 'Oración' : 'Palabra'} (${dia === 'miercoles' ? 'miércoles' : 'domingo'}${
      porCantos != null ? `, por tener ${porCantos} cantos` : ''}).`,
  admin_ia_title: 'IA para leer fotos',
  admin_ia_creators: 'Permitir a los creadores',
  admin_ia_creators_desc: 'Usan tu mismo cupo gratis de Gemini (máx. 10 fotos por persona al día).',
  editor_unsaved_title: '¿Salir sin guardar?',
  editor_unsaved_text: 'Hiciste cambios en esta minuta que todavía no están guardados.',
  editor_discard: 'Descartar cambios',
  editor_discard_new: 'Descartar',
  editor_unsaved_text_new: 'Esta minuta nueva todavía no está guardada.',
  editor_keep_editing: 'Seguir editando',
  editor_title_placeholder: 'Título (opcional)',
  editor_add_song: 'Alabanza',
  editor_done: 'Listo',
  editor_empty: 'Agrega al menos un canto.',
  editor_empty_hint: 'Pulsa "+ Alabanza" para buscar y añadir alabanzas.',
  editor_no_access: 'Para crear minutas, pide acceso en Ajustes. El administrador debe aprobarlo.',
  editor_needs_internet: 'Se necesita internet para guardar.',
  editor_group: 'Agrupar con el siguiente',
  editor_ungroup: 'Separar',
  editor_group_hint: 'Mantén presionada una fila para moverla; deslízala hacia el lado para borrarla. La cadena la agrupa con la siguiente.',
  editor_up: 'Subir',
  editor_down: 'Bajar',

  access_title: 'Crear minutas',
  access_intro: 'Para crear o editar minutas, pide acceso de creador. El administrador lo aprobará.',
  access_request: 'Solicitar ser creador',
  access_dialog_title: 'Solicitar ser creador',
  access_my_request: 'Mi solicitud',
  access_my_profile: 'Mi perfil',
  access_my_access: 'Mi acceso',
  settings_more: 'Más opciones',
  access_dialog_text: 'Escribe tu nombre y elige un color: así se distinguen tus minutas.',
  access_send: 'Enviar solicitud',
  access_name_required: 'Escribe tu nombre.',
  access_pending: 'Solicitud enviada. Espera a que el administrador la apruebe.',
  access_check: 'Revisar estado',
  access_approved: 'Tienes acceso: puedes crear, editar y borrar minutas.',
  access_admin: 'Este celular es el administrador.',
  access_rejected: 'Tu solicitud anterior fue rechazada. Puedes volver a solicitarlo.',
  access_disabled: 'El administrador deshabilitó el acceso de este celular.',
  access_edit_profile: 'Cambiar nombre o color',

  admin_title: 'Administración',
  admin_only: 'Solo el administrador puede ver esta pantalla.',
  admin_activate: 'Activar como administrador',
  admin_activate_button: 'Activar',
  admin_key_placeholder: 'Clave de administrador',
  admin_activated: 'Este celular ahora es el administrador.',
  admin_people: 'Personas',
  admin_history: 'Historial',
  admin_pending_requests: 'Solicitudes pendientes',
  admin_no_people: 'Todavía nadie ha pedido acceso.',
  admin_requested: 'Pidió acceso el',
  admin_this_device: 'este celular',
  admin_role_admin: 'Administrador',
  admin_state_pending: 'Pendiente',
  admin_state_approved: 'Aprobado',
  admin_state_rejected: 'Rechazado',
  admin_state_disabled: 'Deshabilitado',
  admin_approve: 'Aprobar',
  admin_reject: 'Rechazar',
  admin_disable: 'Deshabilitar',
  admin_enable: 'Habilitar',
  admin_restore: 'Restaurar',
  admin_restored: 'Minuta restaurada.',
  admin_action_created: 'Creó',
  admin_action_edited: 'Editó',
  admin_action_deleted: 'Borró',
  admin_action_restored: 'Restauró',
  admin_action_published: 'Publicó',
  admin_action_private: 'Dejó privada',
  admin_action_duplicated: 'Duplicó',

  auth_title: 'Hymnal',
  auth_login_subtitle: 'Inicia sesión para continuar',
  auth_signup_subtitle: 'Crea tu cuenta',
  auth_email: 'Correo electrónico',
  auth_password: 'Contraseña',
  auth_create_password: 'Crear contraseña',
  auth_loading: 'Cargando...',
  auth_login: 'Entrar',
  auth_signup: 'Crear cuenta',
  auth_switch_to_signup: '¿No tienes cuenta? Regístrate',
  auth_switch_to_login: '¿Ya tienes cuenta? Inicia sesión',
  auth_error: 'Error de autenticación',

  setup_title: 'Configura tu perfil',
  setup_subtitle: 'Elige un nombre y un color',
  setup_name_placeholder: 'Tu nombre',
  setup_color: 'Tu color',
  setup_saving: 'Guardando...',
  setup_continue: 'Continuar',
  setup_error: 'Error al crear perfil',

  notifications_title: 'Notificaciones',
  notifications_toggle_label: 'Notificaciones en la app',
  notifications_empty: 'No hay actividad registrada',
  notifications_created: 'ha creado una minuta',
  notifications_edited: 'ha editado una minuta',
  notifications_deleted: 'ha eliminado una minuta',
  notifications_registered: 'se ha registrado',
  notifications_at: 'a las',
  notifications_loading: 'Cargando historial...',

  loading: 'Cargando...',
};

export const en: Translations = {
  tab_create: 'Create',
  tab_minutas: 'Services',
  tab_hymnal: 'Hymnal',
  tab_settings: 'Settings',

  hymnal_title: 'Hymnal',
  hymnal_search_placeholder: 'Search by name, number, or key...',
  hymnal_loading: 'Loading hymnal...',
  hymnal_no_results: 'No hymns found',
  hymnal_filters: 'Filters',
  hymnal_tempo: 'Tempo',
  hymnal_tempo_all: 'All',
  hymnal_tempo_fast: 'Fast',
  hymnal_tempo_slow: 'Slow',
  hymnal_key_major: 'Major keys',
  hymnal_key_minor: 'Minor keys',
  hymnal_clear_filters: 'Clear all filters',
  hymnal_loading_short: 'Loading...',

  hymn_alt: 'Hymn #',

  minutas_title: 'Services',
  minutas_calendar: 'Calendar',
  minutas_loading: 'Loading...',
  minutas_empty: 'No saved services',
  minutas_select: 'Select',
  minutas_cancel: 'Cancel',
  minutas_delete: 'Delete',
  minutas_save: 'Save',
  minutas_name_updated: 'Name updated',
  minutas_date_updated: 'Date updated',
  minutas_error_delete: 'Error deleting',
  minutas_error_rename: 'Error renaming',
  minutas_deleted: (n) => `${n} service(s) deleted`,
  minutas_pinned: 'Service pinned',
  minutas_unpinned: 'Service unpinned',

  create_title: 'Create Service',
  create_empty_state: 'Paste the song list text and I will generate an organized service automatically',
  create_placeholder: 'Paste the song list...',
  create_preview: 'Preview',
  create_approve: 'Approve',
  create_saving: 'Saving...',
  create_edit: 'Edit',
  create_corrections: 'Corrections',
  create_edit_placeholder: 'E.g. Change last one to "Here I Am"',
  create_processing: 'Processing...',
  create_saved: 'Service saved',
  create_discard_title: 'Discard and start over',
  create_error_process: 'Error processing',
  create_error_save: 'Error saving',
  create_error_correction: 'Error processing correction',
  create_upload_photo: 'Upload photo',
  create_reading_image: 'Processing image...',
  create_error_read_image: 'Could not read the image. Try another photo or type the text manually.',
  create_confirm_photo: 'Send',
  create_retry: 'Retry',

  portada_title: 'Service',
  portada_palabra: 'WORD',
  portada_oracion: 'PRAYER',
  portada_not_found: 'not found',

  settings_title: 'Settings',
  settings_theme: 'Theme',
  theme_light_mode: 'Light mode',
  theme_dark_mode: 'Dark mode',
  settings_theme_light: 'Light',
  settings_theme_dark: 'Dark',
  settings_language: 'Language',
  settings_admin: 'Actions',
  settings_delete_all: 'Delete all services',
  settings_delete_all_confirm: 'Delete all services? This action cannot be undone.',
  settings_delete_all_done: 'All services deleted',
  settings_error_delete: 'Error deleting',
  settings_sign_out: 'Sign out',
  settings_user: 'user',
  offline_title: 'Offline use',
  offline_ready: 'Ready: all hymns are saved on this device.',
  offline_preparing: (done, total) => `Saving hymns for offline use… ${done} / ${total}`,
  offline_unsupported: 'Open the installed app (or go online) to save the hymns.',
  settings_version: 'Version',

  minuta_creada_por: 'Created by',
  minuta_duplicada_por: 'Duplicated by',
  minuta_duplicate: 'Duplicate',
  minuta_duplicated_toast: 'Service duplicated: the copy is yours and only you can see it.',
  minuta_publish_changes: 'Publish changes',
  minuta_changes_published_toast: 'Changes published.',
  minuta_editada_por: 'Edited by',
  minuta_not_found: 'Service not found. Open it once while online to save it on this phone.',
  minuta_share: 'Share on WhatsApp',
  minuta_fullscreen: 'Full screen',
  minuta_exit_fullscreen: 'Exit full screen',
  minuta_publish: 'Publish',
  minuta_make_private: 'Make private',
  minuta_badge_public: 'Public',
  minuta_badge_private: 'Only you',
  minuta_published_toast: 'Service published: everyone can see it now.',
  minuta_private_toast: 'Now only you can see this service.',
  minuta_saved_private_toast: 'Saved. Only you can see it until you publish it.',
  pdf_title: 'Hymnal PDF',
  pdf_description: 'The latest version of the full hymnal, to download or print.',
  pdf_download: 'Download PDF',
  pdf_updated: 'Updated on',
  minutas_refresh: 'Refresh',
  minutas_offline: 'Offline: showing the services saved on this phone.',
  minutas_hint_select: 'Press and hold a service to select, pin or delete it.',
  minutas_pin: 'Pin',

  editor_title_edit: 'Edit service',
  editor_mode_manual: 'Manual',
  editor_mode_ai: 'Automatic',
  ia_badge: 'AI',
  ia_checking: 'Checking AI…',
  ia_state_on: 'Available',
  ia_state_off: 'Unavailable',
  ia_off_hint: 'Photo AI is off for now. Use text or manual mode.',
  ia_remaining: n => `${n} photos today`,
  ia_photo_title: 'From a photo',
  ia_camera: 'Camera',
  ia_gallery: 'Gallery',
  ia_reading_photo: 'Reading the photo…',
  ia_text_title: 'From text (e.g. from WhatsApp)',
  ia_generate: 'Generate service',
  ia_text_hint: 'No AI: the app reads it itself, it always works, even offline.',
  ia_nothing_found: 'No songs were found in that text.',
  ia_review: (total, faltan) => faltan
    ? `Review the service: ${total} songs, ${faltan} not found (in red).`
    : `Done: ${total} songs. Review it and save.`,
  ia_note_separator: (cual, dia, porCantos) =>
    `The line was read as ${cual === 'oracion' ? 'Prayer' : 'Word'} (${dia === 'miercoles' ? 'Wednesday' : 'Sunday'}${
      porCantos != null ? `, since it has ${porCantos} songs` : ''}).`,
  admin_ia_title: 'AI for reading photos',
  admin_ia_creators: 'Allow creators',
  admin_ia_creators_desc: 'They use your same free Gemini quota (max. 10 photos per person per day).',
  editor_unsaved_title: 'Leave without saving?',
  editor_unsaved_text: 'You made changes to this service that are not saved yet.',
  editor_discard: 'Discard changes',
  editor_discard_new: 'Discard',
  editor_unsaved_text_new: 'This new service has not been saved yet.',
  editor_keep_editing: 'Keep editing',
  editor_title_placeholder: 'Title (optional)',
  editor_add_song: 'Song',
  editor_done: 'Done',
  editor_empty: 'Add at least one song.',
  editor_empty_hint: 'Tap "+ Song" to search and add songs.',
  editor_no_access: 'To create services, request access in Settings. The administrator must approve it.',
  editor_needs_internet: 'An internet connection is needed to save.',
  editor_group: 'Group with next',
  editor_ungroup: 'Ungroup',
  editor_group_hint: 'Press and hold a row to move it; swipe it sideways to delete it. The chain groups it with the next one.',
  editor_up: 'Move up',
  editor_down: 'Move down',

  access_title: 'Create services',
  access_intro: 'To create or edit services, request creator access. The administrator will approve it.',
  access_request: 'Request creator access',
  access_dialog_title: 'Request creator access',
  access_my_request: 'My request',
  access_my_profile: 'My profile',
  access_my_access: 'My access',
  settings_more: 'More options',
  access_dialog_text: 'Enter your name and pick a color: it identifies your services.',
  access_send: 'Send request',
  access_name_required: 'Enter your name.',
  access_pending: 'Request sent. Wait for the administrator to approve it.',
  access_check: 'Check status',
  access_approved: 'You have access: you can create, edit and delete services.',
  access_admin: 'This phone is the administrator.',
  access_rejected: 'Your previous request was rejected. You can request access again.',
  access_disabled: 'The administrator disabled access for this phone.',
  access_edit_profile: 'Change name or color',

  admin_title: 'Administration',
  admin_only: 'Only the administrator can see this screen.',
  admin_activate: 'Activate as administrator',
  admin_activate_button: 'Activate',
  admin_key_placeholder: 'Administrator key',
  admin_activated: 'This phone is now the administrator.',
  admin_people: 'People',
  admin_history: 'History',
  admin_pending_requests: 'Pending requests',
  admin_no_people: 'Nobody has requested access yet.',
  admin_requested: 'Requested on',
  admin_this_device: 'this phone',
  admin_role_admin: 'Administrator',
  admin_state_pending: 'Pending',
  admin_state_approved: 'Approved',
  admin_state_rejected: 'Rejected',
  admin_state_disabled: 'Disabled',
  admin_approve: 'Approve',
  admin_reject: 'Reject',
  admin_disable: 'Disable',
  admin_enable: 'Enable',
  admin_restore: 'Restore',
  admin_restored: 'Service restored.',
  admin_action_created: 'Created',
  admin_action_edited: 'Edited',
  admin_action_deleted: 'Deleted',
  admin_action_restored: 'Restored',
  admin_action_published: 'Published',
  admin_action_private: 'Made private',
  admin_action_duplicated: 'Duplicated',

  auth_title: 'Hymnal',
  auth_login_subtitle: 'Sign in to continue',
  auth_signup_subtitle: 'Create your account',
  auth_email: 'Email address',
  auth_password: 'Password',
  auth_create_password: 'Create password',
  auth_loading: 'Loading...',
  auth_login: 'Sign in',
  auth_signup: 'Create account',
  auth_switch_to_signup: "Don't have an account? Sign up",
  auth_switch_to_login: 'Already have an account? Sign in',
  auth_error: 'Authentication error',

  setup_title: 'Set up your profile',
  setup_subtitle: 'Choose a name and a color',
  setup_name_placeholder: 'Your name',
  setup_color: 'Your color',
  setup_saving: 'Saving...',
  setup_continue: 'Continue',
  setup_error: 'Error creating profile',

  notifications_title: 'Notifications',
  notifications_toggle_label: 'In-app notifications',
  notifications_empty: 'No activity recorded',
  notifications_created: 'has created a minuta',
  notifications_edited: 'has edited a minuta',
  notifications_deleted: 'has deleted a minuta',
  notifications_registered: 'has registered',
  notifications_at: 'at',
  notifications_loading: 'Loading history...',

  loading: 'Loading...',
};

const translations: Record<Locale, Translations> = { es, en };
export default translations;
