// Dashboard Logic - VERSÃO CORRIGIDA (BUGS FIXADOS)

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
    const banner = document.createElement('div');
    banner.className = 'notification-banner';
    banner.innerHTML = `
        <div class="notification-banner-content"
            <span>Quer receber notificações de novas mensagens?</span>
            <div>
                <button class="btn btn-primary btn-sm" id="allow-notifications">Permitir</button>
                <button class="btn btn-secondery btn-sm" id="deny-notifications">Agora não</button>
            </div>
        </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('allow-notifications').onclick = async () => {
        if (typeof pushNotificationManager !== 'undefined' && pushNotificationManager.isSupported) {
            const granted = await pushNotificationManager.requestPermission();
            banner.remove();

            if (granted) {
                Utils.showToast("Notificações Push ativadas", "success");
            }
        } else {
            const granted = await notificationManager.requestPermission();
            banner.remover();

            if (granted) {
                Utils.showToast("Notificações ativadas", "success");
            }
        }
    };

    document.getElementById('deny-notifications').onclick = () => {
        banner.remove();
    };
}

// Configurar handlers do WebSocket
function setupSocketHandlers() {
    if (typeof socketManager === 'undefined') {
        console.warn('SocketManager não disponível');
        return;
    }

    // Nova mensagem recebida
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
            } else {
                console.log("Notificação não mostrada:", {
                    reason: !sender ? "Remetente não encontrado" : "Notificações desativadas"
                });
            }
        }
        
        loadContacts();
    });

    // Notificação de mensagem
    socketManager.on('messageNotification', (data) => {
        Utils.showToast(`${data.from_user.name}: ${data.message.content.substring(0, 50)}`, 'info', 5000);
        loadContacts();
    });

    // Usuário digitando
    socketManager.on('userTyping', (data) => {
        if (state.selectedContact && data.user_id === state.selectedContact.contact_user_id) {
            showTypingIndicator(data.name);
        }
    });

    // Usuário parou de digitar
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
                    <div class="contact-last-message">
                        ${Utils.escapeHtml(Utils.truncateText(contact.last_message, 40))}
                    </div>
                ` : ''}
            </div>
            ${contact.unread_count > 0 ? `
                <span class="contact-badge">${contact.unread_count}</span>
            ` : ''}
        </div>
    `).join('');
    
    document.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', () => {
            const contactId = parseInt(item.dataset.contactId);
            selectContact(contactId);
        });
    });
}

// Selecionar contato
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
    renderContacts();
    loadConversation(contactUserId);
    
    if (typeof socketManager !== 'undefined' && socketManager.connected) {
        socketManager.joinConversation(contactUserId);
        socketManager.markAsRead(contactUserId);
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

// ✅ FIX: Corrigido nome da variável de 'erro' para 'error'
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
    } catch (error) { // ✅ FIX: era 'erro'
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

// ✅ FIX: Corrigido wasAtButton para wasAtBottom
function renderMessages() {
    if (!elements.chatMessages) return;

    const wasAtBottom = Utils.isScrolledToBottom(elements.chatMessages, 100); // ✅ FIX

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

    if (wasAtBottom || state.messages.length <= 10) { // ✅ FIX
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

// ✅ FIX: Corrigido state.message para state.messages

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

    // Limpar input
    elements.chatInput.value = '';
    elements.chatInput.style.height = 'auto';
    elements.chatInput.disabled = false;
    elements.chatInput.focus();

    // Parar indicador de digitação
    if (typeof socketManager !== 'undefined') {
        socketManager.stopTyping(state.selectedContact.contact_user_id);
    }

    let serverMessage = null;

    try {
        console.log('📤 Enviando mensagem...');
        
        // ✅ CORREÇÃO PRINCIPAL: Tentar WebSocket primeiro
        if (typeof socketManager !== 'undefined' && socketManager.connected) {
            console.log('🔌 Usando WebSocket...');
            
            try {
                // ✅ Agora sendMessage retorna Promise
                serverMessage = await socketManager.sendMessage(
                    state.selectedContact.contact_user_id,
                    content,
                    tempId
                );
                
                console.log('✅ Mensagem confirmada via WebSocket:', serverMessage);
            } catch (wsError) {
                console.warn('⚠️ WebSocket falhou, tentando API REST...', wsError);
                serverMessage = null; // Vai cair no fallback abaixo
            }
        }

        if (!serverMessage) {
            console.log('📡 Usando API REST...');
            
            const response = await API.sendMessage(
                state.selectedContact.contact_user_id,
                content
            );
            
            serverMessage = response.data.message;
            console.log('✅ Mensagem confirmada via API REST:', serverMessage);
        }

        // ✅ Atualizar mensagem otimista com dados reais do servidor
        const index = state.messages.findIndex(m => m.id === tempId);
        if (index !== -1) {
            state.messages[index] = {
                ...serverMessage,
                status: 'sent'
            };
            state.pendingMessages.delete(tempId);
            renderMessages();
            
            console.log('✅ Mensagem atualizada na UI');
        }

        updateContactListOnNewMessage(serverMessage);
    } catch (error) {
        console.error("ERRO ao enviar mensagem:", error);

        const index = state.messages.findIndex(m => m.id === tempId);
        if (index !== -1) {
            state.messages[index].status = 'error';
            renderMessages();
        }

        Utils.showToast("Erro ao enviar. Toque para reenviar.", "error", 5000);
    }
}
    
function sendMessageViaWebSocket(receiverId, content, tempId) {
    return new Promise((resolve, reject) => {
        if (!socketManager || !socketManager.connected) {
            reject(new Error('WebSocket não conectado'));
            return;
        }

        const timeout = setTimeout(() => {
            reject(new Error('Timeout ao enviar mensagem'));
        }, 5000);

        const listener = (data) => {
            if (data.temp_id === tempId) {
                clearTimeout(timeout);
                socketManager.off('message_confirmed', listener);
                resolve(data.message);
            }
        };

        socketManager.on('message_confirmed', listener);

        socketManager.socket.emit('send_message', {
            receiver_id: receiverId,
            content: content,
            temp_id: tempId
        });
    });
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

// ✅ FIX: Corrigido data.message para error.message
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
        Utils.showToast(error.message || "Erro ao adicionar contato", "error"); // ✅ FIX: era data.message
    }
}

const statusStyles = `
<style>
.message-status {
    font-size: 12px;
    margin-left: 4px;
}

.message-status.sending {
    opacity: 0.6;
    animation: pulse 1.5s infinite;
}

.message-status.sent {
    color: var(--text-light);
}

.message-status.delivered {
    color: var(--primary-color);
}

.message-status.error {
    color: var(--danger-color);
    cursor: pointer;
    animation: shake 0.5s;
}

.message.sending {
    opacity: 0.7;
}

.message.error {
    border-left: 3px solid var(--danger-color);
    cursor: pointer;
}

@keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}
</style>
`;

if (!document.getElementById('message-status-styles')) {
    const style = document.createElement('style');
    style.id = 'message-status-styles';
    style.textContent = statusStyles;
    document.head.appendChild(style);
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

// Expor globalmente
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
