const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const { colors, adminRoleId } = require('../config/config.js');
const logger = require('../utils/logger.js');
const fs = require('fs');
const path = require('path');

// Sistema de configuração persistente
const configPath = path.join(__dirname, '../data/admin-config.json');

class AdminConfig {
    constructor() {
        this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync(configPath)) {
                this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } else {
                this.config = {
                    paymentSettings: {
                        basicPrice: 15.00,
                        standardPrice: 25.00,
                        premiumPrice: 50.00,
                        pixEnabled: true,
                        autoDeployEnabled: true
                    },
                    systemSettings: {
                        maxFileSize: 100,
                        allowedExtensions: ['.zip'],
                        deployTimeout: 300,
                        paymentTimeout: 300
                    },
                    notifications: {
                        logChannel: null,
                        adminNotifications: true,
                        paymentNotifications: true
                    }
                };
                this.saveConfig();
            }
        } catch (error) {
            logger.error('Erro ao carregar configuração:', error);
            this.config = {};
        }
    }

    saveConfig() {
        try {
            const dataDir = path.dirname(configPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            logger.error('Erro ao salvar configuração:', error);
        }
    }

    get(key) {
        return this.config[key];
    }

    set(key, value) {
        this.config[key] = value;
        this.saveConfig();
    }
}

