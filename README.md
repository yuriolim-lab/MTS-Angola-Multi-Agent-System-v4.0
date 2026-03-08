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
├── .env.example               # Variáveis de ambiente
├── Dockerfile                 # Docker para Railway
├── railway.json               # Configuração Railway
└── railway.toml               # Configuração Railway
```

## 🚀 Deploy no Railway (Gratuito)

### Passo 1: Preparar o Repositório GitHub

```bash
# Inicializar git (se ainda não existir)
git init

# Adicionar todos os arquivos
git add .

# Commit inicial
git commit -m "MTS Angola Multi-Agent System v4.0"

# Adicionar remote do GitHub
git remote add origin https://github.com/SEU_USUARIO/mts-angola.git

# Push para GitHub
git push -u origin main
```

### Passo 2: Criar Conta no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em **"Start a New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Autorize o Railway a acessar seus repositórios
5. Selecione o repositório `mts-angola`

### Passo 3: Configurar Variáveis de Ambiente

No Railway, vá em **Variables** e adicione:

```env
# Database
DATABASE_URL=file:/app/data/mts_angola.db

# Email SMTP (obrigatório)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app

# Company
COMPANY_NAME=MTS Angola
COMPANY_EMAIL=info@mtsangola.com

# Agents
AGENT_PEDRO_EMAIL=pedro@mtsangola.com
AGENT_MARIANA_EMAIL=mariana@mtsangola.com
AGENT_CLAUDIA_EMAIL=claudia@mtsangola.com

# Notifications
NOTIFICATION_EMAIL=manager@mtsangola.com
```

### Passo 4: Adicionar Volume Persistente

1. No Railway, vá em **Settings** → **Volumes**
2. Clique em **"Add Volume"**
3. Configure:
   - **Mount Path**: `/app/data`
   - **Size**: 1GB (suficiente para SQLite)
4. Isso garante que o banco de dados persista entre deploys

### Passo 5: Deploy

1. Clique em **"Deploy"**
2. Aguarde o build completar (~3-5 minutos)
3. Acesse sua aplicação em `https://seu-projeto.up.railway.app`

## 🔧 Configuração de Email (Gmail)

1. Ative a verificação em 2 etapas na sua conta Google
2. Vá em **Segurança** → **Senhas de App**
3. Gere uma nova senha de app para "MTS Angola"
4. Use essa senha em `SMTP_PASS`

## 📱 Configuração WhatsApp (Opcional)

Para alertas críticos via WhatsApp:

1. Crie conta em [twilio.com](https://twilio.com)
2. Ative o sandbox de WhatsApp
3. Adicione as variáveis:

```env
TWILIO_ACCOUNT_SID=seu-account-sid
TWILIO_AUTH_TOKEN=seu-auth-token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886
```

## 🏃 Desenvolvimento Local

```bash
# Instalar dependências
bun install

# Configurar ambiente
cp .env.example .env
# Edite .env com suas configurações

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

## 🔄 Agentes Autônomos

### Pedro - Inteligência de Mercado
- Rastreia navios nos portos de Angola
- Identifica oportunidades de negócio
- Gera relatórios diários automáticos

### Mariana - CRM & Marketing
- Gere contactos e leads
- Envia emails de follow-up
- Distribui Portfolio MTS

### Claudia - Comercial & Financeiro
- Qualifica leads quentes
- Envia cotações de serviços
- Agenda reuniões

## 💰 Custos

| Serviço | Custo |
|---------|-------|
| Railway (hobby plan) | **Gratuito** |
| Domínio .railway.app | **Grátis** |
| Email SMTP (Gmail) | **Grátis** |
| WhatsApp (Twilio) | Pay-as-you-go |

**Total mensal: $0** (com plano gratuito Railway)

## 📞 Suporte

Para questões técnicas, consulte a documentação ou contacte a equipa MTS Angola.

---

Desenvolvido para **MTS Angola** 🇦🇴
