const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const squareCloud = require('../utils/squarecloud.js');
const { colors } = require('../config/config.js');
const logger = require('../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('Listar todas as aplicações na Square Cloud'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Listar apenas aplicações do usuário
            const apps = await squareCloud.listApps(interaction.user.id);

            if (!apps || apps.length === 0) {
                const noAppsEmbed = new EmbedBuilder()
                    .setTitle('📋 Nenhuma Aplicação Encontrada')
                    .setDescription('**Você ainda não possui aplicações na Square Cloud.**\n\n🚀 **Para começar:**\n• Use o comando `/deploy` para fazer upload da sua aplicação\n• Escolha um plano (Básico, Padrão ou Premium)\n• Efetue o pagamento via PIX\n• Sua aplicação será implantada automaticamente!\n\n💡 **Dica:** Após fazer o deploy, use `/list` novamente para ver suas aplicações.')
                    .setColor(colors.info)
                    .setTimestamp()
                    .setFooter({ text: 'Square Cloud Bot' });

                return await interaction.editReply({
                    embeds: [noAppsEmbed]
                });
            }

            // Criar embed com lista de aplicações
            const listEmbed = new EmbedBuilder()
                .setTitle('📋 Suas Aplicações na Square Cloud')
                .setDescription(`Total de aplicações: **${apps.length}**`)
                .setColor(colors.primary)
                .setTimestamp()
                .setFooter({ text: 'Square Cloud Bot' });

            // Adicionar campos para cada aplicação
            apps.forEach((app, index) => {
                const statusEmoji = this.getStatusEmoji(app.status);
                const fieldName = `${index + 1}. ${app.name || `App ${app.id}`}`;
                const memoryInfo = app.memory?.total ? `${app.memory.used || 0}MB / ${app.memory.total}MB` : `${app.memory || 'N/A'}MB`;
                const fieldValue = `**ID:** \`${app.id}\`\n**Status:** ${statusEmoji} ${app.status || 'Desconhecido'}\n**Memória:** ${memoryInfo}\n**URL:** ${app.url || 'N/A'}`;
                
                listEmbed.addFields({ 
                    name: fieldName, 
                    value: fieldValue, 
                    inline: true 
                });
            });

            // Botões para ações rápidas
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('list_refresh')
                        .setLabel('Atualizar Lista')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setCustomId('list_details')
                        .setLabel('Ver Detalhes')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊')
                );

            await interaction.editReply({
                embeds: [listEmbed],
                components: [buttons]
            });

            logger.info(`Lista de aplicações consultada por ${interaction.user.tag}`);

        } catch (error) {
            logger.error('Erro ao listar aplicações:', error);

            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erro ao Listar Aplicações')
                .setDescription(`Não foi possível obter a lista de aplicações.\n\n**Erro:** ${error.message}\n\n**Dica:** Verifique se sua API key da Square Cloud está configurada corretamente.`)
                .setColor(colors.error)
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed]
            });
        }
    },

    async handleComponent(interaction, action) {
        switch (action) {
            case 'refresh':
                await this.refreshList(interaction);
                break;
            case 'details':
                await this.showDetailedList(interaction);
                break;
            case 'back':
                await this.backToList(interaction);
                break;
        }
    },

    async refreshList(interaction) {
        try {
            await interaction.deferUpdate();
            
            const apps = await squareCloud.listApps(interaction.user.id);

            if (!apps || apps.length === 0) {
                const noAppsEmbed = new EmbedBuilder()
                    .setTitle('📋 Nenhuma Aplicação Encontrada')
                    .setDescription('**Você ainda não possui aplicações na Square Cloud.**\n\n🚀 **Para começar:**\n• Use o comando `/deploy` para fazer upload da sua aplicação\n• Escolha um plano (Básico, Padrão ou Premium)\n• Efetue o pagamento via PIX\n• Sua aplicação será implantada automaticamente!\n\n💡 **Dica:** Após fazer o deploy, use `/list` novamente para ver suas aplicações.')
                    .setColor(colors.info)
                    .setTimestamp()
                    .setFooter({ text: 'Square Cloud Bot' });

                return await interaction.editReply({
                    embeds: [noAppsEmbed],
                    components: []
                });
            }

            const listEmbed = new EmbedBuilder()
                .setTitle('📋 Suas Aplicações na Square Cloud')
                .setDescription(`Total de aplicações: **${apps.length}** (Atualizado: <t:${Math.floor(Date.now() / 1000)}:R>)`)
                .setColor(colors.primary)
                .setTimestamp()
                .setFooter({ text: 'Square Cloud Bot' });

            apps.forEach((app, index) => {
                const statusEmoji = this.getStatusEmoji(app.status);
                const fieldName = `${index + 1}. ${app.name || `App ${app.id}`}`;
                const memoryInfo = app.memory?.total ? `${app.memory.used || 0}MB / ${app.memory.total}MB` : `${app.memory || 'N/A'}MB`;
                const fieldValue = `**ID:** \`${app.id}\`\n**Status:** ${statusEmoji} ${app.status || 'Desconhecido'}\n**Memória:** ${memoryInfo}\n**URL:** ${app.url || 'N/A'}`;
                
                listEmbed.addFields({ 
                    name: fieldName, 
                    value: fieldValue, 
                    inline: true 
                });
            });

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('list_refresh')
                        .setLabel('Atualizar Lista')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setCustomId('list_details')
                        .setLabel('Ver Detalhes')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊')
                );

            await interaction.editReply({
                embeds: [listEmbed],
                components: [buttons]
            });

        } catch (error) {
            logger.error('Erro ao atualizar lista:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erro ao Atualizar Lista')
                .setDescription(`Não foi possível atualizar a lista de aplicações.\n\n**Erro:** ${error.message}`)
                .setColor(colors.error)
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
                components: []
            });
        }
    },

    async showDetailedList(interaction) {
        try {
            await interaction.deferUpdate();

            const apps = await squareCloud.listApps(interaction.user.id);

            if (!apps || apps.length === 0) {
                const noAppsEmbed = new EmbedBuilder()
                    .setTitle('📋 Nenhuma Aplicação Encontrada')
                    .setDescription('**Você ainda não possui aplicações na Square Cloud.**\n\n🚀 **Para começar:**\n• Use o comando `/deploy` para fazer upload da sua aplicação\n• Escolha um plano (Básico, Padrão ou Premium)\n• Efetue o pagamento via PIX\n• Sua aplicação será implantada automaticamente!')
                    .setColor(colors.info)
                    .setTimestamp()
                    .setFooter({ text: 'Square Cloud Bot' });

                return await interaction.editReply({
                    embeds: [noAppsEmbed],
                    components: []
                });
            }

            // Criar embed detalhado
            const detailEmbed = new EmbedBuilder()
                .setTitle('📊 Detalhes das Aplicações')
                .setDescription('Informações detalhadas de todas as suas aplicações:')
                .setColor(colors.info)
                .setTimestamp();

            // Adicionar informações detalhadas para cada aplicação
            apps.forEach((app, index) => {
                const statusEmoji = this.getStatusEmoji(app.status);
                const uptime = app.uptime || 'N/A';
                const memoryUsed = app.memory?.used || 0;
                const memoryTotal = app.memory?.total || 0;
                const cpuUsage = app.cpu?.usage || 0;
                
                detailEmbed.addFields({
                    name: `${index + 1}. ${app.name || `App ${app.id}`}`,
                    value: `**ID:** \`${app.id}\`\n**Status:** ${statusEmoji} ${app.status || 'Desconhecido'}\n**Memória:** ${memoryUsed}MB / ${memoryTotal}MB\n**CPU:** ${cpuUsage}%\n**Uptime:** ${uptime}\n**URL:** ${app.url || 'N/A'}`,
                    inline: false
                });
            });

            // Botão para voltar
            const backButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('list_back')
                        .setLabel('Voltar')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⬅️')
                );

            await interaction.editReply({
                embeds: [detailEmbed],
                components: [backButton]
            });

        } catch (error) {
            logger.error('Erro ao mostrar detalhes:', error);
            
            await interaction.editReply({
                content: `❌ **Erro:** Não foi possível obter os detalhes das aplicações.\n\n**Detalhes:** ${error.message}`,
                embeds: [],
                components: []
            });
        }
    },

    async backToList(interaction) {
        try {
            await interaction.deferUpdate();
            
            const apps = await squareCloud.listApps(interaction.user.id);

            if (!apps || apps.length === 0) {
                const noAppsEmbed = new EmbedBuilder()
                    .setTitle('📋 Nenhuma Aplicação Encontrada')
                    .setDescription('**Você ainda não possui aplicações na Square Cloud.**\n\n🚀 **Para começar:**\n• Use o comando `/deploy` para fazer upload da sua aplicação\n• Escolha um plano (Básico, Padrão ou Premium)\n• Efetue o pagamento via PIX\n• Sua aplicação será implantada automaticamente!')
                    .setColor(colors.info)
                    .setTimestamp()
                    .setFooter({ text: 'Square Cloud Bot' });

                return await interaction.editReply({
                    embeds: [noAppsEmbed],
                    components: []
                });
            }

            const listEmbed = new EmbedBuilder()
                .setTitle('📋 Suas Aplicações na Square Cloud')
                .setDescription(`Total de aplicações: **${apps.length}**`)
                .setColor(colors.primary)
                .setTimestamp()
                .setFooter({ text: 'Square Cloud Bot' });

            apps.forEach((app, index) => {
                const statusEmoji = this.getStatusEmoji(app.status);
                const fieldName = `${index + 1}. ${app.name || `App ${app.id}`}`;
                const memoryInfo = app.memory?.total ? `${app.memory.used || 0}MB / ${app.memory.total}MB` : `${app.memory || 'N/A'}MB`;
                const fieldValue = `**ID:** \`${app.id}\`\n**Status:** ${statusEmoji} ${app.status || 'Desconhecido'}\n**Memória:** ${memoryInfo}\n**URL:** ${app.url || 'N/A'}`;
                
                listEmbed.addFields({ 
                    name: fieldName, 
                    value: fieldValue, 
                    inline: true 
                });
            });

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('list_refresh')
                        .setLabel('Atualizar Lista')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setCustomId('list_details')
                        .setLabel('Ver Detalhes')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊')
                );

            await interaction.editReply({
                embeds: [listEmbed],
                components: [buttons]
            });

        } catch (error) {
            logger.error('Erro ao voltar para lista:', error);
            
            await interaction.editReply({
                content: `❌ **Erro:** Não foi possível voltar para a lista.\n\n**Detalhes:** ${error.message}`,
                embeds: [],
                components: []
            });
        }
    },

    getStatusEmoji(status) {
        switch (status?.toLowerCase()) {
            case 'online':
            case 'running':
                return '🟢';
            case 'offline':
            case 'stopped':
                return '🔴';
            case 'starting':
            case 'restarting':
                return '🟡';
            default:
                return '⚪';
        }
    }
};