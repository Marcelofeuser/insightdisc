# Como Testar Funil + Checkout + PDF

## 1) Funil Lead obrigatório
1. Acesse `/`.
2. Clique em `Fazer Teste Grátis` ou `Começar Gratuitamente`.
3. Confirme que a navegação vai para `/StartFree`.
4. Tente abrir `/FreeAssessment` direto em uma aba anônima.
5. Confirme redirecionamento para `/StartFree`.

## 2) StartFree -> FreeAssessment
1. Em `/StartFree`, preencha nome e e-mail.
2. Marque o consentimento LGPD.
3. Clique em `Começar teste`.
4. Confirme URL `/FreeAssessment`.

## 3) Checkout e unlock (mock)
1. Acesse `/CheckoutSuccess?session_id=mock_manual&assessmentId=assessment-2`.
2. Aguarde confirmação.
3. Confirme redirecionamento para `/r/:token` (link público assinado).

## 4) Link público
1. Abra uma URL no formato `/r/:token`.
2. Confirme que o relatório público carrega.
3. Se não estiver desbloqueado, deve exibir bloco de resumo + CTA de upgrade.

## 5) PDF
1. Acesse `/Report?id=assessment-2`.
2. Clique em `Baixar PDF`.
3. Se o assessment estiver desbloqueado, o modo é `premium` (27 páginas).
4. Se não estiver desbloqueado, o modo é `free` (3 páginas).
