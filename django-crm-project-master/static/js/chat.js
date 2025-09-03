/*
    CHAT UYGULAMASI JAVASCRIPT KODU
    Bu dosya modern bir chat uygulamasının tüm etkileşimlerini yönetir.
    Ana özellikler: Gerçek zamanlı mesajlaşma, emoji desteği, mobil uyumluluk,
    yazma göstergeleri, bildirimler ve responsive tasarım.

    Kullanılan teknolojiler:
    - Vanilla JavaScript (ES6+)
    - Fetch API (AJAX istekleri için)
    - DOM manipulation
    - Event handling
    - Local storage benzeri state management
    - Web Audio API (bildirim sesleri için)
*/

/* CSRF TOKEN ALMA FONKSİYONU
   Django'nun CSRF koruması için gerekli token'ı HTML'den alır.
   Güvenli POST istekleri yapmak için kullanılır.
   Token bulunamazsa boş string döner.
*/
function getCSRFToken() {
    const token = document.querySelector('[name=csrfmiddlewaretoken]');
    return token ? token.value : '';
}

/* DOM ELEMENTLERİ - GLOBAL DEĞİŞKENLER
   HTML'deki tüm etkileşimli elementleri JavaScript değişkenlerine atarız.
   Bu sayede DOM sorgularını tek seferde yaparak performans kazanırız.
   Her element chat uygulamasının farklı bir bölümünü kontrol eder.
*/
const usersList = document.getElementById('usersList');              // Kullanıcı listesi kapsayıcı
const messagesContainer = document.getElementById('messagesContainer'); // Mesajlar kapsayıcı
const messageInput = document.getElementById('messageInput');        // Mesaj yazma input'u
const sendBtn = document.getElementById('sendBtn');                  // Gönder butonu
const messageInputArea = document.getElementById('messageInputArea'); // Input alanı kapsayıcı
const chatTitle = document.getElementById('chatTitle');              // Chat başlığı
const chatStatus = document.getElementById('chatStatus');            // Kullanıcı durumu
const chatHeaderAvatar = document.getElementById('chatHeaderAvatar'); // Profil resmi
const emojiBtn = document.getElementById('emojiBtn');                // Emoji butonu
const emojiPicker = document.getElementById('emojiPicker');          // Emoji seçici panel
const emojiGrid = document.getElementById('emojiGrid');              // Emoji ızgarası
const sidebarElement = document.querySelector('.sidebar');           // Sol sidebar
const chatHeader = document.querySelector('.chat-header');           // Chat başlığı
const sidebarOverlay = document.getElementById('sidebarOverlay');    // Mobil overlay
const mobileMenuBtn = document.getElementById('mobileMenuBtn');      // Mobil menü butonu
const typingIndicator = document.getElementById('typingIndicator');  // Yazma göstergesi

/* DURUM DEĞİŞKENLERİ - STATE MANAGEMENT
   Uygulamanın mevcut durumunu takip eden global değişkenler.
   Bu değişkenler chat'in çalışması için kritik öneme sahiptir.
   Her biri farklı bir state'i temsil eder.
*/
let currentRoomId = null;        // Aktif chat odası ID'si
let currentUserId = null;        // Seçili kullanıcı ID'si
let users = [];                  // Tüm kullanıcıların listesi
let lastMessageId = 0;           // Son yüklenen mesaj ID'si (polling için)
let messagePollingInterval = null; // Mesaj kontrolü interval ID'si
let typingTimeout = null;        // Yazma timeout ID'si
let isTyping = false;            // Kullanıcının yazıp yazmadığı durumu

let usersPollingInterval = null; // Kullanıcı listesi güncelleme interval ID'si

/* UYGULAMA BAŞLATMA
   DOMContentLoaded eventi ile sayfa tamamen yüklendiğinde çalışır.
   Event listener'ları kurar ve kullanıcıları yükler.
   Bu, uygulamanın giriş noktasıdır.
*/
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();       // Tüm event listener'ları kur
    loadUsers();                 // Kullanıcı listesini yükle
    startUsersPolling();         // Kullanıcı listesi güncelleme polling'ini başlat
    setupPageVisibilityTracking(); // Sayfa görünürlük takibi
});

/* EVENT LISTENER'LARI KURMA FONKSİYONU
   Tüm kullanıcı etkileşimlerini dinleyen event listener'ları tanımlar.
   Bu fonksiyon uygulamanın etkileşim kurma yeteneğini sağlar.
   Her event farklı bir kullanıcı aksiyonunu yakalar ve işler.
*/
function setupEventListeners() {
    // MESAJ INPUT EVENTLERİ
    messageInput.addEventListener('input', handleInputChange);        // Yazma sırasında
    messageInput.addEventListener('keypress', handleKeyPress);        // Tuşa basma
    messageInput.addEventListener('blur', () => sendTypingStatus(false)); // Odak kaybı

    // BUTON EVENTLERİ
    sendBtn.addEventListener('click', handleSendMessage);             // Gönder butonu
    emojiBtn.addEventListener('click', toggleEmojiPicker);            // Emoji butonu

    // DOKÜMAN EVENTLERİ
    document.addEventListener('click', handleOutsideClick);           // Dışarı tıklama

    // ÖZEL FONKSİYONLAR
    initializeEmojiPicker();    // Emoji seçiciyi hazırla
    setupAutoResize();          // Otomatik boyutlandırma

    // MOBİL MENÜ EVENTLERİ
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Event bubbling'i durdur
            toggleSidebar();     // Sidebar'ı aç/kapa
        });
    }

    // SİDEBAR KAPATMA EVENTİ
    const closeBtn = sidebarElement.querySelector('.sidebar-header::after');
    if (closeBtn) {
        sidebarElement.querySelector('.sidebar-header').addEventListener('click', function(e) {
            if (e.target.textContent === '✕') {
                toggleSidebar(); // X butonuna tıklandığında kapat
            }
        });
    }

    // OVERLAY TIKLAMA EVENTİ
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar); // Overlay'e tıkla kapat
    }

    // MOBİL KULLANICI SEÇİMİ
    sidebarElement.addEventListener('click', function(e) {
        if (e.target.closest('.user-item') && window.innerWidth <= 768) {
            setTimeout(() => toggleSidebar(), 300); // Mobil'de kullanıcı seçince kapat
        }
    });

    // MESAJ KAPSAYICISINA SCROLL EVENTİ EKLE
    if (messagesContainer) {
        messagesContainer.addEventListener('scroll', () => {
            setTimeout(() => {
                markVisibleMessagesAsRead();
            }, 200);
        });
    }
}

