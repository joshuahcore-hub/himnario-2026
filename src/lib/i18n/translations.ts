export type Locale = 'es' | 'en' | 'pt';

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
  minutas_delete_confirm_title: (n: number) => string;
  minutas_delete_confirm_text: string;
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
  minuta_not_yours: string;
  minuta_duplicate: string;
  minuta_share_image: string;
  minuta_share_error: string;
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
  pdf_downloaded: string;
  pdf_updated: string;
  minutas_refresh: string;
  minutas_offline: string;
  minutas_hint_select: string;
  minutas_hint_share: string;
  minutas_ir_primera: string;
  minutas_ir_ultima: string;
  minutas_pin: string;
  minutas_unpin: string;
  minutas_opciones: string;
  minuta_bajar_imagen: string;

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
  especial: string;
  especial_nombre: string;
  editor_add: string;
  fuera_boton: string;
  fuera_titulo: string;
  fuera_texto: string;
  fuera_nombre: string;
  fuera_tonalidad: string;
  fuera_imagen: string;
  fuera_elegir_imagen: string;
  fuera_quitar_imagen: string;
  fuera_otra_imagen: (n: number, max: number) => string;
  fuera_max_imagenes: (max: number) => string;
  fuera_falta_titulo: string;
  fuera_etiqueta: string;
  fuera_no_esta: string;
  fuera_imagen_subida: string;
  fuera_seccion: string;
  fuera_vacio: string;
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
  access_viewer: string;
  access_want_create: string;
  access_my_profile: string;
  settings_more: string;
  access_dialog_text: string;
  access_send: string;
  access_name_required: string;
  access_pending: string;
  access_check: string;
  access_approved: string;
  access_registered: string;
  access_visor: string;
  access_can_remind_others: string;
  admin_can_view: string;
  admin_can_create: string;
  admin_can_remind: string;
  admin_registered: string;
  admin_role_viewer: string;
  admin_role_creator: string;
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
  admin_hide: string;
  admin_can_project: string;
  proy_titulo: string;
  proy_texto: string;
  proy_libro: string;
  proy_capitulo: string;
  proy_versiculo: string;
  proy_hasta: string;
  proy_sin_diapositivas: string;
  proy_bajando: string;
  proy_armando: string;
  proy_generar: string;
  proy_listo: string;
  proy_error: string;
  proy_guardar_en: string;
  proy_descargas: string;
  proy_elegir_carpeta: string;
  proy_cambiar: string;
  proy_guardado: (carpeta: string) => string;
  admin_hide_title: (nombre: string) => string;
  admin_hide_text: string;
  notif_title: string;
  notif_receive: string;
  notif_need_register: string;
  notif_not_supported: string;
  notif_allow: string;
  notif_allow_text: string;
  notif_blocked: string;
  notif_types: string;
  notif_tipo: Record<string, string>;
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
  admin_restore_title: string;
  admin_restore_text: string;
  admin_restore_mine: string;
  admin_restore_mine_desc: string;
  admin_restore_public: string;
  admin_restore_public_desc: string;
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
  // Recordatorios (1.7.0)
  settings_color: string;
  color_nombre: Record<'estandar' | 'rosa' | 'lila' | 'damasco' | 'azul' | 'salvia', string>;
  color_corto: Record<'estandar' | 'rosa' | 'lila' | 'damasco' | 'azul' | 'salvia', string>;
  rec_add: string;
  rec_title_new: string;
  rec_title_edit: string;
  rec_placeholder: string;
  rec_for: string;
  rec_for_me: string;
  rec_send: string;
  rec_deleted_short: string;
  rec_simbolo: Record<'ojo' | 'arriba' | 'abajo' | 'corchea', string>;
  rec_simbolo_texto: string;
  rec_te_lo_envio: (n: string) => string;
  rec_enviado_por: (n: string) => string;
  rec_from: string;
  rec_save: string;
  rec_cancel: string;
  rec_delete: string;
  rec_edit: string;
  rec_only_view: string;
  rec_needs_internet: string;
  rec_always: string;
  rec_this_minuta: string;
  rec_private_hint: string;
  rec_sent_to: (nombre: string) => string;
  rec_sent_count: (n: number) => string;
  rec_sent_title: string;
  rec_sent_none: string;
  rec_back: string;
  rec_sent: string;
  rec_seen: string;
  rec_deleted_by: (nombre: string) => string;
  rec_delete_confirm: string;
  rec_delete_both: (nombre: string) => string;
  rec_delete_received: (nombre: string) => string;
}

