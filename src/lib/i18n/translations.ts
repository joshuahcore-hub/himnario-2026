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
  settings_theme_light: 'Claro',
  settings_theme_dark: 'Oscuro',
  settings_language: 'Idioma / Language',
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
  settings_theme_light: 'Light',
  settings_theme_dark: 'Dark',
  settings_language: 'Language / Idioma',
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
