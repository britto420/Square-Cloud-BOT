const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const squareCloud = require('../utils/squarecloud.js');
const mercadoPago = require('../utils/mercadopago.js');
const paymentPoller = require('../utils/paymentPoller.js');
const adminLogger = require('../utils/adminLogger.js');
const { colors } = require('../config/config.js');
const logger = require('../utils/logger.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Carregar configurações dinâmicas
function loadConfig() {
    try {
        const configPath = path.join(__dirname, '../data/admin-config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (error) {
        logger.error('Erro ao carregar configuração:', error);
    }
    
    // Configuração padrão
    return {
        paymentSettings: {
            basicPrice: 15.00,
            standardPrice: 25.00,
            premiumPrice: 50.00,
            pixEnabled: true,
            autoDeployEnabled: true
        }
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deploy')
        .setDescription('Fazer deploy de uma aplicação na Square Cloud')
        .addAttachmentOption(option =>
            option.setName('arquivo')
                .setDescription('Arquivo ZIP da aplicação')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('plano')
                .setDescription('Plano de hospedagem')
                .setRequired(true)
                .addChoices(
                    { name: 'Básico', value: 'basic' },
                    { name: 'Padrão', value: 'standard' },
                    { name: 'Premium', value: 'premium' }
                )
        ),

    async execute(interaction) {
        const file = interaction.options.getAttachment('arquivo');
        const plan = interaction.options.getString('plano');
        
        // Carregar configurações atuais
        const config = loadConfig();
        const planPrice = config.paymentSettings[`${plan}Price`];

        // Validar arquivo
        if (!file) {
            return await interaction.reply({
                content: '❌ **Erro:** Arquivo não fornecido.',
                ephemeral: true
            });
        }

        // Validar extensão do arquivo
        const allowedExtensions = ['.zip'];
        const fileExtension = file.name.toLowerCase();
        const isValidExtension = allowedExtensions.some(ext => fileExtension.endsWith(ext));

        if (!isValidExtension) {
            return await interaction.reply({
                content: `❌ **Erro:** Formato de arquivo não suportado.\n\n**Formatos aceitos:** ${allowedExtensions.join(', ')}`,
                ephemeral: true
            });
        }

        // Validar tamanho do arquivo (100MB)
        if (file.size > 100 * 1024 * 1024) {
            return await interaction.reply({
                content: '❌ **Erro:** Arquivo muito grande. Tamanho máximo: 100MB.',
                ephemeral: true
            });
        }

        // Criar embed de configuração com valores atualizados
        const configEmbed = new EmbedBuilder()
            .setTitle('🚀 Deploy na Square Cloud')
            .setDescription(`**Arquivo:** ${file.name}\n**Plano:** ${plan.charAt(0).toUpperCase() + plan.slice(1)} - R$ ${planPrice.toFixed(2)}`)
            .setColor(colors.info)
            .setTimestamp()
            .setFooter({ text: 'Square Cloud Bot' });

        // Botões de ação
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('deploy_configure')
                    .setLabel('Configurar Deploy')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('deploy_payment')
                    .setLabel('Pagar e Fazer Deploy')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💳')
            );

        await interaction.reply({
            embeds: [configEmbed],
            components: [buttons],
            ephemeral: true
        });

        // Armazenar dados do deploy em cache global
        if (!global.deployCache) {
            global.deployCache = new Map();
        }
        
        global.deployCache.set(interaction.user.id, {
            file: file,
            plan: plan,
            price: planPrice,
            config: {
                displayName: file.name.split('.')[0].replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'MyApp',
                description: `Deploy via Discord - Plano ${plan}`,
                memory: plan === 'basic' ? 256 : plan === 'standard' ? 512 : 1024,
                version: 'recommended'
            }
        });

        logger.info(`Deploy iniciado por ${interaction.user.tag} - Plano: ${plan} - Valor: R$ ${planPrice}`);
    },

    async handleComponent(interaction, action) {
        const deployData = global.deployCache?.get(interaction.user.id);

        if (!deployData) {
            return await interaction.reply({
                content: '❌ **Erro:** Dados do deploy não encontrados. Tente novamente com o comando `/deploy`.',
                ephemeral: true
            });
        }

        switch (action) {
            case 'configure':
                await this.showConfigModal(interaction, deployData);
                break;
            case 'payment':
                await this.showUserDataModal(interaction, deployData);
                break;
            case 'confirm':
                await this.confirmDeploy(interaction, deployData);
                break;
            case 'retry':
            case 'cancel_retry':
                await this.handleRetry(interaction, action);
                break;
        }
    },

    async handleModal(interaction, action) {
        if (action === 'config') {
            const displayName = interaction.fields.getTextInputValue('displayName');
            const description = interaction.fields.getTextInputValue('description');
            const memory = parseInt(interaction.fields.getTextInputValue('memory'));
            const version = interaction.fields.getTextInputValue('version');

            // Validar inputs
            if (!displayName || !description || !memory || !version) {
                return await interaction.reply({
                    content: '❌ **Erro:** Todos os campos são obrigatórios.',
                    ephemeral: true
                });
            }

            if (memory < 256 || memory > 1024) {
                return await interaction.reply({
                    content: '❌ **Erro:** Memória deve estar entre 256MB e 1024MB.',
                    ephemeral: true
                });
            }

            // Atualizar configurações no cache
            const deployData = global.deployCache?.get(interaction.user.id);
            if (deployData) {
                deployData.config = {
                    displayName,
                    description,
                    memory,
                    version
                };
                global.deployCache.set(interaction.user.id, deployData);
            }

            const updateEmbed = new EmbedBuilder()
                .setTitle('✅ Configuração Atualizada')
                .setDescription(`**Nome:** ${displayName}\n**Descrição:** ${description}\n**Memória:** ${memory}MB\n**Versão:** ${version}`)
                .setColor(colors.success)
                .setTimestamp();

            await interaction.reply({
                embeds: [updateEmbed],
                ephemeral: true
            });
        } else if (action === 'userdata') {
            await this.processUserDataAndPayment(interaction);
        }
    },

    async showUserDataModal(interaction, deployData) {
        const modal = new ModalBuilder()
            .setCustomId('deploy_userdata')
            .setTitle('Dados para Pagamento PIX');

        const nameInput = new TextInputBuilder()
            .setCustomId('fullName')
            .setLabel('Nome Completo')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: João Silva Santos')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(50);

        const emailInput = new TextInputBuilder()
            .setCustomId('email')
            .setLabel('E-mail')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: joao@email.com')
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(100);

        const cpfInput = new TextInputBuilder()
            .setCustomId('cpf')
            .setLabel('CPF (apenas números)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 12345678901')
            .setRequired(true)
            .setMinLength(11)
            .setMaxLength(11);

        const rows = [
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(emailInput),
            new ActionRowBuilder().addComponents(cpfInput)
        ];

        modal.addComponents(...rows);
        await interaction.showModal(modal);
    },

    async processUserDataAndPayment(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const fullName = interaction.fields.getTextInputValue('fullName').trim();
            const email = interaction.fields.getTextInputValue('email').trim();
            const cpf = interaction.fields.getTextInputValue('cpf').trim();

            // Validar dados
            if (!this.validateEmail(email)) {
                return await interaction.editReply({
                    content: '❌ **Erro:** E-mail inválido. Por favor, insira um e-mail válido.',
                });
            }

            if (!this.validateCPF(cpf)) {
                return await interaction.editReply({
                    content: '❌ **Erro:** CPF inválido. Por favor, insira apenas os 11 números do CPF.',
                });
            }

            const deployData = global.deployCache?.get(interaction.user.id);
            if (!deployData) {
                return await interaction.editReply({
                    content: '❌ **Erro:** Dados do deploy não encontrados. Tente novamente.',
                });
            }

            // Recarregar configurações para garantir valores atualizados
            const currentConfig = loadConfig();
            const currentPrice = currentConfig.paymentSettings[`${deployData.plan}Price`];
            
            // Atualizar preço no deployData
            deployData.price = currentPrice;
            
            // Armazenar dados do usuário
            deployData.userData = {
                fullName,
                email,
                cpf
            };
            
            global.deployCache.set(interaction.user.id, deployData);

            // Criar pagamento PIX com dados reais do usuário
            const paymentData = await mercadoPago.createPixPayment(
                currentPrice,
                `Deploy Square Cloud - ${deployData.config.displayName}`,
                deployData.userData
            );

            // Embed do pagamento
            const paymentEmbed = new EmbedBuilder()
                .setTitle('💳 Pagamento PIX')
                .setDescription(`**Valor:** R$ ${currentPrice.toFixed(2)}\n**Aplicação:** ${deployData.config.displayName}\n**Pagador:** ${fullName}\n\n**Instruções:**\n1. Escaneie o QR Code ou copie o código PIX\n2. Faça o pagamento em seu banco\n3. Aguarde a confirmação automática\n\n**Código PIX:**\n\`\`\`${paymentData.qr_code}\`\`\``)
                .setColor(colors.warning)
                .setImage(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentData.qr_code)}`)
                .setTimestamp()
                .setFooter({ text: 'Pagamento será verificado automaticamente' });

            // Botão para copiar código PIX
            const pixButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`deploy_copy_pix_${paymentData.id}`)
                        .setLabel('Copiar Código PIX')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📋')
                );

            await interaction.editReply({
                embeds: [paymentEmbed],
                components: [pixButton]
            });

            // Iniciar polling para verificar pagamento
            paymentPoller.startPolling(
                paymentData.id,
                interaction.user.id,
                interaction,
                async (paymentStatus) => {
                    await this.onPaymentSuccess(interaction, deployData, paymentStatus);
                },
                async () => {
                    await interaction.editReply({
                        content: '⏰ **Tempo esgotado!**\n\nO pagamento não foi confirmado dentro do prazo. Tente novamente.',
                        embeds: [],
                        components: []
                    });
                }
            );

            // Armazenar dados do pagamento
            deployData.payment = paymentData;
            global.deployCache.set(interaction.user.id, deployData);

            logger.info(`Pagamento PIX criado para ${interaction.user.tag} - ID: ${paymentData.id} - Valor: R$ ${currentPrice}`);

        } catch (error) {
            logger.error('Erro ao processar dados do usuário e pagamento:', error);
            await interaction.editReply({
                content: '❌ **Erro:** Falha ao processar pagamento. Verifique seus dados e tente novamente.',
                embeds: [],
                components: []
            });
        }
    },

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    validateCPF(cpf) {
        // Verificar se tem 11 dígitos e são todos números
        if (!/^\d{11}$/.test(cpf)) {
            return false;
        }
        
        // Verificar se não são todos números iguais
        if (/^(\d)\1{10}$/.test(cpf)) {
            return false;
        }
        
        return true;
    },

    async showConfigModal(interaction, deployData) {
        const modal = new ModalBuilder()
            .setCustomId('deploy_config')
            .setTitle('Configurar Deploy');

        const displayNameInput = new TextInputBuilder()
            .setCustomId('displayName')
            .setLabel('Nome da Aplicação')
            .setStyle(TextInputStyle.Short)
            .setValue(deployData.config.displayName)
            .setRequired(true);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Descrição')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(deployData.config.description)
            .setRequired(true);

        const memoryInput = new TextInputBuilder()
            .setCustomId('memory')
            .setLabel('Memória (MB)')
            .setStyle(TextInputStyle.Short)
            .setValue(deployData.config.memory.toString())
            .setRequired(true);

        const versionInput = new TextInputBuilder()
            .setCustomId('version')
            .setLabel('Versão do Node.js')
            .setStyle(TextInputStyle.Short)
            .setValue(deployData.config.version)
            .setRequired(true);

        const rows = [
            new ActionRowBuilder().addComponents(displayNameInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(memoryInput),
            new ActionRowBuilder().addComponents(versionInput)
        ];

        modal.addComponents(...rows);
        await interaction.showModal(modal);
    },

    async onPaymentSuccess(interaction, deployData, paymentStatus) {
        try {
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Pagamento Aprovado!')
                .setDescription('Seu pagamento foi confirmado. Iniciando deploy...')
                .setColor(colors.success)
                .setTimestamp();

            await interaction.editReply({
                embeds: [successEmbed],
                components: []
            });

            // Fazer deploy da aplicação
            await this.performDeploy(interaction, deployData, false);

            // Log do pagamento aprovado
            try {
                await adminLogger.logPayment(interaction.client, {
                    amount: deployData.price,
                    plan: deployData.plan,
                    status: 'approved',
                    userId: interaction.user.id,
                    paymentId: paymentStatus.id
                });
            } catch (logError) {
                logger.warn('Erro ao enviar log de pagamento:', logError.message);
            }

        } catch (error) {
            logger.error('Erro ao processar pagamento aprovado:', error);
            
            // Se o erro permite retry, oferecer opção de tentar novamente
            if (error.canRetry) {
                await this.showRetryOption(interaction, deployData, error);
            } else {
                await interaction.editReply({
                    content: '❌ **Erro:** Falha ao processar pagamento aprovado.',
                    embeds: [],
                    components: []
                });
            }
        }
    },

    async performDeploy(interaction, deployData, isRetry = false) {
        try {
            // Embed de deploy em progresso
            const deployingEmbed = new EmbedBuilder()
                .setTitle(isRetry ? '🔄 Tentando Deploy Novamente...' : '🚀 Fazendo Deploy...')
                .setDescription(isRetry ? 
                    'Tentando implantar sua aplicação novamente na Square Cloud. Aguarde...' : 
                    'Sua aplicação está sendo implantada na Square Cloud. Aguarde...')
                .setColor(colors.info)
                .setTimestamp();

            await interaction.editReply({
                embeds: [deployingEmbed],
                components: []
            });

            // Baixar arquivo
            let fileBuffer;
            try {
                if (!isRetry || !deployData.fileBuffer) {
                    const fileResponse = await axios.get(deployData.file.url, {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        maxContentLength: 100 * 1024 * 1024,
                        maxBodyLength: 100 * 1024 * 1024
                    });
                    fileBuffer = Buffer.from(fileResponse.data);
                    deployData.fileBuffer = fileBuffer; // Cache para retry
                    logger.info(`Arquivo baixado com sucesso: ${fileBuffer.length} bytes`);
                } else {
                    fileBuffer = deployData.fileBuffer;
                    logger.info(`Usando arquivo em cache: ${fileBuffer.length} bytes`);
                }
            } catch (downloadError) {
                logger.warn('Erro ao baixar arquivo, usando buffer demo:', downloadError.message);
                throw new Error(`Falha ao baixar arquivo: ${downloadError.message}`);
            }

            // Fazer deploy
            const deployResult = await squareCloud.deployApp(fileBuffer, deployData.config);

            // Embed de sucesso
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Deploy Concluído!')
                .setDescription(`Sua aplicação foi implantada com sucesso na Square Cloud!`)
                .addFields(
                    { name: '🆔 ID da Aplicação', value: deployResult.id, inline: true },
                    { name: '📛 Nome', value: deployData.config.displayName, inline: true },
                    { name: '💾 Memória', value: `${deployData.config.memory}MB`, inline: true },
                    { name: '🌐 URL', value: deployResult.url || 'Em processamento', inline: false }
                )
                .setColor(colors.success)
                .setTimestamp()
                .setFooter({ text: 'Square Cloud Bot' });

            await interaction.editReply({
                embeds: [successEmbed],
                components: []
            });

            logger.info(`Deploy concluído com sucesso: ${deployResult.id} por ${interaction.user.tag}`);

            // Registrar a aplicação para o usuário
            squareCloud.registerUserApp(interaction.user.id, deployResult.id);

            // Log do deploy realizado
            try {
                await adminLogger.logDeploy(interaction.client, {
                    appName: deployData.config.displayName,
                    appId: deployResult.id,
                    memory: deployData.config.memory,
                    userId: interaction.user.id,
                    paidAmount: deployData.price
                });
            } catch (logError) {
                logger.warn('Erro ao enviar log de deploy:', logError.message);
            }

            // Limpar cache após deploy bem-sucedido
            global.deployCache.delete(interaction.user.id);

        } catch (error) {
            logger.error('Erro no deploy:', error);

            // Se o erro permite retry, mostrar opção
            if (error.canRetry && !isRetry) {
                await this.showRetryOption(interaction, deployData, error);
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Falha no Deploy')
                    .setDescription(`Ocorreu um erro durante o deploy:\n\n**Erro:** ${error.message}\n\n**Possíveis soluções:**\n• Verifique se o arquivo está correto\n• Tente novamente em alguns minutos\n• Entre em contato com o suporte se o problema persistir`)
                    .setColor(colors.error)
                    .setTimestamp();
                await interaction.editReply({
                    embeds: [errorEmbed],
                    components: []
                });
            }
            
            throw error;
        }
    },

    async showRetryOption(interaction, deployData, error) {
        const retryEmbed = new EmbedBuilder()
            .setTitle('⚠️ Falha no Deploy')
            .setDescription(`O deploy falhou, mas você pode tentar novamente:\n\n**Erro:** ${error.message}\n\n**O que aconteceu:**\n• Seu pagamento foi aprovado com sucesso\n• O erro ocorreu durante a implantação\n• Você pode tentar fazer o deploy novamente sem pagar\n\n**Escolha uma opção abaixo:**`)
            .setColor(colors.warning)
            .setTimestamp();

        const retryButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('deploy_retry')
                    .setLabel('🔄 Tentar Novamente')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🚀'),
                new ButtonBuilder()
                    .setCustomId('deploy_cancel_retry')
                    .setLabel('❌ Cancelar')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('✖️')
            );

        await interaction.editReply({
            embeds: [retryEmbed],
            components: [retryButtons]
        });

        // Manter dados no cache para retry
        global.deployCache.set(interaction.user.id, deployData);
    },

    async handleRetry(interaction, action) {
        const deployData = global.deployCache?.get(interaction.user.id);
        
        if (!deployData) {
            return await interaction.update({
                content: '❌ **Erro:** Dados do deploy não encontrados. Os dados expiraram.',
                embeds: [],
                components: []
            });
        }

        if (action === 'retry') {
            try {
                await interaction.deferUpdate();
                await this.performDeploy(interaction, deployData, true);
            } catch (error) {
                logger.error('Erro no retry do deploy:', error);
                
                const finalErrorEmbed = new EmbedBuilder()
                    .setTitle('❌ Deploy Falhou Definitivamente')
                    .setDescription(`Infelizmente não foi possível completar o deploy após múltiplas tentativas.\n\n**Último erro:** ${error.message}\n\n**Próximos passos:**\n• Entre em contato com o suporte\n• Seu pagamento foi processado com sucesso\n• Você receberá assistência para resolver o problema`)
                    .setColor(colors.error)
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [finalErrorEmbed],
                    components: []
                });

                // Limpar cache após falha definitiva
                global.deployCache.delete(interaction.user.id);
            }
        } else if (action === 'cancel_retry') {
            const cancelEmbed = new EmbedBuilder()
                .setTitle('❌ Deploy Cancelado')
                .setDescription('Você cancelou a tentativa de deploy.\n\n**Importante:**\n• Seu pagamento foi processado com sucesso\n• Entre em contato com o suporte se precisar de ajuda\n• Você pode tentar fazer um novo deploy quando quiser')
                .setColor(colors.info)
                .setTimestamp();

            await interaction.update({
                embeds: [cancelEmbed],
                components: []
            });

            // Limpar cache
            global.deployCache.delete(interaction.user.id);
        }
    }
};