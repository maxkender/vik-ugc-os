/**
 * Landing : titre au format offre d'emploi, section « Le job », simulateur « Voir ma rémunération » et encadré
 * d'avertissement (16/11, Max). EN / FR / ES écrits à la main ; autres langues générées (scripts/translate-landing-job.mts),
 * à faire relire. Repli anglais.
 */
import { LANDING_JOB_GENERATED } from "./landingJob.generated";

export interface LandingJob {
  heroTitle: string; heroSubtitle: string;
  jobTitle: string; videosTitle: string; videosText: string; examplesTitle: string;
  dailyTitle: string; dailyText: string;
  payTitle: string; payCountry: string; payZone: string; payPerVideo: string; payRpm: string; payRpmDetail: string; payCap: string;
  payExample: string; payNote: string;
  warning: string;
  /** Bouton collant : « {{price}} per video » (ordre des mots propre à chaque langue). */
  pricePerVideo: string;
  iphoneTitle: string; iphoneText: string; faqIphoneQ: string; faqIphoneA: string;
  applyIphone: string; yes: string; no: string; iphoneBlocked: string;
  yapLinkToggle: string; yapLinkLabel: string; yapLinkHint: string; yapLinkInvalid: string; yapLinkOk: string;
  yapUploadFailed: string; yapTypeError: string; yapSizeError: string;
}

