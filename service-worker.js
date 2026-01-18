// Service Worker para MyChat PWA - COM NOTIFICAÇÕES
const CACHE_NAME = 'mychat-v1';
const OFFLINE_URL = '/index.html';

// Arquivos para cache
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/dashboard.html',
    '/css/global.css',
    '/css/landing.css',
    '/css/auth.css',
    '/css/dashboard.css',
    '/js/config.js',
    '/js/storage.js',
    '/js/utils.js',
    '/js/api.js',
    '/js/auth.js',
    '/js/dashboard.js',
    '/js/notification.js',
    '/js/socket.js',
    '/manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Fazendo cache dos arquivos');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    
    self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Ativando...');
    
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[ServiceWorker] Removendo cache antigo:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    
    self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        message: 'Você está offline. Algumas funcionalidades podem não estar disponíveis.' 
                    }),
                    {
                        headers: { 'Content-Type': 'application/json' },
                        status: 503
                    }
                );
            })
        );
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseToCache = response.clone();
                
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_URL);
                    }
                    
                    return new Response('Conteúdo não disponível offline', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});

// ✅ CLIQUE NA NOTIFICAÇÃO - CRUCIAL PARA PWA
self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] 🖱️ Notificação clicada:', event);
    
    event.notification.close();
    
    // Obter dados da notificação
    const notificationData = event.notification.data || {};
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            // Se já existe janela aberta, focar nela
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes('dashboard.html')) {
                    // Enviar mensagem para abrir a conversa
                    if (notificationData.senderId) {
                        client.postMessage({
                            type: 'OPEN_CONVERSATION',
                            senderId: notificationData.senderId
                        });
                    }
                    return client.focus();
                }
            }
            
            // Se não existe, abrir nova janela
            let url = '/dashboard.html';
            if (notificationData.senderId) {
                url += `?open=${notificationData.senderId}`;
            }
            
            return clients.openWindow(url);
        })
    );
});

// Sincronização em background
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Sincronização em background:', event.tag);
    
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

async function syncMessages() {
    console.log('[ServiceWorker] Sincronizando mensagens pendentes...');
}

// ✅ NOTIFICAÇÕES PUSH (opcional para futuro)
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] 📨 Push recebido:', event);
    
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { body: event.data.text() };
        }
    }
    
    const options = {
        body: data.body || 'Nova mensagem no MyChat',
        icon: data.icon || '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            senderId: data.senderId,
            messageId: data.messageId,
            ...data
        },
        tag: data.tag || 'message-notification',
        requireInteraction: false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'MyChat', options)
    );
});
