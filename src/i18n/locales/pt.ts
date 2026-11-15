import type { PublicDict } from "./types";
const pt: PublicDict = {
  common: { loading: "A carregar…", save: "Guardar", cancel: "Cancelar", logout: "Terminar sessão", error: "Algo correu mal", language: "Idioma" },
  landing: {
    badge: "Programa de criadores pago",
    title: "Recebe para fazer vídeos. Torna-te criador(a) {{brand}}.",
    subtitle: "Publica 2 vídeos curtos por dia sobre apps que os estudantes adoram. Ganha {{price}} por vídeo, mais um bónus pelas tuas visualizações.",
    perVideo: "por vídeo", bonus: "bónus de visualizações", bonusDetail: "{{rpm}} por cada {{views}} visualizações",
    monthly: "até {{amount}}/mês", monthlyHint: "2 vídeos por dia, sem contar o bónus",
    cta: "Candidatar-me", how: "Como funciona",
    steps: [
      ["Candidata-te em 3 minutos", "Fala-nos de ti e grava um vídeo curto de apresentação (um \"yap\")."],
      ["Assina o contrato online", "Contrato de criador(a) independente, assinado com um clique."],
      ["Publica 2 vídeos por dia", "Todas as manhãs recebes 2 briefs: um vídeo de referência, um gancho e instruções simples."],
      ["Recebe todas as semanas", "Por vídeo + bónus de visualizações, pago semanalmente através da Ruul."],
    ],
    examples: "Exemplos do que vais criar", faq: "Perguntas frequentes",
    faqs: [
      ["Preciso de muitos seguidores?", "Não. Interessa-nos como falas para a câmara, não o número de seguidores. Uma conta nova serve."],
      ["De que preciso?", "Um smartphone, boa luz, uma conta de TikTok ou Instagram e cerca de 30–45 minutos por dia."],
      ["Como sou pago(a)?", "Todas as semanas, através da Ruul (pagamentos internacionais para a tua conta bancária). És trabalhador(a) independente."],
      ["Quem se pode candidatar?", "Qualquer pessoa com 18 anos ou mais que viva num dos nossos países abertos."],
    ],
    closed: "As candidaturas ainda não estão abertas no teu país.", country: "País",
  },
  apply: {
    title: "Candidatura de criador(a)", subtitle: "3 minutos. Analisamos cada candidatura pessoalmente.",
    identity: "Sobre ti", firstName: "Nome", lastName: "Apelido", birthdate: "Data de nascimento", email: "Email", phone: "Telefone (WhatsApp)",
    country: "País de residência", languages: "Línguas que falas", languagesHint: "Separadas por vírgulas, ex. Português, Inglês",
    experience: "Experiência", ugcExperience: "Já fizeste UGC / conteúdo? Conta-nos em poucas palavras.",
    tiktok: "Link do teu perfil TikTok", tiktokFollowers: "Seguidores no TikTok", instagram: "Link do teu perfil Instagram", instagramFollowers: "Seguidores no Instagram",
    equipment: "Equipamento (modelo de telemóvel, ring light, microfone…)", availability: "Disponibilidade (horas por dia, fuso horário)", motivation: "Porque queres juntar-te a nós?",
    yap: "Vídeo de apresentação (\"yap\")", yapHint: "30–90 segundos, vertical, a falar para a câmara: quem és e porque serias ótimo/a. Máx. 200 MB.",
    chooseVideo: "Escolher um vídeo", uploading: "A enviar… {{pct}}%", uploaded: "Vídeo enviado ✓",
    adult: "Tenho 18 anos ou mais", consent: "Aceito que a {{brand}} trate os meus dados para analisar a minha candidatura.",
    submit: "Enviar candidatura", success: "Candidatura enviada! Vê o teu email: acabámos de te enviar uma confirmação.",
    errors: { underage: "Tens de ter 18 anos ou mais.", already_applied: "Já te candidataste com este email.", yap_video: "Envia o teu vídeo de apresentação.", country_closed: "As candidaturas estão fechadas neste país.", generic: "Verifica os campos assinalados." },
  },
  sign: {
    title: "O teu contrato de criador(a)", read: "Lê o contrato todo antes de assinar.",
    typeName: "Escreve o teu nome completo para assinar", typeNameHint: "Tem de corresponder a: {{name}}", accept: "Li e aceito este contrato.",
    warn: "Não assines se não quiseres continuar.", button: "Assinar o contrato",
    signed: "Contrato assinado a {{date}}. Obrigado! Vê o teu email para os acessos.", download: "Descarregar o PDF assinado",
    expired: "Este link expirou. Fala connosco se ainda quiseres juntar-te.", notFound: "Contrato não encontrado.",
    errors: { name_mismatch: "O nome não corresponde à candidatura.", not_accepted: "Marca a caixa.", expired: "Este contrato expirou.", hash_mismatch: "O documento mudou, recarrega a página." },
  },
};
export default pt;
