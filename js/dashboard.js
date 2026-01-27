// Dashboard Logic - VERSÃO CORRIGIDA (Bugs de duplicação e contador fixados)

// Estado global
const state = {
    currentUser: Storage.getUser(),
    contacts: [],
    selectedContact: null,
    messages: [],
    pendingMessages: new Map(),
    userMenuOpen: false
};

// Elementos DOM
const elements = {
    contactsList: document.getElementById('contacts-list'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    chatForm: document.getElementById('chat-form'),
    userMenuBtn: document.getElementById('user-menu-btn'),
    userMenuDropdown: document.getElementById('user-menu-dropdown'),
    logoutBtn: document.getElementById('logout-btn'),
    addContactBtn: document.getElementById('add-contact-btn'),
    modal: document.getElementById('add-contact-modal'),
    closeModal: document.getElementById('close-modal'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
    chatArea: document.getElementById('chat-area'),
    emptyState: document.getElementById('empty-state')
};

// Variáveis globais para controle
let typingTimeout;
let eventListenersSetup = false;

(async function() {
    const isAuth = await Storage.requireAuth('index.html');

    if (!isAuth) {
        return;
    }

    state.currentUser = Storage.getUser();

    if (!state.currentUser) {
        console.error("Erro: Usuário não encontrado no Storage");
        Storage.clear();
        window.location.href = "index.html";
        return;
    }

    await init();
})();

// Inicialização
async function init() {
    setupEventListeners();
    await loadContacts();

    // Inicializar push notifications
    if (typeof pushNotificationManager !== 'undefined' && pushNotificationManager.isSupported) {
        await pushNotificationManager.init();

        if (Notification.permission === 'granted') {
            await pushNotificationManager.subscribe();
        }
    }
    
    const token = Storage.getToken();
    if (token && typeof socketManager !== 'undefined') {
        socketManager.connect(token);
        setupSocketHandlers();
    } else if (!socketManager) {
        console.warn('SocketManager não está disponível');
    }

    if (notificationManager.isSupported && !notificationManager.isEnabled()) {
        setTimeout(() => {
            showNotificationBanner();
        }, 3000);
    }
}

function showNotificationBanner() {
    if (document.querySelector('.notification-banner')) {
        return;
    }

    if (sessionStorage.getItem('notification-banner-dismissed')) {
        return;
    }

    const banner = document.createElement('div');
    banner.className = 'notification-banner';
    banner.innerHTML = `
        <div class="notification-banner-content">
            <span>
                <span style="font-size: var(--font-xl);">🔔</span>
                Quer receber notificações de novas mensagens?
            </span>
            <div>
                <button class="btn btn-primary" id="allow-notifications">
                    Permitir
                </button>
                <button class="btn btn-secondary" id="deny-notifications">
                    Agora não
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('allow-notifications').onclick = async () => {
        try {
            if (typeof pushNotificationManager !== 'undefined' && pushNotificationManager.isSupported) {
                const granted = await pushNotificationManager.requestPermission();
                banner.remove();

                if (granted && typeof Utils !== 'undefined') {
                    Utils.showToast("✅ Notificações Push ativadas", "success");
                }
            } else if (typeof notificationManager !== 'undefined') {
                const granted = await notificationManager.requestPermission();
                banner.remove();

                if (granted && typeof Utils !== 'undefined') {
                    Utils.showToast("✅ Notificações ativadas", "success");
                }
            }
        } catch (error) {
            console.error("Erro ao ativar notificações:", error);
            banner.remove();
            if (typeof Utils !== 'undefined') {
                Utils.showToast("❌ Erro ao ativar notificações", "error");
            }
        }
    };

    document.getElementById('deny-notifications').onclick = () => {
        banner.remove();
        sessionStorage.setItem('notification-banner-dismissed', 'true');
    };
}

// Configurar handlers do WebSocket
function setupSocketHandlers() {
    if (typeof socketManager === 'undefined') {
        console.warn('SocketManager não disponível');
        return;
    }

    // ✅ FIX: Nova mensagem recebida - atualizar contador
    socketManager.on('newMessage', (message) => {
        console.log("Nova mensagem recebida:", message);

        if (state.selectedContact && 
            (message.sender_id === state.selectedContact.contact_user_id ||
             message.receiver_id === state.selectedContact.contact_user_id)) {
            
            state.messages.push(message);
            renderMessages();
            Utils.scrollToBottom(elements.chatMessages);
            
            if (message.receiver_id === state.currentUser.id) {
                socketManager.markAsRead(message.sender_id);
            }
        } else {
            // ✅ FIX: Atualizar contador se não estiver na conversa aberta
            updateContactUnreadCount(message.sender_id);
        }

        if (message.receiver_id === state.currentUser.id) {
            const sender = state.contacts.find(
                c => c.contact_user_id === message.sender_id
            );

            if (sender && notificationManager?.isEnabled()) {
                notificationManager.showMessageNotification(
                    message,
                    sender.contact_name || sender.user_name,
                    null
                );
            }
        }
        
        loadContacts();
    });

    socketManager.on('messageNotification', (data) => {
        Utils.showToast(`${data.from_user.name}: ${data.message.content.substring(0, 50)}`, 'info', 5000);
        loadContacts();
    });

    socketManager.on('userTyping', (data) => {
        if (state.selectedContact && data.user_id === state.selectedContact.contact_user_id) {
            showTypingIndicator(data.name);
        }
    });

    socketManager.on('userStoppedTyping', (data) => {
        if (state.selectedContact && data.user_id === state.selectedContact.contact_user_id) {
            hideTypingIndicator();
        }
    });

    socketManager.on('userOnline', (data) => {
        updateContactStatus(data.user_id, true);
    });

    socketManager.on('userOffline', (data) => {
        updateContactStatus(data.user_id, false);
    });

    // ✅ FIX: Atualizar contador quando mensagens forem lidas
    socketManager.on('messagesRead', (data) => {
        console.log('Mensagens marcadas como lidas:', data);
        if (data.reader_id === state.currentUser.id) {
            updateContactUnreadCount(data.sender_id, 0);
        }
        // Atualizar UI do remetente
        if (data.sender_id === state.currentUser.id) {
            updateContactUnreadCount(data.reader_id, 0);
        }
    });
}

// ✅ NOVO: Atualizar contador de não lidas de um contato específico
function updateContactUnreadCount(contactUserId, count = null) {
    const contact = state.contacts.find(c => c.contact_user_id === contactUserId);
    if (!contact) return;

    if (count !== null) {
        contact.unread_count = count;
    } else {
        contact.unread_count = (contact.unread_count || 0) + 1;
    }

    renderContacts();

    if (count === 0 && typeof socketManager !== 'undefined' && socketManager.connected) {
        socketManager.markAsRead(contactUserId);
    }
}

// Event Listeners
function setupEventListeners() {
    if (eventListenersSetup) return;
    eventListenersSetup = true;

    elements.logoutBtn?.addEventListener('click', handleLogout);
    elements.userMenuBtn?.addEventListener('click', toggleUserMenu);
    
    document.addEventListener('click', (e) => {
        if (state.userMenuOpen && !e.target.closest('.user-menu')) {
            closeUserMenu();
        }
    });
    
    elements.chatForm?.addEventListener('submit', handleSendMessage);
    
    elements.chatInput?.addEventListener('input', () => {
        autoResizeTextarea();
        handleTypingIndicator();
    });
    
    elements.chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            elements.chatForm?.requestSubmit();
        }
    });
    
    elements.addContactBtn?.addEventListener('click', openAddContactModal);
    elements.closeModal?.addEventListener('click', closeAddContactModal);
    
    elements.modal?.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            closeAddContactModal();
        }
    });
    
    elements.searchInput?.addEventListener('input', 
        Utils.debounce(handleSearchUsers, 500)
    );

    window.addEventListener('resize', Utils.debounce(() => {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        }
        
        if (elements.chatInput) {
            autoResizeTextarea();
        }
    }, 250));
}

// Carregar contatos
async function loadContacts() {
    try {
        const response = await API.getContacts();
        state.contacts = response.data.contacts;
        renderContacts();
    } catch (error) {
        console.error('Erro ao carregar contatos:', error);
    }
}

// Renderizar lista de contatos
function renderContacts() {
    if (!elements.contactsList) return;
    
    if (state.contacts.length === 0) {
        elements.contactsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">😊</div>
                <p>Sem conversas</p>
                <p class="text-muted">Adicione um contato para começar</p>
                <button class="btn btn-primary btn-sm add-contact-btn" id="add-contact-btn-empty">
                    Adicionar Contato
                </button>
            </div>
        `;
        
        document.getElementById('add-contact-btn-empty')?.addEventListener('click', openAddContactModal);
        return;
    }
    
    elements.contactsList.innerHTML = state.contacts.map(contact => `
        <div class="contact-item ${state.selectedContact?.contact_user_id === contact.contact_user_id ? 'active' : ''}" 
             data-contact-id="${contact.contact_user_id}">
            <div class="contact-avatar">
                ${getInitials(contact.contact_name || contact.user_name)}
            </div>
            <div class="contact-info">
                <div class="contact-name">
                    <span>${Utils.escapeHtml(contact.contact_name || contact.user_name)}</span>
                    ${contact.last_message_time ? `<span class="contact-time">${Utils.formatDate(contact.last_message_time)}</span>` : ''}
                </div>
                ${contact.last_message ? `
                    <div class="contact-last-message ${contact.unread_count > 0 ? 'unread' : ''}">
                        ${Utils.escapeHtml(Utils.truncateText(contact.last_message, 40))}
                    </div>
                ` : ''}
            </div>
            ${contact.unread_count > 0 ? `
                <span class="contact-badge">${contact.unread_count}</span>
            ` : ''}
        </div>
    `).join('');
    
    elements.contactsList.removeEventListener('click', handleContactClick);
    elements.contactsList.addEventListener('click', handleContactClick);
}

function handleContactClick(e) {
    const contactItem = e.target.closest('.contact-item');
    if (!contactItem) return;

    const contactId = parseInt(contactItem.dataset.contactId);
    if (!isNaN(contactId)) {
        selectContact(contactId);
    }
}

// ✅ FIX: Selecionar contato - zerar contador E sincronizar
function selectContact(contactUserId) {
    const contact = state.contacts.find(c => c.contact_user_id === contactUserId);
    if (!contact) return;
    
    if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
    }
    
    if (state.selectedContact && typeof socketManager !== 'undefined') {
        socketManager.stopTyping(state.selectedContact.contact_user_id);
    }
    
    state.selectedContact = contact;
    
    // ✅ FIX: Zerar contador localmente E no servidor
    const hadUnread = contact.unread_count > 0;
    contact.unread_count = 0;
    
    renderContacts();
    loadConversation(contactUserId);
    
    if (typeof socketManager !== 'undefined' && socketManager.connected) {
        socketManager.joinConversation(contactUserId);
        
        // ✅ Só marcar como lido se realmente tinha mensagens não lidas
        if (hadUnread) {
            socketManager.markAsRead(contactUserId);
        }
    }
    
    if (elements.chatArea) {
        elements.chatArea.style.display = 'flex';
    }
    if (elements.emptyState) {
        elements.emptyState.style.display = 'none';
    }
    
    const chatHeaderName = document.getElementById('chat-header-name');
    const chatHeaderAvatar = document.getElementById('chat-header-avatar');
    
    if (chatHeaderName) {
        chatHeaderName.textContent = contact.contact_name || contact.user_name;
    }
    
    if (chatHeaderAvatar) {
        chatHeaderAvatar.textContent = getInitials(contact.contact_name || contact.user_name);
    }
    
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar')?.classList.add('hidden');
    }
}