/* INPUT DEĞİŞİMİ İŞLEME
   Kullanıcı mesaj yazarken çalışır.
   Gönder butonunu aktif/pasif yapar.
   Yazma durumunu sunucuya gönderir.
*/
function handleInputChange() {
    const value = messageInput.value.trim();        // Boşlukları temizle
    sendBtn.disabled = value.length === 0 || !currentRoomId; // Buton durumunu ayarla

    if (currentRoomId && value.length > 0) {
        sendTypingStatus(true); // Yazıyor durumunu gönder
    }
}

/* KLAVYE TUŞU BASMA İŞLEME
   Enter tuşuna basıldığında mesaj gönderir.
   Diğer tuşlar için normal davranış.
*/
function handleKeyPress(e) {
    if (e.key === 'Enter' && !sendBtn.disabled) {
        sendTypingStatus(false);  // Yazma durumunu durdur
        handleSendMessage();      // Mesajı gönder
    }
}

async function handleSendMessage() {
    const content = messageInput.value.trim();
    if (!content || !currentRoomId) {
        return;
    }

    try {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';

        const response = await fetch('/chat/api/send-message/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                room_id: currentRoomId,
                content: content
            })
        });

        const data = await response.json();

        if (data.success) {
            messageInput.value = '';
            handleInputChange();
            sendTypingStatus(false);

            // Mesaj gönderildi olarak işaretle
            if (data.message_id) {
                setTimeout(() => {
                    updateMessageStatus(data.message_id, 'sent');
                }, 300); // Kısa gecikme ile gönderildi durumuna geç
            }

            await loadMessages();
            showNotification('Message sent');
            playNotificationSound();
        } else {
            showNotification(data.error || 'Failed to send message', 'error');
        }
    } catch (error) {
        console.error('Send message error:', error);
        showNotification('Connection error', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/chat/api/users/', {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });
        const data = await response.json();

        if (data.success) {
            users = data.users;
            displayUsers(users);
        } else {
            console.error('Error loading users:', data.error);
            showNotification('Error loading users', 'error');
        }
    } catch (error) {
        console.error('Load users error:', error);
        showNotification('Error loading users', 'error');
    }
}

/* KULLANICI LİSTESİNİ GÜNCELLEME
   Mevcut kullanıcı listesini yeni verilerle günceller.
   Sadece değişen online durumlarını günceller (performans için).
   Tam liste değişikliği durumunda yeniden çizer.
*/
async function updateUsersList() {
    try {
        const response = await fetch('/chat/api/users/', {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });
        const data = await response.json();

        if (data.success && data.users) {
            const newUsers = data.users;
            let needsFullUpdate = false;

            // KULLANICI SAYISI DEĞİŞMİŞ Mİ KONTROL ET
            if (users.length !== newUsers.length) {
                needsFullUpdate = true;
            } else {
                // HER KULLANICI İÇİN DURUM DEĞİŞİKLİĞİ KONTROL ET
                for (let i = 0; i < users.length; i++) {
                    const oldUser = users[i];
                    const newUser = newUsers.find(u => u.id === oldUser.id);

                    if (!newUser || oldUser.is_online !== newUser.is_online) {
                        needsFullUpdate = true;
                        break;
                    }
                }
            }

            if (needsFullUpdate) {
                // TAM GÜNCELLEME
                users = newUsers;
                displayUsers(users);
            } else {
                // SADECE DURUM GÜNCELLEME
                updateUserStatuses(newUsers);
            }

            // SEÇİLİ KULLANICININ DURUMUNU GÜNCELLE
            if (currentUserId) {
                const currentUser = newUsers.find(u => u.id === currentUserId);
                if (currentUser) {
                    updateCurrentUserStatus(currentUser);
                }
            }
        }
    } catch (error) {
        console.error('Update users list error:', error);
    }
}

/* KULLANICI DURUMLARINI GÜNCELLEME
   Sadece online/offline durumlarını günceller.
   DOM manipülasyonunu minimize eder.
*/
function updateUserStatuses(newUsers) {
    newUsers.forEach(newUser => {
        const userElement = document.querySelector(`[data-user-id="${newUser.id}"]`);
        if (userElement) {
            const statusDot = userElement.querySelector('.status-dot');
            const statusText = userElement.querySelector('.user-status');

            if (statusDot && statusText) {
                const oldStatus = statusDot.classList.contains('online') ? 'online' : 'offline';
                const newStatus = newUser.is_online ? 'online' : 'offline';

                if (oldStatus !== newStatus) {
                    // DURUM DEĞİŞTİ, GÜNCELLE
                    statusDot.className = `status-dot ${newStatus}`;
                    statusText.innerHTML = `
                        <span class="status-dot ${newStatus}"></span>
                        ${newUser.is_online ? 'Online' : 'Offline'}
                    `;
                }
            }
        }
    });
}

