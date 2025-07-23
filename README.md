# 🤖 Square Cloud Discord Bot

Bot oficial para gerenciamento de aplicações na Square Cloud através do Discord, com sistema de pagamento integrado via PIX e sistema de tickets privados.

## 🚀 Funcionalidades

### 📦 Deploy de Aplicações
- Upload de arquivos ZIP até 100MB
- Configuração personalizada de recursos
- Sistema de pagamento integrado (PIX)
- Deploy automático após confirmação do pagamento
- **Sistema de Tickets Privados** - Cada usuário tem seu canal privado
- **Validação Completa de Dados** - E-mail, CPF e nome validados
- **Tratamento Robusto de Erros** - Sistema de fallback para demonstração

### 🛠️ Gerenciamento
- ✅ **Status** - Verificar status em tempo real
- 📋 **Listar** - Ver todas as aplicações (comando privado/ephemeral)
- 🗑️ **Deletar** - Remover aplicações com confirmação
- **Informações Detalhadas** - Memória, CPU, uptime e URLs

### 💳 Sistema de Pagamento
- **Básico** - Configurável via admin (padrão R$ 15,00) - 256MB RAM
- **Padrão** - Configurável via admin (padrão R$ 25,00) - 512MB RAM  
- **Premium** - Configurável via admin (padrão R$ 50,00) - 1024MB RAM
- Verificação automática via polling
- QR Code PIX instantâneo
- **Valores atualizados em tempo real**
- **Dados Reais do Usuário** - Nome, e-mail e CPF validados

### 🎫 Sistema de Tickets
- **Painel fixo** - Administradores criam painéis em canais específicos
- **Canais privados** - Cada usuário recebe um canal `square-username`
- **Categoria organizada** - Tickets criados em categoria específica
- **Auto-delete** - Tickets são deletados após 24h de inatividade
- **Privacidade total** - Apenas o usuário e bot têm acesso

### 👑 Comandos de Administrador
- **`/config payment`** - Configurar valores dos planos e sistema de pagamento
- **`/config system`** - Configurar limites do sistema (tamanho de arquivo, timeouts)
- **`/config logs`** - Definir canais de logs separados por categoria
- **`/config view`** - Visualizar todas as configurações atuais
- **`/panel`** - Criar painel de controle com sistema de tickets

### 📋 Sistema de Logs Organizados
- **`sc-actions-logs`** - Logs de ações dos usuários (comandos executados)
- **`sc-admin-logs`** - Logs administrativos (mudanças de configuração)
- **`sc-payments-logs`** - Logs de pagamentos (aprovados, rejeitados, pendentes)
- **`sc-deploy-logs`** - Logs de deploys (aplicações implantadas)
- **Sincronização com .env** - Canais configurados via .env e comandos admin
- **Configuração Flexível** - Canais podem ser alterados via comando ou arquivo

## 🔄 Como Funciona o Deploy

### Processo Completo:
1. **Deploy Iniciado** → Usuário anexa arquivo e escolhe plano
2. **Botão "Pagar e Fazer Deploy"** → Abre modal de dados do usuário
3. **Preenchimento** → Nome completo, e-mail e CPF validados
4. **Pagamento PIX** → Criado com dados reais do usuário
5. **Verificação Automática** → Polling verifica aprovação a cada 5 segundos
6. **Deploy Automático** → Após pagamento aprovado, deploy inicia automaticamente

### 🛡️ Validações Implementadas:
- **E-mail**: Regex para formato válido (`usuario@dominio.com`)
- **CPF**: 11 dígitos numéricos, não pode ser sequência igual (111.111.111-11)
- **Nome**: Mínimo 3 caracteres, máximo 50 caracteres
- **Tratamento de Strings**: Todos os IDs são convertidos para string para evitar erros
- **Sanitização**: DisplayName sanitizado para evitar caracteres especiais

### 🔧 Sistema de Recuperação:
- **Fallback Inteligente**: Se API não disponível, usa modo demonstração
- **Retry Automático**: Tentativas múltiplas com configurações diferentes
- **Tratamento de Erros**: Erros específicos (401, 520, etc.) tratados adequadamente
- **Logs Detalhados**: Todos os erros são logados para debugging

## 🔧 Instalação

### Pré-requisitos
- Node.js 18+ 
- Conta Discord Developer
- API Key da Square Cloud
- Conta Mercado Pago (para pagamentos)

