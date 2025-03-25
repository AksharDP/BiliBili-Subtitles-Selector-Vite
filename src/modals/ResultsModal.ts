import {createDiv} from '../ui/components';
import resultsModalTemplate from '../templates/ResultsModal.html?raw';
import {checkSubtitleInCache, getToken} from '../db/indexedDB';

import {fetchSubtitleData} from '../api/openSubtitles';
import {hideSubtitleViewer, showSubtitleViewer} from './SubtitleViewerModal';
import {applySubtitleToVideo, clearExistingSubtitles} from '../utils/subtitleRenderer';
import {ActiveModal, setActiveModal} from './ModalManager';

// Track pagination state
let currentSearchResults: any[] = [];
let currentPage: number = 1;
let totalPages: number = 1;
let totalCount: number = 0;
let perPage: number = 50;
let currentSearchQuery: string = "";
let currentSearchParams: string | null = null;

export async function createResultsModal(): Promise<void> {
    if (document.getElementById("opensubtitles-results-overlay")) return;

    const resultsOverlay = createDiv("opensubtitles-results-overlay", "", `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: none;
        justify-content: center;
        align-items: center;
    `);

    const resultsModal = createDiv("opensubtitles-results-modal", "", `
        background-color: white;
        padding: 0;
        border-radius: 6px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        width: 500px;
        max-width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `);

    resultsModal.innerHTML = resultsModalTemplate;
    resultsOverlay.appendChild(resultsModal);
    document.body.appendChild(resultsOverlay);
    
    // Prevent clicks on the overlay from closing the modal unintentionally
    resultsOverlay.addEventListener("click", (e: MouseEvent) => {
        // Only close if clicking directly on the overlay, not on its children
        if (e.target === resultsOverlay) {
            hideResultsModal();
        }
    });
    
    // Prevent clicks inside the modal from bubbling to the overlay
    resultsModal.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
    });

    // Event listeners for controls
    const prevBtn = document.getElementById("os-prev-btn");
    const nextBtn = document.getElementById("os-next-btn");
    const backBtn = document.getElementById("os-back-search-btn");
    if (prevBtn) prevBtn.addEventListener("click", () => navigateResults("prev"));
    if (nextBtn) nextBtn.addEventListener("click", () => navigateResults("next"));
    if (backBtn) backBtn.addEventListener("click", backToSearch);
}

export function showResultsModal(page?: number): void {
    // If a page is specified and it's valid, set the current page
    if (page && page > 0 && page <= totalPages) {
        currentPage = page;
    }
    
    // COMPLETELY rebuild the results modal structure - more thorough approach
    const resultsOverlay = document.getElementById("opensubtitles-results-overlay");
    
    if (resultsOverlay) {
        // CRITICAL FIX: Ensure pointer events are enabled on the overlay
        resultsOverlay.style.pointerEvents = "auto";
        
        // First get the reference
        const oldModal = document.getElementById("opensubtitles-results-modal");
        if (oldModal) {
            // Remove the old modal completely
            resultsOverlay.removeChild(oldModal);
        }
        
        // Create a new modal element from scratch
        const newResultsModal = document.createElement("div");
        newResultsModal.id = "opensubtitles-results-modal";
        newResultsModal.style.cssText = `
            background-color: white;
            padding: 0;
            border-radius: 6px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            width: 500px;
            max-width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            margin: 0 auto;
            pointer-events: auto;
        `;
        
        // Apply the template HTML
        newResultsModal.innerHTML = resultsModalTemplate;
        
        // Add the new modal to the overlay
        resultsOverlay.appendChild(newResultsModal);
        
        // Prevent clicks inside the modal from bubbling to the overlay
        newResultsModal.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
        });
        
        // Attach event listeners to controls
        const prevBtn = document.getElementById("os-prev-btn");
        const nextBtn = document.getElementById("os-next-btn");
        const backBtn = document.getElementById("os-back-search-btn");
        
        if (prevBtn) prevBtn.addEventListener("click", () => navigateResults("prev"));
        if (nextBtn) nextBtn.addEventListener("click", () => navigateResults("next"));
        if (backBtn) backBtn.addEventListener("click", backToSearch);
    }
    
    // Hide search modal if it's open
    const searchOverlay = document.getElementById("opensubtitles-search-overlay");
    if (searchOverlay) searchOverlay.style.display = "none";
    
    // Show the overlay
    if (resultsOverlay) resultsOverlay.style.display = "flex";
    
    // Update results content if available
    if (currentSearchResults.length > 0) {
        updateResultsSummary();
        displayCurrentPage();
        
        // Explicitly ensure the results container has scroll enabled
        const container = document.getElementById("os-results-container");
        if (container) {
            container.style.overflow = "auto";
            container.style.maxHeight = "calc(80vh - 140px)"; // Account for header and footer
        }
    }
    
    // Update pagination controls
    updatePaginationControls();
    
    // Record the active modal state
    setActiveModal(ActiveModal.RESULTS, { page: currentPage });
}

