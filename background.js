// Arka plan betiği (background.js)

// Eklenti ikonuna tıklandığında paneli göster/gizle
chrome.action.onClicked.addListener((tab) => {
    if (tab.url?.includes("youtube.com/watch")) {
        chrome.tabs.sendMessage(tab.id, { action: 'togglePanelVisibility' });
    }
});

// Content script'ten gelen mesajları dinle ve backend'e ilet
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTranscript') {
        fetch(`http://localhost:5000/get_transcript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_url: request.video_url }),
        })
        .then(response => response.json())
        .then(data => sendResponse(data))
        .catch(error => sendResponse({ error: error.message || 'Bir hata oluştu.' }));

    } else if (request.action === 'getSummary') {
        // Önce kaydedilmiş API anahtarını al
        chrome.storage.sync.get('openai_api_key', (data) => {
            const apiKey = data.openai_api_key;
            if (!apiKey) {
                sendResponse({ error: 'API_KEY_MISSING' });
                return;
            }

            fetch(`http://localhost:5000/summarize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ video_url: request.video_url }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorInfo => Promise.reject(errorInfo));
                }
                return response.json();
            })
            .then(data => sendResponse(data))
            .catch(error => sendResponse({ error: error.error || 'Sunucuya bağlanırken bir hata oluştu.' }));
        });
    }
    
    return true; // Asenkron yanıt için gereklidir
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Video Summary extension installed.');
}); 