/**
 * Textes longs de l'espace posteur (16/11, Max) : warm-up de 24 h, guide vidéo complet, flux Ruul.
 * EN / FR / ES écrits à la main ; autres langues générées par scripts/translate-guide.mts (à faire relire). Repli anglais.
 */
import { GUIDE_GENERATED } from "./guide.generated";

export interface GuideText {
  next: string;
  warmup: {
    title: string; intro: string; why: string; start: string; startHint: string; remaining: string; ready: string;
    platforms: { tiktok: string; instagram: string };
    checks: { follow: string; scroll: string; profile: string; no_post: string };
    accountsTitle: string; accountsHint: string; instagramHint: string;
    proof: string; proofHint: string; proofSaved: string;
    validate: string; validated: string; tooEarly: string; incomplete: string;
    dontsTitle: string; donts: string[];
    locked: string; goToWarmup: string;
  };
  guide: {
    nav: string; title: string; intro: string;
    formatTitle: string; format: string[];
    contentTitle: string; content: string[]; appTitle: string; appText: string;
    demoTitle: string; demo: string[];
    publishTitle: string; publish: string[];
    validationTitle: string; validationIntro: string; checks: string[]; examplesGood: string[]; exampleBad: string; missedDay: string;
    referenceRule: string;
  };
  brief: {
    format: string; formatShort: string[]; content: string; app: string; angle: string; hookVariants: string; structure: string; structureSteps: string[];
    recreate: string; demo: string; install: string; access: string; whatToFilm: string; files: string;
    publish: string; publishBoth: string; caption: string; hashtags: string; time: string; deadline: string; tiktokLink: string; instagramLink: string; submit: string;
    validation: string; openGuide: string; copy: string; copied: string;
  };
  ruul: {
    title: string; intro: string; steps: string[]; emailLabel: string; emailHint: string; save: string; saved: string;
    status: { none: string; email_given: string; added: string; done: string; stopped: string };
    openRuul: string; noRuulEmails: string;
  };
}