export function hideResultsModal(): void {
    const overlay = document.getElementById("opensubtitles-results-overlay");
    if (overlay) overlay.style.display = "none";
    
    // Also hide the subtitle viewer if it's open
    hideSubtitleViewer();
}

// Navigate back to search modal with improved state handling
function backToSearch(): void {
    // Clear any hide timeouts
    if (window.searchFormHideTimeout) {
        clearTimeout(window.searchFormHideTimeout);
        delete window.searchFormHideTimeout;
    }
    
    window.isNavigatingBackToSearch = true;
    
    // Hide subtitle viewer if visible
    const subtitleViewerOverlay = document.getElementById("subtitle-viewer-overlay");
    const viewerContent = document.getElementById("subtitle-viewer-content");
    if (subtitleViewerOverlay && subtitleViewerOverlay.style.display === "flex") {
        if (viewerContent) viewerContent.style.opacity = "0";
        subtitleViewerOverlay.style.display = "none";
    }
    
    // Get the results modal before hiding overlay
    const resultsModal = document.getElementById("opensubtitles-results-modal");
    
    // Hide the results modal
    const overlay = document.getElementById("opensubtitles-results-overlay");
    if (overlay) {
        overlay.style.display = "none";
        // CRITICAL FIX: Reset pointer events on overlay
        overlay.style.pointerEvents = "auto";
    }
    
    // Reset results modal positioning and force default width
    if (resultsModal) {
        resultsModal.style.position = "";
        resultsModal.style.left = "";
        resultsModal.style.top = "";
        resultsModal.style.transform = "";
        resultsModal.style.margin = "0 auto"; 
        resultsModal.style.width = "500px";  // Reset width to default
        resultsModal.style.zIndex = "";
        resultsModal.style.transition = "";
        resultsModal.style.display = "";
        // CRITICAL FIX: Reset pointer events on results modal
        resultsModal.style.pointerEvents = "auto";
    }
    
    // Show search modal
    const searchOverlay = document.getElementById("opensubtitles-search-overlay");
    if (searchOverlay) searchOverlay.style.display = "flex";
    
    // Clear search results to prevent auto-showing results modal
    currentSearchResults = [];
    
    // Set flags for forcing search modal next time
    window.localStorage.setItem('forceSearchModal', 'true');
    window.localStorage.setItem('preventSearchHiding', 'true');
    
    setActiveModal(ActiveModal.SEARCH, { 
        fromResults: true, 
        clearResults: true,
        preventHiding: true 
    });
    
    setTimeout(() => {
        window.isNavigatingBackToSearch = false;
    }, 500);
}

