Objetivo: fazer o Synapsys funcionar dentro do painel do InsightDISC usando a API separada:
https://api.synapsys.insightdisc.com

Contexto confirmado:
- API Synapsys online:
  - GET /health
  - POST /synapsys/analyze
- variável já criada:
  - VITE_SYNAPSYS_API_URL=https://api.synapsys.insightdisc.com

Causa raiz já identificada:
- src/pages/PanelCoach.jsx usa apiRequest('/ai/coach', ...)
- src/pages/AiDiscLab.jsx usa apiRequest('/ai/report-preview', ...)
- src/pages/PanelAiLab.jsx ainda usa fluxo híbrido/legado do backend InsightDISC

Regras obrigatórias:
- NÃO alterar layout
- NÃO mexer em checkout, Stripe, Prisma, billing
- Corrigir apenas integração do painel com Synapsys
- Criar client centralizado para Synapsys
- Usar VITE_SYNAPSYS_API_URL com fallback para https://api.synapsys.insightdisc.com
- Garantir POST /synapsys/analyze com JSON
- Não reintroduzir dependência do backend antigo
- Validar build frontend no final

Implementação desejada:
1. Criar src/lib/synapsysApi.js
2. Implementar nesse arquivo:
   - const SYNAPSYS_API_URL = import.meta.env.VITE_SYNAPSYS_API_URL || 'https://api.synapsys.insightdisc.com'
   - função analyzeWithSynapsys(payload)
   - POST /synapsys/analyze
   - headers: Content-Type application/json
   - tratamento de erro real com mensagem útil
3. Adaptar:
   - src/pages/PanelCoach.jsx
   - src/pages/AiDiscLab.jsx
   - src/pages/PanelAiLab.jsx
4. Mapear payload das telas para formato aceito pelo Synapsys:
   - pelo menos enviar input textual consolidado
   - preservar contexto atual da tela
5. Manter UX/layout intactos
6. Rodar npm run build
7. Entregar:
   - causa raiz
   - arquivos alterados
   - diff relevante
   - comandos de teste

Importante:
- Se o painel hoje monta contexto rico do relatório, transformar isso em texto e enviar no campo input para /synapsys/analyze.
- Não criar endpoints novos no InsightDISC backend.
