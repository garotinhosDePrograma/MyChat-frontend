// Socket Manager - VERSÃO FINAL CORRIGIDA
class SocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.currentConversation = null;
        this.typingTimeout = null;
        this.eventHandlers = {};
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
            reconnectionAttempts: 5
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

        this.socket.on('disconnect', () => {
            console.log('🔌 DESCONECTADO do WebSocket');
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

        // ========== CORREÇÃO CRÍTICA: ESCUTAR 'new_message' ==========
        this.socket.on('new_message', (data) => {
            console.log('💬 ===== NOVA MENSAGEM RECEBIDA =====');
            console.log('Dados completos:', data);
            console.log('Sender ID:', data.sender_id);
            console.log('Receiver ID:', data.receiver_id);
            console.log('Conteúdo:', data.content);
            console.log('====================================');
            
            // Emitir evento interno 'newMessage' (camelCase) para compatibilidade
            this.emit('newMessage', data);
        });

        // Notificação de mensagem (fallback)
        this.socket.on('message_notification', (data) => {
            console.log('🔔 NOTIFICAÇÃO de mensagem:', data);
            this.emit('messageNotification', data);
        });

        // Confirmação de mensagem enviada
        this.socket.on('message_confirmed', (data) => {
            console.log('✅ MENSAGEM CONFIRMADA:', data);
            this.emit('messageConfirmed', data);
        });

        // Mensagem entregue
        this.socket.on('message_status_update', (data) => {
            console.log('📨 STATUS da mensagem:', data);
            this.emit('messageStatusUpdate', data);
        });

        // Usuário digitando
        this.socket.on('user_typing', (data) => {
            console.log('⌨️ Usuário DIGITANDO:', data);
            this.emit('userTyping', data);
        });

        // Usuário parou de digitar
        this.socket.on('user_stopped_typing', (data) => {
            console.log('⌨️ Usuário PAROU de digitar:', data);
            this.emit('userStoppedTyping', data);
        });

        // Usuário online
        this.socket.on('user_online', (data) => {
            console.log('🟢 Usuário ONLINE:', data);
            this.emit('userOnline', data);
        });

        // Usuário offline
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

    sendMessage(receiverId, content, tempId = null) {
        if (!this.connected) {
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Não conectado. Tentando enviar...', 'warning');
            }
            return false;
        }

        const payload = {
            receiver_id: receiverId,
            content: content
        };

        if (tempId) {
            payload.temp_id = tempId;
        }

        console.log('📤 ENVIANDO mensagem:', payload);
        this.socket.emit('send_message', payload);

        return true;
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

    // Debug helper
    getStatus() {
        return {
            connected: this.connected,
            currentConversation: this.currentConversation,
            registeredEvents: Object.keys(this.eventHandlers),
            listenersCount: Object.entries(this.eventHandlers).reduce((acc, [event, handlers]) => {
                acc[event] = handlers.length;
                return acc;
            }, {})
        };
    }
}

// Instância global
const socketManager = new SocketManager();

// Expor no window para debug
window.socketManager = socketManager;

// Helper de debug
window.debugSocket = () => {
    console.log('=== DEBUG DO SOCKET ===');
    console.log('Status:', socketManager.getStatus());
    console.log('Socket.IO carregado?', typeof io !== 'undefined');
    console.log('API URL:', CONFIG.API_URL);
    console.log('=====================');
};

console.log('✅ SocketManager carregado! Use window.debugSocket() para debug');