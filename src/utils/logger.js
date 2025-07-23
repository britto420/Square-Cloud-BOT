const winston = require('winston');
const path = require('path');

// Configurar logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'squarecloud-bot' },
    transports: [
        // Arquivo de erro
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/error.log'), 
            level: 'error' 
        }),
        // Arquivo combinado
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/combined.log') 
        }),
        // Console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Criar diretório de logs se não existir
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = logger;