/* SEÇİLİ KULLANICININ DURUMUNU GÜNCELLEME
   Chat header'daki seçili kullanıcının durumunu günceller.
*/
function updateCurrentUserStatus(user) {
    if (chatStatus) {
        const statusClass = user.is_online ? 'online' : 'offline';
        const statusText = user.is_online ? 'Online' : 'Offline';
        chatStatus.innerHTML = `<span class="status-dot ${statusClass}"></span> ${statusText}`;
    }
}

/* KULLANICI POLLING'İ BAŞLATMA
   Periyodik olarak kullanıcı listesini günceller.
   10 saniyede bir kullanıcı durumlarını kontrol eder.
   Sayfa kapatılırken durdurulur.
*/
function startUsersPolling() {
    if (usersPollingInterval) {
        clearInterval(usersPollingInterval);
    }

    usersPollingInterval = setInterval(() => {
        updateUsersList();  // Kullanıcı listesini güncelle
    }, 10000);  // 10 saniye aralıkla
}

/* KULLANICI POLLING'İ DURDURMA
   Çalışan kullanıcı polling'ini durdurur.
   Sayfa kapatılırken veya uygulama sonlandırılırken kullanılır.
*/
function stopUsersPolling() {
    if (usersPollingInterval) {
        clearInterval(usersPollingInterval);
        usersPollingInterval = null;
    }
}

/* SAYFA GÖRÜNÜRLÜK TAKİBİ KURMA
   Page Visibility API kullanarak kullanıcının sayfada olup olmadığını takip eder.
   Kullanıcı sekmeden çıkarsa offline yapar, geri gelirse online yapar.
   Bu sayede gerçek zamanlı online/offline durumu sağlanır.
*/
function setupPageVisibilityTracking() {
    // Page Visibility API destek kontrolü
    if (typeof document.hidden !== "undefined") {
        // Sayfa görünürlük değişikliği eventi
        document.addEventListener('visibilitychange', handleVisibilityChange);
    } else if (typeof document.webkitHidden !== "undefined") {
        // WebKit desteği için (eski browser'lar)
        document.addEventListener('webkitvisibilitychange', handleVisibilityChange);
    } else if (typeof document.msHidden !== "undefined") {
        // IE desteği için
        document.addEventListener('msvisibilitychange', handleVisibilityChange);
    }

    // Pencere odaklanma/kaybetme eventleri
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    // Sayfa kapatılmadan önce offline yap
    window.addEventListener('beforeunload', handleBeforeUnload);
}

/* GÖRÜNÜRLÜK DEĞİŞİKLİĞİ İŞLEME
   Sayfa görünürlük durumu değiştiğinde çağrılır.
   Kullanıcı sekmeden çıkarsa offline yapar.
*/
function handleVisibilityChange() {
    if (document.hidden || document.webkitHidden || document.msHidden) {
        // Kullanıcı sekmeden çıktı - offline yap
        updateUserPresence(false);
    } else {
        // Kullanıcı geri geldi - online yap
        updateUserPresence(true);
    }
}

/* PENCERE ODAKLANMA İŞLEME
   Pencere odaklandığında çağrılır.
   Kullanıcıyı online yapar.
*/
function handleWindowFocus() {
    updateUserPresence(true);
}

/* PENCERE ODAK KAYBETME İŞLEME
   Pencere odak kaybettiğinde çağrılır.
   Kısa süre sonra offline yapar (kullanıcı başka uygulamaya geçtiyse).
*/
function handleWindowBlur() {
    // Kısa bir gecikme ile offline yap (kullanıcı başka sekmeye geçtiyse)
    setTimeout(() => {
        if (document.hidden || document.webkitHidden || document.msHidden) {
            updateUserPresence(false);
        }
    }, 100);
}

/* SAYFA KAPATILMADAN ÖNCE İŞLEME
   Kullanıcı sayfadan çıkmadan önce çağrılır.
   Kullanıcıyı hemen offline yapar.
*/
function handleBeforeUnload() {
    // Senkron olarak offline yap (sayfa kapanmadan önce)
    navigator.sendBeacon('/chat/api/user-presence/', JSON.stringify({
        online: false,
        csrfmiddlewaretoken: getCSRFToken()
    }));
}

/* KULLANICI MEVCUDİYET GÜNCELLEME
   Kullanıcının online/offline durumunu sunucuya gönderir.
   Cache'i günceller ve diğer kullanıcılara durumu bildirir.
*/
async function updateUserPresence(isOnline) {
    try {
        const response = await fetch('/chat/api/user-presence/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                online: isOnline
            })
        });

        const data = await response.json();
        if (!data.success) {
            console.error('Presence update error:', data.error);
        }
    } catch (error) {
        console.error('Update presence error:', error);
    }
}

