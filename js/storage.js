// Gerenciamento de armazenamento local
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
    
    // Verificar se está autenticado
    async isAuthenticated() {
        const token = this.getToken();
        try {
            const res = await fetch(`${CONFIG.API_URL}${CONFIG.VERIFY}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (res.ok) {
                console.log("Token válido");
                return true;
            } else {
                console.error("Token inválido: ", data.error || "Token inválido");
                this.clear();
                window.location.href = "index.html";
                return false;
            }
        } catch (error) {
            console.error("Erro ao verificar autenticação");
        }
    },
    
    // Limpar tudo (logout)
    clear() {
        this.removeToken();
        this.removeUser();
    }
};
