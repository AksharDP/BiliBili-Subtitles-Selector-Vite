import { createDiv } from '../ui/components';
import resultsModalTemplate from '../templates/ResultsModal.html?raw';
import { getToken, checkSubtitleInCache } from '../db/indexedDB';  // Add checkSubtitleInCache import
import { fetchSubtitleData, downloadSubtitle, fetchSubtitleContent } from '../api/openSubtitles';
import { 
    applySubtitleToVideo, 
    clearExistingSubtitles 
} from '../utils/subtitleRenderer';
import { 
    setActiveModal, 
    ActiveModal 
} from './ModalManager';

// Define window augmentations
declare global {
    interface Window {
        subtitleApplicationInProgress: boolean;
        subtitleUpdateAnimationFrame: number | null;
        activeCues: any[] | null;
        subtitleSyncOffset: number;
    }
}

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

    // Event listeners for controls
    const prevBtn = document.getElementById("os-prev-btn");
    const nextBtn = document.getElementById("os-next-btn");
    const backBtn = document.getElementById("os-back-search-btn");
    if (prevBtn) prevBtn.addEventListener("click", () => navigateResults("prev"));
    if (nextBtn) nextBtn.addEventListener("click", () => navigateResults("next"));
    if (backBtn) backBtn.addEventListener("click", backToSearch);
}

// Update this function to accept an optional page parameter
export function showResultsModal(page?: number): void {
    // If a page is specified and it's valid, set the current page
    if (page && page > 0 && page <= totalPages) {
        currentPage = page;
    }
    
    // Update summary if results exist
    if (currentSearchResults.length > 0) {
        updateResultsSummary();
        displayCurrentPage();
    }
    
    const overlay = document.getElementById("opensubtitles-results-overlay");
    if (overlay) overlay.style.display = "flex";
    
    // Hide search modal if it's open
    const searchOverlay = document.getElementById("opensubtitles-search-overlay");
    if (searchOverlay) searchOverlay.style.display = "none";
    
    // Record the active modal state
    setActiveModal(ActiveModal.RESULTS, { page: currentPage });
}

export function hideResultsModal(): void {
    const overlay = document.getElementById("opensubtitles-results-overlay");
    if (overlay) overlay.style.display = "none";
    
    // Also hide the subtitle viewer if it's open
    hideSubtitleViewer();
}

// Navigate back to search modal
export function backToSearch(): void {
    hideResultsModal();
    const searchOverlay = document.getElementById("opensubtitles-search-overlay");
    if (searchOverlay) searchOverlay.style.display = "flex";
    
    setActiveModal(ActiveModal.SEARCH);
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
        <strong>Search:</strong> ${currentSearchQuery || "All"}  
        <strong>Languages:</strong> ${languageValue}  
        <strong>Results:</strong> ${totalCount}
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
    
    currentSearchResults.forEach((result, index) => {
        const resultItem = createResultItem(result, index);
        resultsList.appendChild(resultItem);
    });
    
    container.appendChild(resultsList);
    
    // Attach event listeners to buttons
    attachResultButtonListeners();
}

