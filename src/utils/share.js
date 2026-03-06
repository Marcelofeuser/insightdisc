function copyWithTextareaFallback(text) {
  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  document.body.removeChild(textarea);
  return copied;
}

export async function shareOrCopy({ title, text, url, toast } = {}) {
  const fallbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}${window.location.search}`
      : '';
  const safeUrl = url || fallbackUrl;
  const safeTitle = title || 'InsightDISC — Meu resultado';
  const safeText = text || 'Confira meu resultado no InsightDISC:';

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title: safeTitle, text: safeText, url: safeUrl });
      return { method: 'share' };
    }
  } catch {
    // fall through to copy
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(safeUrl);
      toast?.({
        title: 'Link copiado!',
        description: 'Agora é só colar no WhatsApp e enviar.',
        variant: 'success',
      });
      return { method: 'clipboard' };
    }
  } catch {
    // fallback below
  }

  if (copyWithTextareaFallback(safeUrl)) {
    toast?.({
      title: 'Link copiado!',
      description: 'Agora é só colar no WhatsApp e enviar.',
      variant: 'success',
    });
    return { method: 'execCommand' };
  }

  toast?.({
    title: 'Não foi possível compartilhar',
    description: 'Copie manualmente o link da barra do navegador.',
  });
  return { method: 'manual' };
}
