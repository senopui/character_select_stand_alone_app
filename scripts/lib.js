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
                let formatted = withoutHeat.replace(/_/g, ' ');
            
                // Escape parentheses
                formatted = formatted.replace(/\(/g, '\\(').replace(/\)/g, '\\)');

                // If the formatted starts with ':', return it as is
                if (formatted.startsWith(':')) {                    
                    return formatted;
                }
            
                return formatted.replace(/:/g, ' ');
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
            //console.log('Gallery is already set up.');
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
    
        if (!window.cgCustomGallery) {
            window.cgCustomGallery = {
                timerInterval: null, // Shared timer interval
                startTime: null      // Shared start time
            };
        }

        // Default Base64 placeholders for loading and failed images
        let LOADING_WAIT_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
        let LOADING_FAILED_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";

        window.cgCustomGallery.showLoading = function () {        
            // Create or update the loading overlay
            const loadingOverlay = customCommonOverlay().createLoadingOverlay();
        
            // Restore the last position from localStorage
            const lastPosition = JSON.parse(localStorage.getItem('loadingOverlayPosition'));
            if (lastPosition && lastPosition.top !== undefined && lastPosition.left !== undefined) {
                loadingOverlay.style.top = `${lastPosition.top}px`;
                loadingOverlay.style.left = `${lastPosition.left}px`;
                loadingOverlay.style.transform = 'translate(0, 0)';
            } else {
                // Default position if no saved position exists
                loadingOverlay.style.top = '20%';
                loadingOverlay.style.left = '50%';
                loadingOverlay.style.transform = 'translate(-50%, -20%)';
            }
        
            addDragFunctionality(loadingOverlay);
        };

        window.cgCustomGallery.handleResponse = function (response) {
            // Remove the loading overlay
            const loadingOverlay = document.getElementById('cg-loading-overlay');
            if (loadingOverlay) {
                if (loadingOverlay.dataset.timerInterval) {
                    clearInterval(loadingOverlay.dataset.timerInterval);
                }
                loadingOverlay.remove();
            }
        
            // Check if the response is valid
            if (!response) {
                console.error('Invalid response from the backend: undefined');
                customCommonOverlay().createErrorOverlay('No response from backend');
                return;
            }
            if (!response.data) {
                const errorMessage = response.error || 'Unknown error';
                console.error('Failed to fetch image data:', errorMessage);
                customCommonOverlay().createErrorOverlay(errorMessage);
                return;
            }
        
            // If loading is successful, update the gallery content
            if (response.data) {
                window.updateGallery(response.data);
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
                scale += e.deltaY * -0.001;
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

        function gallery_renderGridMode() {
            container.innerHTML = ''; 
        
            const gallery = document.createElement('div');
            gallery.className = 'cg-gallery-grid-container scroll-container'; 
            gallery.style.cssText = `
                display: grid;
                gap: 10px;
                justify-content: center;
                grid-auto-rows: auto;
                overflow-y: auto; 
                height: 100%;
            `;
        
            // Get container width
            const containerWidth = container.offsetWidth;
        
            // Get first image w/h ratio
            const firstImage = new Image();
            firstImage.src = images[0];
            firstImage.onload = () => {
                const aspectRatio = firstImage.width / firstImage.height; 
                const targetHeight = 200; 
                const targetWidth = targetHeight * aspectRatio; 
                const itemsPerRow = Math.floor(containerWidth / (targetWidth + 10)); // max image per row
        
                gallery.style.gridTemplateColumns = `repeat(${itemsPerRow}, ${targetWidth}px)`;
        
                images.forEach((url, index) => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'cg-gallery-item';
                    imgContainer.style.cssText = `
                        width: ${targetWidth}px;
                        height: ${targetHeight}px;
                        overflow: hidden;
                        border-radius: 5px;
                        background: #333;
                    `;
        
                    const img = document.createElement('img');
                    img.src = url;
                    img.style.cssText = `
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                        cursor: pointer; 
                    `;
        
                    img.addEventListener('click', () => {
                        enterFullscreen(index);
                    });
        
                    imgContainer.appendChild(img);
                    gallery.appendChild(imgContainer);
                });
        
                container.appendChild(gallery);
                ensureSwitchModeButton();
            };
        }
    
        function gallery_renderSplitMode() {
            if (!images || images.length === 0) {
                console.error('No images available for gallery_renderSplitMode');
                container.innerHTML = `
                    <div class="cg-error-message">No images to display</div>
                `;
                return;
            }
        
            container.innerHTML = ''; 
        
            const mainImageContainer = document.createElement('div');
            mainImageContainer.style.cssText = `
                width: 100%;
                height: 90%;
                display: flex;
                justify-content: center;
                align-items: center;
                overflow: hidden;
                position: relative;
                cursor: pointer; 
            `;
        
            const mainImage = document.createElement('img');
            mainImage.src = images[currentIndex];
            mainImage.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                cursor: pointer;
            `;
        
            mainImage.addEventListener('click', () => {
                enterFullscreen(currentIndex);
            });
        
            mainImageContainer.addEventListener('click', (e) => {
                const rect = mainImageContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left; 
                const isLeft = clickX < rect.width / 2; // click left or right
        
                if (isLeft) {
                    currentIndex = (currentIndex - 1 + images.length) % images.length;
                } else {
                    currentIndex = (currentIndex + 1) % images.length;
                }
        
                mainImage.src = images[currentIndex];
        
                Array.from(previewContainer.children).forEach((child, i) => {
                    child.style.border = i === currentIndex ? '2px solid #3498db' : 'none';
                });
            });
        
            mainImageContainer.appendChild(mainImage);
            container.appendChild(mainImageContainer);
        
            const previewContainer = document.createElement('div');
            previewContainer.className = 'thumb-scroll-container scroll-container';
            previewContainer.style.cssText = `
                width: 100%;
                height: 10%;
                display: flex;
                justify-content: center; /* 中央对齐 */
                gap: 10px;
                overflow-x: auto;
                overflow-y: hidden;
                cursor: grab;
                align-items: center;
                padding: 5px 0;
            `;
        
            images.forEach((url, index) => {
                const previewImage = document.createElement('img');
                previewImage.src = url;
                previewImage.style.cssText = `
                    height: 100%;
                    object-fit: contain;
                    cursor: pointer;
                    border: ${index === currentIndex ? '2px solid #3498db' : 'none'};
                    border-radius: 5px;
                `;
        
                previewImage.addEventListener('click', () => {
                    currentIndex = index;
                    mainImage.src = images[currentIndex];
                    Array.from(previewContainer.children).forEach((child, i) => {
                        child.style.border = i === currentIndex ? '2px solid #3498db' : 'none';
                    });
                });
        
                previewContainer.appendChild(previewImage);
            });
        
            let isDragging = false;
            let startX, scrollLeft;
        
            previewContainer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isDragging = true;
                previewContainer.style.cursor = 'grabbing';
                startX = e.pageX - previewContainer.offsetLeft;
                scrollLeft = previewContainer.scrollLeft;
            });
        
            previewContainer.addEventListener('mouseleave', () => {
                isDragging = false;
                previewContainer.style.cursor = 'grab';
            });
        
            previewContainer.addEventListener('mouseup', () => {
                isDragging = false;
                previewContainer.style.cursor = 'grab';
            });
        
            previewContainer.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const x = e.pageX - previewContainer.offsetLeft;
                const walk = (x - startX) * 1; 
                previewContainer.scrollLeft = scrollLeft - walk;
            });
        
            container.appendChild(previewContainer);
            ensureSwitchModeButton();
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
                        gallery_renderGridMode();
                    } else {
                        gallery_renderSplitMode();
                    }
                });
                container.appendChild(switchModeButton);
            }
        }

        function addDragFunctionality(element) {
            let isDragging = false;
            let startX, startY, initialX, initialY;
        
            element.style.position = 'fixed'; 
        
            element.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
        
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
        
                const rect = element.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
        
                document.body.style.userSelect = 'none'; // Disable text selection during drag
            });
        
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
        
                e.preventDefault();
                e.stopPropagation();
        
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
        
                // Update the position of the element
                element.style.left = `${initialX + deltaX}px`;
                element.style.top = `${initialY + deltaY}px`;
            });
        
            document.addEventListener('mouseup', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
        
                    isDragging = false;
                    document.body.style.userSelect = ''; // Re-enable text selection
        
                    // Save the current position to localStorage
                    const rect = element.getBoundingClientRect();
                    localStorage.setItem(
                        'loadingOverlayPosition',
                        JSON.stringify({ top: rect.top, left: rect.left })
                    );
        
                    // Check if the element is out of the browser's visible range
                    if (
                        rect.top < 0 ||
                        rect.left < 0 ||
                        rect.bottom > window.innerHeight ||
                        rect.right > window.innerWidth
                    ) {
                        element.style.top = '20%';
                        element.style.left = '50%';
                        element.style.transform = 'translate(-50%, -20%)';
                        // Remove the saved position if it's invalid
                        localStorage.removeItem('loadingOverlayPosition');
                    }
                }
            });
        }

        window.updateGallery = function (imageData) {
            if (!Array.isArray(imageData) || imageData.length === 0) {
                //console.error('Invalid or empty image data');
                return;
            }
            images = imageData;
            currentIndex = 0; 
            if (isGridMode) {
                gallery_renderGridMode();
            } else {
                gallery_renderSplitMode();
            }
        };
    }

    function createInfoOverlay({ id, content, className = '', onClick = null }) {
        let overlay = document.getElementById(id);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = id;
            overlay.className = `cg-overlay ${className}`;
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = content;

        if (onClick) {
            overlay.onclick = onClick;
        }

        return overlay;
    }

    let isThumbSetup = false;
    function setupThumb() {        
        let isGridMode = true; // Default to grid mode
        let images = [];

        const container = document.getElementById('cg-custom-thumb');
        if (!container) {
            console.error('Thumbnail gallery container not found');
            return;
        }

        if (isThumbSetup) {
            console.log('Thumbnail gallery is already set up.');
            return;
        }

        isThumbSetup = true;

        console.log('Setting up the thumbnail gallery...');

        function thumb_renderGridMode() {
            container.innerHTML = ''; 
        
            const gallery = document.createElement('div');
            gallery.className = 'cg-thumb-grid-container scroll-container'; 
            gallery.style.cssText = `
                display: grid;
                gap: 10px;
                justify-content: center;
                grid-auto-rows: auto;
                overflow-y: auto; 
                height: 100%;
            `;
        
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
        
            const firstImage = new Image();
            firstImage.src = images[0];
            firstImage.onload = () => {
                const aspectRatio = firstImage.width / firstImage.height; 
                const targetHeight = containerHeight / 1.15; 
                const targetWidth = targetHeight * aspectRatio; 
                const itemsPerRow = Math.floor(containerWidth / (targetWidth + 10)); 
        
                gallery.style.gridTemplateColumns = `repeat(${itemsPerRow}, ${targetWidth}px)`;
        
                images.forEach((url) => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'cg-thumb-item';
                    imgContainer.style.cssText = `
                        width: ${targetWidth}px;
                        height: ${targetHeight}px;
                        overflow: hidden;
                        border-radius: 5px;
                        background: #333;
                    `;
        
                    const img = document.createElement('img');
                    img.src = url;
                    img.style.cssText = `
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                    `;
        
                    imgContainer.appendChild(img);
                    gallery.appendChild(imgContainer);
                });
        
                container.appendChild(gallery);
                ensureSwitchModeButton();
            };
        }

        function thumb_renderSplitMode() {
            container.innerHTML = ''; 

            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'cg-thumb-scroll-container scroll-container'; 
            scrollContainer.style.cssText = `
                display: flex;
                gap: 10px;
                overflow-x: auto;
                overflow-y: hidden;
                height: 100%;
                cursor: grab;
            `;

            images.forEach((url) => {
                const img = document.createElement('img');
                img.src = url;
                img.style.cssText = `
                    height: 100%;
                    object-fit: contain;
                `;
                scrollContainer.appendChild(img);
            });

            // 添加鼠标拖拽功能
            let isDragging = false;
            let startX, scrollLeft;

            scrollContainer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isDragging = true;
                scrollContainer.style.cursor = 'grabbing';
                startX = e.pageX - scrollContainer.offsetLeft;
                scrollLeft = scrollContainer.scrollLeft;
            });

            scrollContainer.addEventListener('mouseleave', () => {
                isDragging = false;
                scrollContainer.style.cursor = 'grab';
            });

            scrollContainer.addEventListener('mouseup', () => {
                isDragging = false;
                scrollContainer.style.cursor = 'grab';
            });

            scrollContainer.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const x = e.pageX - scrollContainer.offsetLeft;
                const walk = (x - startX) * 1; // scroll speed
                scrollContainer.scrollLeft = scrollLeft - walk;
            });

            container.appendChild(scrollContainer);
            ensureSwitchModeButton();
        }

        function ensureSwitchModeButton() {
            let switchModeButton = document.getElementById('cg-thumb-switch-mode-button');
            if (!switchModeButton) {
                switchModeButton = document.createElement('button');
                switchModeButton.id = 'cg-thumb-switch-mode-button';
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
                        thumb_renderGridMode();
                    } else {
                        thumb_renderSplitMode();
                    }
                });
                container.appendChild(switchModeButton);
            }
        }

        window.updateThumbGallery = function (imageData) {
            if (!Array.isArray(imageData) || imageData.length === 0) {
                //OC Character Pass
                //console.log('No image data provided, might error or OC, clearing thumbnail gallery');
                container.innerHTML = ''; 
        
                const switchModeButton = document.getElementById('cg-thumb-switch-mode-button');
                if (switchModeButton) {
                    switchModeButton.remove();
                }
                return;
            }

            images = imageData;
            currentIndex = 0;
            if (isGridMode) {
                thumb_renderGridMode();
            } else {
                thumb_renderSplitMode();
            }
        };

        // Initial render
        thumb_renderGridMode();
    }    

    function customCommonOverlay() {
        function createErrorOverlay(errorMessage) {
            return createInfoOverlay({
                id: 'cg-error-overlay',
                className: 'cg-overlay-error',
                content: `
                    <img src="${window.LOADING_FAILED_BASE64}" alt="Error" class="cg-overlay-image">
                    <span>Failed to load images: ${errorMessage}</span>
                `,
                onClick: () => {
                    document.getElementById('cg-error-overlay').remove();
                }
            });
        }
    
        function createLoadingOverlay() {
            const overlay = createInfoOverlay({
                id: 'cg-loading-overlay',
                className: '',
                content: `
                    <img src="${window.LOADING_WAIT_BASE64}" alt="Loading" class="cg-overlay-image">
                    <span>Now generating...</span>
                    <span class="cg-overlay-timer">Elapsed time: 0 seconds</span>
                `
            });
    
            // Start timer
            const startTime = Date.now();
            if (overlay.dataset.timerInterval) {
                clearInterval(overlay.dataset.timerInterval);
            }
            const timerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const timerElement = overlay.querySelector('.cg-overlay-timer');
                if (timerElement) {
                    timerElement.textContent = `Elapsed time: ${elapsed} seconds`;
                }
            }, 1000);
            overlay.dataset.timerInterval = timerInterval;
    
            return overlay;
        }
    
        // Return the functions as an object
        return {
            createErrorOverlay,
            createLoadingOverlay
        };
    }

    console.log("[My JS] Script loaded, attempting initial setup");
    setupSuggestionSystem();
    setupGallery();
    setupThumb();
    dark_theme();
}