export const GUIDE: Record<string, GuideText> = {
  en: {
    next: "Next",
    warmup: {
      title: "24-hour warm-up",
      intro: "Before your first brief, you warm up your 2 new accounts (TikTok and Instagram) for 24 hours. No posting: you behave like a normal user who loves study content.",
      why: "Why: a brand-new account that posts straight away looks like a bot, and TikTok and Instagram then show its videos to almost nobody (shadowban). 24 hours of normal use in the niche tells the algorithm who you are, so your first videos reach the right people.",
      start: "I've started", startHint: "The 24-hour timer starts when you tap the button. Do it once you've created both accounts.",
      remaining: "{{time}} left", ready: "24 hours are up: you can validate.",
      platforms: { tiktok: "TikTok", instagram: "Instagram" },
      checks: {
        follow: "Follow 10–15 accounts in the niche (study, productivity, study apps)",
        scroll: "Scroll and like for about 15 minutes in the niche (study tips, studytok)",
        profile: "Complete the profile: photo, name, bio (from the Account page)",
        no_post: "Post nothing (no video, no story) during the warm-up",
      },
      accountsTitle: "Accounts to follow (from our library)",
      accountsHint: "Real creators in the niche, chosen from our video library. Follow 10–15 of them, watch and like a few videos.",
      instagramHint: "On Instagram, search these hashtags and follow 10–15 study accounts:",
      proof: "Screenshot of your “For You” feed (optional)",
      proofHint: "Shows that your feed is now full of study content. It helps us validate faster.",
      proofSaved: "Screenshot saved",
      validate: "Validate my warm-up", validated: "Warm-up validated: your first brief arrives with the next daily dispatch (every morning).",
      tooEarly: "Not yet: the 24 hours aren't over.", incomplete: "Tick every box on both platforms first.",
      dontsTitle: "What NOT to do (it gets accounts flagged)",
      donts: [
        "No VPN: use your normal mobile data or home Wi-Fi.",
        "No emulator, no automation tool: a real phone only.",
        "1 TikTok account and 1 Instagram account per phone, no switching between several accounts.",
        "No link in your bio during the first days (add the app link only when we tell you).",
        "Don't post right after creating the account: wait for the end of the warm-up and your first brief.",
        "Don't buy followers, likes or views, and don't use follow/unfollow tricks.",
      ],
      locked: "Your briefs start after the 24-hour warm-up.", goToWarmup: "Go to the warm-up",
    },
    guide: {
      nav: "Guide", title: "Video guide",
      intro: "Everything you need to make a video we can validate: format, content, app demo, publishing and validation. Read it once, then use your daily brief.",
      formatTitle: "1. Format",
      format: [
        "Vertical 9:16, 15–30 seconds.",
        "The hook is in the first 2 seconds (on screen and/or spoken).",
        "On-screen text is readable and stays in the safe zones: not in the top 15% or the bottom 25% of the screen (TikTok and Instagram buttons cover them).",
        "Subtitles on (the app's auto-captions are fine, check the spelling).",
        "Sound: a trending sound OR your own voice, clear, no background noise.",
        "Light and framing: face visible, natural light facing you, phone stable, no blur.",
        "No watermark from another app (no CapCut / TikTok logo when you post on Instagram: export without watermark).",
      ],
      contentTitle: "2. Content",
      content: [
        "The angle of the day and the exact hook (or 2–3 variants) are in your brief: use one of them word for word.",
        "Structure in 3 parts: hook (0–2 s) → app demo (the core of the video) → call to action (“link in bio”, “try it”).",
        "The reference video is there to be RECREATED with your face, your voice and your words, never reposted. Reusing the original video, or its original sound when it is someone's voice, is forbidden.",
      ],
      appTitle: "The app: Micabo",
      appText: "Micabo is an AI study app: you import your course (photo, PDF, notes) and it creates flashcards, quizzes and summaries in seconds, so you revise faster.",
      demoTitle: "3. App demo",
      demo: [
        "Install the app from the App Store or Google Play (link in your brief). If an access or a test account is needed, it is in the brief.",
        "Film the app: either a screen recording, or your phone filmed by another phone / a mirror. Show the moment that matters (importing a course → flashcards appear).",
        "The brief's files (logo, screenshots, demo clips) can be downloaded from the brief card.",
      ],
      publishTitle: "4. Publishing",
      publish: [
        "Post the SAME video on TikTok AND on Instagram Reels.",
        "Use the caption and hashtags proposed in the brief (you can adapt them slightly).",
        "Recommended time: between 6 pm and 9 pm (local time), unless the brief says otherwise.",
        "Deadline: the brief's due date, before midnight. Then paste the 2 links (TikTok and Instagram) in the brief card.",
      ],
      validationTitle: "5. Validation",
      validationIntro: "Each video is checked against these 7 points before being paid:",
      checks: ["Hook: the brief's hook, in the first 2 seconds", "Pacing: no dead time, cuts every 2–3 seconds", "Sound: clear voice or trending sound, no noise", "On-screen text: readable, in the safe zones, subtitles on", "Length: 15–30 seconds", "Image quality: sharp, well lit, face visible, no other app's watermark", "Brief instructions: angle, app demo, call to action, posted on TikTok and Reels"],
      examplesGood: [
        "Good: face cam in daylight, hook “I revised 2 chapters in 20 minutes” in the first second, screen recording of the import → flashcards, subtitles, “link in bio” at the end.",
        "Good: tutorial “3 steps to never forget a lesson” filmed with a stable phone, clear voice, app shown on screen, posted on TikTok and Reels the same day.",
      ],
      exampleBad: "Refused: the reference video reposted with its original voice, blurry and dark, no app shown.",
      missedDay: "If you miss a day: that video is not paid, and your next brief arrives as usual the next morning. After several missed days in a row, we pause your briefs and contact you.",
      referenceRule: "Recreate, never repost",
    },
    brief: {"format": "Format", "formatShort": ["Vertical 9:16, 15–30 s", "Hook in the first 2 seconds", "Subtitles + readable text in the safe zones", "Clear sound (trending sound or your voice)", "Face visible, natural light, no blur", "No other app's watermark"], "content": "Content", "app": "The app", "angle": "Angle of the day", "hookVariants": "Other hooks you can use", "structure": "Structure", "structureSteps": ["Hook (0–2 s)", "App demo", "Call to action (“link in bio”)"], "recreate": "Recreate this video with your face and your words. Never repost it, never reuse its original voice.", "demo": "App demo", "install": "Install the app", "access": "Access", "whatToFilm": "What to film", "files": "Brief files (logo, screenshots, demo)", "publish": "Publishing", "publishBoth": "Post the same video on TikTok AND Instagram Reels.", "caption": "Caption", "hashtags": "Hashtags", "time": "Recommended time", "deadline": "Deadline: {{date}}, before midnight", "tiktokLink": "TikTok link", "instagramLink": "Instagram Reels link", "submit": "Send my 2 links", "validation": "Validation: the 7 points we check", "openGuide": "Full guide with examples", "copy": "Copy", "copied": "Copied"},
    ruul: {
      title: "Get paid with Ruul",
      intro: "We pay you through Ruul. Ruul does not contact you: you create your own Ruul account, then send us its email. We add you on Ruul and email you at each step.",
      steps: [
        "Create your free account at ruul.io (“Sign up” → freelancer), with your real name and the email you want to use.",
        "Complete your profile and add your payout method (bank account) in Ruul.",
        "Enter below the email of your Ruul account and save.",
        "We add you as a contractor on Ruul and send you an email (“you've been added on Ruul”): open Ruul and accept the invitation.",
        "Every week, we send your payment through Ruul and email you (“payment sent”).",
      ],
      emailLabel: "Email of your Ruul account", emailHint: "The exact email you used to sign up on Ruul.",
      save: "Save", saved: "Saved: we'll add you on Ruul and email you.",
      status: { none: "Ruul account to create", email_given: "Email received: we're adding you on Ruul", added: "Added on Ruul: accept the invitation in Ruul", done: "Ruul ready: payments enabled", stopped: "Ruul stopped" },
      openRuul: "Open ruul.io", noRuulEmails: "All emails about Ruul come from us (Vik Studios), not from Ruul.",
    },
  },
  fr: {
    next: "Suivant",
    warmup: {
      title: "Warm-up de 24 h",
      intro: "Avant ton premier brief, tu « chauffes » tes 2 nouveaux comptes (TikTok et Instagram) pendant 24 h. Tu ne postes rien : tu te comportes comme un·e utilisateur·rice normal·e qui adore le contenu études.",
      why: "Pourquoi : un compte tout neuf qui poste tout de suite ressemble à un robot, et TikTok comme Instagram montrent alors ses vidéos à presque personne (shadowban). 24 h d'usage normal dans la niche apprennent à l'algorithme qui tu es : tes premières vidéos touchent les bonnes personnes.",
      start: "J'ai commencé", startHint: "Le minuteur de 24 h démarre quand tu appuies. Fais-le une fois tes 2 comptes créés.",
      remaining: "Encore {{time}}", ready: "Les 24 h sont passées : tu peux valider.",
      platforms: { tiktok: "TikTok", instagram: "Instagram" },
      checks: {
        follow: "S'abonner à 10–15 comptes de la niche (études, productivité, apps d'étude)",
        scroll: "Scroller et liker environ 15 min dans la niche (study tips, studytok)",
        profile: "Compléter le profil : photo, nom, bio (depuis la page Compte)",
        no_post: "Ne rien poster (ni vidéo, ni story) pendant le warm-up",
      },
      accountsTitle: "Comptes à suivre (issus de notre bibliothèque)",
      accountsHint: "De vrais créateur·rice·s de la niche, choisi·e·s dans notre bibliothèque de vidéos. Abonne-toi à 10–15 d'entre eux, regarde et like quelques vidéos.",
      instagramHint: "Sur Instagram, cherche ces hashtags et abonne-toi à 10–15 comptes études :",
      proof: "Capture de ton fil « Pour toi » (optionnel)",
      proofHint: "Elle montre que ton fil est maintenant rempli de contenu études. Ça nous aide à valider plus vite.",
      proofSaved: "Capture enregistrée",
      validate: "Valider mon warm-up", validated: "Warm-up validé : ton premier brief arrive à la prochaine distribution (chaque matin).",
      tooEarly: "Pas encore : les 24 h ne sont pas terminées.", incomplete: "Coche d'abord toutes les cases sur les 2 plateformes.",
      dontsTitle: "Ce qu'il ne faut PAS faire (ça fait signaler les comptes)",
      donts: [
        "Pas de VPN : utilise tes données mobiles ou ton Wi-Fi habituel.",
        "Pas d'émulateur ni d'outil d'automatisation : un vrai téléphone uniquement.",
        "1 compte TikTok et 1 compte Instagram par téléphone, sans jongler entre plusieurs comptes.",
        "Pas de lien en bio les premiers jours (ajoute le lien de l'app seulement quand on te le dit).",
        "Ne poste pas juste après la création du compte : attends la fin du warm-up et ton premier brief.",
        "N'achète ni abonnés, ni likes, ni vues, et pas de follow/unfollow en masse.",
      ],
      locked: "Tes briefs commencent après le warm-up de 24 h.", goToWarmup: "Aller au warm-up",
    },
    guide: {
      nav: "Guide", title: "Guide vidéo",
      intro: "Tout ce qu'il faut pour une vidéo qu'on peut valider : format, contenu, démo de l'app, publication et validation. Lis-le une fois, puis sers-toi de ton brief du jour.",
      formatTitle: "1. Format",
      format: [
        "Vertical 9:16, 15 à 30 secondes.",
        "L'accroche est dans les 2 premières secondes (à l'écran et/ou à l'oral).",
        "Le texte à l'écran est lisible et reste dans les safe zones : ni dans les 15 % du haut, ni dans les 25 % du bas (les boutons TikTok et Instagram les cachent).",
        "Sous-titres activés (les sous-titres auto de l'app conviennent, vérifie l'orthographe).",
        "Son : un son tendance OU ta voix, claire, sans bruit de fond.",
        "Lumière et cadrage : visage visible, lumière naturelle face à toi, téléphone stable, pas de flou.",
        "Pas de filigrane d'une autre app (pas de logo CapCut / TikTok quand tu postes sur Instagram : exporte sans filigrane).",
      ],
      contentTitle: "2. Contenu",
      content: [
        "L'angle du jour et le hook exact (ou 2–3 variantes) sont dans ton brief : utilise-en un mot pour mot.",
        "Déroulé en 3 temps : hook (0–2 s) → démo de l'app (le cœur de la vidéo) → appel à l'action (« lien en bio », « teste-la »).",
        "La vidéo de référence est là pour être RECRÉÉE avec ton visage, ta voix et tes mots, jamais repostée. Interdit de réutiliser la vidéo d'origine, ou son son d'origine quand c'est la voix de quelqu'un.",
      ],
      appTitle: "L'app : Micabo",
      appText: "Micabo est une app d'étude avec IA : tu importes ton cours (photo, PDF, notes) et elle crée en quelques secondes des flashcards, des quiz et des résumés, pour réviser plus vite.",
      demoTitle: "3. Démo de l'app",
      demo: [
        "Installe l'app depuis l'App Store ou Google Play (lien dans ton brief). Si un accès ou un compte de test est nécessaire, il est dans le brief.",
        "Filme l'app : soit en enregistrement d'écran, soit ton téléphone filmé par un autre téléphone / dans un miroir. Montre le moment clé (import d'un cours → les flashcards apparaissent).",
        "Les fichiers du brief (logo, captures, extraits de démo) se téléchargent depuis la carte du brief.",
      ],
      publishTitle: "4. Publication",
      publish: [
        "Publie la MÊME vidéo sur TikTok ET sur Instagram Reels.",
        "Utilise la légende et les hashtags proposés dans le brief (tu peux les adapter un peu).",
        "Heure conseillée : entre 18 h et 21 h (heure locale), sauf indication du brief.",
        "Deadline : la date du brief, avant minuit. Colle ensuite les 2 liens (TikTok et Instagram) dans la carte du brief.",
      ],
      validationTitle: "5. Validation",
      validationIntro: "Chaque vidéo est vérifiée sur ces 7 points avant d'être payée :",
      checks: ["Hook : celui du brief, dans les 2 premières secondes", "Rythme : pas de temps mort, une coupe toutes les 2–3 secondes", "Son : voix claire ou son tendance, sans bruit", "Texte à l'écran : lisible, dans les safe zones, sous-titres activés", "Durée : 15 à 30 secondes", "Qualité d'image : nette, bien éclairée, visage visible, sans filigrane d'une autre app", "Consignes du brief : angle, démo de l'app, appel à l'action, publiée sur TikTok et Reels"],
      examplesGood: [
        "Validée : face cam à la lumière du jour, hook « J'ai révisé 2 chapitres en 20 minutes » dès la 1re seconde, enregistrement d'écran import → flashcards, sous-titres, « lien en bio » à la fin.",
        "Validée : tuto « 3 étapes pour ne plus oublier un cours » filmé téléphone stable, voix claire, app montrée à l'écran, publiée sur TikTok et Reels le même jour.",
      ],
      exampleBad: "Refusée : la vidéo de référence repostée avec la voix d'origine, floue et sombre, sans l'app.",
      missedDay: "Si tu rates un jour : cette vidéo n'est pas payée, et ton brief suivant arrive comme d'habitude le lendemain matin. Après plusieurs jours manqués d'affilée, on met tes briefs en pause et on te contacte.",
      referenceRule: "Recréer, jamais reposter",
    },
    brief: {"format": "Format", "formatShort": ["Vertical 9:16, 15–30 s", "Hook dans les 2 premières secondes", "Sous-titres + texte lisible dans les safe zones", "Son clair (son tendance ou ta voix)", "Visage visible, lumière naturelle, pas de flou", "Pas de filigrane d'une autre app"], "content": "Contenu", "app": "L'app", "angle": "Angle du jour", "hookVariants": "Autres hooks possibles", "structure": "Déroulé", "structureSteps": ["Hook (0–2 s)", "Démo de l'app", "Appel à l'action (« lien en bio »)"], "recreate": "Recrée cette vidéo avec ton visage et tes mots. Ne la reposte jamais, ne réutilise jamais sa voix d'origine.", "demo": "Démo de l'app", "install": "Installer l'app", "access": "Accès", "whatToFilm": "Quoi filmer", "files": "Fichiers du brief (logo, captures, démo)", "publish": "Publication", "publishBoth": "Publie la même vidéo sur TikTok ET Instagram Reels.", "caption": "Légende", "hashtags": "Hashtags", "time": "Heure conseillée", "deadline": "Deadline : {{date}}, avant minuit", "tiktokLink": "Lien TikTok", "instagramLink": "Lien Instagram Reels", "submit": "Envoyer mes 2 liens", "validation": "Validation : les 7 points vérifiés", "openGuide": "Guide complet avec exemples", "copy": "Copier", "copied": "Copié"},
    ruul: {
      title: "Être payé·e avec Ruul",
      intro: "On te paie via Ruul. Ruul ne te contacte pas : tu crées toi-même ton compte Ruul, puis tu nous donnes son email. On t'ajoute sur Ruul et on t'écrit à chaque étape.",
      steps: [
        "Crée ton compte gratuit sur ruul.io (« Sign up » → freelance), avec ton vrai nom et l'email que tu veux utiliser.",
        "Complète ton profil et ajoute ton moyen de paiement (compte bancaire) dans Ruul.",
        "Indique ci-dessous l'email de ton compte Ruul et enregistre.",
        "On t'ajoute comme contractor sur Ruul et on t'envoie un email (« tu as été ajouté·e sur Ruul ») : ouvre Ruul et accepte l'invitation.",
        "Chaque semaine, on envoie ton paiement via Ruul et on t'écrit (« paiement envoyé »).",
      ],
      emailLabel: "Email de ton compte Ruul", emailHint: "L'email exact utilisé pour t'inscrire sur Ruul.",
      save: "Enregistrer", saved: "Enregistré : on t'ajoute sur Ruul et on t'envoie un email.",
      status: { none: "Compte Ruul à créer", email_given: "Email reçu : on t'ajoute sur Ruul", added: "Ajouté·e sur Ruul : accepte l'invitation dans Ruul", done: "Ruul prêt : paiements activés", stopped: "Ruul arrêté" },
      openRuul: "Ouvrir ruul.io", noRuulEmails: "Tous les emails liés à Ruul viennent de nous (Vik Studios), pas de Ruul.",
    },
  },
  es: {
    next: "Siguiente",
    warmup: {
      title: "Warm-up de 24 h",
      intro: "Antes de tu primer brief, «calientas» tus 2 cuentas nuevas (TikTok e Instagram) durante 24 h. No publicas nada: te comportas como un usuario normal al que le encanta el contenido de estudio.",
      why: "Por qué: una cuenta nueva que publica enseguida parece un bot, y TikTok e Instagram muestran sus videos a casi nadie (shadowban). 24 h de uso normal en el nicho le enseñan al algoritmo quién eres: tus primeros videos llegan a las personas correctas.",
      start: "Ya empecé", startHint: "El temporizador de 24 h arranca cuando tocas el botón. Hazlo cuando tengas tus 2 cuentas creadas.",
      remaining: "Faltan {{time}}", ready: "Pasaron las 24 h: ya puedes validar.",
      platforms: { tiktok: "TikTok", instagram: "Instagram" },
      checks: {
        follow: "Seguir 10–15 cuentas del nicho (estudio, productividad, apps de estudio)",
        scroll: "Hacer scroll y dar like unos 15 min en el nicho (study tips, studytok)",
        profile: "Completar el perfil: foto, nombre, bio (desde la página Cuenta)",
        no_post: "No publicar nada (ni video, ni historia) durante el warm-up",
      },
      accountsTitle: "Cuentas para seguir (de nuestra biblioteca)",
      accountsHint: "Creadores reales del nicho, elegidos de nuestra biblioteca de videos. Sigue a 10–15, mira y dale like a algunos videos.",
      instagramHint: "En Instagram, busca estos hashtags y sigue 10–15 cuentas de estudio:",
      proof: "Captura de tu feed «Para ti» (opcional)",
      proofHint: "Muestra que tu feed ya está lleno de contenido de estudio. Nos ayuda a validar más rápido.",
      proofSaved: "Captura guardada",
      validate: "Validar mi warm-up", validated: "Warm-up validado: tu primer brief llega en el próximo reparto (cada mañana).",
      tooEarly: "Todavía no: no han pasado las 24 h.", incomplete: "Primero marca todas las casillas en las 2 plataformas.",
      dontsTitle: "Lo que NO debes hacer (hace que marquen las cuentas)",
      donts: [
        "Nada de VPN: usa tus datos móviles o tu Wi-Fi de siempre.",
        "Nada de emuladores ni herramientas de automatización: solo un teléfono real.",
        "1 cuenta de TikTok y 1 de Instagram por teléfono, sin cambiar entre varias cuentas.",
        "Nada de link en la bio los primeros días (agrega el link de la app solo cuando te lo digamos).",
        "No publiques justo después de crear la cuenta: espera al final del warm-up y a tu primer brief.",
        "No compres seguidores, likes ni vistas, y nada de seguir/dejar de seguir en masa.",
      ],
      locked: "Tus briefs empiezan después del warm-up de 24 h.", goToWarmup: "Ir al warm-up",
    },
    guide: {
      nav: "Guía", title: "Guía de video",
      intro: "Todo lo que necesitas para un video que podamos validar: formato, contenido, demo de la app, publicación y validación. Léela una vez y luego usa tu brief del día.",
      formatTitle: "1. Formato",
      format: [
        "Vertical 9:16, de 15 a 30 segundos.",
        "El hook va en los 2 primeros segundos (en pantalla y/o hablado).",
        "El texto en pantalla se lee bien y queda en las safe zones: ni en el 15 % de arriba ni en el 25 % de abajo (los botones de TikTok e Instagram los tapan).",
        "Subtítulos activados (los automáticos de la app sirven, revisa la ortografía).",
        "Sonido: un sonido en tendencia O tu voz, clara, sin ruido de fondo.",
        "Luz y encuadre: cara visible, luz natural de frente, teléfono estable, sin desenfoque.",
        "Sin marca de agua de otra app (sin logo de CapCut / TikTok al publicar en Instagram: exporta sin marca de agua).",
      ],
      contentTitle: "2. Contenido",
      content: [
        "El ángulo del día y el hook exacto (o 2–3 variantes) están en tu brief: usa uno palabra por palabra.",
        "Estructura en 3 partes: hook (0–2 s) → demo de la app (el centro del video) → llamada a la acción («link en la bio», «pruébala»).",
        "El video de referencia está para RECREARLO con tu cara, tu voz y tus palabras, nunca para volver a publicarlo. Está prohibido reutilizar el video original, o su sonido original cuando es la voz de alguien.",
      ],
      appTitle: "La app: Micabo",
      appText: "Micabo es una app de estudio con IA: importas tu clase (foto, PDF, apuntes) y en segundos crea flashcards, quizzes y resúmenes, para repasar más rápido.",
      demoTitle: "3. Demo de la app",
      demo: [
        "Instala la app desde App Store o Google Play (link en tu brief). Si hace falta un acceso o una cuenta de prueba, está en el brief.",
        "Graba la app: con grabación de pantalla, o tu teléfono grabado por otro teléfono / en un espejo. Muestra el momento clave (importar una clase → aparecen las flashcards).",
        "Los archivos del brief (logo, capturas, clips de demo) se descargan desde la tarjeta del brief.",
      ],
      publishTitle: "4. Publicación",
      publish: [
        "Publica el MISMO video en TikTok Y en Instagram Reels.",
        "Usa el texto y los hashtags propuestos en el brief (puedes adaptarlos un poco).",
        "Hora recomendada: entre las 18 h y las 21 h (hora local), salvo que el brief diga otra cosa.",
        "Fecha límite: la fecha del brief, antes de medianoche. Luego pega los 2 links (TikTok e Instagram) en la tarjeta del brief.",
      ],
      validationTitle: "5. Validación",
      validationIntro: "Cada video se revisa con estos 7 puntos antes de pagarse:",
      checks: ["Hook: el del brief, en los 2 primeros segundos", "Ritmo: sin tiempos muertos, un corte cada 2–3 segundos", "Sonido: voz clara o sonido en tendencia, sin ruido", "Texto en pantalla: legible, en las safe zones, subtítulos activados", "Duración: 15 a 30 segundos", "Calidad de imagen: nítida, bien iluminada, cara visible, sin marca de agua de otra app", "Instrucciones del brief: ángulo, demo de la app, llamada a la acción, publicado en TikTok y Reels"],
      examplesGood: [
        "Validado: face cam con luz de día, hook «Repasé 2 temas en 20 minutos» desde el primer segundo, grabación de pantalla importar → flashcards, subtítulos, «link en la bio» al final.",
        "Validado: tutorial «3 pasos para no olvidar una clase» grabado con el teléfono estable, voz clara, app en pantalla, publicado en TikTok y Reels el mismo día.",
      ],
      exampleBad: "Rechazado: el video de referencia republicado con la voz original, borroso y oscuro, sin la app.",
      missedDay: "Si fallas un día: ese video no se paga, y tu siguiente brief llega como siempre a la mañana siguiente. Tras varios días seguidos sin publicar, pausamos tus briefs y te contactamos.",
      referenceRule: "Recrear, nunca republicar",
    },
    brief: {"format": "Formato", "formatShort": ["Vertical 9:16, 15–30 s", "Hook en los 2 primeros segundos", "Subtítulos + texto legible en las safe zones", "Sonido claro (sonido en tendencia o tu voz)", "Cara visible, luz natural, sin desenfoque", "Sin marca de agua de otra app"], "content": "Contenido", "app": "La app", "angle": "Ángulo del día", "hookVariants": "Otros hooks que puedes usar", "structure": "Estructura", "structureSteps": ["Hook (0–2 s)", "Demo de la app", "Llamada a la acción («link en la bio»)"], "recreate": "Recrea este video con tu cara y tus palabras. Nunca lo vuelvas a publicar ni reutilices su voz original.", "demo": "Demo de la app", "install": "Instalar la app", "access": "Acceso", "whatToFilm": "Qué grabar", "files": "Archivos del brief (logo, capturas, demo)", "publish": "Publicación", "publishBoth": "Publica el mismo video en TikTok Y en Instagram Reels.", "caption": "Texto", "hashtags": "Hashtags", "time": "Hora recomendada", "deadline": "Fecha límite: {{date}}, antes de medianoche", "tiktokLink": "Link de TikTok", "instagramLink": "Link de Instagram Reels", "submit": "Enviar mis 2 links", "validation": "Validación: los 7 puntos que revisamos", "openGuide": "Guía completa con ejemplos", "copy": "Copiar", "copied": "Copiado"},
    ruul: {
      title: "Cobrar con Ruul",
      intro: "Te pagamos a través de Ruul. Ruul no te contacta: tú creas tu cuenta de Ruul y nos das su email. Te agregamos en Ruul y te escribimos en cada paso.",
      steps: [
        "Crea tu cuenta gratis en ruul.io («Sign up» → freelancer), con tu nombre real y el email que quieras usar.",
        "Completa tu perfil y agrega tu método de cobro (cuenta bancaria) en Ruul.",
        "Escribe abajo el email de tu cuenta de Ruul y guarda.",
        "Te agregamos como contractor en Ruul y te enviamos un email («te agregamos en Ruul»): abre Ruul y acepta la invitación.",
        "Cada semana enviamos tu pago por Ruul y te escribimos («pago enviado»).",
      ],
      emailLabel: "Email de tu cuenta de Ruul", emailHint: "El email exacto con el que te registraste en Ruul.",
      save: "Guardar", saved: "Guardado: te agregamos en Ruul y te enviamos un email.",
      status: { none: "Cuenta de Ruul por crear", email_given: "Email recibido: te estamos agregando en Ruul", added: "Agregado/a en Ruul: acepta la invitación en Ruul", done: "Ruul listo: pagos activados", stopped: "Ruul detenido" },
      openRuul: "Abrir ruul.io", noRuulEmails: "Todos los emails sobre Ruul vienen de nosotros (Vik Studios), no de Ruul.",
    },
  },
  ...GUIDE_GENERATED,
};

export function guideText(lang: string | null | undefined): GuideText {
  const l = (lang ?? "en").split("-")[0];
  return GUIDE[l] ?? GUIDE.en;
}

/** Hashtags de niche proposés pour le warm-up Instagram (pas de compte inventé). */
export const IG_NICHE_TAGS = ["studygram", "studytok", "studywithme", "studytips", "productivity", "flashcards"];

