// Socket Manager - VERSÃO CORRIGIDA (confirmação de mensagens)
class SocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.currentConversation = null;
        this.typingTimeout = null;
        this.eventHandlers = {};
        this.pendingConfirmations = new Map(); // ✅ Rastrear mensagens aguardando confirmação
    }

    connect(token) {
        if (this.socket && this.connected) {
            console.log('✅ Já conectado ao WebSocket');
            return;
        }

        if (typeof io === 'undefined') {
            console.error('❌ Socket.IO não está carregado!');
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Erro: Socket.IO não carregado', 'error');
            }
            return;
        }

        console.log('🔌 Conectando ao WebSocket...', CONFIG.API_URL);

        this.socket = io(CONFIG.API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            timeout: 10000 // ✅ Timeout de 10 segundos
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        // ========== EVENTOS DE CONEXÃO ==========
        this.socket.on('connect', () => {
            console.log('✅ CONECTADO ao WebSocket!');
            this.connected = true;
            
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Conectado ao chat em tempo real', 'success', 2000);
            }
            
            if (this.currentConversation) {
                this.joinConversation(this.currentConversation);
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 DESCONECTADO do WebSocket. Motivo:', reason);
            this.connected = false;
            
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Desconectado do servidor', 'warning');
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ ERRO de conexão:', error);
            
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Erro ao conectar ao chat', 'error');
            }
        });

        // ========== NOVA MENSAGEM RECEBIDA ==========
        this.socket.on('new_message', (data) => {
            console.log('💬 ===== NOVA MENSAGEM RECEBIDA =====');
            console.log('Dados completos:', data);
            console.log('Sender ID:', data.sender_id);
            console.log('Receiver ID:', data.receiver_id);
            console.log('Conteúdo:', data.content);
            console.log('====================================');
            
            this.emit('newMessage', data);
        });

        // ========== CONFIRMAÇÃO DE MENSAGEM ENVIADA ==========
        this.socket.on('message_sent', (data) => {
            console.log('✅ ===== MENSAGEM CONFIRMADA =====');
            console.log('Dados:', data);
            console.log('Temp ID:', data.temp_id);
            console.log('Message ID real:', data.message?.id);
            console.log('=================================');
            
            // ✅ Resolver promessa pendente se existir
            if (data.temp_id && this.pendingConfirmations.has(data.temp_id)) {
                const pending = this.pendingConfirmations.get(data.temp_id);

                clearTimeout(pending.timeout);
                pending.resolve(data.message);
                this.pendingConfirmations.delete(data.temp_id); // Limpar Map

                console.log(`Confirmação event processada: ${data.temp_id}`);
            }
            
            // Emitir evento para dashboard
            this.emit('messageConfirmed', data);
        });

        // ========== FALLBACK: message_confirmed (nome antigo) ==========
        this.socket.on('message_confirmed', (data) => {
            console.log('✅ message_confirmed (fallback):', data);
            
            if (data.temp_id && this.pendingConfirmations.has(data.temp_id)) {
                const { resolve } = this.pendingConfirmations.get(data.temp_id);
                resolve(data.message);
                this.pendingConfirmations.delete(data.temp_id);
            }
            
            this.emit('messageConfirmed', data);
        });

        // Notificação de mensagem
        this.socket.on('message_notification', (data) => {
            console.log('🔔 NOTIFICAÇÃO de mensagem:', data);
            this.emit('messageNotification', data);
        });

        // Status da mensagem
        this.socket.on('message_status_update', (data) => {
            console.log('📨 STATUS da mensagem:', data);
            this.emit('messageStatusUpdate', data);
        });

        // Usuário digitando
        this.socket.on('user_typing', (data) => {
            console.log('⌨️ Usuário DIGITANDO:', data);
            this.emit('userTyping', data);
        });

        this.socket.on('user_stopped_typing', (data) => {
            console.log('⌨️ Usuário PAROU de digitar:', data);
            this.emit('userStoppedTyping', data);
        });

        // Status online/offline
        this.socket.on('user_online', (data) => {
            console.log('🟢 Usuário ONLINE:', data);
            this.emit('userOnline', data);
        });

        this.socket.on('user_offline', (data) => {
            console.log('⚫ Usuário OFFLINE:', data);
            this.emit('userOffline', data);
        });

        // Mensagens lidas
        this.socket.on('messages_read', (data) => {
            console.log('✓✓ Mensagens LIDAS:', data);
            this.emit('messagesRead', data);
        });

        // Erro do servidor
        this.socket.on('error', (data) => {
            console.error('❌ ERRO do servidor:', data);
            
            // ✅ Rejeitar promessas pendentes em caso de erro
            if (data.temp_id && this.pendingConfirmations.has(data.temp_id)) {
                const { reject } = this.pendingConfirmations.get(data.temp_id);
                reject(new Error(data.message || 'Erro ao enviar mensagem'));
                this.pendingConfirmations.delete(data.temp_id);
            }
            
            if (typeof Utils !== 'undefined') {
                Utils.showToast(data.message || 'Erro no servidor', 'error');
            }
        });

        console.log('✅ Event listeners configurados!');
    }

    joinConversation(contactUserId) {
        if (!this.connected) {
            console.warn('⚠️ Não conectado ao WebSocket');
            return;
        }

        if (this.currentConversation && this.currentConversation !== contactUserId) {
            this.leaveConversation(this.currentConversation);
        }

        this.currentConversation = contactUserId;
        this.socket.emit('join_conversation', { 
            contact_user_id: contactUserId 
        });

        console.log(`👥 Entrou na conversa com usuário ${contactUserId}`);
    }

    leaveConversation(contactUserId) {
        if (!this.connected) return;

        this.socket.emit('leave_conversation', { 
            contact_user_id: contactUserId 
        });

        if (this.currentConversation === contactUserId) {
            this.currentConversation = null;
        }

        console.log(`👥 Saiu da conversa com usuário ${contactUserId}`);
    }

    // ✅ MÉTODO CORRIGIDO: Timeout limpa pendingConfirmations
    sendMessage(receiverId, content, tempId = null) {
        if (!this.connected) {
            console.warn('⚠️ Não conectado ao WebSocket');
            return Promise.reject(new Error('WebSocket não conectado'));
        }
        
        const finalTempId = tempId || `temp_${Date.now()}_${Math.random()}`;
        
        const payload = {
            receiver_id: receiverId,
            content: content,
            temp_id: finalTempId
        };
        
        console.log('📤 ENVIANDO mensagem via WebSocket:', payload);
        
        return new Promise((resolve, reject) => {
            // ✅ Timeout que LIMPA o Map
            const timeout = setTimeout(() => {
                if (this.pendingConfirmations.has(finalTempId)) {
                    console.error(`❌ TIMEOUT WebSocket (temp_id: ${finalTempId})`);
                    this.pendingConfirmations.delete(finalTempId); // ✅ FIX: Limpar
                    reject(new Error('Timeout ao enviar via WebSocket'));
                }
            }, 5000); // ✅ Reduzido para 5s

            // Guardar callbacks
            this.pendingConfirmations.set(finalTempId, { resolve, reject, timeout });

            // Emitir mensagem
            this.socket.emit('send_message', payload, (response) => {
                const pending = this.pendingConfirmations.get(finalTempId);
                if (!pending) {
                    console.warn('⚠️ Confirmação já processada ou timeout');
                    return;
                }

                clearTimeout(pending.timeout); // ✅ Limpar timeout
                this.pendingConfirmations.delete(finalTempId); // ✅ Limpar Map
            
                if (response && response.success && response.message) {
                    console.log('✅ ACK WebSocket:', response);
                    resolve(response.message);
                } else {
                    console.error('❌ Erro no ACK:', response);
                    reject(new Error(response?.message || 'Erro ao enviar'));
                }
            });
        });
    }

    startTyping(contactUserId) {
        if (!this.connected) return;

        this.socket.emit('typing_start', {
            contact_user_id: contactUserId
        });
    }

    stopTyping(contactUserId) {
        if (!this.connected) return;

        this.socket.emit('typing_stop', {
            contact_user_id: contactUserId
        });
    }

    markAsRead(senderId) {
        if (!this.connected) return;

        this.socket.emit('message_read', {
            sender_id: senderId
        });
        
        console.log(`✓ Marcando mensagens de ${senderId} como lidas`);
    }

    disconnect() {
        if (this.socket) {
            // Limpar confirmações pendentes
            this.pendingConfirmations.clear();
            
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
            this.currentConversation = null;
            console.log('🔌 WebSocket desconectado manualmente');
        }
    }

    // Sistema de eventos internos
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
        console.log(`📡 Listener registrado para '${event}'`);
    }

    off(event, handler) {
        if (!this.eventHandlers[event]) return;
        
        const index = this.eventHandlers[event].indexOf(handler);
        if (index > -1) {
            this.eventHandlers[event].splice(index, 1);
            console.log(`📡 Listener removido de '${event}'`);
        }
    }

    emit(event, data) {
        if (!this.eventHandlers[event]) {
            console.log(`⚠️ Nenhum listener para '${event}'`);
            return;
        }
        
        console.log(`📡 Emitindo evento '${event}' para ${this.eventHandlers[event].length} listeners`);
        
        this.eventHandlers[event].forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`❌ Erro no handler de '${event}':`, error);
            }
        });
    }

    getStatus() {
        return {
            connected: this.connected,
            currentConversation: this.currentConversation,
            registeredEvents: Object.keys(this.eventHandlers),
            pendingConfirmations: this.pendingConfirmations.size,
            listenersCount: Object.entries(this.eventHandlers).reduce((acc, [event, handlers]) => {
                acc[event] = handlers.length;
                return acc;
            }, {})
        };
    }
}

// Instância global
const socketManager = new SocketManager();

// Expor no window
window.socketManager = socketManager;

// Debug helper
window.debugSocket = () => {
    console.log('=== DEBUG DO SOCKET ===');
    console.log('Status:', socketManager.getStatus());
    console.log('Socket.IO carregado?', typeof io !== 'undefined');
    console.log('API URL:', CONFIG.API_URL);
    console.log('=====================');
};

console.log('✅ SocketManager carregado! Use window.debugSocket() para debug');
