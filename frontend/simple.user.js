// ==UserScript==
// @name         Otomoto Backend Message Display
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Shows messages from backend API in a floating window
// @author       Claude
// @match        https://www.otomoto.pl/dostawcze/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const API_BASE_URL = 'http://127.0.0.1:8000';
    
    // Create floating window
    function createFloatingWindow() {
        const floatingDiv = document.createElement('div');
        floatingDiv.id = 'otomoto-floating-window';
        floatingDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            min-height: 100px;
            background: #ffffff;
            border: 2px solid #007bff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            padding: 15px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            color: #333;
        `;
        
        const header = document.createElement('div');
        header.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
            color: #007bff;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 8px;
        `;
        header.textContent = 'Backend Message';
        
        const content = document.createElement('div');
        content.id = 'otomoto-message-content';
        content.style.cssText = `
            line-height: 1.4;
            word-wrap: break-word;
        `;
        content.textContent = 'Loading...';
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 5px;
            right: 8px;
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeButton.onclick = () => floatingDiv.remove();
        
        floatingDiv.appendChild(closeButton);
        floatingDiv.appendChild(header);
        floatingDiv.appendChild(content);
        
        return floatingDiv;
    }
    
    // Fetch message from backend
    async function fetchMessage() {
        try {
            const response = await fetch(`${API_BASE_URL}/message`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return data.message;
        } catch (error) {
            console.error('Failed to fetch message:', error);
            return `Error: ${error.message}`;
        }
    }
    
    // Initialize the script
    async function init() {
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        // Remove existing floating window if any
        const existing = document.getElementById('otomoto-floating-window');
        if (existing) {
            existing.remove();
        }
        
        // Create and add floating window
        const floatingWindow = createFloatingWindow();
        document.body.appendChild(floatingWindow);
        
        // Fetch and display message
        const message = await fetchMessage();
        const contentElement = document.getElementById('otomoto-message-content');
        if (contentElement) {
            contentElement.textContent = message;
        }
    }
    
    // Start the script
    init();
})();