const adminConfig = new AdminConfig();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configurações administrativas do bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('payment')
                .setDescription('Configurar sistema de pagamento')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('system')
                .setDescription('Configurações do sistema')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('logs')
                .setDescription('Configurar canais de logs separados')
                .addChannelOption(option =>
                    option.setName('actions')
                        .setDescription('Canal para logs de ações dos usuários')
                        .setRequired(false)
                )
                .addChannelOption(option =>
                    option.setName('admin')
                        .setDescription('Canal para logs administrativos')
                        .setRequired(false)
                )
                .addChannelOption(option =>
                    option.setName('payments')
                        .setDescription('Canal para logs de pagamentos')
                        .setRequired(false)
                )
                .addChannelOption(option =>
                    option.setName('deploys')
                        .setDescription('Canal para logs de deploys')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Ver configurações atuais')
        ),

    async execute(interaction) {
        // Verificar permissões de administrador
        if (!this.isAdmin(interaction.member)) {
            return await interaction.reply({
                content: '❌ **Acesso Negado:** Você não tem permissão para usar este comando.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'payment':
                await this.showPaymentConfig(interaction);
                break;
            case 'system':
                await this.showSystemConfig(interaction);
                break;
            case 'logs':
                await this.configLogs(interaction);
                break;
            case 'view':
                await this.showCurrentConfig(interaction);
                break;
        }
    },

    async handleComponent(interaction, action) {
        if (!this.isAdmin(interaction.member)) {
            return await interaction.reply({
                content: '❌ **Acesso Negado:** Você não tem permissão para usar esta função.',
                ephemeral: true
            });
        }

        switch (action) {
            case 'payment_edit':
                await this.showPaymentModal(interaction);
                break;
            case 'system_edit':
                await this.showSystemModal(interaction);
                break;
            case 'payment_toggle':
                await this.togglePaymentSystem(interaction);
                break;
            case 'autodeploy_toggle':
                await this.toggleAutoDeploy(interaction);
                break;
            case 'back':
                await this.showCurrentConfig(interaction);
                break;
        }
    },

    async handleModal(interaction, action) {
        if (!this.isAdmin(interaction.member)) {
            return await interaction.reply({
                content: '❌ **Acesso Negado:** Você não tem permissão para usar esta função.',
                ephemeral: true
            });
        }

        switch (action) {
            case 'payment_modal':
                await this.updatePaymentConfig(interaction);
                break;
            case 'system_modal':
                await this.updateSystemConfig(interaction);
                break;
        }
    },

    async showPaymentConfig(interaction) {
        const config = adminConfig.get('paymentSettings');
        
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configurações de Pagamento')
            .setDescription('Configure os valores e opções do sistema de pagamento')
            .addFields(
                { name: '💰 Plano Básico', value: `R$ ${config.basicPrice.toFixed(2)}`, inline: true },
                { name: '💎 Plano Padrão', value: `R$ ${config.standardPrice.toFixed(2)}`, inline: true },
                { name: '👑 Plano Premium', value: `R$ ${config.premiumPrice.toFixed(2)}`, inline: true },
                { name: '📱 PIX Habilitado', value: config.pixEnabled ? '✅ Sim' : '❌ Não', inline: true },
                { name: '🚀 Deploy Automático', value: config.autoDeployEnabled ? '✅ Sim' : '❌ Não', inline: true }
            )
            .setColor(colors.primary)
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('config_payment_edit')
                    .setLabel('Editar Valores')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️'),
                new ButtonBuilder()
                    .setCustomId('config_payment_toggle')
                    .setLabel('Toggle PIX')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📱'),
                new ButtonBuilder()
                    .setCustomId('config_autodeploy_toggle')
                    .setLabel('Toggle Auto-Deploy')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🚀')
            );

        await interaction.reply({
            embeds: [embed],
            components: [buttons],
            ephemeral: true
        });
    },

    async showSystemConfig(interaction) {
        const config = adminConfig.get('systemSettings');
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 Configurações do Sistema')
            .setDescription('Configure limites e parâmetros do sistema')
            .addFields(
                { name: '📁 Tamanho Máximo', value: `${config.maxFileSize}MB`, inline: true },
                { name: '📋 Extensões Permitidas', value: config.allowedExtensions.join(', '), inline: true },
                { name: '⏱️ Timeout Deploy', value: `${config.deployTimeout}s`, inline: true },
                { name: '💳 Timeout Pagamento', value: `${config.paymentTimeout}s`, inline: true }
            )
            .setColor(colors.info)
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('config_system_edit')
                    .setLabel('Editar Configurações')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚙️')
            );

        await interaction.reply({
            embeds: [embed],
            components: [buttons],
            ephemeral: true
        });
    },

    async configLogs(interaction) {
        const actionsChannel = interaction.options.getChannel('actions');
        const adminChannel = interaction.options.getChannel('admin');
        const paymentsChannel = interaction.options.getChannel('payments');
        const deploysChannel = interaction.options.getChannel('deploys');
        
        if (actionsChannel || adminChannel || paymentsChannel || deploysChannel) {
            const adminLogger = require('../utils/adminLogger.js');
            
            if (actionsChannel) {
                adminLogger.setLogChannel('actions', actionsChannel.id);
            }
            if (adminChannel) {
                adminLogger.setLogChannel('admin', adminChannel.id);
            }
            if (paymentsChannel) {
                adminLogger.setLogChannel('payments', paymentsChannel.id);
            }
            if (deploysChannel) {
                adminLogger.setLogChannel('deploys', deploysChannel.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Canais de Logs Configurados')
                .setDescription('Canais de logs configurados com sucesso!')
                .addFields(
                    { name: '👤 Ações dos Usuários', value: actionsChannel ? `${actionsChannel}` : 'Não configurado', inline: true },
                    { name: '🔧 Administrativo', value: adminChannel ? `${adminChannel}` : 'Não configurado', inline: true },
                    { name: '💳 Pagamentos', value: paymentsChannel ? `${paymentsChannel}` : 'Não configurado', inline: true },
                    { name: '🚀 Deploys', value: deploysChannel ? `${deploysChannel}` : 'Não configurado', inline: true }
                )
                .setColor(colors.success)
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            // Enviar mensagens de teste nos canais configurados
            const testEmbed = new EmbedBuilder()
                .setTitle('📋 Canal de Logs Configurado')
                .setDescription('Este canal foi configurado para receber logs do Square Cloud Bot.')
                .setColor(colors.info)
                .setTimestamp();

            if (actionsChannel) {
                await actionsChannel.send({ embeds: [testEmbed.setDescription('Este canal receberá logs de ações dos usuários.')] });
            }
            if (adminChannel) {
                await adminChannel.send({ embeds: [testEmbed.setDescription('Este canal receberá logs administrativos.')] });
            }
            if (paymentsChannel) {
                await paymentsChannel.send({ embeds: [testEmbed.setDescription('Este canal receberá logs de pagamentos.')] });
            }
            if (deploysChannel) {
                await deploysChannel.send({ embeds: [testEmbed.setDescription('Este canal receberá logs de deploys.')] });
            }

            logger.info(`Canais de logs configurados por ${interaction.user.tag}`);
        } else {
            await this.showCurrentConfig(interaction);
        }
    },

    async showCurrentConfig(interaction) {
        const paymentConfig = adminConfig.get('paymentSettings');
        const systemConfig = adminConfig.get('systemSettings');
        const adminLogger = require('../utils/adminLogger.js');

        const embed = new EmbedBuilder()
            .setTitle('📊 Configurações Atuais')
            .setDescription('Visão geral de todas as configurações do bot')
            .addFields(
                {
                    name: '💳 Pagamentos',
                    value: `**Básico:** R$ ${paymentConfig.basicPrice.toFixed(2)}\n**Padrão:** R$ ${paymentConfig.standardPrice.toFixed(2)}\n**Premium:** R$ ${paymentConfig.premiumPrice.toFixed(2)}\n**PIX:** ${paymentConfig.pixEnabled ? '✅' : '❌'}\n**Auto-Deploy:** ${paymentConfig.autoDeployEnabled ? '✅' : '❌'}`,
                    inline: true
                },
                {
                    name: '🔧 Sistema',
                    value: `**Max File:** ${systemConfig.maxFileSize}MB\n**Extensions:** ${systemConfig.allowedExtensions.length}\n**Deploy Timeout:** ${systemConfig.deployTimeout}s\n**Payment Timeout:** ${systemConfig.paymentTimeout}s`,
                    inline: true
                },
                {
                    name: '📋 Logs',
                    value: `**Actions:** ${adminLogger.logChannels.actions ? `<#${adminLogger.logChannels.actions}>` : 'Não configurado'}\n**Admin:** ${adminLogger.logChannels.admin ? `<#${adminLogger.logChannels.admin}>` : 'Não configurado'}\n**Payments:** ${adminLogger.logChannels.payments ? `<#${adminLogger.logChannels.payments}>` : 'Não configurado'}\n**Deploys:** ${adminLogger.logChannels.deploys ? `<#${adminLogger.logChannels.deploys}>` : 'Não configurado'}`,
                    inline: true
                }
            )
            .setColor(colors.primary)
            .setTimestamp()
            .setFooter({ text: 'Square Cloud Bot - Admin Panel' });

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },

    async showPaymentModal(interaction) {
        const config = adminConfig.get('paymentSettings');

        const modal = new ModalBuilder()
            .setCustomId('config_payment_modal')
            .setTitle('Configurar Valores de Pagamento');

        const basicInput = new TextInputBuilder()
            .setCustomId('basicPrice')
            .setLabel('Preço Plano Básico (R$)')
            .setStyle(TextInputStyle.Short)
            .setValue(config.basicPrice.toString())
            .setRequired(true);

        const standardInput = new TextInputBuilder()
            .setCustomId('standardPrice')
            .setLabel('Preço Plano Padrão (R$)')
            .setStyle(TextInputStyle.Short)
            .setValue(config.standardPrice.toString())
            .setRequired(true);

        const premiumInput = new TextInputBuilder()
            .setCustomId('premiumPrice')
            .setLabel('Preço Plano Premium (R$)')
            .setStyle(TextInputStyle.Short)
            .setValue(config.premiumPrice.toString())
            .setRequired(true);

        const rows = [
            new ActionRowBuilder().addComponents(basicInput),
            new ActionRowBuilder().addComponents(standardInput),
            new ActionRowBuilder().addComponents(premiumInput)
        ];

        modal.addComponents(...rows);
        await interaction.showModal(modal);
    },

    async showSystemModal(interaction) {
        const config = adminConfig.get('systemSettings');

        const modal = new ModalBuilder()
            .setCustomId('config_system_modal')
            .setTitle('Configurações do Sistema');

        const maxSizeInput = new TextInputBuilder()
            .setCustomId('maxFileSize')
            .setLabel('Tamanho Máximo de Arquivo (MB)')
            .setStyle(TextInputStyle.Short)
            .setValue(config.maxFileSize.toString())
            .setRequired(true);

        const extensionsInput = new TextInputBuilder()
            .setCustomId('allowedExtensions')
            .setLabel('Extensões Permitidas (separadas por vírgula)')
            .setStyle(TextInputStyle.Short)
            .setValue(config.allowedExtensions.join(', '))
            .setRequired(true);

        const deployTimeoutInput = new TextInputBuilder()
            .setCustomId('deployTimeout')
            .setLabel('Timeout de Deploy (segundos)')
            .setStyle(TextInputStyle.Short)
            .setValue(config.deployTimeout.toString())
            .setRequired(true);

        const paymentTimeoutInput = new TextInputBuilder()
            .setCustomId('paymentTimeout')
            .setLabel('Timeout de Pagamento (segundos)')
            .setStyle(TextInputStyle.Short)
            .setValue(config.paymentTimeout.toString())
            .setRequired(true);

        const rows = [
            new ActionRowBuilder().addComponents(maxSizeInput),
            new ActionRowBuilder().addComponents(extensionsInput),
            new ActionRowBuilder().addComponents(deployTimeoutInput),
            new ActionRowBuilder().addComponents(paymentTimeoutInput)
        ];

        modal.addComponents(...rows);
        await interaction.showModal(modal);
    },

    async updatePaymentConfig(interaction) {
        try {
            const basicPrice = parseFloat(interaction.fields.getTextInputValue('basicPrice'));
            const standardPrice = parseFloat(interaction.fields.getTextInputValue('standardPrice'));
            const premiumPrice = parseFloat(interaction.fields.getTextInputValue('premiumPrice'));

            if (isNaN(basicPrice) || isNaN(standardPrice) || isNaN(premiumPrice)) {
                return await interaction.reply({
                    content: '❌ **Erro:** Valores inválidos. Use apenas números.',
                    ephemeral: true
                });
            }

            const config = adminConfig.get('paymentSettings');
            config.basicPrice = basicPrice;
            config.standardPrice = standardPrice;
            config.premiumPrice = premiumPrice;
            adminConfig.set('paymentSettings', config);

            const embed = new EmbedBuilder()
                .setTitle('✅ Configurações Atualizadas')
                .setDescription('Os valores de pagamento foram atualizados com sucesso!')
                .addFields(
                    { name: 'Básico', value: `R$ ${basicPrice.toFixed(2)}`, inline: true },
                    { name: 'Padrão', value: `R$ ${standardPrice.toFixed(2)}`, inline: true },
                    { name: 'Premium', value: `R$ ${premiumPrice.toFixed(2)}`, inline: true }
                )
                .setColor(colors.success)
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            // Log da ação
            await this.logAdminAction(interaction, 'Configuração de Pagamento', `Valores atualizados: Básico R$ ${basicPrice}, Padrão R$ ${standardPrice}, Premium R$ ${premiumPrice}`);

        } catch (error) {
            logger.error('Erro ao atualizar configuração de pagamento:', error);
            await interaction.reply({
                content: '❌ **Erro:** Falha ao atualizar configurações.',
                ephemeral: true
            });
        }
    },

    async updateSystemConfig(interaction) {
        try {
            const maxFileSize = parseInt(interaction.fields.getTextInputValue('maxFileSize'));
            const allowedExtensions = interaction.fields.getTextInputValue('allowedExtensions')
                .split(',').map(ext => ext.trim());
            const deployTimeout = parseInt(interaction.fields.getTextInputValue('deployTimeout'));
            const paymentTimeout = parseInt(interaction.fields.getTextInputValue('paymentTimeout'));

            if (isNaN(maxFileSize) || isNaN(deployTimeout) || isNaN(paymentTimeout)) {
                return await interaction.reply({
                    content: '❌ **Erro:** Valores numéricos inválidos.',
                    ephemeral: true
                });
            }

            const config = adminConfig.get('systemSettings');
            config.maxFileSize = maxFileSize;
            config.allowedExtensions = allowedExtensions;
            config.deployTimeout = deployTimeout;
            config.paymentTimeout = paymentTimeout;
            adminConfig.set('systemSettings', config);

            const embed = new EmbedBuilder()
                .setTitle('✅ Configurações do Sistema Atualizadas')
                .setDescription('As configurações do sistema foram atualizadas com sucesso!')
                .addFields(
                    { name: 'Tamanho Máximo', value: `${maxFileSize}MB`, inline: true },
                    { name: 'Extensões', value: allowedExtensions.join(', '), inline: true },
                    { name: 'Timeouts', value: `Deploy: ${deployTimeout}s\nPagamento: ${paymentTimeout}s`, inline: true }
                )
                .setColor(colors.success)
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            // Log da ação
            await this.logAdminAction(interaction, 'Configuração do Sistema', `Max: ${maxFileSize}MB, Timeouts: ${deployTimeout}s/${paymentTimeout}s`);

        } catch (error) {
            logger.error('Erro ao atualizar configuração do sistema:', error);
            await interaction.reply({
                content: '❌ **Erro:** Falha ao atualizar configurações.',
                ephemeral: true
            });
        }
    },

    async togglePaymentSystem(interaction) {
        const config = adminConfig.get('paymentSettings');
        config.pixEnabled = !config.pixEnabled;
        adminConfig.set('paymentSettings', config);

        const embed = new EmbedBuilder()
            .setTitle('🔄 Sistema PIX Atualizado')
            .setDescription(`Sistema PIX foi ${config.pixEnabled ? 'habilitado' : 'desabilitado'}`)
            .setColor(config.pixEnabled ? colors.success : colors.warning)
            .setTimestamp();

        await interaction.update({
            embeds: [embed],
            components: []
        });

        await this.logAdminAction(interaction, 'Toggle PIX', `PIX ${config.pixEnabled ? 'habilitado' : 'desabilitado'}`);
    },

    async toggleAutoDeploy(interaction) {
        const config = adminConfig.get('paymentSettings');
        config.autoDeployEnabled = !config.autoDeployEnabled;
        adminConfig.set('paymentSettings', config);

        const embed = new EmbedBuilder()
            .setTitle('🔄 Auto-Deploy Atualizado')
            .setDescription(`Auto-Deploy foi ${config.autoDeployEnabled ? 'habilitado' : 'desabilitado'}`)
            .setColor(config.autoDeployEnabled ? colors.success : colors.warning)
            .setTimestamp();

        await interaction.update({
            embeds: [embed],
            components: []
        });

        await this.logAdminAction(interaction, 'Toggle Auto-Deploy', `Auto-Deploy ${config.autoDeployEnabled ? 'habilitado' : 'desabilitado'}`);
    },

    async logAdminAction(interaction, action, details) {
        const adminLogger = require('../utils/adminLogger.js');
        await adminLogger.logAdminAction(interaction.client, {
            action,
            details,
            userId: interaction.user.id
        });
    },

    isAdmin(member) {
        if (!member) return false;
        
        // Verificar se é administrador do servidor
        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            return true;
        }
        
        // Verificar role específica de admin (se configurada)
        if (adminRoleId && member.roles.cache.has(adminRoleId)) {
            return true;
        }
        
        return false;
    },

    // Função para obter configurações (para uso em outros módulos)
    getConfig() {
        return adminConfig;
    }
};