/* KULLANICI LİSTESİNİ GÖRÜNTÜLEME
   Kullanıcı dizisini alıp HTML elementlerine dönüştürür.
   Her kullanıcı için kart oluşturur ve tıklama eventi ekler.
   Kullanıcı bulunamazsa uygun mesaj gösterir.
*/
function displayUsers(users) {
    usersList.innerHTML = '';  // Önceki içeriği temizle

    if (!users || users.length === 0) {  // Kullanıcı kontrolü
        usersList.innerHTML = '<div class="user-item">No users found</div>';
        return;
    }

    users.forEach(user => {  // Her kullanıcı için
        const userDiv = document.createElement('div');  // Kart elementi
        userDiv.className = 'user-item';  // CSS sınıfı
        userDiv.setAttribute('data-user-id', user.id);  // Veri özelliği

        const statusClass = user.is_online ? 'online' : 'offline';  // Durum sınıfı
        const statusText = user.is_online ? 'Online' : 'Offline';   // Durum metni

        userDiv.innerHTML = `
            <img src="${user.avatar}" alt="${user.full_name}" class="user-avatar" onerror="this.src='/media/profile_pictures/default_avatar_JxNUiAn.png'">
            <div class="user-info">
                <div class="user-name">${user.full_name}</div>
                <div class="user-status">
                    <span class="status-dot ${statusClass}"></span>
                    ${statusText}
                </div>
            </div>
        `;

        userDiv.addEventListener('click', () => selectUser(user));  // Tıklama eventi
        usersList.appendChild(userDiv);  // Listeye ekle
    });
}

/* KULLANICI SEÇİMİ
   Kullanıcı kartına tıklandığında chat odası oluşturur.
   UI'ı günceller ve mesaj yükleme işlemini başlatır.
   Async/await ile sunucu işlemlerini yönetir.
*/
async function selectUser(user) {
    // AKTİF KULLANICI GÖRSEL GÜNCELLEME
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');  // Tüm aktif sınıflarını kaldır
    });
    event.currentTarget.classList.add('active');  // Seçili kullanıcıyı aktif yap

    // CHAT HEADER GÜNCELLEME
    currentUserId = user.id;  // Global değişkene ata
    chatTitle.textContent = user.full_name;  // Başlığı güncelle
    chatHeaderAvatar.src = user.avatar;  // Profil resmini güncelle
    chatHeaderAvatar.onerror = function() {  // Hata durumunda varsayılan resim
        this.src = '/media/profile_pictures/default_avatar_JxNUiAn.png';
    };

    // DURUM GÖSTERİMİ
    const statusClass = user.is_online ? 'online' : 'offline';
    const statusText = user.is_online ? 'Online' : 'Offline';
    chatStatus.innerHTML = `<span class="status-dot ${statusClass}"></span> ${statusText}`;

    // UI GÖRÜNÜRLÜK DEĞİŞİKLİKLERİ
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) { // Element varsa gizle
        welcomeMessage.style.display = 'none';  // Hoş geldin mesajını gizle
    }
    messageInputArea.style.display = 'flex';  // Mesaj input'unu göster

    setTimeout(() => {
        updateMobileHeights();  // Mobil yükseklikleri güncelle
    }, 100);

    // Oda değiştirirken eski mesajları temizle
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
    try {
        // CHAT ODASI OLUŞTURMA
        const response = await fetch('/chat/api/create-room/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                user_id: user.id  // Seçili kullanıcı ID'si
            })
        });

        const data = await response.json();

        if (data.success) {
            // POLLING DURDURMA
            stopMessagePolling();

            // DURUM SIFIRLAMA
            sendTypingStatus(false);     // Yazma durumunu durdur
            showTypingIndicator(false);  // Yazma göstergesini gizle

            // YENİ ODA BİLGİLERİ
            currentRoomId = data.room_id;  // Oda ID'sini kaydet
            lastMessageId = 0;            // Son mesaj ID'sini sıfırla

            await loadMessages();         // Mesajları yükle
            startMessagePolling();        // Polling'i başlat

            // ODADAKİ TÜM MESAJLARI OKUNDU OLARAK İŞARETLE
            setTimeout(() => {
                markAllMessagesInRoomAsRead();
            }, 1000); // Mesajlar yüklendikten sonra kısa bir bekleme

            showNotification('Chat started');  // Başarı bildirimi
        } else {
            showNotification(data.error || 'Failed to create room', 'error');  // Hata bildirimi
        }
    } catch (error) {
        console.error('Create room error:', error);  // Konsol hatası
        showNotification('Failed to create room', 'error');  // Kullanıcı bildirimi
    }
}

/* MESAJLARI YÜKLEME
   Belirtilen chat odasındaki mesajları sunucudan alır.
   Sadece son yüklenen mesaj sonrası gelen mesajları alır.
   Async/await ile asenkron veri çekme işlemi.
*/
async function loadMessages() {
    if (!currentRoomId) {  // Oda kontrolü
        return;
    }

    try {
        // SUNUCUYA İSTEK GÖNDERME
        const response = await fetch(`/chat/api/messages/?room_id=${currentRoomId}&last_id=${lastMessageId}`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });
        const data = await response.json();

        if (data.success) {
            if (data.messages && data.messages.length > 0) {
                displayMessages(data.messages);  // Mesajları göster
                const latestMessage = data.messages[data.messages.length - 1];
                lastMessageId = latestMessage.id;  // Son mesaj ID'sini güncelle

                // GÖRÜNÜR MESAJLARI OKUNDU OLARAK İŞARETLE
                setTimeout(() => {
                    markVisibleMessagesAsRead();
                }, 1000); // Mesajlar yüklendikten sonra 1 saniye bekle
            }

            // MEVCUT MESAJLARIN DURUMLARINI HER ZAMAN GÜNCELLE
            updateExistingMessageStatuses();
        } else {
            console.error('Failed to load messages');  // Hata logla
        }
    } catch (error) {
        console.error('Load messages error:', error);  // Ağ hatası
        showNotification('Error loading messages', 'error');  // Bildirim
    }
}

