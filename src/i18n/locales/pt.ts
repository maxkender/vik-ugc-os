import type { PublicDict } from "./types";
/** Português do Brasil. */
const pt: PublicDict = {
  common: { loading: "Carregando…", save: "Salvar", cancel: "Cancelar", logout: "Sair", error: "Algo deu errado", language: "Idioma" },
  landing: {
    badge: "Programa de criadores pago",
    title: "Ganhe dinheiro fazendo vídeos. Seja criador(a) {{brand}}.",
    subtitle: "Poste 2 vídeos curtos por dia sobre apps que os estudantes amam. Ganhe {{price}} por vídeo, mais um bônus pelas suas visualizações.",
    perVideo: "por vídeo", bonus: "bônus de visualizações", bonusDetail: "{{rpm}} a cada {{views}} visualizações",
    monthly: "até {{amount}}/mês", monthlyHint: "2 vídeos por dia, sem contar o bônus",
    cta: "Quero me inscrever", how: "Como funciona",
    steps: [
      ["Inscreva-se em 3 minutos", "Conte um pouco sobre você e grave um vídeo curto de apresentação (um \"yap\")."],
      ["Assine o contrato online", "Contrato de criador(a) autônomo(a), assinado com um clique."],
      ["Poste 2 vídeos por dia", "Toda manhã você recebe 2 briefings: um vídeo de referência, um gancho e instruções simples."],
      ["Receba toda semana", "Por vídeo + bônus de visualizações, pago semanalmente pela Ruul."],
    ],
    examples: "Exemplos do que você vai criar", faq: "Perguntas frequentes",
    faqs: [
      ["Preciso ter muitos seguidores?", "Não. O que importa é como você fala para a câmera, não o número de seguidores. Uma conta nova já serve."],
      ["Do que eu preciso?", "Um celular, boa iluminação, uma conta no TikTok ou Instagram e uns 30–45 minutos por dia."],
      ["Como eu recebo?", "Toda semana, pela Ruul (pagamento internacional direto na sua conta bancária). Você trabalha como autônomo(a)."],
      ["Quem pode se inscrever?", "Qualquer pessoa com 18 anos ou mais que more em um dos países abertos."],
    ],
    closed: "As inscrições ainda não estão abertas no seu país.", country: "País",
  },
  apply: {
    title: "Cadastro de criador(a)", subtitle: "3 minutos. A gente analisa cada inscrição pessoalmente.",
    identity: "Sobre você", firstName: "Nome", lastName: "Sobrenome", birthdate: "Data de nascimento", email: "E-mail", phone: "Celular (WhatsApp)",
    country: "País onde você mora", languages: "Idiomas que você fala", languagesHint: "Separados por vírgula, ex.: Português, Inglês",
    experience: "Experiência", ugcExperience: "Você já fez UGC / conteúdo? Conte rapidinho.",
    tiktok: "Link do seu perfil no TikTok", tiktokFollowers: "Seguidores no TikTok", instagram: "Link do seu perfil no Instagram", instagramFollowers: "Seguidores no Instagram",
    equipment: "Equipamento (modelo do celular, ring light, microfone…)", availability: "Disponibilidade (horas por dia, fuso horário)", motivation: "Por que você quer participar?",
    yap: "Vídeo de apresentação (\"yap\")", yapHint: "30–90 segundos, na vertical, falando para a câmera: quem você é e por que seria ótimo(a). Máx. 200 MB.",
    chooseVideo: "Escolher vídeo", uploading: "Enviando… {{pct}}%", uploaded: "Vídeo enviado ✓",
    adult: "Tenho 18 anos ou mais", consent: "Concordo que a {{brand}} trate meus dados para analisar minha inscrição.",
    submit: "Enviar inscrição", success: "Inscrição enviada! Confira seu e-mail: acabamos de mandar uma confirmação.",
    errors: { underage: "Você precisa ter 18 anos ou mais.", already_applied: "Você já se inscreveu com este e-mail.", yap_video: "Envie seu vídeo de apresentação.", country_closed: "As inscrições estão fechadas neste país.", generic: "Confira os campos destacados." },
  },
  sign: {
    title: "Seu contrato de criador(a)", read: "Leia o contrato inteiro antes de assinar.",
    typeName: "Digite seu nome completo para assinar", typeNameHint: "Precisa ser igual a: {{name}}", accept: "Li e aceito este contrato.",
    warn: "Não assine se não quiser continuar.", button: "Assinar contrato",
    signed: "Contrato assinado em {{date}}. Valeu! Confira seu e-mail para receber seus acessos.", download: "Baixar o PDF assinado",
    expired: "Este link expirou. Fale com a gente se ainda quiser participar.", notFound: "Contrato não encontrado.",
    errors: { name_mismatch: "O nome não confere com a inscrição.", not_accepted: "Marque a caixa.", expired: "Este contrato expirou.", hash_mismatch: "O documento mudou, recarregue a página." },
  },
};
export default pt;
