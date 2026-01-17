// Gerenciamento de armazenamento local - VERSÃO CORRIGIDA
const Storage = {
    // Salvar token
    setToken(token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    },
    
    // Obter token
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    },
    
    // Remover token
    removeToken() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    },
    
    // Salvar dados do usuário
    setUser(user) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    },
    
    // Obter dados do usuário
    getUser() {
        const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        return user ? JSON.parse(user) : null;
    },
    
    // Remover dados do usuário
    removeUser() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    },
    
    // Verificar se está autenticado (VERSÃO CORRIGIDA)
    async isAuthenticated() {
        const token = this.getToken();
        
        // Se não tem token, não está autenticado
        if (!token) {
            return false;
        }
        
        try {
            // CORRIGIDO: Usar CONFIG.ENDPOINTS.VERIFY
            const response = await fetch(`${CONFIG.API_URL}${CONFIG.ENDPOINTS.VERIFY}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                console.log('✅ Token válido');
                return true;
            } else {
                console.error('❌ Token inválido:', data.message || 'Token inválido');
                // Limpar dados inválidos
                this.clear();
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao verificar autenticação:', error);
            // Em caso de erro de rede, considerar ainda autenticado
            // (o token pode ser válido, só está sem conexão)
            return true;
        }
    },
    
    // Verificar e redirecionar se necessário (helper para páginas protegidas)
    async requireAuth(redirectTo = 'index.html') {
        const isAuth = await this.isAuthenticated();
        
        if (!isAuth) {
            console.log('🔒 Não autenticado, redirecionando...');
            window.location.href = redirectTo;
            return false;
        }
        
        return true;
    },
    
    // Verificar e redirecionar se JÁ estiver autenticado (para login/register)
    async redirectIfAuthenticated(redirectTo = 'dashboard.html') {
        const isAuth = await this.isAuthenticated();
        
        if (isAuth) {
            console.log('✅ Já autenticado, redirecionando para dashboard...');
            window.location.href = redirectTo;
            return true;
        }
        
        return false;
    },
    
    // Limpar tudo (logout)
    clear() {
        this.removeToken();
        this.removeUser();
    }
};