/* MESAJLARI GÖRÜNTÜLEME
   Mesaj dizisini alıp DOM'a ekler.
   Duplike mesajları önler ve otomatik kaydırma yönetir.
   Yeni mesaj geldiğinde ses çalar.
*/
function displayMessages(messages) {
    const messagesContainer = document.getElementById('messagesContainer');
    let hasNewMessages = false;  // Yeni mesaj kontrolü

    if (!messages || messages.length === 0) {  // Mesaj kontrolü
        return;
    }

    // KAYDIRMA POZİSYONU KONTROLÜ
    const shouldScrollToBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 100;

    messages.forEach(message => {
        // DUPLİKE KONTROLÜ
        const existingMessage = messagesContainer.querySelector(`[data-message-id="${message.id}"]`);
        if (existingMessage) {
            // MEVCUT MESAJ VAR - SADECE DURUMU GÜNCELLE
            const statusIcon = existingMessage.querySelector('.status-icon');
            if (statusIcon) {
                const currentStatus = statusIcon.className.replace('status-icon ', '');
                const newStatus = message.is_sender ? (message.is_read ? 'read' : 'sent') : (message.is_read ? 'read' : 'delivered');

                if (currentStatus !== newStatus) {
                    console.log(`Mevcut mesaj ${message.id} durumu güncelleniyor: ${currentStatus} -> ${newStatus}`);
                    updateMessageStatus(message.id, newStatus);
                }
            }
            return;  // Yeni mesaj olarak ekleme
        }

        hasNewMessages = true;  // Yeni mesaj var

        // YENİ MESAJ ELEMENTİ OLUŞTURMA
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.is_sender ? 'sent' : 'received'}`;  // CSS sınıfları
        messageDiv.setAttribute('data-message-id', message.id);  // Veri özelliği

        messageDiv.innerHTML = `
            <div class="message-content">${message.content}</div>
            <div class="message-footer">
                <div class="message-time">${formatTime(message.timestamp)}</div>
                <div class="message-status" data-message-id="${message.id}">
                    <span class="status-icon ${message.is_sender ? (message.is_read ? 'read' : 'sent') : (message.is_read ? 'read' : 'delivered')}">${getStatusIcon(message.is_sender ? (message.is_read ? 'read' : 'sent') : (message.is_read ? 'read' : 'delivered'))}</span>
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);  // DOM'a ekle
    });

    // SES VE KAYDIRMA İŞLEMLERİ
    if (hasNewMessages && messages.some(msg => !msg.is_sender)) {
        playNotificationSound();  // Yeni mesaj sesi çal
    }

    if (shouldScrollToBottom) {  // Otomatik kaydırma
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }
}

/* ZAMAN FORMATLAMA
   Timestamp'i kullanıcı dostu zaman formatına çevirir.
   Sadece saat ve dakika gösterir (HH:MM formatında).
*/
function formatTime(timestamp) {
    const date = new Date(timestamp);  // Date objesi oluştur
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',    // 2 haneli saat
        minute: '2-digit'   // 2 haneli dakika
    });
}

/* MESAJ POLLING'İ BAŞLATMA
   Periyodik olarak yeni mesajları kontrol eder.
   3 saniyede bir mesaj yükleme ve yazma durumu kontrolü yapar.
   Mevcut polling varsa önce onu durdurur.
*/
function startMessagePolling() {
    if (messagePollingInterval) {  // Mevcut polling varsa
        clearInterval(messagePollingInterval);  // Durdur
    }

    messagePollingInterval = setInterval(() => {  // Yeni polling başlat
        if (currentRoomId) {  // Oda varsa
            loadMessages();      // Mesajları yükle
            checkTypingStatus(); // Yazma durumunu kontrol et
        }
    }, 1000);  // 1 saniye aralıkla
}

/* MESAJ POLLING'İ DURDURMA
   Çalışan mesaj polling'ini durdurur.
   Sayfa kapatılırken veya oda değişirken kullanılır.
*/
function stopMessagePolling() {
    if (messagePollingInterval) {  // Polling varsa
        clearInterval(messagePollingInterval);  // Durdur
        messagePollingInterval = null;  // Referansı temizle
    }
}

/* MESAJ OKUNDU DURUMUNU GÜNCELLEME
   Belirtilen mesajları okundu olarak işaretler.
   UI'daki durum ikonlarını günceller (✅ → ✅✅).
   Sunucuya okundu bilgisini gönderir.
*/
async function markMessagesAsRead(messageIds) {
    if (!messageIds || messageIds.length === 0) {
        console.log('markMessagesAsRead: messageIds boş veya yok');
        return;
    }

    console.log('markMessagesAsRead: Başlatıldı, mesaj IDleri:', messageIds);

    try {
        // SUNUCUYA OKUNDU BİLGİSİ GÖNDERME
        console.log('markMessagesAsRead: API çağrısı yapılıyor...');
        const response = await fetch('/chat/api/mark-read/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                message_ids: messageIds,
                room_id: currentRoomId
            })
        });

        const data = await response.json();
        console.log('markMessagesAsRead: API yanıtı:', data);

        if (data.success) {
            // UI GÜNCELLEME
            messageIds.forEach(messageId => {
                updateMessageStatus(messageId, 'read');
                console.log('markMessagesAsRead: Mesaj durumu güncellendi:', messageId);
            });
        } else {
            console.log('markMessagesAsRead: API başarısız');
        }
    } catch (error) {
        console.error('Mark messages as read error:', error);
    }
}

