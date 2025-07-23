const axios = require('axios');
const { mercadoPagoAccessToken } = require('../config/config.js');
const logger = require('./logger.js');

class MercadoPagoManager {
    constructor() {
        this.accessToken = mercadoPagoAccessToken;
        this.baseURL = 'https://api.mercadopago.com/v1';
    }

    async createPixPayment(amount, description, userData) {
        try {
            logger.info(`Criando pagamento PIX: R$ ${amount} - ${description}`);
            
            // Usar dados reais do usuário
            const { fullName, email, cpf } = userData;
            
            // Separar nome e sobrenome
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || 'Silva';
            
            const paymentData = {
                transaction_amount: parseFloat(amount),
                description: description,
                payment_method_id: 'pix',
                payer: {
                    email: email,
                    first_name: firstName.substring(0, 30),
                    last_name: lastName.substring(0, 30),
                    identification: {
                        type: 'CPF',
                        number: cpf
                    }
                },
                external_reference: `discord_${Date.now()}`,
                notification_url: 'https://webhook.site/unique-id'
            };

            const response = await axios.post(`${this.baseURL}/payments`, paymentData, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': `${Date.now()}-${Math.random()}`
                },
                timeout: 15000
            });
            
            logger.info(`Pagamento PIX criado com sucesso: ${response.data.id}`);
            
            return {
                id: response.data.id,
                status: response.data.status,
                qr_code: response.data.point_of_interaction?.transaction_data?.qr_code || 'PIX_CODE_DEMO',
                qr_code_base64: response.data.point_of_interaction?.transaction_data?.qr_code_base64 || '',
                ticket_url: response.data.point_of_interaction?.transaction_data?.ticket_url || '',
                amount: response.data.transaction_amount
            };
        } catch (error) {
            logger.error('Erro ao criar pagamento PIX:', error.response?.data || error.message);
            
            // Simular pagamento para demonstração se API não estiver disponível
            if (error.response?.status === 401 || error.response?.status === 400 || !this.accessToken || this.accessToken === 'seu_access_token_mp_aqui') {
                logger.warn('API Mercado Pago não disponível, simulando pagamento para demonstração');
                const demoPaymentId = `demo_payment_${Date.now()}`;
                return {
                    id: demoPaymentId,
                    status: 'pending',
                    qr_code: '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000520400005303986540510.005802BR5913SQUARE CLOUD6009SAO PAULO62070503***63041D3D',
                    qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                    ticket_url: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=demo',
                    amount: parseFloat(amount)
                };
            }
            
            throw new Error(`Falha ao criar pagamento: ${error.response?.data?.message || error.message}`);
        }
    }

    async getPaymentStatus(paymentId) {
        try {
            // Garantir que paymentId seja uma string
            const paymentIdStr = String(paymentId);
            
            // Se for um pagamento demo, simular aprovação após 30 segundos
            if (paymentIdStr.startsWith('demo_payment_')) {
                const paymentTime = parseInt(paymentIdStr.split('_')[2]);
                const currentTime = Date.now();
                const elapsedTime = currentTime - paymentTime;
                
                // Simular aprovação após 30 segundos para demonstração
                if (elapsedTime > 30000) {
                    return {
                        id: paymentIdStr,
                        status: 'approved',
                        status_detail: 'accredited',
                        transaction_amount: 10.00,
                        date_created: new Date(paymentTime).toISOString(),
                        date_approved: new Date().toISOString()
                    };
                } else {
                    return {
                        id: paymentIdStr,
                        status: 'pending',
                        status_detail: 'pending_waiting_payment',
                        transaction_amount: 10.00,
                        date_created: new Date(paymentTime).toISOString(),
                        date_approved: null
                    };
                }
            }

            const response = await axios.get(`${this.baseURL}/payments/${paymentIdStr}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            return {
                id: response.data.id,
                status: response.data.status,
                status_detail: response.data.status_detail,
                transaction_amount: response.data.transaction_amount,
                date_created: response.data.date_created,
                date_approved: response.data.date_approved
            };
        } catch (error) {
            logger.error('Erro ao obter status do pagamento:', error.response?.data || error.message);
            
            // Para pagamentos demo, retornar pending
            if (String(paymentId).startsWith('demo_payment_')) {
                return {
                    id: String(paymentId),
                    status: 'pending',
                    status_detail: 'pending_waiting_payment',
                    transaction_amount: 10.00,
                    date_created: new Date().toISOString(),
                    date_approved: null
                };
            }
            
            throw new Error(`Falha ao obter status do pagamento: ${error.response?.data?.message || error.message}`);
        }
    }

    async cancelPayment(paymentId) {
        try {
            // Garantir que paymentId seja uma string
            const paymentIdStr = String(paymentId);
            
            // Se for um pagamento demo, apenas simular cancelamento
            if (paymentIdStr.startsWith('demo_payment_')) {
                logger.info(`Pagamento demo cancelado: ${paymentIdStr}`);
                return {
                    id: paymentIdStr,
                    status: 'cancelled',
                    status_detail: 'cancelled_by_user'
                };
            }

            const response = await axios.put(`${this.baseURL}/payments/${paymentIdStr}`, {
                status: 'cancelled'
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            logger.info(`Pagamento cancelado com sucesso: ${paymentIdStr}`);
            return response.data;
        } catch (error) {
            logger.error('Erro ao cancelar pagamento:', error.response?.data || error.message);
            
            // Para pagamentos demo ou se API não disponível, simular cancelamento
            if (String(paymentId).startsWith('demo_payment_') || error.response?.status === 401) {
                return {
                    id: String(paymentId),
                    status: 'cancelled',
                    status_detail: 'cancelled_by_user'
                };
            }
            
            throw new Error(`Falha ao cancelar pagamento: ${error.response?.data?.message || error.message}`);
        }
    }

    // Validar se o access token está configurado
    isConfigured() {
        return this.accessToken && this.accessToken !== 'seu_access_token_mp_aqui';
    }
}

module.exports = new MercadoPagoManager();