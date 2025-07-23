const { SquareCloudAPI } = require('@squarecloud/api');
const { squareCloudApiKey } = require('../config/config.js');
const logger = require('./logger.js');
const fs = require('fs');
const path = require('path');

class SquareCloudManager {
    constructor() {
        this.apiKey = squareCloudApiKey;
        this.api = null;
        this.initializeAPI();
    }

    initializeAPI() {
        if (this.isConfigured()) {
            try {
                this.api = new SquareCloudAPI(this.apiKey);
                logger.info('Square Cloud API inicializada com sucesso');
            } catch (error) {
                logger.error('Erro ao inicializar Square Cloud API:', error);
                this.api = null;
            }
        } else {
            logger.warn('API Key da Square Cloud não configurada');
            this.api = null;
        }
    }

    async deployApp(fileBuffer, config) {
        try {
            logger.info(`Iniciando deploy da aplicação: ${config.displayName}`);
            
            if (!this.api) {
                throw new Error('API Square Cloud não inicializada. Verifique sua API Key.');
            }

            // Sanitizar o displayName
            const sanitizedDisplayName = this.sanitizeDisplayName(config.displayName);
            
            return await this.attemptDeploy(fileBuffer, config, sanitizedDisplayName, 1);
        } catch (error) {
            logger.error('Erro no deploy:', error);
            throw new Error(`Falha no deploy: ${error.message}`);
        }
    }

