//still a mess...
function my_custom_js() {    
    function dark_theme() {
        const url = new URL(window.location);
        if (url.searchParams.get('__theme') !== 'dark') {
            url.searchParams.set('__theme', 'dark');
            window.location.href = url.href;
        }
    }

    function addDragFunctionality(element, syncElement) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        let hasMoved = false; // Track if significant movement occurred
        const MOVE_THRESHOLD = 5; // Pixels threshold to consider it a drag

        element.classList.add('cg-draggable');
        element.style.position = 'fixed';

        let rafId = null;
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Check if movement exceeds threshold
            if (Math.abs(deltaX) > MOVE_THRESHOLD || Math.abs(deltaY) > MOVE_THRESHOLD) {
                hasMoved = true;
            }

            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                element.style.left = `${initialX + deltaX}px`;
                element.style.top = `${initialY + deltaY}px`;
                element.style.transform = 'none';

                if (syncElement && syncElement.style.display !== 'none') {
                    syncElement.style.left = `${initialX + deltaX}px`;
                    syncElement.style.top = `${initialY + deltaY}px`;
                    syncElement.style.transform = 'none';
                }
            });
        };

        const onMouseUp = (e) => {
            if (!isDragging) return;
            isDragging = false;
            document.body.style.userSelect = '';
            cancelAnimationFrame(rafId);
            
            const rect = element.getBoundingClientRect();
            localStorage.setItem(
                'overlayPosition',
                JSON.stringify({ top: rect.top, left: rect.left })
            );

            if (syncElement) {
                syncElement.style.left = `${rect.left}px`;
                syncElement.style.top = `${rect.top}px`;
                syncElement.style.transform = 'none';
            }

            if (rect.top < 0 || rect.left < 0 || 
                rect.bottom > window.innerHeight || 
                rect.right > window.innerWidth) {
                element.style.top = '20%';
                element.style.left = '50%';
                element.style.transform = 'translate(-50%, -20%)';
                if (syncElement) {
                    syncElement.style.top = '20%';
                    syncElement.style.left = '50%';
                    syncElement.style.transform = 'translate(-50%, -20%)';
                }
                localStorage.removeItem('overlayPosition');
            }

            // If significant movement occurred, prevent click
            if (hasMoved) {
                e.preventDefault();
                e.stopPropagation();
            }

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        element.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            isDragging = true;
            hasMoved = false; // Reset movement flag
            startX = e.clientX;
            startY = e.clientY;

            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            document.body.style.userSelect = 'none';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
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
            suggestionBox.className = 'suggestion-box scroll-container'; 
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
        if (isGallerySetup) return;
        isGallerySetup = true;

        console.log('Setting up the gallery...');

        let isGridMode = false;
        let currentIndex = 0;
        let images = [];
        let seeds = []
        let tags = []
    
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
        
        window.cgCustomGallery.showLoading = function () {        
            const loadingOverlay = customCommonOverlay().createLoadingOverlay();
            const buttonOverlay = document.getElementById('cg-button-overlay');
            
            // Use shared position
            const lastPosition = JSON.parse(localStorage.getItem('overlayPosition'));
            if (lastPosition && lastPosition.top !== undefined && lastPosition.left !== undefined) {
                loadingOverlay.style.top = `${lastPosition.top}px`;
                loadingOverlay.style.left = `${lastPosition.left}px`;
                loadingOverlay.style.transform = 'none';
            } else {
                loadingOverlay.style.top = '20%';
                loadingOverlay.style.left = '50%';
                loadingOverlay.style.transform = 'translate(-50%, -20%)';
            }
        
            // Pass buttonOverlay as syncElement
            addDragFunctionality(loadingOverlay, buttonOverlay);
        };

        window.cgCustomGallery.handleResponse = function (response, image_seeds, image_tags) {
            const loadingOverlay = document.getElementById('cg-loading-overlay');
            const buttonOverlay = document.getElementById('cg-button-overlay');
            
            if (loadingOverlay) {
                if (loadingOverlay.dataset.timerInterval) {
                    clearInterval(loadingOverlay.dataset.timerInterval);
                }
                // Before removing, sync position to buttonOverlay
                const rect = loadingOverlay.getBoundingClientRect();
                if (buttonOverlay) {
                    buttonOverlay.style.left = `${rect.left}px`;
                    buttonOverlay.style.top = `${rect.top}px`;
                    buttonOverlay.style.transform = 'none';
                }
                loadingOverlay.remove();
            }
        
            seeds = image_seeds.split(',').map(seed => seed.trim()); 
            tags = image_tags.split('|');
            if (seeds.length !== tags.length) {
                console.warn('Mismatch: seeds count:', seeds.length, ' tags count:', tags.length);
            }
        
            if (!response || !response.data) {
                const errorMessage = response?.error || 'Unknown error';
                console.error('Failed to fetch image data:', errorMessage);
                customCommonOverlay().createErrorOverlay(errorMessage);
                return;
            }
        
            window.updateGallery(response.data);
        };
    
        function enterFullscreen(index) {
            const imgUrl = images[index];
            if (!imgUrl) {
                console.error('Invalid image index:', index);
                return;
            }
        
            const overlay = document.createElement('div');
            overlay.className = 'cg-fullscreen-overlay'; 
        
            const fullScreenImg = document.createElement('img');
            fullScreenImg.src = imgUrl;
            fullScreenImg.className = 'cg-fullscreen-image';
        
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
        
            const handleFullscreenKeyDown = (e) => { 
                if (e.key === 'Escape') {
                    exitFullscreen();
                } else if (e.key === 'ArrowRight' || e.key === ' ') {
                    currentIndex = (currentIndex + 1) % images.length;
                    fullScreenImg.src = images[currentIndex];
                } else if (e.key === 'ArrowLeft') {
                    currentIndex = (currentIndex - 1 + images.length) % images.length;
                    fullScreenImg.src = images[currentIndex];
                }
            };
            document.addEventListener('keydown', handleFullscreenKeyDown);
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
                    imgContainer.style.width = `${targetWidth}px`;
                    imgContainer.style.height = `${targetHeight}px`;
        
                    const img = document.createElement('img');
                    img.src = url;
                    img.className = 'cg-gallery-image'; 
                    img.addEventListener('click', () => enterFullscreen(index));
        
                    imgContainer.appendChild(img);
                    gallery.appendChild(imgContainer);
                });
        
                container.appendChild(gallery);
                ensureSwitchModeButton();
            };
        }
    
        function gallery_renderSplitMode() {
            if (!images || images.length === 0) {
                container.innerHTML = '<div class="cg-error-message">No images to display</div>';
                return;
            }
        
            container.innerHTML = '';
            const mainImageContainer = document.createElement('div');
            mainImageContainer.className = 'cg-main-image-container';
        
            const mainImage = document.createElement('img');
            mainImage.src = images[currentIndex];
            mainImage.className = 'cg-main-image';
            mainImage.addEventListener('click', (e) => {
                e.stopPropagation();
                enterFullscreen(currentIndex);
            });
        
            mainImageContainer.appendChild(mainImage);
            container.appendChild(mainImageContainer);
        
            mainImageContainer.addEventListener('click', (e) => {
                e.preventDefault();
                const rect = mainImageContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const isLeft = clickX < rect.width / 2;
        
                if (isLeft && images.length > 1) {
                    currentIndex = (currentIndex - 1 + images.length) % images.length;
                } else if (!isLeft && images.length > 1) {
                    currentIndex = (currentIndex + 1) % images.length;
                }
        
                mainImage.src = images[currentIndex];
                Array.from(previewContainer.children).forEach((child, i) => {
                    child.style.border = i === currentIndex ? '2px solid #3498db' : 'none';
                });
        
                const selectedPreview = previewContainer.children[currentIndex];
                if (selectedPreview) {
                    selectedPreview.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        
            const previewContainer = document.createElement('div');
            previewContainer.className = 'cg-preview-container scroll-container';
        
            images.forEach((url, index) => {
                const previewImage = document.createElement('img');
                previewImage.src = url;
                previewImage.className = 'cg-preview-image';
                previewImage.style.border = index === currentIndex ? '2px solid #3498db' : 'none';
                previewImage.addEventListener('click', (e) => {
                    e.preventDefault();
                    currentIndex = index;
                    mainImage.src = images[currentIndex];
                    Array.from(previewContainer.children).forEach((child, i) => {
                        child.style.border = i === currentIndex ? '2px solid #3498db' : 'none';
                    });
                    previewImage.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
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
                document.body.style.userSelect = 'none';
            });
        
            previewContainer.addEventListener('mouseleave', () => {
                isDragging = false;
                previewContainer.style.cursor = 'grab';
                document.body.style.userSelect = '';
            });
        
            previewContainer.addEventListener('mouseup', () => {
                isDragging = false;
                previewContainer.style.cursor = 'grab';
                document.body.style.userSelect = '';
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
            ensureSeedButton();
            ensureTagButton();
        
            const previewImages = previewContainer.querySelectorAll('.cg-preview-image');
            if (previewImages.length > 0) {
                previewImages[0].onload = () => {
                    const containerWidth = previewContainer.offsetWidth;
                    const firstImageWidth = previewImages[0].offsetWidth || 50;
                    const totalImagesWidth = firstImageWidth * previewImages.length;
            
                    if (totalImagesWidth < (containerWidth - firstImageWidth)) {
                        previewContainer.style.justifyContent = 'center';
                    } else {
                        previewContainer.style.justifyContent = 'flex-start';
                        if (previewImages.length > 10) {
                            const minWidth = Math.max(50, containerWidth / previewImages.length);
                            previewImages.forEach(img => {
                                img.style.maxWidth = `${minWidth}px`;
                            });
                        }
                    }
                    previewContainer.scrollLeft = 0;
                };
            }
        }
            
        function ensureSwitchModeButton() {
            let switchModeButton = document.getElementById('cg-switch-mode-button');
            if (!switchModeButton) {
                switchModeButton = document.createElement('button');
                switchModeButton.id = 'cg-switch-mode-button';
                switchModeButton.className = 'cg-button'; 
                switchModeButton.textContent = '<>';
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

        function ensureSeedButton() {
            let seedButton = document.getElementById('cg-seed-button');
            if (!seedButton) {
                seedButton = document.createElement('button');
                seedButton.id = 'cg-seed-button';
                seedButton.className = 'cg-button'; 
                seedButton.textContent = 'Seed';
                seedButton.addEventListener('click', () => {
                    if (seeds && seeds[currentIndex]) {
                        const seedToCopy = seeds[currentIndex].trim();
                        navigator.clipboard.writeText(seedToCopy)
                            .then(() => {
                                console.log(`Seed ${seedToCopy} copied to clipboard`);
                                seedButton.textContent = 'Copied!';
                                setTimeout(() => {
                                    seedButton.textContent = 'Seed';
                                }, 2000);
        
                                // Update Gradio Slider 
                                const sliderContainer = document.getElementById('random_seed');
                                if (sliderContainer) {
                                    // Find number and range 
                                    const numberInput = sliderContainer.querySelector('input[type="number"]');
                                    const rangeInput = sliderContainer.querySelector('input[type="range"]');
                                    
                                    if (numberInput && rangeInput) {
                                        const seedValue = parseInt(seedToCopy, 10); 
                                        if (!isNaN(seedValue) && seedValue >= -1 && seedValue <= 4294967295) {
                                            // update number
                                            numberInput.value = seedValue;
                                            numberInput.dispatchEvent(new Event('input', { bubbles: true }));
        
                                            // update range
                                            rangeInput.value = seedValue;
                                            rangeInput.dispatchEvent(new Event('input', { bubbles: true }));
        
                                            console.log(`Updated random_seed to ${seedValue}`);
                                        } else {
                                            console.error(`Seed value ${seedToCopy} is invalid or out of range (-1 to 4294967295)`);
                                        }
                                    } else {
                                        console.error('Number or range input not found in random_seed');
                                    }
                                } else {
                                    console.error('Slider with ID random_seed not found');
                                }
                            })
                            .catch(err => {
                                console.error('Failed to copy seed to clipboard:', err);
                            });
                    } else {
                        console.error('No seed available for current index:', currentIndex);
                    }
                });
                container.appendChild(seedButton);
            }
        }

        function ensureTagButton() {
            let tagButton = document.getElementById('cg-tag-button');
            if (!tagButton) {
                tagButton = document.createElement('button');
                tagButton.id = 'cg-tag-button';
                tagButton.className = 'cg-button';
                tagButton.textContent = 'Tags';
                tagButton.addEventListener('click', () => {
                    if (tags && tags[currentIndex]) {
                        const tagToCopy = tags[currentIndex].trim();
                        navigator.clipboard.writeText(tagToCopy)
                            .then(() => {
                                console.log(`Tag [${tagToCopy}] copied to clipboard`);
                                tagButton.textContent = 'Copied!';
                                setTimeout(() => {
                                    tagButton.textContent = 'Tags';
                                }, 2000);
                            })
                            .catch(err => {
                                console.error('Failed to copy tag to clipboard:', err);
                            });
                    } else {
                        console.error('No tag available for current index:', currentIndex);
                    }
                });
                container.appendChild(tagButton);
            }
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
            //console.log('Thumbnail gallery is already set up.');
            return;
        }

        isThumbSetup = true;

        console.log('Setting up the thumbnail gallery', container);

        function thumb_renderGridMode() {
            container.innerHTML = '';
            const gallery = document.createElement('div');
            gallery.className = 'cg-thumb-grid-container scroll-container';
        
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
                    imgContainer.style.width = `${targetWidth}px`; 
                    imgContainer.style.height = `${targetHeight}px`;
        
                    const img = document.createElement('img');
                    img.src = url;
                    img.className = 'cg-thumb-image';
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
        
            images.forEach((url) => {
                const img = document.createElement('img');
                img.src = url;
                img.className = 'cg-thumb-scroll-image'; 
                scrollContainer.appendChild(img);
            });

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
                switchModeButton.className = 'cg-button'; 
                switchModeButton.textContent = '<>';
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
                    <img src="${window.LOADING_FAILED_BASE64}" alt="Error" style="max-width: 128px; max-height: 128px; object-fit: contain; margin-bottom: 10px;">
                    <span>${errorMessage}</span>
                `,
                onClick: () => {
                    navigator.clipboard.writeText(errorMessage)
                        .then(() => {
                            console.log(`Error message "${errorMessage}" copied to clipboard`);
                        })
                        .catch(err => {
                            console.error('Failed to copy error message to clipboard:', err);
                        });
                    document.getElementById('cg-error-overlay').remove();
                }
            });
        }
    
        function createLoadingOverlay() {
            const overlay = createInfoOverlay({
                id: 'cg-loading-overlay',
                className: '',
                content: `
                    <img src="${window.LOADING_WAIT_BASE64}" alt="Loading" style="max-width: 128px; max-height: 128px; object-fit: contain; margin-bottom: 10px;">
                    <span>Now generating...</span>
                    <span class="cg-overlay-timer">Elapsed time: 0 seconds</span>
                `
            });
        
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
    
        return {
            createErrorOverlay,
            createLoadingOverlay
        };
    }

    function setupButtonOverlay() {
        console.log("Setting up button overlay");
    
        const generateButtons = document.getElementById('generate_buttons');
        if (!generateButtons) {
            console.error('Generate buttons container not found');
            return;
        }
    
        const buttonOverlay = document.createElement('div');
        buttonOverlay.id = 'cg-button-overlay';
        buttonOverlay.className = 'cg-overlay cg-button-overlay';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'cg-button-container';
        buttonContainer.style.paddingTop = '25px';
    
        const minimizeButton = document.createElement('button');
        minimizeButton.className = 'cg-minimize-button';
        minimizeButton.style.backgroundColor = '#3498db';
        minimizeButton.style.width = '12px';
        minimizeButton.style.height = '12px';
        minimizeButton.style.minWidth = '12px';
        minimizeButton.style.minHeight = '12px';
        minimizeButton.style.borderRadius = '50%';
        minimizeButton.style.border = 'none';
        minimizeButton.style.padding = '0';
        minimizeButton.style.margin = '0';
        minimizeButton.style.cursor = 'pointer';
        minimizeButton.style.position = 'absolute';
        minimizeButton.style.top = '8px'; 
        minimizeButton.style.left = '8px';
        minimizeButton.style.boxSizing = 'border-box';
        minimizeButton.style.transform = 'none';
    
        minimizeButton.addEventListener('load', () => {
            console.log('Minimize button rendered size:', {
                width: minimizeButton.offsetWidth,
                height: minimizeButton.offsetHeight
            });
        });
    
        const runButton = document.getElementById('run_button');
        const runRandomButton = document.getElementById('run_random_button');
    
        const clonedRunButton = runButton.cloneNode(true);
        const clonedRandomButton = runRandomButton.cloneNode(true);
    
        const preventClickIfDragged = (clonedButton, originalButton) => {
            let isDraggingButton = false;
            let hasMoved = false;
            const MOVE_THRESHOLD = 5;
    
            clonedButton.addEventListener('mousedown', (e) => {
                isDraggingButton = true;
                hasMoved = false;
                const startX = e.clientX;
                const startY = e.clientY;
    
                const onMove = (moveEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    const deltaY = moveEvent.clientY - startY;
                    if (Math.abs(deltaX) > MOVE_THRESHOLD || Math.abs(deltaY) > MOVE_THRESHOLD) {
                        hasMoved = true;
                    }
                };
    
                const onUp = (upEvent) => {
                    if (!hasMoved) {
                        originalButton.click();
                    }
                    isDraggingButton = false;
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                };
    
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        };
    
        preventClickIfDragged(clonedRandomButton, runRandomButton);
        preventClickIfDragged(clonedRunButton, runButton);
    
        buttonContainer.appendChild(clonedRandomButton);
        buttonContainer.appendChild(clonedRunButton);
        
        buttonOverlay.appendChild(minimizeButton);
        buttonOverlay.appendChild(buttonContainer);
        document.body.appendChild(buttonOverlay);
    
        const loadingOverlay = document.getElementById('cg-loading-overlay');
        addDragFunctionality(buttonOverlay, loadingOverlay);
    
        let isMinimized = false;
        let lastFullPosition = null;
    
        function setMinimizedState(overlay, container, button, isMin) {
            if (isMin) {
                overlay.style.top = '0px';
                overlay.style.left = '0px';
                overlay.style.transform = 'none';
                overlay.style.width = '30px';
                overlay.style.height = '30px';
                overlay.style.padding = '0';
                container.style.display = 'none';
                button.style.top = '7px';
                button.style.left = '7px';
            } else {
                overlay.style.width = '220px';
                overlay.style.padding = '20px';
                container.style.paddingTop = '25px';
                const savedPosition = JSON.parse(localStorage.getItem('overlayPosition'));
                if (savedPosition && savedPosition.top !== undefined && savedPosition.left !== undefined) {
                    overlay.style.top = `${savedPosition.top}px`;
                    overlay.style.left = `${savedPosition.left}px`;
                    overlay.style.transform = 'none';
                }
            }
        }
    
        minimizeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isMinimized) {
                const rect = buttonOverlay.getBoundingClientRect();
                lastFullPosition = { top: rect.top, left: rect.left };
                setMinimizedState(buttonOverlay, buttonContainer, minimizeButton, true);
                isMinimized = true;
            } else {
                buttonContainer.style.display = 'flex';
                buttonOverlay.style.height = '';
                minimizeButton.style.top = '8px';
                minimizeButton.style.left = '8px';
                setMinimizedState(buttonOverlay, buttonContainer, minimizeButton, false);
                isMinimized = false;
            }
        });
    
        function toggleButtonOverlayVisibility() {
            const loadingOverlay = document.getElementById('cg-loading-overlay');
            const errorOverlay = document.getElementById('cg-error-overlay');
            
            if (loadingOverlay || errorOverlay) {
                buttonOverlay.style.display = 'none';
            } else {
                buttonOverlay.style.display = 'flex';
                setMinimizedState(buttonOverlay, buttonContainer, minimizeButton, isMinimized);
            }
        }
    
        buttonOverlay.style.width = '220px';
        buttonOverlay.style.padding = '20px';
        const savedPosition = JSON.parse(localStorage.getItem('overlayPosition'));
        if (savedPosition && savedPosition.top !== undefined && savedPosition.left !== undefined) {
            buttonOverlay.style.top = `${savedPosition.top}px`;
            buttonOverlay.style.left = `${savedPosition.left}px`;
            buttonOverlay.style.transform = 'none';
        } else {
            buttonOverlay.style.top = '80%';
            buttonOverlay.style.left = '50%';
            buttonOverlay.style.transform = 'translate(-50%, -20%)';
        }
    
        toggleButtonOverlayVisibility();
    
        const observer = new MutationObserver(() => {
            toggleButtonOverlayVisibility();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    
        return function cleanup() {
            observer.disconnect();
            if (buttonOverlay && buttonOverlay.parentNode) {
                buttonOverlay.parentNode.removeChild(buttonOverlay);
            }
        };
    }

    console.log("[My JS] Script loaded, attempting initial setup");
    setupSuggestionSystem();
    setupGallery();
    setupThumb();
    setupButtonOverlay();
    dark_theme();
}