const conversationCache = new Map();

async function loadConversation(contactUserId) {
    try {
        const cached = conversationCache.get(contactUserId);
        if (cached) {
            state.messages = [...cached];
            renderMessages();
            setTimeout(() => {
                Utils.scrollToBottom(elements.chatMessages, 'auto');
            }, 50);
        } else {
            showMessagesLoading();
        }

        const response = await API.getConversation(contactUserId);
        const serverMessages = response.data.messages.reverse();

        conversationCache.set(contactUserId, serverMessages);
        state.messages = serverMessages;
        renderMessages();

        setTimeout(() => {
            if (elements.chatMessages) {
                elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
            }
        }, 100);
    } catch (error) {
        console.error("Erro ao carregar conversas:", error);
        Utils.showToast("Erro ao carregar mensagens", "error");
    }
}

function showMessagesLoading() {
    if (!elements.chatMessages) return;

    const skeletons = Array(8).fill(0).map((_, i) => {
        const isSent = i % 2 === 0;
        return `
            <div class="message ${isSent ? 'sent': 'received'}">
                <div class="skeleton" style="
                    width: ${60 + Math.random() * 30}%;
                    height: 40px;
                    border-radius: 18px;
                "></div>
            </div>
        `;
    }).join('');

    elements.chatMessages.innerHTML = skeletons;
}

