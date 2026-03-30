import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // aqui você pode validar token se quiser futuramente
    // redireciona após login
    navigate("/painel");
  }, [navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <h2>Entrando...</h2>
    </div>
  );
}
