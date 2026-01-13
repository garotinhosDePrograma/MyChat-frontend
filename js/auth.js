// Lógica de autenticação (Login e Register)

// Verificar se já está autenticado
if (Storage.isAuthenticated()) {
    window.location.href = 'dashboard.html';
}

// Função de registro
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password')?.value;
    
    // Validações
    if (!name || !email || !password) {
        Utils.showToast('Preencha todos os campos', 'error');
        return;
    }
    
    if (name.length < 3) {
        Utils.showToast('Nome deve ter pelo menos 3 caracteres', 'error');
        return;
    }
    
    if (!Utils.isValidEmail(email)) {
        Utils.showToast('Email inválido', 'error');
        return;
    }
    
    if (password.length < 6) {
        Utils.showToast('Senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }
    
    if (confirmPassword && password !== confirmPassword) {
        Utils.showToast('As senhas não coincidem', 'error');
        return;
    }
    
    // Desabilitar botão
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Cadastrando...';
    
    try {
        const response = await API.register(name, email, password);
        
        // Salvar dados
        Storage.setToken(response.data.token);
        Storage.setUser(response.data.user);
        
        Utils.showToast('Cadastro realizado com sucesso!', 'success');
        
        // Redirecionar para dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        Utils.showToast(error.message || 'Erro ao cadastrar', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Função de login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    
    // Validações
    if (!email || !password) {
        Utils.showToast('Preencha todos os campos', 'error');
        return;
    }
    
    if (!Utils.isValidEmail(email)) {
        Utils.showToast('Email inválido', 'error');
        return;
    }
    
    // Desabilitar botão
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Entrando...';
    
    try {
        const response = await API.login(email, password);
        
        // Salvar dados
        Storage.setToken(response.data.token);
        Storage.setUser(response.data.user);
        
        Utils.showToast('Login realizado com sucesso!', 'success');
        
        // Redirecionar para dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        Utils.showToast(error.message || 'Email ou senha inválidos', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
    }
}