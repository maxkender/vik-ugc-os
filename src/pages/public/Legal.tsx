import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/brand/Logo";
import { LangSwitcher } from "./Landing";

/**
 * Pages publiques /privacy et /terms (ES / EN / FR ; repli EN). Requises par Meta pour passer l'app en Live
 * et pour la catégorie Emploi. Contact : support@vikstudios.com. L'adresse légale est à compléter (Réglages → Société).
 */
type Section = [title: string, paragraphs: string[]];
type Doc = { title: string; updated: string; intro: string; sections: Section[] };

const CONTACT = "support@vikstudios.com";
const UPDATED = "2026-11-16";

const PRIVACY: Record<"es" | "en" | "fr", Doc> = {
  en: {
    title: "Privacy policy", updated: `Last updated: ${UPDATED}`,
    intro: `This policy explains how Vik Studios SAS ("Vik Studios", "we") processes personal data when you visit our creator recruitment pages, apply to our paid UGC creator programme, or work with us as a creator. Contact: ${CONTACT}.`,
    sections: [
      ["Data we collect", [
        "Application: first and last name, date of birth (to check you are 18+), email, phone (optional), country, languages, links to your TikTok / Instagram profiles and follower counts, your experience, equipment, availability and motivation, and the short introduction video you upload.",
        "Contract: name typed as signature, date and time, IP address and a fingerprint of the signed document (proof of electronic signature).",
        "Creator activity: links to the videos you post for us, their view counts (collected from the public platforms), payments, your Ruul payout email, and messages you send to the creator assistant.",
        "Website and ads: if you accept cookies, the Meta pixel records page views and your application (Lead), and the Meta click identifier (fbclid / _fbc / _fbp). We send the same Lead event from our server (Meta Conversions API) with your email, phone and country hashed (SHA-256), never in clear text.",
      ]],
      ["Why we use it (legal basis)", [
        "Reviewing applications and onboarding creators: pre-contractual steps and contract performance.",
        "Paying creators and keeping accounting records: contract performance and legal obligations.",
        "Measuring and improving our recruitment ads (Meta pixel and Conversions API): your consent, which you can withdraw at any time.",
        "Security, fraud prevention and proof of signature: our legitimate interest.",
      ]],
      ["Who processes it", [
        "Supabase (database, file storage and server functions, hosted in the EU, Ireland), Vercel (website hosting), Brevo (transactional emails), Meta Platforms (ads measurement, only with your consent), Ruul (creator payments), Apify (public view counts of posted videos), fal.ai and AI model providers (creator assistant answers and internal video classification).",
        "Some providers are located outside the EU (notably in the United States); transfers rely on the European Commission's standard contractual clauses or an adequacy decision.",
        "We never sell your personal data.",
      ]],
      ["How long we keep it", [
        "Rejected or withdrawn applications: 12 months, then deleted. Creators: for the duration of the collaboration, then 3 years; invoices and payment records: as long as required by law (up to 10 years). Introduction videos: deleted with the application. Advertising cookies: 90 days at most.",
      ]],
      ["Your rights", [
        `You can access, correct, delete or export your data, object to or restrict its processing, and withdraw your consent at any time by writing to ${CONTACT}. You can also lodge a complaint with your data protection authority (in France, the CNIL).`,
        "Our programme is for adults only (18+). We do not knowingly collect data from minors.",
      ]],
      ["Data deletion", [
        `To delete your application, creator account and all related data, email ${CONTACT} from the address you applied with, with the subject "Delete my data". We delete everything within 30 days (except records we must keep by law) and confirm by email.`,
        "To stop ad measurement in your browser, choose \"Decline\" in the cookie banner or clear this site's cookies.",
      ]],
    ],
  },
  es: {
    title: "Política de privacidad", updated: `Última actualización: ${UPDATED}`,
    intro: `Esta política explica cómo Vik Studios SAS («Vik Studios», «nosotros») trata tus datos personales cuando visitas nuestras páginas de reclutamiento de creadores, te postulas a nuestro programa remunerado de creadores UGC o colaboras con nosotros. Contacto: ${CONTACT}.`,
    sections: [
      ["Datos que recopilamos", [
        "Postulación: nombre y apellido, fecha de nacimiento (para verificar que tienes 18 años o más), email, teléfono (opcional), país, idiomas, enlaces a tus perfiles de TikTok / Instagram y número de seguidores, tu experiencia, equipo, disponibilidad y motivación, y el video corto de presentación que subes.",
        "Contrato: nombre escrito como firma, fecha y hora, dirección IP y una huella del documento firmado (prueba de firma electrónica).",
        "Actividad como creador: enlaces a los videos que publicas para nosotros, sus vistas (obtenidas de las plataformas públicas), pagos, tu email de cobro en Ruul y los mensajes que envías al asistente de creadores.",
        "Sitio web y anuncios: si aceptas las cookies, el píxel de Meta registra las visitas y tu postulación (Lead), y el identificador de clic de Meta (fbclid / _fbc / _fbp). Enviamos el mismo evento Lead desde nuestro servidor (API de Conversiones de Meta) con tu email, teléfono y país cifrados (SHA-256), nunca en claro.",
      ]],
      ["Para qué los usamos (base legal)", [
        "Revisar postulaciones e incorporar creadores: medidas precontractuales y ejecución del contrato.",
        "Pagar a los creadores y llevar la contabilidad: ejecución del contrato y obligaciones legales.",
        "Medir y mejorar nuestros anuncios de reclutamiento (píxel de Meta y API de Conversiones): tu consentimiento, que puedes retirar en cualquier momento.",
        "Seguridad, prevención de fraude y prueba de firma: nuestro interés legítimo.",
      ]],
      ["Quién los trata", [
        "Supabase (base de datos, archivos y funciones del servidor, alojados en la UE, Irlanda), Vercel (alojamiento web), Brevo (emails), Meta Platforms (medición de anuncios, solo con tu consentimiento), Ruul (pagos a creadores), Apify (vistas públicas de los videos publicados), fal.ai y proveedores de modelos de IA (respuestas del asistente y clasificación interna de videos).",
        "Algunos proveedores están fuera de la UE (en particular en Estados Unidos); las transferencias se basan en las cláusulas contractuales tipo de la Comisión Europea o en una decisión de adecuación.",
        "Nunca vendemos tus datos personales.",
      ]],
      ["Cuánto tiempo los conservamos", [
        "Postulaciones rechazadas o retiradas: 12 meses y luego se eliminan. Creadores: mientras dure la colaboración y 3 años más; facturas y pagos: el tiempo que exija la ley (hasta 10 años). Videos de presentación: se eliminan con la postulación. Cookies publicitarias: 90 días como máximo.",
      ]],
      ["Tus derechos", [
        `Puedes acceder a tus datos, corregirlos, eliminarlos o exportarlos, oponerte a su tratamiento o limitarlo, y retirar tu consentimiento en cualquier momento escribiendo a ${CONTACT}. También puedes presentar una reclamación ante tu autoridad de protección de datos (en Francia, la CNIL).`,
        "Nuestro programa es solo para mayores de edad (18+). No recopilamos datos de menores a sabiendas.",
      ]],
      ["Eliminación de datos", [
        `Para eliminar tu postulación, tu cuenta de creador y todos los datos asociados, escribe a ${CONTACT} desde el email con el que te postulaste, con el asunto «Eliminar mis datos». Lo eliminamos todo en un plazo de 30 días (salvo lo que la ley nos obliga a conservar) y te lo confirmamos por email.`,
        "Para detener la medición publicitaria en tu navegador, elige «Rechazar» en el aviso de cookies o borra las cookies de este sitio.",
      ]],
    ],
  },
  fr: {
    title: "Politique de confidentialité", updated: `Dernière mise à jour : ${UPDATED}`,
    intro: `Cette politique explique comment Vik Studios SAS (« Vik Studios », « nous ») traite vos données personnelles lorsque vous visitez nos pages de recrutement de créateurs, postulez à notre programme rémunéré de créateurs UGC ou collaborez avec nous. Contact : ${CONTACT}.`,
    sections: [
      ["Données collectées", [
        "Candidature : prénom et nom, date de naissance (pour vérifier que vous avez 18 ans ou plus), email, téléphone (facultatif), pays, langues, liens vers vos profils TikTok / Instagram et nombre d'abonnés, expérience, matériel, disponibilités et motivation, et la courte vidéo de présentation que vous envoyez.",
        "Contrat : nom saisi comme signature, date et heure, adresse IP et empreinte du document signé (preuve de signature électronique).",
        "Activité de créateur : liens des vidéos publiées pour nous, leurs vues (relevées sur les plateformes publiques), paiements, email Ruul de paiement et messages envoyés à l'assistant créateurs.",
        "Site et publicités : si vous acceptez les cookies, le pixel Meta enregistre les pages vues et votre candidature (Lead), ainsi que l'identifiant de clic Meta (fbclid / _fbc / _fbp). Nous envoyons le même événement Lead depuis notre serveur (API Conversions de Meta) avec votre email, téléphone et pays hachés (SHA-256), jamais en clair.",
      ]],
      ["Finalités et bases légales", [
        "Examiner les candidatures et intégrer les créateurs : mesures précontractuelles et exécution du contrat.",
        "Payer les créateurs et tenir la comptabilité : exécution du contrat et obligations légales.",
        "Mesurer et améliorer nos publicités de recrutement (pixel Meta et API Conversions) : votre consentement, retirable à tout moment.",
        "Sécurité, prévention de la fraude et preuve de signature : notre intérêt légitime.",
      ]],
      ["Destinataires et sous-traitants", [
        "Supabase (base de données, fichiers et fonctions serveur, hébergés dans l'UE, Irlande), Vercel (hébergement du site), Brevo (emails), Meta Platforms (mesure publicitaire, uniquement avec votre consentement), Ruul (paiement des créateurs), Apify (vues publiques des vidéos publiées), fal.ai et fournisseurs de modèles d'IA (réponses de l'assistant et classement interne des vidéos).",
        "Certains prestataires sont situés hors de l'UE (notamment aux États-Unis) ; les transferts reposent sur les clauses contractuelles types de la Commission européenne ou une décision d'adéquation.",
        "Nous ne vendons jamais vos données personnelles.",
      ]],
      ["Durées de conservation", [
        "Candidatures refusées ou retirées : 12 mois, puis suppression. Créateurs : durée de la collaboration, puis 3 ans ; factures et paiements : durée légale (jusqu'à 10 ans). Vidéos de présentation : supprimées avec la candidature. Cookies publicitaires : 90 jours maximum.",
      ]],
      ["Vos droits", [
        `Vous pouvez accéder à vos données, les rectifier, les effacer ou les exporter, vous opposer à leur traitement ou le limiter, et retirer votre consentement à tout moment en écrivant à ${CONTACT}. Vous pouvez aussi saisir la CNIL.`,
        "Notre programme est réservé aux personnes majeures (18 ans et plus). Nous ne collectons pas sciemment de données de mineurs.",
      ]],
      ["Suppression des données", [
        `Pour supprimer votre candidature, votre compte créateur et toutes les données associées, écrivez à ${CONTACT} depuis l'adresse utilisée pour postuler, objet « Supprimer mes données ». Nous supprimons tout sous 30 jours (sauf ce que la loi nous oblige à conserver) et vous le confirmons par email.`,
        "Pour arrêter la mesure publicitaire dans votre navigateur, choisissez « Refuser » dans le bandeau cookies ou effacez les cookies de ce site.",
      ]],
    ],
  },
};

