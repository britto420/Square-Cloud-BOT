const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const squareCloud = require('../utils/squarecloud.js');
const { colors } = require('../config/config.js');
const logger = require('../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Deletar uma aplicação da Square Cloud')
        .addStringOption(option =>
            option.setName('app_id')
                .setDescription('ID da aplicação a ser deletada')
                .setRequired(true)
        ),

    async execute(interaction) {
        const appId = interaction.options.getString('app_id');

        try {
            // Primeiro, obter informações da aplicação
            const appStatus = await squareCloud.getAppStatus(appId);
            
            // Embed de confirmação
            const confirmEmbed = new EmbedBuilder()
                .setTitle('⚠️ Confirmar Exclusão')
                .setDescription(`Você tem certeza que deseja deletar a aplicação?`)
                .addFields(
                    { name: '🆔 ID da Aplicação', value: `\`${appId}\``, inline: true },
                    { name: '📛 Nome', value: appStatus.name || 'Desconhecido', inline: true },
                    { name: '📊 Status', value: appStatus.status || 'Desconhecido', inline: true }
                )
                .setColor(colors.warning)
                .setTimestamp()
                .setFooter({ text: 'Esta ação não pode ser desfeita!' });

            // Botões de confirmação
            const confirmButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`delete_confirm_${appId}`)
                        .setLabel('Confirmar Exclusão')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️'),
                    new ButtonBuilder()
                        .setCustomId('delete_cancel')
                        .setLabel('Cancelar')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❌')
                );

            await interaction.reply({
                embeds: [confirmEmbed],
                components: [confirmButtons],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Erro ao obter informações da aplicação:', error);

            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erro')
                .setDescription(`Não foi possível obter informações da aplicação \`${appId}\`.\n\n**Erro:** ${error.message}`)
                .setColor(colors.error)
                .setTimestamp();

            await interaction.reply({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }
    },

    async handleComponent(interaction, action) {
        if (action === 'cancel') {
            const cancelEmbed = new EmbedBuilder()
                .setTitle('❌ Operação Cancelada')
                .setDescription('A exclusão da aplicação foi cancelada.')
                .setColor(colors.info)
                .setTimestamp();

            await interaction.update({
                embeds: [cancelEmbed],
                components: []
            });
            return;
        }

        if (action.startsWith('confirm_')) {
            const appId = action.split('_')[1];
            
            try {
                await interaction.deferUpdate();

                // Deletar aplicação
                await squareCloud.deleteApp(appId);

                // Embed de sucesso
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Aplicação Deletada')
                    .setDescription(`A aplicação \`${appId}\` foi deletada com sucesso.`)
                    .setColor(colors.success)
                    .setTimestamp()
                    .setFooter({ text: 'Square Cloud Bot' });

                await interaction.editReply({
                    embeds: [successEmbed],
                    components: []
                });

                logger.info(`Aplicação deletada: ${appId} por ${interaction.user.tag}`);

            } catch (error) {
                logger.error('Erro ao deletar aplicação:', error);

                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Erro ao Deletar')
                    .setDescription(`Não foi possível deletar a aplicação \`${appId}\`.\n\n**Erro:** ${error.message}`)
                    .setColor(colors.error)
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [errorEmbed],
                    components: []
                });
            }
        }
    }
};