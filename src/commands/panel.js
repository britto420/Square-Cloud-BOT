const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../config/config.js');
const logger = require('../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Criar painel de controle Square Cloud')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal onde será criado o painel')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('categoria')
                .setDescription('Categoria onde serão criados os tickets')
                .setRequired(true)
        ),

    async execute(interaction) {
        // Verificar se é administrador
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ **Acesso Negado:** Você não tem permissão para usar este comando.',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('canal');
        const category = interaction.options.getChannel('categoria');

        // Validar se é um canal de texto
        if (channel.type !== ChannelType.GuildText) {
            return await interaction.reply({
                content: '❌ **Erro:** O canal deve ser um canal de texto.',
                ephemeral: true
            });
        }

        // Validar se é uma categoria
        if (category.type !== ChannelType.GuildCategory) {
            return await interaction.reply({
                content: '❌ **Erro:** Deve ser uma categoria válida.',
                ephemeral: true
            });
        }

        try {
            // Criar embed do painel
            const panelEmbed = new EmbedBuilder()
                .setTitle('🚀 Square Cloud - Painel de Controle')
                .setDescription(`**Bem-vindo ao sistema de deploy da Square Cloud!**\n\nClique no botão abaixo para iniciar um novo deploy. Um canal privado será criado especialmente para você, onde poderá configurar sua aplicação com total privacidade.\n\n**Recursos disponíveis:**\n🔹 Deploy de aplicações\n🔹 Gerenciamento completo\n🔹 Sistema de pagamento PIX\n🔹 Suporte personalizado\n\n**Planos disponíveis:**\n💎 **Básico** - Ideal para projetos pequenos\n🏆 **Padrão** - Para aplicações médias\n👑 **Premium** - Máxima performance`)
                .setColor(colors.primary)
                .setThumbnail('https://media.discordapp.net/attachments/1312092720046800918/1395863982929219606/squarelogo.png?ex=687bff23&is=687aada3&hm=2fb3f647bf976c4d12c7efb166691a8fe8a9d83495a7c18a452ed8a35fdb89b9&=&format=webp&quality=lossless&width=440&height=440')
                .setImage('https://media.discordapp.net/attachments/1312092720046800918/1395863497417556058/square.png?ex=687bfeaf&is=687aad2f&hm=40bd14f7075a083f88561834dadf1df1a9e57f7ccf566a32d151816fed497ccb&=&format=webp&quality=lossless&width=660&height=264')
                .setTimestamp()
                .setFooter({ 
                    text: 'Square Cloud Bot - Sistema de Deploy Automatizado',
                    iconURL: 'https://media.discordapp.net/attachments/1312092720046800918/1395863982929219606/squarelogo.png?ex=687bff23&is=687aada3&hm=2fb3f647bf976c4d12c7efb166691a8fe8a9d83495a7c18a452ed8a35fdb89b9&=&format=webp&quality=lossless&width=440&height=440'
                });

            // Botão para iniciar ticket
            const startButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ticket_create_${category.id}`)
                        .setLabel('Iniciar Atendimento')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🚀')
                );

            // Enviar painel no canal especificado
            await channel.send({
                embeds: [panelEmbed],
                components: [startButton]
            });

            // Confirmar criação
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ Painel Criado!')
                .setDescription(`Painel de controle criado com sucesso em ${channel}!\n\n**Categoria de tickets:** ${category}\n\nOs usuários agora podem clicar no botão para criar tickets privados.`)
                .setColor(colors.success)
                .setTimestamp();

            await interaction.reply({
                embeds: [confirmEmbed],
                ephemeral: true
            });

            logger.info(`Painel criado por ${interaction.user.tag} no canal ${channel.name}`);

        } catch (error) {
            logger.error('Erro ao criar painel:', error);
            
            await interaction.reply({
                content: '❌ **Erro:** Falha ao criar o painel. Verifique as permissões do bot.',
                ephemeral: true
            });
        }
    },

    async handleComponent(interaction, action) {
        if (action.startsWith('create_')) {
            const categoryId = action.split('_')[1];
            await this.createTicket(interaction, categoryId);
        }
    },

    async createTicket(interaction, categoryId) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;
            const user = interaction.user;
            const category = guild.channels.cache.get(categoryId);

            if (!category) {
                return await interaction.editReply({
                    content: '❌ **Erro:** Categoria não encontrada.'
                });
            }

            // Verificar se o usuário já tem um ticket aberto
            const existingTicket = guild.channels.cache.find(
                channel => channel.name === `square-${user.username.toLowerCase()}` && 
                          channel.parentId === categoryId
            );

            if (existingTicket) {
                return await interaction.editReply({
                    content: `❌ **Erro:** Você já possui um ticket aberto: ${existingTicket}`
                });
            }

            // Criar canal do ticket
            const ticketChannel = await guild.channels.create({
                name: `square-${user.username.toLowerCase()}`,
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles
                        ]
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages
                        ]
                    }
                ]
            });

            // Embed de boas-vindas no ticket
            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`🎫 Ticket de Deploy - ${user.username}`)
                .setDescription(`**Olá ${user}! Bem-vindo ao seu ticket privado!**\n\nAqui você pode fazer o deploy da sua aplicação com total privacidade. Use os comandos abaixo para gerenciar suas aplicações:\n\n**Comandos disponíveis:**\n🚀 \`/deploy\` - Fazer deploy de uma aplicação\n📊 \`/status <id>\` - Verificar status de uma aplicação\n📋 \`/list\` - Listar suas aplicações\n🗑️ \`/delete <id>\` - Deletar uma aplicação\n❓ \`/help\` - Ajuda completa\n\n**Este canal será automaticamente deletado após 24 horas de inatividade.**`)
                .setColor(colors.success)
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: 'Square Cloud Bot - Ticket System' });

            // Botão para fechar ticket
            const closeButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ticket_close_${ticketChannel.id}`)
                        .setLabel('Fechar Ticket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

            await ticketChannel.send({
                content: `${user}`,
                embeds: [welcomeEmbed],
                components: [closeButton]
            });

            // Confirmar criação do ticket
            await interaction.editReply({
                content: `✅ **Ticket criado com sucesso!**\n\nSeu canal privado: ${ticketChannel}\n\nVocê pode fazer o deploy da sua aplicação com total privacidade.`
            });

            logger.info(`Ticket criado para ${user.tag} - Canal: ${ticketChannel.name}`);

            // Auto-delete após 24 horas de inatividade
            setTimeout(async () => {
                try {
                    const channel = guild.channels.cache.get(ticketChannel.id);
                    if (channel) {
                        // Cancelar polling de pagamentos ativos neste canal
                        const paymentPoller = require('../utils/paymentPoller.js');
                        paymentPoller.cancelPollingForChannel(ticketChannel.id);
                        
                        await channel.delete('Auto-delete após 24h de inatividade');
                        logger.info(`Ticket auto-deletado: ${ticketChannel.name}`);
                    }
                } catch (error) {
                    logger.error('Erro ao auto-deletar ticket:', error);
                }
            }, 24 * 60 * 60 * 1000); // 24 horas

        } catch (error) {
            logger.error('Erro ao criar ticket:', error);
            
            await interaction.editReply({
                content: '❌ **Erro:** Falha ao criar o ticket. Verifique as permissões do bot.'
            });
        }
    },

    async closeTicket(interaction, channelId) {
        try {
            const channel = interaction.guild.channels.cache.get(channelId);
            
            if (!channel) {
                return await interaction.reply({
                    content: '❌ **Erro:** Canal não encontrado.',
                    ephemeral: true
                });
            }

            // Verificar se é o dono do ticket ou admin
            const isOwner = channel.name.includes(interaction.user.username.toLowerCase());
            const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

            if (!isOwner && !isAdmin) {
                return await interaction.reply({
                    content: '❌ **Erro:** Você não tem permissão para fechar este ticket.',
                    ephemeral: true
                });
            }

            // Embed de confirmação
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🔒 Fechando Ticket')
                .setDescription('Este ticket será fechado em 5 segundos...\n\nObrigado por usar nossos serviços!')
                .setColor(colors.warning)
                .setTimestamp();

            await interaction.reply({
                embeds: [confirmEmbed]
            });

            // Deletar canal após 5 segundos
            setTimeout(async () => {
                try {
                    // Cancelar polling de pagamentos ativos neste canal
                    const paymentPoller = require('../utils/paymentPoller.js');
                    paymentPoller.cancelPollingForChannel(channelId);
                    
                    await channel.delete('Ticket fechado pelo usuário');
                    logger.info(`Ticket fechado: ${channel.name} por ${interaction.user.tag}`);
                } catch (error) {
                    logger.error('Erro ao fechar ticket:', error);
                }
            }, 5000);

        } catch (error) {
            logger.error('Erro ao fechar ticket:', error);
            
            await interaction.reply({
                content: '❌ **Erro:** Falha ao fechar o ticket.',
                ephemeral: true
            });
        }
    }
};