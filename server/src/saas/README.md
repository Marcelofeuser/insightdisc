# SaaS Isolado InsightDISC

Este módulo implementa um mini SaaS totalmente isolado para testes e simulação de contas, planos e uso, sem afetar o sistema principal.

## Como integrar as rotas de teste

No arquivo `server/src/app.js`, adicione:

```js
import saasRoutes from './saas/index.js';
...
app.use(saasRoutes); // Isso monta as rotas /saas/test/*
```

Pronto para validação e expansão futura.
