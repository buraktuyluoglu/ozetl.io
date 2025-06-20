// Bu dosya artık kullanılmıyor ancak manifest.json'da referansı olduğu için
// şimdilik boş olarak bırakabiliriz veya referansı kaldırabiliriz.
// Şimdilik temizliyorum.

(function() {
    let ozetPanel = null;

    // Panelin görünürlük durumunu hafızada tut
    let isPanelVisible = true; 
    chrome.storage.sync.get('panelVisible', (data) => {
        isPanelVisible = data.panelVisible !== false; // Varsayılan: görünür
        if(isPanelVisible) {
            init(); // Eğer görünür olmalıysa paneli oluştur
        }
    });

    function init() {
        // Zaten eklenmişse tekrar ekleme
        if (document.getElementById('ozet-io-container')) return;

        // YouTube'un sağ panelini bul. Bazen #secondary, bazen #related. #secondary daha genel.
        const targetContainer = document.querySelector('#secondary');
        if (!targetContainer) return;

        const videoUrl = window.location.href;

        ozetPanel = document.createElement('div');
        ozetPanel.id = 'ozet-io-container';
        ozetPanel.innerHTML = `
            <div class="ozet-tabs">
                <button class="ozet-tab-button active" data-tab="transcript">Transkript</button>
                <button class="ozet-tab-button" data-tab="summary">Özet</button>
            </div>
            <div id="transcript-content" class="ozet-tab-content active">
                <p class="ozet-loading">Transkript yükleniyor...</p>
            </div>
            <div id="summary-content" class="ozet-tab-content">
                <p class="ozet-loading">Özet almak için yukarıdaki "Özet" sekmesine tıklayın.</p>
            </div>
        `;
        
        // Paneli, sağdaki listenin en başına ekle
        targetContainer.prepend(ozetPanel);

        const transcriptTab = ozetPanel.querySelector('[data-tab="transcript"]');
        const summaryTab = ozetPanel.querySelector('[data-tab="summary"]');
        const transcriptContent = ozetPanel.querySelector('#transcript-content');
        const summaryContent = ozetPanel.querySelector('#summary-content');

        function switchTab(tab) {
            transcriptTab.classList.remove('active');
            summaryTab.classList.remove('active');
            transcriptContent.classList.remove('active');
            summaryContent.classList.remove('active');

            tab.classList.add('active');
            if (tab.dataset.tab === 'transcript') {
                transcriptContent.classList.add('active');
            } else {
                summaryContent.classList.add('active');
                if (summaryContent.dataset.loaded !== 'true') {
                    getSummary();
                }
            }
        }
        transcriptTab.addEventListener('click', () => switchTab(transcriptTab));
        summaryTab.addEventListener('click', () => switchTab(summaryTab));

        async function getTranscript() {
            chrome.runtime.sendMessage({ action: 'getTranscript', video_url: videoUrl }, (response) => {
                if (response.error) {
                    transcriptContent.textContent = `Hata: ${response.error}`;
                } else {
                    transcriptContent.textContent = response.transcript;
                }
            });
        }

        async function getSummary() {
            summaryContent.innerHTML = '<p class="ozet-loading">Özet yükleniyor...</p>';
            chrome.runtime.sendMessage({ action: 'getSummary', video_url: videoUrl }, (response) => {
                if (response.error) {
                    summaryContent.textContent = `Hata: ${response.error}`;
                } else {
                    summaryContent.textContent = response.summary;
                }
                summaryContent.dataset.loaded = 'true';
            });
        }

        getTranscript();
    }

    // Gelen mesajları dinle
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'togglePanelVisibility') {
            isPanelVisible = !isPanelVisible;
            chrome.storage.sync.set({ panelVisible: isPanelVisible }); // Durumu kaydet
            if (isPanelVisible) {
                if (ozetPanel) {
                    ozetPanel.style.display = 'block';
                } else {
                    init(); // Panel hiç yoksa oluştur
                }
            } else {
                if (ozetPanel) {
                    ozetPanel.style.display = 'none';
                }
            }
        }
    });

    // Bu kısımlar olduğu gibi kalacak
    async function getTranscript() {
        chrome.runtime.sendMessage({ action: 'getTranscript', video_url: window.location.href }, (response) => {
            const transcriptContent = ozetPanel.querySelector('#transcript-content');
            if (response.error) {
                transcriptContent.textContent = `Hata: ${response.error}`;
            } else {
                transcriptContent.textContent = response.transcript;
            }
        });
    }

    async function getSummary() {
        const summaryContent = ozetPanel.querySelector('#summary-content');
        summaryContent.innerHTML = '<p class="ozet-loading">Özet yükleniyor...</p>';
        chrome.runtime.sendMessage({ action: 'getSummary', video_url: window.location.href }, (response) => {
            if (response.error) {
                summaryContent.textContent = `Hata: ${response.error}`;
            } else {
                summaryContent.textContent = response.summary;
            }
            summaryContent.dataset.loaded = 'true';
        });
    }

    function switchTab(tab) {
        const transcriptTab = ozetPanel.querySelector('[data-tab="transcript"]');
        const summaryTab = ozetPanel.querySelector('[data-tab="summary"]');
        const transcriptContent = ozetPanel.querySelector('#transcript-content');
        const summaryContent = ozetPanel.querySelector('#summary-content');

        transcriptTab.classList.remove('active');
        summaryTab.classList.remove('active');
        transcriptContent.classList.remove('active');
        summaryContent.classList.remove('active');

        tab.classList.add('active');
        if (tab.dataset.tab === 'transcript') {
            transcriptContent.classList.add('active');
        } else {
            summaryContent.classList.add('active');
            if (summaryContent.dataset.loaded !== 'true') {
                getSummary();
            }
        }
    }
})();