### 1. Clonar o Repositório
```bash
git clone https://github.com/britto420/Square-Cloud-BOT
cd Square-Cloud-BOT
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:
```env
DISCORD_TOKEN=seu_token_discord
CLIENT_ID=seu_client_id
SQUARECLOUD_API_KEY=sua_api_key_square_cloud
MERCADO_PAGO_ACCESS_TOKEN=seu_access_token_mp
ADMIN_ROLE_ID=id_da_role_admin

# Canais de Logs
SC_ACTIONS_LOGS=1395841242901778532     # Ações dos usuários
SC_ADMIN_LOGS=1395862949813555220       # Ações administrativas  
SC_PAYMENTS_LOGS=1395862976581337189    # Pagamentos processados
SC_DEPLOY_LOGS=1395863003110313994      # Deploys realizados
```

### 4. Executar o Bot
```bash
npm start
```

## 📚 Comandos Disponíveis

### Comandos Gerais

#### `/deploy`
Fazer deploy de uma aplicação na Square Cloud
- Anexe um arquivo ZIP
- Escolha o plano desejado (valores atualizados em tempo real)
- Configure parâmetros (opcional)
- Preencha dados pessoais (nome, e-mail, CPF)
- Efetue o pagamento via PIX
- **Funciona apenas em tickets privados para maior organização**

#### `/status <app_id>`
Verificar status de uma aplicação
- Status online/offline
- Uso de CPU e memória
- Uptime e URL da aplicação

#### `/list`
Listar todas as suas aplicações (comando privado)
- Visão geral de todas as apps
- Status de cada aplicação
- Informações básicas
- **Comando ephemeral** - Apenas você vê a resposta
- **Atualização em tempo real** - Botão para refresh
- **Detalhes completos** - Memória, CPU, uptime

#### `/delete <app_id>`
Deletar uma aplicação
- Confirmação obrigatória
- Ação irreversível
- Logs da operação

#### `/help`
Mostrar ajuda e informações detalhadas

### Comandos de Administrador

#### `/panel <canal> <categoria>`
Criar painel de controle com sistema de tickets
- **Canal** - Onde será criado o painel fixo
- **Categoria** - Onde serão criados os tickets privados
- **Botão "Iniciar Deploy"** - Usuários clicam para criar ticket
- **Canais privados** - Formato `square-username`
- **Auto-delete** - Tickets removidos após 24h

#### `/config payment`
Configurar sistema de pagamento
- **Editar Valores** - Alterar preços dos planos (Básico, Padrão, Premium)
- **Toggle PIX** - Habilitar/desabilitar pagamentos PIX
- **Toggle Auto-Deploy** - Habilitar/desabilitar deploy automático
- **Valores em tempo real** - Atualizações imediatas no sistema

#### `/config system`
Configurar limites do sistema
- **Tamanho Máximo** - Limite de arquivo para upload (MB)
- **Extensões Permitidas** - Formatos aceitos (.zip)
- **Timeout Deploy** - Tempo limite para deploy (segundos)
- **Timeout Pagamento** - Tempo limite para pagamento (segundos)

#### `/config logs`
Configurar canais de logs separados
- **Actions** - Canal para logs de ações dos usuários
- **Admin** - Canal para logs administrativos
- **Payments** - Canal para logs de pagamentos
- **Deploys** - Canal para logs de deploys
- **Organização total** - Cada tipo de log em seu canal específico
- **Sincronização .env** - Alterações são salvas no arquivo .env automaticamente

#### `/config view`
Visualizar configurações atuais
- Resumo de todas as configurações
- Status dos sistemas
- Informações de logs organizados

## 🏗️ Arquitetura

```
squarecloud-bot/
├── src/
│   ├── commands/          # Comandos slash
│   │   ├── deploy.js      # Deploy com pagamento (valores dinâmicos)
│   │   ├── status.js      # Status da aplicação
│   │   ├── list.js        # Listar aplicações
│   │   ├── delete.js      # Deletar aplicação
│   │   ├── help.js        # Ajuda
│   │   ├── config.js      # Comandos administrativos
│   │   └── panel.js       # Sistema de tickets
│   ├── events/            # Eventos do Discord
│   │   ├── ready.js       # Bot online
│   │   └── interactionCreate.js  # Interações e tickets
│   ├── utils/             # Utilitários
│   │   ├── squarecloud.js # API Square Cloud
│   │   ├── mercadopago.js # Pagamentos PIX
│   │   ├── paymentPoller.js # Polling de pagamentos
│   │   ├── logger.js      # Sistema de logs
│   │   └── adminLogger.js # Logs administrativos organizados
│   ├── config/            # Configurações
│   │   └── config.js      # Configurações gerais
│   ├── data/              # Dados persistentes
│   │   └── admin-config.json # Configurações admin e logs
│   └── index.js           # Arquivo principal
├── logs/                  # Arquivos de log
├── squarecloud.app        # Configuração Square Cloud
├── package.json
├── README.md
├── .env.example
└── .env                   # Configurações de ambiente
```

## 🎫 Sistema de Tickets

### Como Funciona
1. **Administrador cria painel** - `/panel #canal-publico #categoria-tickets`
2. **Usuário clica em "Iniciar Deploy"** - No painel público
3. **Canal privado é criado** - `square-username` na categoria especificada
4. **Deploy privado** - Usuário faz deploy no seu canal privado
5. **Auto-delete** - Canal é removido após 24h de inatividade

