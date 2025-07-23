const mercadoPago = require('./mercadopago.js');
const logger = require('./logger.js');
const { payment } = require('../config/config.js');

class PaymentPoller {
    constructor() {
        this.activePolls = new Map();
        this.ticketChannels = new Map(); // Mapear pagamentos para canais de ticket
    }

    async startPolling(paymentId, userId, interaction, onSuccess, onTimeout) {
        // Garantir que paymentId seja uma string
        const paymentIdStr = String(paymentId);
        const pollKey = `${paymentIdStr}-${userId}`;
        
        if (this.activePolls.has(pollKey)) {
            logger.warn(`Polling já ativo para: ${pollKey}`);
            return;
        }

        // Armazenar referência do canal do ticket
        if (interaction.channel && interaction.channel.name.startsWith('square-')) {
            this.ticketChannels.set(pollKey, interaction.channel.id);
        }

        logger.info(`Iniciando polling para pagamento: ${paymentIdStr}`);
        
        const startTime = Date.now();
        const timeoutMs = payment.timeoutMinutes * 60 * 1000;
        
        const pollInterval = setInterval(async () => {
            try {
                // Verificar se o canal do ticket ainda existe
                if (this.ticketChannels.has(pollKey)) {
                    const channelId = this.ticketChannels.get(pollKey);
                    const channel = interaction.client.channels.cache.get(channelId);
                    
                    if (!channel) {
                        // Canal foi deletado, cancelar polling
                        clearInterval(pollInterval);
                        this.activePolls.delete(pollKey);
                        this.ticketChannels.delete(pollKey);
                        
                        logger.info(`Polling cancelado - ticket fechado: ${paymentIdStr}`);
                        
                        // Tentar cancelar o pagamento no Mercado Pago
                        try {
                            await mercadoPago.cancelPayment(paymentIdStr);
                        } catch (cancelError) {
                            logger.warn(`Erro ao cancelar pagamento ${paymentIdStr}:`, cancelError.message);
                        }
                        
                        return;
                    }
                }

                const status = await mercadoPago.getPaymentStatus(paymentIdStr);
                
                logger.info(`Status do pagamento ${paymentIdStr}: ${status.status}`);
                
                if (status.status === 'approved') {
                    clearInterval(pollInterval);
                    this.activePolls.delete(pollKey);
                    this.ticketChannels.delete(pollKey);
                    
                    logger.info(`Pagamento aprovado: ${paymentIdStr}`);
                    try {
                        await onSuccess(status);
                    } catch (deployError) {
                        logger.error('Erro durante deploy após pagamento aprovado:', deployError);
                        // O erro será tratado no onSuccess, não precisamos fazer nada aqui
                    }
                    return;
                }
                
                if (status.status === 'rejected' || status.status === 'cancelled') {
                    clearInterval(pollInterval);
                    this.activePolls.delete(pollKey);
                    this.ticketChannels.delete(pollKey);
                    
                    logger.info(`Pagamento rejeitado/cancelado: ${paymentIdStr}`);
                    
                    try {
                        await interaction.editReply({
                            content: '❌ **Pagamento rejeitado ou cancelado**\n\nTente novamente se necessário.',
                            embeds: [],
                            components: []
                        });
                    } catch (editError) {
                        logger.warn(`Erro ao editar resposta (pagamento cancelado): ${editError.message}`);
                    }
                    return;
                }
                
                // Verificar timeout
                if (Date.now() - startTime > timeoutMs) {
                    clearInterval(pollInterval);
                    this.activePolls.delete(pollKey);
                    this.ticketChannels.delete(pollKey);
                    
                    logger.info(`Timeout do pagamento: ${paymentIdStr}`);
                    await onTimeout();
                    return;
                }
                
                // Atualizar embed com tempo restante
                const remainingTime = Math.ceil((timeoutMs - (Date.now() - startTime)) / 1000);
                const minutes = Math.floor(remainingTime / 60);
                const seconds = remainingTime % 60;
                
                try {
                    await interaction.editReply({
                        content: `⏳ **Aguardando pagamento...**\n\n🔄 Verificando automaticamente...\n⏰ Tempo restante: ${minutes}:${seconds.toString().padStart(2, '0')}`
                    });
                } catch (editError) {
                    // Se não conseguir editar (canal deletado), cancelar polling
                    if (editError.code === 10008 || editError.code === 10003) {
                        clearInterval(pollInterval);
                        this.activePolls.delete(pollKey);
                        this.ticketChannels.delete(pollKey);
                        
                        logger.info(`Polling cancelado - canal não encontrado: ${paymentIdStr}`);
                        
                        // Tentar cancelar o pagamento
                        try {
                            await mercadoPago.cancelPayment(paymentIdStr);
                        } catch (cancelError) {
                            logger.warn(`Erro ao cancelar pagamento ${paymentIdStr}:`, cancelError.message);
                        }
                        
                        return;
                    }
                    
                    logger.warn(`Erro ao editar resposta do polling: ${editError.message}`);
                }
                
            } catch (error) {
                logger.error('Erro no polling de pagamento:', error);
                
                if (error.message.includes('payment not found')) {
                    clearInterval(pollInterval);
                    this.activePolls.delete(pollKey);
                    this.ticketChannels.delete(pollKey);
                    
                    try {
                        await interaction.editReply({
                            content: '❌ **Erro:** Pagamento não encontrado.',
                            embeds: [],
                            components: []
                        });
                    } catch (editError) {
                        logger.warn(`Erro ao editar resposta (pagamento não encontrado): ${editError.message}`);
                    }
                }
            }
        }, payment.pollInterval);
        
        this.activePolls.set(pollKey, pollInterval);
    }

    stopPolling(paymentId, userId) {
        const pollKey = `${String(paymentId)}-${userId}`;
        
        if (this.activePolls.has(pollKey)) {
            clearInterval(this.activePolls.get(pollKey));
            this.activePolls.delete(pollKey);
            this.ticketChannels.delete(pollKey);
            logger.info(`Polling interrompido para: ${pollKey}`);
        }
    }

    // Cancelar polling quando ticket for fechado
    cancelPollingForChannel(channelId) {
        for (const [pollKey, storedChannelId] of this.ticketChannels.entries()) {
            if (storedChannelId === channelId) {
                if (this.activePolls.has(pollKey)) {
                    clearInterval(this.activePolls.get(pollKey));
                    this.activePolls.delete(pollKey);
                    this.ticketChannels.delete(pollKey);
                    
                    logger.info(`Polling cancelado para canal fechado: ${channelId}`);
                    
                    // Tentar cancelar o pagamento
                    const paymentId = pollKey.split('-')[0];
                    mercadoPago.cancelPayment(paymentId).catch(error => {
                        logger.warn(`Erro ao cancelar pagamento ${paymentId}:`, error.message);
                    });
                }
            }
        }
    }

    stopAllPolling() {
        for (const [pollKey, interval] of this.activePolls.entries()) {
            clearInterval(interval);
            logger.info(`Polling interrompido para: ${pollKey}`);
        }
        this.activePolls.clear();
        this.ticketChannels.clear();
    }
}

module.exports = new PaymentPoller();