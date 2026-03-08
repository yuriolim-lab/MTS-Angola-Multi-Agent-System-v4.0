#!/bin/bash
# MTS Angola - Script para enviar para GitHub
# Execute este script após configurar suas credenciais

echo "🚀 Enviando MTS Angola para GitHub..."
echo ""

# Verificar se o remote está configurado
cd /home/z/my-project

# Opção 1: Usando GitHub CLI (recomendado)
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI encontrado. Autenticando..."
    gh auth login --web
    git push -u origin main
    echo "✅ Código enviado com sucesso!"
    exit 0
fi

# Opção 2: Usando token de acesso pessoal
echo "📝 Para fazer push, você precisa de um Personal Access Token do GitHub."
echo ""
echo "1. Acesse: https://github.com/settings/tokens/new"
echo "2. Selecione 'repo' nas permissões"
echo "3. Gere o token e copie"
echo ""
echo "4. Execute o comando abaixo (substitua SEU_TOKEN):"
echo ""
echo "   git push https://SEU_TOKEN@github.com/yuriolim-lab/MTS-Angola-Multi-Agent-System-v4.0.git main"
echo ""
echo "Ou configure suas credenciais:"
echo "   git config --global user.name 'Seu Nome'"
echo "   git config --global user.email 'seu@email.com'"
