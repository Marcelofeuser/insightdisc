export const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'Novo' },
  { value: 'contacted', label: 'Contatado' },
  { value: 'qualified', label: 'Qualificado' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'won', label: 'Ganho' },
  { value: 'lost', label: 'Perdido' },
];

export function getStatusLabel(status = '') {
  const found = LEAD_STATUS_OPTIONS.find((item) => item.value === status);
  return found?.label || status || 'Novo';
}

export function getStatusClassName(status = '') {
  switch (String(status || '').toLowerCase()) {
    case 'contacted':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'qualified':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'proposal':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'won':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'lost':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'new':
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
}

export function formatLeadDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

export function sanitizePhone(phone = '') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

export function buildWhatsAppLeadMessage(lead = {}) {
  const name = lead?.name || 'Tudo bem?';
  const interest = lead?.interest || 'a plataforma InsightDISC';
  return `Olá ${name}, aqui é do InsightDISC. Recebemos seu interesse em ${interest}. Podemos te ajudar com os próximos passos.`;
}

export function buildWhatsAppLeadUrl(lead = {}) {
  const phone = sanitizePhone(lead?.phone || '');
  if (!phone) return '';
  const message = buildWhatsAppLeadMessage(lead);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
