export async function sendToSynapsys(input) {
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/synapsys/general`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      force_web_search: true,
    }),
  });

  if (!res.ok) {
    throw new Error('Erro ao chamar Synapsys');
  }

  return res.json();
}