export const LANDING_JOB: Record<string, LandingJob> = {
  en: {
    heroTitle: "Job: UGC content creator for a mobile app",
    heroSubtitle: "Film your own quality UGC videos with your phone and post them on TikTok and Instagram to promote an app (an AI study app to start). 1 video a day, paid per validated video plus a views bonus.",
    jobTitle: "The job", videosTitle: "The videos",
    videosText: "UGC videos you film yourself with your phone (face cam, reaction, tutorial, before/after…), posted on your TikTok and Instagram to promote a mobile app. Quality matters: good light, clear sound, a strong hook.",
    examplesTitle: "Examples of videos we're looking for",
    dailyTitle: "Daily posts", dailyText: "1 video a day, every day: you need to be consistent. We check the quality and regularity of every video, and only validated videos are paid.",
    payTitle: "View my pay", payCountry: "Your country", payZone: "Zone {{zone}}", payPerVideo: "Per validated video", payRpm: "Views bonus",
    payRpmDetail: "{{rpm}} per 1,000 views (counted at D+7)", payCap: "Bonus cap per video",
    payExample: "Example: 1 validated video with {{views}} views = {{base}} + {{bonus}}",
    payNote: "Views are counted 7 days after posting. Only validated videos are paid. Weekly payment via Ruul.",
    warning: "PLEASE: IF THE REMUNERATION DOESN'T SUIT YOU, OR THE PROJECT DOESN'T FIT YOU, PLEASE DON'T GO ANY FURTHER.",
    pricePerVideo: "{{price}} per video",
    iphoneTitle: "iPhone required",
    iphoneText: "You need an iPhone: you film and edit on it, and the premium access to the app we give you works on iPhone only.",
    faqIphoneQ: "Do I need an iPhone?",
    faqIphoneA: "Yes. You film with your iPhone and we give you free premium access to the app, which only works on iPhone. Android phones are not accepted for this job.",
    applyIphone: "Do you have an iPhone?",
    yes: "Yes",
    no: "No",
    iphoneBlocked: "Thanks for your interest! This job requires an iPhone (the app and the premium access we provide are iPhone only), so we can't accept your application for now.",
    yapLinkToggle: "Video too big? Paste a link instead",
    yapLinkLabel: "Link to your video",
    yapLinkHint: "YouTube (even unlisted), Instagram, TikTok, Google Drive, Dropbox, WeTransfer or iCloud. Make sure the link is accessible.",
    yapLinkInvalid: "Use a https link from YouTube, Instagram, TikTok, Google Drive, Dropbox, WeTransfer or iCloud.",
    yapLinkOk: "Link accepted ✓",
    yapUploadFailed: "The upload didn't work. No problem: paste a link to your video below (YouTube unlisted, Google Drive, iCloud…).",
    yapTypeError: "This file isn't a video. Choose a video (MP4, MOV) or paste a link below.",
    yapSizeError: "This video is over 200 MB. Paste a link to it below instead.",
  },
  fr: {
    heroTitle: "Job : créateur·rice de contenu UGC pour une app mobile",
    heroSubtitle: "Tu tournes tes propres vidéos UGC de qualité avec ton téléphone et tu les publies sur TikTok et Instagram pour promouvoir une app (une app d'étude IA pour commencer). 1 vidéo par jour, payée par vidéo validée plus un bonus aux vues.",
    jobTitle: "Le job", videosTitle: "Les vidéos",
    videosText: "Des vidéos UGC que tu tournes toi-même au téléphone (face cam, réaction, tuto, avant/après…), publiées sur ton TikTok et ton Instagram pour promouvoir une app mobile. La qualité compte : bonne lumière, son clair, hook fort.",
    examplesTitle: "Exemples de vidéos qu'on recherche",
    dailyTitle: "Publications quotidiennes", dailyText: "1 vidéo par jour, tous les jours : il faut être régulier·e. On vérifie la qualité et la régularité de chaque vidéo, et seules les vidéos validées sont payées.",
    payTitle: "Voir ma rémunération", payCountry: "Ton pays", payZone: "Zone {{zone}}", payPerVideo: "Par vidéo validée", payRpm: "Bonus aux vues",
    payRpmDetail: "{{rpm}} pour 1 000 vues (comptées à J+7)", payCap: "Plafond du bonus par vidéo",
    payExample: "Exemple : 1 vidéo validée avec {{views}} vues = {{base}} + {{bonus}}",
    payNote: "Les vues sont comptées 7 jours après la publication. Seules les vidéos validées sont payées. Paiement chaque semaine via Ruul.",
    warning: "S'IL TE PLAÎT : SI LA RÉMUNÉRATION NE TE CONVIENT PAS, OU SI LE PROJET NE TE CORRESPOND PAS, NE VA PAS PLUS LOIN.",
    pricePerVideo: "{{price}} par vidéo",
    iphoneTitle: "iPhone requis",
    iphoneText: "Il te faut un iPhone : tu tournes et montes dessus, et l'accès premium à l'app qu'on te donne fonctionne uniquement sur iPhone.",
    faqIphoneQ: "Faut-il un iPhone ?",
    faqIphoneA: "Oui. Tu filmes avec ton iPhone et on t'offre un accès premium à l'app, qui ne fonctionne que sur iPhone. Les téléphones Android ne sont pas acceptés pour ce job.",
    applyIphone: "Tu as un iPhone ?",
    yes: "Oui",
    no: "Non",
    iphoneBlocked: "Merci pour ton intérêt ! Ce job demande un iPhone (l'app et l'accès premium qu'on fournit sont uniquement sur iPhone) : on ne peut donc pas accepter ta candidature pour l'instant.",
    yapLinkToggle: "Ta vidéo est trop lourde ? Colle un lien",
    yapLinkLabel: "Lien vers ta vidéo",
    yapLinkHint: "YouTube (même non répertoriée), Instagram, TikTok, Google Drive, Dropbox, WeTransfer ou iCloud. Vérifie que le lien est accessible.",
    yapLinkInvalid: "Utilise un lien https YouTube, Instagram, TikTok, Google Drive, Dropbox, WeTransfer ou iCloud.",
    yapLinkOk: "Lien accepté ✓",
    yapUploadFailed: "L'envoi n'a pas fonctionné. Pas de souci : colle ci-dessous un lien vers ta vidéo (YouTube non répertoriée, Google Drive, iCloud…).",
    yapTypeError: "Ce fichier n'est pas une vidéo. Choisis une vidéo (MP4, MOV) ou colle un lien ci-dessous.",
    yapSizeError: "Cette vidéo dépasse 200 Mo. Colle plutôt un lien vers ta vidéo ci-dessous.",
  },
  es: {
    heroTitle: "Trabajo: creador/a de contenido UGC para una app móvil",
    heroSubtitle: "Grabas tus propios videos UGC de calidad con tu celular y los publicas en TikTok e Instagram para promocionar una app (una app de estudio con IA para empezar). 1 video al día, pago por video validado más un bono por vistas.",
    jobTitle: "El trabajo", videosTitle: "Los videos",
    videosText: "Videos UGC que grabas tú mismo/a con tu celular (face cam, reacción, tutorial, antes/después…), publicados en tu TikTok e Instagram para promocionar una app móvil. La calidad importa: buena luz, sonido claro y un hook fuerte.",
    examplesTitle: "Ejemplos de videos que buscamos",
    dailyTitle: "Publicaciones diarias", dailyText: "1 video al día, todos los días: necesitas ser constante. Revisamos la calidad y la constancia de cada video, y solo se pagan los videos validados.",
    payTitle: "Ver mi pago", payCountry: "Tu país", payZone: "Zona {{zone}}", payPerVideo: "Por video validado", payRpm: "Bono por vistas",
    payRpmDetail: "{{rpm}} por cada 1.000 vistas (contadas a los 7 días)", payCap: "Tope del bono por video",
    payExample: "Ejemplo: 1 video validado con {{views}} vistas = {{base}} + {{bonus}}",
    payNote: "Las vistas se cuentan 7 días después de publicar. Solo se pagan los videos validados. Pago semanal a través de Ruul.",
    warning: "POR FAVOR: SI LA REMUNERACIÓN NO TE CONVIENE, O EL PROYECTO NO ES PARA TI, NO SIGAS ADELANTE.",
    pricePerVideo: "{{price}} por video",
    iphoneTitle: "iPhone obligatorio",
    iphoneText: "Necesitas un iPhone: grabas y editas con él, y el acceso premium a la app que te damos solo funciona en iPhone.",
    faqIphoneQ: "¿Necesito un iPhone?",
    faqIphoneA: "Sí. Grabas con tu iPhone y te damos acceso premium gratis a la app, que solo funciona en iPhone. Los teléfonos Android no se aceptan para este trabajo.",
    applyIphone: "¿Tienes un iPhone?",
    yes: "Sí",
    no: "No",
    iphoneBlocked: "¡Gracias por tu interés! Este trabajo requiere un iPhone (la app y el acceso premium que damos son solo para iPhone), así que por ahora no podemos aceptar tu postulación.",
    yapLinkToggle: "¿Tu video pesa demasiado? Pega un link",
    yapLinkLabel: "Link a tu video",
    yapLinkHint: "YouTube (aunque sea oculto), Instagram, TikTok, Google Drive, Dropbox, WeTransfer o iCloud. Revisa que el link sea accesible.",
    yapLinkInvalid: "Usa un link https de YouTube, Instagram, TikTok, Google Drive, Dropbox, WeTransfer o iCloud.",
    yapLinkOk: "Link aceptado ✓",
    yapUploadFailed: "La subida no funcionó. Sin problema: pega abajo un link a tu video (YouTube oculto, Google Drive, iCloud…).",
    yapTypeError: "Este archivo no es un video. Elige un video (MP4, MOV) o pega un link abajo.",
    yapSizeError: "Este video pesa más de 200 MB. Mejor pega un link a tu video abajo.",
  },
  ...LANDING_JOB_GENERATED,
};

export function landingJob(lang: string | null | undefined): LandingJob {
  const l = (lang ?? "en").split("-")[0];
  return LANDING_JOB[l] ?? LANDING_JOB.en;
}

export const fillVars = (s: string, v: Record<string, string | number>) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(v[k] ?? ""));