// Create a result item element
function createResultItem(result: any, index: number): HTMLElement {
    const item = document.createElement("div");
    item.className = "os-result-item";
    item.dataset.index = index.toString();
    item.style.cssText = "padding: 15px; background-color: #f9f9f9; border-radius: 4px; margin-bottom: 10px;";
    
    // Extract the right fields from the response
    const attributes = result.attributes || {};
    const files = attributes.files && attributes.files.length > 0 ? attributes.files[0] : {};
    
    const title = attributes.feature_details?.title || attributes.release || "Untitled";
    const language = attributes.language || "Unknown";
    
    // Format detection removed from display.
    const downloads = attributes.download_count || 0;
    const year = attributes.feature_details?.year || attributes.year || "";
    
    // Get release name or filename (can be very long)
    const releaseInfo = attributes.release || attributes.filename || "";
    
    // Check cache status (initially unknown)
    const cacheStatus = `
        <div class="subtitle-cache-status" data-subtitle-id="${result.id}" style="display: inline-flex; align-items: center; margin-right: 8px;">
            <span class="cache-indicator" style="width: 8px; height: 8px; border-radius: 50%; background-color: #ccc; margin-right: 4px;"></span>
            <span class="cache-text" style="font-size: 12px; color: #777;">checking...</span>
        </div>
    `;
    
    // Add more detailed information with text handling for long strings - LEFT ALIGNED
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
            ${cacheStatus}
            <span>Downloads: ${downloads}</span>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button class="os-view-btn" data-subtitle-id="${result.id}" style="padding: 6px 12px; background-color: #f0f0f0; color: #333; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">View</button>
            <button class="os-download-btn" data-subtitle-id="${result.id}" style="padding: 6px 12px; background-color: #00a1d6; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">Apply</button>
            <button class="os-save-file-btn" data-subtitle-id="${result.id}" style="padding: 6px 12px; background-color: #f0f0f0; color: #333; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">Save File</button>
        </div>
    `;
    
    // Check cache status asynchronously
    checkCacheStatus(result.id, item);
    
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
            const target = e.currentTarget as HTMLElement;
            const subtitleId = target.dataset.subtitleId;
            if (subtitleId) handleSubtitleDownload(subtitleId);
        });
    });
    
    document.querySelectorAll(".os-view-btn").forEach(button => {
        button.addEventListener("click", (e: Event) => {
            const target = e.currentTarget as HTMLElement;
            const subtitleId = target.dataset.subtitleId;
            if (subtitleId) showSubtitleViewer(subtitleId);
        });
    });
    
    document.querySelectorAll(".os-save-file-btn").forEach(button => {
        button.addEventListener("click", (e: Event) => {
            const target = e.currentTarget as HTMLElement;
            const subtitleId = target.dataset.subtitleId;
            if (subtitleId) handleSubtitleSaveToFile(subtitleId);
        });
    });
}

export function showSubtitleViewer(subtitleId: string): void {
    createSubtitleViewer(); // Ensure the viewer exists
    
    const viewerOverlay = document.getElementById("subtitle-viewer-overlay");
    const loading = document.getElementById("subtitle-loading");
    const content = document.getElementById("subtitle-content") as HTMLTextAreaElement;
    const title = document.getElementById("subtitle-viewer-title");
    
    if (viewerOverlay && loading && content && title) {
        // Show the overlay and loading indicator
        viewerOverlay.style.display = "flex";
        loading.style.display = "flex";
        content.value = ""; // Clear previous content
        
        // Record the active modal and subtitle ID
        setActiveModal(ActiveModal.SUBTITLE_VIEWER, subtitleId);
        
        // Fetch the subtitle content based on ID and update the viewer
        getToken().then(tokenData => {
            if (!tokenData) {
                content.value = "Authentication required";
                loading.style.display = "none";
                return;
            }
            
            fetchSubtitleContent(tokenData, subtitleId)
                .then(data => {
                    if (data) {
                        title.textContent = data.title || "Subtitle Content";
                        content.value = data.content || "No content available";
                        
                        // Set up copy button
                        const copyBtn = document.getElementById("subtitle-copy-btn");
                        if (copyBtn) {
                            copyBtn.onclick = () => {
                                content.select();
                                document.execCommand('copy');
                                alert("Subtitle content copied to clipboard");
                            };
                        }
                    } else {
                        content.value = "Failed to load subtitle content";
                    }
                    loading.style.display = "none";
                })
                .catch(error => {
                    content.value = `Error: ${error.message || "Failed to load subtitle"}`;
                    loading.style.display = "none";
                });
        });
    }
}

async function handleSubtitleDownload(subtitleId: string): Promise<void> {
    // Prevent multiple simultaneous downloads
    if (window.subtitleApplicationInProgress) {
        console.log("Subtitle application already in progress, ignoring duplicate request");
        return;
    }
    
    window.subtitleApplicationInProgress = true;
    
    try {
        // Find the result data
        const result = currentSearchResults.find(r => r.id === subtitleId);
        if (!result) {
            console.error("Subtitle not found in current results");
            window.subtitleApplicationInProgress = false;
            return;
        }
        
        // Get the button element to show loading state
        const button = document.querySelector(`.os-download-btn[data-subtitle-id="${subtitleId}"]`);
        if (button) {
            setDownloadButtonLoading(button);
        }
        
        // Pre-emptively clean up any existing subtitles
        const videoPlayer = document.querySelector('video');
        if (videoPlayer) {
            clearExistingSubtitles(videoPlayer);
            // Add a small delay to ensure DOM operations complete
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Get the token data
        const tokenData = await getToken();
        if (!tokenData) {
            alert("Authentication required. Please log in.");
            window.subtitleApplicationInProgress = false;
            if (button) setDownloadButtonError(button);
            return;
        }
        
        // Fetch subtitle data
        const subtitleData = await fetchSubtitleData(tokenData, subtitleId, result);
        
        if (!subtitleData) {
            if (button) setDownloadButtonError(button);
            window.subtitleApplicationInProgress = false;
            return;
        }
        
        // Apply the subtitle content to the video
        const success = await applySubtitleToVideo(subtitleData.content);
        
        if (success) {
            if (button) {
                setDownloadButtonSuccess(button);
            }
            
            // Clear modal state since we've applied the subtitle and closing all modals
            setActiveModal(ActiveModal.NONE);
            hideResultsModal();
        } else {
            if (button) setDownloadButtonError(button);
        }
    } catch (error) {
        console.error("Error downloading subtitle:", error);
        const button = document.querySelector(`.os-download-btn[data-subtitle-id="${subtitleId}"]`);
        if (button) setDownloadButtonError(button);
    } finally {
        // Always release the lock when done
        window.subtitleApplicationInProgress = false;
    }
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
            const originalText = button.getAttribute("data-original-text") || "Apply";
            button.textContent = originalText;
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

async function handleSubtitleSaveToFile(subtitleId: string): Promise<void> {
    // Find the result data
    const result = currentSearchResults.find(r => r.id === subtitleId);
    if (!result) {
        console.error("Subtitle not found in current results");
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
        const subtitleData = await fetchSubtitleData(tokenData, subtitleId, result);
        
        if (!subtitleData) {
            alert("Failed to get subtitle content");
            if (button) resetDownloadButton(button);
            return;
        }
        
        // Download the file
        downloadSubtitleFile(subtitleData.content, subtitleData.fileName);
        
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

// Subtitle viewer functions
export function createSubtitleViewer(): void {
    if (document.getElementById("subtitle-viewer-overlay")) return;
    
    // Create subtitle viewer elements (implementation omitted for brevity)
    console.log("Creating subtitle viewer");
}

export function hideSubtitleViewer(): void {
    const viewerOverlay = document.getElementById("subtitle-viewer-overlay");
    if (viewerOverlay) viewerOverlay.style.display = "none";
}

// Update results with data from search
export function updateResults(data: any[]): void {
    // Update global state
    currentSearchResults = data;
    currentPage = 1;
    totalPages = 1;
    totalCount = data.length;
    
    // Display the results
    displayCurrentPage();
}

// Set search parameters
export function setSearchParams(query: string, params: string): void {
    currentSearchQuery = query;
    currentSearchParams = params;
}