const TERMS: Record<"es" | "en" | "fr", Doc> = {
  en: {
    title: "Terms of use", updated: `Last updated: ${UPDATED}`,
    intro: `These terms govern the use of the Vik Studios creator recruitment pages and creator space, operated by Vik Studios SAS. Contact: ${CONTACT}.`,
    sections: [
      ["The programme", ["Vik Studios recruits independent creators to film and post short videos (UGC) about the apps we promote, following daily briefs. Rates, the views bonus and payment terms are set out in the creator contract you sign; amounts shown in ads and on the landing page are indicative estimates, not guaranteed earnings."]],
      ["Eligibility", ["You must be at least 18 years old, live in a country where the programme is open, and provide accurate information. One application per person."]],
      ["Independent creator", ["Creators work as independent contractors, not employees. You are responsible for your own taxes and social contributions where applicable."]],
      ["Content and conduct", ["Videos must follow the brief, platform rules and the law: no misleading claims, no third-party content you do not have rights to, no hateful or explicit content. Sponsored content must be disclosed as required by the platforms and local law. Videos that do not follow the brief may be rejected and are not paid."]],
      ["Payments", ["Validated videos are paid weekly through Ruul according to your contract. The views bonus is calculated on views measured 7 days after posting. We may correct obvious errors or withhold payment in case of fraud (fake views, reused content)."]],
      ["Rights", ["The licence granted on your videos is defined in the creator contract. The Vik Studios brand, website and app content remain our property."]],
      ["Suspension", ["We may suspend or end access to the creator space if these terms or the contract are breached. You can stop at any time by writing to us."]],
      ["Liability and law", ["The service is provided as is. These terms are governed by French law; disputes are first handled amicably, then by the competent French courts, without prejudice to the mandatory consumer rights of your country of residence."]],
    ],
  },
  es: {
    title: "Condiciones de uso", updated: `Última actualización: ${UPDATED}`,
    intro: `Estas condiciones regulan el uso de las páginas de reclutamiento y del espacio de creadores de Vik Studios, operados por Vik Studios SAS. Contacto: ${CONTACT}.`,
    sections: [
      ["El programa", ["Vik Studios recluta creadores independientes para grabar y publicar videos cortos (UGC) sobre las apps que promocionamos, siguiendo briefs diarios. Las tarifas, el bono por vistas y las condiciones de pago se detallan en el contrato que firmas; los importes mostrados en anuncios y en la página son estimaciones indicativas, no ingresos garantizados."]],
      ["Requisitos", ["Debes tener al menos 18 años, vivir en un país donde el programa esté abierto y dar información veraz. Una postulación por persona."]],
      ["Creador independiente", ["Los creadores trabajan como colaboradores independientes, no como empleados. Eres responsable de tus impuestos y cotizaciones cuando corresponda."]],
      ["Contenido y conducta", ["Los videos deben seguir el brief, las normas de las plataformas y la ley: sin afirmaciones engañosas, sin contenido de terceros sin derechos, sin contenido de odio o explícito. El contenido patrocinado debe indicarse como lo exigen las plataformas y la ley local. Los videos que no sigan el brief pueden ser rechazados y no se pagan."]],
      ["Pagos", ["Los videos validados se pagan cada semana a través de Ruul según tu contrato. El bono por vistas se calcula con las vistas medidas 7 días después de publicar. Podemos corregir errores evidentes o retener pagos en caso de fraude (vistas falsas, contenido reutilizado)."]],
      ["Derechos", ["La licencia sobre tus videos se define en el contrato de creador. La marca Vik Studios, el sitio y el contenido de las apps siguen siendo de nuestra propiedad."]],
      ["Suspensión", ["Podemos suspender o cerrar el acceso al espacio de creadores si se incumplen estas condiciones o el contrato. Puedes dejarlo cuando quieras escribiéndonos."]],
      ["Responsabilidad y ley aplicable", ["El servicio se ofrece tal cual. Estas condiciones se rigen por la ley francesa; los litigios se tratan primero de forma amistosa y luego ante los tribunales franceses competentes, sin perjuicio de los derechos imperativos de tu país de residencia."]],
    ],
  },
  fr: {
    title: "Conditions d'utilisation", updated: `Dernière mise à jour : ${UPDATED}`,
    intro: `Ces conditions encadrent l'utilisation des pages de recrutement et de l'espace créateurs de Vik Studios, édités par Vik Studios SAS. Contact : ${CONTACT}.`,
    sections: [
      ["Le programme", ["Vik Studios recrute des créateurs indépendants pour filmer et publier de courtes vidéos (UGC) sur les apps que nous promouvons, à partir de briefs quotidiens. Tarifs, bonus aux vues et modalités de paiement figurent dans le contrat signé ; les montants affichés dans les publicités et sur la page sont des estimations indicatives, pas des revenus garantis."]],
      ["Conditions d'accès", ["Avoir au moins 18 ans, résider dans un pays où le programme est ouvert et fournir des informations exactes. Une candidature par personne."]],
      ["Créateur indépendant", ["Les créateurs interviennent en indépendants, pas en salariés. Vous êtes responsable de vos impôts et cotisations le cas échéant."]],
      ["Contenus et comportement", ["Les vidéos respectent le brief, les règles des plateformes et la loi : pas d'allégations trompeuses, pas de contenus de tiers sans droits, pas de contenus haineux ou explicites. Le contenu sponsorisé est signalé comme l'exigent les plateformes et la loi locale. Une vidéo hors brief peut être refusée et n'est pas payée."]],
      ["Paiements", ["Les vidéos validées sont payées chaque semaine via Ruul selon votre contrat. Le bonus aux vues est calculé sur les vues mesurées 7 jours après publication. Nous pouvons corriger une erreur manifeste ou retenir un paiement en cas de fraude (fausses vues, contenu réutilisé)."]],
      ["Droits", ["La licence sur vos vidéos est définie par le contrat créateur. La marque Vik Studios, le site et le contenu des apps restent notre propriété."]],
      ["Suspension", ["Nous pouvons suspendre ou fermer l'accès à l'espace créateurs en cas de manquement à ces conditions ou au contrat. Vous pouvez arrêter à tout moment en nous écrivant."]],
      ["Responsabilité et droit applicable", ["Le service est fourni en l'état. Ces conditions sont régies par le droit français ; les litiges sont d'abord traités à l'amiable, puis devant les tribunaux français compétents, sans préjudice des droits impératifs de votre pays de résidence."]],
    ],
  },
};