/* GÖRÜNÜR MESAJLARI OKUNDU OLARAK İŞARETLEME
   Kullanıcının görebildiği mesajları otomatik olarak okundu işaretler.
   Sadece karşı taraftan gelen mesajları işaretler.
   Sayfa kaydırıldığında veya yeni mesaj geldiğinde çağrılır.
*/
function markVisibleMessagesAsRead() {
    if (!currentRoomId) {
        return;
    }

    const messagesContainer = document.getElementById('messagesContainer');
    const unreadMessageIds = [];

    // GÖRÜNÜR ALANDAKİ OKUNMAMIŞ MESAJLARI BULMA
    const messageElements = messagesContainer.querySelectorAll('.message.received');

    messageElements.forEach(messageEl => {
        const statusIcon = messageEl.querySelector('.status-icon');
        const messageId = parseInt(messageEl.getAttribute('data-message-id'));

        // MESAJIN GÖRÜNÜR OLUP OLMADIĞINI KONTROL ET
        const rect = messageEl.getBoundingClientRect();
        const containerRect = messagesContainer.getBoundingClientRect();
        const isVisible = rect.top >= containerRect.top && rect.bottom <= containerRect.bottom;

        if (statusIcon && statusIcon.classList.contains('delivered') && messageId && isVisible) {  // Sadece teslim edilmiş (✅) ve görünür olanları
            unreadMessageIds.push(messageId);
        }
    });

    console.log('markVisibleMessagesAsRead: Toplam okunmamış mesaj sayısı:', unreadMessageIds.length);

    if (unreadMessageIds.length > 0) {
        markMessagesAsRead(unreadMessageIds);  // Okundu olarak işaretle
    }
}


/* ODADAKİ TÜM MESAJLARI OKUNDU OLARAK İŞARETLEME
   Kullanıcı odaya girdiğinde tüm okunmamış mesajları okundu işaretler.
   Sadece karşı taraftan gelen mesajları işaretler.
   WhatsApp benzeri davranış sağlar.
   Yeni API'yi kullanarak daha performanslı çalışır.
*/
async function markAllMessagesInRoomAsRead() {
    if (!currentRoomId) {
        return;
    }

    try {
        const response = await fetch('/chat/api/mark-room-read/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                room_id: currentRoomId
            })
        });

        const data = await response.json();

        if (data.success && data.updated_count > 0) {

            // UI'YI GÜNCELLE - ODADAKİ TÜM GÖNDERİLMİŞ MESAJLARI OKUNDU YAP
            const messageElements = document.querySelectorAll('.message.received .status-icon.delivered');

            messageElements.forEach(statusIcon => {
                statusIcon.className = 'status-icon read';
                statusIcon.textContent = getStatusIcon('read');

                // Geçiş animasyonu ekle
                statusIcon.classList.add('delivered-to-read');
                setTimeout(() => statusIcon.classList.remove('delivered-to-read'), 500);
            });
        } else {
    // ...existing code...
        }
    } catch (error) {
        console.error('Mark all messages as read error:', error);

        // HATA DURUMUNDA ESKİ YÖNTEME GERİ DÖN
        const messagesContainer = document.getElementById('messagesContainer');
        const unreadMessageIds = [];

        // ODADAKİ TÜM OKUNMAMIŞ MESAJLARI BULMA
        const messageElements = messagesContainer.querySelectorAll('.message.received .status-icon.delivered');
        messageElements.forEach(statusIcon => {
            const messageId = parseInt(statusIcon.closest('.message').getAttribute('data-message-id'));
            if (messageId) {
                unreadMessageIds.push(messageId);
            }
        });

        if (unreadMessageIds.length > 0) {
            console.log(`Fallback: Odadaki ${unreadMessageIds.length} mesajı okundu olarak işaretleniyor...`);
            markMessagesAsRead(unreadMessageIds);  // Eski yöntemle okundu olarak işaretle
        }
    }
}

/* BİLDİRİM GÖSTERME
   Kullanıcıya başarı veya hata mesajları gösterir.
   Otomatik olarak 3 saniye sonra kaybolur.
   success (yeşil) veya error (kırmızı) tiplerinde olabilir.
*/
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');  // Bildirim elementi
    notification.className = `notification ${type === 'error' ? 'error' : ''}`;  // CSS sınıfları
    notification.textContent = message;  // Mesaj içeriği

    document.body.appendChild(notification);  // DOM'a ekle

    setTimeout(() => {
        notification.remove();  // 3 saniye sonra kaldır
    }, 3000);
}

