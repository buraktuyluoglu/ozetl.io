// Bu dosya artık kullanılmıyor ancak manifest.json'da referansı olduğu için
// şimdilik boş olarak bırakabiliriz veya referansı kaldırabiliriz.
// Şimdilik temizliyorum.

(function() {
    // Panelin mevcut olup olmadığını ve durumunu takip etmek için değişkenler
    let ozetPanel = null;
    let isPanelVisible = true;

    // YouTube sayfasında URL değişikliğini (yeni videoya geçiş) dinle
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            // Yeni bir videoya geçildiğinde paneli yeniden başlat
            destroyPanel();
            init();
        }
    }).observe(document.body, { childList: true, subtree: true });

    // Panelin görünürlük durumunu hafızadan al
    chrome.storage.sync.get('panelVisible', (data) => {
        isPanelVisible = data.panelVisible !== false; // Varsayılan: görünür
        init(); // Paneli başlat
    });
    
    // Paneli DOM'dan kaldır
    function destroyPanel() {
        if (ozetPanel) {
            ozetPanel.remove();
            ozetPanel = null;
        }
    }

    // Paneli oluştur ve sayfaya ekle
    function init() {
        // YouTube'un sağ paneli yüklenene kadar bekle
        const interval = setInterval(() => {
            const targetContainer = document.querySelector('#secondary');
            if (targetContainer) {
                clearInterval(interval);
                // Zaten eklenmişse tekrar ekleme
                if (document.getElementById('ozet-io-container')) return;
                createPanel(targetContainer);
            }
        }, 500);
    }
    
    function createPanel(targetContainer) {
        const videoUrl = window.location.href;

        ozetPanel = document.createElement('div');
        ozetPanel.id = 'ozet-io-container';
        // Panelin görünürlük durumuna göre başlangıçta gizle/göster
        ozetPanel.style.display = isPanelVisible ? 'block' : 'none';

        // Daha modern ve işlevsel HTML yapısı
        ozetPanel.innerHTML = `
            <div class="ozet-header">
                <h3>AI Video Özetleyici</h3>
                <button id="toggle-panel-btn" title="Paneli Gizle/Göster">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                </button>
            </div>
            <div class="ozet-tabs">
                <button class="ozet-tab-button active" data-tab="transcript">Transkript</button>
                <button class="ozet-tab-button" data-tab="summary">Özet</button>
            </div>
            <div id="transcript-content" class="ozet-tab-content active">
                <div class="ozet-loading">Transkript yükleniyor...</div>
            </div>
            <div id="summary-content" class="ozet-tab-content">
                <div class="ozet-placeholder">Özet almak için yukarıdaki "Özet" sekmesine tıklayın.</div>
            </div>
            <div id="ozet-copy-feedback" class="ozet-copy-feedback">Kopyalandı!</div>
        `;
        
        targetContainer.prepend(ozetPanel);
        setupEventListeners(videoUrl);
        getTranscript(videoUrl); // Paneli ilk açılışta transkript ile doldur
    }

    // Tüm olay dinleyicilerini ayarla
    function setupEventListeners(videoUrl) {
        const transcriptTab = ozetPanel.querySelector('[data-tab="transcript"]');
        const summaryTab = ozetPanel.querySelector('[data-tab="summary"]');
        const toggleButton = ozetPanel.querySelector('#toggle-panel-btn');

        transcriptTab.addEventListener('click', () => switchTab('transcript'));
        summaryTab.addEventListener('click', () => {
            switchTab('summary');
            // Özet daha önce yüklenmediyse yükle
            if (ozetPanel.querySelector('#summary-content').dataset.loaded !== 'true') {
                getSummary(videoUrl);
            }
        });

        // Paneli gizle/göster butonu
        toggleButton.addEventListener('click', () => {
            const content = ozetPanel.querySelector('.ozet-tabs').nextElementSibling;
            const isCollapsed = ozetPanel.classList.toggle('collapsed');
            toggleButton.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }

    // Sekmeler arası geçiş
    function switchTab(tabName) {
        const tabs = ['transcript', 'summary'];
        tabs.forEach(tab => {
            ozetPanel.querySelector(`[data-tab="${tab}"]`).classList.remove('active');
            ozetPanel.querySelector(`#${tab}-content`).classList.remove('active');
        });
        ozetPanel.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        ozetPanel.querySelector(`#${tabName}-content`).classList.add('active');
    }
    
    // Kopyalama butonu oluşturucu
    function createCopyButton(textToCopy) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'ozet-copy-btn';
        copyBtn.title = 'İçeriği kopyala';
        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(textToCopy).then(() => {
                const feedback = ozetPanel.querySelector('#ozet-copy-feedback');
                feedback.classList.add('show');
                setTimeout(() => feedback.classList.remove('show'), 2000);
            });
        });
        return copyBtn;
    }

    // Transkripti al ve göster
    async function getTranscript(videoUrl) {
        const contentArea = ozetPanel.querySelector('#transcript-content');
        contentArea.innerHTML = '<div class="ozet-loading">Transkript yükleniyor...</div>';
        chrome.runtime.sendMessage({ action: 'getTranscript', video_url: videoUrl }, (response) => {
            if (response.error) {
                contentArea.innerHTML = `<div class="ozet-error">Hata: ${response.error}</div>`;
            } else {
                contentArea.innerHTML = ''; // Temizle
                const textNode = document.createElement('p');
                textNode.textContent = response.transcript;
                contentArea.appendChild(createCopyButton(response.transcript));
                contentArea.appendChild(textNode);
            }
        });
    }

    // Özeti al ve göster
    async function getSummary(videoUrl) {
        const contentArea = ozetPanel.querySelector('#summary-content');
        contentArea.innerHTML = '<div class="ozet-loading">Özet yükleniyor...</div>';
        contentArea.dataset.loaded = 'true'; // Tekrar istek atılmasını engelle
        
        chrome.runtime.sendMessage({ action: 'getSummary', video_url: videoUrl }, (response) => {
            if (response.error) {
                contentArea.innerHTML = `<div class="ozet-error">Hata: ${response.error}</div>`;
            } else {
                contentArea.innerHTML = ''; // Temizle
                const textNode = document.createElement('p');
                textNode.textContent = response.summary;
                contentArea.appendChild(createCopyButton(response.summary));
                contentArea.appendChild(textNode);
            }
        });
    }

    // Eklenti ikonuna tıklandığında paneli gizle/göster
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'togglePanelVisibility') {
            isPanelVisible = !isPanelVisible;
            chrome.storage.sync.set({ panelVisible: isPanelVisible }); // Durumu kaydet
            if (ozetPanel) {
                ozetPanel.style.display = isPanelVisible ? 'block' : 'none';
            }
        }
    });
})();
