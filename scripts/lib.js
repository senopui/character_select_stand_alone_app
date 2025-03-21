//gosh... this is a mess... I'm sorry... I'll clean it up later... I promise...
function my_custom_js() {    
    function dark_theme() {
        const url = new URL(window.location);
        if (url.searchParams.get('__theme') !== 'dark') {
            url.searchParams.set('__theme', 'dark');
            window.location.href = url.href;
        }
    }
    
    function setupSuggestionSystem() {              
        // Select all textarea elements with specific IDs
        const textboxes = document.querySelectorAll(
            '#custom_prompt_text textarea, ' +
            '#positive_prompt_text textarea, ' +
            '#negative_prompt_text textarea, ' +
            '#ai_prompt_text textarea, ' +
            '#prompt_ban_text textarea'
        );
        // Log the number of textboxes found
        //console.log("Found specific textboxes:", textboxes.length);
        
        textboxes.forEach(textbox => {
            // Skip if the suggestion system is already set up for this textbox
            if (textbox.dataset.suggestionSetup) return;
            
            // Log that the suggestion system is being set up for this textbox
            console.log("Setting up suggestion system for", textbox);
            
            let suggestionBox = document.createElement('div');
            suggestionBox.className = 'suggestion-box';
            // Hide the suggestion box initially
            suggestionBox.style.display = 'none';
            
            // Append the suggestion box to the body element
            document.body.appendChild(suggestionBox);
            
            let selectedIndex = -1; // Index of the currently selected suggestion item
            let currentSuggestions = []; // Array to store the current suggestion items
            
            // Handle input events on the textbox
            textbox.addEventListener('input', async function () {
                const value = textbox.value; // Current value of the textbox
                const cursorPosition = textbox.selectionStart; // Current cursor position in the textbox

                // Extract the word to send for suggestions
                let wordToSend = '';
                if (cursorPosition === value.length) {
                    // If cursor is at the end, extract the word after the last comma
                    const lastCommaIndex = value.lastIndexOf(',');
                    wordToSend = value.slice(lastCommaIndex + 1).trim();
                } else {
                    // If cursor is not at the end, extract the word between the nearest commas
                    const beforeCursor = value.slice(0, cursorPosition);
                    const afterCursor = value.slice(cursorPosition);

                    const lastCommaBeforeCursor = beforeCursor.lastIndexOf(',');
                    const firstCommaAfterCursor = afterCursor.indexOf(',');

                    const start = lastCommaBeforeCursor >= 0 ? lastCommaBeforeCursor + 1 : 0; // Start position for word extraction
                    const end = firstCommaAfterCursor >= 0 ? cursorPosition + firstCommaAfterCursor : value.length; // End position for word extraction

                    wordToSend = value.slice(start, end).trim();
                }

                // If no word is extracted, hide the suggestion box and skip the API request
                if (!wordToSend) {
                    //console.log("Skipping API request due to empty word.");
                    suggestionBox.style.display = 'none';
                    return;
                }
            
                // Log the word being sent for the initial API request
                //console.log("Sending initial API request with word:", wordToSend);
                
                let eventId; // Variable to store the event ID from the API response
                try {
                    // Make the first API request to get an event ID
                    const initialResponse = await fetch('/gradio_api/call/update_suggestions_js', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fn_index: 0,
                            data: [wordToSend] // Send the extracted word instead of the full textbox content
                        })
                    });
                
                    // Log the status of the initial API response
                    //console.log("Initial API response status:", initialResponse.status);
                
                    // Check if the initial API request failed
                    if (!initialResponse.ok) {
                        console.error("Initial API request failed:", initialResponse.status, initialResponse.statusText);
                        return;
                    }
                
                    const initialResult = await initialResponse.json();
                    // Log the data received from the initial API response
                    //console.log("Initial API response data:", initialResult);
                
                    // Extract the event ID from the response
                    eventId = initialResult.event_id;
                    if (!eventId) {
                        console.error("No event_id found in initial API response:", initialResult);
                        return;
                    }
                
                    // Log the extracted event ID
                    //console.log("Extracted event_id:", eventId);
                } catch (error) {
                    // Log any errors that occur during the initial API request
                    console.error("Error during initial API request:", error);
                    return;
                }
            
                let suggestions; // Variable to store the suggestion data
                try {
                    // Make the second API request to get suggestion data using the event ID
                    const suggestionResponse = await fetch(`/gradio_api/call/update_suggestions_js/${eventId}`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
            
                    // Log the status of the suggestion API response
                    //console.log("Suggestion API response status:", suggestionResponse.status);
            
                    // Check if the suggestion API request failed
                    if (!suggestionResponse.ok) {
                        console.error("Suggestion API request failed:", suggestionResponse.status, suggestionResponse.statusText);
                        return;
                    }

                    // Log the full suggestion API response object
                    //console.log("Suggestion API response object:", suggestionResponse);
            
                    // Get the raw suggestion data as text
                    const rawSuggestions = await suggestionResponse.text();
                    // Log the raw suggestion data received
                    //console.log("Raw suggestions received:", rawSuggestions);
            
                    // Parse the Python-formatted list into a JavaScript array
                    const lines = rawSuggestions.split('\n'); // Split the response into lines
                    let dataLine = lines.find(line => line.startsWith('data:')); // Find the line starting with "data:"
                
                    if (!dataLine) {
                        console.error("No data line found in raw suggestions:", rawSuggestions);
                        return;
                    }
                
                    // Remove the "data:" prefix and parse the JSON string into an array
                    const jsonString = dataLine.replace('data:', '').trim();
                    suggestions = JSON.parse(jsonString);
                    // Log the parsed suggestion data
                    //console.log("Parsed suggestions:", suggestions);
                } catch (error) {
                    // Log any errors that occur during the suggestion API request
                    console.error("Error during suggestion API request:", error);
                    return;
                }
            
                // Clear the suggestion box content
                suggestionBox.innerHTML = '';
                currentSuggestions = []; // Reset the current suggestions array

                // Check if there are no valid suggestions to display
                if (!suggestions || suggestions.length === 0 || suggestions.every(suggestion => suggestion.length === 0)) {
                    //console.log("No suggestions available.");
                    suggestionBox.style.display = 'none';
                    return;
                }
                
                // Calculate the width of the longest suggestion item
                let maxWidth = 0;
                const tempDiv = document.createElement('div'); // Temporary div to measure text width
                tempDiv.style.position = 'absolute';
                tempDiv.style.visibility = 'hidden';
                tempDiv.style.whiteSpace = 'nowrap';
                document.body.appendChild(tempDiv);

                // Bind click events to suggestion items during input event
                suggestions.forEach((suggestion, index) => {
                    if (!Array.isArray(suggestion) || suggestion.length === 0) {
                        console.warn(`Invalid suggestion format at index ${index}:`, suggestion);
                        return;
                    }
                    suggestion.forEach(element => {
                        const item = document.createElement('div');
                        item.className = 'suggestion-item';
                        item.textContent = element;
                        item.dataset.value = element;
                        tempDiv.textContent = element;
                        maxWidth = Math.max(maxWidth, tempDiv.offsetWidth);
                        currentSuggestions.push({ prompt: element });
                        item.addEventListener('click', () => applySuggestion(element));
                        suggestionBox.appendChild(item);
                    });
                });
                
                // Remove the temporary div after measuring
                document.body.removeChild(tempDiv);
                
                // Update the suggestion box position if it is already visible
                if (suggestionBox.style.display !== 'none') {
                    updateSuggestionBoxPosition();                        
                }              

                // Set the width of the suggestion box
                setSuggestionBoxWidth(maxWidth);
                
                // Log the set width of the suggestion box
                //console.log("Set suggestionBox width:", suggestionBox.style.width);
                // Log the actual rendered width of the suggestion box
                //console.log("Actual suggestionBox width:", suggestionBox.offsetWidth);

                selectedIndex = -1; // Reset the selected index

                // Log that the suggestions have been successfully displayed
                //console.log("Suggestions successfully displayed.");
            });

            // Handle keyboard navigation for the suggestion box
            textbox.addEventListener('keydown', function (e) {
                if (suggestionBox.style.display === 'none') 
                    return; // Exit if the suggestion box is not visible

                const items = suggestionBox.querySelectorAll('.suggestion-item');
                if (items.length === 0) return; // Exit if there are no suggestion items
            
                if (e.key === 'Tab' || e.key === 'Enter') {
                    e.preventDefault(); // Prevent default behavior
                    if (selectedIndex >= 0 && selectedIndex < currentSuggestions.length) {
                        applySuggestion(currentSuggestions[selectedIndex].prompt); // Apply the selected suggestion
                    } else if (items.length > 0) {
                        applySuggestion(currentSuggestions[0].prompt); // Apply the first suggestion if none selected
                    }
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault(); // Prevent default scrolling
                    selectedIndex = Math.min(selectedIndex + 1, items.length - 1); // Move selection down
                    items.forEach((item, idx) => item.classList.toggle('selected', idx === selectedIndex));
                    if (selectedIndex >= 0) items[selectedIndex].scrollIntoView({ block: 'nearest' });
                    textbox.focus(); // Keep focus on the textbox
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault(); // Prevent default scrolling
                    selectedIndex = Math.max(selectedIndex - 1, 0); // Move selection up
                    items.forEach((item, idx) => item.classList.toggle('selected', idx === selectedIndex));
                    if (selectedIndex >= 0) items[selectedIndex].scrollIntoView({ block: 'nearest' });
                    textbox.focus(); // Keep focus on the textbox
                } else if (e.key === 'Escape') {
                    suggestionBox.style.display = 'none'; // Hide the suggestion box
                }
            });
            
            // Hide the suggestion box when clicking outside
            document.addEventListener('click', function(e) {
                if (!suggestionBox.contains(e.target) && e.target !== textbox) {
                    suggestionBox.style.display = 'none'; // Hide if click is outside textbox and suggestion box
                }
            });

            function setSuggestionBoxWidth(maxWidth) {
                suggestionBox.style.display = 'block'; // Show the suggestion box
                suggestionBox.style.width = `${Math.min(maxWidth + 20, 600)}px`; // Set width based on max suggestion width
                suggestionBox.style.minWidth = '0px'; // Remove minimum width restriction
                suggestionBox.style.maxWidth = 'none'; // Remove maximum width restriction
                suggestionBox.offsetWidth; // Force a reflow to apply styles
            }
            
            function formatSuggestion(suggestion) {
                // Remove popularity info (number in parentheses) from the suggestion
                const withoutHeat = suggestion.replace(/\s\(\d+\)$/, '');
                
                // Replace underscores with spaces while preserving parentheses content
                let formatted = withoutHeat.replace(/_/g, ' ').replace(/:/g, ' ');
            
                // Escape parentheses
                formatted = formatted.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
            
                return formatted;
            }
                        
            function applySuggestion(promptText) {
                // Log the prompt text before formatting for debugging
                //console.log("Debug: promptText before formatting:", promptText);
                const formattedText = formatSuggestion(promptText[0]); // Format the suggestion text
                const cursorPosition = textbox.selectionStart; // Get the current cursor position
                const value = textbox.value; // Get the current textbox value
            
                // Split the text around the cursor
                const beforeCursor = value.slice(0, cursorPosition);
                const afterCursor = value.slice(cursorPosition);
            
                // Find the position of the last comma before the cursor
                const lastCommaIndex = beforeCursor.lastIndexOf(',');
            
                // Determine if a comma is needed after the suggestion
                const needsComma = afterCursor.trim().length === 0;
            
                // Insert the suggestion, replacing the text after the last comma or at the start
                const newValue = lastCommaIndex >= 0
                    ? beforeCursor.slice(0, lastCommaIndex + 1) + ` ${formattedText}${needsComma ? ',' : ''}` + afterCursor
                    : `${formattedText}${needsComma ? ',' : ''} ${afterCursor}`;
            
                textbox.value = newValue.trim(); // Update the textbox with the new value
            
                // Clear the current suggestions and hide the suggestion box
                currentSuggestions = [];
                suggestionBox.style.display = 'none';        
            
                // Trigger an input event to notify other listeners
                textbox.dispatchEvent(new Event('input', { bubbles: true }));
                textbox.focus(); // Refocus the textbox
            }
            
            // Update the position of the suggestion box dynamically
            function updateSuggestionBoxPosition() {
                const rect = textbox.getBoundingClientRect(); // Get the textbox's position and size
                suggestionBox.style.top = `${rect.bottom + window.scrollY}px`; // Position below the textbox
                
                const cursorPosition = textbox.selectionStart; // Get the cursor position
                const textBeforeCursor = textbox.value.substring(0, cursorPosition); // Text before the cursor
                
                // Create a temporary span to measure the cursor position
                const tempSpan = document.createElement('span');
                tempSpan.style.position = 'absolute';
                tempSpan.style.visibility = 'hidden';
                tempSpan.style.font = window.getComputedStyle(textbox).font; // Match the textbox font
                tempSpan.textContent = textBeforeCursor;
                document.body.appendChild(tempSpan);
                
                // Calculate the offset of the cursor
                const cursorOffset = tempSpan.offsetWidth;
                document.body.removeChild(tempSpan); // Remove the temporary span
                
                // Set the left position of the suggestion box based on cursor offset
                let newLeft = rect.left + window.scrollX + cursorOffset;
                
                // Prevent the suggestion box from overflowing the right edge of the viewport
                const suggestionWidth = suggestionBox.offsetWidth;
                const windowWidth = window.innerWidth;
                if (newLeft + suggestionWidth > windowWidth) {
                    newLeft = windowWidth - suggestionWidth;
                }
                // Prevent the suggestion box from going beyond the left edge
                if (newLeft < 0) {
                    newLeft = 0;
                }
                
                suggestionBox.style.left = `${newLeft}px`; // Apply the calculated left position
                
                // Force a reflow to ensure the position updates
                suggestionBox.style.transform = 'translateZ(0)';
            }

            // Update the suggestion box position on input
            textbox.addEventListener('input', function () {
                updateSuggestionBoxPosition();
            });
            // Update the suggestion box position on scroll
            document.addEventListener('scroll', function () {
                if (suggestionBox.style.display !== 'none') {
                    updateSuggestionBoxPosition();
                }
            }, true);

            textbox.dataset.suggestionSetup = 'true'; // Mark the textbox as having the suggestion system set up
        });
    }
   

    let isGallerySetup = false;
    function setupGallery() {
        if (isGallerySetup) {
            console.log('Gallery is already set up.');
            return;
        }
        isGallerySetup = true;
    
        console.log('Setting up the gallery...');
        let isGridMode = false;
        let currentIndex = 0;
        let images = [];
        let handleFullscreenKeyDown;
    
        const container = document.getElementById('cg-custom-gallery');
        if (!container) {
            console.error('Gallery container not found');
            return;
        }
    
        let timerInterval = null; // Timer interval for loading state
        let startTime = null;   // Start time for the loading timer

        if (!window.cgCustomGallery) {
            window.cgCustomGallery = {};
        }

        // Default Base64 placeholders for loading and failed images
        let LOADING_WAIT_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
        let LOADING_FAILED_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";

        // Displays the loading state with a timer
        window.cgCustomGallery.showLoading = function () {
            const container = document.getElementById('cg-custom-gallery');
            if (!container) {
                console.error('Gallery container not found');
                return;
            }

            // Use the global Base64 data for the loading image
            const loadingImage = window.LOADING_WAIT_BASE64 || LOADING_WAIT_BASE64;

            container.innerHTML = `
                <div class="cg-loading-container">
                    <div class="cg-loading-text">Generating images...</div>
                    <img src="${loadingImage}" class="cg-loading-image" alt="Loading">
                    <div class="cg-timer">Elapsed time: 0 seconds</div>
                </div>
            `;
            console.log('Displaying loading state on the frontend...');

            startTime = Date.now();
            timerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const timerElement = container.querySelector('.cg-timer');
                if (timerElement) {
                    timerElement.textContent = `Elapsed time: ${elapsed} seconds`;
                }
            }, 1000);

            // Store the timer interval in the container's dataset
            container.dataset.timerInterval = timerInterval;
        };

        // Handles the response from the backend
        window.cgCustomGallery.handleResponse = function (response) {
            const container = document.getElementById('cg-custom-gallery');
            if (!container) {
                console.error('Gallery container not found');
                return;
            }
        
            // Clear the loading timer
            if (container.dataset.timerInterval) {
                clearInterval(container.dataset.timerInterval);
                delete container.dataset.timerInterval;
                console.log('Loading timer stopped');
            }
        
            if (!response) {
                console.error('Invalid response from the backend: undefined');
                container.innerHTML = `
                    <div class="cg-loading-container">
                        <div class="cg-error-message">Failed to load images: No response from backend</div>
                    </div>
                `;
                return;
            }
        
            // Use the global Base64 data for the failed image
            const failedImage = window.LOADING_FAILED_BASE64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
        
            if (!response.data) {
                const errorMessage = response.error || 'Unknown error';
                console.error('Failed to fetch image data:', errorMessage);
                container.innerHTML = `
                    <div class="cg-loading-container">
                        <img src="${failedImage}" class="cg-loading-image" alt="Failed">
                        <div class="cg-error-message">Failed to load images: ${errorMessage}</div>
                    </div>
                `;
                return;
            }
        
            console.log('Received response:', response);
        
            if (response.data) {
                if (window.updateGallery) {
                    window.updateGallery(response.data);
                } else {
                    console.error('updateGallery function is not available');
                    container.innerHTML = `
                        <div class="cg-loading-container">
                            <img src="${failedImage}" class="cg-loading-image" alt="Failed">
                            <div class="cg-error-message">Failed to load images: Frontend rendering function is unavailable</div>
                        </div>
                    `;
                }
            }
        };
    
        function enterFullscreen(index) {
            const imgUrl = images[index];
            if (!imgUrl) {
                console.error('Invalid image index:', index);
                return;
            }
        
            // Create fullscreen overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                overflow: hidden;
            `;
        
            // Create fullscreen image
            const fullScreenImg = document.createElement('img');
            fullScreenImg.src = imgUrl;
            fullScreenImg.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                cursor: grab;
                transform: translate(0px, 0px) scale(1);
            `;
        
            // Variables for dragging
            let isDragging = false;
            let startX = 0, startY = 0;
            let translateX = 0, translateY = 0;
        
            function onMouseMove(e) {
                if (!isDragging) return;
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                translateX += deltaX;
                translateY += deltaY;
                fullScreenImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
                startX = e.clientX;
                startY = e.clientY;
            }
            
            function onMouseUp() {
                isDragging = false;
                fullScreenImg.style.cursor = 'grab';
            
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            
            fullScreenImg.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return; 
            
                e.preventDefault();
            
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                fullScreenImg.style.cursor = 'grabbing';
            
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        
            // Enable zooming
            let scale = 1;
            fullScreenImg.addEventListener('wheel', (e) => {
                e.preventDefault();
                scale += e.deltaY * -0.01;
                scale = Math.min(Math.max(0.5, scale), 4); // Limit zoom scale
                fullScreenImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            });
        
            // Close fullscreen on click outside or ESC key
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    exitFullscreen();
                }
            });
        
            document.addEventListener('keydown', handleFullscreenKeyDown = (e) => {
                if (e.key === 'Escape') {
                    exitFullscreen();
                } else if (e.key === 'ArrowRight' || e.key === ' ') {
                    currentIndex = (currentIndex + 1) % images.length;
                    fullScreenImg.src = images[currentIndex];
                } else if (e.key === 'ArrowLeft') {
                    currentIndex = (currentIndex - 1 + images.length) % images.length;
                    fullScreenImg.src = images[currentIndex];
                }
            });
        
            overlay.appendChild(fullScreenImg);
            document.body.appendChild(overlay);
        
            function exitFullscreen() {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleFullscreenKeyDown);
            }
        }
    
        function renderGridMode() {
            container.innerHTML = '';
            const gallery = document.createElement('div');
            gallery.className = 'cg-image-gallery-container';
        
            images.forEach((url, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'cg-image-item';
        
                const img = document.createElement('img');
                img.src = url;
                img.alt = `Image ${index + 1}`;
                img.addEventListener('click', () => enterFullscreen(index));
        
                imgContainer.appendChild(img);
                gallery.appendChild(imgContainer);
            });
        
            container.appendChild(gallery);    
        
            ensureSwitchModeButton(); 
        }
    
        function renderSplitMode() {        
            const bottomSection = document.querySelector('.cg-bottom-section');
            const scrollLeft = bottomSection ? bottomSection.scrollLeft : 0;
        
            container.innerHTML = '';
        
            const topSection = document.createElement('div');
            topSection.className = 'cg-top-section';
            topSection.style.cssText = `
                height: 88%;
                display: flex;
                justify-content: center;
                align-items: center;
                background: #000;
                position: relative;
            `;
        
            const largeImg = document.createElement('img');
            largeImg.src = images[currentIndex];
            largeImg.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                cursor: pointer;
            `;
            largeImg.addEventListener('click', () => enterFullscreen(currentIndex));
            topSection.appendChild(largeImg);
        
            topSection.addEventListener('click', (e) => {
                const rect = topSection.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
        
                e.preventDefault();
        
                if (clickX < rect.width / 2) {
                    currentIndex = (currentIndex - 1 + images.length) % images.length;
                } else {
                    currentIndex = (currentIndex + 1) % images.length;
                }
        
                updateSplitMode();
            });
        
            const newBottomSection = document.createElement('div');
            newBottomSection.className = 'cg-bottom-section';
            newBottomSection.style.cssText = `
                height: 10%;
                display: flex;
                overflow-x: auto;
                overflow-y: hidden;
                background: #333;
                padding: 5px;
                gap: 5px;
                border-radius: 5px;
            `;
        
            images.forEach((url, index) => {
                const thumbImg = document.createElement('img');
                thumbImg.src = url;
                thumbImg.style.cssText = `
                    width: 64px;
                    height: 64px;
                    object-fit: cover;
                    cursor: pointer;
                    border: ${index === currentIndex ? '2px solid #3498db' : 'none'};
                `;
                thumbImg.addEventListener('click', () => {
                    currentIndex = index;
                    updateSplitMode();
                });
                newBottomSection.appendChild(thumbImg);
            });
        
            container.appendChild(topSection);
            container.appendChild(newBottomSection);
            newBottomSection.scrollLeft = scrollLeft;
        
            ensureSwitchModeButton();
        }
        
        function updateSplitMode() {
            const topSection = document.querySelector('.cg-top-section img');
            if (topSection) {
                topSection.src = images[currentIndex];
            }
        
            const thumbnails = document.querySelectorAll('.cg-bottom-section img');
            thumbnails.forEach((thumbImg, index) => {
                thumbImg.style.border = index === currentIndex ? '2px solid #3498db' : 'none';
            });
        }
    
        function ensureSwitchModeButton() {
            let switchModeButton = document.getElementById('cg-switch-mode-button');
            if (!switchModeButton) {
                switchModeButton = document.createElement('button');
                switchModeButton.id = 'cg-switch-mode-button';
                switchModeButton.textContent = '<>';
                switchModeButton.style.cssText = `
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    z-index: 1000;
                    padding: 5px 10px;
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                `;
                switchModeButton.addEventListener('click', () => {
                    isGridMode = !isGridMode;
                    if (isGridMode) {
                        renderGridMode();
                    } else {
                        renderSplitMode();
                    }
                });
                container.appendChild(switchModeButton);
            }
        }
    
        // Updates the gallery with new image data
        window.updateGallery = function (imageData) {
            if (!Array.isArray(imageData)) {
                console.error('Invalid image data format');
                return;
            }
            images = imageData;
            if (isGridMode) {
                renderGridMode();
            } else {
                renderSplitMode();
            }
        };
    }

    console.log("[My JS] Script loaded, attempting initial setup");
    setupSuggestionSystem();
    setupGallery();
    dark_theme();
}
