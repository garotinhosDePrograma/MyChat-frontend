// Funções para comunicação com a API
const API = {
    // Fazer requisição HTTP
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_URL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // Adicionar token se existir
        const token = Storage.getToken();
        if (token) {
            defaultOptions.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Erro na requisição');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // Auth
    async register(name, email, password) {
        return await this.request(CONFIG.ENDPOINTS.REGISTER, {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
    },
    
    async login(email, password) {
        return await this.request(CONFIG.ENDPOINTS.LOGIN, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },
    
    async getMe() {
        return await this.request(CONFIG.ENDPOINTS.ME);
    },
    
    async verifyToken() {
        return await this.request(CONFIG.ENDPOINTS.VERIFY);
    },
    
    // Contacts
    async getContacts() {
        return await this.request(CONFIG.ENDPOINTS.CONTACTS);
    },
    
    async addContact(contactUserId, contactName = null) {
        return await this.request(CONFIG.ENDPOINTS.ADD_CONTACT, {
            method: 'POST',
            body: JSON.stringify({ 
                contact_user_id: contactUserId,
                contact_name: contactName 
            })
        });
    },
    
    async updateContact(contactId, contactName) {
        return await this.request(CONFIG.ENDPOINTS.UPDATE_CONTACT(contactId), {
            method: 'PUT',
            body: JSON.stringify({ contact_name: contactName })
        });
    },
    
    async deleteContact(contactId) {
        return await this.request(CONFIG.ENDPOINTS.DELETE_CONTACT(contactId), {
            method: 'DELETE'
        });
    },
    
    async searchUsers(query) {
        return await this.request(`${CONFIG.ENDPOINTS.SEARCH_USERS}?q=${encodeURIComponent(query)}`);
    },
    
    // Messages
    async sendMessage(receiverId, content) {
        return await this.request(CONFIG.ENDPOINTS.SEND_MESSAGE, {
            method: 'POST',
            body: JSON.stringify({ 
                receiver_id: receiverId,
                content 
            })
        });
    },
    
    async getConversation(userId, limit = 50) {
        return await this.request(`${CONFIG.ENDPOINTS.GET_CONVERSATION(userId)}?limit=${limit}`);
    },
    
    async markAsRead(senderId) {
        return await this.request(CONFIG.ENDPOINTS.MARK_READ(senderId), {
            method: 'PUT'
        });
    },
    
    async getUnreadMessages() {
        return await this.request(CONFIG.ENDPOINTS.UNREAD);
    },
    
    async deleteMessage(messageId) {
        return await this.request(CONFIG.ENDPOINTS.DELETE_MESSAGE(messageId), {
            method: 'DELETE'
        });
    },
    
    async deleteConversation(userId) {
        return await this.request(CONFIG.ENDPOINTS.DELETE_CONVERSATION(userId), {
            method: 'DELETE'
        });
    }
};