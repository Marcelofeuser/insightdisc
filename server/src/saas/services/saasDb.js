// Banco de dados simulado para SaaS isolado (modo teste)

const db = {
  accounts: [],
  memberships: [],
  plans: [],
  subscriptions: [],
  usage_logs: [],
  payments: [],
};

let idCounter = 1;
function genId() {
  return (idCounter++).toString();
}

export { db, genId };
