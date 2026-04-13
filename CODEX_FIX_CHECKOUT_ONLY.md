Objetivo: corrigir checkout e email do InsightDISC sem alterar layout.

Problemas restantes:
1. Botão "Finalizar pagamento" não funciona.
2. Seleção de Pix não funciona.
3. E-mail não chega.
4. Não mexer em AI, Dossiê ou PDFs já corrigidos.

Tarefas:

A) CHECKOUT FRONTEND
- Localizar componente/página de planos/checkout.
- Corrigir seleção real dos métodos:
  - Pix
  - Cartão
- Estado visual e funcional devem bater.
- Botão "Finalizar pagamento" deve:
  - chamar endpoint correto
  - exibir loading
  - bloquear apenas quando inválido
  - mostrar erro real do backend
- Remover bloqueio hardcoded de ambiente se não for necessário.

B) REGRAS PIX x CARTÃO
- Revisar se assinatura recorrente aceita só cartão.
- Se Pix não for permitido para assinatura:
  - manter seleção visual
  - exibir mensagem técnica correta
- Se Pix for permitido em pagamento único:
  - implementar fluxo corretamente
- Validar billingPeriod, paymentMethod, mode, planId, priceId.

C) BACKEND BILLING
- Revisar:
  - create-checkout
  - create-checkout-session
  - confirm
  - webhook
  - portal
- Padronizar resposta JSON:
  - success
  - message
  - checkoutUrl/sessionId
  - errorCode
- Corrigir mismatch entre frontend e backend.

D) STRIPE
- Validar:
  - price_id
  - mode
  - success_url
  - cancel_url
  - metadata
  - customer email
- Garantir redirecionamento real ao Stripe.

E) EMAIL
- Localizar provider real:
  - SMTP / Nodemailer / Resend / SendGrid / outro
- Corrigir:
  - falha silenciosa
  - credenciais/env
  - await ausente
  - try/catch que engole erro
- Logar erro real sem expor segredo.
- Validar envio nos fluxos críticos.

F) QA
Rodar e corrigir até passar:
1. Seleção Pix muda estado.
2. Seleção Cartão muda estado.
3. Finalizar pagamento chama endpoint certo.
4. Stripe retorna URL/session e redireciona.
5. Erro de checkout mostra mensagem útil.
6. E-mail de teste envia ou mostra erro real.
7. Build passa.

Entrega final:
- arquivos alterados
- causa raiz por problema
- testes executados
- commit final