/* EMOJI SEÇİCİYİ HAZIRLAMA
   Büyük bir emoji dizisini alıp DOM elementlerine dönüştürür.
   Her emoji için tıklama eventi ekler.
   Kullanıcının mesajlarına emoji eklemesi için kullanılır.
*/
function initializeEmojiPicker() {
    // KAPSAMLI EMOJI LİSTESİ
    const emojis = ['😀', '😂', '😊', '😍', '🥰', '😘', '😉', '😎', '🤔', '😮', '😢', '😭', '😤', '😡', '🥺', '😴', '🤤', '😵', '🤐', '🤗', '🤔', '🤭', '🤫', '🤥', '😏', '🙄', '😬', '🤪', '🥴', '😵‍💫', '🤯', '🥱', '😪', '😴', '😌', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '🔟', '🔢', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '🔀', '🔁', '🔂', '◀️', '🔼', '🔽', '⏫', '⏬', '⏸️', '🔇', '🔈', '🔉', '🔊', '📢', '📣', '📯', '🔔', '🔕', '🎵', '🎶', '🏧', '🚮', '🚰', '♿', '🚹', '🚺', '🚻', '🚼', '🚾', '🛂', '🛃', '🛄', '🛅', '⚠️', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯', '🚱', '🚷', '📵', '🔞', '☢️', '☣️', '⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔃', '🔄', '🔙', '🔚', '🔛', '🔜', '🔝', '🛐', '⚛️', '🕉️', '✡️', '☸️', '☯️', '✝️', '☦️', '☪️', '☮️', '🕎', '🔯', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '⛎', '🔀', '🔁', '🔂', '▶️', '⏩', '⏪', '🔼', '⏫', '🔽', '⏬', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '◀️', '🔙', '🔚', '🔛', '🔜', '🔝', '🔇', '🔈', '🔉', '🔊', '📢', '📣', '📯', '🔔', '🔕', '🎵', '🎶'];

    emojiGrid.innerHTML = '';  // Önceki içeriği temizle

    emojis.forEach(emoji => {  // Her emoji için
        const emojiDiv = document.createElement('div');  // Emoji elementi
        emojiDiv.className = 'emoji-item';  // CSS sınıfı
        emojiDiv.textContent = emoji;  // Emoji içeriği
        emojiDiv.addEventListener('click', () => insertEmoji(emoji));  // Tıklama eventi
        emojiGrid.appendChild(emojiDiv);  // Grid'e ekle
    });
}

/* EMOJI SEÇİCİYİ AÇ/KAPA
   Emoji panelinin görünürlüğünü değiştirir.
   Mobil ve desktop için farklı konumlandırma ayarları yapar.
   Animasyonlu geçiş efekti sağlar.
*/
function toggleEmojiPicker() {
    const isVisible = emojiPicker.style.display === 'block';  // Mevcut durum

    // MOBİL/DESKTOP POZİSYON AYARLARI
    if (window.innerWidth <= 768) {  // Mobil cihazlar için
        emojiPicker.style.bottom = '80px';   // Input'un üstünde
        emojiPicker.style.left = '15px';     // Soldan boşluk
        emojiPicker.style.right = '15px';    // Sağdan boşluk
        emojiPicker.style.width = 'auto';    // Otomatik genişlik
        emojiPicker.style.maxHeight = '180px'; // Sınırlı yükseklik
    } else {  // Desktop için
        emojiPicker.style.bottom = '70px';   // Input'un üstünde
        emojiPicker.style.right = '10px';    // Sağda konumlandır
        emojiPicker.style.left = 'auto';     // Sol otomatik
        emojiPicker.style.width = '320px';   // Sabit genişlik
        emojiPicker.style.maxHeight = '250px'; // Daha büyük yükseklik
    }

    emojiPicker.style.display = isVisible ? 'none' : 'block';  // Görünürlük değiştir

    if (!isVisible) {  // Açılırken
        setTimeout(() => {
            emojiGrid.scrollTop = 0;  // Üste kaydır
        }, 10);
    }
}

/* EMOJI EKLEME
   Seçilen emoji'yi mesaj input'una ekler.
   İmleç konumunu korur ve odaklanır.
   Emoji seçiciyi otomatik kapatır.
*/
function insertEmoji(emoji) {
    const start = messageInput.selectionStart;  // İmleç başlangıç pozisyonu
    const end = messageInput.selectionEnd;      // İmleç bitiş pozisyonu
    const text = messageInput.value;            // Mevcut metin
    const before = text.substring(0, start);    // İmleç öncesi metin
    const after = text.substring(end, text.length); // İmleç sonrası metin

    messageInput.value = before + emoji + after;  // Emoji'yi araya ekle
    messageInput.focus();  // Input'a odaklan
    messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;  // İmleç pozisyonu
    handleInputChange();  // Input değişikliğini işle
    emojiPicker.style.display = 'none';  // Emoji seçiciyi kapat
}

/* DIŞARI TIKLAMA İŞLEME
   Emoji seçici dışına tıklandığında kapatır.
   Event bubbling'i önler ve kullanıcı deneyimini iyileştirir.
*/
function handleOutsideClick(e) {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {  // Emoji alanı dışında mı?
        emojiPicker.style.display = 'none';  // Kapat
    }
}

function setupAutoResize() {
    const messagesContainer = document.getElementById('messagesContainer');
    const chatHeader = document.querySelector('.chat-header');

    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        const newHeight = Math.min(this.scrollHeight, 120);
        this.style.height = newHeight + 'px';

        if (window.innerWidth <= 768) {
            const headerHeight = chatHeader.offsetHeight;
            const inputHeight = messageInputArea.offsetHeight;
            const totalUsedHeight = headerHeight + inputHeight;
            const availableHeight = window.innerHeight - totalUsedHeight - 20;

            messagesContainer.style.height = Math.max(availableHeight, 200) + 'px';
            messagesContainer.style.paddingBottom = (inputHeight + 20) + 'px';
        }
    });

    if (window.innerWidth <= 768) {
        setTimeout(() => {
            const headerHeight = chatHeader.offsetHeight;
            const inputHeight = messageInputArea.offsetHeight;
            const totalUsedHeight = headerHeight + inputHeight;
            const availableHeight = window.innerHeight - totalUsedHeight - 20;

            messagesContainer.style.height = Math.max(availableHeight, 200) + 'px';
            messagesContainer.style.paddingBottom = (inputHeight + 20) + 'px';
        }, 100);
    }
}

