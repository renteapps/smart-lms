import { Agent } from '@/types/agente';

/**
 * Agentes publicados pelos admins de curso. Cada um carrega o roteiro que o
 * admin escreveu: saudação, sugestões de partida, respostas por palavra-chave e
 * as saídas de fallback — que devolvem a conversa ao aluno em vez de inventar.
 */
export const AGENTS: Agent[] = [
  {
    id: 'ag-feedback',
    slug: 'feedback',
    name: 'Bea',
    role: 'Mentora de feedback',
    description:
      'Transforma desabafo em conversa: organiza fato, impacto e combinado — e ensaia com você antes da conversa real.',
    category: 'Comunicação',
    status: 'Disponível',
    avatar: 'feedback',
    createdBy: 'Camila Duarte',
    courseTitle: 'Feedback que transforma',
    courseId: 'c4',
    courseIds: ['c4'],
    courseTitles: ['Feedback que transforma'],
    planIds: ['2', '3'],
    planNames: ['Plano Pro', 'Plano Vitalício'],
    skills: ['Estruturar a conversa', 'Ensaiar antes', 'Revisar o que você escreveu'],
    conversationsCount: 1284,
    rating: 4.8,
    avgMinutes: 7,
    greeting:
      'Oi! Sou a Bea. Me conta o que aconteceu do seu jeito, sem filtro — e a gente transforma isso numa conversa que a outra pessoa consegue ouvir.',
    starters: [
      {
        id: 'st-dificil',
        label: 'Preciso dar um feedback difícil',
        message: 'Preciso dar um feedback difícil para alguém do meu time e não sei por onde começar.',
      },
      {
        id: 'st-revisar',
        label: 'Revisar um feedback que escrevi',
        message: 'Escrevi um feedback e queria sua opinião antes de enviar.',
      },
      {
        id: 'st-defensiva',
        label: 'A pessoa reagiu mal da última vez',
        message: 'Da última vez que dei feedback, a pessoa ficou na defensiva. Como faço diferente?',
      },
    ],
    replies: [
      {
        id: 'estrutura',
        keywords: ['dificil', 'comecar', 'nao sei', 'delicado', 'atraso', 'prazo', 'estruturar'],
        text: 'Vamos por partes. Me responde três coisas, uma frase cada:\n\n1. O fato — o que aconteceu, sem adjetivo. ("entregou o relatório dois dias depois", não "é desorganizado")\n2. O impacto — o que isso causou em você, no time ou no cliente.\n3. O combinado — o que você quer que aconteça na próxima vez.\n\nCom as três respostas eu monto a abertura da conversa para você.',
      },
      {
        id: 'revisao',
        keywords: ['revisar', 'escrevi', 'texto', 'opiniao', 'mensagem', 'email'],
        text: 'Manda o texto que eu leio com três lentes:\n\n• Tem julgamento disfarçado de fato? ("você é relapso" vira "os dois últimos relatórios chegaram fora do prazo")\n• Tem impacto concreto ou só incômodo genérico?\n• Termina em pedido claro ou em cobrança aberta?\n\nCole aqui do jeito que está — inclusive se estiver bravo. Eu não julgo rascunho.',
      },
      {
        id: 'defensiva',
        keywords: ['defensiva', 'reagiu', 'chorou', 'brigou', 'nervoso', 'levou para o pessoal'],
        text: 'Defensiva quase sempre nasce de surpresa ou de plateia. Três ajustes que costumam resolver:\n\n• Avise o assunto antes: "quero falar sobre o prazo do relatório, tudo bem daqui a pouco?"\n• Abra pela pergunta, não pelo veredito: "como você viu essa entrega?"\n• Quando a reação vier, pare de argumentar e nomeie: "percebi que isso te pegou. Quer continuar agora ou amanhã?"\n\nQuer ensaiar a abertura? Escreve como você começaria e eu respondo no papel da outra pessoa.',
      },
      {
        id: 'elogio',
        keywords: ['elogio', 'positivo', 'reconhecer', 'reconhecimento', 'parabens'],
        text: 'Feedback positivo genérico ("mandou bem!") evapora em um dia. Use a mesma estrutura:\n\n• Fato: o que exatamente a pessoa fez.\n• Impacto: o que mudou por causa disso.\n• Convite: peça para virar padrão. "Faz assim na próxima também?"\n\nMe conta a entrega que você quer reconhecer e eu escrevo a versão de três linhas.',
      },
      {
        id: 'ascendente',
        keywords: ['chefe', 'gestor', 'lider', 'superior', 'para cima'],
        text: 'Feedback para quem está acima pede duas proteções: contexto e pedido.\n\n• Peça espaço primeiro: "posso te trazer uma percepção sobre o processo de aprovação?"\n• Fale de efeito no trabalho, não de personalidade: "quando a aprovação chega na sexta, o time vira o fim de semana".\n• Feche com pedido pequeno e testável: "dá para tentarmos fechar nas quintas por duas semanas?"\n\nQuer que eu escreva essa versão com o seu caso?',
      },
    ],
    fallbacks: [
      'Ainda não consigo ver o quadro todo. Me conta o fato cru: o que a pessoa fez e quando aconteceu?',
      'Consigo ajudar melhor com um detalhe: qual foi o impacto disso no trabalho de vocês?',
      'Fecha para mim o que você quer que mude daqui para frente — é daí que sai a melhor abertura de conversa.',
    ],
  },
  {
    id: 'ag-contratacao',
    slug: 'contratacao',
    name: 'Rui',
    role: 'Assistente de contratação',
    description:
      'Ajuda a abrir vaga, montar roteiro de entrevista e comparar candidatos com critério — em vez de decidir por feeling.',
    category: 'Pessoas',
    status: 'Disponível',
    avatar: 'contratacao',
    createdBy: 'Marcos Ferraz',
    courseTitle: 'Seleção com critério',
    courseId: 'c3',
    courseIds: ['c3'],
    courseTitles: ['Liderança por influência'],
    planIds: ['2', '3'],
    planNames: ['Plano Pro', 'Plano Vitalício'],
    skills: ['Descrever a vaga', 'Roteiro de entrevista', 'Comparar finalistas'],
    conversationsCount: 613,
    rating: 4.7,
    avgMinutes: 12,
    greeting:
      'Olá! Sou o Rui. Antes de falar de currículo, eu gosto de saber o que essa pessoa precisa entregar nos primeiros 90 dias. Me conta a vaga que você quer abrir.',
    starters: [
      {
        id: 'st-vaga',
        label: 'Abrir uma vaga nova',
        message: 'Preciso abrir uma vaga nova no meu time e escrever a descrição.',
      },
      {
        id: 'st-roteiro',
        label: 'Montar roteiro de entrevista',
        message: 'Quero um roteiro de entrevista para a vaga que estou abrindo.',
      },
      {
        id: 'st-decidir',
        label: 'Comparar dois finalistas',
        message: 'Tenho dois finalistas e estou empatado na decisão.',
      },
    ],
    replies: [
      {
        id: 'vaga',
        keywords: ['vaga', 'descricao', 'abrir', 'anuncio', 'job', 'perfil'],
        text: 'Boa. Descrição que atrai gente certa começa pela entrega, não pela lista de requisitos:\n\n1. Missão em uma frase: "reduzir o tempo de resposta do suporte pela metade".\n2. Três entregas dos primeiros 90 dias.\n3. Só os requisitos que você realmente barraria — o resto vira "conta ponto".\n4. Faixa salarial. Vaga sem faixa filtra pelo lado errado.\n\nMe diz a missão e as três entregas que eu escrevo o texto completo.',
      },
      {
        id: 'roteiro',
        keywords: ['entrevista', 'roteiro', 'perguntas', 'conversa com candidato'],
        text: 'Roteiro estruturado é o que faz duas pessoas entrevistarem do mesmo jeito. Sugiro 45 minutos assim:\n\n• 5 min — contexto da vaga e do time.\n• 25 min — duas perguntas comportamentais por competência, sempre no passado real: "me conta uma vez em que…", seguido de "o que exatamente era sua parte?".\n• 10 min — caso curto ligado ao dia a dia da vaga.\n• 5 min — perguntas do candidato.\n\nMe diz as duas competências mais críticas da vaga que eu escrevo as perguntas.',
      },
      {
        id: 'comparar',
        keywords: ['comparar', 'finalistas', 'decidir', 'empatado', 'escolher', 'scorecard'],
        text: 'Empate quase sempre é sinal de critério não escrito. Faça assim antes de decidir:\n\n1. Liste as 4 competências da vaga.\n2. Dê nota de 1 a 4 para cada candidato, com uma evidência da entrevista ao lado. Sem evidência, a nota não vale.\n3. Compare linha a linha, não impressão geral.\n\nSe continuar empatado, o desempate é a competência mais difícil de treinar depois. Quer me passar as quatro competências e as evidências?',
      },
      {
        id: 'vies',
        keywords: ['vies', 'viés', 'bias', 'diversidade', 'preconceito', 'afinidade'],
        text: 'Os três vieses que mais aparecem em processo de vaga:\n\n• Afinidade — "me lembra eu no começo". Cheque se a evidência existe ou se é só semelhança.\n• Primeira impressão — nota mental nos primeiros 3 minutos, resto da entrevista virando confirmação.\n• Fluência — quem fala bonito parece mais competente. Peça exemplo concreto sempre.\n\nAntídoto barato: mesma pergunta para todos, nota registrada antes de conversar com os outros entrevistadores.',
      },
      {
        id: 'proposta',
        keywords: ['proposta', 'salario', 'oferta', 'contraproposta', 'negociar'],
        text: 'Antes de fazer a oferta, tenha três números na mão: o que você pode pagar hoje, o teto da faixa e o que muda em 12 meses.\n\nNa conversa: apresente o pacote inteiro (faixa, ciclo de revisão, benefícios, o que a pessoa vai aprender) e só então o valor. E dê prazo confortável — pressão de 24h é a maior fonte de aceite arrependido.\n\nQuer que eu monte o roteiro dessa ligação?',
      },
    ],
    fallbacks: [
      'Para te ajudar direito preciso de uma âncora: qual é a entrega mais importante dessa pessoa nos primeiros 90 dias?',
      'Me conta em que etapa você está — descrição da vaga, triagem, entrevista ou decisão final?',
      'Qual competência dessa vaga você tem mais medo de errar na avaliação? Começo por ela.',
    ],
  },
  {
    id: 'ag-simulacao',
    slug: 'conversas-dificeis',
    name: 'Nina',
    role: 'Simuladora de conversas difíceis',
    description:
      'Faz o papel da outra pessoa para você treinar a conversa antes que ela aconteça de verdade — e comenta o que funcionou.',
    category: 'Liderança',
    status: 'Beta',
    avatar: 'simulacao',
    createdBy: 'Renata Alcântara',
    courseTitle: 'Liderança por influência',
    courseId: 'c3',
    courseIds: ['c1', 'c3', 'c5'],
    courseTitles: ['Comunicação que move pessoas', 'Liderança por influência', 'Negociação ganha-ganha'],
    planIds: ['2', '3'],
    planNames: ['Plano Pro', 'Plano Vitalício'],
    skills: ['Simulação por papéis', 'Devolutiva ao final', 'Cenários de pressão'],
    conversationsCount: 402,
    rating: 4.6,
    avgMinutes: 15,
    greeting:
      'Oi, sou a Nina. Eu entro no papel da outra pessoa e você conduz a conversa. Me diz quem eu sou nessa cena — e o quanto eu devo dificultar.',
    starters: [
      {
        id: 'st-aumento',
        label: 'Pedir um aumento',
        message: 'Quero treinar um pedido de aumento para o meu gestor.',
      },
      {
        id: 'st-nao',
        label: 'Dizer não a um pedido',
        message: 'Preciso treinar como dizer não a um pedido do meu gestor sem queimar a relação.',
      },
      {
        id: 'st-desligamento',
        label: 'Comunicar um desligamento',
        message: 'Preciso comunicar um desligamento e quero ensaiar antes.',
      },
    ],
    replies: [
      {
        id: 'aumento',
        keywords: ['aumento', 'salario', 'promocao', 'merecimento'],
        text: 'Combinado. Eu sou sua gestora, agenda cheia, orçamento apertado. Começa você.\n\n(Meu primeiro movimento vai ser: "esse não é o melhor momento do ciclo". Prepare-se para não recuar na primeira negativa — reconheça o contexto e traga o que você entregou.)',
      },
      {
        id: 'dizer-nao',
        keywords: ['dizer nao', 'negar', 'recusar', 'nao consigo', 'sobrecarga', 'prioridade'],
        text: 'Certo, eu sou seu gestor e vou te pedir mais uma entrega para sexta.\n\n— "Preciso desse relatório até sexta, dá para encaixar?"\n\nDica antes de você responder: não comece por "não". Comece pelo que já está na mesa e devolva a escolha: "hoje tenho X e Y para sexta. Consigo o relatório se um dos dois for para a semana que vem — qual você prefere?"',
      },
      {
        id: 'desligamento',
        keywords: ['desligamento', 'demitir', 'demissao', 'encerrar contrato'],
        text: 'Vamos ensaiar. Eu sou a pessoa desligada e não estou esperando essa conversa.\n\nDuas regras da cena: a notícia vem nos primeiros 30 segundos, sem rodeio de aquecimento; e a decisão é comunicada, não negociada. Depois disso eu vou reagir — e você segura.\n\nPode começar quando quiser.',
      },
      {
        id: 'devolutiva',
        keywords: ['como fui', 'devolutiva', 'avalia', 'feedback da simulacao', 'terminei'],
        text: 'Fechando a cena. Olhando a conversa inteira:\n\n• O que funcionou: você trouxe fato concreto em vez de opinião genérica.\n• O que enfraqueceu: dois pedidos de desculpa desnecessários no começo — eles diluem a mensagem.\n• Para a próxima: uma pergunta aberta a mais no meio, para eu falar mais do que você.\n\nQuer rodar de novo com um nível de resistência maior?',
      },
      {
        id: 'cliente',
        keywords: ['cliente', 'atraso', 'erro', 'reclamacao', 'insatisfeito'],
        text: 'Perfeito. Eu sou o cliente e estou irritado com o atraso da entrega.\n\n— "Vocês prometeram para o dia 10. Estamos no dia 17 e ninguém me avisou nada."\n\nSua vez. (Reconheça antes de explicar: explicação antes do reconhecimento soa como desculpa.)',
      },
    ],
    fallbacks: [
      'Preciso do papel para entrar na cena: eu sou seu gestor, seu par, um cliente ou alguém do seu time?',
      'Me dá o cenário em uma frase e o nível de dificuldade (leve, médio ou duro) que eu começo.',
      'Quer continuar a cena ou parar aqui e ouvir minha devolutiva do que já rolou?',
    ],
  },
  {
    id: 'ag-tutor',
    slug: 'tutor',
    name: 'Téo',
    role: 'Tutor das aulas',
    description:
      'Responde dúvidas do conteúdo, explica de outro jeito quando não ficou claro e monta perguntas para você testar o que aprendeu.',
    category: 'Estudo',
    status: 'Disponível',
    avatar: 'tutor',
    createdBy: 'Camila Duarte',
    courseTitle: 'Todos os cursos publicados',
    courseIds: [],
    courseTitles: [],
    planIds: [],
    planNames: [],
    skills: ['Tirar dúvida da aula', 'Explicar de outro jeito', 'Simulado rápido'],
    conversationsCount: 2571,
    rating: 4.9,
    avgMinutes: 6,
    greeting:
      'E aí! Sou o Téo. Pergunta o que ficou confuso na aula — ou me pede um simulado que eu monto na hora com o conteúdo do seu curso.',
    starters: [
      {
        id: 'st-duvida',
        label: 'Não entendi um trecho da aula',
        message: 'Tem um trecho da aula que eu não entendi e queria uma explicação diferente.',
      },
      {
        id: 'st-simulado',
        label: 'Me faz um simulado',
        message: 'Me faz cinco perguntas sobre o que eu estudei essa semana.',
      },
      {
        id: 'st-resumo',
        label: 'Resumir o módulo',
        message: 'Resume para mim os pontos principais do módulo que acabei de terminar.',
      },
    ],
    replies: [
      {
        id: 'duvida',
        keywords: ['nao entendi', 'confuso', 'duvida', 'explica', 'trecho', 'perdido'],
        text: 'Sem problema — quase sempre é a ponte que faltou, não a sua atenção.\n\nMe diz duas coisas: o nome da aula e a frase exata que travou. Aí eu explico de três jeitos diferentes (definição curta, exemplo do dia a dia e contraexemplo), e você me diz qual fez sentido.',
      },
      {
        id: 'simulado',
        keywords: ['simulado', 'perguntas', 'quiz', 'teste', 'me pergunta', 'exercicio'],
        text: 'Bora. Cinco perguntas, uma de cada vez — responde sem consultar as notas:\n\n1. Em uma conversa de feedback, qual é a diferença prática entre fato e interpretação? Dá um exemplo do seu trabalho.\n\nQuando responder, eu comento e mando a próxima.',
      },
      {
        id: 'resumo',
        keywords: ['resumo', 'resumir', 'pontos principais', 'revisar modulo', 'recapitular'],
        text: 'Antes de eu resumir, um truque que faz o conteúdo grudar: escreve aqui, de cabeça, os três pontos que você lembra do módulo.\n\nDepois eu completo o que faltou e marco o que você já domina. Resumo lido esquece rápido; resumo que você tentou reconstruir, não.',
      },
      {
        id: 'prova-real',
        keywords: ['aplicar', 'na pratica', 'trabalho', 'usar isso', 'exemplo real'],
        text: 'Essa é a melhor pergunta que existe. Escolhe uma situação real que vai acontecer nos próximos sete dias — uma reunião, uma entrega, uma conversa.\n\nMe conta qual é e eu transformo o conteúdo da aula em três movimentos concretos para você usar nela.',
      },
    ],
    fallbacks: [
      'Me diz de qual aula ou módulo é a dúvida que eu busco o contexto certo.',
      'Você quer entender melhor, revisar ou testar o que já sabe? Cada um tem um caminho diferente.',
      'Escreve a dúvida do jeito que ela está na sua cabeça, mesmo bagunçada — eu organizo.',
    ],
  },
  {
    id: 'ag-rotina',
    slug: 'rotina-de-estudo',
    name: 'Dara',
    role: 'Organizadora de rotina de estudo',
    description:
      'Encaixa o curso na sua semana real, replaneja quando você atrasa e protege o horário que você consegue cumprir.',
    category: 'Estudo',
    status: 'Disponível',
    avatar: 'rotina',
    createdBy: 'Paula Nogueira',
    courseTitle: 'Gestão de tempo com intenção',
    courseId: 'c2',
    courseIds: ['c2'],
    courseTitles: ['Gestão de tempo com intenção'],
    planIds: ['1', '2', '3'],
    planNames: ['Plano Básico', 'Plano Pro', 'Plano Vitalício'],
    skills: ['Montar a semana', 'Replanejar atrasos', 'Ajustar a carga'],
    conversationsCount: 968,
    rating: 4.7,
    avgMinutes: 5,
    greeting:
      'Oi! Sou a Dara. Não trabalho com rotina ideal, trabalho com a que cabe na sua semana. Quantos minutos por dia você consegue de verdade?',
    starters: [
      {
        id: 'st-semana',
        label: 'Montar minha semana',
        message: 'Quero montar uma rotina de estudo que caiba na minha semana.',
      },
      {
        id: 'st-atraso',
        label: 'Estou atrasado na trilha',
        message: 'Estou atrasado na minha trilha e não sei como recuperar.',
      },
      {
        id: 'st-foco',
        label: 'Não consigo manter o foco',
        message: 'Começo a estudar e perco o foco em poucos minutos.',
      },
    ],
    replies: [
      {
        id: 'semana',
        keywords: ['semana', 'rotina', 'montar', 'horario', 'agenda', 'planejar'],
        text: 'Vamos montar com o que existe, não com o que seria bonito. Três perguntas:\n\n1. Quais dias da semana são realistas para você? (menos é melhor — três dias cumpridos batem sete planejados)\n2. Quantos minutos por sessão? (20 já resolve)\n3. Qual horário tem menos chance de ser sequestrado por outra coisa?\n\nCom essas respostas eu monto o plano e a gente ajusta na primeira semana. Você também pode aplicar direto em Minha Trilha.',
      },
      {
        id: 'atraso',
        keywords: ['atrasad', 'atraso', 'parei', 'abandonei', 'recuperar', 'sumido'],
        text: 'Atraso não se recupera com maratona — se recupera com corte.\n\n• Não tente pagar o acumulado. Marque o que passou como "visto por cima" e siga do ponto atual.\n• Reduza a meta pela metade por uma semana. O objetivo agora é voltar a cumprir, não avançar.\n• Escolha a próxima sessão mais curta que existir e faça hoje, mesmo que sejam 10 minutos.\n\nQuer que eu remonte a trilha com uma carga menor?',
      },
      {
        id: 'foco',
        keywords: ['foco', 'concentracao', 'distraio', 'celular', 'disperso', 'procrastin'],
        text: 'Foco perdido em poucos minutos costuma ser tamanho errado de tarefa, não falta de disciplina.\n\n• Troque "estudar o módulo" por "assistir a aula 3" — meta com fim visível.\n• Comece pelo trecho mais fácil. Começar é o custo alto, continuar é barato.\n• Celular em outro cômodo, não virado para baixo. Distância vence força de vontade.\n\nMe conta em que minuto você costuma perder o fio que eu ajusto o formato da sessão.',
      },
      {
        id: 'carga',
        keywords: ['pesado', 'muito conteudo', 'cansado', 'sobrecarga', 'nao dou conta'],
        text: 'Se está pesado, o plano está errado — não você.\n\nCorte para 60% da carga atual por duas semanas e mantenha só o conteúdo essencial da trilha. Aprofundamento e extras voltam quando as três sessões da semana estiverem saindo sem esforço.\n\nQuer que eu marque o que é essencial e o que pode esperar?',
      },
    ],
    fallbacks: [
      'Me dá dois números para eu trabalhar: quantos dias por semana e quantos minutos por sessão são realistas hoje?',
      'Você quer montar do zero, recuperar um atraso ou aliviar a carga atual?',
      'Qual foi a última semana em que o estudo funcionou? Costumo copiar o que já deu certo com você.',
    ],
  },
  {
    id: 'ag-um-a-um',
    slug: 'reunioes-1-1',
    name: 'Caio',
    role: 'Preparador de 1:1',
    description:
      'Monta a pauta da sua próxima conversa individual, sugere perguntas que abrem o jogo e cobra os combinados da anterior.',
    category: 'Liderança',
    status: 'Disponível',
    avatar: 'um-a-um',
    createdBy: 'Renata Alcântara',
    courseTitle: 'Liderança por influência',
    courseId: 'c3',
    courseIds: ['c3', 'c4'],
    courseTitles: ['Liderança por influência', 'Feedback que transforma'],
    planIds: ['2', '3'],
    planNames: ['Plano Pro', 'Plano Vitalício'],
    skills: ['Pauta da conversa', 'Perguntas que abrem', 'Combinados e follow-up'],
    conversationsCount: 754,
    rating: 4.8,
    avgMinutes: 8,
    greeting:
      'Olá! Sou o Caio. Um 1:1 bom não é atualização de tarefa — isso o quadro já mostra. Me conta com quem é a conversa e o que você quer que saia dela.',
    starters: [
      {
        id: 'st-pauta',
        label: 'Montar a pauta do meu 1:1',
        message: 'Tenho um 1:1 amanhã e quero montar a pauta.',
      },
      {
        id: 'st-desmotivado',
        label: 'Alguém do time está desanimado',
        message: 'Sinto que uma pessoa do meu time está desanimada e não sei como abordar.',
      },
      {
        id: 'st-silencio',
        label: 'A pessoa só responde "tudo bem"',
        message: 'Nos meus 1:1 a pessoa só responde que está tudo bem e a conversa morre.',
      },
    ],
    replies: [
      {
        id: 'pauta',
        keywords: ['pauta', 'agenda', '1:1', 'um a um', 'reuniao individual', 'amanha'],
        text: 'Estrutura que funciona em 30 minutos:\n\n• 5 min — como a pessoa está (de verdade, não status de tarefa).\n• 10 min — o assunto que ela trouxe. A pauta é dela primeiro.\n• 10 min — o que você precisa trazer: prioridade, ajuste, reconhecimento.\n• 5 min — combinados: o que cada um faz até a próxima.\n\nMe diz o nome do assunto que você precisa levar e eu escrevo a frase de abertura dele.',
      },
      {
        id: 'desanimo',
        keywords: ['desanim', 'desmotiv', 'apatic', 'desengaj', 'quer sair', 'triste'],
        text: 'Antes de resolver, cheque a leitura. Comece descrevendo o que você observou, sem diagnóstico:\n\n"Percebi que você tem falado menos nas reuniões das últimas semanas. Pode não ser nada, mas queria te perguntar direto: como você está?"\n\nDepois disso, silêncio. Espere até parecer desconfortável — é nesse espaço que a resposta real aparece. E não prometa solução na mesma conversa; prometa retorno com data.',
      },
      {
        id: 'silencio',
        keywords: ['tudo bem', 'nao fala', 'silencio', 'monossilab', 'nao abre', 'curta'],
        text: '"Tudo bem" costuma ser resposta a pergunta genérica. Troque por perguntas com recorte:\n\n• "O que te tomou mais energia essa semana?"\n• "Teve algum momento em que você travou esperando algo de mim?"\n• "Se você pudesse apagar uma reunião da sua agenda, qual seria?"\n\nE mude o cenário: 1:1 caminhando ou com câmera desligada costuma render mais que sala fechada.',
      },
      {
        id: 'combinados',
        keywords: ['combinado', 'follow', 'anterior', 'cobrar', 'nao fez', 'prometeu'],
        text: 'Combinado sem registro vira boa intenção. Duas linhas ao fim de cada 1:1 resolvem: o que ela faz, o que você faz, até quando.\n\nSe algo não andou, abra pela pergunta e não pela cobrança: "o que atrapalhou o que a gente combinou?". Normalmente aparece um bloqueio que é seu para remover.\n\nMe manda os combinados da última conversa que eu monto a retomada.',
      },
    ],
    fallbacks: [
      'Me situa: essa conversa é com alguém do seu time, um par ou seu gestor?',
      'O que você quer que seja diferente depois dessa conversa? Monto a pauta de trás para frente.',
      'Como terminou o último 1:1 de vocês? Costumo abrir a pauta retomando o que ficou pendente.',
    ],
  },
  {
    id: 'ag-carreira',
    slug: 'carreira',
    name: 'Íris',
    role: 'Conselheira de carreira',
    description:
      'Lê seu currículo, prepara você para entrevista e ajuda a montar um plano de desenvolvimento que não fica na gaveta.',
    category: 'Carreira',
    status: 'Disponível',
    avatar: 'carreira',
    createdBy: 'Marcos Ferraz',
    courseTitle: 'Inteligência emocional no trabalho',
    courseId: 'c6',
    courseIds: ['c6'],
    courseTitles: ['Inteligência emocional no trabalho'],
    planIds: ['2', '3'],
    planNames: ['Plano Pro', 'Plano Vitalício'],
    skills: ['Revisar currículo', 'Preparar entrevista', 'Plano de desenvolvimento'],
    conversationsCount: 1097,
    rating: 4.8,
    avgMinutes: 11,
    greeting:
      'Oi, sou a Íris. Posso revisar seu currículo, te preparar para uma entrevista ou ajudar a desenhar o próximo passo. Por onde a gente começa?',
    starters: [
      {
        id: 'st-curriculo',
        label: 'Revisar meu currículo',
        message: 'Quero uma revisão do meu currículo.',
      },
      {
        id: 'st-entrevista',
        label: 'Me preparar para uma entrevista',
        message: 'Tenho uma entrevista essa semana e quero me preparar.',
      },
      {
        id: 'st-pdi',
        label: 'Montar meu plano de desenvolvimento',
        message: 'Quero montar um plano de desenvolvimento para os próximos seis meses.',
      },
    ],
    replies: [
      {
        id: 'curriculo',
        keywords: ['curriculo', 'cv', 'resume', 'linkedin', 'perfil profissional'],
        text: 'Manda o texto de uma experiência só — eu reescrevo junto com você e o padrão fica claro para o resto.\n\nO que eu vou procurar:\n\n• Verbo de entrega no lugar de descrição de rotina ("responsável por" não diz nada).\n• Número em pelo menos metade das linhas: prazo, volume, economia, satisfação.\n• Escopo explícito: time de quantas pessoas, orçamento de quanto, quantos clientes.',
      },
      {
        id: 'entrevista',
        keywords: ['entrevista', 'processo seletivo', 'recrutador', 'me preparar', 'selecao'],
        text: 'Preparação que rende mais em pouco tempo:\n\n1. Escreva três histórias suas no formato situação → sua ação → resultado. Elas respondem 80% das perguntas comportamentais.\n2. Tenha um número em cada história. Número é o que fica na memória de quem entrevista.\n3. Prepare duas perguntas para eles sobre como o sucesso é medido na vaga.\n\nMe conta a vaga que eu escolho quais das suas histórias combinam melhor. Quer treinar respondendo? A Nina simula a entrevista com você.',
      },
      {
        id: 'pdi',
        keywords: ['pdi', 'plano de desenvolvimento', 'proximo passo', 'crescer', 'evoluir', 'seis meses'],
        text: 'Plano que sobrevive a seis meses tem três partes e nada além:\n\n• Uma competência só. Duas já competem entre si.\n• Uma prática semanal que exercite essa competência no trabalho real.\n• Uma evidência de que avançou — algo que outra pessoa consiga notar.\n\nMe diz a competência que você escolheria e eu proponho a prática semanal e a evidência.',
      },
      {
        id: 'transicao',
        keywords: ['mudar de area', 'transicao', 'trocar de emprego', 'sair', 'nova area', 'migrar'],
        text: 'Transição funciona melhor por ponte do que por salto. Três perguntas para achar a sua:\n\n1. O que você faz hoje que a área nova também usa? (esse é o seu ativo transferível)\n2. Qual a menor prova de interesse que você consegue entregar em 30 dias — um projeto interno, um curso concluído, um voluntariado?\n3. Quem já fez essa travessia e topa uma conversa de 20 minutos?\n\nResponde a primeira que a gente monta o resto.',
      },
    ],
    fallbacks: [
      'Me diz onde você está agora: quer sair, quer crescer onde está ou quer entender qual é o próximo passo?',
      'Qual o prazo dessa decisão? Preparação de entrevista para semana que vem é bem diferente de planejar seis meses.',
      'Me conta uma entrega sua dos últimos meses que você tem orgulho — costumo começar por ela.',
    ],
  },
  {
    id: 'ag-apresentacao',
    slug: 'apresentacoes',
    name: 'Vera',
    role: 'Revisora de apresentações',
    description:
      'Revisa a estrutura da sua apresentação, aponta onde a audiência se perde e ensaia a abertura com você.',
    category: 'Comunicação',
    status: 'Em manutenção',
    avatar: 'apresentacao',
    createdBy: 'Paula Nogueira',
    courseTitle: 'Comunicação que move pessoas',
    courseId: 'c1',
    courseIds: ['c1'],
    courseTitles: ['Comunicação que move pessoas'],
    planIds: ['2', '3'],
    planNames: ['Plano Pro', 'Plano Vitalício'],
    skills: ['Revisar estrutura', 'Ensaiar a abertura', 'Cortar slide demais'],
    conversationsCount: 288,
    rating: 4.5,
    avgMinutes: 9,
    unavailableNote: 'Em atualização pela equipe do curso. Volta ao ar em 15 de agosto.',
    greeting:
      'Oi! Sou a Vera. Estou em atualização no momento — assim que a equipe do curso publicar a nova versão, a gente conversa.',
    starters: [],
    replies: [],
    fallbacks: ['Estou em manutenção no momento. Volto em 15 de agosto com a nova versão do roteiro.'],
  },
];
