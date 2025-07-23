document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key');
    const saveButton = document.getElementById('save-button');
    const statusMessage = document.getElementById('status-message');
    const togglePanelButton = document.getElementById('toggle-panel-button');

    // Kaydedilmiş API anahtarını yükle ve input'a yerleştir
    chrome.storage.sync.get(['openai_api_key'], (result) => {
        if (result.openai_api_key) {
            apiKeyInput.value = result.openai_api_key;
        }
    });

    // Kaydet butonuna tıklandığında
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        
        if (apiKey) {
            chrome.storage.sync.set({ 'openai_api_key': apiKey }, () => {
                statusMessage.textContent = 'API anahtarı kaydedildi!';
                statusMessage.style.color = 'green';
                setTimeout(() => {
                    statusMessage.textContent = '';
                }, 3000);
            });
        } else {
            // Anahtar boşsa, depodan sil
            chrome.storage.sync.remove('openai_api_key', () => {
                statusMessage.textContent = 'API anahtarı kaldırıldı.';
                statusMessage.style.color = 'orange';
                 setTimeout(() => {
                    statusMessage.textContent = '';
                }, 3000);
            });
        }
    });

    // Panel göster/gizle butonuna tıklandığında
    togglePanelButton.addEventListener('click', () => {
        // Aktif ve bir YouTube video sayfası olan sekmeyi bul
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (activeTab && activeTab.url.includes("youtube.com/watch")) {
                // content.js'e mesaj gönder
                chrome.tabs.sendMessage(activeTab.id, { action: 'togglePanelVisibility' });
                window.close(); // Popup'ı kapat
            } else {
                statusMessage.textContent = 'Bu özellik sadece YouTube video sayfalarında çalışır.';
                statusMessage.style.color = 'red';
                setTimeout(() => {
                    statusMessage.textContent = '';
                }, 3000);
            }
        });
    });
}); 