// Navigate between result pages
async function navigateResults(direction: "prev" | "next"): Promise<void> {
    if (direction === "prev" && currentPage > 1) {
        currentPage--;
        await displayCurrentPage();
    } else if (direction === "next" && currentPage < totalPages) {
        currentPage++;
        await displayCurrentPage();
    }
    
    // Update pagination buttons state
    updatePaginationControls();
}

// Update pagination state
export function updatePaginationState(data: any, page: number): void {
    currentPage = data.page || page;
    totalPages = data.total_pages || 1;
    totalCount = data.total_count || 0;
    perPage = data.per_page || 50;
    currentSearchResults = data.data || [];
}

// Update results summary in header
function updateResultsSummary(): void {
    const summaryElement = document.getElementById("os-results-summary");
    if (!summaryElement) return;
    
    // Extract language info from search params
    let languageValue = "All";
    if (currentSearchParams?.includes("languages=")) {
        const match = currentSearchParams.match(/languages=([^&]+)/);
        if (match && match[1]) {
            languageValue = match[1];
        }
    }
    
    summaryElement.innerHTML = `
        <strong style="margin-right: 2px">Search:</strong> ${currentSearchQuery || "All"}  
        <strong style="margin-left: 10px; margin-right: 2px">Languages:</strong> ${languageValue}  
        <strong style="margin-left: 10px; margin-right: 2px">Results:</strong> ${totalCount}
    `;
}

// Display current page of results
async function displayCurrentPage(): Promise<void> {
    const container = document.getElementById("os-results-container");
    const paginationInfo = document.getElementById("os-pagination-info");
    if (!container || !paginationInfo) return;
    
    // Update pagination info
    paginationInfo.textContent = `${currentPage} of ${totalPages} (${totalCount} results, ${perPage} per page)`;
    
    // Clear and populate results
    container.innerHTML = "";
    
    if (currentSearchResults.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666; font-family: Arial, sans-serif;">No results found for your search.</div>';
        return;
    }
    
    // Create result items
    const resultsList = document.createElement("div");
    resultsList.style.cssText = "display: flex; flex-direction: column; gap: 10px; width: 100%;";
    
    for (let index = 0; index < currentSearchResults.length; index++) {
        const result = currentSearchResults[index];
        const resultItem = await createResultItem(result, index);
        resultsList.appendChild(resultItem);
    }
    
    container.appendChild(resultsList);
    
    // Attach event listeners to buttons
    attachResultButtonListeners();
}