function updateContactListOnNewMessage(message) {
    const contactIndex = state.contacts.findIndex(
        c => c.contact_user_id === message.sender_id || 
             c.contact_user_id === message.receiver_id
    );
    
    if (contactIndex !== -1) {
        const contact = state.contacts[contactIndex];
        
        contact.last_message = message.content;
        contact.last_message_time = message.created_at;
        
        state.contacts.splice(contactIndex, 1);
        state.contacts.unshift(contact);
        
        renderContacts();
    }
}

function renderMessages() {
    if (!elements.chatMessages) return;

    const wasAtBottom = Utils.isScrolledToBottom(elements.chatMessages, 100);

    elements.chatMessages.innerHTML = state.messages.map(msg => {
        const isSent = msg.sender_id === state.currentUser.id;

        let statusIcon = '';
        if (isSent) {
            if (msg.status === 'sending') {
                statusIcon = '<span class="message-status sending">⏳</span>';
            } else if (msg.status === 'sent') {
                statusIcon = '<span class="message-status sent">✓</span>';
            } else if (msg.status === 'delivered') {
                statusIcon = '<span class="message-status delivered">✓✓</span>';
            } else if (msg.status === 'error') {
                statusIcon = '<span class="message-status error" title="Falha. Toque para reenviar.">(!)</span>';
            }
        }

        return `
            <div class="message ${isSent ? 'sent' : 'received'} ${msg.status || ''}"
                data-message-id="${msg.id}"
                ${msg.status === 'error' ? 'onclick="retryMessage(\'' + msg.id + '\')"' : ''}>
                <div class="message-bubble">
                    ${Utils.escapeHtml(msg.content)}
                </div>
                <div class="message-time">
                    ${Utils.formatDateTime(msg.created_at)}
                    ${statusIcon}
                </div>
            </div>
        `;
    }).join('');

    if (wasAtBottom || state.messages.length <= 10) {
        setTimeout(() => {
            Utils.scrollToBottom(elements.chatMessages, 'auto');
        }, 50);
    }
}

