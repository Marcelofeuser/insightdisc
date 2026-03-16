export function generateAdvancedReport(discProfile) {

  const dominant = Object.entries(discProfile)
    .sort((a,b) => b[1] - a[1])[0][0];

  const descriptions = {
    D: "Perfil dominante, focado em resultados e liderança.",
    I: "Perfil influente, comunicativo e persuasivo.",
    S: "Perfil estável, cooperativo e confiável.",
    C: "Perfil analítico, detalhista e estratégico."
  };

  return {
    dominant,
    summary: descriptions[dominant],
    strengths: [],
    risks: [],
    leadershipStyle: "",
    workEnvironment: ""
  };
}