// Create a result item element
async function createResultItem(result: any, index: number): Promise<HTMLElement> {
    const item = document.createElement("div");
    item.className = "os-result-item";
    item.dataset.index = index.toString();
    item.style.cssText = "padding: 15px; background-color: #f9f9f9; border-radius: 4px; margin-bottom: 10px;";
    
    const attributes = result.attributes || {};
    // Ensure fileId is stored as a string to match what is used in the database.
    const file = attributes.files && attributes.files.length > 0 ? attributes.files[0] : {};
    const fileId = file.file_id ? file.file_id.toString() : "";
    
    const title = attributes.feature_details?.title || attributes.release || "Untitled";
    const language = attributes.language || "Unknown";
    const downloads = attributes.download_count || 0;
    const year = attributes.feature_details?.year || "";
    const releaseInfo = attributes.release || attributes.filename || "";
    
    // Wait for the cache check to complete before rendering the cache status
    const isCached = await checkSubtitleInCache(fileId);
    const cacheIndicatorColor = isCached ? '#2ecc71' : '#95a5a6';
    const cacheText = isCached ? 'Cached' : 'Not cached';
    
    item.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <h3 style="margin: 0; font-family: Arial, sans-serif; font-size: 16px; color: #00a1d6; overflow: hidden; text-overflow: ellipsis; max-width: 350px; white-space: nowrap;">
                ${title} ${year ? `(${year})` : ''}
            </h3>
            <span style="font-family: Arial, sans-serif; font-size: 14px; color: #666; margin-left: 8px; flex-shrink: 0;">${language}</span>
        </div>
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #666; margin-bottom: 8px; word-break: break-word; overflow-wrap: break-word; max-height: 40px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            ${releaseInfo}
        </div>
        <div style="display: flex; justify-content: flex-start; font-family: Arial, sans-serif; font-size: 14px; color: #666; margin-bottom: 10px; align-items: center;">
            <div class="subtitle-cache-status" data-subtitle-id="${fileId}" style="display: inline-flex; align-items: center; margin-right: 8px;">
                <span class="cache-indicator" style="width: 8px; height: 8px; border-radius: 50%; background-color: ${cacheIndicatorColor}; margin-right: 4px;"></span>
                <span class="cache-text" style="font-size: 12px; color: ${cacheIndicatorColor};">${cacheText}</span>
            </div>
            <span>Downloads: ${downloads}</span>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button class="os-view-btn" data-subtitle-id="${fileId}" style="padding: 6px 12px; background-color: #f0f0f0; color: #333; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">View</button>
            <button class="os-download-btn" data-subtitle-id="${fileId}" style="padding: 6px 12px; background-color: #00a1d6; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">Apply</button>
            <button class="os-save-file-btn" data-subtitle-id="${fileId}" style="padding: 6px 12px; background-color: #f0f0f0; color: #333; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">Save File</button>
        </div>
    `;
    
    return item;
}

async function checkCacheStatus(subtitleId: string, itemElement: HTMLElement): Promise<void> {
    try {
        const isCached = await checkSubtitleInCache(subtitleId);
        
        // Find the cache indicator elements
        const statusContainer = itemElement.querySelector(`.subtitle-cache-status[data-subtitle-id="${subtitleId}"]`);
        if (statusContainer) {
            const indicator = statusContainer.querySelector('.cache-indicator') as HTMLElement;
            const text = statusContainer.querySelector('.cache-text') as HTMLElement;
            
            if (isCached) {
                // Subtitle is in cache
                if (indicator) indicator.style.backgroundColor = '#2ecc71'; // Green
                if (text) {
                    text.textContent = 'Cached';
                    text.style.color = '#2ecc71';
                }
            } else {
                // Subtitle is not in cache
                if (indicator) indicator.style.backgroundColor = '#95a5a6'; // Gray
                if (text) {
                    text.textContent = 'Not cached';
                    text.style.color = '#95a5a6';
                }
            }
        }
    } catch (error) {
        console.error(`Error checking cache for subtitle ${subtitleId}:`, error);
    }
}


// Attach event listeners to result buttons
function attachResultButtonListeners(): void {
    document.querySelectorAll(".os-download-btn").forEach(button => {
        button.addEventListener("click", (e: Event) => {
            e.preventDefault();  // Prevent default behavior
            e.stopPropagation(); // Stop event bubbling
            const target = e.currentTarget as HTMLElement;
            const subtitleId = target.dataset.subtitleId;
            if (subtitleId) {
                const resultItem = target.closest('.os-result-item');
                if (resultItem) handleSubtitleDownload(resultItem as HTMLElement);
            }
        });
    });
    
    document.querySelectorAll(".os-view-btn").forEach(button => {
        button.addEventListener("click", (e: Event) => {
            e.preventDefault();  // Prevent default behavior
            e.stopPropagation(); // Stop event bubbling
            const target = e.currentTarget as HTMLElement;
            const resultItem = target.closest('.os-result-item');
            if (resultItem) {
                const subtitleId = target.dataset.subtitleId;
                if (subtitleId) showSubtitleViewer(resultItem as HTMLElement);
            }
        });
    });
    
    document.querySelectorAll(".os-save-file-btn").forEach(button => {
        button.addEventListener("click", (e: Event) => {
            e.preventDefault();  // Prevent default behavior
            e.stopPropagation(); // Stop event bubbling
            const target = e.currentTarget as HTMLElement;
            const resultItem = target.closest('.os-result-item');
            if (resultItem) handleSubtitleSaveToFile(resultItem as HTMLElement);
        });
    });
}

async function handleSubtitleDownload(resultElement: HTMLElement): Promise<void> {
    // Prevent multiple simultaneous downloads
    if (window.subtitleApplicationInProgress) {
        console.log("Subtitle application already in progress, ignoring duplicate request");
        return;
    }
    
    window.subtitleApplicationInProgress = true;
    
    // Extract the apply button and its subtitleId from the provided result element
    const button = resultElement.querySelector('.os-download-btn') as HTMLElement;
    const subtitleId = button?.dataset.subtitleId;
    
    if (!subtitleId) {
        console.error("Subtitle ID not found in the provided result element");
        window.subtitleApplicationInProgress = false;
        return;
    }
    
    // Modified search logic to find by file_id using the extracted subtitleId
    const result = currentSearchResults.find(r => 
        r.attributes?.files &&
        r.attributes.files.some((file: any) => file.file_id.toString() === subtitleId)
    );
    
    if (!result) {
        console.error(`Subtitle not found for file ID ${subtitleId} in current results`);
        window.subtitleApplicationInProgress = false;
        return;
    }
    
    if (button) {
        setDownloadButtonLoading(button);
    }
    
    // Pre-emptively clean up any existing subtitles from the video
    const videoPlayer = document.querySelector('video');
    if (videoPlayer) {
        clearExistingSubtitles(videoPlayer);
        // Slight delay to ensure DOM operations complete
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Get the token data for API authentication
    const tokenData = await getToken();
    if (!tokenData) {
        alert("Authentication required. Please log in.");
        window.subtitleApplicationInProgress = false;
        if (button) setDownloadButtonError(button);
        return;
    }
    
    // Fetch subtitle data from the API
    const subtitleData = await fetchSubtitleData(tokenData, subtitleId);
    if (!subtitleData) {
        if (button) setDownloadButtonError(button);
        window.subtitleApplicationInProgress = false;
        return;
    }
    
    // Apply the subtitle content to the video
    const success = await applySubtitleToVideo(subtitleData.content);
    if (success) {
        if (button) {
            // Update the cache indicator to green if the subtitle is cached
            updateCacheStatusDisplay(subtitleId);
            setDownloadButtonSuccess(button);
        }
        hideResultsModal();
    } else {
        if (button) setDownloadButtonError(button);
    }
    
    // Always release the lock when done
    window.subtitleApplicationInProgress = false;
}

function setDownloadButtonLoading(button: Element): void {
    if (button instanceof HTMLButtonElement) {
        button.disabled = true;
        const originalText = button.textContent || "";
        button.setAttribute("data-original-text", originalText);
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                 style="animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10"></path>
            </svg>
        `;
        
        // Add spin animation style if not already present
        if (!document.getElementById("spin-animation-style")) {
            const style = document.createElement("style");
            style.id = "spin-animation-style";
            style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }
    }
}