export default function Legal() {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();
  const lang = ((i18n.resolvedLanguage ?? "en").slice(0, 2) as "es" | "en" | "fr");
  const docs = pathname.startsWith("/terms") ? TERMS : PRIVACY;
  const d = docs[lang] ?? docs.en;
  return (
    <div className="min-h-full bg-white">
      <header className="sticky top-0 z-30 border-b border-separator bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link to="/join" className="inline-flex"><Logo className="h-[22px]" /></Link>
          <LangSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">{d.title}</h1>
        <p className="mt-1 text-sm text-subtle-foreground">{d.updated}</p>
        <p className="mt-6 text-[15px] leading-relaxed text-foreground">{d.intro}</p>
        {d.sections.map(([title, paras], i) => (
          <section key={title} id={i === d.sections.length - 1 && docs === PRIVACY ? "deletion" : undefined} className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {paras.map((p, j) => <p key={j} className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{p}</p>)}
          </section>
        ))}
        <p className="mt-10 text-sm text-subtle-foreground">
          <Link to="/privacy" className="text-accent hover:underline">{PRIVACY[lang]?.title ?? PRIVACY.en.title}</Link> · <Link to="/terms" className="text-accent hover:underline">{TERMS[lang]?.title ?? TERMS.en.title}</Link> · <a href={`mailto:${CONTACT}`} className="text-accent hover:underline">{CONTACT}</a>
        </p>
      </main>
    </div>
  );
}
