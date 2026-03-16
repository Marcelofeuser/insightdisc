import { usePremium } from "./usePremium";

export default function Paywall({ children }) {

  const { isPremium } = usePremium();

  if (!isPremium) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">
          Relatório completo disponível no Premium
        </h2>

        <button className="bg-black text-white px-6 py-3 rounded">
          Desbloquear relatório
        </button>
      </div>
    );
  }

  return children;
}