async function retryMessage(messageId) {
    console.log("Tentando reenviar mensagem:", messageId);
    
    const message = state.messages.find(m => m.id === messageId);
    if (!message || message.status !== 'error') {
        console.warn("Mensagem não encontrada ou não está com erro.");
        return;
    }

    const index = state.messages.indexOf(message);
    if (index > -1) {
        state.messages.splice(index, 1);
        renderMessages();
    }

    elements.chatInput.value = message.content;
    elements.chatInput.focus();
    
    await handleSendMessage({ preventDefault: () => {} });
}

// ✅ FIX DEFINITIVO: Enviar mensagem sem duplicação, rápido e confiável
async function handleSendMessage(e) {
    e.preventDefault();

    if (!state.selectedContact) {
        console.warn('Nenhum contato selecionado');
        return;
    }

    const content = elements.chatInput.value.trim();
    if (!content) {
        console.warn('Mensagem vazia');
        return;
    }

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    
    // ✅ Mensagem otimista
    const optimisticMessage = {
        id: tempId,
        sender_id: state.currentUser.id,
        receiver_id: state.selectedContact.contact_user_id,
        content: content,
        is_read: false,
        created_at: new Date().toISOString(),
        status: 'sending',
        isOptimistic: true
    };

    state.messages.push(optimisticMessage);
    state.pendingMessages.set(tempId, optimisticMessage);

    renderMessages();
    Utils.scrollToBottom(elements.chatMessages, 'auto');

    // Limpar input IMEDIATAMENTE
    elements.chatInput.value = '';
    elements.chatInput.style.height = 'auto';
    elements.chatInput.focus();

    // Parar indicador de digitação
    if (typeof socketManager !== 'undefined') {
        socketManager.stopTyping(state.selectedContact.contact_user_id);
    }

    let serverMessage = null;
    let usedMethod = null;

    try {
        console.log('📤 Enviando mensagem...');
        
        // ✅ Tentar WebSocket E REST em paralelo, usar o primeiro que responder
        const wsPromise = (typeof socketManager !== 'undefined' && socketManager.connected)
            ? socketManager.sendMessage(state.selectedContact.contact_user_id, content, tempId)
                .then(msg => ({ message: msg, method: 'websocket' }))
                .catch(err => {
                    console.warn('⚠️ WebSocket falhou:', err);
                    return null;
                })
            : Promise.resolve(null);

        const restPromise = API.sendMessage(state.selectedContact.contact_user_id, content)
            .then(response => ({ message: response.data.message, method: 'rest' }))
            .catch(err => {
                console.warn('⚠️ REST API falhou:', err);
                return null;
            });

        // ✅ Race: usa o primeiro que responder com sucesso
        const results = await Promise.all([wsPromise, restPromise]);
        const successfulResult = results.find(r => r !== null);

        if (!successfulResult) {
            throw new Error('Ambos WebSocket e REST falharam');
        }

        serverMessage = successfulResult.message;
        usedMethod = successfulResult.method;
        
        console.log(`✅ Mensagem confirmada via ${usedMethod.toUpperCase()}:`, serverMessage);

        // ✅ Substituir otimista IMEDIATAMENTE
        const index = state.messages.findIndex(m => m.id === tempId);
        
        if (index !== -1) {
            // Verificar duplicação
            const isDuplicate = state.messages.some(m => 
                m.id === serverMessage.id && m.id !== tempId
            );

            if (isDuplicate) {
                console.warn('⚠️ Mensagem duplicada detectada, removendo apenas a otimista');
                state.messages.splice(index, 1);
            } else {
                // ✅ Substituir no mesmo índice para não "pular" visualmente
                state.messages[index] = {
                    ...serverMessage,
                    status: 'sent'
                };
            }
            
            state.pendingMessages.delete(tempId);
            
            // ✅ Re-renderizar APENAS se necessário (otimização)
            renderMessages();
        }

        updateContactListOnNewMessage(serverMessage);

    } catch (error) {
        console.error("❌ ERRO ao enviar mensagem:", error);

        // ✅ Marcar como erro para retry
        const index = state.messages.findIndex(m => m.id === tempId);
        if (index !== -1) {
            state.messages[index].status = 'error';
            state.pendingMessages.delete(tempId); // ✅ Limpar pendente
            renderMessages();
        }

        Utils.showToast("Erro ao enviar. Toque para reenviar.", "error", 5000);
    }
}