export const es: Translations = {
  tab_create: 'Crear',
  tab_minutas: 'Minutas',
  tab_hymnal: 'Himnario',
  tab_settings: 'Ajustes',

  hymnal_title: 'Himnario',
  hymnal_search_placeholder: 'Buscar por nombre o número',
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
  minutas_deleted: (n) => (n === 1 ? 'Minuta eliminada' : `${n} minutas eliminadas`),
  minutas_delete_confirm_title: n => (n === 1 ? '¿Eliminar esta minuta?' : `¿Eliminar ${n} minutas?`),
  minutas_delete_confirm_text: 'Se quitará para todos. El administrador puede recuperarla desde el historial.',
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
  minuta_not_yours: 'Esta minuta es de otra persona: solo puedes verla o duplicarla. Tu copia sí la puedes editar.',
  minuta_duplicate: 'Duplicar',
  minuta_share_image: 'Compartir',
  minuta_share_error: 'No se pudo compartir la minuta.',
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
  pdf_downloaded: 'Descargado: Himnario 2026.pdf',
  pdf_updated: 'Actualizado el',
  minutas_refresh: 'Actualizar',
  minutas_offline: 'Sin conexión: mostrando las minutas guardadas en este celular.',
  minutas_hint_select: 'Mantén presionada una minuta para seleccionarla, compartirla, fijarla o borrarla.',
  minutas_hint_share: 'Mantén presionada una minuta para compartirla como imagen.',
  minutas_ir_primera: 'Ir a la primera',
  minutas_ir_ultima: 'Ir a la última',
  minutas_pin: 'Fijar',
  minutas_unpin: 'Desfijar',
  minutas_opciones: 'Opciones',
  minuta_bajar_imagen: 'Descargar imagen',

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
  especial: 'Especial',
  especial_nombre: 'Nombre',
  editor_add: 'Agregar',
  fuera_boton: 'Una que no está en el himnario',
  fuera_titulo: 'Alabanza fuera del himnario',
  fuera_texto: 'Queda guardada para volver a usarla.',
  fuera_nombre: 'Título',
  fuera_tonalidad: 'Tonalidad (opcional)',
  fuera_imagen: 'Imágenes (opcional)',
  fuera_elegir_imagen: 'Elegir imagen de la galería',
  fuera_quitar_imagen: 'Quitar imagen',
  fuera_otra_imagen: (n, max) => `Agregar otra imagen (${n} de ${max})`,
  fuera_max_imagenes: max => `Máximo ${max} imágenes`,
  fuera_falta_titulo: 'Escribe el título.',
  fuera_etiqueta: 'fuera del himnario',
  fuera_no_esta: 'No está en el himnario',
  fuera_imagen_subida: 'Imagen subida',
  fuera_seccion: 'Canciones que no están en el himnario',
  fuera_vacio: 'Todavía no hay canciones guardadas. Se agregan al crear una minuta.',
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
  access_request: 'Registrarme',
  access_dialog_title: 'Registrarme',
  access_viewer: 'Puedes usar el himnario, incluso sin internet.',
  access_want_create: 'Regístrate con tu nombre y un color: el administrador te puede dar acceso a las minutas, y te pueden dejar recordatorios en las alabanzas.',
  access_my_profile: 'Mi perfil',
  settings_more: 'Más opciones',
  access_dialog_text: 'Escribe tu nombre y elige un color: así te reconocen en la app.',
  access_send: 'Registrarme',
  access_name_required: 'Escribe tu nombre.',
  access_pending: 'Tu solicitud está enviada. Espera a que el administrador la apruebe.',
  access_check: 'Revisar estado',
  access_approved: 'Eres creador: puedes crear, editar y borrar minutas.',
  access_registered: 'Estás registrado: te pueden dejar recordatorios en las alabanzas.',
  access_visor: 'Eres visor: puedes ver las minutas y te pueden dejar recordatorios en las alabanzas.',
  access_can_remind_others: 'Puedes dejar recordatorios a otras personas.',
  admin_can_view: 'Ver minutas',
  admin_can_create: 'Crear minutas',
  admin_can_remind: 'Dejar recordatorios a otros',
  admin_registered: 'Registrado',
  admin_role_viewer: 'Visor',
  admin_role_creator: 'Creador',
  access_admin: 'Eres administrador: puedes crear, editar y borrar minutas, y aprobar creadores.',
  access_rejected: 'Regístrate con tu nombre y un color: así te pueden dejar recordatorios en las alabanzas.',
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
  admin_hide: 'Quitar',
  admin_can_project: 'Generar proyección',
  proy_titulo: 'Generar proyección',
  proy_texto: 'Elige la escritura de la portada. Se guarda el PowerPoint del culto con las alabanzas de esta minuta.',
  proy_libro: 'Libro',
  proy_capitulo: 'Capítulo',
  proy_versiculo: 'Versículo',
  proy_hasta: 'Hasta',
  proy_sin_diapositivas: 'Sin diapositivas (no van en el PowerPoint):',
  proy_bajando: 'Descargando el PowerPoint maestro…',
  proy_armando: 'Armando…',
  proy_generar: 'Generar',
  proy_listo: 'Descargado',
  proy_error: 'No se pudo generar la proyección.',
  proy_guardar_en: 'Guardar en',
  proy_descargas: 'Descargas',
  proy_elegir_carpeta: 'Elegir carpeta',
  proy_cambiar: 'Cambiar',
  proy_guardado: c => `Guardado en «${c}»`,
  admin_hide_title: n => `¿Quitar a ${n} de la lista?`,
  admin_hide_text: 'No se borra nada: sus minutas y recordatorios se mantienen.',
  notif_title: 'Notificaciones',
  notif_receive: 'Recibir notificaciones',
  notif_need_register: 'Para recibir notificaciones, regístrate con tu nombre y un color.',
  notif_not_supported: 'Este celular no admite notificaciones de la app. En iPhone, instala la app en la pantalla de inicio y ábrela desde ahí.',
  notif_allow: 'Permitir',
  notif_allow_text: 'Este celular aún no tiene permiso para mostrarlas.',
  notif_blocked: 'Las notificaciones están bloqueadas en este celular. Actívalas en los ajustes del teléfono para esta app.',
  notif_types: 'Avisarme cuando:',
  notif_tipo: {
    registro: 'Alguien se registra', creada: 'Se crea una minuta', editada: 'Se edita una minuta',
    publicada: 'Se publica una minuta', privada: 'Una minuta pasa a privada', duplicada: 'Se duplica una minuta',
    borrada: 'Se elimina una minuta', restaurada: 'Se restaura una minuta', nueva_minuta: 'Se publica una minuta nueva', recordatorio: 'Alguien me deja un recordatorio', proyeccion: 'Alguien genera una proyección',
  },
  admin_requested: 'Se registró el',
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
  admin_restore_title: '¿Cómo quieres restaurarla?',
  admin_restore_text: 'Elige quién la verá.',
  admin_restore_mine: 'Solo para ti',
  admin_restore_mine_desc: 'Pasa a ser tuya y privada.',
  admin_restore_public: 'Pública',
  admin_restore_public_desc: 'La ven todos.',
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
  settings_color: 'Color',
  color_nombre: { estandar: 'Estándar', rosa: 'Rosa', lila: 'Lila', damasco: 'Damasco', azul: 'Azul', salvia: 'Verde salvia' },
  color_corto: { estandar: 'Estándar', rosa: 'Rosa', lila: 'Lila', damasco: 'Damasco', azul: 'Azul', salvia: 'Verde salvia' },
  rec_add: 'Añadir recordatorio',
  rec_title_new: 'Nuevo recordatorio',
  rec_title_edit: 'Recordatorio',
  rec_placeholder: 'Escribe lo que quieres recordar…',
  rec_for: 'Para',
  rec_for_me: 'Para mí',
  rec_send: 'Enviar',
  rec_deleted_short: 'Lo eliminó',
  rec_simbolo: { ojo: 'Ojo', arriba: 'Flecha arriba', abajo: 'Flecha abajo', corchea: 'Corchea' },
  rec_simbolo_texto: 'Texto',
  rec_te_lo_envio: n => `Te lo envió ${n}`,
  rec_enviado_por: n => `Enviado por ${n}`,
  rec_from: 'De',
  rec_save: 'Guardar',
  rec_cancel: 'Cancelar',
  rec_delete: 'Eliminar',
  rec_edit: 'Editar',
  rec_only_view: 'Te lo dejó otra persona: solo quien lo escribió puede cambiarlo.',
  rec_needs_internet: 'Se necesita internet para guardar este recordatorio.',
  rec_always: 'Siempre en esta alabanza',
  rec_this_minuta: 'Solo esta minuta',
  rec_sent: 'Enviado',
  rec_seen: 'Visto',
  rec_deleted_by: nombre => `Eliminado por ${nombre}`,
  rec_delete_confirm: '¿Eliminar este recordatorio?',
  rec_delete_both: nombre => `También se borra para ${nombre}.`,
  rec_delete_received: nombre => `${nombre} verá que lo eliminaste.`,
  rec_private_hint: 'Esta minuta es privada: para dejárselo a otra persona, elige "Siempre en esta alabanza".',
  rec_sent_to: nombre => `Enviado a ${nombre}`,
  rec_sent_count: n => `Enviados (${n})`,
  rec_sent_title: 'Enviados en esta alabanza',
  rec_sent_none: 'No hay recordatorios enviados aquí.',
  rec_back: 'Volver',
};

