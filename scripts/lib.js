//Better?
function my_custom_js() {
    console.log("[My JS] Script loaded, attempting initial setup");
    dark_theme();
    requestIdleCallback(() => {
        setupSuggestionSystem();
        setupGallery();
        setupThumb();
        setupButtonOverlay();
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

        let lastWordSent = ''; // Cache last sent word to avoid duplicate requests

        textboxes.forEach(textbox => {
            if (textbox.dataset.suggestionSetup) return;

            console.log('Setting up the Suggestion System for ', textbox);

            const suggestionBox = document.createElement('div');
            suggestionBox.className = 'suggestion-box scroll-container';
            suggestionBox.style.display = 'none';
            document.body.appendChild(suggestionBox);

            let selectedIndex = -1;
            let currentSuggestions = [];
            const textboxWidth = textbox.offsetWidth; // Cache width

            // Event delegation for suggestion items
            suggestionBox.addEventListener('click', (e) => {
                const item = e.target.closest('.suggestion-item');
                if (item) applySuggestion(item.dataset.value);
            });

            textbox.addEventListener('input', debounce(async () => {
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
                    suggestions.forEach((suggestion, index) => {
                        if (!Array.isArray(suggestion) || suggestion.length === 0) return;
                        suggestion.forEach(element => {
                            const item = document.createElement('div');
                            item.className = 'suggestion-item';
                            item.textContent = element;
                            item.dataset.value = element;
                            tempDiv.textContent = element;
                            maxWidth = Math.max(maxWidth, tempDiv.offsetWidth);
                            currentSuggestions.push({ prompt: element });
                            fragment.appendChild(item);
                        });
                    });

                    document.body.removeChild(tempDiv);
                    suggestionBox.innerHTML = '';
                    suggestionBox.appendChild(fragment);
                    suggestionBox.style.width = `${Math.min(maxWidth + 20, 600)}px`;
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
                            applySuggestion(currentSuggestions[selectedIndex].prompt[0]);
                        } else if (items.length > 0) {
                            applySuggestion(currentSuggestions[0].prompt[0]);
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
    
                const step = 0.1;
                currentWeight = isIncrease ? currentWeight + step : currentWeight - step;
                if (currentWeight < 0.0 || currentWeight > 3.0) return;
                currentWeight = parseFloat(currentWeight.toFixed(1));
    
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
                if (cursorPosition === value.length) {
                    const lastCommaIndex = value.lastIndexOf(',');
                    return value.slice(lastCommaIndex + 1).trim();
                }
                const beforeCursor = value.slice(0, cursorPosition);
                const afterCursor = value.slice(cursorPosition);
                const lastCommaBefore = beforeCursor.lastIndexOf(',');
                const firstCommaAfter = afterCursor.indexOf(',');
                const start = lastCommaBefore >= 0 ? lastCommaBefore + 1 : 0;
                const end = firstCommaAfter >= 0 ? cursorPosition + firstCommaAfter : value.length;
                return value.slice(start, end).trim();
            }

            function formatSuggestion(suggestion) {
                const withoutHeat = suggestion.replace(/\s\(\d+\)$/, '');
                let formatted = withoutHeat.replace(/_/g, ' ');
                formatted = formatted.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
                return formatted.startsWith(':') ? formatted : formatted.replace(/:/g, ' ');
            }

            function applySuggestion(promptText) {
                const formattedText = formatSuggestion(promptText);
                const value = textbox.value;
                const cursorPosition = textbox.selectionStart;
            
                const beforeCursor = value.slice(0, cursorPosition);
                const afterCursor = value.slice(cursorPosition);
                const lastSeparatorBefore = Math.max(beforeCursor.lastIndexOf(','), beforeCursor.lastIndexOf('\n'));
                const firstSeparatorAfter = afterCursor.indexOf(',') >= 0 ? afterCursor.indexOf(',') : afterCursor.indexOf('\n');
                
                const start = lastSeparatorBefore >= 0 ? lastSeparatorBefore + 1 : 0;
                const end = firstSeparatorAfter >= 0 ? cursorPosition + firstSeparatorAfter : value.length;
            
                const isFirstWordInLine = start === 0 || value[start - 1] === '\n';
                const prefix = isFirstWordInLine ? '' : ' ';
                
                const isEndOfText = cursorPosition === value.length;
                const suffix = isEndOfText ? ', ' : '';
            
                const newValue = value.slice(0, start) + prefix + formattedText + suffix + value.slice(end);
                textbox.value = newValue.trim();
            
                const newCursorPosition = start + prefix.length + formattedText.length + suffix.length;
                textbox.setSelectionRange(newCursorPosition, newCursorPosition);
            
                currentSuggestions = [];
                suggestionBox.innerHTML = '';
                suggestionBox.style.display = 'none';
            
                textbox.dispatchEvent(new Event('input', { bubbles: true }));
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

            function exitFullscreen() {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleFullscreenKeyDown);
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

                if (isLeft && images.length > 1) {
                    currentIndex = (currentIndex - 1 + images.length) % images.length;
                } else if (!isLeft && images.length > 1) {
                    currentIndex = (currentIndex + 1) % images.length;
                }

                mainImage.src = images[currentIndex];
                updatePreviewBorders();
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
                                    if (!isNaN(seedValue) && seedValue >= -1 && seedValue <= 4294967295) {
                                        numberInput.value = seedValue;
                                        numberInput.dispatchEvent(new Event('input', { bubbles: true }));
                                        rangeInput.value = seedValue;
                                        rangeInput.dispatchEvent(new Event('input', { bubbles: true }));
                                        console.log(`Updated random_seed to ${seedValue}`);
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
            return createInfoOverlay({
                id: 'cg-error-overlay',
                className: 'cg-overlay-error',
                content: `
                    <img src="${window.LOADING_FAILED_BASE64}" alt="Error" style="max-width: 128px; max-height: 128px; object-fit: contain; margin-bottom: 10px;">
                    <pre style="white-space: pre-wrap;">${errorMessage}</pre>
                `,
                onClick: () => {
                    navigator.clipboard.writeText(errorMessage)
                        .then(() => console.log(`Error message "${errorMessage}" copied to clipboard`))
                        .catch(err => console.error('Failed to copy error message:', err));
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
            overlay.style.zIndex = '10001';
            overlay.style.pointerEvents = 'auto';
    
            const startTime = Date.now();
            if (overlay.dataset.timerInterval) clearInterval(overlay.dataset.timerInterval);
            const timerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const timerElement = overlay.querySelector('.cg-overlay-timer');
                if (timerElement) timerElement.textContent = `Elapsed time: ${elapsed} seconds`;
            }, 1000);
            overlay.dataset.timerInterval = timerInterval;
            return overlay;
        }
    
        return { createErrorOverlay, createLoadingOverlay };
    }

    function addDragFunctionality(element, getSyncElement) {
        let isDragging = false;
        let startX, startY;
    
        element.style.position = 'fixed';
        element.style.cursor = 'grab';
    
        const onMouseDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
    
            isDragging = true;
    
            const rect = element.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
    
            element.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
    
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
    
            const syncElement = typeof getSyncElement === 'function' ? getSyncElement() : null;
            if (syncElement && syncElement.style.display !== 'none') {
                syncElement.style.left = `${newLeft}px`;
                syncElement.style.top = `${newTop}px`;
            }
        };
    
        const onMouseUp = (e) => {
            if (!isDragging) return;
            isDragging = false;
            element.style.cursor = 'grab';
            document.body.style.userSelect = '';
    
            const rect = element.getBoundingClientRect();
            const newLeft = rect.left;
            const newTop = rect.top;
    
            localStorage.setItem('overlayPosition', JSON.stringify({ top: newTop, left: newLeft }));
    
            if (rect.top < 0 || rect.left < 0 || rect.bottom > window.innerHeight || rect.right > window.innerWidth) {
                const defaultTop = window.innerHeight * 0.2;
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
                localStorage.removeItem('overlayPosition');
            } else {
                element.style.transform = 'none'; 
                const syncElement = typeof getSyncElement === 'function' ? getSyncElement() : null;
                if (syncElement) syncElement.style.transform = 'none';
            }
    
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    
        element.addEventListener('mousedown', onMouseDown);
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
    
                const onUp = (upEvent) => {
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
        const savedPosition = JSON.parse(localStorage.getItem('overlayPosition'));
        if (savedPosition && savedPosition.top !== undefined && savedPosition.left !== undefined) {
            buttonOverlay.style.top = `${savedPosition.top}px`;
            buttonOverlay.style.left = `${savedPosition.left}px`;
            buttonOverlay.style.transform = 'none';
        } else {
            buttonOverlay.style.top = `${window.innerHeight * 0.8}px`;
            buttonOverlay.style.left = `${window.innerWidth * 0.5 - 120}px`;
            buttonOverlay.style.transform = 'none';
        }
    
        let isMinimized = false;
        let dragHandler;
    
        function enableDrag() {
            if (!dragHandler) {
                dragHandler = addDragFunctionality(buttonOverlay, () => document.getElementById('cg-loading-overlay'));
            }
        }
    
        function disableDrag() {
            buttonOverlay.style.cursor = 'default';
            if (dragHandler) {
                buttonOverlay.removeEventListener('mousedown', dragHandler);
                dragHandler = null;
            }
            minimizeButton.style.pointerEvents = 'auto';
        }
    
        enableDrag();
    
        function setMinimizedState(overlay, container, button, isMin) {
            if (isMin) {
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
                overlay.style.width = '240px';
                overlay.style.height = 'auto';
                overlay.style.minHeight = '110px';
                overlay.style.padding = '20px 20px 5px';
                container.style.display = 'flex';
                container.style.padding = '20px';
                const savedPosition = JSON.parse(localStorage.getItem('overlayPosition'));
                if (savedPosition && savedPosition.top !== undefined && savedPosition.left !== undefined) {
                    overlay.style.top = `${savedPosition.top}px`;
                    overlay.style.left = `${savedPosition.left}px`;
                    overlay.style.transform = 'none';
                } else {
                    overlay.style.top = `${window.innerHeight * 0.8}px`;
                    overlay.style.left = `${window.innerWidth * 0.5 - 120}px`;
                    overlay.style.transform = 'none';
                }
                overlay.style.pointerEvents = 'auto';
                enableDrag();
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
            if (isMinimized) {
                buttonOverlay.style.top = '0px';
                buttonOverlay.style.left = '0px';
                buttonOverlay.style.transform = 'none';
                disableDrag();
            } else {
                setMinimizedState(buttonOverlay, buttonContainer, minimizeButton, false);
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
}
