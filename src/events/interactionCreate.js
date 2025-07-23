const { Events, InteractionType } = require('discord.js');
const logger = require('../utils/logger.js');
const adminLogger = require('../utils/adminLogger.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // Comandos slash
            if (interaction.type === InteractionType.ApplicationCommand) {
                const command = interaction.client.commands.get(interaction.commandName);

                if (!command) {
                    logger.error(`Comando não encontrado: ${interaction.commandName}`);
                    return;
                }

                try {
                    logger.info(`Comando executado: ${interaction.commandName} por ${interaction.user.tag}`);
                    
                    // Log da ação do usuário
                    await adminLogger.logUserAction(interaction.client, {
                        action: 'Comando Executado',
                        command: interaction.commandName,
                        userId: interaction.user.id
                    });
                    
                    await command.execute(interaction);
                } catch (error) {
                    logger.error(`Erro ao executar comando ${interaction.commandName}:`, error);
                    
                    // Log do erro para debugging
                    await adminLogger.logError(interaction.client, {
                        type: 'Modal',
                        message: error.message,
                        userId: interaction.user.id
                    });
                    
                    // Log do erro para debugging
                    await adminLogger.logError(interaction.client, {
                        type: 'Componente',
                        message: error.message,
                        userId: interaction.user.id
                    });
                    
                    // Log do erro
                    await adminLogger.logError(interaction.client, {
                        type: 'Comando',
                        message: error.message,
                        userId: interaction.user.id
                    });
                    
                    const errorMessage = {
                        content: '❌ **Erro:** Ocorreu um erro ao executar este comando. Tente novamente.',
                        ephemeral: true
                    };

                    if (interaction.replied || interaction.deferred) {
                        await interaction.editReply(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                }
            }
            
            // Botões e select menus
            else if (interaction.type === InteractionType.MessageComponent) {
                const customId = interaction.customId;
                let commandName, action;
                
                // Parse do customId
                if (customId.startsWith('ticket_')) {
                    // Tratar tickets separadamente
                    const ticketCommand = interaction.client.commands.get('panel');
                    if (ticketCommand) {
                        if (customId.startsWith('ticket_create_')) {
                            await ticketCommand.handleComponent(interaction, customId.replace('ticket_', ''));
                        } else if (customId.startsWith('ticket_close_')) {
                            const channelId = customId.split('_')[2];
                            await ticketCommand.closeTicket(interaction, channelId);
                        }
                    }
                    return;
                } else if (customId.includes('_')) {
                    const parts = customId.split('_');
                    commandName = parts[0];
                    action = parts.slice(1).join('_');
                } else {
                    commandName = customId;
                    action = '';
                }
                
                const command = interaction.client.commands.get(commandName);

                if (command && command.handleComponent) {
                    try {
                        await command.handleComponent(interaction, action);
                    } catch (error) {
                        logger.error(`Erro ao processar componente ${customId}:`, error);
                        
                        const errorMessage = {
                            content: '❌ **Erro:** Ocorreu um erro ao processar esta ação.',
                            ephemeral: true
                        };

                        if (interaction.replied || interaction.deferred) {
                            await interaction.editReply(errorMessage);
                        } else {
                            await interaction.reply(errorMessage);
                        }
                    }
                } else {
                    logger.warn(`Componente não encontrado: ${customId}`);
                    
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '❌ **Erro:** Componente não encontrado.',
                            ephemeral: true
                        });
                    }
                }
            }
            
            // Modais
            else if (interaction.type === InteractionType.ModalSubmit) {
                const customId = interaction.customId;
                let commandName, action;
                
                // Parse do customId
                if (customId.includes('_')) {
                    const parts = customId.split('_');
                    commandName = parts[0];
                    action = parts.slice(1).join('_');
                } else {
                    commandName = customId;
                    action = '';
                }
                
                const command = interaction.client.commands.get(commandName);

                if (command && command.handleModal) {
                    try {
                        await command.handleModal(interaction, action);
                    } catch (error) {
                        logger.error(`Erro ao processar modal ${customId}:`, error);
                        
                        const errorMessage = {
                            content: '❌ **Erro:** Ocorreu um erro ao processar este formulário.',
                            ephemeral: true
                        };

                        if (interaction.replied || interaction.deferred) {
                            await interaction.editReply(errorMessage);
                        } else {
                            await interaction.reply(errorMessage);
                        }
                    }
                } else {
                    logger.warn(`Modal não encontrado: ${customId}`);
                    
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '❌ **Erro:** Modal não encontrado.',
                            ephemeral: true
                        });
                    }
                }
            }
        } catch (error) {
            logger.error('Erro geral no interactionCreate:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ **Erro:** Ocorreu um erro inesperado.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    logger.error('Erro ao enviar resposta de erro:', replyError);
                }
            }
        }
    }
};