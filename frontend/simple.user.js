// ==UserScript==
// @name         Otomoto Backend Message Display
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Shows messages from backend API in a floating window
// @author       Claude
// @match        https://www.otomoto.pl/dostawcze/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
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
            height: 200px;
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
        saveButton.textContent = 'Update Notes & Grade';
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
        $('[data-rating]').each(function(index) {
            if (index < rating) {
                $(this).css('color', '#ffc107').html('★');
            } else {
                $(this).css('color', '#ddd').html('☆');
            }
        });
    }
    
    function resetStarHighlight() {
        updateStarDisplay();
    }
    
    function updateStarDisplay() {
        $('[data-rating]').each(function(index) {
            if (index < currentRating) {
                $(this).css('color', '#ffc107').html('★');
            } else {
                $(this).css('color', '#ddd').html('☆');
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
                    user_grade: data.user_grade || 0
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

    // convert date from "DD Month YYYY" to "DD.MM.YYYY" format
    function formatDate(dateString) {
        if (!dateString || typeof dateString !== 'string' || dateString.length < 10) {
            return dateString;
        }
        
        const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
            'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
        const dateParts = dateString.split(' ');
        const day = dateParts[0];
        const month = dateParts[1].toLowerCase();
        const year = dateParts[2];

        const monthIndex = months.indexOf(month);

        if (monthIndex === -1) {
            console.warn('Invalid month found in date string:', month);
            return dateString;  // Return original string if month is invalid
        }

        // Pad day and month with leading zero if needed
        const paddedDay = day.padStart(2, '0');
        const paddedMonth = String(monthIndex + 1).padStart(2, '0');
        return `${paddedDay}.${paddedMonth}.${year}`;
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

        // Parse compound field (car_type_status contains: "Używany", "Do negocjacji")
        const carTypeStatus = getTextContent(extractionConfig.car_type_status);
        const statusParts = carTypeStatus.split(' • ').map(s => s.trim());
        extractedData.car_type = statusParts[0] || '';
        extractedData.negotiable = statusParts.find(part => part.includes('negocjacji')) || '';
        
        // Extract parameters (mileage, fuel, transmission, etc.)
        const parameters = $(extractionConfig.mileage).map(function() {
            return $(this).text().trim();
        }).get();
        
        // Identify parameters by content patterns
        extractedData.mileage = parameters.find(p => p.includes('km') || /^\d+\s*\d*\s*\d*\s*km?$/.test(p)) || '';
        extractedData.fuel = parameters.find(p => /diesel|benzyna|gaz|elektryczny/i.test(p)) || '';
        extractedData.transmission = parameters.find(p => /automatyczna|manualna|automatyk|manual/i.test(p)) || '';
        extractedData.vehicle_type = parameters.find(p => /kamper|dostawczy|osobowy/i.test(p)) || '';
        extractedData.cubic_capacity = parameters.find(p => /^\d+\s*\d*\s*cm3?$|^\d+\s*\d*$/.test(p) && !p.includes('km')) || '';
        
        // Extract brand, model, and year using label-based approach
        extractedData.brand = getValueByLabel('Marka pojazdu');
        extractedData.model = getValueByLabel('Model pojazdu');
        extractedData.registration_number = getValueByLabel("Numer rejestracyjny pojazdu");
        extractedData.first_registration_date = formatDate(getValueByLabel("Data pierwszej rejestracji w historii pojazdu"));
        // extractedData.vin = getValueByLabel("VIN");

        const yearFromLabel = getValueByLabel('Rok produkcji');
        
        // Use label-based year if found, otherwise fall back to original method
        if (yearFromLabel) {
            extractedData.year = yearFromLabel;
        } else {
            extractedData.year = getTextContent(extractionConfig.year);
        }
        
        // If brand/model extraction failed, fall back to original method
        if (!extractedData.brand || !extractedData.model) {
            const brandModelTexts = $(extractionConfig.brand).map(function() {
                return $(this).text().trim();
            }).get();
            
            if (!extractedData.brand) {
                extractedData.brand = brandModelTexts.find(text => /mercedes|bmw|audi|volkswagen|ford|opel|citroen|renault|peugeot|fiat|iveco|man|volvo|scania|daf/i.test(text)) || '';
            }
            
            if (!extractedData.model) {
                extractedData.model = brandModelTexts.find(text => text !== extractedData.brand && text.length > 2) || '';
            }
        }

        if(extractedData.vin && extractedData.registration_number && extractedData.first_registration_date) {
            extractedData.user_notes = `${extractedData.vin}\n${extractedData.registration_number}\n${extractedData.first_registration_date}`;
        }
        
        return extractedData;
    }
    
    // Helper function to get text content safely using jQuery
    function getTextContent(selector) {
        try {
            return $(selector).first().text().trim() || '';
        } catch (error) {
            console.warn(`Failed to extract data for selector ${selector}:`, error);
            return '';
        }
    }
    
    // Helper function to find value next to a specific label using jQuery
    function getValueByLabel(labelText) {
        try {
            console.log(`Looking for label: "${labelText}"`);
            
            // Find <p> elements that contain the exact label text
            const $labelParagraphs = $('p').filter(function() {
                return $(this).text().trim() === labelText;
            });
            
            if ($labelParagraphs.length > 0) {
                console.log(`Found ${$labelParagraphs.length} <p> element(s) with label "${labelText}"`);
                
                // Try each matching paragraph
                for (let i = 0; i < $labelParagraphs.length; i++) {
                    const $labelP = $labelParagraphs.eq(i);
                    
                    // Strategy 1: Next sibling <p>
                    const valueText = $labelP.parent().next().text().trim();
                    if (valueText) {
                        console.log(`Found ${labelText} value in next <p>:`, valueText);
                        return valueText;
                    }                    
                }
            }
            
            console.log(`Label "${labelText}" not found in any <p> element`);
            return '';
        } catch (error) {
            console.warn(`Failed to extract value for label "${labelText}":`, error);
            return '';
        }
    }
    
    // Extract phone number by clicking the reveal button
    async function extractPhoneNumber() {
        try {
            console.log('Starting phone number extraction...');
            
            // Wait a bit more for buttons to be fully loaded
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Look for the "Wyświetl numer" button with jQuery
            const $buttons = $('button, a, div[role="button"]');
            let showNumberButton = null;
            
            console.log(`Found ${$buttons.length} clickable elements to check`);
            
            $buttons.each(function() {
                const $button = $(this);
                const buttonText = $button.text().trim().toLowerCase();
                const ariaLabel = ($button.attr('aria-label') || '').toLowerCase();
                
                // Check for various forms of "show number" text
                if ((buttonText.includes('wyświetl') && buttonText.includes('numer')) ||
                    (buttonText.includes('pokaż') && buttonText.includes('numer')) ||
                    buttonText.includes('wyświetl numer') ||
                    ariaLabel.includes('wyświetl numer') ||
                    ariaLabel.includes('phone') ||
                    buttonText.includes('show number')) {
                    
                    showNumberButton = this;
                    console.log('Found phone button:', buttonText, 'aria-label:', ariaLabel);
                    return false; // Break out of each loop
                }
            });
            
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
                        const $element = $(selector).first();
                        if ($element.length && $element.text().toLowerCase().includes('wyświetl')) {
                            showNumberButton = $element[0];
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
                        const phoneText = $(selector).first().text().trim();
                        if (phoneText) {
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
            
            // Look for the "Wyświetl VIN" link with jQuery
            const $links = $('a, button, div[role="button"], span[role="button"]');

            const $vinLinks = $links.filter(function() {
                const text = $(this).text().toLowerCase();
                return text.includes('vin');
            });
            
            console.log('Clicking VIN reveal link...');
            
            try {
                $vinLinks.click();
            } catch (e) {
                // Fallback to programmatic click
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                for (let i = 0; i < $vinLinks.length; i++) {
                    $vinLinks[i].dispatchEvent(clickEvent);
                }
            }
            
            console.log('Waiting for VIN to be revealed...');
            // Wait for VIN to be revealed
            await new Promise(resolve => setTimeout(resolve, 500));

            return getValueByLabel('VIN');
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

            if (!existingUserData.user_notes) {
                existingUserData.user_notes = extractedCarData.user_notes;
            }
            
            // Populate UI with existing data
            if (existingUserData.user_notes) {
                $('#otomoto-notes').val(existingUserData.user_notes);
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
            
            contentElement.innerHTML = `
                <div style="color: green; font-weight: bold;">✅ Data Extracted!</div>
                <div style="font-size: 11px; margin-top: 5px; background: #f8f9fa; padding: 5px; border-radius: 3px;">
                    <strong>${carName}</strong><br>
                    💰 ${price}<br>
                    📞 ${phone}<br>
                    🔢 ${vin}<br>
                    📍 ${location}<br>
                    <em>Found ${Object.keys(extractedCarData).length} fields</em>
                </div>
            `;
            
            // Show retry button if phone or VIN extraction failed
            if ((phone === 'No phone') || (vin === 'No VIN')) {
                $('#otomoto-retry-button').show().text('Retry Phone/VIN Extraction');
            }
            
            // Automatically save the extracted data
            contentElement.innerHTML += `<br><div style="color: #007bff; font-size: 10px;">🔄 Auto-saving data...</div>`;
            await autoSaveData(existingUserData);
            
        } catch (error) {
            contentElement.innerHTML = `
                <div style="color: red; font-weight: bold;">❌ Extraction Failed</div>
                <div style="font-size: 12px; margin-top: 5px;">
                    Error: ${error.message}
                </div>
            `;
        }
    }
    
    // Auto-save function for extracted data
    async function autoSaveData(existingUserData) {
        try {
            if (!extractedCarData) {
                console.log('No extracted data to auto-save');
                return;
            }

            // Preserve existing user notes and grade
            const notes = existingUserData.user_notes || '';
            const grade = existingUserData.user_grade || 0;
            
            // Add user input to extracted data
            const finalData = {
                ...extractedCarData,
                user_notes: notes,
                user_grade: grade
            };
            
            // Prepare data for backend
            const dataPayload = {
                url: window.location.href,
                data: finalData
            };
            
            // Save extracted data
            const dataResult = await sendToBackend('/save-extracted-data', dataPayload);
            
            // Save HTML
            const htmlPayload = {
                url: window.location.href,
                html_content: document.documentElement.outerHTML
            };
            await sendToBackend('/save-html', htmlPayload);
            
            // Update the UI to show auto-save success
            const $autoSaveDiv = $('#otomoto-message-content').find('[style*="Auto-saving"]');
            if ($autoSaveDiv.length) {
                $autoSaveDiv.html('✅ Auto-saved successfully!').css('color', '#28a745');
            }
            
            console.log('Auto-save completed successfully');
            
        } catch (error) {
            console.error('Auto-save failed:', error);
            
            // Update the UI to show auto-save failure
            const $autoSaveDiv = $('#otomoto-message-content').find('[style*="Auto-saving"]');
            if ($autoSaveDiv.length) {
                $autoSaveDiv.html('❌ Auto-save failed').css('color', '#dc3545');
            }
        }
    }
    
    // Save notes and grade function
    async function saveNotesAndGrade() {
        const $contentElement = $('#otomoto-message-content');
        const $saveButton = $('#otomoto-save-button');
        
        if (!extractedCarData) {
            $contentElement.html(`
                <div style="color: red; font-weight: bold;">❌ No data to save</div>
                <div style="font-size: 12px; margin-top: 5px;">
                    Please wait for data extraction to complete.
                </div>
            `);
            return;
        }
        
        try {
            $saveButton.prop('disabled', true).text('Updating...');
            
            const notes = $('#otomoto-notes').val().trim();
            const grade = currentRating;
            
            // Add user input to extracted data
            const finalData = {
                ...extractedCarData,
                user_notes: notes,
                user_grade: grade
            };
            
            // Prepare data for backend
            const dataPayload = {
                url: window.location.href,
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
            
            $contentElement.html(`
                <div style="color: green; font-weight: bold;">✅ Saved Successfully!</div>
                <div style="font-size: 11px; margin-top: 5px; background: #f8f9fa; padding: 5px; border-radius: 3px;">
                    ${gradeText}<br>
                    ${notesText}<br>
                    <em>File: ${dataResult.filename || 'saved'}</em>
                </div>
            `);
            
            $saveButton.text('✅ Updated');
            
        } catch (error) {
            $contentElement.html(`
                <div style="color: red; font-weight: bold;">❌ Save Failed</div>
                <div style="font-size: 12px; margin-top: 5px;">
                    Error: ${error.message}
                </div>
            `);
            
            $saveButton.prop('disabled', false).text('Update Notes & Grade');
        }
    }
    
    // Initialize the script with dual mode support
    async function init() {
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        // Check URL to determine page type
        const currentUrl = window.location.href;
        
        if (currentUrl.includes('/oferta/')) {
            // Offer page - use existing functionality
            console.log('Otomoto: Initializing offer page mode');
            initOfferPage();
        } else if (currentUrl.includes('/dostawcze/')) {
            // Listing page - use new functionality
            console.log('Otomoto: Initializing listing page mode');
            initListingPage();
        } else {
            console.log('Otomoto: URL not recognized, skipping initialization');
        }
    }
    
    // Initialize offer page (existing functionality)
    async function initOfferPage() {
        // Remove existing floating window if any
        $('#otomoto-floating-window').remove();
        
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
    
    // Initialize listing page (new functionality)
    async function initListingPage() {
        console.log('Otomoto: Starting listing page initialization');
        
        // Wait for articles to load
        await waitForListingPageReady();
        
        // Fetch known cars from backend
        const knownCars = await fetchKnownCars();
        
        // Process and highlight cars
        await processListingPage(knownCars);
        
        console.log('Otomoto: Listing page initialization complete');
    }
    
    // Wait for listing page to be ready
    async function waitForListingPageReady() {
        // Wait for articles to appear
        let attempts = 0;
        const maxAttempts = 30; // 15 seconds
        
        while (attempts < maxAttempts) {
            const $articles = $('article');
            if ($articles.length > 0) {
                console.log(`Otomoto: Found ${$articles.length} articles`);
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        // Additional wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Fetch known cars from backend
    async function fetchKnownCars() {
        try {
            console.log('Otomoto: Fetching known cars from backend...');
            const response = await fetch(`${API_BASE_URL}/api/known-cars`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`Otomoto: Retrieved ${data.known_cars.length} known cars`);
            return data.known_cars;
            
        } catch (error) {
            console.error('Otomoto: Failed to fetch known cars:', error);
            return [];
        }
    }
    
    // Process listing page - highlight and reorder cars
    async function processListingPage(knownCars) {
        try {
            console.log('Otomoto: Processing listing page...');
            
            // Create lookup map for quick access
            const knownCarMap = {};
            knownCars.forEach(car => {
                knownCarMap[car.car_id] = car;
            });
            
            // Find all articles
            // Find all articles that contain a <section> tag
            const $articles = $('article').filter(function() {
                return $(this).find('section').length > 0;
            });
            console.log(`Otomoto: Processing ${$articles.length} articles`);
            
            if ($articles.length === 0) {
                console.log('Otomoto: No articles found on page');
                return;
            }
            
            // Process each article and assign grades
            const allArticles = [];
            
            $articles.each(function() {
                const article = this;
                const carId = extractCarIdFromArticle(article);
                let grade = 0; // Default for unknown cars
                let carData = null;
                
                if (carId && knownCarMap[carId]) {
                    // Known car
                    carData = knownCarMap[carId];
                    grade = carData.user_grade || 0;
                    highlightKnownCar(article, carData);
                }
                
                allArticles.push({ article, grade, carData, carId });
            });
            
            console.log(`Otomoto: Found ${allArticles.length} total articles`);
            
            // Always reorder: grade 0 (unseen) at top, then known cars by grade (descending)
            console.log('Otomoto: Reordering all articles');
            reorderArticles(allArticles);
            
        } catch (error) {
            console.error('Otomoto: Failed to process listing page:', error);
        }
    }
    
    // Extract car ID from article
    function extractCarIdFromArticle(article) {
        try {
            // Look for links with car ID in href
            const $links = $(article).find('a[href*="/oferta/"]');
            
            for (let i = 0; i < $links.length; i++) {
                const href = $links.eq(i).attr('href');
                const match = href.match(/ID([A-Za-z0-9]+)/);
                if (match) {
                    return 'ID' + match[1];
                }
            }
            
            return null;
        } catch (error) {
            console.error('Otomoto: Failed to extract car ID:', error);
            return null;
        }
    }
    
    // Highlight known car
    function highlightKnownCar(article, carData) {
        try {
            const $article = $(article);
            
            // Add yellow background and styling
            $article.css({
                'background-color': '#fff3cd',
                'border': '2px solid #ffeaa7',
                'border-radius': '8px',
                'padding': '8px',
                'margin': '4px 0'
            });
            
            // Add rating display
            if (carData.user_grade > 0) {
                addRatingDisplay(article, carData);
            }
            
            // Add visual indicators based on rating
            if (carData.user_grade >= 4) {
                $article.css('border-color', '#00b894'); // Green for high rating
            } else if (carData.user_grade <= 2 && carData.user_grade > 0) {
                $article.css('border-color', '#e17055'); // Red for low rating
            }
            
            // Add notes indicator
            if (carData.has_notes) {
                $article.css('box-shadow', '0 0 10px rgba(0,0,0,0.1)');
            }
            
        } catch (error) {
            console.error('Otomoto: Failed to highlight car:', error);
        }
    }
    
    // Add rating display to article
    function addRatingDisplay(article, carData) {
        try {
            // Find price container
            const $priceContainer = $(article).find('.efzkujb0, .ooa-vtik1a, [class*="price"]').first();
            
            if ($priceContainer.length) {
                // Create stars
                const stars = '★'.repeat(carData.user_grade) + '☆'.repeat(5 - carData.user_grade);
                
                // Prepare user notes display
                let notesDisplay = '';
                if (carData.user_notes) {
                    // Truncate long notes for display
                    const truncatedNotes = carData.user_notes.length > 100
                        ? carData.user_notes.substring(0, 100) + '...'
                        : carData.user_notes;
                    notesDisplay = `<div style="font-size: 11px; color: #636e72; margin-top: 2px; font-style: italic;">"${truncatedNotes}"</div>`;
                }
                
                // Create rating element
                const ratingHtml = `
                    <div style="font-size: 14px; color: #fdcb6e; margin-top: 4px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                        <span style="color: #fdcb6e;">${stars}</span>
                        <span style="color: #636e72; font-size: 12px;">${carData.user_grade}/5</span>
                    </div>
                    ${notesDisplay}
                `;
                
                $priceContainer.append(ratingHtml);
            }
            
        } catch (error) {
            console.error('Otomoto: Failed to add rating display:', error);
        }
    }
    
    // Reorder articles in DOM using JavaScript sort
    function reorderArticles(allArticles) {
        try {
            if (allArticles.length === 0) {
                console.log('Otomoto: No articles to reorder');
                return;
            }

            const parent = $(allArticles[0]?.article).parent();
            console.log(`Otomoto: Reordering ${allArticles.length} articles`);
            console.log('Otomoto: Articles before sorting:', allArticles.map(item => `Grade ${item.grade} - ${item.carId || 'Unknown'}`));
            
            // Sort articles: grade 0 (unseen) always first, then by grade descending
            allArticles.sort((a, b) => {
                // If one has grade 0 and other doesn't, grade 0 comes first
                if (a.grade === 0 && b.grade !== 0) return -1;
                if (a.grade !== 0 && b.grade === 0) return 1;
                
                // If both are grade 0 (both unseen), maintain original order
                if (a.grade === 0 && b.grade === 0) return 0;
                
                // Both have grades > 0, sort descending (higher grades first)
                return b.grade - a.grade;
            });

            console.log('Otomoto: Articles after sorting:', allArticles.map(item => `Grade ${item.grade} - ${item.carId || 'Unknown'}`));

            parent.empty();
            
            allArticles.forEach(item => {
                if (item.article) {
                    parent.append(item.article);
                }
            });

            console.log(`Otomoto: Successfully reordered ${allArticles.length} articles with jQuery`);
                        
        } catch (error) {
            console.error('Otomoto: Failed to reorder articles:', error);
        }
    }
    
    // Start the script
    init();
})();