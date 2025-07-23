const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        logger.info(`Bot logado como ${client.user.tag}`);
        
        // Definir atividade
        client.user.setActivity('/help | developed by britto420', { 
            type: ActivityType.Watching 
        });
        
        logger.info(`Bot pronto! Servindo ${client.guilds.cache.size} servidores`);
        
        // Registrar comandos slash globalmente
        client.application?.commands.set(
            client.commands.map(command => command.data.toJSON())
        );
        
        logger.info('Comandos slash registrados globalmente');
    }
};