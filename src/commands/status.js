const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const squareCloud = require('../utils/squarecloud.js');
const { colors } = require('../config/config.js');
const logger = require('../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Verificar status de uma aplicação na Square Cloud')
        .addStringOption(option =>
            option.setName('app_id')
                .setDescription('ID da aplicação')
                .setRequired(true)
        ),

    async execute(interaction) {
        const appId = interaction.options.getString('app_id');

        await interaction.deferReply();

        try {
            // Obter status da aplicação
            const status = await squareCloud.getAppStatus(appId);
            
            // Determinar cor baseada no status
            let statusColor;
            let statusEmoji;
            
            switch (status.status?.toLowerCase()) {
                case 'online':
                case 'running':
                    statusColor = colors.success;
                    statusEmoji = '🟢';
                    break;
                case 'offline':
                case 'stopped':
                    statusColor = colors.error;
                    statusEmoji = '🔴';
                    break;
                case 'starting':
                case 'restarting':
                    statusColor = colors.warning;
                    statusEmoji = '🟡';
                    break;
                default:
                    statusColor = colors.info;
                    statusEmoji = '⚪';
            }

            // Criar embed do status
            const statusEmbed = new EmbedBuilder()
                .setTitle(`${statusEmoji} Status da Aplicação`)
                .setDescription(`**ID:** ${appId}`)
                .addFields(
                    { name: '📊 Status', value: `${statusEmoji} ${status.status || 'Desconhecido'}`, inline: true },
                    { name: '💾 Memória', value: `${status.memory?.used || 0}MB / ${status.memory?.total || 0}MB`, inline: true },
                    { name: '🖥️ CPU', value: `${status.cpu?.usage || 0}%`, inline: true },
                    { name: '🌐 URL', value: status.url || 'Não disponível', inline: false },
                    { name: '📅 Última Atualização', value: status.lastUpdate || 'Desconhecido', inline: true },
                    { name: '⏱️ Uptime', value: status.uptime || 'Desconhecido', inline: true }
                )
                .setColor(statusColor)
                .setTimestamp()
                .setFooter({ text: 'Square Cloud Bot' });

            await interaction.editReply({
                embeds: [statusEmbed]
            });

            logger.info(`Status consultado: ${appId} por ${interaction.user.tag}`);

        } catch (error) {
            logger.error('Erro ao consultar status:', error);

            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erro ao Consultar Status')
                .setDescription(`Não foi possível obter o status da aplicação \`${appId}\`.\n\n**Erro:** ${error.message}`)
                .setColor(colors.error)
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed]
            });
        }
    }
};