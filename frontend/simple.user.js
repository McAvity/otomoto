// ==UserScript==
// @name         Otomoto Backend Message Display
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Shows messages from backend API in a floating window
// @author       Claude
// @match        https://www.otomoto.pl/dostawcze/oferta/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const API_BASE_URL = 'http://127.0.0.1:8000';
    
    // Global variables for rating
    let currentRating = 0;
    let extractedCarData = null;
    
    // Data extraction configuration
    const extractionConfig = {
        car_name: 'h1.offer-title',
        car_type_status: 'p.e1kkw2jt0',
        year: 'p.eur4qwl9',
        price: 'span.offer-price__number',
        phone: 'span.n-button-text-wrapper',
        location: 'p.ef0vquw1',
        mileage: 'p.ez0zock2',
        fuel: 'p.ez0zock2',
        transmission: 'p.ez0zock2',
        vehicle_type: 'p.ez0zock2',
        cubic_capacity: 'p.ez0zock2',
        description: 'div.ooa-unlmzs.e11t9j224',
        brand: 'p.eur4qwl9',
        model: 'p.eur4qwl9',
        vin: 'p.ed2m2uu0'
    };
    
    // Create floating window
    function createFloatingWindow() {
        const floatingDiv = document.createElement('div');
        floatingDiv.id = 'otomoto-floating-window';
        floatingDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
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
        header.textContent = 'Car Data Extractor';
        
        const content = document.createElement('div');
        content.id = 'otomoto-message-content';
        content.style.cssText = `
            line-height: 1.4;
            word-wrap: break-word;
        `;
        content.textContent = 'Loading...';
        
        // Notes text area
        const notesLabel = document.createElement('div');
        notesLabel.textContent = 'Notes:';
        notesLabel.style.cssText = `
            font-weight: bold;
            margin-top: 10px;
            margin-bottom: 5px;
            font-size: 12px;
        `;
        
        const notesTextArea = document.createElement('textarea');
        notesTextArea.id = 'otomoto-notes';
        notesTextArea.placeholder = 'Add your notes about this car...';
        notesTextArea.style.cssText = `
            width: 100%;
            height: 60px;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 5px;
            font-size: 12px;
            resize: vertical;
            font-family: Arial, sans-serif;
        `;
        
        // Car grading system
        const gradeLabel = document.createElement('div');
        gradeLabel.textContent = 'Grade:';
        gradeLabel.style.cssText = `
            font-weight: bold;
            margin-top: 10px;
            margin-bottom: 5px;
            font-size: 12px;
        `;
        
        const gradeContainer = document.createElement('div');
        gradeContainer.style.cssText = `
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
        `;
        
        // Create star rating system
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('span');
            star.innerHTML = '☆';
            star.style.cssText = `
                font-size: 20px;
                cursor: pointer;
                color: #ddd;
                user-select: none;
            `;
            star.onclick = () => setRating(i);
            star.onmouseover = () => highlightStars(i);
            star.onmouseout = () => resetStarHighlight();
            star.dataset.rating = i;
            gradeContainer.appendChild(star);
        }
        
        // Retry extraction button
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry Extraction';
        retryButton.id = 'otomoto-retry-button';
        retryButton.style.cssText = `
            background: #ffc107;
            color: #212529;
            border: none;
            padding: 6px 10px;
            margin-top: 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            width: 100%;
            display: none;
        `;
        retryButton.onclick = () => {
            extractedCarData = null;
            extractAndSaveData();
        };

        // Save button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Notes & Grade';
        saveButton.id = 'otomoto-save-button';
        saveButton.style.cssText = `
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 12px;
            margin-top: 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            width: 100%;
        `;
        saveButton.onclick = saveNotesAndGrade;
        
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
        floatingDiv.appendChild(notesLabel);
        floatingDiv.appendChild(notesTextArea);
        floatingDiv.appendChild(gradeLabel);
        floatingDiv.appendChild(gradeContainer);
        floatingDiv.appendChild(retryButton);
        floatingDiv.appendChild(saveButton);
        
        return floatingDiv;
    }
    
    // Star rating functions
    function setRating(rating) {
        currentRating = rating;
        updateStarDisplay();
    }
    
    function highlightStars(rating) {
        const stars = document.querySelectorAll('[data-rating]');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.style.color = '#ffc107';
                star.innerHTML = '★';
            } else {
                star.style.color = '#ddd';
                star.innerHTML = '☆';
            }
        });
    }
    
    function resetStarHighlight() {
        updateStarDisplay();
    }
    
    function updateStarDisplay() {
        const stars = document.querySelectorAll('[data-rating]');
        stars.forEach((star, index) => {
            if (index < currentRating) {
                star.style.color = '#ffc107';
                star.innerHTML = '★';
            } else {
                star.style.color = '#ddd';
                star.innerHTML = '☆';
            }
        });
    }
    
    // Load existing user data from backend
    async function loadExistingUserData() {
        try {
            // Extract car ID from URL (format: ...ID6HvgDG.html)
            const currentUrl = window.location.href;
            const carIdMatch = currentUrl.match(/ID([A-Za-z0-9]+)/);
            
            if (!carIdMatch) {
                console.log('No car ID found in URL:', currentUrl);
                return { user_notes: '', user_grade: 0 };
            }
            
            const carId = 'ID' + carIdMatch[1];
            console.log('Looking for existing data for car ID:', carId);
            
            const response = await fetch(`${API_BASE_URL}/get-existing-data/${carId}`);
            
            if (!response.ok) {
                console.warn('Could not load existing data, response not ok:', response.status);
                return { user_notes: '', user_grade: 0 };
            }
            
            const data = await response.json();
            console.log('Backend response:', data);
            
            if (data.status === 'found') {
                console.log('Loaded existing user data from:', data.filename);
                return {
                    user_notes: data.user_notes || '',
                    user_grade: data.user_grade || 0,
                    last_saved: data.last_saved
                };
            } else {
                console.log('No existing data found for car ID:', carId);
            }
            
            return { user_notes: '', user_grade: 0 };
        } catch (error) {
            console.warn('Failed to load existing user data:', error);
            return { user_notes: '', user_grade: 0 };
        }
    }
    
    // Extract data from page
    async function extractPageData() {
        const extractedData = {};
        
        // Extract basic fields
        extractedData.car_name = getTextContent(extractionConfig.car_name);
        extractedData.price = getTextContent(extractionConfig.price);
        extractedData.location = getTextContent(extractionConfig.location);
        extractedData.description = getTextContent(extractionConfig.description);
        
        // Try to reveal and extract phone number and VIN
        extractedData.phone = await extractPhoneNumber();
        extractedData.vin = await extractVIN();
        
        // Parse compound field (car_type_status contains: "Używany", year, "Do negocjacji")
        const carTypeStatus = getTextContent(extractionConfig.car_type_status);
        const statusParts = carTypeStatus.split(' • ').map(s => s.trim());
        extractedData.car_type = statusParts[0] || '';
        extractedData.year = getTextContent(extractionConfig.year);
        extractedData.negotiable = statusParts.find(part => part.includes('negocjacji')) || '';
        
        // Extract parameters (mileage, fuel, transmission, etc.)
        const parameterElements = document.querySelectorAll(extractionConfig.mileage);
        const parameters = Array.from(parameterElements).map(el => el.textContent.trim());
        
        // Identify parameters by content patterns
        extractedData.mileage = parameters.find(p => p.includes('km') || /^\d+\s*\d*\s*\d*\s*km?$/.test(p)) || '';
        extractedData.fuel = parameters.find(p => /diesel|benzyna|gaz|elektryczny/i.test(p)) || '';
        extractedData.transmission = parameters.find(p => /automatyczna|manualna|automatyk|manual/i.test(p)) || '';
        extractedData.vehicle_type = parameters.find(p => /kamper|dostawczy|osobowy/i.test(p)) || '';
        extractedData.cubic_capacity = parameters.find(p => /^\d+\s*\d*\s*cm3?$|^\d+\s*\d*$/.test(p) && !p.includes('km')) || '';
        
        // Extract brand and model (often in same elements)
        const brandModelElements = document.querySelectorAll(extractionConfig.brand);
        const brandModelTexts = Array.from(brandModelElements).map(el => el.textContent.trim());
        extractedData.brand = brandModelTexts.find(text => /mercedes|bmw|audi|volkswagen|ford|opel/i.test(text)) || '';
        extractedData.model = brandModelTexts.find(text => text !== extractedData.brand && text.length > 2) || '';
        
        return extractedData;
    }
    
    // Helper function to get text content safely
    function getTextContent(selector) {
        try {
            const element = document.querySelector(selector);
            return element ? element.textContent.trim() : '';
        } catch (error) {
            console.warn(`Failed to extract data for selector ${selector}:`, error);
            return '';
        }
    }
    
    // Extract phone number by clicking the reveal button
    async function extractPhoneNumber() {
        try {
            console.log('Starting phone number extraction...');
            
            // Wait a bit more for buttons to be fully loaded
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Look for the "Wyświetl numer" button with more comprehensive search
            const buttons = document.querySelectorAll('button, a, div[role="button"]');
            let showNumberButton = null;
            
            console.log(`Found ${buttons.length} clickable elements to check`);
            
            for (const button of buttons) {
                const buttonText = button.textContent.trim().toLowerCase();
                const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
                
                // Check for various forms of "show number" text
                if ((buttonText.includes('wyświetl') && buttonText.includes('numer')) ||
                    (buttonText.includes('pokaż') && buttonText.includes('numer')) ||
                    buttonText.includes('wyświetl numer') ||
                    ariaLabel.includes('wyświetl numer') ||
                    ariaLabel.includes('phone') ||
                    buttonText.includes('show number')) {
                    
                    showNumberButton = button;
                    console.log('Found phone button:', buttonText, 'aria-label:', ariaLabel);
                    break;
                }
            }
            
            // Also try more specific selectors for otomoto
            if (!showNumberButton) {
                const selectors = [
                    '.ed4qow41',
                    'button[class*="phone"]',
                    'button[class*="number"]',
                    '[data-testid*="phone"] button',
                    'button[aria-label*="numer"]',
                    'a[class*="phone"]',
                    '.ooa-1gi0yxa', // Common otomoto button class
                    'button:has(.n-button-text-wrapper)'
                ];
                
                for (const selector of selectors) {
                    try {
                        const element = document.querySelector(selector);
                        if (element && element.textContent.toLowerCase().includes('wyświetl')) {
                            showNumberButton = element;
                            console.log('Found phone button via selector:', selector);
                            break;
                        }
                    } catch (e) {
                        // Ignore selector errors
                    }
                }
            }
            
            if (showNumberButton) {
                console.log('Clicking phone reveal button...');
                
                // Scroll to button and ensure it's visible
                showNumberButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try different click methods
                try {
                    showNumberButton.click();
                } catch (e) {
                    // Fallback to programmatic click
                    const clickEvent = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    showNumberButton.dispatchEvent(clickEvent);
                }
                
                console.log('Waiting for phone number to be revealed...');
                // Wait longer for phone number to be revealed
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Now try to extract the phone number from multiple possible locations
                const phoneSelectors = [
                    extractionConfig.phone,
                    '[data-testid*="phone"]',
                    '.n-button-text-wrapper',
                    'a[href^="tel:"]',
                    '.phone-number',
                    '.contact-phone'
                ];
                
                for (const selector of phoneSelectors) {
                    try {
                        const phoneElement = document.querySelector(selector);
                        if (phoneElement) {
                            const phoneText = phoneElement.textContent.trim();
                            console.log(`Checking selector ${selector}:`, phoneText);
                            
                            // Look for phone number pattern (improved regex)
                            const phoneMatch = phoneText.match(/\b[\d\s\-\+\(\)]{9,}\b/);
                            if (phoneMatch) {
                                const cleanPhone = phoneMatch[0].replace(/\s+/g, ' ').trim();
                                console.log('Extracted phone number:', cleanPhone);
                                return cleanPhone;
                            }
                        }
                    } catch (e) {
                        // Continue to next selector
                    }
                }
                
                // Check if the button itself now shows the number
                const buttonText = showNumberButton.textContent.trim();
                const buttonPhoneMatch = buttonText.match(/\b[\d\s\-\+\(\)]{9,}\b/);
                if (buttonPhoneMatch) {
                    const cleanPhone = buttonPhoneMatch[0].replace(/\s+/g, ' ').trim();
                    console.log('Found phone in button text:', cleanPhone);
                    return cleanPhone;
                }
                
                console.log('No phone number found after clicking button');
            } else {
                console.log('No "Wyświetl numer" button found');
            }
            
            // Fallback: try to get phone number without clicking
            const fallbackPhone = getTextContent(extractionConfig.phone);
            if (fallbackPhone) {
                console.log('Fallback phone extraction:', fallbackPhone);
                return fallbackPhone;
            }
            
            console.log('No phone number extracted');
            return '';
            
        } catch (error) {
            console.error('Failed to extract phone number:', error);
            return '';
        }
    }
    
    // Extract VIN by clicking the reveal link
    async function extractVIN() {
        try {
            console.log('Starting VIN extraction...');
            
            // Wait a bit more for links to be fully loaded
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Look for the "Wyświetl VIN" link with comprehensive search
            const links = document.querySelectorAll('a, button, div[role="button"], span[role="button"]');
            let showVinLink = null;
            
            console.log(`Found ${links.length} clickable elements to check for VIN`);
            
            for (const link of links) {
                const linkText = link.textContent.trim().toLowerCase();
                const ariaLabel = (link.getAttribute('aria-label') || '').toLowerCase();
                
                // Check for various forms of "show VIN" text
                if ((linkText.includes('wyświetl') && linkText.includes('vin')) ||
                    linkText.includes('wyświetl vin') ||
                    (linkText.includes('pokaż') && linkText.includes('vin')) ||
                    ariaLabel.includes('wyświetl vin') ||
                    ariaLabel.includes('show vin')) {
                    
                    showVinLink = link;
                    console.log('Found VIN link:', linkText, 'aria-label:', ariaLabel);
                    break;
                }
            }
            
            // Also try specific selectors for VIN
            if (!showVinLink) {
                const selectors = [
                    'a[href*="vin"]',
                    'button[class*="vin"]',
                    '[data-testid*="vin"]',
                    'a[class*="vin"]',
                    '.vin-link',
                    '.show-vin'
                ];
                
                for (const selector of selectors) {
                    try {
                        const element = document.querySelector(selector);
                        if (element && element.textContent.toLowerCase().includes('wyświetl')) {
                            showVinLink = element;
                            console.log('Found VIN link via selector:', selector);
                            break;
                        }
                    } catch (e) {
                        // Ignore selector errors
                    }
                }
            }
            
            if (showVinLink) {
                console.log('Clicking VIN reveal link...');
                
                // Scroll to link and ensure it's visible
                showVinLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try different click methods
                try {
                    showVinLink.click();
                } catch (e) {
                    // Fallback to programmatic click
                    const clickEvent = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    showVinLink.dispatchEvent(clickEvent);
                }
                
                console.log('Waiting for VIN to be revealed...');
                // Wait for VIN to be revealed
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Now try to extract the VIN from multiple possible locations
                const vinSelectors = [
                    extractionConfig.vin,
                    '[data-testid*="vin"]',
                    '.vin-number',
                    '.vehicle-vin',
                    '.vin-value',
                    '.vin-code'
                ];
                
                for (const selector of vinSelectors) {
                    try {
                        const vinElement = document.querySelector(selector);
                        if (vinElement) {
                            const vinText = vinElement.textContent.trim();
                            console.log(`Checking VIN selector ${selector}:`, vinText);
                            
                            // Look for VIN pattern (17 alphanumeric characters)
                            const vinMatch = vinText.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i);
                            if (vinMatch) {
                                const vin = vinMatch[0].toUpperCase();
                                console.log('Extracted VIN:', vin);
                                return vin;
                            }
                            
                            // Also check for masked VIN pattern (XXXXXXXXXXXXXXXXX)
                            const maskedVinMatch = vinText.match(/X{17}/);
                            if (maskedVinMatch) {
                                console.log('Found masked VIN:', maskedVinMatch[0]);
                                return maskedVinMatch[0];
                            }
                        }
                    } catch (e) {
                        // Continue to next selector
                    }
                }
                
                // Check if the link itself now shows the VIN
                const linkText = showVinLink.textContent.trim();
                const linkVinMatch = linkText.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i);
                if (linkVinMatch) {
                    const vin = linkVinMatch[0].toUpperCase();
                    console.log('Found VIN in link text:', vin);
                    return vin;
                }
                
                // Check for masked VIN in link
                const linkMaskedVinMatch = linkText.match(/X{17}/);
                if (linkMaskedVinMatch) {
                    console.log('Found masked VIN in link text:', linkMaskedVinMatch[0]);
                    return linkMaskedVinMatch[0];
                }
                
                console.log('No VIN found after clicking link');
            } else {
                console.log('No "Wyświetl VIN" link found');
            }
            
            // Fallback: try to get VIN without clicking
            const fallbackVin = getTextContent(extractionConfig.vin);
            if (fallbackVin) {
                console.log('Fallback VIN extraction:', fallbackVin);
                return fallbackVin;
            }
            
            console.log('No VIN extracted');
            return '';
            
        } catch (error) {
            console.error('Failed to extract VIN:', error);
            return '';
        }
    }
    
    // Send data to backend
    async function sendToBackend(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Failed to send data to ${endpoint}:`, error);
            throw error;
        }
    }
    
    // Wait for page to be fully ready
    async function waitForPageReady() {
        // Wait for document to be ready
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    document.addEventListener('readystatechange', () => {
                        if (document.readyState === 'complete') {
                            resolve();
                        }
                    }, { once: true });
                }
            });
        }
        
        // Additional wait for dynamic content to load
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Main extraction function (now automatic with user data loading)
    async function extractAndSaveData() {
        const contentElement = document.getElementById('otomoto-message-content');
        if (!contentElement) return;
        
        try {
            contentElement.textContent = 'Waiting for page to load...';
            
            // Wait for page to be fully ready
            await waitForPageReady();
            
            contentElement.textContent = 'Extracting data...';
            
            // Extract fresh structured data
            extractedCarData = await extractPageData();
            
            // Load existing user data
            contentElement.textContent = 'Loading previous notes...';
            const existingUserData = await loadExistingUserData();
            
            // Populate UI with existing data
            const notesTextArea = document.getElementById('otomoto-notes');
            if (notesTextArea && existingUserData.user_notes) {
                notesTextArea.value = existingUserData.user_notes;
            }
            
            if (existingUserData.user_grade > 0) {
                currentRating = existingUserData.user_grade;
                updateStarDisplay();
            }
            
            // Show extracted data summary
            const carName = extractedCarData.car_name || 'Unknown Car';
            const price = extractedCarData.price || 'Price not found';
            const location = extractedCarData.location || 'Location not found';
            const phone = extractedCarData.phone || 'No phone';
            const vin = extractedCarData.vin || 'No VIN';
            
            const lastSavedText = existingUserData.last_saved ? 
                `<br><em>Last saved: ${new Date(existingUserData.last_saved).toLocaleString()}</em>` : '';
            
            contentElement.innerHTML = `
                <div style="color: green; font-weight: bold;">✅ Data Extracted!</div>
                <div style="font-size: 11px; margin-top: 5px; background: #f8f9fa; padding: 5px; border-radius: 3px;">
                    <strong>${carName}</strong><br>
                    💰 ${price}<br>
                    📞 ${phone}<br>
                    🔢 ${vin}<br>
                    📍 ${location}<br>
                    <em>Found ${Object.keys(extractedCarData).length} fields</em>${lastSavedText}
                </div>
            `;
            
            // Show retry button if phone or VIN extraction failed
            const retryButton = document.getElementById('otomoto-retry-button');
            if (retryButton && ((phone === 'No phone') || (vin === 'No VIN'))) {
                retryButton.style.display = 'block';
                retryButton.textContent = 'Retry Phone/VIN Extraction';
            }
            
        } catch (error) {
            contentElement.innerHTML = `
                <div style="color: red; font-weight: bold;">❌ Extraction Failed</div>
                <div style="font-size: 12px; margin-top: 5px;">
                    Error: ${error.message}
                </div>
            `;
        }
    }
    
    // Save notes and grade function
    async function saveNotesAndGrade() {
        const contentElement = document.getElementById('otomoto-message-content');
        const notesTextArea = document.getElementById('otomoto-notes');
        const saveButton = document.getElementById('otomoto-save-button');
        
        if (!extractedCarData) {
            contentElement.innerHTML = `
                <div style="color: red; font-weight: bold;">❌ No data to save</div>
                <div style="font-size: 12px; margin-top: 5px;">
                    Please wait for data extraction to complete.
                </div>
            `;
            return;
        }
        
        try {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            
            const notes = notesTextArea.value.trim();
            const grade = currentRating;
            const timestamp = new Date().toISOString();
            
            // Add user input to extracted data
            const finalData = {
                ...extractedCarData,
                user_notes: notes,
                user_grade: grade,
                user_timestamp: timestamp
            };
            
            // Prepare data for backend
            const dataPayload = {
                url: window.location.href,
                timestamp: timestamp,
                data: finalData
            };
            
            // Save extracted data with notes and grade
            const dataResult = await sendToBackend('/save-extracted-data', dataPayload);
            
            // Save HTML
            const htmlPayload = {
                url: window.location.href,
                html_content: document.documentElement.outerHTML
            };
            await sendToBackend('/save-html', htmlPayload);
            
            // Show success message
            const gradeText = grade > 0 ? `⭐ ${grade}/5 stars` : 'No rating';
            const notesText = notes ? `📝 Notes saved` : 'No notes';
            
            contentElement.innerHTML = `
                <div style="color: green; font-weight: bold;">✅ Saved Successfully!</div>
                <div style="font-size: 11px; margin-top: 5px; background: #f8f9fa; padding: 5px; border-radius: 3px;">
                    ${gradeText}<br>
                    ${notesText}<br>
                    <em>File: ${dataResult.filename || 'saved'}</em>
                </div>
            `;
            
            saveButton.textContent = '✅ Saved';
            
        } catch (error) {
            contentElement.innerHTML = `
                <div style="color: red; font-weight: bold;">❌ Save Failed</div>
                <div style="font-size: 12px; margin-top: 5px;">
                    Error: ${error.message}
                </div>
            `;
            
            saveButton.disabled = false;
            saveButton.textContent = 'Save Notes & Grade';
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
        
        // Wait longer for the window to be added, then automatically extract data
        // Especially important when page is opened in background tab
        setTimeout(() => {
            extractAndSaveData();
        }, 3000);
        
        // Also listen for when the tab becomes visible (user switches to it)
        // This helps with pages opened in background tabs
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !extractedCarData) {
                console.log('Tab became visible, retrying extraction...');
                setTimeout(() => {
                    extractAndSaveData();
                }, 1000);
            }
        });
    }
    
    // Start the script
    init();
})();