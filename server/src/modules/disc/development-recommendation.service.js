const FACTOR_LABELS = Object.freeze({
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
});

const CATALOG_VERSION = 'disc_recommendation_catalog_v2';

const ALLOWED_BOOK_PLATFORMS = Object.freeze(['Amazon', 'Kindle', 'Google Books']);
const ALLOWED_FILM_PLATFORMS = Object.freeze(['Netflix', 'Prime Video', 'HBO Max', 'Apple TV+']);

const RECOMMENDATION_CATALOG = Object.freeze({
  CS: Object.freeze({
    developmentFocus: [
      Object.freeze({ label: 'priorização com clareza executiva', tags: ['priorizacao', 'clareza', 'decisao'] }),
      Object.freeze({ label: 'comunicação objetiva em contextos críticos', tags: ['comunicacao', 'sintese', 'clareza'] }),
    ],
    books: [
      Object.freeze({
        type: 'book',
        title: 'Essencialismo',
        author: 'Greg McKeown',
        rationaleTags: ['priorizacao', 'foco', 'clareza'],
        priorityByProfile: Object.freeze({ CS: 10, SC: 9, C: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Essencialismo Greg McKeown' }),
      }),
      Object.freeze({
        type: 'book',
        title: 'Rápido e Devagar',
        author: 'Daniel Kahneman',
        rationaleTags: ['analise', 'decisao', 'criterio'],
        priorityByProfile: Object.freeze({ CS: 9, C: 9, SC: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Rápido e Devagar Daniel Kahneman' }),
      }),
      Object.freeze({
        type: 'book',
        title: 'A Única Coisa',
        author: 'Gary Keller',
        rationaleTags: ['foco', 'priorizacao', 'execucao'],
        priorityByProfile: Object.freeze({ CS: 8, SC: 8, C: 7 }),
        lookup: Object.freeze({ googleBooksQuery: 'A Única Coisa Gary Keller' }),
      }),
    ],
    films: [
      Object.freeze({
        type: 'film',
        title: 'Moneyball',
        director: 'Bennett Miller',
        rationaleTags: ['dados', 'decisao', 'metodo'],
        priorityByProfile: Object.freeze({ CS: 10, C: 9, SC: 8 }),
      }),
      Object.freeze({
        type: 'film',
        title: 'O Jogo da Imitação',
        director: 'Morten Tyldum',
        rationaleTags: ['analise', 'metodo', 'criterio'],
        priorityByProfile: Object.freeze({ CS: 9, C: 9, SC: 8 }),
      }),
    ],
  }),
  DI: Object.freeze({
    developmentFocus: [
      Object.freeze({ label: 'disciplina de execução com escuta ativa', tags: ['disciplina', 'escuta', 'consistencia'] }),
      Object.freeze({ label: 'consistência sob pressão', tags: ['consistencia', 'ritmo', 'decisao'] }),
    ],
    books: [
      Object.freeze({
        type: 'book',
        title: 'Princípios',
        author: 'Ray Dalio',
        rationaleTags: ['disciplina', 'decisao', 'criterio'],
        priorityByProfile: Object.freeze({ DI: 10, D: 9, ID: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Princípios Ray Dalio' }),
      }),
      Object.freeze({
        type: 'book',
        title: 'O Poder do Hábito',
        author: 'Charles Duhigg',
        rationaleTags: ['consistencia', 'execucao', 'rotina'],
        priorityByProfile: Object.freeze({ DI: 9, D: 8, ID: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'O Poder do Hábito Charles Duhigg' }),
      }),
    ],
    films: [
      Object.freeze({
        type: 'film',
        title: 'O Lobo de Wall Street',
        director: 'Martin Scorsese',
        rationaleTags: ['energia', 'resultado', 'autocontrole'],
        priorityByProfile: Object.freeze({ DI: 9, D: 9, ID: 8 }),
      }),
      Object.freeze({
        type: 'film',
        title: 'Steve Jobs',
        director: 'Danny Boyle',
        rationaleTags: ['direcao', 'decisao', 'consistencia'],
        priorityByProfile: Object.freeze({ DI: 8, D: 8, ID: 8 }),
      }),
    ],
  }),
  ID: Object.freeze({
    developmentFocus: [
      Object.freeze({ label: 'foco e fechamento de prioridades', tags: ['foco', 'execucao', 'consistencia'] }),
      Object.freeze({ label: 'execução com cadência', tags: ['cadencia', 'priorizacao', 'disciplina'] }),
    ],
    books: [
      Object.freeze({
        type: 'book',
        title: 'Como Fazer Amigos e Influenciar Pessoas',
        author: 'Dale Carnegie',
        rationaleTags: ['comunicacao', 'influencia', 'relacionamento'],
        priorityByProfile: Object.freeze({ ID: 10, I: 9, DI: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Como Fazer Amigos e Influenciar Pessoas Dale Carnegie' }),
      }),
      Object.freeze({
        type: 'book',
        title: 'Mindset',
        author: 'Carol Dweck',
        rationaleTags: ['aprendizado', 'consistencia', 'foco'],
        priorityByProfile: Object.freeze({ ID: 9, I: 8, IS: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Mindset Carol Dweck' }),
      }),
    ],
    films: [
      Object.freeze({
        type: 'film',
        title: 'À Procura da Felicidade',
        director: 'Gabriele Muccino',
        rationaleTags: ['persistencia', 'foco', 'execucao'],
        priorityByProfile: Object.freeze({ ID: 9, I: 8, IS: 8 }),
      }),
      Object.freeze({
        type: 'film',
        title: 'O Discurso do Rei',
        director: 'Tom Hooper',
        rationaleTags: ['comunicacao', 'presenca', 'disciplina'],
        priorityByProfile: Object.freeze({ ID: 8, I: 8, IS: 7 }),
      }),
    ],
  }),
  SC: Object.freeze({
    developmentFocus: [
      Object.freeze({ label: 'decisão com ritmo sustentável', tags: ['decisao', 'ritmo', 'clareza'] }),
      Object.freeze({ label: 'clareza de prioridades com estabilidade', tags: ['priorizacao', 'estabilidade', 'execucao'] }),
    ],
    books: [
      Object.freeze({
        type: 'book',
        title: 'Trabalho Focado',
        author: 'Cal Newport',
        rationaleTags: ['foco', 'produtividade', 'execucao'],
        priorityByProfile: Object.freeze({ SC: 10, S: 9, CS: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Trabalho Focado Cal Newport' }),
      }),
      Object.freeze({
        type: 'book',
        title: 'Organize-se',
        author: 'David Allen',
        rationaleTags: ['metodo', 'organizacao', 'clareza'],
        priorityByProfile: Object.freeze({ SC: 9, S: 8, CS: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Organize-se David Allen' }),
      }),
    ],
    films: [
      Object.freeze({
        type: 'film',
        title: 'Interestelar',
        director: 'Christopher Nolan',
        rationaleTags: ['planejamento', 'constancia', 'decisao'],
        priorityByProfile: Object.freeze({ SC: 9, S: 8, CS: 8 }),
      }),
      Object.freeze({
        type: 'film',
        title: 'O Jogo da Imitação',
        director: 'Morten Tyldum',
        rationaleTags: ['analise', 'metodo', 'resolucao'],
        priorityByProfile: Object.freeze({ SC: 8, S: 8, CS: 8 }),
      }),
    ],
  }),
  DC: Object.freeze({
    developmentFocus: [
      Object.freeze({ label: 'decisão sob incerteza com governança', tags: ['decisao', 'risco', 'governanca'] }),
      Object.freeze({ label: 'estratégia com disciplina operacional', tags: ['estrategia', 'disciplina', 'execucao'] }),
    ],
    books: [
      Object.freeze({
        type: 'book',
        title: 'Antifrágil',
        author: 'Nassim Taleb',
        rationaleTags: ['risco', 'estrategia', 'decisao'],
        priorityByProfile: Object.freeze({ DC: 10, D: 9, C: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Antifrágil Nassim Taleb' }),
      }),
      Object.freeze({
        type: 'book',
        title: 'Hard Things About Hard Things',
        author: 'Ben Horowitz',
        rationaleTags: ['lideranca', 'decisao', 'execucao'],
        priorityByProfile: Object.freeze({ DC: 9, D: 8, C: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Hard Things About Hard Things Ben Horowitz' }),
      }),
    ],
    films: [
      Object.freeze({
        type: 'film',
        title: 'A Grande Aposta',
        director: 'Adam McKay',
        rationaleTags: ['analise', 'risco', 'estrategia'],
        priorityByProfile: Object.freeze({ DC: 10, D: 9, C: 9 }),
      }),
      Object.freeze({
        type: 'film',
        title: 'Margin Call',
        director: 'J.C. Chandor',
        rationaleTags: ['risco', 'decisao', 'pressao'],
        priorityByProfile: Object.freeze({ DC: 9, D: 8, C: 8 }),
      }),
    ],
  }),
  IS: Object.freeze({
    developmentFocus: [
      Object.freeze({ label: 'assertividade com empatia', tags: ['assertividade', 'limites', 'clareza'] }),
      Object.freeze({ label: 'decisão em contextos relacionais', tags: ['decisao', 'relacionamento', 'consistencia'] }),
    ],
    books: [
      Object.freeze({
        type: 'book',
        title: 'Comunicação Não Violenta',
        author: 'Marshall Rosenberg',
        rationaleTags: ['comunicacao', 'empatia', 'assertividade'],
        priorityByProfile: Object.freeze({ IS: 10, I: 8, S: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Comunicação Não Violenta Marshall Rosenberg' }),
      }),
      Object.freeze({
        type: 'book',
        title: 'Inteligência Emocional',
        author: 'Daniel Goleman',
        rationaleTags: ['autogestao', 'relacionamento', 'equilibrio'],
        priorityByProfile: Object.freeze({ IS: 9, I: 8, S: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Inteligência Emocional Daniel Goleman' }),
      }),
    ],
    films: [
      Object.freeze({
        type: 'film',
        title: 'Extraordinário',
        director: 'Stephen Chbosky',
        rationaleTags: ['empatia', 'relacionamento', 'respeito'],
        priorityByProfile: Object.freeze({ IS: 9, I: 8, S: 8 }),
      }),
      Object.freeze({
        type: 'film',
        title: 'Divertida Mente',
        director: 'Pete Docter',
        rationaleTags: ['emocao', 'equilibrio', 'autoconsciencia'],
        priorityByProfile: Object.freeze({ IS: 8, I: 7, S: 7 }),
      }),
    ],
  }),
  D: Object.freeze({
    developmentFocus: [
      Object.freeze({ label: 'liderança sustentável com escuta', tags: ['lideranca', 'escuta', 'consistencia'] }),
      Object.freeze({ label: 'disciplina de execução', tags: ['execucao', 'cadencia', 'priorizacao'] }),
    ],
    books: [
      Object.freeze({
        type: 'book',
        title: 'Execução',
        author: 'Larry Bossidy',
        rationaleTags: ['execucao', 'disciplina', 'resultado'],
        priorityByProfile: Object.freeze({ D: 10, DI: 9, DC: 9 }),
        lookup: Object.freeze({ googleBooksQuery: 'Execução Larry Bossidy' }),
      }),
      Object.freeze({
        type: 'book',
        title: 'Os 7 Hábitos das Pessoas Altamente Eficazes',
        author: 'Stephen Covey',
        rationaleTags: ['lideranca', 'disciplina', 'consistencia'],
        priorityByProfile: Object.freeze({ D: 9, DI: 8, DC: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Os 7 Hábitos Stephen Covey' }),
      }),
    ],
    films: [
      Object.freeze({
        type: 'film',
        title: 'Gladiador',
        director: 'Ridley Scott',
        rationaleTags: ['lideranca', 'resiliencia', 'execucao'],
        priorityByProfile: Object.freeze({ D: 9, DI: 8, DC: 8 }),
      }),
      Object.freeze({
        type: 'film',
        title: 'Fome de Poder',
        director: 'John Lee Hancock',
        rationaleTags: ['expansao', 'estrategia', 'resultado'],
        priorityByProfile: Object.freeze({ D: 8, DI: 8, DC: 8 }),
      }),
    ],
  }),
  I: Object.freeze({
    developmentFocus: [
      Object.freeze({ label: 'foco e consistência de entrega', tags: ['foco', 'consistencia', 'execucao'] }),
      Object.freeze({ label: 'priorização com disciplina', tags: ['priorizacao', 'disciplina', 'resultado'] }),
    ],
    books: [
      Object.freeze({
        type: 'book',
        title: 'Roube como um Artista',
        author: 'Austin Kleon',
        rationaleTags: ['criatividade', 'comunicacao', 'ritmo'],
        priorityByProfile: Object.freeze({ I: 9, ID: 8, IS: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Roube como um Artista Austin Kleon' }),
      }),
      Object.freeze({
        type: 'book',
        title: 'Show Your Work',
        author: 'Austin Kleon',
        rationaleTags: ['visibilidade', 'consistencia', 'pratica'],
        priorityByProfile: Object.freeze({ I: 9, ID: 8, IS: 7 }),
        lookup: Object.freeze({ googleBooksQuery: 'Show Your Work Austin Kleon' }),
      }),
    ],
    films: [
      Object.freeze({
        type: 'film',
        title: 'O Show de Truman',
        director: 'Peter Weir',
        rationaleTags: ['comunicacao', 'autenticidade', 'clareza'],
        priorityByProfile: Object.freeze({ I: 8, ID: 8, IS: 7 }),
      }),
      Object.freeze({
        type: 'film',
        title: 'La La Land',
        director: 'Damien Chazelle',
        rationaleTags: ['criatividade', 'disciplina', 'foco'],
        priorityByProfile: Object.freeze({ I: 8, ID: 7, IS: 7 }),
      }),
    ],
  }),
  S: Object.freeze({
    developmentFocus: [
      Object.freeze({ label: 'agilidade com segurança psicológica', tags: ['agilidade', 'seguranca', 'acao'] }),
      Object.freeze({ label: 'decisão progressiva em cenários de mudança', tags: ['decisao', 'mudanca', 'acao'] }),
    ],
    books: [
      Object.freeze({
        type: 'book',
        title: 'O Poder do Agora',
        author: 'Eckhart Tolle',
        rationaleTags: ['equilibrio', 'presenca', 'clareza'],
        priorityByProfile: Object.freeze({ S: 9, SC: 8, IS: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'O Poder do Agora Eckhart Tolle' }),
      }),
      Object.freeze({
        type: 'book',
        title: 'Hábitos Atômicos',
        author: 'James Clear',
        rationaleTags: ['consistencia', 'rotina', 'mudanca'],
        priorityByProfile: Object.freeze({ S: 10, SC: 9, IS: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Hábitos Atômicos James Clear' }),
      }),
    ],
    films: [
      Object.freeze({
        type: 'film',
        title: 'Comer, Rezar, Amar',
        director: 'Ryan Murphy',
        rationaleTags: ['autoconsciencia', 'mudanca', 'equilibrio'],
        priorityByProfile: Object.freeze({ S: 8, SC: 8, IS: 7 }),
      }),
      Object.freeze({
        type: 'film',
        title: 'A Vida Secreta de Walter Mitty',
        director: 'Ben Stiller',
        rationaleTags: ['mudanca', 'acao', 'coragem'],
        priorityByProfile: Object.freeze({ S: 9, SC: 8, IS: 7 }),
      }),
    ],
  }),
  C: Object.freeze({
    developmentFocus: [
      Object.freeze({ label: 'decisão com velocidade adequada', tags: ['decisao', 'agilidade', 'execucao'] }),
      Object.freeze({ label: 'execução orientada por critérios claros', tags: ['execucao', 'criterio', 'priorizacao'] }),
    ],
    books: [
      Object.freeze({
        type: 'book',
        title: 'Rápido e Devagar',
        author: 'Daniel Kahneman',
        rationaleTags: ['analise', 'decisao', 'criterio'],
        priorityByProfile: Object.freeze({ C: 10, CS: 9, DC: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Rápido e Devagar Daniel Kahneman' }),
      }),
      Object.freeze({
        type: 'book',
        title: 'Pensando em Sistemas',
        author: 'Donella Meadows',
        rationaleTags: ['sistemas', 'metodo', 'clareza'],
        priorityByProfile: Object.freeze({ C: 9, CS: 9, SC: 8 }),
        lookup: Object.freeze({ googleBooksQuery: 'Pensando em Sistemas Donella Meadows' }),
      }),
    ],
    films: [
      Object.freeze({
        type: 'film',
        title: 'O Jogo da Imitação',
        director: 'Morten Tyldum',
        rationaleTags: ['analise', 'metodo', 'resolucao'],
        priorityByProfile: Object.freeze({ C: 9, CS: 9, SC: 8 }),
      }),
      Object.freeze({
        type: 'film',
        title: 'Contato',
        director: 'Robert Zemeckis',
        rationaleTags: ['criterio', 'investigacao', 'metodo'],
        priorityByProfile: Object.freeze({ C: 8, CS: 8, SC: 7 }),
      }),
    ],
  }),
});

const FACTOR_ORDER = Object.freeze(['D', 'I', 'S', 'C']);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Math.round(toNumber(value, 0))));
}

function toPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeTitle(value) {
  return normalizeString(value)
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '');
}

function uniqueArray(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeScores(scores = {}) {
  const source = toPlainObject(scores);
  return {
    D: clampPercentage(source.D),
    I: clampPercentage(source.I),
    S: clampPercentage(source.S),
    C: clampPercentage(source.C),
  };
}

function sortFactorsDescending(scores = {}) {
  const normalized = normalizeScores(scores);
  return [...FACTOR_ORDER]
    .map((factor, index) => ({
      key: factor,
      value: normalized[factor],
      order: index,
    }))
    .sort((left, right) => right.value - left.value || left.order - right.order);
}

function resolveProfileShape(profile = {}, scores = {}) {
  const normalizedProfile = toPlainObject(profile);
  const factors = sortFactorsDescending(scores);
  const primary = factors[0]?.key || 'D';
  const secondary = factors[1]?.key || 'I';
  const profileName = normalizeString(normalizedProfile.name);
  const compactCode = `${primary}${secondary}`;
  const slashCode = `${primary}/${secondary}`;
  const primaryValue = clampPercentage(factors[0]?.value);
  const secondaryValue = clampPercentage(factors[1]?.value);

  return {
    primary,
    secondary,
    compactCode,
    slashCode,
    profileName,
    scores: normalizeScores(scores),
    factors,
    primaryGap: Math.max(0, primaryValue - secondaryValue),
  };
}

function resolveCatalogEntry(profileShape = {}) {
  if (RECOMMENDATION_CATALOG[profileShape.compactCode]) {
    return RECOMMENDATION_CATALOG[profileShape.compactCode];
  }

  const reversedCode = `${profileShape.secondary || ''}${profileShape.primary || ''}`;
  if (RECOMMENDATION_CATALOG[reversedCode]) {
    return RECOMMENDATION_CATALOG[reversedCode];
  }

  if (RECOMMENDATION_CATALOG[profileShape.primary]) {
    return RECOMMENDATION_CATALOG[profileShape.primary];
  }

  if (RECOMMENDATION_CATALOG[profileShape.secondary]) {
    return RECOMMENDATION_CATALOG[profileShape.secondary];
  }

  return RECOMMENDATION_CATALOG.CS;
}

function normalizeHistorySet(values = []) {
  return new Set(toArray(values).map((item) => normalizeTitle(item)).filter(Boolean));
}

function resolveHistory(history = {}) {
  const source = toPlainObject(history);
  return {
    lastRecommendedBooks: normalizeHistorySet([
      ...toArray(source.lastRecommendedBooks),
      ...toArray(source.books),
      ...toArray(source.lastBooks),
    ]),
    lastRecommendedFilms: normalizeHistorySet([
      ...toArray(source.lastRecommendedFilms),
      ...toArray(source.films),
      ...toArray(source.lastFilms),
    ]),
  };
}

function scoreCandidate(item = {}, context = {}) {
  const tags = Array.isArray(item.rationaleTags)
    ? item.rationaleTags.map((tag) => normalizeString(tag).toLowerCase()).filter(Boolean)
    : [];
  const focusTags = context.focusTags || [];
  const priorityByProfile = toPlainObject(item.priorityByProfile);
  const explicitPriority = toNumber(priorityByProfile[context.profileCode], 0);
  const primaryPriority = toNumber(priorityByProfile[context.primary], 0);
  const secondaryPriority = toNumber(priorityByProfile[context.secondary], 0);
  const focusMatches = focusTags.reduce((total, tag) => (tags.includes(tag) ? total + 1 : total), 0);

  return explicitPriority * 100 + primaryPriority * 10 + secondaryPriority * 5 + focusMatches;
}

function pickTopItem(items = [], context = {}, historySet = new Set()) {
  const candidates = Array.isArray(items) ? items.filter(Boolean) : [];
  if (candidates.length === 0) return null;

  const unseenCandidates = candidates.filter((item) => !historySet.has(normalizeTitle(item.title)));
  const source = unseenCandidates.length > 0 ? unseenCandidates : candidates;

  return [...source]
    .map((item) => ({
      item,
      score: scoreCandidate(item, context),
      title: normalizeString(item.title).toLowerCase(),
    }))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))[0]?.item || null;
}

function resolveFocusBundle(entry = {}, profileShape = {}) {
  const focus = Array.isArray(entry.developmentFocus) ? entry.developmentFocus : [];
  const selected = profileShape.primaryGap >= 20 ? focus.slice(0, 2) : focus.slice(0, 1);
  const labels = selected.map((item) => normalizeString(item.label)).filter(Boolean);
  const tags = uniqueArray(
    selected.flatMap((item) =>
      Array.isArray(item.tags)
        ? item.tags.map((tag) => normalizeString(tag).toLowerCase()).filter(Boolean)
        : [],
    ),
  );

  return { selected, labels, tags };
}

function joinWithConjunction(values = []) {
  const items = values.map((value) => normalizeString(value)).filter(Boolean);
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`;
}

function truncateText(value = '', maximumLength = 300) {
  const normalized = normalizeString(value).replaceAll(/\s+/g, ' ');
  if (normalized.length <= maximumLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maximumLength - 1)).trim()}…`;
}

function buildItemReason(profileShape = {}, focus = {}, itemType = 'book', title = '') {
  const primaryLabel = FACTOR_LABELS[profileShape.primary] || profileShape.primary;
  const secondaryLabel = FACTOR_LABELS[profileShape.secondary] || profileShape.secondary;
  const focusLabel = joinWithConjunction(focus.labels) || 'priorização e clareza';
  const resourceLabel = itemType === 'film' ? 'O filme' : 'O livro';
  return truncateText(
    `${resourceLabel} ${title ? `"${title}" ` : ''}foi indicado para um perfil ${profileShape.slashCode} (${primaryLabel}/${secondaryLabel}) com foco em ${focusLabel}, apoiando decisão prática e execução consistente.`,
    300,
  );
}

function buildDeterministicRationale(profileShape = {}, focus = {}) {
  const primaryLabel = FACTOR_LABELS[profileShape.primary] || profileShape.primary;
  const secondaryLabel = FACTOR_LABELS[profileShape.secondary] || profileShape.secondary;
  const focusLabel = joinWithConjunction(focus.labels) || 'priorização e decisão';
  return truncateText(
    `A indicação considera o perfil ${profileShape.slashCode} (${primaryLabel}/${secondaryLabel}) e prioriza desenvolvimento em ${focusLabel}, convertendo análise comportamental em ação executiva objetiva.`,
    300,
  );
}

function inferBookPlatforms(urls = []) {
  const normalizedUrls = toArray(urls).map((url) => normalizeString(url).toLowerCase()).filter(Boolean);
  const platforms = new Set();

  for (const url of normalizedUrls) {
    if (url.includes('amazon.')) platforms.add('Amazon');
    if (url.includes('kindle') || url.includes('amazon.')) platforms.add('Kindle');
    if (url.includes('play.google.com') || url.includes('books.google')) platforms.add('Google Books');
  }

  return [...platforms].filter((platform) => ALLOWED_BOOK_PLATFORMS.includes(platform));
}

function parseLookupFlag() {
  return ['1', 'true', 'yes', 'on'].includes(
    normalizeString(process.env.DISC_RECOMMENDATION_AVAILABILITY_LOOKUP).toLowerCase(),
  );
}

async function lookupBookAvailability(book = {}, enabled = false) {
  const checkedAt = new Date().toISOString();
  const query = normalizeString(book?.lookup?.googleBooksQuery || book?.title);
  const check = {
    consulted: false,
    checkedAt: '',
    source: '',
    matchedPlatforms: [],
  };

  if (!enabled || !query) {
    return {
      availability: null,
      check,
    };
  }

  check.consulted = true;
  check.checkedAt = checkedAt;
  check.source = 'Google Books API';

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), 2_500);

  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3&printType=books`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: timeoutController.signal,
      },
    );

    if (!response.ok) {
      return {
        availability: null,
        check,
      };
    }

    const data = await response.json();
    const firstItem = Array.isArray(data?.items) ? data.items[0] : null;
    const volumeInfo = toPlainObject(firstItem?.volumeInfo);
    const saleInfo = toPlainObject(firstItem?.saleInfo);
    const accessInfo = toPlainObject(firstItem?.accessInfo);
    const urls = uniqueArray(
      [volumeInfo.infoLink, saleInfo.buyLink, accessInfo.webReaderLink]
        .map((url) => normalizeString(url))
        .filter(Boolean),
    );
    const platforms = inferBookPlatforms(urls);
    check.matchedPlatforms = platforms;

    if (platforms.length === 0) {
      return {
        availability: null,
        check,
      };
    }

    return {
      availability: {
        platforms,
        checkedAt,
        source: 'Google Books API',
      },
      check,
    };
  } catch {
    return {
      availability: null,
      check,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildMetadata({
  mode = 'business',
  availabilityLookupEnabled = false,
  checks = {},
}) {
  return {
    mode: normalizeString(mode).toLowerCase() || 'business',
    catalogVersion: CATALOG_VERSION,
    availabilityLookupEnabled,
    availabilityChecks: checks,
    allowedPlatforms: {
      books: [...ALLOWED_BOOK_PLATFORMS],
      films: [...ALLOWED_FILM_PLATFORMS],
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function resolveDiscDevelopmentRecommendation({
  scores = {},
  profile = {},
  mode = 'business',
  history = {},
} = {}) {
  const normalizedScores = normalizeScores(scores);
  const profileShape = resolveProfileShape(profile, normalizedScores);
  const catalogEntry = resolveCatalogEntry(profileShape);
  const focus = resolveFocusBundle(catalogEntry, profileShape);
  const normalizedHistory = resolveHistory(history);
  const context = {
    profileCode: profileShape.compactCode,
    primary: profileShape.primary,
    secondary: profileShape.secondary,
    focusTags: focus.tags,
  };

  const book = pickTopItem(catalogEntry.books, context, normalizedHistory.lastRecommendedBooks);
  const film = pickTopItem(catalogEntry.films, context, normalizedHistory.lastRecommendedFilms);
  const availabilityLookupEnabled = parseLookupFlag();
  const { availability: bookAvailability, check: bookAvailabilityCheck } = await lookupBookAvailability(
    book,
    availabilityLookupEnabled,
  );

  return {
    title: 'Indicação Personalizada',
    mode: normalizeString(mode).toLowerCase() || 'business',
    profile: {
      code: profileShape.compactCode,
      slashCode: profileShape.slashCode,
      primary: profileShape.primary,
      secondary: profileShape.secondary,
      name: profileShape.profileName,
    },
    developmentFocus: focus.labels,
    rationale: buildDeterministicRationale(profileShape, focus),
    book: book
      ? {
          ...book,
          reason: buildItemReason(profileShape, focus, 'book', book.title),
          availability: bookAvailability,
        }
      : null,
    film: film
      ? {
          ...film,
          reason: buildItemReason(profileShape, focus, 'film', film.title),
          availability: null,
        }
      : null,
    metadata: buildMetadata({
      mode,
      availabilityLookupEnabled,
      checks: {
        book: bookAvailabilityCheck,
      },
    }),
  };
}

export { ALLOWED_BOOK_PLATFORMS, ALLOWED_FILM_PLATFORMS, CATALOG_VERSION, FACTOR_LABELS, RECOMMENDATION_CATALOG };