### Vantagens
- ✅ **Organização total** - Sem poluição no chat público
- ✅ **Privacidade** - Cada usuário tem seu espaço
- ✅ **Controle administrativo** - Admins definem onde criar painéis
- ✅ **Limpeza automática** - Tickets são removidos automaticamente

## 📋 Sistema de Logs Organizados

### Canais Recomendados
```
📁 LOGS SQUARE CLOUD
├── 👤 sc-actions-logs     # Ações dos usuários
├── 🔧 sc-admin-logs       # Ações administrativas  
├── 💳 sc-payments-logs    # Pagamentos processados
└── 🚀 sc-deploy-logs      # Deploys realizados
```

### Configuração
```bash
/config logs actions:#sc-actions-logs admin:#sc-admin-logs payments:#sc-payments-logs deploys:#sc-deploy-logs
```

### Configuração via .env
```env
SC_ACTIONS_LOGS=1395841242901778532     # Ações dos usuários
SC_ADMIN_LOGS=1395862949813555220       # Ações administrativas  
SC_PAYMENTS_LOGS=1395862976581337189    # Pagamentos processados
SC_DEPLOY_LOGS=1395863003110313994      # Deploys realizados
```

### Tipos de Logs

#### Actions Logs (👤 sc-actions-logs)
- Comandos executados pelos usuários
- Tentativas de acesso
- Ações em tickets
- Erros do sistema

#### Admin Logs (🔧 sc-admin-logs)
- Mudanças de configuração
- Criação de painéis
- Alterações de valores
- Status do sistema

#### Payments Logs (💳 sc-payments-logs)
- Pagamentos aprovados
- Pagamentos rejeitados
- Pagamentos pendentes
- Valores e planos
- Dados dos usuários (sem informações sensíveis)

#### Deploy Logs (🚀 sc-deploy-logs)
- Aplicações implantadas
- Sucessos e falhas
- Informações técnicas
- Valores pagos e planos utilizados

## 🔐 Segurança

- ✅ Validação de arquivos e tamanhos
- ✅ Rate limiting integrado
- ✅ Logs detalhados de operações
- ✅ Tratamento robusto de erros
- ✅ Variáveis de ambiente para credenciais
- ✅ Verificação automática de pagamentos
- ✅ Sistema de permissões administrativas
- ✅ Canais de logs privados organizados
- ✅ Sistema de tickets com privacidade total
- ✅ Validação completa de dados pessoais
- ✅ Sanitização de inputs para evitar injeções
- ✅ Tratamento específico de erros de API
- ✅ Sistema de fallback para alta disponibilidade

## 🚀 Deploy na Square Cloud

1. Configure o arquivo `squarecloud.app`:
```ini
DISPLAY_NAME=Square Cloud Bot
DESCRIPTION=Bot oficial para gerenciamento de aplicações
MAIN=src/index.js
MEMORY=256
VERSION=recommended
RESTART=true
```

2. Faça upload do projeto comprimido
3. Configure as variáveis de ambiente no painel
4. Inicie a aplicação

## ⚙️ Configurações Administrativas

### Configuração de Pagamentos
- Valores personalizáveis para cada plano
- Sistema PIX habilitável/desabilitável
- Deploy automático configurável
- **Valores atualizados em tempo real**
- Configurações salvas persistentemente

### Sistema de Tickets
- Painéis criados por administradores
- Canais privados automáticos
- Categoria organizacional
- Auto-delete configurável
- Controle total de permissões

