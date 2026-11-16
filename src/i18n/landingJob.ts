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
  },
  ...LANDING_JOB_GENERATED,
};

export function landingJob(lang: string | null | undefined): LandingJob {
  const l = (lang ?? "en").split("-")[0];
  return LANDING_JOB[l] ?? LANDING_JOB.en;
}

export const fillVars = (s: string, v: Record<string, string | number>) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(v[k] ?? ""));
