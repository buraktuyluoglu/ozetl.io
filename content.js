(function() {
    let ozetPanel = null;
    let isPanelVisible = true;
    let currentUrl = window.location.href;

    // URL'deki değişikliği ve başlığın güncellenmesini izlemek için
    const observeTitleChanges = () => {
        const titleElement = document.querySelector('head > title');
        if (titleElement) {
            const observer = new MutationObserver(() => {
                if (window.location.href !== currentUrl) {
                    currentUrl = window.location.href;
                    // URL değişti, paneli yeniden başlat
                    const container = document.getElementById('ozet-io-container');
                    if (container) {
                        container.remove();
                    }
                    // Yeni video sayfası için paneli tekrar oluştur
                    setTimeout(init, 500); // YouTube'un DOM'u güncellemesi için kısa bir bekleme
                }
            });
            observer.observe(titleElement, { childList: true });
        } else {
            // head>title henüz yoksa, kısa bir süre sonra tekrar dene
            setTimeout(observeTitleChanges, 200);
        }
    };

    chrome.storage.sync.get('panelVisible', (data) => {
        isPanelVisible = data.panelVisible !== false;
        if (isPanelVisible) {
            init();
        }
        observeTitleChanges(); // URL değişikliklerini izlemeye başla
    });

    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'ozet-io-container';
        panel.innerHTML = `
            <div class="ozet-header">
                <h2 class="ozet-title">Video Asistanı</h2>
                <button id="toggle-visibility" class="ozet-header-button" title="Paneli Gizle/Göster">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7 14l5-5 5 5H7z"/></svg>
                </button>
            </div>
            <div class="ozet-panel-content">
                <div class="ozet-tabs">
                    <button class="ozet-tab-button active" data-tab="transcript">Transkript</button>
                    <button class="ozet-tab-button" data-tab="summary">Özet</button>
                </div>
                <div id="summary-content" class="ozet-tab-content">
                    <div class="ozet-loader"></div>
                </div>
                <div id="transcript-content" class="ozet-tab-content active">
                    <div class="ozet-loader"></div>
                </div>
            </div>
        `;
        return panel;
    }

    function init() {
        if (document.getElementById('ozet-io-container')) return;

        const targetContainer = document.querySelector('#secondary');
        if (!targetContainer) {
            setTimeout(init, 500);
            return;
        }

        ozetPanel = createPanel();
        targetContainer.prepend(ozetPanel);
        
        currentUrl = window.location.href; // URL'yi başlatırken de güncelle

        const videoUrl = window.location.href;
        const summaryTab = ozetPanel.querySelector('[data-tab="summary"]');
        const transcriptTab = ozetPanel.querySelector('[data-tab="transcript"]');
        const summaryContent = ozetPanel.querySelector('#summary-content');
        const transcriptContent = ozetPanel.querySelector('#transcript-content');
        const toggleButton = ozetPanel.querySelector('#toggle-visibility');
        const panelContent = ozetPanel.querySelector('.ozet-panel-content');

        const switchTab = (tab) => {
            const activeTab = tab.dataset.tab;

            summaryTab.classList.toggle('active', activeTab === 'summary');
            transcriptTab.classList.toggle('active', activeTab === 'transcript');
            summaryContent.classList.toggle('active', activeTab === 'summary');
            transcriptContent.classList.toggle('active', activeTab === 'transcript');

            if (activeTab === 'summary' && summaryContent.dataset.loaded !== 'true') {
                getSummary();
            }
        };

        summaryTab.addEventListener('click', () => switchTab(summaryTab));
        transcriptTab.addEventListener('click', () => switchTab(transcriptTab));

        toggleButton.addEventListener('click', () => {
             panelContent.style.display = panelContent.style.display === 'none' ? 'block' : 'none';
             const svg = toggleButton.querySelector('svg');
             svg.style.transform = panelContent.style.display === 'none' ? 'rotate(180deg)' : 'rotate(0deg)';
        });


        const addCopyToClipboard = (element, text) => {
            if (!element || !text) return;
            const copyButton = document.createElement('button');
            copyButton.className = 'ozet-copy-button';
            copyButton.textContent = 'Kopyala';
            copyButton.onclick = () => {
                navigator.clipboard.writeText(text).then(() => {
                    copyButton.textContent = 'Kopyalandı!';
                    setTimeout(() => { copyButton.textContent = 'Kopyala'; }, 2000);
                }, (err) => {
                    copyButton.textContent = 'Hata!';
                    console.error('Kopyalama hatası: ', err);
                });
            };
            element.appendChild(copyButton);
        };

        const getSummary = () => {
            chrome.runtime.sendMessage({ action: 'getSummary', video_url: videoUrl }, (response) => {
                if(!summaryContent) return; // Panel kaldırılmış olabilir
                summaryContent.innerHTML = '';
                if (response.error) {
                    summaryContent.textContent = `Hata: ${response.error}`;
                } else {
                    const p = document.createElement('p');
                    p.textContent = response.summary;
                    summaryContent.appendChild(p);
                    addCopyToClipboard(summaryContent, response.summary);
                }
                summaryContent.dataset.loaded = 'true';
            });
        };

        const getTranscript = () => {
            if(!transcriptContent) return; // Panel kaldırılmış olabilir
            transcriptContent.innerHTML = '';
            chrome.runtime.sendMessage({ action: 'getTranscript', video_url: videoUrl }, (response) => {
                if(!transcriptContent) return; // Panel kaldırılmış olabilir
                transcriptContent.innerHTML = '';
                if (response.error) {
                    transcriptContent.textContent = `Hata: ${response.error}`;
                } else {
                    const p = document.createElement('p');
                    p.textContent = response.transcript;
                    transcriptContent.appendChild(p);
                    addCopyToClipboard(transcriptContent, response.transcript);
                }
                transcriptContent.dataset.loaded = 'true';
            });
        };
        
        getTranscript(); // Paneli ilk transkript ile başlat
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // 'navigate' mesajını artık content script kendi yönettiği için silebiliriz
        // ama diğer mesajlar için kalabilir.
        if (request.action === 'togglePanelVisibility') {
            isPanelVisible = !isPanelVisible;
            chrome.storage.sync.set({ panelVisible: isPanelVisible });
            const container = document.getElementById('ozet-io-container');
            if (container) {
                 container.style.display = isPanelVisible ? 'block' : 'none';
            } else if (isPanelVisible) {
                init();
            }
        }
        // Asenkron bir işlem varsa true dönmek iyi bir pratiktir, şimdilik gerekmese de.
        return true; 
    });

})();