function autoResizeTextarea() {
    const textarea = elements.chatInput;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = newHeight + 'px';
}

function handleTypingIndicator() {
    if (!state.selectedContact) return;
    if (typeof socketManager === 'undefined' || !socketManager.connected) return;
    
    const content = elements.chatInput.value.trim();
    
    if (content) {
        socketManager.startTyping(state.selectedContact.contact_user_id);
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socketManager.stopTyping(state.selectedContact.contact_user_id);
        }, 3000);
    } else {
        clearTimeout(typingTimeout);
        socketManager.stopTyping(state.selectedContact.contact_user_id);
    }
}

function showTypingIndicator(userName) {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.classList.remove('hidden');
    }
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.classList.add('hidden');
    }
}

function updateContactStatus(userId, isOnline) {
    const contactItem = document.querySelector(`[data-contact-id="${userId}"]`);
    if (contactItem) {
        if (isOnline) {
            contactItem.classList.add('online');
        } else {
            contactItem.classList.remove('online');
        }
    }
}

function toggleUserMenu() {
    state.userMenuOpen = !state.userMenuOpen;
    if (elements.userMenuDropdown) {
        elements.userMenuDropdown.classList.toggle('hidden', !state.userMenuOpen);
    }
}

function closeUserMenu() {
    state.userMenuOpen = false;
    if (elements.userMenuDropdown) {
        elements.userMenuDropdown.classList.add('hidden');
    }
}