function setDownloadButtonSuccess(button: Element): void {
    if (button instanceof HTMLButtonElement) {
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                 stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        setTimeout(() => resetDownloadButton(button), 1500);
    }
}

function setDownloadButtonError(button: Element): void {
    if (button instanceof HTMLButtonElement) {
        const originalBg = button.style.backgroundColor;
        
        button.disabled = false;
        button.textContent = "Error";
        button.style.backgroundColor = "#e74c3c"; // Red background
        
        setTimeout(() => {
            button.textContent = button.getAttribute("data-original-text") || "Apply";
            button.style.backgroundColor = originalBg;
        }, 3000);
    }
}

function resetDownloadButton(button: Element): void {
    if (button instanceof HTMLButtonElement) {
        button.disabled = false;
        const originalText = button.getAttribute("data-original-text");
        if (originalText) {
            button.textContent = originalText;
        } else {
            // Default text based on button class
            if (button.classList.contains("os-download-btn")) {
                button.textContent = "Apply";
            } else if (button.classList.contains("os-save-file-btn")) {
                button.textContent = "Save File";
            }
        }
    }
}

export function updateCacheStatusDisplay(subtitleId: string): void {
    // Find all result items that might contain this subtitle
    document.querySelectorAll(`.os-result-item`).forEach(item => {
        const statusContainer = item.querySelector(`.subtitle-cache-status[data-subtitle-id="${subtitleId}"]`);
        if (statusContainer) {
            // Recheck cache status and update the display
            checkCacheStatus(subtitleId, item as HTMLElement);
        }
    });
}

