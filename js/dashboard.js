// Dashboard Logic

// Verificar autenticação
if (!Storage.isAuthenticated()) {
    window.location.href = 'login.html';
}

// Estado global
const state = {
    currentUser: Storage.getUser(),
    contacts: [],
    selectedContact: null,
    messages: [],
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

// Inicialização
async function init() {
    setupEventListeners();
    await loadContacts();
    
    // Auto-refresh de contatos a cada 10 segundos
    setInterval(loadContacts, 10000);
}

// Event Listeners
function setupEventListeners() {
    // Logout
    elements.logoutBtn?.addEventListener('click', handleLogout);
    
    // Menu do usuário
    elements.userMenuBtn?.addEventListener('click', toggleUserMenu);
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', (e) => {
        if (state.userMenuOpen && !e.target.closest('.user-menu')) {
            closeUserMenu();
        }
    });
    
    // Enviar mensagem
    elements.chatForm?.addEventListener('submit', handleSendMessage);
    
    // Auto-resize do textarea
    elements.chatInput?.addEventListener('input', autoResizeTextarea);
    
    // Adicionar contato
    elements.addContactBtn?.addEventListener('click', openAddContactModal);
    elements.closeModal?.addEventListener('click', closeAddContactModal);
    
    // Fechar modal ao clicar fora
    elements.modal?.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            closeAddContactModal();
        }
    });
    
    // Buscar usuários (com debounce)
    elements.searchInput?.addEventListener('input', 
        Utils.debounce(handleSearchUsers, 500)
    );
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
    
    // Adicionar event listeners
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
    
    state.selectedContact = contact;
    renderContacts(); // Re-render para atualizar active state
    loadConversation(contactUserId);
    
    // Mostrar chat area
    if (elements.chatArea) {
        elements.chatArea.style.display = 'flex';
    }
    if (elements.emptyState) {
        elements.emptyState.style.display = 'none';
    }
    
    // Atualizar header do chat
    const chatHeaderName = document.getElementById('chat-header-name');
    if (chatHeaderName) {
        chatHeaderName.textContent = contact.contact_name || contact.user_name;
    }
    
    // Em mobile, esconder sidebar
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar')?.classList.add('hidden');
    }
}

// Carregar conversa
async function loadConversation(contactUserId) {
    try {
        const response = await API.getConversation(contactUserId);
        state.messages = response.data.messages.reverse(); // API retorna DESC, precisamos ASC
        renderMessages();
        
        // Scroll para o final
        setTimeout(() => {
            Utils.scrollToBottom(elements.chatMessages);
        }, 100);
        
    } catch (error) {
        console.error('Erro ao carregar conversa:', error);
        Utils.showToast('Erro ao carregar mensagens', 'error');
    }
}

// Renderizar mensagens
function renderMessages() {
    if (!elements.chatMessages) return;
    
    elements.chatMessages.innerHTML = state.messages.map(msg => {
        const isSent = msg.sender_id === state.currentUser.id;
        return `
            <div class="message ${isSent ? 'sent' : 'received'}">
                <div class="message-bubble">
                    ${Utils.escapeHtml(msg.content)}
                </div>
                <div class="message-time">
                    ${Utils.formatDateTime(msg.created_at)}
                </div>
            </div>
        `;
    }).join('');
}

// Enviar mensagem
async function handleSendMessage(e) {
    e.preventDefault();
    
    if (!state.selectedContact) return;
    
    const content = elements.chatInput.value.trim();
    if (!content) return;
    
    // Desabilitar input
    elements.chatInput.disabled = true;
    
    try {
        await API.sendMessage(state.selectedContact.contact_user_id, content);
        
        // Limpar input
        elements.chatInput.value = '';
        elements.chatInput.style.height = 'auto';
        
        // Recarregar conversa
        await loadConversation(state.selectedContact.contact_user_id);
        
        // Atualizar lista de contatos
        await loadContacts();
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        Utils.showToast('Erro ao enviar mensagem', 'error');
    } finally {
        elements.chatInput.disabled = false;
        elements.chatInput.focus();
    }
}

// Auto-resize textarea
function autoResizeTextarea() {
    const textarea = elements.chatInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Toggle user menu
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

// Logout
function handleLogout() {
    Storage.clear();
    window.location.href = 'index.html';
}

// Modal de adicionar contato
function openAddContactModal() {
    if (elements.modal) {
        elements.modal.classList.remove('hidden');
        elements.searchInput.value = '';
        elements.searchResults.innerHTML = '';
        elements.searchInput.focus();
    }
}

function closeAddContactModal() {
    if (elements.modal) {
        elements.modal.classList.add('hidden');
    }
}

// Buscar usuários
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

// Renderizar resultados da busca
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
            <button class="btn btn-primary btn-sm" onclick="addContact(${user.id}, '${Utils.escapeHtml(user.name)}')">
                Adicionar
            </button>
        </div>
    `).join('');
}

// Adicionar contato
async function addContact(userId, name) {
    try {
        await API.addContact(userId, name);
        Utils.showToast('Contato adicionado com sucesso!', 'success');
        closeAddContactModal();
        await loadContacts();
    } catch (error) {
        console.error('Erro ao adicionar contato:', error);
        Utils.showToast(error.message || 'Erro ao adicionar contato', 'error');
    }
}

// Obter iniciais do nome
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Iniciar
init();