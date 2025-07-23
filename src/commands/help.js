const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { colors } = require('../config/config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Mostrar ajuda e informações sobre os comandos'),

    async execute(interaction) {
        // Embed principal de ajuda
        const helpEmbed = new EmbedBuilder()
            .setTitle('🤖 Square Cloud Bot - Ajuda')
            .setDescription('Bot oficial para gerenciamento de aplicações na Square Cloud através do Discord.')
            .addFields(
                {
                    name: '🚀 Comandos de Deploy',
                    value: '`/deploy` - Fazer deploy de uma aplicação com pagamento integrado',
                    inline: false
                },
                {
                    name: '📊 Comandos de Gerenciamento',
                    value: '`/status` - Verificar status de uma aplicação\n`/list` - Listar todas as aplicações\n`/delete` - Deletar uma aplicação',
                    inline: false
                },
                {
                    name: '💡 Comandos de Ajuda',
                    value: '`/help` - Mostrar esta mensagem de ajuda\n`/about` - Informações sobre o bot',
                    inline: false
                },
                {
                    name: '💳 Sistema de Pagamento',
                    value: 'Pagamento via PIX integrado com verificação automática\n• Básico: R$ 15,00\n• Padrão: R$ 25,00\n• Premium: R$ 50,00',
                    inline: false
                }
            )
            .setColor(colors.primary)
            .setTimestamp()
            .setFooter({ text: 'Square Cloud Bot | Desenvolvido para a comunidade' });

        // Botões de navegação
        const navigationButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_commands')
                    .setLabel('Comandos Detalhados')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('help_deploy')
                    .setLabel('Como Fazer Deploy')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🚀'),
                new ButtonBuilder()
                    .setCustomId('help_payment')
                    .setLabel('Sistema de Pagamento')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💳')
            );

        await interaction.reply({
            embeds: [helpEmbed],
            components: [navigationButtons],
            ephemeral: true
        });
    },

    async handleComponent(interaction, action) {
        switch (action) {
            case 'commands':
                await this.showDetailedCommands(interaction);
                break;
            case 'deploy':
                await this.showDeployGuide(interaction);
                break;
            case 'payment':
                await this.showPaymentInfo(interaction);
                break;
            case 'back':
                await this.execute(interaction);
                break;
        }
    },

    async showDetailedCommands(interaction) {
        const commandsEmbed = new EmbedBuilder()
            .setTitle('📋 Comandos Detalhados')
            .setDescription('Informações detalhadas sobre todos os comandos disponíveis:')
            .addFields(
                {
                    name: '🚀 /deploy',
                    value: 'Fazer deploy de uma aplicação na Square Cloud\n• Anexe um arquivo ZIP\n• Escolha o plano desejado\n• Configure os parâmetros\n• Efetue o pagamento via PIX',
                    inline: false
                },
                {
                    name: '📊 /status',
                    value: 'Verificar o status de uma aplicação\n• Forneça o ID da aplicação\n• Veja informações em tempo real\n• Monitore CPU, memória e uptime',
                    inline: false
                },
                {
                    name: '📋 /list',
                    value: 'Listar todas as suas aplicações\n• Veja todas as aplicações\n• Status de cada uma\n• Informações básicas',
                    inline: false
                },
                {
                    name: '🗑️ /delete',
                    value: 'Deletar uma aplicação\n• Forneça o ID da aplicação\n• Confirme a exclusão\n• Ação irreversível',
                    inline: false
                }
            )
            .setColor(colors.info)
            .setTimestamp();

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back')
                    .setLabel('Voltar')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⬅️')
            );

        await interaction.update({
            embeds: [commandsEmbed],
            components: [backButton]
        });
    },

    async showDeployGuide(interaction) {
        const deployEmbed = new EmbedBuilder()
            .setTitle('🚀 Como Fazer Deploy')
            .setDescription('Passo a passo para fazer deploy da sua aplicação:')
            .addFields(
                {
                    name: '1️⃣ Preparar Aplicação',
                    value: 'Comprima sua aplicação em um arquivo ZIP\n• Inclua todos os arquivos necessários\n• Máximo 100MB\n• Certifique-se que está funcionando localmente',
                    inline: false
                },
                {
                    name: '2️⃣ Usar o Comando',
                    value: 'Execute `/deploy` e anexe seu arquivo\n• Escolha o plano desejado\n• Configure os parâmetros se necessário\n• Revise as informações',
                    inline: false
                },
                {
                    name: '3️⃣ Pagamento',
                    value: 'Efetue o pagamento via PIX\n• Escaneie o QR Code\n• Ou copie o código PIX\n• Aguarde a confirmação automática',
                    inline: false
                },
                {
                    name: '4️⃣ Deploy Automático',
                    value: 'Após o pagamento confirmado:\n• Deploy inicia automaticamente\n• Receba o ID da aplicação\n• Acesse sua aplicação online',
                    inline: false
                }
            )
            .setColor(colors.success)
            .setTimestamp();

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back')
                    .setLabel('Voltar')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⬅️')
            );

        await interaction.update({
            embeds: [deployEmbed],
            components: [backButton]
        });
    },

    async showPaymentInfo(interaction) {
        const paymentEmbed = new EmbedBuilder()
            .setTitle('💳 Sistema de Pagamento')
            .setDescription('Informações sobre o sistema de pagamento integrado:')
            .addFields(
                {
                    name: '💰 Planos Disponíveis',
                    value: '**Básico:** R$ 15,00 - 256MB RAM\n**Padrão:** R$ 25,00 - 512MB RAM\n**Premium:** R$ 50,00 - 1024MB RAM',
                    inline: false
                },
                {
                    name: '🔐 Segurança',
                    value: 'Pagamentos processados via Mercado Pago\n• Ambiente seguro e criptografado\n• Verificação automática\n• Sem armazenamento de dados sensíveis',
                    inline: false
                },
                {
                    name: '⚡ Processo Automático',
                    value: 'Verificação em tempo real\n• Polling automático a cada 5 segundos\n• Timeout de 5 minutos\n• Deploy automático após confirmação',
                    inline: false
                },
                {
                    name: '📱 Métodos de Pagamento',
                    value: 'PIX instantâneo\n• QR Code para escanear\n• Código PIX para copiar\n• Confirmação em segundos',
                    inline: false
                }
            )
            .setColor(colors.warning)
            .setTimestamp();

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back')
                    .setLabel('Voltar')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⬅️')
            );

        await interaction.update({
            embeds: [paymentEmbed],
            components: [backButton]
        });
    }
};