async function handleSubtitleSaveToFile(resultElement: HTMLElement): Promise<void> {
    const osViewBtn = resultElement.querySelector('.os-view-btn') as HTMLElement;
    const subtitleId = osViewBtn?.dataset.subtitleId || '';
    if (!subtitleId) {
        console.error("Invalid subtitle ID:", subtitleId);
        return;
    }

    // Find the result data using file_id
    const result = currentSearchResults.find(r => 
        r.attributes?.files && 
        r.attributes.files.some((file: any) => file.file_id.toString() === subtitleId)
    );
    
    if (!result) {
        console.error(`Subtitle not found for file ID ${subtitleId} in current results`);
        return;
    }
    
    // Get the button element to show loading state
    const button = document.querySelector(`.os-save-file-btn[data-subtitle-id="${subtitleId}"]`);
    if (button) {
        setDownloadButtonLoading(button);
    }
    
    try {
        // Get the token data
        const tokenData = await getToken();
        if (!tokenData) {
            alert("Authentication required. Please log in.");
            if (button) resetDownloadButton(button);
            return;
        }
        
        // Fetch subtitle data
        const subtitleData = await fetchSubtitleData(tokenData, subtitleId);
        
        if (!subtitleData) {
            alert("Failed to get subtitle content");
            if (button) resetDownloadButton(button);
            return;
        }
        
        // Download the file
        downloadSubtitleFile(subtitleData.content, subtitleData.fileName);
        
        // Update the cache status display - NEW LINE
        updateCacheStatusDisplay(subtitleId);
        
        if (button) {
            setDownloadButtonSuccess(button);
        }
    } catch (error) {
        console.error("Error saving subtitle file:", error);
        alert(`Failed to download subtitle: ${error instanceof Error ? error.message : "Unknown error"}`);
        if (button) resetDownloadButton(button);
    }
}

function downloadSubtitleFile(content: string, fileName: string): void {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

// Update pagination controls state
function updatePaginationControls(): void {
    const prevBtn = document.getElementById("os-prev-btn");
    const nextBtn = document.getElementById("os-next-btn");
    
    if (prevBtn && prevBtn instanceof HTMLButtonElement) {
        prevBtn.disabled = currentPage === 1;
        prevBtn.style.opacity = currentPage === 1 ? "0.5" : "1";
        prevBtn.style.cursor = currentPage === 1 ? "default" : "pointer";
    }
    
    if (nextBtn && nextBtn instanceof HTMLButtonElement) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.style.opacity = currentPage >= totalPages ? "0.5" : "1";
        nextBtn.style.cursor = currentPage >= totalPages ? "default" : "pointer";
    }
}

// Update results with data from search
// Update results with data from search
export function updateResults(data: any[]): void {
    // Update search results data only, don't override pagination
    currentSearchResults = data;
    
    // If no explicit pagination was set by updatePaginationState, use defaults
    if (totalPages === 0) totalPages = 1;
    if (currentPage === 0) currentPage = 1;
    if (totalCount === 0) totalCount = data.length;
    
    // Display the results
    displayCurrentPage();
}

// Set search parameters
export function setSearchParams(query: string, params: string): void {
    currentSearchQuery = query;
    currentSearchParams = params;
}

export function getCurrentSearchResults(): any[] {
    return currentSearchResults;
}