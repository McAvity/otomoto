// ==UserScript==
// @name         Otomoto Camper Scraper
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Scrape camper data from otomoto.pl and send to backend for analysis
// @author       You
// @match        https://www.otomoto.pl/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        API_BASE_URL: 'http://127.0.0.1:8000/api',
        AUTO_SCRAPE: true,
        DEBUG: true
    };

    // Utility functions
    const log = (...args) => CONFIG.DEBUG && console.log('[Otomoto Scraper]', ...args);
    const error = (...args) => console.error('[Otomoto Scraper ERROR]', ...args);

    // API calls
    const apiRequest = (method, endpoint, data = null) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: `${CONFIG.API_BASE_URL}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json',
                },
                data: data ? JSON.stringify(data) : null,
                onload: (response) => {
                    try {
                        const result = JSON.parse(response.responseText);
                        resolve(result);
                    } catch (e) {
                        resolve(response.responseText);
                    }
                },
                onerror: (err) => {
                    error('API request failed:', err);
                    reject(err);
                }
            });
        });
    };

    // Send HTML page to backend for analysis
    const sendHTMLToBackend = async (pageType) => {
        try {
            const htmlData = {
                url: window.location.href,
                html: document.documentElement.outerHTML,
                page_type: pageType,
                user_agent: navigator.userAgent
            };

            const response = await apiRequest('POST', '/html-pages', htmlData);
            log(`HTML page sent to backend: ${response.page_id}`);
            return response.page_id;
        } catch (err) {
            error('Failed to send HTML to backend:', err);
            return null;
        }
    };

    // Page detection
    const detectPageType = () => {
        const url = window.location.href;

        if (url.includes('/dostawcze/kamper') && url.includes('search')) {
            return 'listing';
        } else if (url.includes('/dostawcze/') && !url.includes('search') && /\/[0-9]+$/.test(url)) {
            return 'detail';
        }
        return null;
    };

    // Extract listing ID from various sources
    const extractListingId = () => {
        // Try to find data-id attribute on article elements
        const article = document.querySelector('article[data-id]');
        if (article) {
            return article.getAttribute('data-id');
        }

        // Try to extract from URL for detail pages
        const urlMatch = window.location.href.match(/\/([0-9]+)$/);
        if (urlMatch) {
            return urlMatch[1];
        }

        // Try to find in page data or scripts
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            const content = script.textContent;
            if (content.includes('adId') || content.includes('ad_id')) {
                const idMatch = content.match(/"(?:adId|ad_id)"\s*:\s*"?([0-9]+)"?/);
                if (idMatch) {
                    return idMatch[1];
                }
            }
        }

        return null;
    };

    // Basic data extraction for testing
    const extractBasicData = (pageType) => {
        const data = {
            id: extractListingId(),
            url: window.location.href,
            title: document.title,
            price: null,
            currency: 'PLN'
        };

        if (pageType === 'detail') {
            // Extract price from title (format: "Używany Citroën Jumper 2008 - 62 000 PLN")
            const titleMatch = document.title.match(/(\d+\s*\d*)\s*PLN/);
            if (titleMatch) {
                data.price = parseInt(titleMatch[1].replace(/\s/g, ''));
            }

            // Extract vehicle title (remove price part)
            const cleanTitle = document.title.replace(/ - \d+.*PLN.*/, '').replace('Używany ', '');
            data.title = cleanTitle;
        }

        return data;
    };

    // UI Creation
    const createUI = () => {
        // Add CSS styles
        GM_addStyle(`
            #otomoto-scraper-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                background: white;
                border: 2px solid #007bff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
            }
            
            #otomoto-scraper-header {
                background: #007bff;
                color: white;
                padding: 10px;
                border-radius: 6px 6px 0 0;
                font-weight: bold;
                cursor: move;
            }
            
            #otomoto-scraper-content {
                padding: 15px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .scraper-button {
                background: #28a745;
                color: white;
                border: none;
                padding: 8px 12px;
                margin: 5px 0;
                border-radius: 4px;
                cursor: pointer;
                width: 100%;
                font-size: 12px;
            }
            
            .scraper-button:hover {
                background: #218838;
            }
            
            .scraper-button:disabled {
                background: #6c757d;
                cursor: not-allowed;
            }
            
            .scraper-status {
                margin: 10px 0;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .scraper-minimize {
                float: right;
                background: none;
                border: none;
                color: white;
                font-size: 16px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
            }
        `);

        // Create panel HTML
        const panel = document.createElement('div');
        panel.id = 'otomoto-scraper-panel';
        panel.innerHTML = `
            <div id="otomoto-scraper-header">
                Otomoto Scraper
                <button class="scraper-minimize" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
            <div id="otomoto-scraper-content">
                <div class="scraper-status" id="scraper-status">Initializing...</div>
                <button class="scraper-button" id="send-html-btn">Send HTML to Backend</button>
                <button class="scraper-button" id="extract-data-btn">Extract & Save Data</button>
                <button class="scraper-button" id="view-data-btn">View Saved Data</button>
                <div class="scraper-status" id="scraper-results"></div>
            </div>
        `;

        document.body.appendChild(panel);

        // Make panel draggable
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        panel.querySelector('#otomoto-scraper-header').addEventListener('mousedown', (e) => {
            isDragging = true;
            dragOffset.x = e.clientX - panel.offsetLeft;
            dragOffset.y = e.clientY - panel.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                panel.style.left = (e.clientX - dragOffset.x) + 'px';
                panel.style.top = (e.clientY - dragOffset.y) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        return panel;
    };

    // Main initialization
    const init = () => {
        log('Initializing Otomoto Scraper...');

        const pageType = detectPageType();
        log('Page type detected:', pageType);

        if (!pageType) {
            log('Not a camper page, skipping initialization');
            return;
        }

        const panel = createUI();
        const statusEl = document.getElementById('scraper-status');
        const resultsEl = document.getElementById('scraper-results');

        statusEl.textContent = `Page type: ${pageType}`;

        // Event handlers
        document.getElementById('send-html-btn').addEventListener('click', async () => {
            statusEl.textContent = 'Sending HTML to backend...';
            const pageId = await sendHTMLToBackend(pageType);
            if (pageId) {
                statusEl.textContent = `HTML sent successfully! Page ID: ${pageId}`;
            } else {
                statusEl.textContent = 'Failed to send HTML';
            }
        });

        document.getElementById('extract-data-btn').addEventListener('click', async () => {
            statusEl.textContent = 'Extracting data...';
            const data = extractBasicData(pageType);

            if (data.id) {
                try {
                    const response = await apiRequest('POST', '/campers', data);
                    statusEl.textContent = 'Data saved successfully!';
                    resultsEl.innerHTML = `<pre>${JSON.stringify(response, null, 2)}</pre>`;
                } catch (err) {
                    statusEl.textContent = 'Failed to save data';
                    error('Save failed:', err);
                }
            } else {
                statusEl.textContent = 'Could not extract listing ID';
            }
        });

        document.getElementById('view-data-btn').addEventListener('click', async () => {
            try {
                const campers = await apiRequest('GET', '/campers');
                resultsEl.innerHTML = `<p>Total campers: ${campers.length}</p>`;
                statusEl.textContent = 'Data loaded successfully';
            } catch (err) {
                statusEl.textContent = 'Failed to load data';
                error('Load failed:', err);
            }
        });

        // Auto-send HTML if enabled
        if (CONFIG.AUTO_SCRAPE) {
            setTimeout(() => {
                sendHTMLToBackend(pageType);
            }, 2000);
        }

        log('Scraper initialized successfully');
    };

    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();