function playNotificationSound() {
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
    } catch (e) {
        console.log('Notification sound played');
    }
}

function toggleSidebar() {
    if (window.innerWidth <= 768) {
        const isOpen = sidebarElement.classList.contains('show');
        sidebarElement.classList.toggle('show');
        sidebarOverlay.classList.toggle('show');
        document.body.style.overflow = isOpen ? 'auto' : 'hidden';
    }
}

function closeSidebar() {
    if (window.innerWidth <= 768) {
        sidebarElement.classList.remove('show');
        sidebarOverlay.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                updateMobileHeights();
            }, 100);
        }
    });
}

function updateMobileHeights() {
    if (window.innerWidth <= 768 && messageInputArea.style.display !== 'none') {
        const messagesContainer = document.getElementById('messagesContainer');
        const chatHeader = document.querySelector('.chat-header');

        const headerHeight = chatHeader.offsetHeight;
        const inputHeight = messageInputArea.offsetHeight;
        const totalUsedHeight = headerHeight + inputHeight;
        const availableHeight = window.innerHeight - totalUsedHeight - 20;

        messagesContainer.style.height = Math.max(availableHeight, 200) + 'px';
        messagesContainer.style.paddingBottom = (inputHeight + 20) + 'px';
    }
}

function sendTypingStatus(isTypingNow) {
    if (!currentRoomId) {
        return;
    }

    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }

    if (isTypingNow && !isTyping) {
        isTyping = true;
        sendTypingToServer(true);

        typingTimeout = setTimeout(() => {
            isTyping = false;
            sendTypingToServer(false);
        }, 3000);
    } else if (!isTypingNow && isTyping) {
        isTyping = false;
        sendTypingToServer(false);
    }
}

async function sendTypingToServer(isTypingStatus) {
    try {
        const response = await fetch('/chat/api/typing-status/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                room_id: currentRoomId,
                is_typing: isTypingStatus
            })
        });

        const data = await response.json();
        if (!data.success) {
            console.error('Typing status error:', data.error);
        }
    } catch (error) {
        console.error('Send typing status error:', error);
    }
}

function showTypingIndicator(show) {
    if (show) {
        typingIndicator.classList.add('show');
    } else {
        typingIndicator.classList.remove('show');
    }
}

function checkTypingStatus() {
    if (!currentRoomId) {
        return;
    }

    fetch(`/chat/api/typing-status/?room_id=${currentRoomId}`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showTypingIndicator(data.is_typing);
        }
    })
    .catch(error => {
        console.error('Check typing status error:', error);
    });
}

/* DURUM İKONU ALMA
   Mesaj durumuna göre uygun ikonu döndürür.
   WhatsApp benzeri modern ikonlar kullanır.
*/
function getStatusIcon(status) {
    switch (status) {
        case 'sending':
            return '⏳';    // Saat ikonu - gönderiliyor
        case 'sent':
            return '✓';     // Tek tick - gönderildi
        case 'delivered':
            return '✓';     // Tek tick - teslim edildi
        case 'read':
            return '✓✓';    // Çift tick - okundu
        default:
            return '⏳';    // Varsayılan saat ikonu
    }
}

/* MESAJ DURUMUNU GÜNCELLEME
   Belirtilen mesajın durum ikonunu günceller.
   Yeni durum için uygun ikonu ayarlar.
*/
function updateMessageStatus(messageId, status) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        const statusIcon = messageElement.querySelector('.status-icon');
        if (statusIcon) {
            statusIcon.className = `status-icon ${status}`;
            statusIcon.textContent = getStatusIcon(status);
        }
    }
}

/* MEVCUT MESAJLARIN DURUMLARINI GÜNCELLEME
   DOM'daki mevcut mesajların durumlarını sunucudan gelen verilerle günceller.
   Yeni mesaj geldiğinde veya polling sırasında çağrılır.
   Sadece durum değişikliği olan mesajları günceller.
*/
function updateExistingMessageStatuses() {
    if (!currentRoomId) {
        return;
    }

    // SUNUCUDAN TÜM MESAJLARIN GÜNCEL DURUMLARINI AL
    fetch(`/chat/api/messages/?room_id=${currentRoomId}&last_id=0`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.messages) {

            data.messages.forEach(serverMessage => {
                // DOM'DAKİ KARŞILIK GELEN MESAJI BUL
                const messageElement = document.querySelector(`[data-message-id="${serverMessage.id}"]`);
                if (messageElement) {
                    const statusIcon = messageElement.querySelector('.status-icon');
                    if (statusIcon) {
                        // SUNUCU VE DOM DURUMLARINI KARŞILAŞTIR
                        const currentStatus = statusIcon.className.replace('status-icon ', '');
                        const serverStatus = serverMessage.is_sender ?
                            (serverMessage.is_read ? 'read' : 'sent') :
                            (serverMessage.is_read ? 'read' : 'delivered');

                        // DURUM DEĞİŞMİŞSE GÜNCELLE
                        if (currentStatus !== serverStatus) {
                            updateMessageStatus(serverMessage.id, serverStatus);
                        }
                    }
                }
            });
        } else {
            console.log('updateExistingMessageStatuses: API başarısız');
        }
    })
    .catch(error => {
        console.error('updateExistingMessageStatuses error:', error);
    });
}
