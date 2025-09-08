// Global canlı bildirim fonksiyonu (tüm sayfalarda çalışır)
(function() {
    // Sadece giriş yapmış kullanıcılar için çalışsın
    if (!window.USER_IS_AUTHENTICATED) {
        return;
    }

    // Bildirim göstermek için basit bir fonksiyon

    function showNotification(message, type = 'success') {
        // Modern ve animasyonlu bildirim kutusu
        const notification = document.createElement('div');
        notification.className = `notification-fancy ${type === 'error' ? 'error' : ''}`;
        // Mesajdan kullanıcı adı ve içerik ayıkla
        let sender = '';
        let content = '';
        const match = message.match(/^New message from (.*?):\s*(.*)$/);
        if (match) {
            sender = match[1];
            content = match[2];
        } else {
            sender = message.split(':')[0];
            content = message.split(':').slice(1).join(':').trim();
        }
        notification.innerHTML = `
            <div class="notify-avatar">
                <i class="fas fa-comment-dots"></i>
            </div>
            <div class="notify-content">
                <div class="notify-title">${sender}</div>
                <div class="notify-message">${content}</div>
            </div>
            <span class="notify-close">&times;</span>
        `;
        notification.style.position = 'fixed';
        notification.style.top = '32px';
        notification.style.right = '32px';
        notification.style.zIndex = 9999;
        notification.style.background = 'rgba(34,34,34,0.98)';
        notification.style.color = '#fff';
        notification.style.padding = '0';
        notification.style.borderRadius = '14px';
        notification.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.minWidth = '320px';
        notification.style.maxWidth = '400px';
        notification.style.overflow = 'hidden';
        notification.style.animation = 'fadeInNotify 0.4s';
        notification.querySelector('.notify-avatar').style.background = 'linear-gradient(135deg,#4e54c8,#8f94fb)';
        notification.querySelector('.notify-avatar').style.width = '54px';
        notification.querySelector('.notify-avatar').style.height = '54px';
        notification.querySelector('.notify-avatar').style.display = 'flex';
        notification.querySelector('.notify-avatar').style.alignItems = 'center';
        notification.querySelector('.notify-avatar').style.justifyContent = 'center';
        notification.querySelector('.notify-avatar').style.fontSize = '2rem';
        notification.querySelector('.notify-avatar').style.color = '#fff';
        notification.querySelector('.notify-avatar').style.margin = '16px';
        notification.querySelector('.notify-avatar').style.borderRadius = '50%';
        notification.querySelector('.notify-content').style.flex = '1';
        notification.querySelector('.notify-content').style.padding = '12px 0';
        notification.querySelector('.notify-title').style.fontWeight = 'bold';
        notification.querySelector('.notify-title').style.fontSize = '1.1rem';
        notification.querySelector('.notify-message').style.fontSize = '1rem';
        notification.querySelector('.notify-message').style.marginTop = '2px';
        notification.querySelector('.notify-close').style.cursor = 'pointer';
        notification.querySelector('.notify-close').style.fontSize = '1.5rem';
        notification.querySelector('.notify-close').style.margin = '0 16px 0 8px';
        notification.querySelector('.notify-close').style.color = '#bbb';
        notification.querySelector('.notify-close').addEventListener('click', () => notification.remove());
        document.body.appendChild(notification);
        // Bildirime tıklanınca ilgili chat sayfasına git

        notification.addEventListener('click', function(e) {

            if (!e.target.classList.contains('notify-close') && sender) {
                // Kullanıcı adı ile chat sayfasına yönlendir
                window.location.href = `/chat/?user=${encodeURIComponent(sender)}`;
            }
        });
        setTimeout(() => {
            notification.style.animation = 'fadeOutNotify 0.5s';
            setTimeout(() => notification.remove(), 500);
        }, 3500);
        // Animasyon CSS ekle (bir kez eklenir)
        if (!document.getElementById('notify-anim-style')) {
            const style = document.createElement('style');
            style.id = 'notify-anim-style';
            style.innerHTML = `
                @keyframes fadeInNotify { from { opacity: 0; transform: translateY(-30px);} to { opacity: 1; transform: translateY(0);} }
                @keyframes fadeOutNotify { from { opacity: 1; transform: translateY(0);} to { opacity: 0; transform: translateY(-30px);} }
                .notification-fancy { box-sizing: border-box; }
            `;
            document.head.appendChild(style);
        }
    }

    // Bildirim sesi
    const playNotificationSound = function() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {}
    };

    // Her 4 saniyede bir canlı bildirim kontrolü
    setInterval(function() {
        fetch('/chat/api/get-notifications/?detail=1')
            .then(response => response.json())
            .then(data => {
                if (data.last_message_id && data.last_message_content && data.last_message_sender) {
                    const lastNotifiedId = localStorage.getItem('lastNotifiedMessageId_global');
                    if (String(data.last_message_id) !== String(lastNotifiedId)) {
                        showNotification(`New message from ${data.last_message_sender}: ${data.last_message_content}`);
                        playNotificationSound();
                        localStorage.setItem('lastNotifiedMessageId_global', data.last_message_id);
                    }
                }
            })
            .catch(() => {});
    }, 4000);
})();
