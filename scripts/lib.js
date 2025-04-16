//more functions
function my_custom_js() {
    console.log("[My JS] Script loaded, attempting initial setup");
    dark_theme();

    window.LOADING_MESSAGE = 'Processing...';
    window.ELAPSED_TIME_PREFIX = 'Time elapsed: ';
    window.ELAPSED_TIME_SUFFIX = 'sec';
    window.WS_PORT = 47790

    // Initialize global dropdowns namespace
    window.dropdowns = window.dropdowns || {};

    // Synchronously initialize dropdowns to ensure availability
    myCharacterList();
    myViewsList();

    requestIdleCallback(() => {
        setupSuggestionSystem();
        setupGallery();
        setupThumb();
        setupButtonOverlay();
        myCharacterList();  
        myViewsList();      
    });    
    window.customOverlay = customCommonOverlay();

    window.addEventListener('resize', () => {
        const overlays = ['cg-button-overlay', 'cg-loading-overlay'];
        overlays.forEach(id => {
            const overlay = document.getElementById(id);
            if (overlay && !overlay.classList.contains('minimized')) {
                restrictOverlayPosition(overlay, {
                    translateX: id === 'cg-loading-overlay' 
                        ? (window.innerWidth - overlay.offsetWidth) / 2 
                        : window.innerWidth * 0.5 - 120,
                    translateY: id === 'cg-loading-overlay' 
                        ? window.innerHeight * 0.2 - overlay.offsetHeight * 0.2 
                        : window.innerHeight * 0.8
                });
            }
        });
    });

    // Apply dark theme
    function dark_theme() {
        const url = new URL(window.location);
        if (url.searchParams.get('__theme') !== 'dark') {
            url.searchParams.set('__theme', 'dark');
            window.location.href = url.href;
        }
    }

    // Utility: Debounce function to limit frequent calls
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Utility: Setup scrollable container with drag functionality
    function setupScrollableContainer(container) {
        let isDragging = false, startX, scrollLeft;
        container.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
            document.body.style.userSelect = 'none';
        });
        container.addEventListener('mouseleave', () => {
            isDragging = false;
            container.style.cursor = 'grab';
            document.body.style.userSelect = '';
        });
        container.addEventListener('mouseup', () => {
            isDragging = false;
            container.style.cursor = 'grab';
            document.body.style.userSelect = '';
        });
        container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 1;
            container.scrollLeft = scrollLeft - walk;
        });
    }

    // Utility: Ensure switch mode button with toggle function
    function ensureSwitchModeButton(container, toggleFunction, id) {
        let button = document.getElementById(id);
        if (!button) {
            button = document.createElement('button');
            button.id = id;
            button.className = 'cg-button';
            button.textContent = '<>';
            button.addEventListener('click', toggleFunction);
            container.appendChild(button);
        }
    }

    function setupSuggestionSystem() {
        const textboxes = document.querySelectorAll(
            '#custom_prompt_text textarea, #positive_prompt_text textarea, #negative_prompt_text textarea, #ai_prompt_text textarea, #prompt_ban_text textarea'
        );
    
        let lastWordSent = '';
        let skipSuggestion = false;
    
        textboxes.forEach(textbox => {
            if (textbox.dataset.suggestionSetup) return;
    
            console.log('Setting up the Suggestion System for ', textbox);
    
            const suggestionBox = document.createElement('div');
            suggestionBox.className = 'suggestion-box scroll-container';
            suggestionBox.style.display = 'none';
            document.body.appendChild(suggestionBox);
    
            let selectedIndex = -1;
            let currentSuggestions = [];
            const textboxWidth = textbox.offsetWidth;
    
            suggestionBox.addEventListener('click', (e) => {
                const item = e.target.closest('.suggestion-item');
                if (item) applySuggestion(item.dataset.value);
            });
    
            textbox.addEventListener('input', debounce(async () => {
                if (skipSuggestion) {
                    skipSuggestion = false;
                    return; // Skip suggestion generation if marked
                }

                updateSuggestionBoxPosition();
    
                const value = textbox.value;
                const cursorPosition = textbox.selectionStart;
                let wordToSend = extractWordToSend(value, cursorPosition);
    
                if (!wordToSend || wordToSend === lastWordSent) {
                    suggestionBox.style.display = 'none';
                    return;
                }
                lastWordSent = wordToSend;
    
                try {
                    const initialResponse = await fetch('/gradio_api/call/update_suggestions_js', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fn_index: 0, data: [wordToSend] })
                    });
    
                    if (!initialResponse.ok) throw new Error(`Initial API failed: ${initialResponse.status}`);
    
                    const initialResult = await initialResponse.json();
                    const eventId = initialResult.event_id;
                    if (!eventId) throw new Error('No event_id in response');
    
                    const suggestionResponse = await fetch(`/gradio_api/call/update_suggestions_js/${eventId}`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
    
                    if (!suggestionResponse.ok) throw new Error(`Suggestion API failed: ${suggestionResponse.status}`);
    
                    const rawSuggestions = await suggestionResponse.text();
                    const dataLine = rawSuggestions.split('\n').find(line => line.startsWith('data:'));
                    if (!dataLine) throw new Error('No data in response');
    
                    const suggestions = JSON.parse(dataLine.replace('data:', '').trim());
    
                    if (!suggestions || suggestions.length === 0 || suggestions.every(s => s.length === 0)) {
                        suggestionBox.style.display = 'none';
                        return;
                    }
    
                    const fragment = document.createDocumentFragment();
                    let maxWidth = 0;
                    const tempDiv = document.createElement('div');
                    tempDiv.style.position = 'absolute';
                    tempDiv.style.visibility = 'hidden';
                    tempDiv.style.whiteSpace = 'nowrap';
                    document.body.appendChild(tempDiv);
    
                    currentSuggestions = [];
                    suggestions[0].forEach((suggestion, index) => {
                        if (!Array.isArray(suggestion) || suggestion.length === 0) {
                            console.warn('Invalid suggestion format at index', index, suggestion);
                            return;
                        }
                        const element = suggestion[0];
                        if (typeof element !== 'string') {
                            console.error('Unexpected element type at index', index, ':', typeof element, element);
                            return;
                        }
                        const item = document.createElement('div');
                        item.className = 'suggestion-item';
                        item.innerHTML = element;
                        const promptMatch = element.match(/<b>(.*?)<\/b>/);
                        item.dataset.value = promptMatch ? promptMatch[1] : element.split(':')[0].trim();
                        tempDiv.textContent = element.replace(/<[^>]+>/g, '');
                        maxWidth = Math.max(maxWidth, tempDiv.offsetWidth);
                        currentSuggestions.push({ prompt: element });
                        fragment.appendChild(item);
                    });
    
                    document.body.removeChild(tempDiv);
                    suggestionBox.innerHTML = '';
                    suggestionBox.appendChild(fragment);
                    suggestionBox.style.width = `${Math.min(maxWidth + 20, 300)}px`;
                    suggestionBox.style.display = 'block';
                    selectedIndex = -1;
    
                } catch (error) {
                    console.error('Suggestion system error:', error);
                    suggestionBox.style.display = 'none';
                }
            }, 50));

            textbox.addEventListener('keydown', (e) => {
                if (suggestionBox.style.display !== 'none') {

                    const items = suggestionBox.querySelectorAll('.suggestion-item');
                    if (items.length === 0) return;

                    if (e.key === 'Tab' || e.key === 'Enter') {
                        e.preventDefault();
                        if (selectedIndex >= 0 && selectedIndex < currentSuggestions.length) {
                            applySuggestion(currentSuggestions[selectedIndex].prompt);
                        } else if (items.length > 0) {
                            applySuggestion(currentSuggestions[0].prompt);
                        }
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                        updateSelection(items);
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        selectedIndex = Math.max(selectedIndex - 1, 0);
                        updateSelection(items);
                    } else if (e.key === 'Escape') {
                        suggestionBox.style.display = 'none';
                    }
                }

                if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                    e.preventDefault();
                    adjustWeight(e.key === 'ArrowUp', textbox);
                }
            });

            function adjustWeight(isIncrease, textbox) {
                const value = textbox.value;
                const startPos = textbox.selectionStart;
                const endPos = textbox.selectionEnd;
    
                let targetText, start, end;
    
                if (startPos !== endPos) {
                    targetText = value.slice(startPos, endPos);
                    start = startPos;
                    end = endPos;
                } else {
                    const beforeCursor = value.slice(0, startPos);
                    const afterCursor = value.slice(startPos);
    
                    const bracketMatch = findBracketedTag(beforeCursor, afterCursor);
                    if (bracketMatch) {
                        targetText = bracketMatch.text;
                        start = bracketMatch.start;
                        end = bracketMatch.end;
                    } else {
                        const lastSeparatorBefore = Math.max(beforeCursor.lastIndexOf(','), beforeCursor.lastIndexOf('\n'));
                        const firstSeparatorAfter = afterCursor.indexOf(',') >= 0 ? afterCursor.indexOf(',') : afterCursor.indexOf('\n');
                        start = lastSeparatorBefore >= 0 ? lastSeparatorBefore + 1 : 0;
                        end = firstSeparatorAfter >= 0 ? startPos + firstSeparatorAfter : value.length;
                        targetText = value.slice(start, end).trim();
                    }
                }
    
                if (!targetText) return;
    
                let currentWeight = 1.0;
                const weightMatch = targetText.match(/^\((.+):(\d*\.?\d+)\)$/);
                if (weightMatch) {
                    targetText = weightMatch[1];
                    currentWeight = parseFloat(weightMatch[2]);
                }
    
                const step = 0.05;
                currentWeight = isIncrease ? currentWeight + step : currentWeight - step;
                if (currentWeight < 0.0 || currentWeight > 3.0) return;
                currentWeight = parseFloat(currentWeight.toFixed(2));
    
                const newTag = currentWeight === 1.0 ? targetText : `(${targetText}:${currentWeight})`;
    
                const newValue = value.slice(0, start) + newTag + value.slice(end);
                textbox.value = newValue;
    
                const newCursorPos = start + newTag.length;
                textbox.setSelectionRange(newCursorPos, newCursorPos);
    
                textbox.dispatchEvent(new Event('input', { bubbles: true }));
            }
    
            function findBracketedTag(beforeCursor, afterCursor) {
                const fullText = beforeCursor + afterCursor;
                const cursorPos = beforeCursor.length;
    
                const bracketRegex = /\(([^()]+:\d*\.?\d+)\)/g;
                let match;
                while ((match = bracketRegex.exec(fullText)) !== null) {
                    const start = match.index;
                    const end = start + match[0].length;
                    if (start <= cursorPos && cursorPos <= end) {
                        return {
                            text: match[0],
                            start: start,
                            end: end
                        };
                    }
                }
                return null;
            }

            document.addEventListener('click', (e) => {
                if (!suggestionBox.contains(e.target) && e.target !== textbox) {
                    suggestionBox.style.display = 'none';
                }
            });

            document.addEventListener('scroll', debounce(() => {
                if (suggestionBox.style.display !== 'none') {
                    updateSuggestionBoxPosition();
                }
            }, 100), true);

            function updateSelection(items) {
                items.forEach((item, idx) => item.classList.toggle('selected', idx === selectedIndex));
                if (selectedIndex >= 0) items[selectedIndex].scrollIntoView({ block: 'nearest' });
                textbox.focus();
            }

            function extractWordToSend(value, cursorPosition) {
                const beforeCursor = value.slice(0, cursorPosition);
                const afterCursor = value.slice(cursorPosition);
                
                // Find the last separator (comma or newline) before the cursor
                const lastCommaBefore = beforeCursor.lastIndexOf(',');
                const lastNewlineBefore = beforeCursor.lastIndexOf('\n');
                const start = Math.max(lastCommaBefore, lastNewlineBefore) >= 0 
                    ? Math.max(lastCommaBefore, lastNewlineBefore) + 1 
                    : 0;
            
                // Find the first separator (comma or newline) after the cursor
                const firstCommaAfter = afterCursor.indexOf(',');
                const firstNewlineAfter = afterCursor.indexOf('\n');
                
                let end;
                if (firstNewlineAfter === 0) {
                    // If cursor is immediately followed by a newline, end at cursor
                    end = cursorPosition;
                } else if (firstCommaAfter >= 0 || firstNewlineAfter >= 0) {
                    // Use the nearest separator after cursor
                    end = firstCommaAfter >= 0 && (firstNewlineAfter < 0 || firstCommaAfter < firstNewlineAfter)
                        ? cursorPosition + firstCommaAfter
                        : firstNewlineAfter >= 0
                        ? cursorPosition + firstNewlineAfter
                        : value.length;
                } else {
                    end = value.length;
                }
            
                // Extract the word, trim only leading/trailing spaces, not newlines
                const extracted = value.slice(start, end).trim();
                // If the extracted content ends with a comma or is empty, return empty string
                return extracted.endsWith(',') || extracted === '' ? '' : extracted;
            }

            function formatSuggestion(suggestion) {
                const withoutHeat = suggestion.replace(/\s\(\d+\)$/, '');
                let formatted = withoutHeat.replace(/_/g, ' ');
                formatted = formatted.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
                return formatted.startsWith(':') ? formatted : formatted.replace(/:/g, ' ');
            }

            function applySuggestion(promptText) {
                const promptMatch = promptText.match(/<b>(.*?)<\/b>/);                
                let formattedText = '';
                if (promptMatch) {
                    formattedText = formatSuggestion(promptMatch[1]);
                } else {
                    if (promptText.startsWith(':')) {
                        formattedText = promptText.trim();
                    } else {
                        formattedText = formatSuggestion(promptText.split(':')[0].trim());
                    }
                }
            
                const value = textbox.value;
                const cursorPosition = textbox.selectionStart;
            
                const beforeCursor = value.slice(0, cursorPosition);
                const afterCursor = value.slice(cursorPosition);
                const lastSeparatorBefore = Math.max(beforeCursor.lastIndexOf(','), beforeCursor.lastIndexOf('\n'));
                const firstCommaAfter = afterCursor.indexOf(',');
                const firstNewlineAfter = afterCursor.indexOf('\n');
                
                // Determine the start and end of the word being replaced
                const start = lastSeparatorBefore >= 0 ? lastSeparatorBefore + 1 : 0;
                let end = cursorPosition; 
                let suffix = ', ';
            
                // Handle cases based on what follows the cursor
                if (firstNewlineAfter === 0) {
                    end = cursorPosition; 
                    suffix = ','; 
                } else if (firstCommaAfter >= 0 || firstNewlineAfter >= 0) {
                    // Use the nearest separator after cursor, but don't overwrite full words unnecessarily
                    end = firstCommaAfter >= 0 && (firstNewlineAfter < 0 || firstCommaAfter < firstNewlineAfter)
                        ? cursorPosition + firstCommaAfter
                        : firstNewlineAfter >= 0
                        ? cursorPosition + firstNewlineAfter
                        : value.length;
                    suffix = firstCommaAfter >= 0 ? '' : firstNewlineAfter >= 0 ? ',' : ', ';
                }
            
                const isFirstWordInLine = start === 0 || value[start - 1] === '\n';
                const prefix = isFirstWordInLine ? '' : ' ';
            
                // Construct the new value
                const newValue = value.slice(0, start) + prefix + formattedText + suffix + value.slice(end);
                textbox.value = newValue.trim();
            
                // Set cursor position after the inserted text and comma (if present)
                const newCursorPosition = start + prefix.length + formattedText.length + (suffix.startsWith(',') ? 1 : 0);
                textbox.setSelectionRange(newCursorPosition, newCursorPosition);
            
                // Clear suggestions and hide suggestion box
                currentSuggestions = [];
                suggestionBox.innerHTML = '';
                suggestionBox.style.display = 'none';
            
                // Dispatch input event to notify changes, but mark it to skip suggestion generation
                const inputEvent = new Event('input', { bubbles: true });
                skipSuggestion = true; 
                textbox.dispatchEvent(inputEvent);
                textbox.focus();
            }

            function updateSuggestionBoxPosition() {
                const rect = textbox.getBoundingClientRect();
                const textboxTop = rect.top + window.scrollY;
                const textboxBottom = rect.bottom + window.scrollY;
                const textboxLeft = rect.left + window.scrollX;

                const cursorPosition = Math.min(textbox.selectionStart, textbox.value.length);
                const textBeforeCursor = textbox.value.substring(0, cursorPosition);

                const lineSpan = document.createElement('span');
                lineSpan.style.position = 'absolute';
                lineSpan.style.visibility = 'hidden';
                lineSpan.style.font = window.getComputedStyle(textbox).font;
                lineSpan.style.whiteSpace = 'pre-wrap';
                lineSpan.style.width = `${textboxWidth}px`;
                document.body.appendChild(lineSpan);

                const lines = [];
                let currentLine = '';
                for (let i = 0; i < textBeforeCursor.length; i++) {
                    lineSpan.textContent = currentLine + textBeforeCursor[i];
                    if (lineSpan.scrollWidth > textboxWidth || textBeforeCursor[i] === '\n') {
                        lines.push(currentLine);
                        currentLine = textBeforeCursor[i] === '\n' ? '' : textBeforeCursor[i];
                    } else {
                        currentLine += textBeforeCursor[i];
                    }
                }
                if (currentLine) lines.push(currentLine);
                document.body.removeChild(lineSpan);

                const widthSpan = document.createElement('span');
                widthSpan.style.position = 'absolute';
                widthSpan.style.visibility = 'hidden';
                widthSpan.style.font = window.getComputedStyle(textbox).font;
                widthSpan.style.whiteSpace = 'nowrap';
                widthSpan.textContent = lines[lines.length - 1] || '';
                document.body.appendChild(widthSpan);
                const cursorOffset = widthSpan.offsetWidth;
                document.body.removeChild(widthSpan);

                suggestionBox.style.display = 'block';
                const suggestionWidth = suggestionBox.offsetWidth || 200;
                const suggestionHeight = suggestionBox.offsetHeight || 100;
                if (!suggestionBox.innerHTML) suggestionBox.style.display = 'none';

                let newLeft = textboxLeft + cursorOffset;
                let newTop = textboxBottom;
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const paddingX = 24;
                const paddingY = 12;

                if (newLeft + suggestionWidth > windowWidth - paddingX) {
                    newLeft = Math.max(0, windowWidth - suggestionWidth - paddingX);
                }
                if (newLeft < textboxLeft) newLeft = textboxLeft;

                if (newTop + suggestionHeight > windowHeight + window.scrollY - paddingY) {
                    newTop = textboxTop - suggestionHeight - paddingY;
                    if (newTop < window.scrollY) newTop = textboxBottom;
                }

                suggestionBox.style.left = `${newLeft}px`;
                suggestionBox.style.top = `${newTop}px`;
                suggestionBox.style.zIndex = '10002';
                suggestionBox.style.transform = 'translateZ(0)';
            }

            textbox.dataset.suggestionSetup = 'true';
        });
    }

    function setupGallery() {
        if (window.isGallerySetup) return;
        window.isGallerySetup = true;

        let isGridMode = false;
        let currentIndex = 0;
        let images = [];
        let seeds = [];
        let tags = [];
        let privacyBalls = [];

        const container = document.getElementById('cg-custom-gallery');
        if (!container) {
            console.error('Gallery container not found');
            return;
        }

        if (!window.cgCustomGallery) {
            window.cgCustomGallery = {};
        }

        window.cgCustomGallery.showLoading = function () {
            const loadingOverlay = customCommonOverlay().createLoadingOverlay();
            const buttonOverlay = document.getElementById('cg-button-overlay');
        
            const savedPosition = JSON.parse(localStorage.getItem('overlayPosition'));
            if (savedPosition && savedPosition.top !== undefined && savedPosition.left !== undefined) {
                loadingOverlay.style.top = `${savedPosition.top}px`;
                loadingOverlay.style.left = `${savedPosition.left}px`;
                loadingOverlay.style.transform = 'none';
            } else if (buttonOverlay) {
                const rect = buttonOverlay.getBoundingClientRect();
                loadingOverlay.style.top = `${rect.top}px`;
                loadingOverlay.style.left = `${rect.left}px`;
                loadingOverlay.style.transform = 'none';
            } else {
                loadingOverlay.style.top = '20%';
                loadingOverlay.style.left = '50%';
                loadingOverlay.style.transform = 'translate(-50%, -20%)';
            }
        
            addDragFunctionality(loadingOverlay, buttonOverlay);
        };

        window.cgCustomGallery.handleResponse = function (response, image_seeds, image_tags) {
            const loadingOverlay = document.getElementById('cg-loading-overlay');
            const buttonOverlay = document.getElementById('cg-button-overlay');
        
            if (loadingOverlay) {
                if (loadingOverlay.dataset.timerInterval) {
                    clearInterval(loadingOverlay.dataset.timerInterval);
                }
                
                if (buttonOverlay && !buttonOverlay.classList.contains('minimized')) {
                    const rect = loadingOverlay.getBoundingClientRect();
                    buttonOverlay.style.left = '0';
                    buttonOverlay.style.top = '0';
                    buttonOverlay.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
                    if (buttonOverlay.updateDragPosition) {
                        buttonOverlay.updateDragPosition(rect.left, rect.top);
                    }
                }
                loadingOverlay.remove();
            }
        
            seeds = image_seeds.split(',').map(seed => seed.trim());
            tags = image_tags.split('|');
            if (seeds.length !== tags.length) {
                console.warn('Mismatch: seeds count:', seeds.length, ' tags count:', tags.length);
            }
            
            if (!response) {
                const errorMessage = 'Unknown error from Backend';
                console.error('Failed to fetch response:', errorMessage);
                customCommonOverlay().createErrorOverlay(errorMessage);
                return;
            }
            else if(!response.data) {
                if ('success' !== response.error) {
                    const errorMessage = response.error;
                    console.error('Failed to fetch image data:', errorMessage);
                    customCommonOverlay().createErrorOverlay(errorMessage);
                }
                return;
            }
        
            window.updateGallery(response.data);
        };

        function ensurePrivacyButton() {
            let privacyButton = document.getElementById('cg-privacy-button');
            if (!privacyButton) {
                privacyButton = document.createElement('button');
                privacyButton.id = 'cg-privacy-button';
                privacyButton.className = 'cg-button';
                privacyButton.textContent = '(X)';
                privacyButton.style.top = '50px'; 
                privacyButton.style.left = '10px';
                privacyButton.style.background = 'linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet)';
                privacyButton.addEventListener('click', () => {
                    if (privacyBalls.length >= 5) {
                        console.log('Maximum 5 privacy balls reached');
                        return;
                    }
                    createPrivacyBall();
                });
                container.appendChild(privacyButton);
            }
        }
    
        function createPrivacyBall() {
            const ball = document.createElement('div');
            ball.className = 'cg-privacy-ball';
            ball.innerHTML = 'SAA';

            ball.style.width = '100px';
            ball.style.height = '100px'; 
        
            // Set initial position (dynamic, remains in JS)
            const galleryRect = container.getBoundingClientRect();
            const left = galleryRect.left + galleryRect.width / 2 - 50; 
            const top = galleryRect.top + galleryRect.height / 2 - 50; 
            ball.style.left = `${left}px`;
            ball.style.top = `${top}px`;
        
            // Dragging functionality
            let isDragging = false, startX, startY;
            ball.addEventListener('mousedown', (e) => {
                if (e.button === 0) { 
                    e.preventDefault();
                    isDragging = true;
                    startX = e.clientX - parseFloat(ball.style.left || 0);
                    startY = e.clientY - parseFloat(ball.style.top || 0);
                    ball.style.cursor = 'grabbing'; 
                    document.body.style.userSelect = 'none';
                } else if (e.button === 2) { 
                    e.preventDefault();
                    const startY = e.clientY;
                    const startSize = parseFloat(ball.style.width || 100);
        
                    const onMouseMove = (moveEvent) => {
                        const deltaY = moveEvent.clientY - startY;
                        let newSize = startSize + deltaY;
                        newSize = Math.min(Math.max(newSize, 20), 300); 
                        ball.style.width = `${newSize}px`;
                        ball.style.height = `${newSize}px`;
                        ball.style.fontSize = `${newSize * 0.2}px`; 
                    };
        
                    const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };
        
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                }
            });
        
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                ball.style.left = `${e.clientX - startX}px`;
                ball.style.top = `${e.clientY - startY}px`;
            });
        
            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    ball.style.cursor = 'grab'; 
                    document.body.style.userSelect = '';
                }
            });
        
            // Disable context menu
            ball.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        
            // Double-click to remove
            ball.addEventListener('dblclick', () => {
                ball.remove();
                privacyBalls = privacyBalls.filter(b => b !== ball);
                console.log(`Privacy ball removed. Remaining: ${privacyBalls.length}`);
            });
        
            document.body.appendChild(ball);
            privacyBalls.push(ball);
            console.log(`Privacy ball created. Total: ${privacyBalls.length}`);
        }

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

            let isDragging = false, startX = 0, startY = 0, translateX = 0, translateY = 0;

            fullScreenImg.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                fullScreenImg.style.cursor = 'grabbing';
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            function onMouseMove(e) {
                if (!isDragging) return;
                e.preventDefault();
                e.stopPropagation();

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

            let scale = 1;
            fullScreenImg.addEventListener('wheel', (e) => {
                e.preventDefault();
                scale += e.deltaY * -0.001;
                scale = Math.min(Math.max(0.5, scale), 4);
                fullScreenImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) exitFullscreen();
            });

            document.addEventListener('keydown', handleFullscreenKeyDown);
            overlay.appendChild(fullScreenImg);
            document.body.appendChild(overlay);

            function handleFullscreenKeyDown(e) {
                if (e.key === 'Escape') {
                    exitFullscreen();
                } else if (e.key === 'ArrowRight' || e.key === ' ') {
                    currentIndex = (currentIndex + 1) % images.length;
                    fullScreenImg.src = images[currentIndex];
                } else if (e.key === 'ArrowLeft') {
                    currentIndex = (currentIndex - 1 + images.length) % images.length;
                    fullScreenImg.src = images[currentIndex];
                }
            }

            privacyBalls.forEach(ball => {
                ball.style.zIndex = '10003';
            });

            function exitFullscreen() {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleFullscreenKeyDown);
                privacyBalls.forEach(ball => {
                    ball.style.zIndex = '10003';
                });
            }
        }

        function gallery_renderGridMode() {
            container.innerHTML = '';
            const gallery = document.createElement('div');
            gallery.className = 'cg-gallery-grid-container scroll-container';

            const containerWidth = container.offsetWidth;
            const firstImage = new Image();
            firstImage.src = images[0];
            firstImage.onload = () => {
                const aspectRatio = firstImage.width / firstImage.height;
                const targetHeight = 200;
                const targetWidth = targetHeight * aspectRatio;
                const itemsPerRow = Math.floor(containerWidth / (targetWidth + 10));
                gallery.style.gridTemplateColumns = `repeat(${itemsPerRow}, ${targetWidth}px)`;

                const fragment = document.createDocumentFragment();
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
                    fragment.appendChild(imgContainer);
                });

                gallery.appendChild(fragment);
                container.appendChild(gallery);
                ensureSwitchModeButton(container, () => {
                    isGridMode = !isGridMode;
                    isGridMode ? gallery_renderGridMode() : gallery_renderSplitMode();
                }, 'cg-switch-mode-button');
                ensurePrivacyButton();
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
            mainImage.addEventListener('click', () => enterFullscreen(currentIndex));

            mainImageContainer.appendChild(mainImage);
            container.appendChild(mainImageContainer);

            mainImageContainer.addEventListener('click', (e) => {
                e.preventDefault();
                const rect = mainImageContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const isLeft = clickX < rect.width / 2;
            
                if (e.target !== mainImage && images.length > 1) {
                    if (isLeft) {
                        currentIndex = (currentIndex - 1 + images.length) % images.length;
                    } else {
                        currentIndex = (currentIndex + 1) % images.length;
                    }
                    mainImage.src = images[currentIndex];
                    updatePreviewBorders();
                }
            });

            const previewContainer = document.createElement('div');
            previewContainer.className = 'cg-preview-container scroll-container';
            setupScrollableContainer(previewContainer);

            const fragment = document.createDocumentFragment();
            images.forEach((url, index) => {
                const previewImage = document.createElement('img');
                previewImage.src = url;
                previewImage.className = 'cg-preview-image';
                previewImage.style.border = index === currentIndex ? '2px solid #3498db' : 'none';
                previewImage.addEventListener('click', (e) => {
                    e.preventDefault();
                    currentIndex = index;
                    mainImage.src = images[currentIndex];
                    updatePreviewBorders();
                    previewImage.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                });
                fragment.appendChild(previewImage);
            });

            previewContainer.appendChild(fragment);
            container.appendChild(previewContainer);

            ensureSwitchModeButton(container, () => {
                isGridMode = !isGridMode;
                isGridMode ? gallery_renderGridMode() : gallery_renderSplitMode();
            }, 'cg-switch-mode-button');
            ensureSeedButton();
            ensureTagButton();
            ensurePrivacyButton();
            adjustPreviewContainer(previewContainer);
        }

        function updatePreviewBorders() {
            const previewImages = container.querySelectorAll('.cg-preview-image');
            previewImages.forEach((child, i) => {
                child.style.border = i === currentIndex ? '2px solid #3498db' : 'none';
            });
            const selectedPreview = previewImages[currentIndex];
            if (selectedPreview) {
                selectedPreview.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }

        function adjustPreviewContainer(previewContainer) {
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
                            previewImages.forEach(img => img.style.maxWidth = `${minWidth}px`);
                        }
                    }
                    previewContainer.scrollLeft = 0;
                };
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
                        navigator.clipboard.writeText(seedToCopy).then(() => {
                            console.log(`Seed ${seedToCopy} copied to clipboard`);
                            seedButton.textContent = 'Copied!';
                            setTimeout(() => seedButton.textContent = 'Seed', 2000);
        
                            const sliderContainer = document.getElementById('random_seed');
                            if (sliderContainer) {
                                const numberInput = sliderContainer.querySelector('input[type="number"]');
                                const rangeInput = sliderContainer.querySelector('input[type="range"]');
                                if (numberInput && rangeInput) {
                                    const seedValue = parseInt(seedToCopy, 10);
                                    const currentValue = parseInt(numberInput.value, 10);
                                    if (!isNaN(seedValue) && seedValue >= -1 && seedValue <= 4294967295) {
                                        let targetValue = seedValue;
                                        if (currentValue === seedValue) {
                                            targetValue = -1; 
                                            console.log(`Seed matches current value (${seedValue}), resetting to -1`);
                                        } else {
                                            console.log(`Updating random_seed to ${seedValue}`);
                                        }
        
                                        numberInput.value = targetValue;
                                        numberInput.dispatchEvent(new Event('input', { bubbles: true }));
                                        rangeInput.value = targetValue;
                                        rangeInput.dispatchEvent(new Event('input', { bubbles: true }));
                                    }
                                }
                            }
                        }).catch(err => console.error('Failed to copy seed:', err));
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
                        navigator.clipboard.writeText(tagToCopy).then(() => {
                            console.log(`Tag [${tagToCopy}] copied to clipboard`);
                            tagButton.textContent = 'Copied!';
                            setTimeout(() => tagButton.textContent = 'Tags', 2000);
                        }).catch(err => console.error('Failed to copy tag:', err));
                    }
                });
                container.appendChild(tagButton);
            }
        }

        window.updateGallery = function (imageData) {
            if (!Array.isArray(imageData) || imageData.length === 0) return;
            images = imageData;
            currentIndex = 0;
            isGridMode ? gallery_renderGridMode() : gallery_renderSplitMode();
        };
    }

    function setupThumb() {
        if (window.isThumbSetup) return;
        window.isThumbSetup = true;
    
        let isGridMode = false;
        let images = [];
    
        const container = document.getElementById('cg-custom-thumb');
        if (!container) {
            console.error('Thumbnail gallery container not found');
            return;
        }
    
        console.log('Setting up the thumbnail gallery', container);
    
        function thumb_renderGridMode() {
            container.innerHTML = '';
            if (images.length === 0) {
                const switchModeButton = document.getElementById('cg-thumb-switch-mode-button');
                if (switchModeButton) switchModeButton.remove();
                return;
            }
    
            const gallery = document.createElement('div');
            gallery.className = 'cg-thumb-grid-container scroll-container';
    
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
    
            const firstImage = new Image();
            firstImage.src = images[0];
            firstImage.onload = () => {
                const aspectRatio = firstImage.width / firstImage.height;
                const targetHeight = containerHeight / 1.2;
                const targetWidth = targetHeight * aspectRatio;
                const itemsPerRow = Math.floor(containerWidth / (targetWidth + 10));
                gallery.style.gridTemplateColumns = `repeat(${itemsPerRow}, ${targetWidth}px)`;
    
                const fragment = document.createDocumentFragment();
                images.forEach(url => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'cg-thumb-item';
                    imgContainer.style.width = `${targetWidth}px`;
                    imgContainer.style.height = `${targetHeight}px`;
    
                    const img = document.createElement('img');
                    img.src = url;
                    img.className = 'cg-thumb-image';
                    imgContainer.appendChild(img);
                    fragment.appendChild(imgContainer);
                });
    
                gallery.appendChild(fragment);
                container.appendChild(gallery);
                ensureSwitchModeButton(container, () => {
                    isGridMode = !isGridMode;
                    isGridMode ? thumb_renderGridMode() : thumb_renderSplitMode();
                }, 'cg-thumb-switch-mode-button');
            };
            firstImage.onerror = () => {
                console.error('Failed to load first image for grid mode');
                container.innerHTML = '';
                const switchModeButton = document.getElementById('cg-thumb-switch-mode-button');
                if (switchModeButton) switchModeButton.remove();
            };
        }
    
        function thumb_renderSplitMode() {
            container.innerHTML = '';
            if (images.length === 0) {
                const switchModeButton = document.getElementById('cg-thumb-switch-mode-button');
                if (switchModeButton) switchModeButton.remove();
                return;
            }
    
            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'cg-thumb-scroll-container scroll-container';
            setupScrollableContainer(scrollContainer);
    
            const fragment = document.createDocumentFragment();
            images.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.className = 'cg-thumb-scroll-image';
                fragment.appendChild(img);
            });
    
            scrollContainer.appendChild(fragment);
            container.appendChild(scrollContainer);
            ensureSwitchModeButton(container, () => {
                isGridMode = !isGridMode;
                isGridMode ? thumb_renderGridMode() : thumb_renderSplitMode();
            }, 'cg-thumb-switch-mode-button');
        }
    
        window.updateThumbGallery = function (imageData) {
            if (!Array.isArray(imageData) || imageData.length === 0) {
                container.innerHTML = '';
                const switchModeButton = document.getElementById('cg-thumb-switch-mode-button');
                if (switchModeButton) switchModeButton.remove();
                images = [];
                return;
            }
    
            images = imageData;
            isGridMode ? thumb_renderGridMode() : thumb_renderSplitMode();
        };
    
        thumb_renderGridMode();
    }

    function customCommonOverlay() {
        function createInfoOverlay({ id, content, className = '', onClick = null }) {
            let overlay = document.getElementById(id);
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = id;
                overlay.className = `cg-overlay ${className}`;
                document.body.appendChild(overlay);
            }
            overlay.innerHTML = content;
            if (onClick) overlay.onclick = onClick;
            return overlay;
        }
    
        function createErrorOverlay(errorMessage) {
            let displayMessage = errorMessage;
            let copyContent = errorMessage;
        
            const hasUrl = /\[COPY_URL\]/.test(errorMessage);
            const hasCustom = /\[COPY_CUSTOM/.test(errorMessage);
        
            if (hasUrl) {
                displayMessage = displayMessage.replace(
                    /\[COPY_URL\](https?:\/\/[^\s]+)\[\/COPY_URL\]/g,
                    '<a href="$1" target="_blank" style="color: #1e90ff; text-decoration: underline;">$1</a>'
                );
                const urlMatches = [...errorMessage.matchAll(/\[COPY_URL\](https?:\/\/[^\s]+)\[\/COPY_URL\]/g)];
                if (urlMatches.length > 0) {
                    copyContent = urlMatches[urlMatches.length - 1][1]; 
                }
            }
        
            if (hasCustom) {
                displayMessage = displayMessage.replace(
                    /\[COPY_CUSTOM(?:=(#[0-9A-Fa-f]{6}|[a-zA-Z]+))?\](.+?)\[\/COPY_CUSTOM\]/g,
                    (match, color, text) => {
                        const colorStyle = color || '#000000';
                        return `<span style="color: ${colorStyle}">${text}</span>`;
                    }
                );
    
                if (!hasUrl) {
                    const customMatches = [...errorMessage.matchAll(/\[COPY_CUSTOM(?:=(#[0-9A-Fa-f]{6}|[a-zA-Z]+))?\](.+?)\[\/COPY_CUSTOM\]/g)];
                    if (customMatches.length > 0) {
                        copyContent = customMatches[customMatches.length - 1][2];
                    }
                }
            }
        
            const overlay = createInfoOverlay({
                id: 'cg-error-overlay',
                className: 'cg-overlay-error',
                content: `
                    <div class="cg-error-content" style="display: flex; flex-direction: column; align-items: center;">
                        <img src="${window.LOADING_FAILED_BASE64}" alt="Error" style="max-width: 128px; max-height: 128px; object-fit: contain; margin-bottom: 15px;">
                        <pre style="white-space: pre-wrap; padding: 0 20px; margin: 0; max-width: 100%; font-size: 1.2em;">${displayMessage}</pre>
                    </div>
                `,
                onClick: (e) => {
                    if (e.target.tagName === 'A') {
                        e.stopPropagation();
                        return;
                    }
                    navigator.clipboard.writeText(copyContent)
                        .then(() => console.log(`Copied to clipboard: "${copyContent}"`))
                        .catch(err => console.error('Failed to copy:', err));
                    document.getElementById('cg-error-overlay').remove();
                }
            });
        
            overlay.style.width = 'fit-content';
            overlay.style.minWidth = '200px';
            overlay.style.maxWidth = 'min(1000px, 90vw)';
            overlay.style.boxSizing = 'border-box';
            overlay.style.padding = '20px';
        
            const contentPre = overlay.querySelector('.cg-error-content pre');
            if (contentPre) {
                contentPre.style.boxSizing = 'border-box';
                contentPre.style.wordWrap = 'break-word';
            }
        
            return overlay;
        }
    
        function createLoadingOverlay() {
            let currentImage = window.LOADING_WAIT_BASE64;
            let lastBase64 = currentImage;     
            const overlay = createInfoOverlay({
                id: 'cg-loading-overlay',
                className: '',
                content: `
                    <img src="${currentImage}" alt="Loading" style="max-width: 128px; max-height: 128px; object-fit: contain; margin-bottom: 10px;">
                    <span>${window.LOADING_MESSAGE || 'Now generating...'}</span>
                    <span class="cg-overlay-timer">${window.ELAPSED_TIME_PREFIX || 'Elapsed time:'} 0 ${window.ELAPSED_TIME_SUFFIX || 'seconds'}</span>
                `
            });
            overlay.style.zIndex = '10001';
            overlay.style.pointerEvents = 'auto';

            const savedPosition = JSON.parse(localStorage.getItem('overlayPosition'));
            const buttonOverlay = document.getElementById('cg-button-overlay');
            let translateX, translateY;
    
            if (savedPosition && savedPosition.top !== undefined && savedPosition.left !== undefined) {
                translateX = savedPosition.left;
                translateY = savedPosition.top;
            } else if (buttonOverlay && !buttonOverlay.classList.contains('minimized')) {
                const rect = buttonOverlay.getBoundingClientRect();
                translateX = rect.left;
                translateY = rect.top;
            } else {
                translateX = (window.innerWidth - overlay.offsetWidth) / 2;
                translateY = window.innerHeight * 0.2 - overlay.offsetHeight * 0.2;
            }
    
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.transform = `translate(${translateX}px, ${translateY}px)`;
    
            if (overlay.updateDragPosition) {
                overlay.updateDragPosition(translateX, translateY);
            }
    
            restrictOverlayPosition(overlay, {
                translateX: (window.innerWidth - overlay.offsetWidth) / 2,
                translateY: window.innerHeight * 0.2 - overlay.offsetHeight * 0.2
            });
    
            let ws = null;
            try {
                const ws_server = `ws://127.0.0.1:${window.WS_PORT}/ws`;
                ws = new WebSocket(ws_server);
                ws.onopen = () => {
                    //console.log('[WebSocket] Connected to Python server', ws_server);
                };
                ws.onmessage = (event) => {
                    //console.log('[WebSocket] Raw message received:', event.data);
                    try {
                        const data = JSON.parse(event.data);
                        //console.log('[WebSocket] Parsed data:', data);
                        if (data.base64 && data.base64.startsWith('data:image/')) {
                            const newBase64 = data.base64.trim();
                            if (newBase64 !== lastBase64) {
                                lastBase64 = newBase64;
                                currentImage = newBase64;
                                const imgElement = overlay.querySelector('img');
                                if (imgElement) {
                                    imgElement.src = currentImage;
                                    imgElement.style.maxWidth = '256px';
                                    imgElement.style.maxHeight = '384px';
                                    imgElement.style.objectFit = 'contain';
                                    //console.log('[WebSocket] Updated image src:', currentImage);
                                    imgElement.onerror = () => {
                                        //console.warn('[WebSocket] Failed to load image, reverting to default');
                                        currentImage = window.LOADING_WAIT_BASE64;
                                        lastBase64 = currentImage;
                                        imgElement.src = currentImage;
                                        imgElement.style.maxWidth = '128px';
                                        imgElement.style.maxHeight = '128px';
                                        imgElement.onerror = null;
                                    };
                                }
                            } else {
                                //console.log('[WebSocket] Skipping duplicate base64');
                            }
                        } else {
                            console.warn('[WebSocket] Invalid data format:', data);
                        }
                    } catch (e) {
                        console.warn('[WebSocket] Failed to process message:', e.message, 'Raw data:', event.data);
                    }
                };
                ws.onerror = (error) => {
                    console.warn('[WebSocket] Error:', error);
                };
                ws.onclose = () => {
                    //console.log('[WebSocket] Connection closed');
                    ws = null;
                };
            } catch (e) {
                console.warn('[WebSocket] Failed to initialize:', e.message);
            }
    
            const startTime = Date.now();
            if (overlay.dataset.timerInterval) clearInterval(overlay.dataset.timerInterval);
            const timerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const timerElement = overlay.querySelector('.cg-overlay-timer');
                if (timerElement) {
                    timerElement.textContent = `${window.ELAPSED_TIME_PREFIX || 'Elapsed time:'} ${elapsed} ${window.ELAPSED_TIME_SUFFIX || 'seconds'}`;
                }
            }, 1000);
            overlay.dataset.timerInterval = timerInterval;
    
            overlay._cleanup = () => {
                if (overlay.dataset.timerInterval) {
                    clearInterval(overlay.dataset.timerInterval);
                    delete overlay.dataset.timerInterval;
                }
                if (ws) {
                    ws.close();
                    ws = null;
                }
            };
    
            return overlay;
        }
    
        function createCustomOverlay(image, message) {
            const displayMessage = (typeof message === 'string' && message.trim()) ? message : ' ';
            const hasImage = image && image !== 'none' && typeof image === 'string' && image.startsWith('data:');
        
            let processedMessage = displayMessage.replace(
                /\[COPY_URL\](https?:\/\/[^\s]+)\[\/COPY_URL\]/g,
                '<a href="$1" target="_blank" style="color: #1e90ff; text-decoration: underline;">$1</a>'
            ).replace(
                /\[COPY_CUSTOM(?:=(#[0-9A-Fa-f]{6}|[a-zA-Z]+))?\](.+?)\[\/COPY_CUSTOM\]/g,
                (match, color, text) => {
                    const colorStyle = color || '#ffffff';
                    return `<span style="color: ${colorStyle}">${text}</span>`;
                }
            );
        
            const overlay = createInfoOverlay({
                id: 'cg-custom-overlay',
                className: 'cg-custom-overlay',
                content: `
                    <div class="cg-custom-content">
                        <div class="cg-drag-handle"></div>
                        <div class="cg-custom-textbox scroll-container"></div>
                    </div>
                `
            });
        
            const textbox = overlay.querySelector('.cg-custom-textbox');
            textbox.style.display = 'flex';
            textbox.style.flexDirection = 'column';
            textbox.style.gap = '10px';
            textbox.style.alignItems = 'center';
        
            const fragment = document.createDocumentFragment();
        
            if (hasImage) {
                const img = document.createElement('img');
                img.src = image;
                img.alt = 'Overlay Image';
                img.style.maxWidth = '384px';
                img.style.maxHeight = '384px';
                img.style.objectFit = 'contain';
                img.style.display = 'block';
                img.style.margin = '0 auto';
                fragment.appendChild(img);
            }
        
            const textPre = document.createElement('pre');
            textPre.innerHTML = processedMessage;
            textPre.style.textAlign = 'inherit';
            textPre.style.overflow = 'visible';
            textPre.style.width = '100%';
            fragment.appendChild(textPre);
        
            textbox.appendChild(fragment);
        
            const closeButton = document.createElement('button');
            closeButton.className = 'cg-close-button';
            closeButton.style.backgroundColor = '#ff0000';
            closeButton.style.width = '14px';
            closeButton.style.height = '14px';
            closeButton.style.minWidth = '14px';
            closeButton.style.minHeight = '14px';
            closeButton.style.borderRadius = '50%';
            closeButton.style.border = 'none';
            closeButton.style.padding = '0';
            closeButton.style.margin = '0';
            closeButton.style.cursor = 'pointer';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '8px';
            closeButton.style.left = '8px';
            closeButton.style.boxSizing = 'border-box';
            closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                overlay.remove();
                document.removeEventListener('mousemove', overlay._onMouseMove);
                document.removeEventListener('mouseup', overlay._onMouseUp);
                document.removeEventListener('mousemove', overlay._onResizeMove);
                document.removeEventListener('mouseup', overlay._onResizeUp);
                if (overlay._cleanup) overlay._cleanup();
            });
            overlay.appendChild(closeButton);
        
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'cg-resize-handle';
            overlay.appendChild(resizeHandle);
        
            overlay.style.minWidth = '200px';
            overlay.style.maxWidth = 'min(1600px, 90vw)';
            overlay.style.minHeight = '150px';
            overlay.style.boxSizing = 'border-box';
            overlay.style.padding = '20px';
            overlay.style.pointerEvents = 'auto';
            overlay.style.zIndex = '9999';
        
            const defaultWidth = 600;
            const defaultHeight = 800;
            const savedSize = localStorage.getItem('customOverlaySize') ? JSON.parse(localStorage.getItem('customOverlaySize')) : null;
            let initialWidth = defaultWidth;
            let initialHeight = defaultHeight;
        
            if (savedSize && savedSize.width >= 200 && savedSize.width <= 1600 && savedSize.height >= 150 && savedSize.height <= 1600) {
                initialWidth = savedSize.width;
                initialHeight = savedSize.height;
            }
        
            overlay.style.width = `${initialWidth}px`;
            overlay.style.height = `${initialHeight}px`;
        
            const savedPosition = localStorage.getItem('customOverlayPosition') ? JSON.parse(localStorage.getItem('customOverlayPosition')) : null;
            if (savedPosition && savedPosition.top !== undefined && savedPosition.left !== undefined) {
                overlay.style.position = 'fixed';
                overlay.style.top = `${savedPosition.top}px`;
                overlay.style.left = `${savedPosition.left}px`;
                overlay.style.transform = 'none';
            } else {
                overlay.style.position = 'fixed';
                overlay.style.top = '10%';
                overlay.style.left = '50%';
                overlay.style.transform = 'translate(-50%, -10%)';
            }
        
            const adjustOverlaySize = () => {
                const rect = overlay.getBoundingClientRect();
                const resizeHandleOffset = 4; 
                const rightEdge = rect.left + rect.width - resizeHandleOffset;
                const bottomEdge = rect.top + rect.height - resizeHandleOffset;
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const padding = 10; 
        
                let newWidth = rect.width;
                let newHeight = rect.height;
        
                if (rightEdge > viewportWidth - padding) {
                    newWidth = viewportWidth - rect.left - padding;
                    newWidth = Math.max(newWidth, 200); 
                }
                if (bottomEdge > viewportHeight - padding) {
                    newHeight = viewportHeight - rect.top - padding;
                    newHeight = Math.max(newHeight, 150); 
                }
        
                if (newWidth !== rect.width || newHeight !== rect.height) {
                    overlay.style.width = `${newWidth}px`;
                    overlay.style.height = `${newHeight}px`;
                    localStorage.setItem('customOverlaySize', JSON.stringify({
                        width: newWidth,
                        height: newHeight
                    }));
                }
            };
        
            requestAnimationFrame(adjustOverlaySize);
        
            const resizeCleanup = addResizeFunctionality(overlay, resizeHandle);
            const dragHandle = overlay.querySelector('.cg-drag-handle');
            const dragCleanup = addCustomOverlayDragFunctionality(overlay, dragHandle, () => null, 'customOverlayPosition');
        
            overlay._cleanup = () => {
                dragCleanup();
                resizeCleanup();
            };
        
            if (hasImage) {
                const imgElement = textbox.querySelector('img');
                imgElement.onerror = () => {
                    console.warn('Failed to load image, removing from overlay');
                    imgElement.remove();
                };
            }
        
            return overlay;
        }
    
        function addCustomOverlayDragFunctionality(element, dragHandle, getSyncElement, storageKey = 'overlayPosition') {
            let isDragging = false;
            let startX, startY;
    
            element.style.position = 'fixed';
            dragHandle.style.cursor = 'grab';
    
            const onMouseDown = (e) => {
                const target = e.target;
                if (!target.closest('.cg-drag-handle') ||
                    target.closest('.cg-close-button') ||
                    target.closest('.cg-minimize-button') ||
                    target.closest('.cg-resize-handle') ||
                    target.closest('.cg-button-container')) {
                    return;
                }
    
                e.preventDefault();
                e.stopPropagation();
    
                isDragging = true;
    
                const computedStyle = window.getComputedStyle(element);
                if (computedStyle.transform !== 'none' && !element.dataset.transformReset) {
                    const rect = element.getBoundingClientRect();
                    element.style.left = `${rect.left}px`;
                    element.style.top = `${rect.top}px`;
                    element.style.transform = 'none';
                    element.dataset.transformReset = 'true';
                }
    
                const rect = element.getBoundingClientRect();
                startX = e.clientX - rect.left;
                startY = e.clientY - rect.top;
    
                element.classList.add('dragging');
                dragHandle.style.cursor = 'grabbing';
                dragHandle.style.userSelect = 'none';
    
                element._onMouseMove = onMouseMove;
                element._onMouseUp = onMouseUp;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
    
            const onMouseMove = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                e.stopPropagation();
    
                const newLeft = e.clientX - startX;
                const newTop = e.clientY - startY;
    
                element.style.left = `${newLeft}px`;
                element.style.top = `${newTop}px`;
                element.style.transform = 'none';
    
                const syncElement = typeof getSyncElement === 'function' ? getSyncElement() : null;
                if (syncElement && syncElement.style.display !== 'none') {
                    syncElement.style.left = `${newLeft}px`;
                    syncElement.style.top = `${newTop}px`;
                    syncElement.style.transform = 'none';
                }
            };
    
            const onMouseUp = (e) => {
                if (!isDragging) return;
                isDragging = false;
                element.classList.remove('dragging');
                dragHandle.style.cursor = 'grab';
                dragHandle.style.userSelect = '';
    
                const rect = element.getBoundingClientRect();
                const newLeft = rect.left;
                const newTop = rect.top;
    
                localStorage.setItem(storageKey, JSON.stringify({ top: newTop, left: newLeft }));
    
                if (rect.top < 0 || rect.left < 0 || rect.bottom > window.innerHeight || rect.right > window.innerWidth) {
                    const defaultTop = window.innerHeight * 0.1;
                    const defaultLeft = window.innerWidth * 0.5 - (element.offsetWidth / 2);
                    element.style.top = `${defaultTop}px`;
                    element.style.left = `${defaultLeft}px`;
                    element.style.transform = 'none';
    
                    const syncElement = typeof getSyncElement === 'function' ? getSyncElement() : null;
                    if (syncElement) {
                        syncElement.style.top = `${defaultTop}px`;
                        syncElement.style.left = `${defaultLeft}px`;
                        syncElement.style.transform = 'none';
                    }
                    localStorage.removeItem(storageKey);
                } else {
                    element.style.transform = 'none';
                    const syncElement = typeof getSyncElement === 'function' ? getSyncElement() : null;
                    if (syncElement) syncElement.style.transform = 'none';
                }
    
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                element._onMouseMove = null;
                element._onMouseUp = null;
            };
    
            dragHandle.addEventListener('mousedown', onMouseDown);
    
            return () => {
                dragHandle.removeEventListener('mousedown', onMouseDown);
                if (element._onMouseMove) document.removeEventListener('mousemove', element._onMouseMove);
                if (element._onMouseUp) document.removeEventListener('mouseup', element._onMouseUp);
            };
        }
    
        function addResizeFunctionality(element, handle) {
            let isResizing = false;
            let startX, startY, startWidth, startHeight;
    
            const onMouseDown = (e) => {
                e.preventDefault();
                e.stopPropagation();
    
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = parseFloat(getComputedStyle(element).width);
                startHeight = parseFloat(getComputedStyle(element).height);
    
                element.classList.add('resizing');
                document.body.style.userSelect = 'none';
                element._onResizeMove = onMouseMove;
                element._onResizeUp = onMouseUp;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
    
            const onMouseMove = (e) => {
                if (!isResizing) return;
                e.preventDefault();
                e.stopPropagation();
    
                const newWidth = Math.max(200, startWidth + (e.clientX - startX));
                const newHeight = Math.max(150, startHeight + (e.clientY - startY));
    
                element.style.width = `${newWidth}px`;
                element.style.height = `${newHeight}px`;
            };
    
            const onMouseUp = (e) => {
                if (!isResizing) return;
                isResizing = false;
                element.classList.remove('resizing');
                document.body.style.userSelect = '';
    
                const finalWidth = parseFloat(getComputedStyle(element).width);
                const finalHeight = parseFloat(getComputedStyle(element).height);
                localStorage.setItem('customOverlaySize', JSON.stringify({
                    width: finalWidth,
                    height: finalHeight
                }));
    
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                element._onResizeMove = null;
                element._onResizeUp = null;
            };
    
            handle.addEventListener('mousedown', onMouseDown, { capture: true });
    
            return () => {
                handle.removeEventListener('mousedown', onMouseDown, { capture: true });
                if (element._onResizeMove) document.removeEventListener('mousemove', element._onResizeMove);
                if (element._onResizeUp) document.removeEventListener('mouseup', element._onResizeUp);
            };
        }
    
        return { createErrorOverlay, createLoadingOverlay, createCustomOverlay };
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
        buttonContainer.style.padding = '20px';
        buttonContainer.style.width = '240px';
        buttonContainer.style.boxSizing = 'border-box';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '12px';
    
        const minimizeButton = document.createElement('button');
        minimizeButton.className = 'cg-minimize-button';
        minimizeButton.style.backgroundColor = '#3498db';
        minimizeButton.style.width = '14px';
        minimizeButton.style.height = '14px';
        minimizeButton.style.minWidth = '14px';
        minimizeButton.style.minHeight = '14px';
        minimizeButton.style.borderRadius = '50%';
        minimizeButton.style.border = 'none';
        minimizeButton.style.padding = '4px';
        minimizeButton.style.margin = '0';
        minimizeButton.style.cursor = 'pointer';
        minimizeButton.style.position = 'absolute';
        minimizeButton.style.top = '8px';
        minimizeButton.style.left = '8px';
        minimizeButton.style.boxSizing = 'border-box';
    
        const runButton = document.getElementById('run_button');
        const runRandomButton = document.getElementById('run_random_button');
        const clonedRunButton = runButton.cloneNode(true);
        const clonedRandomButton = runRandomButton.cloneNode(true);
    
        [clonedRunButton, clonedRandomButton].forEach(button => {
            button.style.width = '200px';
            button.style.boxSizing = 'border-box';
            button.style.padding = '10px 15px';
        });
    
        function preventClickIfDragged(clonedButton, originalButton) {
            let isDraggingButton = false, hasMoved = false;
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
    
                const onUp = () => {
                    if (!hasMoved) originalButton.click();
                    isDraggingButton = false;
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                };
    
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        }
    
        preventClickIfDragged(clonedRandomButton, runRandomButton);
        preventClickIfDragged(clonedRunButton, runButton);
    
        buttonContainer.appendChild(clonedRandomButton);
        buttonContainer.appendChild(clonedRunButton);
        buttonOverlay.appendChild(buttonContainer);
        buttonOverlay.appendChild(minimizeButton);
        document.body.appendChild(buttonOverlay);
    
        buttonOverlay.style.width = '240px';
        buttonOverlay.style.padding = '20px 20px 5px';
        buttonOverlay.style.boxSizing = 'border-box';
    
        const defaultPosition = {
            translateX: window.innerWidth * 0.5 - 120,
            translateY: window.innerHeight * 0.8
        };
        const savedPosition = JSON.parse(localStorage.getItem('overlayPosition'));
        let translateX, translateY;
    
        if (savedPosition && savedPosition.top !== undefined && savedPosition.left !== undefined) {
            translateX = savedPosition.left;
            translateY = savedPosition.top;
        } else {
            translateX = defaultPosition.translateX;
            translateY = defaultPosition.translateY;
        }
    
        buttonOverlay.style.top = '0';
        buttonOverlay.style.left = '0';
        buttonOverlay.style.transform = `translate(${translateX}px, ${translateY}px)`;
    
        if (buttonOverlay.updateDragPosition) {
            buttonOverlay.updateDragPosition(translateX, translateY);
        }
    
        restrictOverlayPosition(buttonOverlay, defaultPosition);
    
        let isMinimized = false;
        let dragHandler;
    
        function enableDrag() {
            if (!dragHandler) {
                dragHandler = addDragFunctionality(buttonOverlay, () => {
                    const loadingOverlay = document.getElementById('cg-loading-overlay');
                    return loadingOverlay && !isMinimized ? loadingOverlay : null;
                });
            }
        }
    
        function disableDrag() {
            buttonOverlay.style.cursor = 'default';
            if (dragHandler) {
                dragHandler();
                dragHandler = null;
            }
            minimizeButton.style.pointerEvents = 'auto';
        }
    
        enableDrag();
    
        function setMinimizedState(overlay, container, button, isMin) {
            if (isMin) {
                overlay.classList.add('minimized');
                overlay.style.top = '0px';
                overlay.style.left = '0px';
                overlay.style.transform = 'none';
                overlay.style.width = '22px';
                overlay.style.height = '22px';
                overlay.style.minWidth = '22px';
                overlay.style.minHeight = '22px';
                overlay.style.padding = '0';
                container.style.display = 'none';
                button.style.top = '2px';
                button.style.left = '2px';
                disableDrag();
            } else {
                overlay.classList.remove('minimized');
                overlay.style.width = '240px';
                overlay.style.height = 'auto';
                overlay.style.minHeight = '110px';
                overlay.style.padding = '20px 20px 5px';
                container.style.display = 'flex';
                container.style.padding = '20px';
    
                const savedPosition = JSON.parse(localStorage.getItem('overlayPosition'));
                if (savedPosition && savedPosition.top !== undefined && savedPosition.left !== undefined) {
                    translateX = savedPosition.left;
                    translateY = savedPosition.top;
                } else {
                    translateX = defaultPosition.translateX;
                    translateY = defaultPosition.translateY;
                }
    
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.transform = `translate(${translateX}px, ${translateY}px)`;
    
                if (overlay.updateDragPosition) {
                    overlay.updateDragPosition(translateX, translateY);
                }
    
                overlay.style.pointerEvents = 'auto';
                enableDrag();
                restrictOverlayPosition(overlay, defaultPosition);
            }
        }
    
        minimizeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            isMinimized = !isMinimized;
            setMinimizedState(buttonOverlay, buttonContainer, minimizeButton, isMinimized);
        });
    
        function toggleButtonOverlayVisibility() {
            const loadingOverlay = document.getElementById('cg-loading-overlay');
            const errorOverlay = document.getElementById('cg-error-overlay');
            buttonOverlay.style.display = (loadingOverlay || errorOverlay) ? 'none' : 'flex';
            if (!isMinimized && buttonOverlay.style.display !== 'none') {
                const savedPosition = JSON.parse(localStorage.getItem('overlayPosition'));
                if (savedPosition && savedPosition.top !== undefined && savedPosition.left !== undefined) {
                    translateX = savedPosition.left;
                    translateY = savedPosition.top;
                } else {
                    translateX = defaultPosition.translateX;
                    translateY = defaultPosition.translateY;
                }
    
                buttonOverlay.style.top = '0';
                buttonOverlay.style.left = '0';
                buttonOverlay.style.transform = `translate(${translateX}px, ${translateY}px)`;
    
                if (buttonOverlay.updateDragPosition) {
                    buttonOverlay.updateDragPosition(translateX, translateY);
                }
    
                restrictOverlayPosition(buttonOverlay, defaultPosition);
            }
        }
    
        toggleButtonOverlayVisibility();
    
        const observer = new MutationObserver(toggleButtonOverlayVisibility);
        observer.observe(document.body, { childList: true, subtree: true });
    
        return function cleanup() {
            observer.disconnect();
            if (buttonOverlay && buttonOverlay.parentNode) {
                buttonOverlay.parentNode.removeChild(buttonOverlay);
            }
        };
    }

    function setupMyDropdown({ containerId, dropdownCount, labelPrefixList, textboxIds, optionHandler, enableSearch = true }) {
        const container = document.getElementById(containerId);
        if (!container || container.dataset.dropdownSetup) return;
    
        let html = '<div class="mydropdown-container-flex">';
        for (let i = 0; i < dropdownCount; i++) {
            html += `
                <div class="mydropdown-wrapper" data-index="${i}">
                    <span class="mydropdown-label">${labelPrefixList[i]}</span>
                    <div class="mydropdown-input-container">
                        <input type="text" class="mydropdown-input" placeholder="..." ${!enableSearch ? 'readonly' : ''}>
                        <svg class="mydropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
                            <path d="M5 8l4 4 4-4z"></path>
                        </svg>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
    
        const inputs = container.querySelectorAll('.mydropdown-input');
        const wrappers = container.querySelectorAll('.mydropdown-wrapper');
        const optionsList = document.createElement('div');
        optionsList.className = 'mydropdown-options scroll-container';
        optionsList.style.display = 'none';
        document.body.appendChild(optionsList);
    
        let textboxes = [];
        function initializeTextboxes() {
            textboxes = textboxIds.map(id => {
                const element = document.getElementById(id);
                return element ? element.querySelector('textarea') : null;
            });
        }
        initializeTextboxes();
    
        let options = Array(dropdownCount).fill([]);
        let filteredOptions = Array(dropdownCount).fill([]);
        let activeInput = null;
        let isEditing = Array(dropdownCount).fill(false);
        let selectedValues = Array(dropdownCount).fill('');
    
        window.dropdowns[containerId] = {
            setOptions: function(data, oc, labelPrefixList, ...rest) {
                const defaults = rest.slice(0, dropdownCount);
                const newEnableSearch = rest[dropdownCount] !== undefined ? rest[dropdownCount] : enableSearch;
    
                optionHandler(options, filteredOptions, [data, oc], dropdownCount);
    
                let updatedLabelPrefixList = labelPrefixList;
                if (typeof labelPrefixList === 'string') {
                    updatedLabelPrefixList = labelPrefixList.split(',').map(label => label.trim());
                }
                if (Array.isArray(updatedLabelPrefixList) && updatedLabelPrefixList.length === dropdownCount) {
                    labelPrefixList = updatedLabelPrefixList;
                }
    
                inputs.forEach((input, index) => {
                    const value = defaults[index] || '';
                    selectedValues[index] = value;
                    input.value = value;
                    if (!newEnableSearch) input.setAttribute('readonly', 'readonly');
                    if (textboxes[index] && textboxes[index].value !== undefined) {
                        textboxes[index].value = value;
                        textboxes[index].dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
                const labels = container.querySelectorAll('.mydropdown-label');
                labels.forEach((label, index) => label.textContent = labelPrefixList[index]);
                updateOptionsList(0);
            },
            updateDefaults: function(...defaults) {
                const defaultValues = defaults.slice(0, dropdownCount);
                inputs.forEach((input, index) => {
                    if (!isEditing[index]) {
                        const value = defaultValues[index] || '';
                        selectedValues[index] = value;
                        input.value = value;
                        if (textboxes[index] && textboxes[index].value !== undefined) {
                            textboxes[index].value = value;
                            textboxes[index].dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                });
            },
            getValue: function() {
                return selectedValues.slice();
            }
        };
    
        if (enableSearch) {
            wrappers.forEach((wrapper, index) => {
                wrapper.addEventListener('click', (e) => {
                    if (e.target.tagName === 'INPUT' && isEditing[index]) return;
                    activeInput = inputs[index];
                    filteredOptions[index] = [...options[index]];
                    updateOptionsList(index);
                    updateOptionsPosition(index);
                    optionsList.style.display = filteredOptions[index].length > 0 ? 'block' : 'none';
                });
            });
    
            inputs.forEach((input, index) => {
                input.addEventListener('click', (e) => {
                    if (optionsList.style.display === 'block' && !isEditing[index]) {
                        e.preventDefault();
                        activeInput = input;
                        isEditing[index] = true;
                        input.value = '';
                        filteredOptions[index] = [...options[index]];
                        updateOptionsList(index);
                        updateOptionsPosition(index);
                        optionsList.style.display = 'block';
                        input.focus();
                    }
                });
    
                input.addEventListener('input', debounce(() => {
                    activeInput = input;
                    const searchText = input.value.toLowerCase();
                    const index = parseInt(input.closest('.mydropdown-wrapper').dataset.index);
                    filteredOptions[index] = options[index].filter(option =>
                        option.key.toLowerCase().includes(searchText) ||
                        (index !== 3 && option.value.toLowerCase().includes(searchText))
                    );
                    updateOptionsList(index);
                    updateOptionsPosition(index);
                    optionsList.style.display = filteredOptions[index].length > 0 ? 'block' : 'none';
                }, 100));
            });
        } else {
            inputs.forEach((input, index) => {
                input.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (activeInput === input && optionsList.style.display === 'block') {
                        optionsList.style.display = 'none';
                        activeInput = null;
                    } else {
                        if (activeInput !== null) {
                            const prevIndex = parseInt(activeInput.closest('.mydropdown-wrapper').dataset.index);
                            inputs[prevIndex].value = selectedValues[prevIndex];
                        }
                        activeInput = input;
                        filteredOptions[index] = [...options[index]];
                        updateOptionsList(index);
                        updateOptionsPosition(index);
                        optionsList.style.display = filteredOptions[index].length > 0 ? 'block' : 'none';
                    }
                    input.value = selectedValues[index];
                });
            });
        }
    
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target) && !optionsList.contains(e.target)) {
                optionsList.style.display = 'none';
                inputs.forEach((input, index) => {
                    input.value = selectedValues[index];
                    isEditing[index] = false;
                });
                activeInput = null;
            }
        });
    
        function updateOptionsPosition(index) {
            if (!activeInput) activeInput = inputs[index];
            const rect = activeInput.getBoundingClientRect();
            const inputBottom = rect.bottom + window.scrollY;
            const inputLeft = rect.left + window.scrollX;
            const inputWidth = rect.width;
    
            optionsList.style.width = `${Math.min(inputWidth, 600)}px`;
            optionsList.style.left = `${inputLeft}px`;
            optionsList.style.top = `${inputBottom}px`;
            optionsList.style.zIndex = '10002';
    
            const itemHeight = 40;
            const maxItems = 30;
            const maxHeight = Math.min(maxItems * itemHeight, window.innerHeight * 0.8);
            optionsList.style.maxHeight = `${maxHeight}px`;
        }
    
        function updateOptionsList(activeIndex = 0) {
            optionsList.innerHTML = '';
            const fragment = document.createDocumentFragment();
            if (!filteredOptions[activeIndex]) return;
            filteredOptions[activeIndex].forEach(option => {
                const item = document.createElement('div');
                item.className = 'mydropdown-item';
                item.textContent = activeIndex === 3 ? option.key : (option.key === option.value ? option.key : `${option.key}\n(${option.value})`);
                item.addEventListener('click', () => {
                    const index = activeInput ? parseInt(activeInput.closest('.mydropdown-wrapper').dataset.index) : activeIndex;
                    selectedValues[index] = option.key;
                    activeInput.value = option.key;
                    if (textboxes[index] && textboxes[index].value !== undefined) {
                        textboxes[index].value = option.key;
                        textboxes[index].dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    optionsList.style.display = 'none';
                    isEditing[index] = false;
                    const event = new CustomEvent(`${containerId}-change`, { detail: { value: selectedValues } });
                    document.dispatchEvent(event);
                });
                fragment.appendChild(item);
            });
            optionsList.appendChild(fragment);
        }
    
        document.addEventListener('scroll', debounce(() => {
            if (optionsList.style.display !== 'none' && activeInput) {
                const index = parseInt(activeInput.closest('.mydropdown-wrapper').dataset.index);
                updateOptionsPosition(index);
            }
        }, 100), true);
    
        container.dataset.dropdownSetup = 'true';
    }   
    
    function myCharacterList() {
        console.log('[myCharacterList] Initializing...');
    
        function handleCharacterOptions(options, filteredOptions, args, dropdownCount) {
            const [[keys, values], oc] = args;
            if (!Array.isArray(keys) || !Array.isArray(values) || keys.length !== values.length) {
                console.error('[handleCharacterOptions] Invalid keys or values:', keys, values);
                return;
            }
            if (!Array.isArray(oc)) {
                console.error('[handleCharacterOptions] Invalid oc:', oc);
                return;
            }
    
            const charOptions = keys.map((key, idx) => ({ key, value: values[idx] }));
            for (let i = 0; i < dropdownCount - 1; i++) {
                options[i] = charOptions;
                filteredOptions[i] = [...charOptions];
            }
    
            const originalOptions = oc.map(key => ({ key, value: key }));
            options[dropdownCount - 1] = originalOptions;
            filteredOptions[dropdownCount - 1] = [...originalOptions];
        }
    
        setupMyDropdown({
            containerId: 'mydropdown-container',
            dropdownCount: 4,
            labelPrefixList: ['character1', 'character2', 'character3', 'original_character'],
            textboxIds: ['cd-character1', 'cd-character2', 'cd-character3', 'cd-original-character'],
            optionHandler: handleCharacterOptions,
            enableSearch: true
        });
    
        window.setMyCharacterOptions = function(data, oc, chara_text, character1, character2, character3, oc_default, enableSearch) {
            window.dropdowns['mydropdown-container'].setOptions(data, oc, chara_text, character1, character2, character3, oc_default, enableSearch);
        };
    
        window.updateMyCharacterDefaults = window.dropdowns['mydropdown-container'].updateDefaults;
        window.getMyCharacterValue = window.dropdowns['mydropdown-container'].getValue;
    }
    
    function myViewsList() {
        function handleViewOptions(options, filteredOptions, args, dropdownCount) {
            const [data] = args;
            if (typeof data !== 'object' || data === null || Object.keys(data).length !== dropdownCount) return;
            const keys = ['angle', 'camera', 'background', 'style'];
            options.forEach((_, index) => {
                const key = keys[index];
                options[index] = data[key].map(item => ({ key: item, value: item }));
                filteredOptions[index] = [...options[index]];
            });
        }
    
        setupMyDropdown({
            containerId: 'myviews-container',
            dropdownCount: 4,
            labelPrefixList: ['angle', 'camera', 'background', 'view'],
            textboxIds: ['cd-view-angle', 'cd-view-camera', 'cd-view-background', 'cd-view-style'],
            optionHandler: handleViewOptions,
            enableSearch: true
        });
    
        window.setMyViewsOptions = function(view_data, view_text, ...rest) {
            window.dropdowns['myviews-container'].setOptions(view_data, null, view_text, ...rest);
        };
    
        window.updateMyViewsDefaults = window.dropdowns['myviews-container'].updateDefaults;
        window.getMyViewsValue = window.dropdowns['myviews-container'].getValue;
    }

    function restrictOverlayPosition(element, defaultPosition) {
        if (!element) return;
    
        const rect = element.getBoundingClientRect();
        const isOutOfBounds = rect.top < 0 || rect.left < 0 ||
                             rect.bottom > window.innerHeight || rect.right > window.innerWidth;
    
        if (isOutOfBounds) {           
            console.log(`Overlay ${element.id} out of bounds, resetting to default position`);
            let translateX, translateY;
    
            if (element.id === 'cg-loading-overlay') {
                translateX = (window.innerWidth - element.offsetWidth) / 2; 
                translateY = window.innerHeight * 0.2 - element.offsetHeight * 0.2; 
            } else {
                translateX = window.innerWidth * 0.5 - 120;
                translateY = window.innerHeight * 0.8;
            }
            
            element.style.transition = 'transform 0.3s ease';
            element.style.transform = `translate(${translateX}px, ${translateY}px)`;            
            setTimeout(() => element.style.transition = '', 300);
            element.style.top = '0';
            element.style.left = '0';
    
            if (element.updateDragPosition) {
                element.updateDragPosition(translateX, translateY);
            } else {
                localStorage.setItem('overlayPosition', JSON.stringify({ top: translateY, left: translateX }));
            }
        }
    }

    const dragStates = new WeakMap();
    function addDragFunctionality(element, getSyncElement) {
        let isDragging = false;
        let startX, startY;
        let state = dragStates.get(element) || { translateX: 0, translateY: 0 };
        dragStates.set(element, state);
    
        let lastUpdate = 0;
        const THROTTLE_MS = 8; //120fps
    
        element.style.position = 'fixed';
        element.style.willChange = 'transform';
        element.style.cursor = 'grab';
    
        let syncElement = typeof getSyncElement === 'function' ? getSyncElement() : null;
    
        const updateTransform = () => {
            element.style.transform = `translate(${state.translateX}px, ${state.translateY}px)`;
            element.style.top = '0';
            element.style.left = '0';

            if (syncElement && syncElement.style.display !== 'none' && !syncElement.classList.contains('minimized')) {
                syncElement.style.transform = `translate(${state.translateX}px, ${state.translateY}px)`;
                syncElement.style.top = '0';
                syncElement.style.left = '0';
            }
        };
    
        const throttledUpdate = (callback) => {
            if (performance.now() - lastUpdate >= THROTTLE_MS) {
                callback();
                lastUpdate = performance.now();
            } else {
                requestAnimationFrame(() => throttledUpdate(callback));
            }
        };
    
        const onMouseDown = (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
    
            isDragging = true;
            startX = e.clientX - state.translateX;
            startY = e.clientY - state.translateY;
    
            element.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
            syncElement = typeof getSyncElement === 'function' ? getSyncElement() : null;
        };
    
        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();
    
            state.translateX = e.clientX - startX;
            state.translateY = e.clientY - startY;
    
            throttledUpdate(updateTransform);
        };
    
        const onMouseUp = (e) => {
            if (!isDragging) return;
            isDragging = false;
            element.style.cursor = 'grab';
            document.body.style.userSelect = '';
    
            const rect = element.getBoundingClientRect();
            const isOutOfBounds = rect.top < 0 || rect.left < 0 || 
                                 rect.bottom > window.innerHeight || rect.right > window.innerWidth;
    
            if (isOutOfBounds) {
                if (element.id === 'cg-loading-overlay') {
                    state.translateX = (window.innerWidth - element.offsetWidth) / 2;
                    state.translateY = window.innerHeight * 0.2 - element.offsetHeight * 0.2;
                } else {
                    state.translateX = window.innerWidth * 0.5 - 120;
                    state.translateY = window.innerHeight * 0.8;
                }
                localStorage.setItem('overlayPosition', JSON.stringify({ top: state.translateY, left: state.translateX }));
            } else {
                localStorage.setItem('overlayPosition', JSON.stringify({ top: state.translateY, left: state.translateX }));
            }
            updateTransform();
        };
    
        const savedPosition = localStorage.getItem('overlayPosition');
        if (savedPosition) {
            try {
                const { top, left } = JSON.parse(savedPosition);
                state.translateX = left || 0;
                state.translateY = top || 0;
                updateTransform();
            } catch (err) {
                console.error('Failed to parse saved position:', err);
                localStorage.removeItem('overlayPosition');
            }
        }
    
        element.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    
        element.updateDragPosition = (x, y) => {
            state.translateX = x;
            state.translateY = y;
            updateTransform();
            localStorage.setItem('overlayPosition', JSON.stringify({ top: y, left: x }));
        };
    
        return () => {
            element.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            dragStates.delete(element);
        };
    }
}