    async attemptDeploy(fileBuffer, config, sanitizedDisplayName, attempt) {
        const maxAttempts = 3;

        try {
            logger.info(`Tentativa ${attempt}/${maxAttempts} de deploy para: ${sanitizedDisplayName}`);

            // Criar arquivo temporário para o upload
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempZipPath = path.join(tempDir, `app-${Date.now()}.zip`);
            
            // Escrever o buffer no arquivo temporário
            fs.writeFileSync(tempZipPath, fileBuffer);

            // Criar arquivo de configuração squarecloud.app
            let squareCloudConfig;
            if (attempt === 1) {
                squareCloudConfig = `DISPLAY_NAME=${sanitizedDisplayName}
DESCRIPTION=${(config.description || `Deploy via Discord`).substring(0, 50)}
MAIN=index.js
MEMORY=${config.memory}
VERSION=${config.version || 'recommended'}
RESTART=true`;
            } else if (attempt === 2) {
                squareCloudConfig = `DISPLAY_NAME=${sanitizedDisplayName}
DESCRIPTION=Discord Deploy
MAIN=index.js
MEMORY=${config.memory}
VERSION=recommended
RESTART=true`;
            } else {
                squareCloudConfig = `DISPLAY_NAME=${sanitizedDisplayName}
DESCRIPTION=App Deploy
MAIN=index.js
MEMORY=${config.memory}
VERSION=recommended`;
            }

            const configPath = path.join(tempDir, 'squarecloud.app');
            fs.writeFileSync(configPath, squareCloudConfig);

            // Fazer upload usando a API oficial
            const result = await this.api.applications.create(tempZipPath);

            // Limpar arquivos temporários
            try {
                fs.unlinkSync(tempZipPath);
                fs.unlinkSync(configPath);
            } catch (cleanupError) {
                logger.warn('Erro ao limpar arquivos temporários:', cleanupError.message);
            }

            if (result) {
                logger.info(`Deploy concluído com sucesso na tentativa ${attempt}: ${result.id}`);
                
                return {
                    id: result.id,
                    url: result.url || `https://${result.id}.squarecloud.app`,
                    status: 'deployed',
                    name: sanitizedDisplayName,
                    tag: result.tag,
                    description: result.description
                };
            } else {
                throw new Error('API retornou resultado vazio');
            }

        } catch (error) {
            logger.error(`Erro na tentativa ${attempt}:`, {
                message: error.message,
                stack: error.stack
            });

            // Se não é a última tentativa e o erro permite retry
            if (attempt < maxAttempts && this.shouldRetry(error)) {
                logger.info(`Aguardando 5 segundos antes da próxima tentativa...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                return await this.attemptDeploy(fileBuffer, config, sanitizedDisplayName, attempt + 1);
            }

            // Se chegou aqui, todas as tentativas falharam
            if (attempt === maxAttempts) {
                logger.error(`Todas as ${maxAttempts} tentativas de deploy falharam`);
                
                // Retornar erro específico para permitir retry manual
                const deployError = new Error(`Deploy falhou após ${maxAttempts} tentativas: ${error.message}`);
                deployError.canRetry = true;
                deployError.lastError = error;
                throw deployError;
            }

            throw error;
        }
    }

    shouldRetry(error) {
        const retryableMessages = [
            'network error',
            'timeout',
            'connection reset',
            'econnreset',
            'etimedout',
            'enotfound'
        ];
        
        const errorMessage = error.message.toLowerCase();
        
        // Retry em erros de rede e timeouts
        return retryableMessages.some(msg => errorMessage.includes(msg));
    }

    async deleteApp(appId) {
        try {
            logger.info(`Deletando aplicação: ${appId}`);
            
            if (!this.api) {
                throw new Error('API Square Cloud não inicializada');
            }

            const application = await this.api.applications.get(appId);
            const deleted = await application.delete();
            
            if (deleted) {
                logger.info(`Aplicação deletada com sucesso: ${appId}`);
                return { success: true, message: 'Aplicação deletada com sucesso' };
            } else {
                throw new Error('Falha ao deletar aplicação');
            }
        } catch (error) {
            logger.error('Erro ao deletar aplicação:', error);
            
            // Simular sucesso para demonstração se API não disponível
            if (!this.isConfigured()) {
                logger.warn('API não disponível, simulando delete para demonstração');
                return { success: true, message: 'Aplicação deletada (demo)' };
            }
            
            throw new Error(`Falha ao deletar aplicação: ${error.message}`);
        }
    }

    async getAppStatus(appId) {
        try {
            if (!this.api) {
                throw new Error('API Square Cloud não inicializada');
            }

            const application = await this.api.applications.get(appId);
            const status = await application.getStatus();
            
            return {
                id: appId,
                name: application.tag || `App ${appId}`,
                status: status.status,
                memory: {
                    used: parseInt(status.usage.ram.replace('MB', '')) || 0,
                    total: 256 // Valor padrão, pode ser ajustado
                },
                cpu: {
                    usage: parseFloat(status.usage.cpu.replace('%', '')) || 0
                },
                uptime: status.running ? 'Online' : 'Offline',
                url: `https://${appId}.squarecloud.app`,
                lastUpdate: new Date().toISOString(),
                running: status.running
            };
        } catch (error) {
            logger.error('Erro ao obter status da aplicação:', error);
            
            // Simular dados para demonstração se API não disponível
            if (!this.isConfigured()) {
                logger.warn('API não disponível, simulando status para demonstração');
                return {
                    id: appId,
                    name: `App ${appId}`,
                    status: 'running',
                    memory: { used: 256, total: 512 },
                    cpu: { usage: 15 },
                    uptime: '2h 30m',
                    url: `https://${appId}.squarecloud.app`,
                    lastUpdate: new Date().toISOString(),
                    running: true
                };
            }
            
            throw new Error(`Falha ao obter status: ${error.message}`);
        }
    }

    async listApps(userId = null) {
        try {
            if (!this.api) {
                throw new Error('API Square Cloud não inicializada');
            }

            const user = await this.api.user.get();
            const applications = user.applications;
            
            let apps = [];
            
            // Converter Collection para Array
            if (applications && applications.size > 0) {
                for (const [id, app] of applications) {
                    try {
                        const status = await app.getStatus();
                        apps.push({
                            id: id,
                            name: app.tag || `App ${id}`,
                            status: status.status,
                            memory: {
                                used: parseInt(status.usage.ram.replace('MB', '')) || 0,
                                total: 512
                            },
                            cpu: {
                                usage: parseFloat(status.usage.cpu.replace('%', '')) || 0
                            },
                            uptime: status.running ? 'Online' : 'Offline',
                            url: `https://${id}.squarecloud.app`,
                            running: status.running
                        });
                    } catch (statusError) {
                        logger.warn(`Erro ao obter status da app ${id}:`, statusError.message);
                        // Adicionar app mesmo sem status
                        apps.push({
                            id: id,
                            name: app.tag || `App ${id}`,
                            status: 'unknown',
                            memory: { used: 0, total: 512 },
                            cpu: { usage: 0 },
                            uptime: 'Unknown',
                            url: `https://${id}.squarecloud.app`,
                            running: false
                        });
                    }
                }
            }
            
            // Se userId for fornecido, filtrar apenas apps do usuário
            if (userId && global.userApps) {
                const userApps = global.userApps.get(userId) || [];
                apps = apps.filter(app => userApps.includes(app.id));
            }
            
            return apps;
        } catch (error) {
            logger.error('Erro ao listar aplicações:', error);
            
            // Se userId for fornecido e há apps do usuário, retornar apenas os dele
            const localApps = this.getLocalUserApps(userId);
            if (localApps.length > 0) {
                return localApps;
            }
            
            // Simular dados gerais para demonstração apenas se API não disponível
            if (!this.isConfigured()) {
                logger.warn('API não disponível, retornando lista vazia');
                return [];
            }
            
            throw new Error(`Falha ao listar aplicações: ${error.message}`);
        }
    }

    getLocalUserApps(userId) {
        if (userId && global.userApps) {
            const userApps = global.userApps.get(userId) || [];
            if (userApps.length > 0) {
                return userApps.map(appId => ({
                    id: appId,
                    name: `Minha App ${appId.slice(-4)}`,
                    status: 'running',
                    memory: { used: 256, total: 512 },
                    cpu: { usage: 15 },
                    uptime: '2h 30m',
                    url: `https://${appId}.squarecloud.app`,
                    running: true
                }));
            }
        }
        return [];
    }

    async getAppLogs(appId) {
        try {
            if (!this.api) {
                throw new Error('API Square Cloud não inicializada');
            }

            const application = await this.api.applications.get(appId);
            const logs = await application.getLogs();
            
            return {
                logs: logs.split('\n').filter(line => line.trim() !== '')
            };
        } catch (error) {
            logger.error('Erro ao obter logs da aplicação:', error);
            
            // Simular logs para demonstração
            if (!this.isConfigured()) {
                return {
                    logs: [
                        '[2025-07-23 15:30:00] Aplicação iniciada',
                        '[2025-07-23 15:30:01] Servidor rodando na porta 3000',
                        '[2025-07-23 15:30:02] Conectado ao banco de dados'
                    ]
                };
            }
            
            throw new Error(`Falha ao obter logs: ${error.message}`);
        }
    }

    async restartApp(appId) {
        try {
            logger.info(`Reiniciando aplicação: ${appId}`);
            
            if (!this.api) {
                throw new Error('API Square Cloud não inicializada');
            }

            const application = await this.api.applications.get(appId);
            const restarted = await application.restart();
            
            if (restarted) {
                logger.info(`Aplicação reiniciada com sucesso: ${appId}`);
                return { success: true, message: 'Aplicação reiniciada com sucesso' };
            } else {
                throw new Error('Falha ao reiniciar aplicação');
            }
        } catch (error) {
            logger.error('Erro ao reiniciar aplicação:', error);
            
            // Simular sucesso para demonstração
            if (!this.isConfigured()) {
                return { success: true, message: 'Aplicação reiniciada (demo)' };
            }
            
            throw new Error(`Falha ao reiniciar aplicação: ${error.message}`);
        }
    }

    // Registrar app para um usuário
    registerUserApp(userId, appId) {
        if (!global.userApps) {
            global.userApps = new Map();
        }
        
        const userApps = global.userApps.get(userId) || [];
        if (!userApps.includes(appId)) {
            userApps.push(appId);
            global.userApps.set(userId, userApps);
        }
        
        logger.info(`App ${appId} registrada para usuário ${userId}`);
    }

    // Sanitizar displayName para evitar erros da API
    sanitizeDisplayName(displayName) {
        if (!displayName) return 'MyApp';
        
        // Regras específicas da Square Cloud API para Display Name:
        // - Apenas letras, números e espaços
        // - Não pode começar ou terminar com espaço
        // - Mínimo 1 caractere, máximo 30 caracteres
        // - Não pode conter caracteres especiais
        let sanitized = displayName
            .trim()
            // Remover TODOS os caracteres especiais, manter apenas letras, números e espaços
            .replace(/[^a-zA-Z0-9\s]/g, '')
            // Substituir múltiplos espaços por um único espaço
            .replace(/\s+/g, ' ')
            // Remover espaços no início e fim
            .trim();
        
        // Se ficou vazio ou muito pequeno, usar nome padrão
        if (!sanitized || sanitized.length < 1) {
            sanitized = `MyApp${Date.now().toString().slice(-4)}`;
        }
        
        // Limitar a 30 caracteres (limite real da Square Cloud)
        if (sanitized.length > 30) {
            sanitized = sanitized.substring(0, 30).trim();
        }
        
        // Verificação final: se ainda está vazio ou inválido
        if (!sanitized || sanitized.length < 1) {
            sanitized = `App${Date.now().toString().slice(-6)}`;
        }
        
        logger.info(`Display Name sanitizado: "${displayName}" -> "${sanitized}"`);
        return sanitized;
    }

    // Validar se a API key está configurada
    isConfigured() {
        return this.apiKey && 
               this.apiKey !== 'sua_api_key_square_cloud' && 
               this.apiKey !== 'SQUARECLOUD_API_KEY' &&
               this.apiKey.length > 10;
    }

    // Método para testar a conexão com a API
    async testConnection() {
        try {
            if (!this.api) {
                return { success: false, message: 'API não inicializada' };
            }

            const user = await this.api.user.get();
            return { 
                success: true, 
                message: 'Conexão com Square Cloud API estabelecida com sucesso',
                user: user.username || 'Usuário'
            };
        } catch (error) {
            logger.error('Erro ao testar conexão:', error);
            return { 
                success: false, 
                message: `Erro na conexão: ${error.message}` 
            };
        }
    }
}

module.exports = new SquareCloudManager();