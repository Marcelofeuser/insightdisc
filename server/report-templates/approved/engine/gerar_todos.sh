#!/usr/bin/env bash
set -euo pipefail

check_pdf() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "ERRO: PDF não foi gerado: $file"
    exit 1
  fi
  if [[ ! -s "$file" ]]; then
    echo "ERRO: PDF gerado está vazio: $file"
    exit 1
  fi
}

check_server() {
  if ! curl -fsS http://localhost:4000 >/dev/null; then
    echo "ERRO: backend não está rodando em http://localhost:4000"
    echo "Suba o servidor antes de gerar os PDFs com IA."
    exit 1
  fi
}

generate_ai_pdf() {
  local mode="$1"
  local output="$2"
  echo "Gerando relatório COM IA para modo: ${mode}"
  local url="http://localhost:4000/report/generate-disc-report?mode=${mode}&d=34&i=32&s=23&c=11&nome=Joao%20Silva&cargo=Gerente%20Comercial&empresa=Empresa%20XYZ&useAi=true"

  local http_code
  http_code=$(curl -L -sS -o "$output" -w "%{http_code}" "$url")

  if [[ "$http_code" != "200" ]]; then
    echo "ERRO: geração com IA falhou para ${mode} (HTTP ${http_code})"
    exit 1
  fi

  check_pdf "$output"
  echo "PDF com IA gerado: $output"
  ls -lh "$output"
}

node disc_engine.js --mode=personal
node gerar_pdf.mjs relatorio_disc_personal.html relatorio_disc_personal.pdf
check_pdf "relatorio_disc_personal.pdf"

node disc_engine.js --mode=professional
node gerar_pdf.mjs relatorio_disc_professional.html relatorio_disc_professional.pdf
check_pdf "relatorio_disc_professional.pdf"

node disc_engine.js --mode=business
node gerar_pdf.mjs relatorio_disc_business.html relatorio_disc_business.pdf
check_pdf "relatorio_disc_business.pdf"

echo "Iniciando geração de relatórios com IA..."
check_server

generate_ai_pdf "personal" "relatorio_disc_personal_ai.pdf"
generate_ai_pdf "professional" "relatorio_disc_professional_ai.pdf"
generate_ai_pdf "business" "relatorio_disc_business_ai.pdf"

echo "Todos os relatórios foram gerados com sucesso!"
open relatorio_disc_personal.pdf
open relatorio_disc_professional.pdf
open relatorio_disc_business.pdf
open relatorio_disc_personal_ai.pdf
open relatorio_disc_professional_ai.pdf
open relatorio_disc_business_ai.pdf
