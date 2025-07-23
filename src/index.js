const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const { token } = require('./config/config.js');
const logger = require('./utils/logger.js');
const fs = require('fs');
const path = require('path');

// Inicializar sistema de rastreamento de apps por usuário
global.userApps = new Map();

// Criar cliente Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Coleção de comandos
client.commands = new Collection();

// Carregar comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.info(`Comando carregado: ${command.data.name}`);
    } else {
        logger.warn(`Comando em ${filePath} está faltando propriedade "data" ou "execute"`);
    }
}

// Carregar eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    
    logger.info(`Evento carregado: ${event.name}`);
}

// Tratamento de erros
process.on('unhandledRejection', error => {
    logger.error('Erro não tratado:', error);
});

process.on('uncaughtException', error => {
    logger.error('Exceção não capturada:', error);
    process.exit(1);
});

// Iniciar bot
client.login(token);