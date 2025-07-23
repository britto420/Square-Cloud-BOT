require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    squareCloudApiKey: process.env.SQUARECLOUD_API_KEY,
    mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    
    // Configurações de administrador
    adminRoleId: process.env.ADMIN_ROLE_ID,
    
    // Canais de logs
    logChannels: {
        actions: process.env.SC_ACTIONS_LOGS,
        admin: process.env.SC_ADMIN_LOGS,
        payments: process.env.SC_PAYMENTS_LOGS,
        deploys: process.env.SC_DEPLOY_LOGS
    },
    
    // Configurações do bot
    colors: {
        primary: '#7289da',
        success: '#43b581',
        error: '#f04747',
        warning: '#faa61a',
        info: '#5865f2'
    },
    
    // Configurações de pagamento
    payment: {
        pollInterval: 5000, // 5 segundos
        timeoutMinutes: 5,
        values: {
            basic: 15.00,
            standard: 25.00,
            premium: 50.00
        }
    },
    
    // Configurações de deploy
    deploy: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedExtensions: ['.zip'],
        timeout: 300000 // 5 minutos
    }
};