// Registro do Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/service-worker.js')
            .then((registration) => {
                console.log('✅ Service Worker registrado com sucesso:', registration.scope);
                
                // Verificar atualizações periodicamente
                setInterval(() => {
                    registration.update();
                }, 60000); // A cada 1 minuto
            })
            .catch((error) => {
                console.error('❌ Erro ao registrar Service Worker:', error);
            });
    });
    
    // Detectar quando há uma nova versão disponível
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Nova versão disponível!');
        
        // Mostrar notificação de atualização (opcional)
        if (window.Utils && window.Utils.showToast) {
            Utils.showToast('Nova versão disponível! Recarregue a página.', 'success');
        }
    });
}

// Função para solicitar permissão de notificações
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Este navegador não suporta notificações');
        return false;
    }
    
    if (Notification.permission === 'granted') {
        return true;
    }
    
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    
    return false;
}

// Solicitar permissão quando usuário fizer login (opcional)
window.addEventListener('mychat:login', async () => {
    const hasPermission = await requestNotificationPermission();
    if (hasPermission) {
        console.log('✅ Permissão de notificações concedida');
    }
});