export const en: Translations = {
  tab_create: 'Create',
  tab_minutas: 'Services',
  tab_hymnal: 'Hymnal',
  tab_settings: 'Settings',

  hymnal_title: 'Hymnal',
  hymnal_search_placeholder: 'Search by name or number',
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
  minutas_deleted: (n) => (n === 1 ? 'Service deleted' : `${n} services deleted`),
  minutas_delete_confirm_title: n => (n === 1 ? 'Delete this service?' : `Delete ${n} services?`),
  minutas_delete_confirm_text: 'It will be removed for everyone. The administrator can restore it from the history.',
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
  minuta_not_yours: 'This service belongs to someone else: you can only view or duplicate it. You can edit your copy.',
  minuta_duplicate: 'Duplicate',
  minuta_share_image: 'Share',
  minuta_share_error: 'Could not share the service.',
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
  pdf_downloaded: 'Downloaded: Himnario 2026.pdf',
  pdf_updated: 'Updated on',
  minutas_refresh: 'Refresh',
  minutas_offline: 'Offline: showing the services saved on this phone.',
  minutas_hint_select: 'Press and hold a service to select, share, pin or delete it.',
  minutas_hint_share: 'Press and hold a service to share it as an image.',
  minutas_ir_primera: 'Go to the first',
  minutas_ir_ultima: 'Go to the last',
  minutas_pin: 'Pin',
  minutas_unpin: 'Unpin',
  minutas_opciones: 'Options',
  minuta_bajar_imagen: 'Download image',

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
  especial: 'Special',
  especial_nombre: 'Name',
  editor_add: 'Add',
  fuera_boton: 'One that is not in the hymnal',
  fuera_titulo: 'Song not in the hymnal',
  fuera_texto: 'It is saved to use again.',
  fuera_nombre: 'Title',
  fuera_tonalidad: 'Key (optional)',
  fuera_imagen: 'Images (optional)',
  fuera_elegir_imagen: 'Choose image from gallery',
  fuera_quitar_imagen: 'Remove image',
  fuera_otra_imagen: (n, max) => `Add another image (${n} of ${max})`,
  fuera_max_imagenes: max => `Up to ${max} images`,
  fuera_falta_titulo: 'Enter the title.',
  fuera_etiqueta: 'not in the hymnal',
  fuera_no_esta: 'Not in the hymnal',
  fuera_imagen_subida: 'Uploaded image',
  fuera_seccion: 'Songs not in the hymnal',
  fuera_vacio: 'No saved songs yet. They are added when creating a service.',
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
  access_request: 'Sign up',
  access_dialog_title: 'Sign up',
  access_viewer: 'You can use the hymnal, even offline.',
  access_want_create: 'Sign up with your name and a color: the administrator can give you access to services, and others can leave you reminders on songs.',
  access_my_profile: 'My profile',
  settings_more: 'More options',
  access_dialog_text: 'Enter your name and pick a color: it identifies you in the app.',
  access_send: 'Sign up',
  access_name_required: 'Enter your name.',
  access_pending: 'Your request has been sent. Wait for the administrator to approve it.',
  access_check: 'Check status',
  access_approved: 'You are a creator: you can create, edit and delete services.',
  access_registered: 'You are signed up: others can leave you reminders on songs.',
  access_visor: 'You are a viewer: you can view services, and others can leave you reminders on songs.',
  access_can_remind_others: 'You can leave reminders for other people.',
  admin_can_view: 'View services',
  admin_can_create: 'Create services',
  admin_can_remind: 'Leave reminders for others',
  admin_registered: 'Signed up',
  admin_role_viewer: 'Viewer',
  admin_role_creator: 'Creator',
  access_admin: 'You are the administrator: you can create, edit and delete services, and approve creators.',
  access_rejected: 'Sign up with your name and a color so others can leave you reminders on songs.',
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
  admin_hide: 'Remove',
  admin_can_project: 'Generate projection',
  proy_titulo: 'Generate projection',
  proy_texto: 'Choose the cover scripture. The service PowerPoint with this service’s songs is saved.',
  proy_libro: 'Book',
  proy_capitulo: 'Chapter',
  proy_versiculo: 'Verse',
  proy_hasta: 'To',
  proy_sin_diapositivas: 'No slides (not in the PowerPoint):',
  proy_bajando: 'Downloading the master PowerPoint…',
  proy_armando: 'Building…',
  proy_generar: 'Generate',
  proy_listo: 'Downloaded',
  proy_error: 'Could not generate the projection.',
  proy_guardar_en: 'Save to',
  proy_descargas: 'Downloads',
  proy_elegir_carpeta: 'Choose folder',
  proy_cambiar: 'Change',
  proy_guardado: c => `Saved to “${c}”`,
  admin_hide_title: n => `Remove ${n} from the list?`,
  admin_hide_text: 'Nothing is deleted: their services and reminders stay.',
  notif_title: 'Notifications',
  notif_receive: 'Receive notifications',
  notif_need_register: 'To receive notifications, sign up with your name and a color.',
  notif_not_supported: 'This phone does not support app notifications. On iPhone, add the app to the Home Screen and open it from there.',
  notif_allow: 'Allow',
  notif_allow_text: 'This phone has not allowed them yet.',
  notif_blocked: 'Notifications are blocked on this phone. Turn them on in the phone settings for this app.',
  notif_types: 'Notify me when:',
  notif_tipo: {
    registro: 'Someone signs up', creada: 'A service is created', editada: 'A service is edited',
    publicada: 'A service is published', privada: 'A service is made private', duplicada: 'A service is duplicated',
    borrada: 'A service is deleted', restaurada: 'A service is restored', nueva_minuta: 'A new service is published', recordatorio: 'Someone leaves me a reminder', proyeccion: 'Someone generates a slideshow',
  },
  admin_requested: 'Signed up on',
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
  admin_restore_title: 'How do you want to restore it?',
  admin_restore_text: 'Choose who will see it.',
  admin_restore_mine: 'Only for you',
  admin_restore_mine_desc: 'It becomes yours and private.',
  admin_restore_public: 'Public',
  admin_restore_public_desc: 'Everyone sees it.',
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
  settings_color: 'Color',
  color_nombre: { estandar: 'Standard', rosa: 'Pink', lila: 'Lilac', damasco: 'Apricot', azul: 'Blue', salvia: 'Sage green' },
  color_corto: { estandar: 'Standard', rosa: 'Pink', lila: 'Lilac', damasco: 'Apricot', azul: 'Blue', salvia: 'Sage green' },
  rec_add: 'Add reminder',
  rec_title_new: 'New reminder',
  rec_title_edit: 'Reminder',
  rec_placeholder: 'Write what you want to remember…',
  rec_for: 'For',
  rec_for_me: 'For me',
  rec_send: 'Send',
  rec_deleted_short: 'Deleted it',
  rec_simbolo: { ojo: 'Eye', arriba: 'Up arrow', abajo: 'Down arrow', corchea: 'Eighth note' },
  rec_simbolo_texto: 'Text',
  rec_te_lo_envio: n => `${n} sent you this`,
  rec_enviado_por: n => `Sent by ${n}`,
  rec_from: 'From',
  rec_save: 'Save',
  rec_cancel: 'Cancel',
  rec_delete: 'Delete',
  rec_edit: 'Edit',
  rec_only_view: 'Someone left this for you: only who wrote it can change it.',
  rec_needs_internet: 'Internet is needed to save this reminder.',
  rec_always: 'Always on this song',
  rec_this_minuta: 'Only this service',
  rec_sent: 'Sent',
  rec_seen: 'Seen',
  rec_deleted_by: nombre => `Deleted by ${nombre}`,
  rec_delete_confirm: 'Delete this reminder?',
  rec_delete_both: nombre => `It is also deleted for ${nombre}.`,
  rec_delete_received: nombre => `${nombre} will see that you deleted it.`,
  rec_private_hint: 'This service is private: to leave it for someone else, choose "Always on this song".',
  rec_sent_to: nombre => `Sent to ${nombre}`,
  rec_sent_count: n => `Sent (${n})`,
  rec_sent_title: 'Sent on this song',
  rec_sent_none: 'No reminders sent here.',
  rec_back: 'Back',
};