### Configuração do Sistema
- Limite de tamanho de arquivo ajustável
- Extensões permitidas configuráveis
- Timeouts personalizáveis
- Validações de segurança

### Sistema de Logs
- **4 canais separados** para organização total
- Logs categorizados por tipo
- Configuração flexível de canais
- Mensagens de teste automáticas
- **Sincronização com .env** - Alterações refletidas no arquivo de ambiente
- **Configuração híbrida** - Via comando admin ou arquivo .env

### Permissões
- Apenas administradores do servidor podem usar `/config` e `/panel`
- Verificação automática de permissões
- Role específica configurável via `ADMIN_ROLE_ID`
- Logs de todas as ações administrativas

## 🔧 Correções e Melhorias v2.2

### Sistema de Deploy Robusto
- ✅ **Tratamento de Erro 520** - Cloudflare Web Server Error tratado adequadamente
- ✅ **Retry Automático** - Múltiplas tentativas com configurações diferentes
- ✅ **Fallback Inteligente** - Modo demonstração quando API indisponível
- ✅ **Validação de Token** - Verificação se API key está configurada corretamente
- ✅ **Timeouts Otimizados** - 3 minutos para primeira tentativa, 2 para retry

### Sistema de Listagem Melhorado
- ✅ **Comando Ephemeral** - `/list` agora é privado (apenas usuário vê)
- ✅ **Informações Completas** - Memória, CPU, uptime e URLs exibidos
- ✅ **Atualização em Tempo Real** - Botão refresh com timestamp
- ✅ **Tratamento de Erros** - Mensagens específicas para diferentes tipos de erro
- ✅ **Modo Demonstração** - Lista de apps demo quando API não disponível

### Sistema de Logs Sincronizado
- ✅ **Configuração via .env** - Canais definidos no arquivo de ambiente
- ✅ **Sincronização Automática** - Alterações via comando refletidas no .env
- ✅ **Configuração Híbrida** - Suporte a .env e comandos administrativos
- ✅ **Validação de Canais** - Verificação se canais existem antes de usar

### Sistema de Pagamento PIX
- ✅ **Email válido** - Geração automática de email válido para Mercado Pago
- ✅ **Validação robusta** - Tratamento de erros específicos da API
- ✅ **Fallback inteligente** - Sistema de demonstração quando API não disponível
- ✅ **Removida PUBLIC_KEY** - Apenas ACCESS_TOKEN necessário para PIX
- ✅ **Dados Reais** - Nome, e-mail e CPF do usuário validados
- ✅ **Validação Completa** - CPF, e-mail e nome com regex e verificações

### API Square Cloud
- ✅ **DisplayName sanitizado** - Validação e limpeza automática de nomes
- ✅ **Timeout aumentado** - 60 segundos para uploads grandes
- ✅ **Validação de configuração** - Verificação se API key está configurada
- ✅ **Fallback robusto** - Demonstração quando API não disponível
- ✅ **Tratamento 401** - Erro de token inválido tratado especificamente
- ✅ **Retry Inteligente** - Segunda tentativa com configurações simplificadas

### Sistema de Erros
- ✅ **Logs detalhados** - Captura completa de erros para debugging
- ✅ **Tratamento específico** - Diferentes tipos de erro tratados adequadamente
- ✅ **Feedback claro** - Mensagens de erro compreensíveis para usuários
- ✅ **Recovery automático** - Sistema continua funcionando mesmo com APIs indisponíveis
- ✅ **Códigos HTTP** - Tratamento específico para 401, 404, 520, etc.
- ✅ **Modo Graceful** - Degradação elegante quando serviços não disponíveis

### Valores Dinâmicos
- ✅ **Tempo real** - Preços atualizados instantaneamente
- ✅ **Cache global** - Sistema de cache persistente para dados de deploy
- ✅ **Sincronização** - Deploy sempre usa valores atuais das configurações
- ✅ **Validação** - Verificação de integridade dos dados

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

