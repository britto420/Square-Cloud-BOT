const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const squareCloud = require('../utils/squarecloud.js');
const { colors } = require('../config/config.js');
const logger = require('../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-api')
        .setDescription('Testar conexão com a API da Square Cloud')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Verificar se é administrador
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ **Acesso Negado:** Você não tem permissão para usar este comando.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Testar conexão com a API
            const testResult = await squareCloud.testConnection();

            if (testResult.success) {
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Conexão Estabelecida')
                    .setDescription(`**Status:** ${testResult.message}`)
                    .addFields(
                        { name: '👤 Usuário', value: testResult.user || 'N/A', inline: true },
                        { name: '🔑 API Key', value: squareCloud.isConfigured() ? '✅ Configurada' : '❌ Não configurada', inline: true },
                        { name: '🕐 Testado em', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setColor(colors.success)
                    .setTimestamp()
                    .setFooter({ text: 'Square Cloud API Test' });

                await interaction.editReply({
                    embeds: [successEmbed]
                });

                logger.info(`Teste de API realizado com sucesso por ${interaction.user.tag}`);
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Falha na Conexão')
                    .setDescription(`**Erro:** ${testResult.message}`)
                    .addFields(
                        { name: '🔑 API Key', value: squareCloud.isConfigured() ? '✅ Configurada' : '❌ Não configurada', inline: true },
                        { name: '🕐 Testado em', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '💡 Soluções', value: '• Verifique se a API Key está correta no .env\n• Confirme se a API Key tem permissões adequadas\n• Teste a conectividade com a internet', inline: false }
                    )
                    .setColor(colors.error)
                    .setTimestamp()
                    .setFooter({ text: 'Square Cloud API Test' });

                await interaction.editReply({
                    embeds: [errorEmbed]
                });

                logger.warn(`Teste de API falhou para ${interaction.user.tag}: ${testResult.message}`);
            }

        } catch (error) {
            logger.error('Erro durante teste de API:', error);

            const criticalErrorEmbed = new EmbedBuilder()
                .setTitle('💥 Erro Crítico')
                .setDescription('Ocorreu um erro inesperado durante o teste da API.')
                .addFields(
                    { name: '📝 Detalhes', value: `\`\`\`${error.message}\`\`\``, inline: false },
                    { name: '🔧 Ações Recomendadas', value: '• Reinicie o bot\n• Verifique os logs do sistema\n• Contate o suporte técnico', inline: false }
                )
                .setColor(colors.error)
                .setTimestamp();

            await interaction.editReply({
                embeds: [criticalErrorEmbed]
            });
        }
    }
};