export const pt: Translations = {
  tab_create: 'Criar',
  tab_minutas: 'Minutas',
  tab_hymnal: 'Hinário',
  tab_settings: 'Ajustes',

  hymnal_title: 'Hinário',
  hymnal_search_placeholder: 'Buscar por nome ou número',
  hymnal_loading: 'Carregando hinário...',
  hymnal_no_results: 'Nenhum hino encontrado',
  hymnal_filters: 'Filtros',
  hymnal_tempo: 'Andamento',
  hymnal_tempo_all: 'Todos',
  hymnal_tempo_fast: 'Rápidos',
  hymnal_tempo_slow: 'Lentos',
  hymnal_key_major: 'Tom maior',
  hymnal_key_minor: 'Tom menor',
  hymnal_clear_filters: 'Remover todos os filtros',
  hymnal_loading_short: 'Carregando...',

  hymn_alt: 'Hino #',

  minutas_title: 'Minutas',
  minutas_calendar: 'Calendário',
  minutas_loading: 'Carregando...',
  minutas_empty: 'Não há minutas salvas',
  minutas_select: 'Selecionar',
  minutas_cancel: 'Cancelar',
  minutas_delete: 'Excluir',
  minutas_save: 'Salvar',
  minutas_name_updated: 'Nome atualizado',
  minutas_date_updated: 'Data atualizada',
  minutas_error_delete: 'Erro ao excluir',
  minutas_error_rename: 'Erro ao renomear',
  minutas_deleted: (n) => (n === 1 ? 'Minuta excluída' : `${n} minutas excluídas`),
  minutas_delete_confirm_title: n => (n === 1 ? 'Excluir esta minuta?' : `Excluir ${n} minutas?`),
  minutas_delete_confirm_text: 'Será removida para todos. O administrador pode recuperá-la no histórico.',
  minutas_pinned: 'Minuta fixada',
  minutas_unpinned: 'Minuta desafixada',

  create_title: 'Criar Minuta',
  create_empty_state: 'Cole o texto da lista de louvores e eu vou gerar uma minuta organizada automaticamente',
  create_placeholder: 'Cole a lista de louvores...',
  create_preview: 'Pré-visualização',
  create_approve: 'Aprovar',
  create_saving: 'Salvando...',
  create_edit: 'Editar',
  create_corrections: 'Correções',
  create_edit_placeholder: 'Ex.: trocar o último por "Eis-me aqui"',
  create_processing: 'Processando...',
  create_saved: 'Minuta salva',
  create_discard_title: 'Descartar e começar de novo',
  create_error_process: 'Erro ao processar',
  create_error_save: 'Erro ao salvar',
  create_error_correction: 'Erro ao processar a correção',
  create_upload_photo: 'Enviar foto',
  create_reading_image: 'Processando imagem...',
  create_error_read_image: 'Não foi possível ler a imagem. Tente outra foto ou escreva o texto manualmente.',
  create_confirm_photo: 'Enviar',
  create_retry: 'Tentar de novo',

  portada_title: 'Minuta',
  portada_palabra: 'PALAVRA',
  portada_oracion: 'ORAÇÃO',
  portada_not_found: 'não encontrado',

  settings_title: 'Ajustes',
  settings_theme: 'Tema',
  theme_light_mode: 'Modo claro',
  theme_dark_mode: 'Modo escuro',
  settings_theme_light: 'Claro',
  settings_theme_dark: 'Escuro',
  settings_language: 'Idioma',
  settings_admin: 'Ações',
  settings_delete_all: 'Excluir todas as minutas',
  settings_delete_all_confirm: 'Excluir todas as minutas? Esta ação não pode ser desfeita.',
  settings_delete_all_done: 'Todas as minutas foram excluídas',
  settings_error_delete: 'Erro ao excluir',
  settings_sign_out: 'Sair',
  settings_user: 'usuário',
  offline_title: 'Uso sem internet',
  offline_ready: 'Pronto: todos os hinos estão salvos neste aparelho.',
  offline_preparing: (hechos, total) => `Preparando os hinos para usar sem internet… ${hechos} / ${total}`,
  offline_unsupported: 'Abra o app instalado (ou com internet) para salvar os hinos.',
  settings_version: 'Versão',

  minuta_creada_por: 'Criada por',
  minuta_duplicada_por: 'Duplicada por',
  minuta_not_yours: 'Esta minuta é de outra pessoa: você só pode vê-la ou duplicá-la. A sua cópia você pode editar.',
  minuta_duplicate: 'Duplicar',
  minuta_share_image: 'Compartilhar',
  minuta_share_error: 'Não foi possível compartilhar a minuta.',
  minuta_duplicated_toast: 'Minuta duplicada: a cópia é sua e fica só para você.',
  minuta_publish_changes: 'Publicar alterações',
  minuta_changes_published_toast: 'Alterações publicadas.',
  minuta_editada_por: 'Editada por',
  minuta_not_found: 'Minuta não encontrada. Abra-a uma vez com internet para salvá-la no celular.',
  minuta_share: 'Compartilhar pelo WhatsApp',
  minuta_fullscreen: 'Tela cheia',
  minuta_exit_fullscreen: 'Sair da tela cheia',
  minuta_publish: 'Publicar',
  minuta_make_private: 'Tornar privada',
  minuta_badge_public: 'Pública',
  minuta_badge_private: 'Só você',
  minuta_published_toast: 'Minuta publicada: agora todos a veem.',
  minuta_private_toast: 'Agora só você vê esta minuta.',
  minuta_saved_private_toast: 'Salva. Só você a vê até publicá-la.',
  pdf_title: 'Hinário em PDF',
  pdf_description: 'A versão mais recente do hinário completo, para baixar ou imprimir.',
  pdf_download: 'Baixar PDF',
  pdf_downloaded: 'Baixado: Himnario 2026.pdf',
  pdf_updated: 'Atualizado em',
  minutas_refresh: 'Atualizar',
  minutas_offline: 'Sem conexão: mostrando as minutas salvas neste celular.',
  minutas_hint_select: 'Mantenha pressionada uma minuta para selecioná-la, compartilhá-la, fixá-la ou excluí-la.',
  minutas_hint_share: 'Mantenha pressionada uma minuta para compartilhá-la como imagem.',
  minutas_ir_primera: 'Ir para a primeira',
  minutas_ir_ultima: 'Ir para a última',
  minutas_pin: 'Fixar',
  minutas_unpin: 'Desafixar',
  minutas_opciones: 'Opções',
  minuta_bajar_imagen: 'Baixar imagem',

  editor_title_edit: 'Editar minuta',
  editor_mode_manual: 'Manual',
  editor_mode_ai: 'Automático',
  ia_badge: 'IA',
  ia_checking: 'Verificando a IA…',
  ia_state_on: 'Disponível',
  ia_state_off: 'Indisponível',
  ia_off_hint: 'A foto com IA está desligada por enquanto. Use o texto ou o modo manual.',
  ia_remaining: n => `${n} fotos hoje`,
  ia_photo_title: 'A partir de uma foto',
  ia_camera: 'Câmera',
  ia_gallery: 'Galeria',
  ia_reading_photo: 'Lendo a foto…',
  ia_text_title: 'A partir de texto (por exemplo, do WhatsApp)',
  ia_generate: 'Gerar minuta',
  ia_text_hint: 'Sem IA: o app lê o texto, funciona sempre, até sem internet.',
  ia_nothing_found: 'Nenhum louvor encontrado nesse texto.',
  ia_review: (total, faltan) => faltan
    ? `Revise a minuta: ${total} louvores, ${faltan} não encontrados (em vermelho).`
    : `Pronto: ${total} louvores. Revise e salve.`,
  ia_note_separator: (cual, dia, porCantos) =>
    `O traço foi considerado ${cual === 'oracion' ? 'Oração' : 'Palavra'} (${dia === 'miercoles' ? 'quarta-feira' : 'domingo'}${
      porCantos != null ? `, por ter ${porCantos} louvores` : ''}).`,
  admin_ia_title: 'IA para ler fotos',
  admin_ia_creators: 'Permitir aos criadores',
  admin_ia_creators_desc: 'Usam a mesma cota grátis do Gemini (máx. 10 fotos por pessoa por dia).',
  editor_unsaved_title: 'Sair sem salvar?',
  editor_unsaved_text: 'Você fez alterações nesta minuta que ainda não foram salvas.',
  editor_discard: 'Descartar alterações',
  editor_discard_new: 'Descartar',
  editor_unsaved_text_new: 'Esta nova minuta ainda não foi salva.',
  editor_keep_editing: 'Continuar editando',
  editor_title_placeholder: 'Título (opcional)',
  editor_add_song: 'Louvor',
  editor_done: 'Pronto',
  especial: 'Especial',
  especial_nombre: 'Nome',
  editor_add: 'Adicionar',
  fuera_boton: 'Uma que não está no hinário',
  fuera_titulo: 'Louvor fora do hinário',
  fuera_texto: 'Fica salvo para usar de novo.',
  fuera_nombre: 'Título',
  fuera_tonalidad: 'Tom (opcional)',
  fuera_imagen: 'Imagens (opcional)',
  fuera_elegir_imagen: 'Escolher imagem da galeria',
  fuera_quitar_imagen: 'Remover imagem',
  fuera_otra_imagen: (n, max) => `Adicionar outra imagem (${n} de ${max})`,
  fuera_max_imagenes: max => `Máximo ${max} imagens`,
  fuera_falta_titulo: 'Escreva o título.',
  fuera_etiqueta: 'fora do hinário',
  fuera_no_esta: 'Não está no hinário',
  fuera_imagen_subida: 'Imagem enviada',
  fuera_seccion: 'Canções que não estão no hinário',
  fuera_vacio: 'Ainda não há canções salvas. São adicionadas ao criar uma minuta.',
  editor_empty: 'Adicione pelo menos um louvor.',
  editor_empty_hint: 'Toque em "+ Louvor" para buscar e adicionar louvores.',
  editor_no_access: 'Para criar minutas, peça acesso em Ajustes. O administrador precisa aprovar.',
  editor_needs_internet: 'É preciso internet para salvar.',
  editor_group: 'Agrupar com o seguinte',
  editor_ungroup: 'Separar',
  editor_group_hint: 'Mantenha pressionada uma linha para movê-la; deslize-a para o lado para excluí-la. A corrente a agrupa com a seguinte.',
  editor_up: 'Subir',
  editor_down: 'Descer',

  access_title: 'Criar minutas',
  access_intro: 'Para criar ou editar minutas, peça acesso de criador. O administrador vai aprovar.',
  access_request: 'Cadastrar-me',
  access_dialog_title: 'Cadastrar-me',
  access_viewer: 'Você pode usar o hinário, até sem internet.',
  access_want_create: 'Cadastre-se com seu nome e uma cor: o administrador pode dar acesso às minutas, e podem deixar lembretes para você nos louvores.',
  access_my_profile: 'Meu perfil',
  settings_more: 'Mais opções',
  access_dialog_text: 'Escreva seu nome e escolha uma cor: assim reconhecem você no app.',
  access_send: 'Cadastrar-me',
  access_name_required: 'Escreva seu nome.',
  access_pending: 'Sua solicitação foi enviada. Aguarde o administrador aprovar.',
  access_check: 'Verificar status',
  access_approved: 'Você é criador: pode criar, editar e excluir minutas.',
  access_registered: 'Você está cadastrado: podem deixar lembretes para você nos louvores.',
  access_visor: 'Você é visor: pode ver as minutas e podem deixar lembretes para você nos louvores.',
  access_can_remind_others: 'Você pode deixar lembretes para outras pessoas.',
  admin_can_view: 'Ver minutas',
  admin_can_create: 'Criar minutas',
  admin_can_remind: 'Deixar lembretes para outros',
  admin_registered: 'Cadastrado',
  admin_role_viewer: 'Leitor',
  admin_role_creator: 'Criador',
  access_admin: 'Você é administrador: pode criar, editar e excluir minutas, e aprovar criadores.',
  access_rejected: 'Cadastre-se com seu nome e uma cor: assim podem deixar lembretes para você nos louvores.',
  access_disabled: 'O administrador desativou o acesso deste celular.',
  access_edit_profile: 'Mudar nome ou cor',

  admin_title: 'Administração',
  admin_only: 'Só o administrador pode ver esta tela.',
  admin_activate: 'Ativar como administrador',
  admin_activate_button: 'Ativar',
  admin_key_placeholder: 'Senha de administrador',
  admin_activated: 'Este celular agora é o administrador.',
  admin_people: 'Pessoas',
  admin_history: 'Histórico',
  admin_pending_requests: 'Solicitações pendentes',
  admin_no_people: 'Ninguém se cadastrou ainda.',
  admin_hide: 'Remover',
  admin_can_project: 'Gerar projeção',
  proy_titulo: 'Gerar projeção',
  proy_texto: 'Escolha a escritura da capa. O PowerPoint do culto com os louvores desta minuta é salvo.',
  proy_libro: 'Livro',
  proy_capitulo: 'Capítulo',
  proy_versiculo: 'Versículo',
  proy_hasta: 'Até',
  proy_sin_diapositivas: 'Sem slides (não vão no PowerPoint):',
  proy_bajando: 'Baixando o PowerPoint mestre…',
  proy_armando: 'Montando…',
  proy_generar: 'Gerar',
  proy_listo: 'Baixado',
  proy_error: 'Não foi possível gerar a projeção.',
  proy_guardar_en: 'Salvar em',
  proy_descargas: 'Downloads',
  proy_elegir_carpeta: 'Escolher pasta',
  proy_cambiar: 'Mudar',
  proy_guardado: c => `Salvo em «${c}»`,
  admin_hide_title: n => `Remover ${n} da lista?`,
  admin_hide_text: 'Nada é apagado: as minutas e lembretes continuam.',
  notif_title: 'Notificações',
  notif_receive: 'Receber notificações',
  notif_need_register: 'Para receber notificações, cadastre-se com seu nome e uma cor.',
  notif_not_supported: 'Este celular não aceita notificações do app. No iPhone, instale o app na tela de início e abra por lá.',
  notif_allow: 'Permitir',
  notif_allow_text: 'Este celular ainda não permitiu mostrá-las.',
  notif_blocked: 'As notificações estão bloqueadas neste celular. Ative-as nos ajustes do telefone para este app.',
  notif_types: 'Avisar quando:',
  notif_tipo: {
    registro: 'Alguém se cadastra', creada: 'Uma minuta é criada', editada: 'Uma minuta é editada',
    publicada: 'Uma minuta é publicada', privada: 'Uma minuta fica privada', duplicada: 'Uma minuta é duplicada',
    borrada: 'Uma minuta é excluída', restaurada: 'Uma minuta é restaurada', nueva_minuta: 'Uma nova minuta é publicada', recordatorio: 'Alguém me deixa um lembrete', proyeccion: 'Alguém gera uma projeção',
  },
  admin_requested: 'Cadastrou-se em',
  admin_this_device: 'este celular',
  admin_role_admin: 'Administrador',
  admin_state_pending: 'Pendente',
  admin_state_approved: 'Aprovado',
  admin_state_rejected: 'Recusado',
  admin_state_disabled: 'Desativado',
  admin_approve: 'Aprovar',
  admin_reject: 'Recusar',
  admin_disable: 'Desativar',
  admin_enable: 'Ativar',
  admin_restore: 'Restaurar',
  admin_restored: 'Minuta restaurada.',
  admin_restore_title: 'Como quer restaurá-la?',
  admin_restore_text: 'Escolha quem vai vê-la.',
  admin_restore_mine: 'Só para você',
  admin_restore_mine_desc: 'Passa a ser sua e privada.',
  admin_restore_public: 'Pública',
  admin_restore_public_desc: 'Todos a veem.',
  admin_action_created: 'Criou',
  admin_action_edited: 'Editou',
  admin_action_deleted: 'Excluiu',
  admin_action_restored: 'Restaurou',
  admin_action_published: 'Publicou',
  admin_action_private: 'Tornou privada',
  admin_action_duplicated: 'Duplicou',

  auth_title: 'Hymnal',
  auth_login_subtitle: 'Entre para continuar',
  auth_signup_subtitle: 'Crie sua conta',
  auth_email: 'E-mail',
  auth_password: 'Senha',
  auth_create_password: 'Criar senha',
  auth_loading: 'Carregando...',
  auth_login: 'Entrar',
  auth_signup: 'Criar conta',
  auth_switch_to_signup: 'Não tem conta? Cadastre-se',
  auth_switch_to_login: 'Já tem conta? Entre',
  auth_error: 'Erro de autenticação',

  setup_title: 'Configure seu perfil',
  setup_subtitle: 'Escolha um nome e uma cor',
  setup_name_placeholder: 'Seu nome',
  setup_color: 'Sua cor',
  setup_saving: 'Salvando...',
  setup_continue: 'Continuar',
  setup_error: 'Erro ao criar o perfil',

  notifications_title: 'Notificações',
  notifications_toggle_label: 'Notificações no app',
  notifications_empty: 'Nenhuma atividade registrada',
  notifications_created: 'criou uma minuta',
  notifications_edited: 'editou uma minuta',
  notifications_deleted: 'excluiu uma minuta',
  notifications_registered: 'se cadastrou',
  notifications_at: 'às',
  notifications_loading: 'Carregando histórico...',

  loading: 'Carregando...',
  settings_color: 'Cor',
  color_nombre: { estandar: 'Padrão', rosa: 'Rosa', lila: 'Lilás', damasco: 'Damasco', azul: 'Azul', salvia: 'Verde sálvia' },
  color_corto: { estandar: 'Padrão', rosa: 'Rosa', lila: 'Lilás', damasco: 'Damasco', azul: 'Azul', salvia: 'Sálvia' },
  rec_add: 'Adicionar lembrete',
  rec_title_new: 'Novo lembrete',
  rec_title_edit: 'Lembrete',
  rec_placeholder: 'Escreva o que você quer lembrar…',
  rec_for: 'Para',
  rec_for_me: 'Para mim',
  rec_send: 'Enviar',
  rec_deleted_short: 'Excluiu',
  rec_simbolo: { ojo: 'Olho', arriba: 'Seta para cima', abajo: 'Seta para baixo', corchea: 'Colcheia' },
  rec_simbolo_texto: 'Texto',
  rec_te_lo_envio: n => `${n} enviou para você`,
  rec_enviado_por: n => `Enviado por ${n}`,
  rec_from: 'De',
  rec_save: 'Salvar',
  rec_cancel: 'Cancelar',
  rec_delete: 'Excluir',
  rec_edit: 'Editar',
  rec_only_view: 'Outra pessoa deixou para você: só quem escreveu pode alterá-lo.',
  rec_needs_internet: 'É preciso internet para salvar este lembrete.',
  rec_always: 'Sempre neste louvor',
  rec_this_minuta: 'Só nesta minuta',
  rec_sent: 'Enviado',
  rec_seen: 'Visto',
  rec_deleted_by: nombre => `Excluído por ${nombre}`,
  rec_delete_confirm: 'Excluir este lembrete?',
  rec_delete_both: nombre => `Também será excluído para ${nombre}.`,
  rec_delete_received: nombre => `${nombre} verá que você o excluiu.`,
  rec_private_hint: 'Esta minuta é privada: para deixar para outra pessoa, escolha "Sempre neste louvor".',
  rec_sent_to: nombre => `Enviado para ${nombre}`,
  rec_sent_count: n => `Enviados (${n})`,
  rec_sent_title: 'Enviados neste louvor',
  rec_sent_none: 'Nenhum lembrete enviado aqui.',
  rec_back: 'Voltar',
};

const translations: Record<Locale, Translations> = { es, en, pt };
export default translations;