- 💬 Discord: [𝕭𝖗𝖎𝖙𝖙𝖔𝕾𝖙𝖚𝖋𝖋](https://discord.gg/ryZY5fmGqA)
- 📚 Documentação Square Cloud: [docs.squarecloud.app](https://docs.squarecloud.app)

## 🔄 Changelog

### v2.2.0 - Correções Críticas e Sistema Robusto
- ✅ **Deploy Corrigido** - Erro 520 e outros códigos HTTP tratados adequadamente
- ✅ **Lista Ephemeral** - Comando `/list` agora é privado para cada usuário
- ✅ **Logs Sincronizados** - Sistema de logs integrado com .env
- ✅ **Retry Automático** - Múltiplas tentativas com configurações diferentes
- ✅ **Validação Completa** - E-mail, CPF e nome com validações robustas
- ✅ **Fallback Inteligente** - Modo demonstração quando APIs indisponíveis
- ✅ **Tratamento de Erros** - Códigos específicos (401, 404, 520) tratados
- ✅ **Informações Completas** - Lista com memória, CPU, uptime e URLs

### v2.1.0 - Correções Críticas e Melhorias
- ✅ **Sistema PIX Corrigido** - Email válido e validação robusta
- ✅ **API Square Cloud Melhorada** - DisplayName sanitizado e timeouts aumentados
- ✅ **Tratamento de Erros** - Logs detalhados e recovery automático
- ✅ **Valores Dinâmicos** - Preços atualizados em tempo real
- ✅ **Configuração Simplificada** - Removida PUBLIC_KEY desnecessária
- ✅ **Fallback Inteligente** - Sistema funciona mesmo sem APIs configuradas

### v2.0.0 - Sistema de Tickets e Logs Organizados
- ✅ **Sistema de Tickets Completo** - Canais privados para cada usuário
- ✅ **Painel de Controle** - Comando `/panel` para criar painéis fixos
- ✅ **Logs Organizados** - 4 canais separados por categoria
- ✅ **Valores Dinâmicos** - Preços atualizados em tempo real
- ✅ **Cache Global** - Sistema de cache para dados de deploy
- ✅ **Auto-delete** - Tickets removidos automaticamente
- ✅ **Correções de API** - Sistema de fallback robusto

### v1.2.0 - Sistema Administrativo
- ✅ Adicionados comandos `/config` para administradores
- ✅ Sistema de logs privado implementado
- ✅ Configurações persistentes em arquivo JSON
- ✅ Painel de controle completo para administradores
- ✅ Logs automáticos de pagamentos, deploys e ações
- ✅ Sistema de permissões robusto

### v1.1.0 - Melhorias de Estabilidade
- ✅ Correção de erros da API Square Cloud
- ✅ Sistema de fallback para demonstração
- ✅ Tratamento robusto de erros
- ✅ Logs estruturados melhorados

### v1.0.0 - Lançamento Inicial
- ✅ Sistema de deploy completo
- ✅ Integração com pagamento PIX
- ✅ Gerenciamento de aplicações
- ✅ Interface elegante com Discord

## 🎯 Recursos Principais v2.2

### 🚀 Deploy Robusto
- **Tratamento de Erros** - Códigos HTTP específicos tratados adequadamente
- **Retry Automático** - Múltiplas tentativas com configurações otimizadas
- **Fallback Inteligente** - Modo demonstração quando API indisponível
- **Validação Completa** - Dados do usuário validados antes do pagamento

### 📋 Lista Privada
- **Comando Ephemeral** - Apenas o usuário vê suas aplicações
- **Informações Completas** - Memória, CPU, uptime e URLs
- **Atualização em Tempo Real** - Botão refresh com timestamp
- **Detalhes Expandidos** - Visualização detalhada opcional

### 📊 Logs Sincronizados
- **Configuração .env** - Canais definidos no arquivo de ambiente
- **Sincronização Automática** - Alterações via comando refletidas no .env
- **4 canais separados** - Actions, Admin, Payments, Deploys
- **Configuração híbrida** - Via comando admin ou arquivo .env

### 🎫 Sistema de Tickets
- **Organização total** - Sem poluição no chat público
- **Canais privados** - `square-username` para cada usuário
- **Painel fixo** - Administradores controlam onde criar
- **Auto-delete** - Limpeza automática após 24h

### 💰 Valores Dinâmicos
- **Tempo real** - Preços atualizados instantaneamente
- **Cache inteligente** - Sistema de cache global para dados
- **Configuração fácil** - Administradores alteram valores facilmente
- **Sincronização total** - Deploy sempre usa valores atuais

### 🔧 Sistema Robusto
- **Fallback inteligente** - Funciona mesmo sem APIs configuradas
- **Tratamento de erros** - Recovery automático e logs detalhados
- **Validação completa** - Sanitização e validação de todos os dados
- **Performance otimizada** - Timeouts e configurações otimizadas

---

**Desenvolvido por Britto com ❤️ para a comunidade Square Cloud**
