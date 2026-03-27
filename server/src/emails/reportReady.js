export function reportReadyEmail({ nome, link }) {
  return `
    <div style="font-family: Arial; max-width:600px;">
      <h2>Seu relatório DISC está pronto</h2>
      <p>Olá ${nome},</p>

      <a href="${link}" 
         style="background:#000;color:#fff;padding:12px 20px;text-decoration:none;">
         Acessar relatório
      </a>
    </div>
  `;
}