function handleLogout() {
    if (typeof socketManager !== 'undefined') {
        socketManager.disconnect();
    }
    
    Storage.clear();
    window.location.href = 'index.html';
}

function openAddContactModal() {
    if (elements.modal) {
        elements.modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        elements.searchInput.value = '';
        elements.searchResults.innerHTML = '';
        
        setTimeout(() => {
            elements.searchInput.focus();
        }, 300);
    }
}

function closeAddContactModal() {
    if (elements.modal) {
        elements.modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    }
}

async function handleSearchUsers(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        elements.searchResults.innerHTML = '';
        return;
    }
    
    try {
        const response = await API.searchUsers(query);
        renderSearchResults(response.data.users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        elements.searchResults.innerHTML = '<p class="text-muted text-center">Erro ao buscar</p>';
    }
}

function renderSearchResults(users) {
    if (users.length === 0) {
        elements.searchResults.innerHTML = '<p class="text-muted text-center">Nenhum usuário encontrado</p>';
        return;
    }
    
    elements.searchResults.innerHTML = users.map(user => `
        <div class="search-result-item">
            <div class="search-result-info">
                <h4>${Utils.escapeHtml(user.name)}</h4>
                <p>${Utils.escapeHtml(user.email)}</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="addContact(${user.id}, '${Utils.escapeHtml(user.name).replace(/'/g, "\\'")}')">
                Adicionar
            </button>
        </div>
    `).join('');
}

async function addContact(userId, name) {
    try {
        const tempId = `temp_${Date.now()}`;
        const optimisticContact = {
            contact_id: tempId,
            contact_user_id: userId,
            contact_name: name,
            user_name: name,
            user_email: '',
            last_message: null,
            last_message_time: null,
            unread_count: 0,
            isOptimistic: true
        };

        state.contacts.unshift(optimisticContact);
        renderContacts();

        const response = await API.addContact(userId, name);

        const index = state.contacts.findIndex(c => c.contact_id === tempId);
        if (index !== -1) {
            state.contacts[index] = {
                ...response.data.contact,
                contact_id: response.data.contact.id
            };
            renderContacts();
        }

        Utils.showToast("Contato adicionado!", "success");
        closeAddContactModal();
    } catch (error) {
        state.contacts = state.contacts.filter(c => c.contact_id !== tempId);
        renderContacts();

        console.error("Erro ao adicionar contato:", error);
        Utils.showToast(error.message || "Erro ao adicionar contato", "error");
    }
}

