const { EmbedBuilder } = require('discord.js');
const { colors, logChannels } = require('../config/config.js');
const logger = require('./logger.js');
const fs = require('fs');
const path = require('path');

class AdminLogger {
    constructor() {
        this.configPath = path.join(__dirname, '../data/admin-config.json');
        this.envPath = path.join(__dirname, '../../.env');
        this.loadConfig();
    }

    loadConfig() {
        try {
            // Carregar canais do .env primeiro
            this.logChannels = {
                actions: logChannels.actions,
                admin: logChannels.admin,
                payments: logChannels.payments,
                deploys: logChannels.deploys
            };
            
            // Sobrescrever com configurações do arquivo JSON se existir
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                if (config.logChannels) {
                    this.logChannels = { ...this.logChannels, ...config.logChannels };
                }
                this.adminNotifications = config.notifications?.adminNotifications || true;
                this.paymentNotifications = config.notifications?.paymentNotifications || true;
            } else {
                this.adminNotifications = true;
                this.paymentNotifications = true;
            }
        } catch (error) {
            logger.error('Erro ao carregar configuração do admin logger:', error);
            this.logChannels = {
                actions: logChannels.actions,
                admin: logChannels.admin,
                payments: logChannels.payments,
                deploys: logChannels.deploys
            };
        }
    }

    async logPayment(client, paymentData) {
        if (!this.logChannels.payments || !this.paymentNotifications) return;

        try {
            const channel = await client.channels.fetch(this.logChannels.payments);
            
            const embed = new EmbedBuilder()
                .setTitle('💳 Novo Pagamento')
                .setDescription('Um novo pagamento foi processado')
                .setColor(paymentData.status === 'approved' ? colors.success : colors.warning)
                .setTimestamp()
                .setFooter({ text: 'Square Cloud Bot - Payment Logs' });

            // Adicionar campos de forma segura
            const fields = [];
            
            if (paymentData.amount) {
                fields.push({ name: '💰 Valor', value: `R$ ${paymentData.amount.toFixed(2)}`, inline: true });
            }
            
            if (paymentData.plan) {
                fields.push({ name: '📦 Plano', value: String(paymentData.plan), inline: true });
            }
            
            if (paymentData.status) {
                fields.push({ name: '📊 Status', value: String(paymentData.status), inline: true });
            }
            
            if (paymentData.userId) {
                fields.push({ name: '👤 Usuário', value: `<@${paymentData.userId}>`, inline: true });
            }
            
            if (paymentData.paymentId) {
                fields.push({ name: '🆔 Payment ID', value: String(paymentData.paymentId), inline: true });
            }
            
            fields.push({ name: '🕐 Horário', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true });
            
            embed.addFields(fields);

            await channel.send({ embeds: [embed] });
            
        } catch (error) {
            logger.error('Erro ao enviar log de pagamento:', error);
        }
    }

    async logDeploy(client, deployData) {
        if (!this.logChannels.deploys || !this.adminNotifications) return;

        try {
            const channel = await client.channels.fetch(this.logChannels.deploys);
            
            const embed = new EmbedBuilder()
                .setTitle('🚀 Novo Deploy')
                .setDescription('Uma nova aplicação foi implantada')
                .addFields(
                    { name: '📛 Nome', value: deployData.appName, inline: true },
                    { name: '🆔 App ID', value: deployData.appId, inline: true },
                    { name: '💾 Memória', value: `${deployData.memory}MB`, inline: true },
                    { name: '👤 Usuário', value: `<@${deployData.userId}>`, inline: true },
                    { name: '💰 Valor Pago', value: `R$ ${deployData.paidAmount.toFixed(2)}`, inline: true },
                    { name: '🕐 Horário', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setColor(colors.success)
                .setTimestamp()
                .setFooter({ text: 'Square Cloud Bot - Deploy Logs' });

            await channel.send({ embeds: [embed] });
            
        } catch (error) {
            logger.error('Erro ao enviar log de deploy:', error);
        }
    }

    async logError(client, errorData) {
        if (!this.logChannels.actions || !this.adminNotifications) return;

        try {
            const channel = await client.channels.fetch(this.logChannels.actions);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Erro do Sistema')
                .setDescription('Um erro foi detectado no sistema')
                .addFields(
                    { name: '🔍 Tipo', value: errorData.type, inline: true },
                    { name: '👤 Usuário', value: errorData.userId ? `<@${errorData.userId}>` : 'Sistema', inline: true },
                    { name: '🕐 Horário', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '📝 Detalhes', value: `\`\`\`${errorData.message.substring(0, 1000)}\`\`\``, inline: false }
                )
                .setColor(colors.error)
                .setTimestamp()
                .setFooter({ text: 'Square Cloud Bot - Error Logs' });

            await channel.send({ embeds: [embed] });
            
        } catch (error) {
            logger.error('Erro ao enviar log de erro:', error);
        }
    }

    async logUserAction(client, actionData) {
        if (!this.logChannels.actions || !this.adminNotifications) return;

        try {
            const channel = await client.channels.fetch(this.logChannels.actions);
            
            const embed = new EmbedBuilder()
                .setTitle('👤 Ação do Usuário')
                .setDescription(`Ação: **${actionData.action}**`)
                .addFields(
                    { name: '👤 Usuário', value: `<@${actionData.userId}>`, inline: true },
                    { name: '📋 Comando', value: actionData.command, inline: true },
                    { name: '🕐 Horário', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setColor(colors.info)
                .setTimestamp()
                .setFooter({ text: 'Square Cloud Bot - User Logs' });

            if (actionData.details) {
                embed.addFields({ name: '📝 Detalhes', value: actionData.details, inline: false });
            }

            await channel.send({ embeds: [embed] });
            
        } catch (error) {
            logger.error('Erro ao enviar log de ação do usuário:', error);
        }
    }

    async logAdminAction(client, actionData) {
        if (!this.logChannels.admin || !this.adminNotifications) return;

        try {
            const channel = await client.channels.fetch(this.logChannels.admin);
            
            const embed = new EmbedBuilder()
                .setTitle('🔧 Ação Administrativa')
                .setDescription(`**Ação:** ${actionData.action}\n**Detalhes:** ${actionData.details}`)
                .addFields(
                    { name: '👤 Administrador', value: `<@${actionData.userId}>`, inline: true },
                    { name: '🕐 Horário', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setColor(colors.info)
                .setTimestamp()
                .setFooter({ text: 'Square Cloud Bot - Admin Logs' });

            await channel.send({ embeds: [embed] });
            
        } catch (error) {
            logger.error('Erro ao enviar log administrativo:', error);
        }
    }

    async logSystemStatus(client, statusData) {
        if (!this.logChannels.admin || !this.adminNotifications) return;

        try {
            const channel = await client.channels.fetch(this.logChannels.admin);
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Status do Sistema')
                .setDescription('Relatório de status do bot')
                .addFields(
                    { name: '🟢 Uptime', value: statusData.uptime, inline: true },
                    { name: '💾 Memória', value: statusData.memory, inline: true },
                    { name: '🔄 Comandos Executados', value: statusData.commandsExecuted.toString(), inline: true },
                    { name: '💳 Pagamentos Processados', value: statusData.paymentsProcessed.toString(), inline: true },
                    { name: '🚀 Deploys Realizados', value: statusData.deploysCompleted.toString(), inline: true },
                    { name: '❌ Erros', value: statusData.errors.toString(), inline: true }
                )
                .setColor(colors.primary)
                .setTimestamp()
                .setFooter({ text: 'Square Cloud Bot - System Status' });

            await channel.send({ embeds: [embed] });
            
        } catch (error) {
            logger.error('Erro ao enviar log de status do sistema:', error);
        }
    }

    // Atualizar configurações quando mudarem
    updateConfig() {
        this.loadConfig();
    }

    // Definir canais de log específicos
    setLogChannel(type, channelId) {
        this.logChannels[type] = channelId;
        this.saveConfig();
        this.updateEnvFile(type, channelId);
    }

    updateEnvFile(type, channelId) {
        try {
            if (!fs.existsSync(this.envPath)) {
                logger.warn('Arquivo .env não encontrado, não foi possível sincronizar');
                return;
            }

            let envContent = fs.readFileSync(this.envPath, 'utf8');
            const envVarName = `SC_${type.toUpperCase()}_LOGS`;
            
            // Verificar se a variável já existe
            const regex = new RegExp(`^${envVarName}=.*$`, 'm');
            
            if (regex.test(envContent)) {
                // Atualizar variável existente
                envContent = envContent.replace(regex, `${envVarName}=${channelId}`);
            } else {
                // Adicionar nova variável
                envContent += `\n${envVarName}=${channelId}`;
            }
            
            fs.writeFileSync(this.envPath, envContent);
            logger.info(`Variável ${envVarName} atualizada no .env`);
            
        } catch (error) {
            logger.error('Erro ao atualizar arquivo .env:', error);
        }
    }
    saveConfig() {
        try {
            const configPath = path.join(__dirname, '../data/admin-config.json');
            let config = {};
            
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            
            config.logChannels = this.logChannels;
            
            const dataDir = path.dirname(configPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            logger.error('Erro ao salvar configuração de logs:', error);
        }
    }
}

module.exports = new AdminLogger();