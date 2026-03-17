import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(rawArgs = []) {
  return Object.fromEntries(
    rawArgs
      .filter((arg) => arg.startsWith('--'))
      .map((arg) => {
        const withoutPrefix = arg.slice(2);
        const separatorIndex = withoutPrefix.indexOf('=');
        if (separatorIndex === -1) return [withoutPrefix, 'true'];
        return [
          withoutPrefix.slice(0, separatorIndex),
          withoutPrefix.slice(separatorIndex + 1),
        ];
      }),
  );
}

function toNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseBooleanFlag(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function hash(text = '') {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) {
    value = (Math.imul(31, value) + text.charCodeAt(index)) | 0;
  }
  return Math.abs(value);
}

function pick(list = [], seed = 0) {
  if (!list.length) return '';
  return list[seed % list.length];
}

function uniqueItems(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function safeReadJsonFile(filePath = '') {
  const normalizedPath = String(filePath || '').trim();
  if (!normalizedPath) return null;

  try {
    return JSON.parse(readFileSync(resolve(__dirname, normalizedPath), 'utf8'));
  } catch (error) {
    console.warn(`[disc-engine] falha ao ler payload AI: ${error?.message || error}`);
    return null;
  }
}

function normalizeScores(inputScores) {
  const fallback = { D: 34, I: 32, S: 23, C: 11 };
  const raw = {
    D: toNumber(inputScores.D, fallback.D),
    I: toNumber(inputScores.I, fallback.I),
    S: toNumber(inputScores.S, fallback.S),
    C: toNumber(inputScores.C, fallback.C),
  };

  const total = raw.D + raw.I + raw.S + raw.C;
  if (!Number.isFinite(total) || total <= 0) {
    return fallback;
  }

  const normalized = {
    D: Math.round((raw.D / total) * 100),
    I: Math.round((raw.I / total) * 100),
    S: Math.round((raw.S / total) * 100),
    C: 0,
  };
  normalized.C = Math.max(0, 100 - normalized.D - normalized.I - normalized.S);
  return normalized;
}

function percentile(score, multiplier = 1.18) {
  return clamp(Math.round(40 + score * multiplier), 35, 97);
}

function computeProfile(scores) {
  const sorted = Object.entries(scores)
    .map(([key, value]) => ({ key, value }))
    .sort((left, right) => right.value - left.value);

  const primary = sorted[0]?.key || 'D';
  const secondary = sorted[1]?.key || 'I';
  return {
    primary,
    secondary,
    code: `${primary}${secondary}`,
    sorted,
  };
}

function buildBar(width, color) {
  return `<div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${color};"></div></div>`;
}

function renderList(items = [], color = 'var(--pur2)') {
  return `
    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:9px;">
      ${items
        .map(
          (item) => `
            <li style="display:flex;align-items:flex-start;gap:10px;font-size:12px;color:var(--t2);line-height:1.55;">
              <span style="width:7px;height:7px;border-radius:50%;background:${color};margin-top:5px;flex-shrink:0;"></span>
              <span>${esc(item)}</span>
            </li>`,
        )
        .join('')}
    </ul>
  `;
}

function renderTable(rows = [], headers = []) {
  return `
    <table class="tbl">
      <thead>
        <tr>${headers.map((header) => `<th>${esc(header)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>${row.map((value) => `<td>${value}</td>`).join('')}</tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function sectionCard(title, body, accentColor = 'var(--pur)', kicker = '') {
  return `
    <div class="card" style="border-top:2px solid ${accentColor};height:100%;">
      ${kicker ? `<div class="label-chip" style="margin-bottom:10px;">${esc(kicker)}</div>` : ''}
      <h3 style="font-size:16px;margin-bottom:8px;">${esc(title)}</h3>
      <div style="font-size:12px;line-height:1.6;color:var(--t2);">${body}</div>
    </div>
  `;
}

function infoMetric(label, value, tone = 'var(--pur2)') {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--bord);border-radius:10px;background:rgba(20,23,40,.75);">
      <span style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:1.2px;">${esc(label)}</span>
      <strong style="font-family:'Sora',sans-serif;font-size:14px;color:${tone};">${esc(value)}</strong>
    </div>
  `;
}

function ringSVG(percent, color = '#8b6dff', size = 120) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  return `
    <svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(-90deg)">
      <circle cx="60" cy="60" r="${radius}" fill="none" stroke="rgba(108,71,255,.15)" stroke-width="9"/>
      <circle
        cx="60"
        cy="60"
        r="${radius}"
        fill="none"
        stroke="${color}"
        stroke-width="9"
        stroke-linecap="round"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
      />
    </svg>
  `;
}

function radarSVG(scores, colors, width = 300, height = 300) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 34;
  const axes = [
    { label: 'D', angle: -45, value: scores.D / 100 },
    { label: 'I', angle: 45, value: scores.I / 100 },
    { label: 'S', angle: 135, value: scores.S / 100 },
    { label: 'C', angle: 225, value: scores.C / 100 },
  ];

  function point(angle, ratio) {
    const radians = (angle * Math.PI) / 180;
    return {
      x: cx + radius * ratio * Math.cos(radians),
      y: cy + radius * ratio * Math.sin(radians),
    };
  }

  const grid = [0.25, 0.5, 0.75, 1].map((ratio) => {
    const points = axes.map((axis) => point(axis.angle, ratio));
    return `<polygon points="${points.map((pt) => `${pt.x},${pt.y}`).join(' ')}" fill="none" stroke="rgba(108,71,255,.12)" stroke-width="1"/>`;
  });

  const axesLines = axes.flatMap((axis) => {
    const outerPoint = point(axis.angle, 1);
    const labelPoint = point(axis.angle, 1.18);
    return [
      `<line x1="${cx}" y1="${cy}" x2="${outerPoint.x}" y2="${outerPoint.y}" stroke="rgba(108,71,255,.2)" stroke-width="1.2"/>`,
      `<text x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="middle" dominant-baseline="middle" fill="${colors[axis.label]}" font-family="Sora,sans-serif" font-size="13" font-weight="800">${axis.label}</text>`,
    ];
  });

  const scorePoints = axes.map((axis) => point(axis.angle, axis.value));
  const polygon = `<polygon points="${scorePoints.map((pt) => `${pt.x},${pt.y}`).join(' ')}" fill="rgba(108,71,255,.18)" stroke="#8b6dff" stroke-width="2.4"/>`;
  const points = axes.map((axis, index) => {
    const current = scorePoints[index];
    const labelPoint = point(axis.angle, axis.value + 0.15);
    return `
      <circle cx="${current.x}" cy="${current.y}" r="5" fill="${colors[axis.label]}" stroke="#0d0f1e" stroke-width="2"/>
      <text x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="middle" dominant-baseline="middle" fill="${colors[axis.label]}" font-family="DM Sans,sans-serif" font-size="11" font-weight="700">${Math.round(axis.value * 100)}%</text>
    `;
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${grid.join('')}
      ${axesLines.join('')}
      ${polygon}
      ${points.join('')}
    </svg>
  `;
}

function barChartSVG(naturalScores, adaptedScores, colors) {
  const width = 460;
  const height = 220;
  const labels = ['D', 'I', 'S', 'C'];
  const barWidth = 28;
  const gap = 76;
  const startX = 48;

  const gridLines = Array.from({ length: 6 }, (_, index) => index * 10)
    .map((tick) => {
      const y = height - 30 - (tick / 55) * (height - 50);
      return `
        <line x1="40" y1="${y}" x2="${width - 10}" y2="${y}" stroke="rgba(108,71,255,.1)" stroke-width="1"/>
        <text x="34" y="${y}" text-anchor="end" dominant-baseline="middle" fill="#5a6280" font-size="10" font-family="DM Sans,sans-serif">${tick}</text>
      `;
    })
    .join('');

  const bars = labels
    .map((label, index) => {
      const x = startX + index * gap;
      const naturalHeight = (naturalScores[label] / 55) * (height - 50);
      const adaptedHeight = (adaptedScores[label] / 55) * (height - 50);
      const baseY = height - 30;
      return `
        <rect x="${x}" y="${baseY - naturalHeight}" width="${barWidth}" height="${naturalHeight}" rx="4" fill="${colors[label]}" opacity="0.88"/>
        <rect x="${x + barWidth + 4}" y="${baseY - adaptedHeight}" width="${barWidth}" height="${adaptedHeight}" rx="4" fill="${colors[label]}" opacity="0.35"/>
        <text x="${x + barWidth / 2}" y="${baseY - naturalHeight - 5}" text-anchor="middle" fill="${colors[label]}" font-size="10" font-family="DM Sans,sans-serif" font-weight="700">${naturalScores[label]}%</text>
        <text x="${x + barWidth + 4 + barWidth / 2}" y="${baseY - adaptedHeight - 5}" text-anchor="middle" fill="${colors[label]}" font-size="10" font-family="DM Sans,sans-serif" font-weight="600" opacity="0.8">${adaptedScores[label]}%</text>
        <text x="${x + barWidth + 2}" y="${height - 10}" text-anchor="middle" fill="${colors[label]}" font-family="Sora,sans-serif" font-size="13" font-weight="800">${label}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${gridLines}
      <line x1="40" y1="${height - 30}" x2="${width - 10}" y2="${height - 30}" stroke="rgba(108,71,255,.25)" stroke-width="1.5"/>
      ${bars}
      <rect x="40" y="6" width="12" height="12" rx="3" fill="#8b6dff" opacity="0.88"/>
      <text x="56" y="14" fill="#8890b5" font-size="11" font-family="DM Sans,sans-serif" dominant-baseline="middle">Natural</text>
      <rect x="110" y="6" width="12" height="12" rx="3" fill="#8b6dff" opacity="0.35"/>
      <text x="126" y="14" fill="#8890b5" font-size="11" font-family="DM Sans,sans-serif" dominant-baseline="middle">Adaptado</text>
    </svg>
  `;
}

function lineSVG(naturalScores, adaptedScores, colors) {
  const width = 460;
  const height = 200;
  const keys = ['D', 'I', 'S', 'C'];
  const xPositions = [60, 160, 280, 400];
  const maxValue = 55;

  function yPosition(value) {
    return height - 30 - (value / maxValue) * (height - 50);
  }

  const grid = Array.from({ length: 6 }, (_, index) => index * 10)
    .map((tick) => {
      const y = yPosition(tick);
      return `
        <line x1="40" y1="${y}" x2="${width - 10}" y2="${y}" stroke="rgba(108,71,255,.08)" stroke-width="1"/>
        <text x="34" y="${y}" text-anchor="end" dominant-baseline="middle" fill="#5a6280" font-size="10" font-family="DM Sans,sans-serif">${tick}</text>
      `;
    })
    .join('');

  const naturalLine = keys.map((key, index) => `${xPositions[index]},${yPosition(naturalScores[key])}`).join(' ');
  const adaptedLine = keys.map((key, index) => `${xPositions[index]},${yPosition(adaptedScores[key])}`).join(' ');
  const points = keys
    .map(
      (key, index) => `
        <circle cx="${xPositions[index]}" cy="${yPosition(naturalScores[key])}" r="5" fill="${colors[key]}" stroke="#0d0f1e" stroke-width="2"/>
        <circle cx="${xPositions[index]}" cy="${yPosition(adaptedScores[key])}" r="4" fill="${colors[key]}" opacity="0.5" stroke="#0d0f1e" stroke-width="1.5"/>
        <text x="${xPositions[index]}" y="${height - 10}" text-anchor="middle" fill="${colors[key]}" font-family="Sora,sans-serif" font-size="12" font-weight="800">${key}</text>
      `,
    )
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${grid}
      <line x1="40" y1="${height - 30}" x2="${width - 10}" y2="${height - 30}" stroke="rgba(108,71,255,.25)" stroke-width="1.5"/>
      <polyline points="${naturalLine}" fill="none" stroke="#8b6dff" stroke-width="2.5" stroke-linejoin="round"/>
      <polyline points="${adaptedLine}" fill="none" stroke="rgba(139,109,255,.4)" stroke-width="2" stroke-dasharray="6,4" stroke-linejoin="round"/>
      ${points}
      <line x1="40" y1="14" x2="60" y2="14" stroke="#8b6dff" stroke-width="2.5"/>
      <text x="65" y="14" fill="#8890b5" font-size="11" font-family="DM Sans,sans-serif" dominant-baseline="middle">Natural</text>
      <line x1="110" y1="14" x2="130" y2="14" stroke="rgba(139,109,255,.4)" stroke-width="2" stroke-dasharray="4,3"/>
      <text x="135" y="14" fill="#8890b5" font-size="11" font-family="DM Sans,sans-serif" dominant-baseline="middle">Adaptado</text>
    </svg>
  `;
}

function behaviorMapSVG(scores, profileCode) {
  const width = 300;
  const height = 300;
  const centerX = width / 2;
  const centerY = height / 2;
  const peopleScore = (scores.I + scores.S) / 2;
  const activeScore = (scores.D + scores.I) / 2;
  const pointX = centerX + ((peopleScore - 50) / 50) * (centerX - 30);
  const pointY = centerY - ((activeScore - 50) / 50) * (centerY - 30);

  return `
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${centerX}" height="${centerY}" fill="rgba(255,85,85,.04)"/>
      <rect x="${centerX}" y="0" width="${centerX}" height="${centerY}" fill="rgba(245,200,66,.04)"/>
      <rect x="0" y="${centerY}" width="${centerX}" height="${centerY}" fill="rgba(66,232,216,.04)"/>
      <rect x="${centerX}" y="${centerY}" width="${centerX}" height="${centerY}" fill="rgba(139,109,255,.04)"/>
      <line x1="${centerX}" y1="0" x2="${centerX}" y2="${height}" stroke="rgba(108,71,255,.2)" stroke-width="1.5"/>
      <line x1="0" y1="${centerY}" x2="${width}" y2="${centerY}" stroke="rgba(108,71,255,.2)" stroke-width="1.5"/>
      <text x="${centerX / 2}" y="18" text-anchor="middle" fill="#ff5555" font-family="Sora,sans-serif" font-size="10" font-weight="700">Ativo · Tarefa</text>
      <text x="${centerX + centerX / 2}" y="18" text-anchor="middle" fill="#f5c842" font-family="Sora,sans-serif" font-size="10" font-weight="700">Ativo · Pessoas</text>
      <text x="${centerX / 2}" y="${height - 6}" text-anchor="middle" fill="#42e8d8" font-family="Sora,sans-serif" font-size="10" font-weight="700">Passivo · Pessoas</text>
      <text x="${centerX + centerX / 2}" y="${height - 6}" text-anchor="middle" fill="#8b6dff" font-family="Sora,sans-serif" font-size="10" font-weight="700">Passivo · Tarefa</text>
      <circle cx="${pointX}" cy="${pointY}" r="18" fill="rgba(108,71,255,.12)" stroke="rgba(108,71,255,.25)" stroke-width="1"/>
      <circle cx="${pointX}" cy="${pointY}" r="9" fill="#8b6dff" stroke="#0d0f1e" stroke-width="2"/>
      <text x="${pointX}" y="${pointY + 28}" text-anchor="middle" fill="#8b6dff" font-family="Sora,sans-serif" font-size="10" font-weight="700">${esc(profileCode)}</text>
    </svg>
  `;
}

const args = parseArgs(argv.slice(2));

const MODE_CONFIG = {
  personal: {
    label: 'Personal',
    output: 'relatorio_disc_personal.html',
    targetPages: 10,
  },
  professional: {
    label: 'Professional',
    output: 'relatorio_disc_professional.html',
    targetPages: 16,
  },
  business: {
    label: 'Business',
    output: 'relatorio_disc_business.html',
    targetPages: 26,
  },
};

const REPORT_FLAGS = {
  personal: {
    showNaturalAdapted: false,
    showBenchmark: false,
    showIndexes: false,
    showQuadrant: false,
    showAdvancedMatrix: false,
    showNegotiation: false,
    showSales: false,
    showLeadership: false,
    showCareer: false,
    showRelationships: true,
    showPersonalGrowth: true,
    showWorkContext: false,
  },
  professional: {
    showNaturalAdapted: true,
    showBenchmark: false,
    showIndexes: true,
    showQuadrant: true,
    showAdvancedMatrix: false,
    showNegotiation: false,
    showSales: false,
    showLeadership: true,
    showCareer: true,
    showRelationships: true,
    showPersonalGrowth: true,
    showWorkContext: true,
  },
  business: {
    showNaturalAdapted: true,
    showBenchmark: true,
    showIndexes: true,
    showQuadrant: true,
    showAdvancedMatrix: true,
    showNegotiation: true,
    showSales: true,
    showLeadership: true,
    showCareer: true,
    showRelationships: true,
    showPersonalGrowth: true,
    showWorkContext: true,
  },
};

const mode = String(args.mode || 'business').toLowerCase();
const selectedMode = MODE_CONFIG[mode] || MODE_CONFIG.business;
const output = args.output || selectedMode.output;
const flags = REPORT_FLAGS[mode] || REPORT_FLAGS.business;
const aiRequested = parseBooleanFlag(args.useAi) || Boolean(String(args.aiInput || '').trim());
const aiContent = aiRequested ? safeReadJsonFile(args.aiInput) : null;
const aiEnabled = Boolean(aiContent && typeof aiContent === 'object');

const FACTOR_META = {
  D: {
    name: 'Dominância',
    short: 'Direção e velocidade',
    color: '#ff5555',
    tone: 'Perfis com alta Dominância tendem a assumir a frente, acelerar decisões e buscar controle sobre o resultado.',
  },
  I: {
    name: 'Influência',
    short: 'Expressão e conexão',
    color: '#f5c842',
    tone: 'Perfis com alta Influência geram energia social, persuadem com facilidade e criam adesão por meio da comunicação.',
  },
  S: {
    name: 'Estabilidade',
    short: 'Ritmo e constância',
    color: '#42e8d8',
    tone: 'Perfis com alta Estabilidade preservam o clima, sustentam processos e criam segurança relacional no time.',
  },
  C: {
    name: 'Conformidade',
    short: 'Rigor e precisão',
    color: '#8b6dff',
    tone: 'Perfis com alta Conformidade buscam consistência, criticidade técnica e padrões de qualidade antes de decidir.',
  },
};

const PROFILE_NAMES = {
  DD: 'Dominante Puro',
  DI: 'Dominante Influente',
  DS: 'Dominante Estável',
  DC: 'Dominante Analítico',
  ID: 'Influente Dominante',
  II: 'Influente Puro',
  IS: 'Influente Estável',
  IC: 'Influente Analítico',
  SD: 'Estável Dominante',
  SI: 'Estável Influente',
  SS: 'Estável Puro',
  SC: 'Estável Analítico',
  CD: 'Analítico Dominante',
  CI: 'Analítico Influente',
  CS: 'Analítico Estável',
  CC: 'Analítico Puro',
};

const TEXT_DB = {
  sintese: {
    DI: [
      'Combina velocidade de decisão com alta energia relacional. É um perfil que mobiliza pessoas enquanto mantém o foco em metas ambiciosas.',
      'Perfil de protagonismo comercial e executivo: assume a frente, influencia com naturalidade e tende a converter pressão em movimento.',
    ],
    ID: [
      'Persuasão somada a senso de urgência. O perfil articula bem, cria conexão e direciona ações com intensidade acima da média.',
      'Mistura visibilidade, repertório social e pressão por resultado. Funciona muito bem em contextos comerciais ou de liderança dinâmica.',
    ],
    DS: [
      'Entrega firmeza com cadência. Há direção clara, mas com maior constância operacional e preocupação com sustentação do time.',
      'Perfil que busca resultado sem romper a estrutura. Lidera com segurança e tende a trazer estabilidade para a execução.',
    ],
    DC: [
      'Combina assertividade com rigor. Decide rápido quando tem parâmetros sólidos e eleva o padrão de qualidade do ambiente.',
      'Perfil orientado a controle, precisão e eficiência. Costuma performar bem em operações críticas ou funções de alta responsabilidade.',
    ],
    IS: [
      'Engaja com leveza, empatia e boa presença social. Funciona muito bem em contextos de relacionamento, cultura e integração.',
      'Perfil caloroso, persuasivo e agregador. Conecta pessoas e mantém o ambiente produtivo por meio da influência positiva.',
    ],
    IC: [
      'Comunica com clareza e sustenta argumentos com lógica. É uma combinação favorável para vendas consultivas e apresentações estratégicas.',
      'Relacionamento e precisão aparecem juntos: o perfil tende a convencer melhor quando organiza bem os dados e a narrativa.',
    ],
    SI: [
      'Preserva relações, acolhe o time e exerce influência de forma estável. Costuma ser percebido como alguém confiável e acessível.',
      'Perfil de cooperação alta com boa habilidade de engajamento. Sustenta o clima e cria segurança nas interações.',
    ],
    SC: [
      'Consistência com método. Tende a trabalhar em ritmo previsível, com boa leitura de processo e atenção real aos detalhes.',
      'Perfil de apoio técnico e operacional: confiável, disciplinado e importante para ambientes que exigem precisão com estabilidade.',
    ],
    CD: [
      'Rigor analítico com postura firme. Costuma elevar a exigência técnica e reduzir margem para improvisação.',
      'Perfil que equilibra cobrança por resultado com pensamento estruturado. Funciona bem em áreas técnicas, financeiras ou reguladas.',
    ],
    default: [
      'O perfil apresenta uma combinação singular dos quatro fatores DISC, com distribuição que favorece adaptação a contextos distintos.',
      'A leitura indica uma configuração comportamental equilibrada, com predominâncias específicas que orientam estilo, decisões e relações.',
    ],
  },
  fortes: {
    D: [
      ['Liderança assertiva', 'Assume responsabilidade com rapidez e tende a direcionar cenários complexos com objetividade.'],
      ['Impulso para resultado', 'Mantém senso de urgência e transforma metas em ação concreta.'],
      ['Coragem para decidir', 'Tolera bem pressão e evita paralisia diante de ambiguidade.'],
      ['Iniciativa elevada', 'Provoca movimento e reduz inércia em equipes ou projetos.'],
      ['Resiliência competitiva', 'Usa desafio como combustível para entrega.'],
    ],
    I: [
      ['Persuasão natural', 'Mobiliza adesão com comunicação clara, presença e carisma.'],
      ['Energia social', 'Cria conexão rápida com grupos, pares e clientes.'],
      ['Capacidade de influenciar', 'Consegue vender ideias e engajar stakeholders com facilidade.'],
      ['Otimismo contagiante', 'Ajuda o ambiente a manter ritmo e motivação.'],
      ['Criatividade relacional', 'Encontra caminhos de articulação por meio de pessoas.'],
    ],
    S: [
      ['Consistência operacional', 'Sustenta entregas previsíveis e acompanha o processo até o fim.'],
      ['Confiabilidade', 'Gera segurança por agir com calma, disciplina e disponibilidade.'],
      ['Escuta genuína', 'Absorve nuances e ajuda a reduzir ruído relacional.'],
      ['Cooperação elevada', 'Prefere construir com o grupo e fortalecer vínculos.'],
      ['Paciência estratégica', 'Tolera ciclos longos sem perder presença.'],
    ],
    C: [
      ['Rigor analítico', 'Valida premissas, dados e riscos antes de consolidar uma decisão.'],
      ['Qualidade de entrega', 'Mantém alto padrão técnico e atenção a detalhes relevantes.'],
      ['Leitura crítica', 'Questiona inconsistências e evita atalhos frágeis.'],
      ['Organização', 'Cria ordem, método e previsibilidade nas rotinas.'],
      ['Responsabilidade técnica', 'Preserva conformidade, precisão e rastreabilidade.'],
    ],
  },
  limitacoes: {
    D: [
      ['Impaciência', 'Pode acelerar além da capacidade do contexto ou das pessoas.'],
      ['Escuta seletiva', 'Corre o risco de filtrar demais opiniões divergentes.'],
      ['Centralização', 'Assume mais decisões do que deveria quando o cenário aperta.'],
      ['Baixa tolerância a lentidão', 'Pode tensionar processos que exigem cadência.'],
      ['Diretividade excessiva', 'Em excesso, é percebido como imposição.'],
    ],
    I: [
      ['Dispersão', 'Pode perder profundidade ao priorizar estímulo e variedade.'],
      ['Baixa disciplina de follow-up', 'Necessita rotina mais forte para sustentar execução detalhada.'],
      ['Otimismo sem checagem', 'Risco de subestimar restrições ou detalhes críticos.'],
      ['Busca de aprovação', 'Pode adiar conversas duras para preservar clima.'],
      ['Inconstância', 'A intensidade relacional pode variar com o ambiente.'],
    ],
    S: [
      ['Baixa confrontação', 'Pode evitar conflito mesmo quando ele é necessário.'],
      ['Resistência à mudança brusca', 'Tende a proteger o conhecido antes de experimentar o novo.'],
      ['Ritmo cauteloso', 'Em cenários acelerados, pode parecer lento para decidir.'],
      ['Excesso de acomodação', 'Corre o risco de suportar padrões que deveriam ser desafiados.'],
      ['Menor visibilidade', 'Nem sempre comunica com força o próprio valor.'],
    ],
    C: [
      ['Análise prolongada', 'Pode atrasar escolhas ao buscar segurança máxima.'],
      ['Rigidez com método', 'Excesso de critério pode frear adaptação.'],
      ['Distanciamento relacional', 'Foco em tarefa pode soar frio em ambientes mais sociais.'],
      ['Autocrítica alta', 'Pode elevar demais o padrão interno e gerar tensão desnecessária.'],
      ['Baixa tolerância a imprecisão', 'Ambiguidade excessiva costuma consumir energia.'],
    ],
  },
  comunicacao: {
    D: 'Comunicação direta, objetiva e orientada a encaminhamento. Prefere reuniões rápidas, mensagens claras e foco no que precisa acontecer agora.',
    I: 'Comunicação expansiva, persuasiva e conectada às pessoas. Usa presença, entusiasmo e storytelling para criar movimento.',
    S: 'Comunicação estável, respeitosa e acolhedora. Valoriza contexto, clareza e segurança relacional antes da ação.',
    C: 'Comunicação criteriosa, estruturada e fundamentada em dados. Prefere argumentos consistentes, ordem lógica e precisão.',
  },
  ambiente: {
    D: ['Autonomia para decidir', 'Desafios ambiciosos e mensuráveis', 'Liberdade para acelerar entregas', 'Espaço para protagonismo'],
    I: ['Interação frequente com pessoas', 'Ambiente energizado e responsivo', 'Espaço para criar e apresentar ideias', 'Reconhecimento social do impacto'],
    S: ['Relações confiáveis e previsíveis', 'Ambiente colaborativo e respeitoso', 'Clareza de papéis e prioridades', 'Tempo para consolidar mudanças'],
    C: ['Critérios claros de qualidade', 'Processos e padrões bem definidos', 'Tempo para análise e revisão', 'Autonomia técnica com baixa improvisação'],
  },
  lideranca: {
    D: 'Lidera pela direção, clareza de meta e velocidade de resposta. Funciona melhor quando calibra autonomia com escuta.',
    I: 'Lidera por energia, visibilidade e mobilização de pessoas. Ganha potência quando adiciona disciplina de execução.',
    S: 'Lidera por suporte, consistência e confiança. É mais efetivo quando enfrenta conversas difíceis mais cedo.',
    C: 'Lidera por padrão técnico, estrutura e critério. Expande impacto quando simplifica a comunicação e aproxima o time.',
  },
};

const MOTIVATORS = {
  D: [
    'Autonomia real para decidir e avançar sem excesso de validação.',
    'Metas ousadas com critério claro de sucesso.',
    'Ambiente competitivo que reconhece impacto e velocidade.',
    'Projetos onde possa assumir protagonismo e resolver gargalos.',
  ],
  I: [
    'Espaço para influenciar pessoas e apresentar ideias.',
    'Reconhecimento visível do impacto gerado.',
    'Ambiente com energia, interação e abertura a novas abordagens.',
    'Liberdade para testar narrativas, conexões e soluções criativas.',
  ],
  S: [
    'Estabilidade suficiente para aprofundar relações e processo.',
    'Clima respeitoso, colaborativo e previsível.',
    'Objetivos claros com suporte consistente da liderança.',
    'Ritmo que permita consolidar confiança e qualidade relacional.',
  ],
  C: [
    'Parâmetros claros de qualidade, risco e conformidade.',
    'Tempo para analisar antes de assumir compromisso.',
    'Ambiente organizado com pouca improvisação desnecessária.',
    'Autonomia técnica para aprofundar, revisar e aperfeiçoar.',
  ],
};

const RELATIONSHIPS = {
  D: [
    'Tende a valorizar objetividade e reciprocidade de postura.',
    'Precisa moderar intensidade para não reduzir espaço de escuta.',
    'Constrói respeito rápido quando demonstra consistência entre discurso e entrega.',
    'Relaciona-se melhor quando percebe maturidade para lidar com franqueza.',
  ],
  I: [
    'Cria conexão com rapidez e tende a aproximar pessoas com facilidade.',
    'Precisa cuidar para não prometer mais do que conseguirá sustentar.',
    'Fortalece vínculos quando alia carisma a constância.',
    'Relacionamentos evoluem melhor quando mantém follow-up disciplinado.',
  ],
  S: [
    'Gera segurança, confiança e sensação de apoio contínuo.',
    'Precisa explicitar mais seus limites para evitar sobrecarga silenciosa.',
    'Relaciona-se melhor em ambientes com respeito e previsibilidade.',
    'Fortalece a parceria quando comunica discordâncias com mais clareza.',
  ],
  C: [
    'Constrói confiança por consistência, seriedade e qualidade do que entrega.',
    'Precisa traduzir pensamento técnico para uma linguagem mais acessível.',
    'Relacionamentos amadurecem melhor quando há clareza de critério e combinado.',
    'Fortalece conexão quando comunica intenção antes da crítica.',
  ],
};

const GROWTH_PATHS = {
  D: [
    'Treinar escuta ativa em momentos de divergência.',
    'Delegar com contexto e checkpoints, não com controle excessivo.',
    'Sustentar resultado sem atropelar o ritmo do time.',
    'Transformar urgência em cadência replicável.',
  ],
  I: [
    'Criar rotina de execução e revisão semanal.',
    'Aumentar profundidade analítica antes de compromissos importantes.',
    'Preservar consistência nos combinados após a empolgação inicial.',
    'Converter influência em disciplina de entrega.',
  ],
  S: [
    'Assumir mais posicionamento em decisões difíceis.',
    'Experimentar mudança com pequenos ciclos de teste.',
    'Expor contribuições com mais visibilidade e firmeza.',
    'Elevar agilidade sem perder consistência.',
  ],
  C: [
    'Simplificar a comunicação em cenários com múltiplos públicos.',
    'Decidir com 80% de informação quando o contexto exige velocidade.',
    'Reduzir perfeccionismo que atrasa impacto.',
    'Trazer mais proximidade relacional para a liderança técnica.',
  ],
};

const WORK_STYLE = {
  D: [
    'Prefere ciclos curtos, autonomia e controle de prioridade.',
    'Funciona melhor quando o objetivo está claro e há margem para agir.',
    'Entrega mais em cenários com pouca burocracia e alta responsabilização.',
  ],
  I: [
    'Produz bem em ambientes colaborativos, dinâmicos e com alto contato humano.',
    'Tende a performar melhor quando consegue articular pessoas e manter ritmo visível.',
    'Valoriza variedade, resposta rápida e espaço para influenciar.',
  ],
  S: [
    'Entrega com qualidade quando o contexto oferece previsibilidade e estabilidade.',
    'Prefere relações de confiança, clareza de papel e rotina bem alinhada.',
    'Costuma sustentar bem a operação quando o ambiente respeita cadência.',
  ],
  C: [
    'Trabalha melhor com método, critério e baixa ambiguidade.',
    'Valoriza processos claros, documentação e decisões rastreáveis.',
    'Entrega acima da média quando pode revisar e validar antes da publicação.',
  ],
};

const DECISION_STYLE = {
  D: [
    'Decide com rapidez e tende a aceitar risco calculado.',
    'Valoriza velocidade, controle e capacidade de reação.',
    'Ganha precisão quando desacelera para ouvir sinais do contexto.',
  ],
  I: [
    'Decide com base em leitura social, oportunidade e energia do cenário.',
    'Usa intuição relacional para avançar e engajar pessoas.',
    'Fica melhor quando adiciona critério objetivo de priorização.',
  ],
  S: [
    'Decide depois de comparar impactos, ouvir pessoas e buscar previsibilidade.',
    'Prefere minimizar ruptura e preservar consistência do sistema.',
    'Ganha potência quando assume posição mais cedo em cenários críticos.',
  ],
  C: [
    'Decide com análise, evidência e alto cuidado técnico.',
    'Busca reduzir falhas antes de assumir compromisso.',
    'Expande impacto quando aceita algum grau de imperfeição operacional.',
  ],
};

const TEAMWORK = {
  D: [
    'Contribui com foco, direcionamento e senso de urgência.',
    'Ajuda o time a sair da inércia e decidir sob pressão.',
    'Precisa equilibrar cobrança com espaço de participação.',
  ],
  I: [
    'Conecta pessoas, melhora clima e estimula colaboração espontânea.',
    'Ajuda o time a comunicar melhor ideias e manter entusiasmo.',
    'Precisa garantir mais disciplina no acompanhamento.',
  ],
  S: [
    'Sustenta cooperação, previsibilidade e apoio entre pares.',
    'É referência de estabilidade em momentos de transição.',
    'Precisa colocar opinião com mais firmeza quando há desalinhamento.',
  ],
  C: [
    'Eleva padrão técnico, método e consistência do grupo.',
    'Ajuda o time a enxergar riscos, erros e gaps de qualidade.',
    'Precisa simplificar o discurso para manter adesão do coletivo.',
  ],
};

const PRESSURE_RESPONSE = {
  D: {
    productive: ['Assume a dianteira rapidamente.', 'Mantém foco em resolver e destravar.', 'Tolera tensão aguda melhor do que a média.'],
    attention: ['Pode endurecer demais a comunicação.', 'Tende a centralizar e reduzir consulta.', 'Corre o risco de atropelar o ritmo coletivo.'],
  },
  I: {
    productive: ['Ativa rede, influencia e mantém energia alta.', 'Ajuda a preservar moral do grupo.', 'Consegue mobilizar rapidamente o entorno.'],
    attention: ['Pode dispersar o foco central.', 'Corre o risco de prometer além da execução.', 'Pode evitar mensagens duras em tempo útil.'],
  },
  S: {
    productive: ['Preserva estabilidade e reduz ruído relacional.', 'Ajuda o time a manter constância.', 'Sustenta execução com serenidade.'],
    attention: ['Pode demorar a confrontar problemas.', 'Segura tensão até o limite em vez de verbalizar.', 'Pode resistir à mudança urgente.'],
  },
  C: {
    productive: ['Aumenta atenção a risco e detalhe crítico.', 'Protege qualidade e conformidade.', 'Evita decisões frágeis sob pressão.'],
    attention: ['Pode travar em análise excessiva.', 'Eleva criticidade e rigidez com o time.', 'Pode perder timing por busca de segurança total.'],
  },
};

const NEGOTIATION = {
  D: ['Negocia com firmeza, foco em ganho concreto e baixa tolerância a rodeios.', 'É forte quando precisa definir limites, preço ou contrapartida.'],
  I: ['Negocia pela construção de relação e leitura de contexto social.', 'Ganha vantagem quando cria confiança, ritmo e adesão emocional.'],
  S: ['Negocia preservando vínculo, previsibilidade e segurança para ambos os lados.', 'Tende a construir acordos sustentáveis e de longo prazo.'],
  C: ['Negocia com base em critério, detalhe e consistência argumentativa.', 'É forte quando o processo exige precisão, cláusula e validação técnica.'],
};

const SALES = {
  D: ['Venda consultiva com senso de urgência e fechamento rápido.', 'Funciona melhor em ciclos onde decisão e impacto precisam aparecer logo.'],
  I: ['Venda relacional, comunicativa e de alto engajamento.', 'Gera tração quando precisa apresentar valor, inspirar e contornar objeções sociais.'],
  S: ['Venda por confiança, escuta e manutenção do vínculo.', 'Performa melhor em ciclos mais longos, de fidelização e relacionamento consistente.'],
  C: ['Venda baseada em diagnóstico, evidência e segurança técnica.', 'É forte em propostas complexas, cenários regulados e soluções que exigem precisão.'],
};

const CAREER_PATHS = {
  D: ['Liderança comercial', 'Operações com metas agressivas', 'Empreendedorismo', 'Transformação de negócios'],
  I: ['Desenvolvimento de negócios', 'Relacionamento com clientes', 'Treinamento e facilitação', 'Marketing consultivo'],
  S: ['Customer success', 'Gestão de pessoas', 'Operação recorrente', 'Projetos de longo prazo'],
  C: ['Qualidade e compliance', 'Finanças e controladoria', 'Produto/processos', 'Consultoria técnica'],
};

const EXECUTIVE_RECOMMENDATIONS = {
  D: [
    'Criar checkpoints de escuta para reduzir decisões solitárias.',
    'Separar urgência real de urgência percebida antes de escalar o time.',
    'Delegar responsabilidade com indicador claro de autonomia.',
  ],
  I: [
    'Conectar energia relacional a critérios objetivos de execução.',
    'Formalizar acordos-chave logo após reuniões críticas.',
    'Usar influência para alinhar prioridades, não só para engajar.',
  ],
  S: [
    'Trazer mais posicionamento explícito em fóruns de decisão.',
    'Criar rituais de feedback para evitar acúmulo silencioso de tensão.',
    'Antecipar impacto de mudança com comunicação estruturada.',
  ],
  C: [
    'Definir quando profundidade analítica é suficiente para decidir.',
    'Traduzir risco técnico em mensagens executivas simples.',
    'Adicionar proximidade relacional à liderança baseada em critério.',
  ],
};

const scores = normalizeScores({
  D: args.d,
  I: args.i,
  S: args.s,
  C: args.c,
});

const D = scores.D;
const I = scores.I;
const S = scores.S;
const C = scores.C;

const nome = args.nome ?? 'João Silva';
const cargo = args.cargo ?? 'Gerente Comercial';
const empresa = args.empresa ?? 'Empresa XYZ';
const data = args.data ?? new Date().toLocaleDateString('pt-BR');

const profile = computeProfile(scores);
const profileName = PROFILE_NAMES[profile.code] || `${FACTOR_META[profile.primary].name} / ${FACTOR_META[profile.secondary].name}`;
const seed = hash(`${nome}-${D}-${I}-${S}-${C}-${selectedMode.label}`);

const naturalScores = { D, I, S, C };
const deltas = {
  D: profile.primary === 'D' ? 6 : profile.secondary === 'D' ? 3 : -2,
  I: profile.primary === 'I' ? 5 : profile.secondary === 'I' ? 3 : -2,
  S: profile.primary === 'S' ? 4 : profile.secondary === 'S' ? 2 : -2,
  C: profile.primary === 'C' ? 4 : profile.secondary === 'C' ? 2 : -1,
};
const adaptedScores = {
  D: clamp(D + deltas.D, 5, 55),
  I: clamp(I + deltas.I, 5, 55),
  S: clamp(S + deltas.S, 5, 55),
  C: clamp(C + deltas.C, 5, 55),
};

const benchmark = {
  D: percentile(D, 1.2),
  I: percentile(I, 1.16),
  S: percentile(S, 1.12),
  C: percentile(C, 1.18),
};

const indices = {
  lideranca: clamp(Math.round(56 + D * 0.72 + I * 0.28), 35, 98),
  comunicacao: clamp(Math.round(50 + I * 0.78 + D * 0.18), 35, 98),
  execucao: clamp(Math.round(48 + D * 0.62 + S * 0.26), 35, 98),
  estabilidade: clamp(Math.round(42 + S * 0.75 + C * 0.36), 35, 98),
};

const behaviorSignals = {
  velocidade: clamp(Math.round(D * 1.7 + I * 1.15), 25, 98),
  influencia: clamp(Math.round(I * 1.9 + D * 0.55), 25, 98),
  consistencia: clamp(Math.round(S * 1.9 + C * 0.45), 25, 98),
  rigor: clamp(Math.round(C * 2 + S * 0.35), 20, 98),
};

const deterministicSummaryText = pick(TEXT_DB.sintese[profile.code] || TEXT_DB.sintese.default, seed);
const strengthRows = (TEXT_DB.fortes[profile.primary] || TEXT_DB.fortes.D).slice(0, 5);
const limitationRows = (TEXT_DB.limitacoes[profile.primary] || TEXT_DB.limitacoes.D).slice(0, 5);
const motivators = uniqueItems([...(MOTIVATORS[profile.primary] || []), ...(MOTIVATORS[profile.secondary] || [])]).slice(0, 4);
const relationshipGuidance = uniqueItems([...(RELATIONSHIPS[profile.primary] || []), ...(RELATIONSHIPS[profile.secondary] || [])]).slice(0, 4);
const growthGuidance = uniqueItems([...(GROWTH_PATHS[profile.primary] || []), ...(GROWTH_PATHS[profile.secondary] || [])]).slice(0, 4);
const workStyle = uniqueItems([...(WORK_STYLE[profile.primary] || []), ...(WORK_STYLE[profile.secondary] || [])]).slice(0, 4);
const decisionStyle = uniqueItems([...(DECISION_STYLE[profile.primary] || []), ...(DECISION_STYLE[profile.secondary] || [])]).slice(0, 4);
const teamworkStyle = uniqueItems([...(TEAMWORK[profile.primary] || []), ...(TEAMWORK[profile.secondary] || [])]).slice(0, 4);
const pressureProfile = PRESSURE_RESPONSE[profile.primary] || PRESSURE_RESPONSE.D;
const negotiationStyle = uniqueItems([...(NEGOTIATION[profile.primary] || []), ...(NEGOTIATION[profile.secondary] || [])]).slice(0, 4);
const salesStyle = uniqueItems([...(SALES[profile.primary] || []), ...(SALES[profile.secondary] || [])]).slice(0, 4);
const careerPaths = uniqueItems([...(CAREER_PATHS[profile.primary] || []), ...(CAREER_PATHS[profile.secondary] || [])]).slice(0, 4);
const executiveTips = uniqueItems([...(EXECUTIVE_RECOMMENDATIONS[profile.primary] || []), ...(EXECUTIVE_RECOMMENDATIONS[profile.secondary] || [])]).slice(0, 4);
const environmentNeeds = uniqueItems([...(TEXT_DB.ambiente[profile.primary] || []), ...(TEXT_DB.ambiente[profile.secondary] || [])]).slice(0, 4);
const strengthItems = uniqueItems([
  ...(Array.isArray(aiContent?.strengths) ? aiContent.strengths : []),
  ...strengthRows.map(([title, text]) => `${title}: ${text}`),
]).slice(0, 6);
const limitationItems = uniqueItems([
  ...(Array.isArray(aiContent?.limitations) ? aiContent.limitations : []),
  ...limitationRows.map(([title, text]) => `${title}: ${text}`),
]).slice(0, 6);
const developmentItems = uniqueItems([
  ...(Array.isArray(aiContent?.developmentRecommendations) ? aiContent.developmentRecommendations : []),
  ...growthGuidance,
]).slice(0, 6);
const careerRecommendationItems = uniqueItems([
  ...(Array.isArray(aiContent?.careerRecommendations) ? aiContent.careerRecommendations : []),
  ...careerPaths,
]).slice(0, 6);
const businessRecommendationItems = uniqueItems([
  ...(Array.isArray(aiContent?.businessRecommendations) ? aiContent.businessRecommendations : []),
  ...executiveTips,
]).slice(0, 6);
const summaryText = String(aiContent?.summary || '').trim() || deterministicSummaryText;
const executiveSummaryText = String(aiContent?.executiveSummary || '').trim() || summaryText;
const communicationText = String(aiContent?.communicationStyle || '').trim() || (TEXT_DB.comunicacao[profile.primary] || TEXT_DB.comunicacao.D);
const leadershipText = String(aiContent?.leadershipStyle || '').trim() || (TEXT_DB.lideranca[profile.primary] || TEXT_DB.lideranca.D);
const workStyleText =
  String(aiContent?.workStyle || '').trim() ||
  `O perfil tende a operar melhor quando consegue usar ${FACTOR_META[profile.primary].short.toLowerCase()} com apoio de ${FACTOR_META[profile.secondary].short.toLowerCase()} em um contexto coerente com seu ritmo.`;
const pressureBehaviorText =
  String(aiContent?.pressureBehavior || '').trim() ||
  'Sob pressão, o fator dominante tende a ficar mais evidente. O ganho está em reconhecer esse movimento cedo e adicionar um comportamento compensatório antes do excesso.';
const relationshipStyleText =
  String(aiContent?.relationshipStyle || '').trim() ||
  'A forma de se relacionar tende a refletir o fator dominante do perfil. Relações fluem melhor quando intenção, limites e forma de comunicação ficam explícitos.';
const professionalPositioningText =
  String(aiContent?.professionalPositioning || '').trim() ||
  'O posicionamento do perfil ganha mais força quando o fator dominante é usado com consciência e o fator secundário funciona como compensação prática do estilo.';

const highestFactor = profile.sorted[0];
const secondFactor = profile.sorted[1];
const lowestFactor = profile.sorted[profile.sorted.length - 1];
const adaptationDelta = Object.keys(naturalScores)
  .map((key) => ({
    key,
    delta: adaptedScores[key] - naturalScores[key],
  }))
  .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
const adaptationLevel =
  adaptationDelta.reduce((total, item) => total + Math.abs(item.delta), 0) / adaptationDelta.length < 4
    ? 'Baixa'
    : adaptationDelta.reduce((total, item) => total + Math.abs(item.delta), 0) / adaptationDelta.length < 7
      ? 'Moderada'
      : 'Alta';

const reportIntro =
  selectedMode.label === 'Personal'
    ? 'Leitura voltada a autoconhecimento, consciência comportamental e direcionamento prático para o dia a dia.'
    : selectedMode.label === 'Professional'
      ? 'Leitura orientada a carreira, ambiente de trabalho e desenvolvimento profissional aplicado.'
      : 'Leitura completa com aprofundamento executivo, contexto corporativo e recomendações avançadas.';

const COLORS = Object.fromEntries(
  Object.entries(FACTOR_META).map(([key, meta]) => [key, meta.color]),
);

function nav() {
  return `
    <div class="snav">
      <span class="snav-brand">InsightDISC · ${esc(selectedMode.label)} Report</span>
      <div class="snav-badges">
        <span class="sb d">D · ${D}%</span>
        <span class="sb i">I · ${I}%</span>
        <span class="sb s">S · ${S}%</span>
        <span class="sb c">C · ${C}%</span>
      </div>
    </div>
  `;
}

function makeSlide({ id, content, blobs = '' }) {
  return { id, content, blobs };
}

function coverSlide() {
  const topFactors = [highestFactor, secondFactor]
    .map((factor) => `${factor.key} · ${FACTOR_META[factor.key].name} (${factor.value}%)`)
    .join(' · ');

  return makeSlide({
    id: 'cover',
    blobs: `
      <div class="blob" style="width:420px;height:420px;background:#ff4d9e;top:-120px;left:-80px;opacity:.1;"></div>
      <div class="blob" style="width:360px;height:360px;background:#6c47ff;bottom:-90px;right:90px;opacity:.12;"></div>
    `,
    content: `
      <div style="display:grid;grid-template-columns:280px 1fr 320px;gap:24px;align-items:stretch;padding:14px 0;">
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="card" style="border-top:2px solid var(--pur);display:flex;align-items:center;justify-content:center;min-height:210px;">
            ${radarSVG(scores, COLORS, 220, 220)}
          </div>
          <div class="card" style="border-top:2px solid rgba(108,71,255,.45);padding:0;overflow:hidden;">
            <div style="padding:10px 14px;background:rgba(108,71,255,.08);border-bottom:1px solid var(--bord);font-family:'Sora',sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--t3);">Dados do Avaliado</div>
            <div style="display:flex;flex-direction:column;">
              <div style="display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid var(--bord);font-size:12px;"><span style="color:var(--t3);">Nome</span><strong>${esc(nome)}</strong></div>
              <div style="display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid var(--bord);font-size:12px;"><span style="color:var(--t3);">Cargo</span><strong>${esc(cargo)}</strong></div>
              <div style="display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid var(--bord);font-size:12px;"><span style="color:var(--t3);">Empresa</span><strong>${esc(empresa)}</strong></div>
              <div style="display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid var(--bord);font-size:12px;"><span style="color:var(--t3);">Data</span><strong>${esc(data)}</strong></div>
              <div style="display:flex;justify-content:space-between;padding:9px 14px;font-size:12px;"><span style="color:var(--t3);">Modelo</span><strong>${esc(selectedMode.label)}</strong></div>
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;justify-content:center;gap:16px;">
          <div class="label-chip">InsightDISC · ${esc(selectedMode.label)} Edition</div>
          <h1 style="font-size:40px;">Relatório Comportamental DISC</h1>
          <p style="font-size:14px;color:var(--t3);max-width:500px;">${esc(reportIntro)}</p>

          <div class="card" style="border-top:2px solid var(--pur);">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px;">
              <div>
                <div style="font-family:'Sora',sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:8px;">Perfil predominante</div>
                <h2 style="font-size:28px;margin:0 0 8px;">${esc(profile.code)} · ${esc(profileName)}</h2>
                <p style="font-size:13px;margin:0;max-width:540px;">${esc(summaryText)}</p>
              </div>
              <div style="padding:8px 12px;border-radius:10px;background:rgba(108,71,255,.08);border:1px solid var(--bord);font-family:'Sora',sans-serif;font-size:12px;font-weight:700;color:var(--pur2);white-space:nowrap;">
                ${selectedMode.targetPages} páginas
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
              ${['D', 'I', 'S', 'C']
                .map(
                  (key) => `
                    <div style="padding:12px;border:1px solid var(--bord);border-radius:12px;background:rgba(20,23,40,.75);">
                      <div style="font-family:'Sora',sans-serif;font-size:26px;font-weight:800;color:${FACTOR_META[key].color};line-height:1;">${scores[key]}%</div>
                      <div style="font-family:'Sora',sans-serif;font-size:12px;font-weight:700;margin-top:7px;">${esc(FACTOR_META[key].name)}</div>
                      <div style="font-size:11px;color:var(--t4);margin-top:4px;">${esc(FACTOR_META[key].short)}</div>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;justify-content:center;">
          ${sectionCard('Leitura prioritária', renderList([`Fator dominante: ${FACTOR_META[highestFactor.key].name}.`, `Fator de apoio: ${FACTOR_META[secondFactor.key].name}.`, `Fator menos presente: ${FACTOR_META[lowestFactor.key].name}.`, topFactors], 'var(--pur2)'), 'var(--pur)')}
          ${sectionCard(
            'Indicadores-chave',
            [
              infoMetric('Índice de liderança', `${indices.lideranca}%`, 'var(--d)'),
              infoMetric('Índice de comunicação', `${indices.comunicacao}%`, 'var(--i)'),
              infoMetric('Índice de execução', `${indices.execucao}%`, 'var(--s)'),
              infoMetric('Estabilidade emocional', `${indices.estabilidade}%`, 'var(--c)'),
            ].join(''),
            'var(--pur)',
          )}
          ${sectionCard('Escopo do relatório', `<p style="margin:0 0 10px;">${esc(reportIntro)}</p><p style="margin:0;color:var(--t3);font-size:12px;">Este modelo foi calibrado para entregar profundidade compatível com ${selectedMode.targetPages} páginas, preservando a linguagem visual premium da plataforma.</p>`, 'var(--pur)')}
        </div>
      </div>
    `,
  });
}

function modelSlide() {
  return makeSlide({
    id: 'disc-model',
    blobs: `
      <div class="blob" style="width:340px;height:340px;background:#6c47ff;top:-70px;right:40px;opacity:.12;"></div>
      <div class="blob" style="width:260px;height:260px;background:#42e8d8;bottom:-40px;left:90px;opacity:.06;"></div>
    `,
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="label-chip">Base Metodológica</div>
        <h2 style="margin-bottom:0;">O modelo DISC aplicado ao perfil</h2>
        <p style="max-width:760px;font-size:14px;color:var(--t3);">O DISC organiza o comportamento em quatro fatores complementares. A distribuição entre eles mostra como a pessoa tende a agir, comunicar, decidir e responder ao ambiente.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1;">
          ${['D', 'I', 'S', 'C']
            .map(
              (key) => `
                <div class="card" style="border-top:3px solid ${FACTOR_META[key].color};display:flex;flex-direction:column;gap:10px;">
                  <div style="display:flex;align-items:center;gap:12px;">
                    <div class="ibox ${key.toLowerCase()}" style="font-family:'Sora',sans-serif;font-size:15px;font-weight:800;color:${FACTOR_META[key].color};">${key}</div>
                    <div>
                      <h3 style="margin:0 0 4px;">${esc(FACTOR_META[key].name)}</h3>
                      <p style="margin:0;font-size:12px;color:var(--t3);">${esc(FACTOR_META[key].short)}</p>
                    </div>
                  </div>
                  <p style="font-size:13px;">${esc(FACTOR_META[key].tone)}</p>
                  <div style="margin-top:auto;display:flex;align-items:center;gap:12px;">
                    ${buildBar(scores[key], FACTOR_META[key].color)}
                    <strong style="font-family:'Sora',sans-serif;color:${FACTOR_META[key].color};">${scores[key]}%</strong>
                  </div>
                </div>
              `,
            )
            .join('')}
        </div>
      </div>
    `,
  });
}

function executiveSummarySlide() {
  if (selectedMode.label === 'Personal') {
    return makeSlide({
      id: 'personal-summary',
      blobs: `<div class="blob" style="width:320px;height:320px;background:#6c47ff;bottom:-60px;right:60px;opacity:.12;"></div>`,
      content: `
        <div style="display:grid;grid-template-columns:420px 1fr;gap:26px;align-items:center;">
          <div class="card" style="border-top:2px solid var(--pur);display:flex;align-items:center;justify-content:center;min-height:420px;">
            ${radarSVG(scores, COLORS, 320, 320)}
          </div>
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div class="label-chip">Resumo DISC</div>
            <h2 style="margin-bottom:0;">Leitura objetiva do seu padrão</h2>
            <p style="font-size:14px;color:var(--t2);">${esc(executiveSummaryText)}</p>
            ${sectionCard('O que aparece primeiro', renderList([
              `${FACTOR_META[highestFactor.key].name} lidera a leitura e orienta o ritmo principal do perfil.`,
              `${FACTOR_META[secondFactor.key].name} sustenta a forma como o perfil se relaciona ou executa.`,
              `${FACTOR_META[lowestFactor.key].name} aparece menos e pode exigir desenvolvimento consciente.`,
              'A combinação dominante indica como você tende a reagir no dia a dia quando está confortável.',
            ], 'var(--pur2)'), 'var(--pur)')}
            ${sectionCard('O que observar na prática', renderList([
              'Situações de pressão mostram mais claramente os excessos do fator dominante.',
              'Relacionamentos fluem melhor quando você comunica necessidades e limites com clareza.',
              'Desenvolvimento comportamental não busca trocar o estilo, e sim ampliar repertório.',
            ], 'var(--s)'), 'var(--pur)')}
          </div>
        </div>
      `,
    });
  }

  const scopeCards =
    selectedMode.label === 'Professional'
      ? [
          ['Leitura profissional', 'Foco em ambiente de trabalho, comunicação, pressão e desenvolvimento de carreira.'],
          ['Síntese natural x adaptado', 'Mostra como o perfil se ajusta ao contexto atual sem aprofundamento benchmark.'],
          ['Aplicação prática', 'Transforma a leitura DISC em ações de produtividade, liderança e evolução profissional.'],
          ['Plano final', 'Fecha com recomendações e ação prática priorizada.'],
        ]
      : [
          ['Diagnóstico executivo', 'Inclui leitura estratégica, profundidade analítica e recomendações corporativas.'],
          ['Natural x adaptado completo', 'Aborda ajustes de contexto com visão visual e interpretação avançada.'],
          ['Benchmark e matriz', 'Acrescenta comparativos e blocos analíticos mais densos.'],
          ['Aplicação de negócio', 'Fecha com negociação, vendas, liderança e direcionamento executivo.'],
        ];

  return makeSlide({
    id: 'executive-summary',
    blobs: `<div class="blob" style="width:300px;height:300px;background:#ff4d9e;top:-40px;left:80px;opacity:.08;"></div>`,
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="label-chip">Sumário Executivo</div>
        <h2 style="margin-bottom:0;">Escopo do relatório ${esc(selectedMode.label)}</h2>
        <p style="font-size:14px;color:var(--t3);max-width:760px;">${esc(reportIntro)}</p>
        <div class="sum-grid" style="margin-top:4px;">
          ${scopeCards
            .map(
              ([title, text], index) => `
                <div class="sum-card">
                  <div class="sum-num">${String(index + 1).padStart(2, '0')}</div>
                  <div class="sum-title">${esc(title)}</div>
                  <p>${esc(text)}</p>
                </div>
              `,
            )
            .join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;">
          ${sectionCard('Síntese dominante', `<p style="margin:0;">${esc(executiveSummaryText)}</p>`, 'var(--pur)')}
          ${sectionCard('Fator de maior energia', `<p style="margin:0;"><strong>${esc(FACTOR_META[highestFactor.key].name)}</strong> com ${highestFactor.value}%.</p><p style="margin:8px 0 0;color:var(--t3);font-size:12px;">${esc(FACTOR_META[highestFactor.key].short)}</p>`, FACTOR_META[highestFactor.key].color)}
          ${sectionCard('Fator de menor presença', `<p style="margin:0;"><strong>${esc(FACTOR_META[lowestFactor.key].name)}</strong> com ${lowestFactor.value}%.</p><p style="margin:8px 0 0;color:var(--t3);font-size:12px;">Tende a demandar mais esforço consciente em cenários exigentes.</p>`, FACTOR_META[lowestFactor.key].color)}
        </div>
      </div>
    `,
  });
}

function overviewSlide() {
  return makeSlide({
    id: 'overview',
    blobs: `<div class="blob" style="width:280px;height:280px;background:#ff4d9e;top:80px;right:60px;opacity:.09;"></div>`,
    content: `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="label-chip">Visão Geral</div>
        <h2 style="margin-bottom:0;">Distribuição dos fatores e leitura de perfil</h2>
        <div class="scores">
          ${['D', 'I', 'S', 'C']
            .map((key, index) => {
              const ranking = profile.sorted.findIndex((item) => item.key === key);
              const label =
                ranking === 0 ? 'Fator primário' : ranking === 1 ? 'Fator secundário' : ranking === 2 ? 'Fator terciário' : 'Fator quaternário';
              return `
                <div class="sc-card">
                  <div class="sc-num" style="color:${FACTOR_META[key].color};">${scores[key]}%</div>
                  <div class="sc-name">${esc(FACTOR_META[key].name)}</div>
                  <div class="sc-rank">${label}</div>
                </div>
              `;
            })
            .join('')}
        </div>
        <div style="display:grid;grid-template-columns:1.1fr .9fr;gap:18px;">
          ${sectionCard('Síntese do perfil', `<p style="margin:0 0 10px;">${esc(summaryText)}</p><p style="margin:0;color:var(--t3);font-size:12px;">A combinação ${esc(profile.code)} indica como o perfil costuma responder quando há pouca pressão externa.</p>`, 'var(--pur)')}
          ${sectionCard(
            'Leituras rápidas',
            [
              infoMetric('Perfil predominante', `${profile.code} · ${profileName}`, 'var(--pur2)'),
              infoMetric('Fator mais alto', `${highestFactor.key} · ${highestFactor.value}%`, FACTOR_META[highestFactor.key].color),
              infoMetric('Fator de apoio', `${secondFactor.key} · ${secondFactor.value}%`, FACTOR_META[secondFactor.key].color),
              infoMetric('Fator menos alto', `${lowestFactor.key} · ${lowestFactor.value}%`, FACTOR_META[lowestFactor.key].color),
            ].join(''),
            'var(--pur)',
          )}
        </div>
      </div>
    `,
  });
}

function discSummarySlide() {
  return makeSlide({
    id: 'disc-summary',
    blobs: `<div class="blob" style="width:320px;height:320px;background:#6c47ff;top:50%;left:50%;transform:translate(-50%,-50%);opacity:.08;"></div>`,
    content: `
      <div style="display:grid;grid-template-columns:440px 1fr;gap:26px;align-items:center;">
        <div class="card" style="border-top:2px solid var(--pur);display:flex;align-items:center;justify-content:center;min-height:420px;">
          ${radarSVG(scores, COLORS, 340, 340)}
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="label-chip">Resumo Visual</div>
          <h2 style="margin-bottom:0;">Radar comportamental do perfil</h2>
          <p style="font-size:14px;color:var(--t2);">O radar mostra o equilíbrio relativo entre os quatro fatores e evidencia a energia principal do perfil.</p>
          ${['D', 'I', 'S', 'C']
            .map((key) =>
              sectionCard(
                `${key} · ${FACTOR_META[key].name}`,
                `<p style="margin:0 0 8px;">${esc(FACTOR_META[key].tone)}</p><div style="display:flex;align-items:center;gap:12px;">${buildBar(scores[key], FACTOR_META[key].color)}<strong style="font-family:'Sora',sans-serif;color:${FACTOR_META[key].color};">${scores[key]}%</strong></div>`,
                FACTOR_META[key].color,
              ),
            )
            .join('')}
        </div>
      </div>
    `,
  });
}

function naturalAdaptedSlide() {
  const keyDelta = adaptationDelta[0];
  return makeSlide({
    id: 'natural-adapted',
    blobs: `<div class="blob" style="width:320px;height:320px;background:#f5c842;bottom:50px;right:50px;opacity:.05;"></div>`,
    content: `
      <div style="display:grid;grid-template-columns:520px 1fr;gap:28px;align-items:center;">
        <div class="card" style="border-top:2px solid var(--pur);display:flex;align-items:center;justify-content:center;min-height:420px;">
          ${barChartSVG(naturalScores, adaptedScores, COLORS)}
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="label-chip">Natural vs Adaptado</div>
          <h2 style="margin-bottom:0;">Ajuste do perfil ao contexto atual</h2>
          <p style="font-size:14px;color:var(--t2);">A leitura natural mostra o estilo espontâneo. A leitura adaptada mostra quanto o ambiente atual pede ajustes para funcionar melhor.</p>
          ${sectionCard('Nível de adaptação', `<p style="margin:0 0 8px;">Adaptação <strong>${adaptationLevel}</strong> com maior variação em <strong>${keyDelta.key}</strong> (${keyDelta.delta >= 0 ? '+' : ''}${keyDelta.delta} pts).</p><p style="margin:0;color:var(--t3);font-size:12px;">Quanto maior o delta, maior a energia que o contexto pede do avaliado.</p>`, 'var(--pur)')}
          ${sectionCard('Leituras rápidas', renderList(adaptationDelta.slice(0, 4).map((item) => `${item.key}: ${naturalScores[item.key]}% → ${adaptedScores[item.key]}% (${item.delta >= 0 ? '+' : ''}${item.delta} pts)`), 'var(--pur2)'), 'var(--pur)')}
          ${sectionCard('Interpretação aplicada', `<p style="margin:0;">O maior ajuste atual aparece em <strong>${keyDelta.key}</strong>. Isso sugere que o contexto está pedindo mais ${esc(FACTOR_META[keyDelta.key].short.toLowerCase())} do que o padrão espontâneo.</p>`, 'var(--pur)')}
        </div>
      </div>
    `,
  });
}

function naturalAdaptedCompleteSlide() {
  const shifts = adaptationDelta.map((item) => [
    item.key,
    `${naturalScores[item.key]}%`,
    `${adaptedScores[item.key]}%`,
    `${item.delta >= 0 ? '+' : ''}${item.delta} pts`,
  ]);

  return makeSlide({
    id: 'natural-adapted-complete',
    blobs: `<div class="blob" style="width:360px;height:360px;background:#8b6dff;top:-70px;right:120px;opacity:.08;"></div>`,
    content: `
      <div style="display:grid;grid-template-columns:520px 1fr;gap:28px;align-items:center;">
        <div class="card" style="border-top:2px solid var(--pur);display:flex;align-items:center;justify-content:center;min-height:420px;">
          ${lineSVG(naturalScores, adaptedScores, COLORS)}
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="label-chip">Comparativo Completo</div>
          <h2 style="margin-bottom:0;">Leitura avançada da adaptação</h2>
          <p style="font-size:14px;color:var(--t2);">Nesta visão completa, a curva natural é comparada com a curva adaptada fator por fator, revelando onde o contexto puxa mais energia e onde há menor custo de adaptação.</p>
          ${renderTable(
            shifts.map((row) => row.map((value) => esc(value))),
            ['Fator', 'Natural', 'Adaptado', 'Delta'],
          )}
          ${sectionCard('Leitura executiva', `<p style="margin:0;">A combinação ${esc(profile.code)} segue dominante, mas o ambiente atual pressiona principalmente <strong>${esc(FACTOR_META[adaptationDelta[0].key].name)}</strong>. Isso é um bom indicador para calibrar energia, priorização e contexto de gestão.</p>`, 'var(--pur)')}
        </div>
      </div>
    `,
  });
}

function quadrantSlide() {
  const activeAxis = Math.round((scores.D + scores.I) / 2);
  const peopleAxis = Math.round((scores.I + scores.S) / 2);
  return makeSlide({
    id: 'quadrant',
    blobs: `<div class="blob" style="width:340px;height:340px;background:#42e8d8;bottom:20px;left:180px;opacity:.06;"></div>`,
    content: `
      <div style="display:grid;grid-template-columns:1fr 340px;gap:30px;align-items:center;">
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="label-chip">Mapa de Quadrante</div>
          <h2 style="margin-bottom:0;">Posicionamento do perfil no espaço DISC</h2>
          <p style="font-size:14px;color:var(--t2);">O quadrante ajuda a enxergar se a energia do perfil puxa mais para ação ou reflexão, e se o foco tende mais à tarefa ou às pessoas.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            ${sectionCard('Eixo Ativo ↔ Passivo', `<p style="margin:0 0 8px;">Ativação média: <strong>${activeAxis}%</strong>.</p><p style="margin:0;color:var(--t3);font-size:12px;">Quanto maior esse índice, mais o perfil tende a iniciar, pressionar e agir rapidamente.</p>`, 'var(--pur)')}
            ${sectionCard('Eixo Tarefa ↔ Pessoas', `<p style="margin:0 0 8px;">Orientação a pessoas: <strong>${peopleAxis}%</strong>.</p><p style="margin:0;color:var(--t3);font-size:12px;">Quanto maior esse índice, mais o perfil tende a influenciar, ouvir e mobilizar socialmente.</p>`, 'var(--pur)')}
            ${sectionCard('Quadrante dominante', `<p style="margin:0;">${esc(profile.code)} aparece mais próximo do quadrante que combina <strong>${activeAxis >= 50 ? 'ação' : 'cadência'}</strong> com <strong>${peopleAxis >= 50 ? 'pessoas' : 'tarefa'}</strong>.</p>`, 'var(--pur)')}
            ${sectionCard('Aplicação prática', renderList([
              'Use esse mapa para calibrar reuniões, feedback e distribuição de responsabilidades.',
              'Equipes mistas tendem a funcionar melhor quando o quadrante dominante é compensado pelos menos presentes.',
            ], 'var(--s)'), 'var(--pur)')}
          </div>
        </div>
        <div class="card" style="border-top:2px solid var(--pur);display:flex;align-items:center;justify-content:center;min-height:420px;">
          ${behaviorMapSVG(scores, profile.code)}
        </div>
      </div>
    `,
  });
}

function indexesSlide() {
  const cards = [
    ['Índice de liderança', indices.lideranca, FACTOR_META.D.color, 'Direção, firmeza e mobilização.'],
    ['Índice de comunicação', indices.comunicacao, FACTOR_META.I.color, 'Conexão, expressão e influência.'],
    ['Índice de execução', indices.execucao, FACTOR_META.S.color, 'Cadência para transformar plano em entrega.'],
    ['Estabilidade emocional', indices.estabilidade, FACTOR_META.C.color, 'Consistência sob tensão e ambiguidade.'],
  ];

  return makeSlide({
    id: 'indexes',
    blobs: `<div class="blob" style="width:360px;height:360px;background:#6c47ff;top:50%;left:50%;transform:translate(-50%,-50%);opacity:.1;"></div>`,
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;align-items:center;">
        <div class="label-chip">Índices Comportamentais</div>
        <h2 style="margin-bottom:0;text-align:center;">Leitura sintética do potencial comportamental</h2>
        <p style="font-size:14px;color:var(--t3);text-align:center;max-width:720px;">Os índices combinam fatores DISC em dimensões úteis para leitura profissional e executiva. Eles não substituem o perfil, mas ajudam a priorizar foco de desenvolvimento.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;width:100%;max-width:880px;">
          ${cards
            .map(
              ([title, percent, color, text]) => `
                <div class="card" style="display:flex;gap:16px;align-items:center;border-top:2px solid ${color};">
                  <div style="position:relative;width:120px;height:120px;flex-shrink:0;">
                    ${ringSVG(percent, color, 120)}
                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-size:24px;font-weight:800;color:#fff;">${percent}%</div>
                  </div>
                  <div>
                    <h3 style="font-size:16px;margin-bottom:6px;">${esc(title)}</h3>
                    <p style="margin:0;font-size:12px;color:var(--t2);">${esc(text)}</p>
                  </div>
                </div>
              `,
            )
            .join('')}
        </div>
      </div>
    `,
  });
}

function benchmarkSlide() {
  const ordered = Object.entries(benchmark).sort((left, right) => right[1] - left[1]);
  return makeSlide({
    id: 'benchmark',
    blobs: `<div class="blob" style="width:260px;height:260px;background:#ff5555;top:60px;right:80px;opacity:.05;"></div>`,
    content: `
      <div style="display:grid;grid-template-columns:1.1fr .9fr;gap:28px;align-items:center;">
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="label-chip">Benchmark</div>
          <h2 style="margin-bottom:0;">Comparativo de presença relativa dos fatores</h2>
          <p style="font-size:14px;color:var(--t2);">Leitura comparativa estimada para contextualizar o peso de cada fator no conjunto do perfil. O objetivo aqui é priorizar foco, não produzir laudo estatístico formal.</p>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${ordered
              .map(
                ([key, value]) => `
                  <div class="card" style="padding:14px 16px;border-left:3px solid ${FACTOR_META[key].color};">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                      <div>
                        <div style="font-family:'Sora',sans-serif;font-size:14px;font-weight:700;color:#fff;">${key} · ${esc(FACTOR_META[key].name)}</div>
                        <div style="font-size:12px;color:var(--t3);">${esc(FACTOR_META[key].short)}</div>
                      </div>
                      <strong style="font-family:'Sora',sans-serif;color:${FACTOR_META[key].color};">${value}º percentil</strong>
                    </div>
                    <div style="margin-top:10px;">${buildBar(value, FACTOR_META[key].color)}</div>
                  </div>
                `,
              )
              .join('')}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          ${sectionCard('Destaque principal', `<p style="margin:0;">O fator mais saliente neste benchmark é <strong>${ordered[0][0]}</strong>, o que reforça a leitura predominante de ${esc(FACTOR_META[ordered[0][0]].name.toLowerCase())} no funcionamento atual.</p>`, 'var(--pur)')}
          ${sectionCard('Leitura executiva', renderList([
            'Fatores acima de 70 tendem a aparecer com frequência perceptível no ambiente.',
            'Fatores abaixo de 55 costumam exigir intenção consciente para ganhar espaço.',
            'Use o benchmark para priorizar contexto, não para rotular limite fixo de capacidade.',
          ], 'var(--pur2)'), 'var(--pur)')}
          ${sectionCard('Interpretação de uso', `<p style="margin:0;">Em contexto corporativo, essa leitura ajuda a calibrar cargo, alocação, cobrança e composição de time com mais aderência comportamental.</p>`, 'var(--pur)')}
        </div>
      </div>
    `,
  });
}

function strengthsLimitationsSlide() {
  return makeSlide({
    id: 'strengths-limitations',
    blobs: `<div class="blob" style="width:260px;height:260px;background:#ff4d9e;top:40px;right:80px;opacity:.06;"></div>`,
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="label-chip">Forças e Atenções</div>
        <h2 style="margin-bottom:0;">Pontos fortes e limitações prováveis</h2>
        <div class="row" style="align-items:flex-start;">
          <div class="col">
            ${sectionCard('Forças predominantes', renderList(strengthItems, 'var(--s)'), 'var(--s)')}
          </div>
          <div class="col">
            ${sectionCard('Pontos de atenção', renderList(limitationItems, 'var(--d)'), 'var(--d)')}
          </div>
        </div>
      </div>
    `,
  });
}

function motivatorsSlide() {
  return makeSlide({
    id: 'motivators',
    blobs: `<div class="blob" style="width:280px;height:280px;background:#f5c842;top:-30px;left:140px;opacity:.05;"></div>`,
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="label-chip">Motivadores</div>
        <h2 style="margin-bottom:0;">O que tende a ativar energia e engajamento</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          ${motivators
            .map((item, index) => sectionCard(`Motivador ${index + 1}`, `<p style="margin:0;">${esc(item)}</p>`, 'var(--pur)'))
            .join('')}
        </div>
        ${sectionCard('Ambiente ideal para sustentar o melhor do perfil', renderList(environmentNeeds, 'var(--s)'), 'var(--pur)')}
      </div>
    `,
  });
}

function communicationSlide() {
  return makeSlide({
    id: 'communication',
    blobs: `<div class="blob" style="width:300px;height:300px;background:#42e8d8;bottom:-70px;right:140px;opacity:.06;"></div>`,
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:flex-start;">
        ${sectionCard('Estilo de comunicação', `<p style="margin:0 0 10px;">${esc(communicationText)}</p><p style="margin:0;color:var(--t3);font-size:12px;">A combinação com ${esc(FACTOR_META[profile.secondary].name)} adiciona nuance ao ritmo, à forma de convencer e ao tipo de mensagem que o perfil prefere receber.</p>`, 'var(--pur)')}
        ${sectionCard('Como se comunicar melhor com este perfil', renderList([
          'Seja claro sobre objetivo, prioridade e próximo passo.',
          profile.primary === 'D' ? 'Evite rodeios e traga decisão junto com contexto mínimo.' : profile.primary === 'I' ? 'Abra espaço para troca, influência e resposta rápida.' : profile.primary === 'S' ? 'Dê contexto, tempo de assimilação e previsibilidade.' : 'Traga fatos, critério e explicite premissas relevantes.',
          profile.secondary === 'C' ? 'Documente combinados importantes.' : profile.secondary === 'I' ? 'Use linguagem viva e aberta ao diálogo.' : profile.secondary === 'S' ? 'Mantenha constância e respeito ao ritmo.' : 'Mostre impacto e senso de urgência quando necessário.',
        ], 'var(--i)'), 'var(--pur)')}
      </div>
    `,
  });
}

function relationshipsGrowthSlide() {
  return makeSlide({
    id: 'relationships-growth',
    blobs: `<div class="blob" style="width:340px;height:340px;background:#6c47ff;top:-60px;right:70px;opacity:.08;"></div>`,
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:flex-start;">
        ${sectionCard('Relacionamentos e convivência', `<p style="margin:0 0 10px;">${esc(relationshipStyleText)}</p>${renderList(relationshipGuidance, 'var(--pur2)')}`, 'var(--pur)')}
        ${sectionCard('Crescimento pessoal', renderList(developmentItems, 'var(--s)'), 'var(--pur)')}
      </div>
    `,
  });
}

function actionPlanSlide() {
  const plan = [
    ['0-30 dias', developmentItems[0] || growthGuidance[0], 'Aumentar consciência do padrão dominante e observar gatilhos cotidianos.'],
    ['31-60 dias', developmentItems[1] || growthGuidance[1], 'Praticar novo comportamento em situações reais, com feedback simples e frequente.'],
    ['61-90 dias', developmentItems[2] || growthGuidance[2], 'Consolidar o ajuste em contexto relevante e definir manutenção.'],
  ];

  return makeSlide({
    id: 'action-plan',
    blobs: `<div class="blob" style="width:320px;height:320px;background:#ff4d9e;bottom:-80px;left:100px;opacity:.05;"></div>`,
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="label-chip">Plano de Ação</div>
        <h2 style="margin-bottom:0;">Próximos 90 dias de desenvolvimento</h2>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:8px;">
          ${plan
            .map(
              ([period, focus, description], index) => `
                <div class="card" style="border-top:2px solid var(--pur);">
                  <div style="width:42px;height:42px;border-radius:50%;background:var(--pur3);display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-size:16px;font-weight:800;margin-bottom:12px;">${index + 1}</div>
                  <h3 style="font-size:16px;margin-bottom:6px;">${esc(period)}</h3>
                  <p style="margin:0 0 10px;font-size:12px;color:var(--t3);">${esc(description)}</p>
                  <p style="margin:0;font-size:12px;"><strong>Foco:</strong> ${esc(focus)}</p>
                </div>
              `,
            )
            .join('')}
        </div>
        ${sectionCard('Recomendação final', `<p style="margin:0;">${esc(executiveSummaryText)}</p>`, 'var(--pur)')}
      </div>
    `,
  });
}

function professionalMotivationCommunicationSlide() {
  return makeSlide({
    id: 'motivation-communication',
    blobs: `<div class="blob" style="width:300px;height:300px;background:#f5c842;top:-40px;left:120px;opacity:.05;"></div>`,
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:flex-start;">
        ${sectionCard('Motivadores no trabalho', renderList(motivators, 'var(--pur2)'), 'var(--pur)')}
        ${sectionCard('Comunicação profissional', `<p style="margin:0 0 10px;">${esc(communicationText)}</p>${renderList(environmentNeeds.slice(0, 3), 'var(--i)')}`, 'var(--pur)')}
      </div>
    `,
  });
}

function workDecisionSlide() {
  return makeSlide({
    id: 'work-decision',
    blobs: `<div class="blob" style="width:280px;height:280px;background:#42e8d8;bottom:-70px;right:90px;opacity:.06;"></div>`,
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:flex-start;">
        ${sectionCard('Estilo de trabalho', `<p style="margin:0 0 10px;">${esc(workStyleText)}</p>${renderList(workStyle, 'var(--s)')}`, 'var(--pur)')}
        ${sectionCard('Tomada de decisão', renderList(decisionStyle, 'var(--pur2)'), 'var(--pur)')}
      </div>
    `,
  });
}

function leadershipTeamworkSlide() {
  return makeSlide({
    id: 'leadership-teamwork',
    blobs: `<div class="blob" style="width:320px;height:320px;background:#6c47ff;top:20px;right:140px;opacity:.08;"></div>`,
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:flex-start;">
        ${sectionCard('Liderança', `<p style="margin:0 0 10px;">${esc(leadershipText)}</p>${renderList(developmentItems.slice(0, 3), 'var(--d)')}`, 'var(--pur)')}
        ${sectionCard('Trabalho em equipe', renderList(teamworkStyle, 'var(--i)'), 'var(--pur)')}
      </div>
    `,
  });
}

function pressureRelationshipsSlide() {
  return makeSlide({
    id: 'pressure-relationships',
    blobs: `<div class="blob" style="width:340px;height:340px;background:#ff5555;bottom:-100px;left:80px;opacity:.05;"></div>`,
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:flex-start;">
        ${sectionCard('Comportamento sob pressão', `<p style="margin:0 0 10px;">${esc(pressureBehaviorText)}</p><h4 style="font-size:13px;margin:0 0 8px;color:var(--s);">Resposta produtiva</h4>${renderList(pressureProfile.productive, 'var(--s)')}<div style="height:12px;"></div><h4 style="font-size:13px;margin:0 0 8px;color:var(--d);">Pontos de atenção</h4>${renderList(pressureProfile.attention, 'var(--d)')}`, 'var(--pur)')}
        ${sectionCard('Relacionamentos profissionais', `<p style="margin:0 0 10px;">${esc(relationshipStyleText)}</p>${renderList(relationshipGuidance, 'var(--pur2)')}`, 'var(--pur)')}
      </div>
    `,
  });
}

function careerDevelopmentSlide() {
  return makeSlide({
    id: 'career-development',
    blobs: `<div class="blob" style="width:280px;height:280px;background:#8b6dff;top:-60px;left:120px;opacity:.08;"></div>`,
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:flex-start;">
        ${sectionCard('Carreira e aderência profissional', `<p style="margin:0 0 10px;">${esc(professionalPositioningText)}</p>${renderList(careerRecommendationItems, 'var(--pur2)')}`, 'var(--pur)')}
        ${sectionCard('Desenvolvimento profissional', renderList(developmentItems, 'var(--s)'), 'var(--pur)')}
      </div>
    `,
  });
}

function businessWorkStyleSlide() {
  return makeSlide({
    id: 'business-work-style',
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="label-chip">Contexto de Trabalho</div>
        <h2 style="margin-bottom:0;">Estilo de trabalho e ambiente de maior aderência</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
          ${sectionCard('Como tende a operar', `<p style="margin:0 0 10px;">${esc(workStyleText)}</p>${renderList(workStyle, 'var(--s)')}`, 'var(--pur)')}
          ${sectionCard('Condições que ampliam performance', renderList(environmentNeeds, 'var(--pur2)'), 'var(--pur)')}
        </div>
      </div>
    `,
  });
}

function businessDecisionSlide() {
  return makeSlide({
    id: 'business-decision',
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="label-chip">Decisão</div>
        <h2 style="margin-bottom:0;">Tomada de decisão em contexto corporativo</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
          ${sectionCard('Padrão dominante de escolha', `<p style="margin:0 0 10px;">${esc(professionalPositioningText)}</p>${renderList(decisionStyle, 'var(--pur2)')}`, 'var(--pur)')}
          ${sectionCard('Risco executivo mais provável', renderList([
            limitationItems[0] || '',
            limitationItems[1] || '',
            'Em contextos críticos, a decisão tende a repetir o viés do fator dominante se não houver contraponto intencional.',
          ], 'var(--d)'), 'var(--pur)')}
        </div>
      </div>
    `,
  });
}

function businessLeadershipSlide() {
  return makeSlide({
    id: 'business-leadership',
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="label-chip">Liderança</div>
        <h2 style="margin-bottom:0;">Manifestação de liderança</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;">
          ${sectionCard('Estilo base', `<p style="margin:0;">${esc(leadershipText)}</p>`, 'var(--pur)')}
          ${sectionCard('Fortalezas como líder', renderList(strengthItems.slice(0, 3), 'var(--s)'), 'var(--pur)')}
          ${sectionCard('Ajustes para ampliar alcance', renderList(developmentItems.slice(0, 3), 'var(--i)'), 'var(--pur)')}
        </div>
      </div>
    `,
  });
}

function businessTeamworkSlide() {
  return makeSlide({
    id: 'business-teamwork',
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="label-chip">Teamwork</div>
        <h2 style="margin-bottom:0;">Funcionamento em equipe e integração de pares</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
          ${sectionCard('Contribuição para o time', renderList(teamworkStyle, 'var(--pur2)'), 'var(--pur)')}
          ${sectionCard('Como complementar o perfil', renderList([
            `Perfis com maior ${FACTOR_META[lowestFactor.key].name.toLowerCase()} ajudam a compensar o viés menos presente.`,
            'A equipe tende a ganhar quando o avaliado recebe contraponto claro em áreas de menor aderência natural.',
            'Composição intencional reduz ruído e aumenta previsibilidade de execução.',
          ], 'var(--s)'), 'var(--pur)')}
        </div>
      </div>
    `,
  });
}

function businessPressureSlide() {
  return makeSlide({
    id: 'business-pressure',
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:flex-start;">
        ${sectionCard('Sob pressão: o que intensifica', `<p style="margin:0 0 10px;">${esc(pressureBehaviorText)}</p><h4 style="font-size:13px;margin:0 0 8px;color:var(--s);">Resposta produtiva</h4>${renderList(pressureProfile.productive, 'var(--s)')}`, 'var(--pur)')}
        ${sectionCard('Sob pressão: o que monitorar', `<h4 style="font-size:13px;margin:0 0 8px;color:var(--d);">Riscos prováveis</h4>${renderList(pressureProfile.attention, 'var(--d)')}`, 'var(--pur)')}
      </div>
    `,
  });
}

function negotiationSlide() {
  return makeSlide({
    id: 'business-negotiation',
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="label-chip">Negociação</div>
        <h2 style="margin-bottom:0;">Estilo predominante em negociação</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;">
          ${negotiationStyle
            .slice(0, 3)
            .map((item, index) => sectionCard(`Alavanca ${index + 1}`, `<p style="margin:0;">${esc(item)}</p>`, 'var(--pur)'))
            .join('')}
        </div>
        ${sectionCard('Aplicação executiva', `<p style="margin:0;">Use esse padrão para calibrar abertura, concessão, ritmo e fechamento de acordo com o contexto. O perfil tende a negociar melhor quando sabe qual fator precisa conter e qual precisa ativar.</p>`, 'var(--pur)')}
      </div>
    `,
  });
}

function salesSlide() {
  return makeSlide({
    id: 'business-sales',
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="label-chip">Sales</div>
        <h2 style="margin-bottom:0;">Leitura do perfil em dinâmica comercial</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
          ${sectionCard('Traços comerciais', renderList(salesStyle, 'var(--i)'), 'var(--pur)')}
          ${sectionCard('Direcionamento de uso', renderList([
            'Use o fator dominante para abrir espaço e acelerar avanço.',
            'Use o fator secundário para sustentar vínculo, confiança ou método.',
            'Em vendas complexas, calibrar ritmo e profundidade reduz desgaste da negociação.',
          ], 'var(--pur2)'), 'var(--pur)')}
        </div>
      </div>
    `,
  });
}

function advancedMatrixSlide() {
  const rows = [
    ['Velocidade de resposta', D, I, S, C, behaviorSignals.velocidade],
    ['Influência interpessoal', Math.round(D * 0.5), I, Math.round(S * 0.6), Math.round(C * 0.4), behaviorSignals.influencia],
    ['Consistência operacional', Math.round(D * 0.45), Math.round(I * 0.4), S, C, behaviorSignals.consistencia],
    ['Rigor técnico', Math.round(D * 0.3), Math.round(I * 0.25), Math.round(S * 0.5), C, behaviorSignals.rigor],
  ];

  return makeSlide({
    id: 'business-matrix',
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="label-chip">Advanced Matrix</div>
        <h2 style="margin-bottom:0;">Matriz avançada de comportamento aplicado</h2>
        ${renderTable(
          rows.map(([label, dValue, iValue, sValue, cValue, total]) => [
            esc(label),
            `${dValue}%`,
            `${iValue}%`,
            `${sValue}%`,
            `${cValue}%`,
            `<strong>${total}%</strong>`,
          ]),
          ['Dimensão', 'D', 'I', 'S', 'C', 'Leitura'],
        )}
        ${sectionCard('Como usar a matriz', `<p style="margin:0;">Ela ajuda a transformar a leitura DISC em critérios de alocação, feedback e desenho de função. Quanto maior a dispersão entre fatores, maior a necessidade de contexto claro para não gerar sobrecarga comportamental.</p>`, 'var(--pur)')}
      </div>
    `,
  });
}

function advancedDevelopmentSlide() {
  const metrics = [
    ['Velocidade', behaviorSignals.velocidade, FACTOR_META.D.color],
    ['Influência', behaviorSignals.influencia, FACTOR_META.I.color],
    ['Consistência', behaviorSignals.consistencia, FACTOR_META.S.color],
    ['Rigor', behaviorSignals.rigor, FACTOR_META.C.color],
  ];

  return makeSlide({
    id: 'business-advanced-development',
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:flex-start;">
        ${sectionCard(
          'DNA comportamental aplicado',
          metrics
            .map(
              ([title, value, color]) => `
                <div style="margin-bottom:12px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                    <strong style="font-size:12px;color:#fff;">${esc(title)}</strong>
                    <span style="font-family:'Sora',sans-serif;font-size:12px;color:${color};">${value}%</span>
                  </div>
                  ${buildBar(value, color)}
                </div>
              `,
            )
            .join(''),
          'var(--pur)',
        )}
        ${sectionCard('Blocos avançados de desenvolvimento', renderList(developmentItems.concat(businessRecommendationItems).slice(0, 6), 'var(--pur2)'), 'var(--pur)')}
      </div>
    `,
  });
}

function businessCareerSlide() {
  return makeSlide({
    id: 'business-career',
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:flex-start;">
        ${sectionCard('Carreira e contexto de maior aderência', `<p style="margin:0 0 10px;">${esc(professionalPositioningText)}</p>${renderList(careerRecommendationItems, 'var(--pur2)')}`, 'var(--pur)')}
        ${sectionCard('Desenvolvimento executivo', renderList(businessRecommendationItems, 'var(--s)'), 'var(--pur)')}
      </div>
    `,
  });
}

function businessRelationshipsExecutiveSlide() {
  return makeSlide({
    id: 'business-relationships',
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:flex-start;">
        ${sectionCard('Relacionamentos e influência organizacional', `<p style="margin:0 0 10px;">${esc(relationshipStyleText)}</p>${renderList(relationshipGuidance, 'var(--pur2)')}`, 'var(--pur)')}
        ${sectionCard('Recomendações corporativas', renderList(businessRecommendationItems, 'var(--d)'), 'var(--pur)')}
      </div>
    `,
  });
}

function closingSlide() {
  return makeSlide({
    id: 'closing',
    blobs: `
      <div class="blob" style="width:380px;height:380px;background:#6c47ff;top:-90px;left:-80px;opacity:.12;"></div>
      <div class="blob" style="width:340px;height:340px;background:#ff4d9e;bottom:-70px;right:-40px;opacity:.08;"></div>
    `,
    content: `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;">
        <div style="max-width:820px;text-align:center;">
          <div class="label-chip">Encerramento</div>
          <h2 style="font-size:40px;margin-bottom:14px;">${esc(profile.code)} · ${esc(profileName)}</h2>
          <p style="font-size:16px;color:var(--t2);line-height:1.7;margin-bottom:18px;">${esc(summaryText)}</p>
          <p style="font-size:13px;color:var(--t3);line-height:1.7;max-width:680px;margin:0 auto 24px;">Este relatório foi estruturado para orientar leitura prática, desenvolvimento e tomada de decisão com base nos fatores DISC predominantes do avaliado.</p>
          <div style="display:inline-flex;gap:12px;flex-wrap:wrap;justify-content:center;">
            <span style="padding:8px 14px;border-radius:999px;background:rgba(255,85,85,.12);color:var(--d);border:1px solid rgba(255,85,85,.25);font-family:'Sora',sans-serif;font-size:11px;font-weight:700;">${FACTOR_META[highestFactor.key].name}</span>
            <span style="padding:8px 14px;border-radius:999px;background:rgba(245,200,66,.12);color:var(--i);border:1px solid rgba(245,200,66,.25);font-family:'Sora',sans-serif;font-size:11px;font-weight:700;">${FACTOR_META[secondFactor.key].name}</span>
            <span style="padding:8px 14px;border-radius:999px;background:rgba(108,71,255,.12);color:var(--pur2);border:1px solid var(--bord);font-family:'Sora',sans-serif;font-size:11px;font-weight:700;">${selectedMode.label} Report</span>
          </div>
        </div>
      </div>
    `,
  });
}

function buildSlides() {
  const slides = [coverSlide(), modelSlide(), executiveSummarySlide(), overviewSlide()];

  if (mode !== 'personal') {
    slides.push(discSummarySlide());
  }

  if (flags.showNaturalAdapted) {
    slides.push(naturalAdaptedSlide());
  }

  if (mode === 'business') {
    slides.push(naturalAdaptedCompleteSlide());
  }

  if (flags.showQuadrant) {
    slides.push(quadrantSlide());
  }

  if (flags.showIndexes) {
    slides.push(indexesSlide());
  }

  if (flags.showBenchmark) {
    slides.push(benchmarkSlide());
  }

  slides.push(strengthsLimitationsSlide());

  if (mode === 'personal') {
    slides.push(motivatorsSlide(), communicationSlide(), relationshipsGrowthSlide(), actionPlanSlide());
  }

  if (mode === 'professional') {
    slides.push(
      professionalMotivationCommunicationSlide(),
      workDecisionSlide(),
      leadershipTeamworkSlide(),
      pressureRelationshipsSlide(),
      careerDevelopmentSlide(),
      actionPlanSlide(),
    );
  }

  if (mode === 'business') {
    slides.push(
      motivatorsSlide(),
      communicationSlide(),
      businessWorkStyleSlide(),
      businessDecisionSlide(),
      businessLeadershipSlide(),
      businessTeamworkSlide(),
      businessPressureSlide(),
    );

    if (flags.showNegotiation) slides.push(negotiationSlide());
    if (flags.showSales) slides.push(salesSlide());
    if (flags.showAdvancedMatrix) slides.push(advancedMatrixSlide());
    if (flags.showPersonalGrowth) slides.push(advancedDevelopmentSlide());
    if (flags.showCareer) slides.push(businessCareerSlide());
    if (flags.showRelationships) slides.push(businessRelationshipsExecutiveSlide());
    slides.push(actionPlanSlide());
  }

  slides.push(closingSlide());
  return slides;
}

function renderSlides(slides) {
  const totalPages = slides.length;
  return slides
    .map(
      (slide, index) => `
        <div class="slide" id="${slide.id}">
          ${slide.blobs || ''}
          ${nav()}
          <div class="slide-content">${slide.content}</div>
          <div class="pgn">${index + 1} / ${totalPages}</div>
        </div>
      `,
    )
    .join('\n');
}

const templatePath = resolve(__dirname, 'relatorio_disc_pdf.html');
let templateHtml = '';

try {
  templateHtml = readFileSync(templatePath, 'utf8');
} catch {
  console.error('❌ relatorio_disc_pdf.html não encontrado na mesma pasta.');
  process.exit(1);
}

const bodyStartIndex = templateHtml.indexOf('<body>');
const bodyEndIndex = templateHtml.lastIndexOf('</body>');

if (bodyStartIndex === -1) {
  console.error('❌ Template HTML inválido: <body> não encontrado.');
  process.exit(1);
}

const slides = buildSlides();
if (slides.length !== selectedMode.targetPages) {
  console.error(
    `❌ Quantidade de páginas inválida para ${selectedMode.label}: esperado ${selectedMode.targetPages}, obtido ${slides.length}.`,
  );
  process.exit(1);
}

const headHtml = templateHtml.slice(0, bodyStartIndex).replace(
  /<title>.*?<\/title>/,
  `<title>Relatório DISC ${selectedMode.label} — InsightDISC</title>`,
);
const bodySuffix = bodyEndIndex === -1 ? '\n</body>\n</html>\n' : templateHtml.slice(bodyEndIndex);

const overrides = `
<style id="disc-engine-overrides">
  html, body {
    width: 297mm !important;
    min-height: 210mm !important;
    background: var(--bg);
  }
  .slide {
    width: 297mm !important;
    height: 210mm !important;
  }
  .slide-content {
    height: calc(210mm - 44px) !important;
  }
  @page {
    size: A4 landscape;
    margin: 0;
  }
</style>`;

const finalHtml = `${headHtml}${overrides}\n<body>\n${renderSlides(slides)}\n${bodySuffix}`;
const outPath = resolve(__dirname, output);

writeFileSync(outPath, finalHtml, 'utf8');

console.log(`
╔══════════════════════════════════════════════════════╗
║  ✅ InsightDISC Engine — Relatório gerado!          ║
╠══════════════════════════════════════════════════════╣
║  Mode    : ${selectedMode.label.padEnd(43)}║
║  Perfil  : ${`${profile.code} — ${profileName}`.padEnd(43)}║
║  Scores  : ${`D=${D}%  I=${I}%  S=${S}%  C=${C}%`.padEnd(43)}║
║  Páginas : ${String(slides.length).padEnd(43)}║
║  Output  : ${output.padEnd(43)}║
╚══════════════════════════════════════════════════════╝
`);