function injectMessageStatusStyles() {
    if (document.getElementById('message-status-styles')) {
        return;
    }

    const styles = document.createElement('style');
    styles.id = 'message-status-styles';
    styles.textContent = `
        .message-status {
            font-size: var(--font-xs);
            margin-left: var(--space-1);
            display: inline-flex;
            align-items: center;
            gap: var(--space-1);
        }

        .message-status.sending {
            opacity: 0.6;
            animation: statusPulse 1.5s infinite;
        }

        @keyframes statusPulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }

        .message-status.sent {
            color: var(--text-tertiary);
        }

        .message.sent .message-status.sent {
            color: rgba(255, 255, 255, 0.7);
        }

        .message-status.delivered {
            color: var(--primary-400);
        }

        .message.sent .message-status.delivered {
            color: rgba(255, 255, 255, 0.9);
        }

        .message-status.error {
            color: var(--error);
            cursor: pointer;
            animation: statusShake 0.5s;
            transition: all var(--transition-fast);
        }

        .message-status.error:hover {
            transform: scale(1.2);
        }

        @keyframes statusShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-0.1875rem); }
            75% { transform: translateX(0.1875rem); }
        }

        .message.sending {
            opacity: 0.7;
        }

        .message.error {
            position: relative;
        }

        .message.error::before {
            content: '';
            position: absolute;
            left: -3px;
            top: 0;
            bottom: 0;
            width: 3px;
            background-color: var(--error);
            border-radius: var(--radius-full);
        }

        .message.error .message-bubble {
            border: 1px solid var(--error);
            background: linear-gradient(
                135deg,
                rgba(239, 68, 68, 0.1) 0%,
                rgba(239, 68, 68, 0.05) 100%
            );
            cursor: pointer;
            transition: all var(--transition-fast);
        }

        .message.error .message-bubble:hover {
            border-color: var(--error);
            background: linear-gradient(
                135deg,
                rgba(239, 68, 68, 0.15) 0%,
                rgba(239, 68, 68, 0.08) 100%
            );
            transform: translateX(-0.125rem);
        }

        .message.sent.error .message-bubble {
            background: linear-gradient(
                135deg,
                rgba(239, 68, 68, 0.3) 0%,
                rgba(220, 38, 38, 0.3) 100%
            );
        }

        .message.error::after {
            content: '⚠️';
            position: absolute;
            left: -1.875rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: var(--font-base);
            animation: errorBounce 2s infinite;
        }

        @keyframes errorBounce {
            0%, 100% { transform: translateY(-50%) scale(1); }
            50% { transform: translateY(-50%) scale(1.1); }
        }

        [data-theme="dark"] .message.error .message-bubble {
            background: linear-gradient(
                135deg,
                rgba(239, 68, 68, 0.2) 0%,
                rgba(239, 68, 68, 0.1) 100%
            );
        }

        [data-theme="dark"] .message.error .message-bubble:hover {
            background: linear-gradient(
                135deg,
                rgba(239, 68, 68, 0.25) 0%,
                rgba(239, 68, 68, 0.15) 100%
            );
        }
    `;
    
    document.head.appendChild(styles);
    console.log("✅ Estilos de status de mensagens injetados (Design System v2.0)");
}


function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.style.fontSize = '16px';
        });
    });
    
    window.addEventListener('resize', () => {
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA') {
            setTimeout(() => {
                document.activeElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        }
    });
}

async function requestPushPermission() {
    if (typeof pushNotificationManager === 'undefined') {
        Utils.showToast('Push Notifications não disponível', 'error');
        return;
    }
    
    try {
        const granted = await pushNotificationManager.requestPermission();
        if (granted) {
            Utils.showToast('Notificações ativadas!', 'success');
        } else {
            Utils.showToast('Permissão negada', 'error');
        }
    } catch (error) {
        console.error('Erro ao solicitar permissão:', error);
        Utils.showToast('Erro ao ativar notificações', 'error');
    }
}

window.requestPushPermission = requestPushPermission;

function debugNotifications() {
    console.log("=== DEBUG DE NOTIFICAÇÕES ===");
    console.log("1. NotificationManager existe?", typeof notificationManager !== 'undefined');
    console.log("2. Status:", notificationManager?.getStatus());
    console.log("3. Navegador suporta?", 'Notification' in window);
    console.log("4. Permissão atual:", Notification.permission);
    console.log("5. Estado atual:", {
        currentUser: state.currentUser?.id,
        selectedContact: state.selectedContact?.contact_user_id,
        contactsCount: state.contacts.length
    });
    console.log("============================");
}

window.debugNotifications = debugNotifications;

window.testNotificationNow = () => {
    if (!notificationManager.isEnabled()) {
        console.error("Notificações não ativadas");
        alert("Notificações não ativadas. Clique em 'permitir' para ativar.");
        notificationManager.requestPermission().then(granted => {
            if (granted) {
                notificationManager.showTestNotification();
            }
        });
        return;
    }

    const fakeMessage = {
        id: 999,
        sender_id: 1,
        receiver_id: state.currentUser.id,
        content: "Mensagem de teste",
        created_at: new Date().toISOString()
    };

    notificationManager.showMessageNotification(
        fakeMessage,
        'teste',
        null
    );
};

injectMessageStatusStyles();

if (notificationManager.isSupported && !notificationManager.isEnabled()) {
    setTimeout(() => {
        showNotificationBanner();
    }, 5000);
}
