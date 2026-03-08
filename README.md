# 🚢 MTS Angola Multi-Agent System v4.0

Sistema de Agentes Autônomos para Serviços Marítimos em Angola.

## 📋 Visão Geral

Sistema de 3 agentes autônomos especializados:

| Agente | Função | Documentos |
|--------|--------|------------|
| **Pedro** | Inteligência de Mercado | Rastreamento de navios, relatórios |
| **Mariana** | CRM & Marketing | Portfolio MTS (marketing) |
| **Claudia** | Comercial & Financeiro | Cotações (Hull Cleaning, Shipchandler) |

### ⚠️ Regra de Ouro
- **Mariana** só pode enviar o **Portfolio MTS**
- **Claudia** é a única que pode enviar **cotações de preços**

## 🛠️ Stack Tecnológica

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **UI**: shadcn/ui + Lucide Icons
- **Database**: SQLite + Prisma ORM
- **Email**: Nodemailer (SMTP)
- **WhatsApp**: Twilio (alertas críticos)
- **AI**: z-ai-web-dev-sdk

## 📁 Estrutura do Projeto

```
├── prisma/
│   ├── schema.prisma          # Schema do banco de dados
│   └── migrations/            # Migrações do Prisma
├── public/
│   └── documents/
│       ├── mariana/           # Portfolio MTS
│       └── claudia/           # Cotações
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agents/        # APIs dos agentes
│   │   │   ├── automation/    # Automação e cron
│   │   │   ├── dashboard/     # Dados do dashboard
│   │   │   └── documents/     # Gestão de documentos
│   │   └── page.tsx           # Dashboard principal
│   ├── components/ui/         # Componentes shadcn/ui
│   └── lib/
│       ├── services/          # Serviços (email, WhatsApp, etc)
│       └── utils/             # Utilitários
├── Dockerfile                 # Docker para Railway
├── railway.json               # Configuração Railway
├── start.sh                   # Script de inicialização
└── .env.example               # Variáveis de ambiente
```

## 🚀 Deploy no Railway

### Passo 1: Preparar o Repositório GitHub

```bash
# Inicializar git
git init

# Adicionar todos os arquivos
git add .

# Commit
git commit -m "MTS Angola Multi-Agent System v4.0"

# Adicionar remote
git remote add origin https://github.com/SEU_USUARIO/mts-angola.git

# Push
git push -u origin main
```

### Passo 2: Criar Projeto no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Escolha o repositório `mts-angola`

### Passo 3: Configurar Variáveis de Ambiente

No Railway, vá em **Variables** e adicione:

```env
DATABASE_URL=file:/app/data/mts_angola.db

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app

COMPANY_NAME=MTS Angola
COMPANY_EMAIL=info@mtsangola.com
```

### Passo 4: Adicionar Volume Persistente

1. Vá em **Settings** → **Volumes**
2. Clique em **"Add Volume"**
3. Configure:
   - **Mount Path**: `/app/data`
   - **Size**: 1GB

### Passo 5: Deploy

1. Clique em **"Deploy"**
2. Aguarde o build (~3-5 minutos)
3. Acesse sua aplicação em `https://seu-projeto.up.railway.app`

## 🔧 Configuração de Email (Gmail)

1. Ative a verificação em 2 etapas na sua conta Google
2. Vá em **Segurança** → **Senhas de App**
3. Gere uma nova senha de app para "MTS Angola"
4. Use essa senha em `SMTP_PASS`

## 📱 Configuração WhatsApp (Opcional)

Para alertas críticos via WhatsApp:

```env
TWILIO_SID=seu-account-sid
TWILIO_TOKEN=seu-auth-token
TWILIO_PHONE=+14155238886
MANAGER_PHONE=+244923456789
```

## 🏃 Desenvolvimento Local

```bash
# Instalar dependências
bun install

# Configurar ambiente
cp .env.example .env

# Criar banco de dados
bun run db:push

# Iniciar desenvolvimento
bun run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📊 APIs Disponíveis

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/agents/pedro` | POST | Rastrear navios |
| `/api/agents/mariana` | POST | Gestão CRM/Marketing |
| `/api/agents/claudia` | POST | Relatórios comerciais |
| `/api/automation` | POST | Executar tarefas agendadas |
| `/api/documents` | GET | Listar documentos |
| `/api/documents/send` | POST | Enviar documento por email |
| `/api/dashboard` | GET | Dados do dashboard |

## 💰 Custos

| Serviço | Custo |
|---------|-------|
| Railway (hobby) | **GRÁTIS** |
| Domínio .railway.app | **GRÁTIS** |
| Email SMTP (Gmail) | **GRÁTIS** |
| WhatsApp (Twilio) | Opcional |

**Total mensal: $0**

## 📞 Suporte

Para questões técnicas, consulte a documentação ou contacte a equipa MTS Angola.

---

Desenvolvido para **MTS Angola** 🇦🇴
