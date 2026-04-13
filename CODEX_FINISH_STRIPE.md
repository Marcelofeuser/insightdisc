Objetivo: finalizar a configuração real de cobrança do InsightDISC com Stripe para:
- cartão
- Pix
- recebimento
- confirmação
- webhook
- atualização de status
- ambiente produção

IMPORTANTE:
- não alterar layout
- não quebrar checkout atual
- não criar mock
- corrigir ponta a ponta
- focar em produção Railway + frontend app.insightdisc.com

ESCOPO

1. INVENTÁRIO ATUAL
Mapear exatamente:
- onde o frontend cria checkout
- onde o backend cria sessão Stripe
- onde define Pix/cartão
- onde salva pagamento/assinatura
- onde processa webhook
- onde libera acesso/plano
- onde envia e-mail pós-pagamento

2. FRONTEND CHECKOUT
Validar e corrigir:
- seleção de método de pagamento:
  - card
  - pix
- botão "Finalizar pagamento"
- payload enviado ao backend
- loading / erro / redirect
- diferença entre:
  - assinatura recorrente
  - pagamento único
- regra correta:
  - assinatura recorrente => cartão
  - pagamento único => cartão e Pix, se suportado

3. BACKEND STRIPE
Revisar e corrigir:
- create-checkout
- create-checkout-public
- create-checkout-session
- confirm
- billing portal
- webhook stripe

Garantir:
- mode correto:
  - subscription
  - payment
- line_items corretos
- payment_method_types corretos
- success_url correta
- cancel_url correta
- metadata completa
- customer_email preenchido
- client_reference_id quando necessário

4. PIX
Garantir fluxo real de Pix:
- só para pagamentos one-time, se essa for a regra
- session com payment_method_types=['pix']
- payment_method_options.pix quando aplicável
- retorno ao frontend coerente
- status do pagamento salvo após webhook

5. CARTÃO
Garantir fluxo real:
- assinatura com cartão
- pagamento único com cartão
- atualização de status após webhook
- criação/atualização de subscription quando aplicável

6. WEBHOOK
Revisar webhook Stripe ponta a ponta:
- assinatura de webhook
- validação STRIPE_WEBHOOK_SECRET
- eventos tratados
- logs objetivos
- idempotência
- persistência correta no banco

Tratar no mínimo:
- checkout.session.completed
- payment_intent.succeeded
- payment_intent.payment_failed
- invoice.paid
- invoice.payment_failed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted

7. RECEBIMENTO / LIBERAÇÃO
Garantir que após pagamento confirmado:
- plano seja liberado
- produto/relatório/assessment seja liberado
- pagamento fique salvo
- status do usuário/conta reflita cobrança
- nada dependa apenas de redirect frontend

8. ENV VARS
Verificar e documentar exatamente as variáveis necessárias:
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_* / ids necessários
- APP_URL
- VITE_API_URL
- URLs de sucesso/cancelamento
- quaisquer envs adicionais

Se faltar alguma env:
- identificar
- apontar nome exato
- mostrar onde é usada
- impedir falha silenciosa
- logar erro claro

9. EMAIL PÓS-PAGAMENTO
Confirmar se o fluxo manda email após confirmação:
- sucesso de compra
- liberação
- falha relevante
Corrigir se necessário sem quebrar SMTP já validado.

10. BANCO / MODELOS
Revisar persistência em:
- payments
- subscriptions
- plans
- webhook_events
- reports/credits/assessments liberados
Corrigir mismatch entre status Stripe e status interno.

11. QA OBRIGATÓRIO
Executar e corrigir até passar:
- Pix one-time cria sessão válida
- Cartão one-time cria sessão válida
- Assinatura cria sessão subscription válida
- Webhook atualiza status após sucesso
- Webhook marca falha quando necessário
- Build frontend ok
- Build backend ok

12. ENTREGA FINAL
Entregar:
- causa raiz de cada ponto pendente
- arquivos alterados
- envs obrigatórias finais
- diff relevante
- comandos de teste
- commit final claro

COMEÇAR AGORA rastreando estes arquivos prováveis:
- src/pages/CheckoutPlanPage.jsx
- server/src/routes/payments.routes.js
- server/src/routes/billing.routes.js
- server/src/modules/billing/stripe-billing.service.js
- server/src/modules/billing/stripe-catalog.js
- qualquer handler de webhook Stripe
- serviços de email relacionados a pagamento
