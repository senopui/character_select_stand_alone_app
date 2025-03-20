//gosh... this is a mess... I'm sorry... I'll clean it up later... I promise...
function my_tag_autocomplete() {    
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
    
    // Log that the script has loaded and attempt initial setup
    console.log("Auto Tag JS: Script loaded, attempting initial setup");
    setupSuggestionSystem(); // Initialize the suggestion system immediately
    dark_theme(); // Apply the dark theme    
}
