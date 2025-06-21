// background.js
// Gelecekte anahtar yönetimi veya ek işlemler için kullanılabilir.

// Arka plan betiği, content.js ve backend arasında bir köprü görevi görecek.

async function fetchData(url, body) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        // fetch'in kendisi hata vermese bile, sunucu 4xx veya 5xx dönebilir.
        // Bu yüzden response.ok kontrolü önemli.
        if (!response.ok) {
            const errorData = await response.json();
            return { error: `Sunucu hatası: ${errorData.error || response.statusText}` };
        }
        return await response.json();
    } catch (e) {
        // Bu blok, ağ hatası veya SSL sorunu gibi durumlarda çalışır.
        console.error("Fetch hatası:", e);
        return { error: 'Backend sunucusuna ulaşılamadı. Sunucunun çalıştığından ve SSL sertifikasına güvenildiğinden emin olun.' };
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTranscript') {
        fetchData('http://localhost:5000/get_transcript', { video_url: request.video_url })
            .then(sendResponse);
    } else if (request.action === 'getSummary') {
        fetchData('http://localhost:5000/summarize', { video_url: request.video_url })
            .then(sendResponse);
    }
    
    // sendResponse'un asenkron olarak kullanılacağını belirtir.
    return true; 
});

// Eklenti ikonuna tıklandığında çalışacak yeni kod
chrome.action.onClicked.addListener((tab) => {
    // Sadece YouTube video sayfalarında çalışmasını sağla
    if (tab.url && tab.url.includes("youtube.com/watch")) {
        // content.js'e paneli aç/kapa mesajı gönder
        chrome.tabs.sendMessage(tab.id, { action: 'togglePanelVisibility' });
    }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Video Summary extension installed.');
}); 