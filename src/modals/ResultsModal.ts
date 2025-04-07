import { createDiv } from '../ui/components';
import resultsModalTemplate from '../templates/ResultsModal.html?raw';
import { checkSubtitleInCache, getToken } from '../db/indexedDB';
import { fetchSubtitleData } from '../api/openSubtitles';
import { hideSubtitleViewer, showSubtitleViewer } from './SubtitleViewerModal';
import { applySubtitleToVideo, clearExistingSubtitles } from '../utils/subtitleRenderer';
import { ActiveModal, setActiveModal } from './ModalManager';
import { showSearchModal } from './SearchModal';
import {
    RED,
    GREEN,
    GREY,
    WHITE,
    BLUE
} from '../utils/constants';

export let resultsOverlay: HTMLDivElement | null = null;
export let resultsModal: HTMLDivElement | null = null;
let resultsContainer: HTMLElement | null = null;
let paginationInfo: HTMLElement | null = null;
let resultsSummaryElement: HTMLElement | null = null;
let prevPageBtn: HTMLButtonElement | null = null;
let nextPageBtn: HTMLButtonElement | null = null;
let backToSearchBtn: HTMLButtonElement | null = null;

let currentSearchResults: any[] = [];
let currentPage: number = 1;
let totalPages: number = 1;
let totalCount: number = 0;
let perPage: number = 50;
let currentSearchQuery: string = "";
let currentSearchParams: string | null = null;

export function createResultsModal(): void {
    if (document.getElementById("opensubtitles-results-overlay")) return;

    const overlayDiv = createDiv("opensubtitles-results-overlay", "", `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5); z-index: 10000; display: none;
        justify-content: center; align-items: center;
    `);

    const modalDiv = createDiv("opensubtitles-results-modal", "", `
        background-color: ${WHITE}; padding: 0; border-radius: 6px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); width: 500px; max-width: 90%;
        max-height: 80vh; display: flex; flex-direction: column; overflow: hidden;
    `);

    modalDiv.innerHTML = resultsModalTemplate;
    overlayDiv.appendChild(modalDiv);
    document.body.appendChild(overlayDiv);

    resultsOverlay = overlayDiv;
    resultsModal = modalDiv;
    resultsContainer = resultsModal.querySelector("#os-results-container") as HTMLElement;
    paginationInfo = resultsModal.querySelector("#os-pagination-info") as HTMLElement;
    resultsSummaryElement = resultsModal.querySelector("#os-results-summary") as HTMLElement;
    prevPageBtn = resultsModal.querySelector("#os-prev-btn") as HTMLButtonElement;
    nextPageBtn = resultsModal.querySelector("#os-next-btn") as HTMLButtonElement;
    backToSearchBtn = resultsModal.querySelector("#os-back-search-btn") as HTMLButtonElement;

    resultsOverlay.addEventListener("click", (e: MouseEvent) => {
        if (e.target === resultsOverlay) {
            hideResultsModal();
        }
    });

    resultsModal.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
    });

    prevPageBtn?.addEventListener("click", () => navigateResults("prev"));
    nextPageBtn?.addEventListener("click", () => navigateResults("next"));
    backToSearchBtn?.addEventListener("click", backToSearch);
}

export function showResultsModal(page?: number, setActive?: boolean | true): void {
    if (!resultsOverlay || !resultsModal) {
        console.error("Results modal elements not found or not created.");
        return;
    }

    if (page && page > 0 && page <= totalPages) {
        currentPage = page;
    }

    resultsOverlay.style.pointerEvents = "auto";

    const searchOverlay = document.getElementById("opensubtitles-search-overlay");
    if (searchOverlay) searchOverlay.style.display = "none";

    resultsOverlay.style.display = "flex";

    if (currentSearchResults.length > 0) {
        updateResultsSummary();
        displayCurrentPage();
    } else {
        if(resultsContainer) {
            resultsContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: ${GREY};">No results found or loaded yet.</div>`;
        }
        if (paginationInfo) paginationInfo.textContent = "";
        if (resultsSummaryElement) resultsSummaryElement.innerHTML = "No Search Performed";
    }

    if (resultsContainer) {
        resultsContainer.style.overflow = "auto";
        resultsContainer.style.maxHeight = "calc(80vh - 140px)";
    }

    updatePaginationControls();
    if (setActive) setActiveModal(ActiveModal.RESULTS, { page: currentPage });
    // setActiveModal(ActiveModal.RESULTS, { page: currentPage });
}


export function hideResultsModal(): void {
    if (resultsOverlay) resultsOverlay.style.display = "none";
    hideSubtitleViewer();
    // setActiveModal(ActiveModal.);
}

function backToSearch(): void {
    if ((window as any).searchFormHideTimeout) {
        clearTimeout((window as any).searchFormHideTimeout);
        delete (window as any).searchFormHideTimeout;
    }
    (window as any).isNavigatingBackToSearch = true;

    hideResultsModal();

    if (resultsModal) {
        resultsModal.style.position = "";
        resultsModal.style.left = "";
        resultsModal.style.top = "";
        resultsModal.style.transform = "";
        resultsModal.style.margin = "0 auto";
        resultsModal.style.width = "500px";
        resultsModal.style.zIndex = "";
        resultsModal.style.transition = "";
        resultsModal.style.display = "";
        resultsModal.style.pointerEvents = "auto";
    }

    showSearchModal();

    currentSearchResults = [];
    currentPage = 1;
    totalPages = 1;
    totalCount = 0;

    window.localStorage.setItem('forceSearchModal', 'true');
    window.localStorage.setItem('preventSearchHiding', 'true');

    setTimeout(() => {
        (window as any).isNavigatingBackToSearch = false;
    }, 500);
}

async function navigateResults(direction: "prev" | "next"): Promise<void> {
    if (direction === "prev" && currentPage > 1) {
        currentPage--;
        await displayCurrentPage();
    } else if (direction === "next" && currentPage < totalPages) {
        currentPage++;
        await displayCurrentPage();
    }
    updatePaginationControls();
}

export function updatePaginationState(data: any, page: number): void {
    currentPage = data.page || page;
    totalPages = data.total_pages || 1;
    totalCount = data.total_count || 0;
    perPage = data.per_page || 50;
}

function updateResultsSummary(): void {
    const summaryEl = resultsSummaryElement;
    if (!summaryEl) return;

    let languageValue = "All";
    if (currentSearchParams?.includes("languages=")) {
        const match = currentSearchParams.match(/languages=([^&]+)/);
        if (match && match[1]) {
            languageValue = match[1].split(',').join(', ');
        }
    }

    summaryEl.innerHTML = `
        <strong style="margin-right: 2px">Search:</strong> ${currentSearchQuery || "All"}
        <strong style="margin-left: 10px; margin-right: 2px">Lang:</strong> ${languageValue}
        <strong style="margin-left: 10px; margin-right: 2px">Results:</strong> ${totalCount}
    `;
}

async function displayCurrentPage(): Promise<void> {
    const container = resultsContainer;
    const pagInfo = paginationInfo;
    if (!container || !pagInfo) return;

    pagInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    container.innerHTML = "";

    if (currentSearchResults.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No results found for your search criteria.</div>';
        return;
    }

    const resultsList = document.createElement("div");
    resultsList.style.cssText = "display: flex; flex-direction: column; gap: 10px; width: 100%;";

    const itemPromises = currentSearchResults.map((result, index) => createResultItem(result, index));
    const items = await Promise.all(itemPromises);
    items.forEach(item => resultsList.appendChild(item));

    container.appendChild(resultsList);

    attachResultButtonListeners(container);
}

async function createResultItem(result: any, index: number): Promise<HTMLElement> {
    const item = document.createElement("div");
    item.className = "os-result-item";
    item.dataset.index = index.toString();
    item.style.cssText = `
        padding: 15px;
        background-color: ${WHITE};
        margin-bottom: 10px;
        border-radius: 4px;
        border: 1px solid rgba(0,0,0,0.15);
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;

    const attributes = result.attributes || {};
    const file = attributes.files && attributes.files.length > 0 ? attributes.files[0] : {};
    const fileId = file.file_id ? file.file_id.toString() : "";

    const title = attributes.feature_details?.title || attributes.release || "Untitled Subtitle";
    const language = attributes.language || "N/A";
    const downloads = attributes.download_count || 0;
    const year = attributes.feature_details?.year || "";
    const releaseInfo = attributes.release || attributes.filename || "No release info";

    const isCached = await checkSubtitleInCache(fileId);
    const cacheIndicatorColor = isCached ? GREEN : GREY;
    const cacheText = isCached ? 'Cached' : 'Not cached';

    item.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <h3 title="${title} ${year ? `(${year})` : ''}" style="margin: 0; font-size: 16px; color: ${BLUE}; overflow: hidden; text-overflow: ellipsis; max-width: 350px; white-space: nowrap;">
                ${title} ${year ? `(${year})` : ''}
            </h3>
            <span style=" font-size: 14px; color: ${GREY}; margin-left: 8px; flex-shrink: 0;">${language}</span>
        </div>
        <div title="${releaseInfo}" style=" font-size: 14px; color: ${GREY}; margin-bottom: 8px; word-break: break-word; overflow-wrap: break-word; max-height: 40px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            ${releaseInfo}
        </div>
        <div style="display: flex; justify-content: flex-start; font-size: 14px; color: ${GREY}; margin-bottom: 10px; align-items: center;">
            <div class="subtitle-cache-status" data-subtitle-id="${fileId}" style="display: inline-flex; align-items: center; margin-right: 8px;">
                <span class="cache-indicator" style="width: 8px; height: 8px; border-radius: 50%; background-color: ${cacheIndicatorColor}; margin-right: 4px;"></span>
                <span class="cache-text" style="font-size: 12px; color: ${cacheIndicatorColor};">${cacheText}</span>
            </div>
            <span>Downloads: ${downloads.toLocaleString()}</span>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button class="os-view-btn" data-subtitle-id="${fileId}" style="padding: 6px 12px; background-color: ${WHITE}; color: ${GREY}; border: none; border-radius: 4px; cursor: pointer;">View</button>
            <button class="os-download-btn" data-subtitle-id="${fileId}" style="padding: 6px 12px; background-color: ${BLUE}; color: ${WHITE}; border: none; border-radius: 4px; cursor: pointer;">Apply</button>
            <button class="os-save-file-btn" data-subtitle-id="${fileId}" style="padding: 6px 12px; background-color: ${WHITE}; color: ${GREY}; border: none; border-radius: 4px; cursor: pointer;">Save File</button>
        </div>
    `;

    return item;
}

async function checkCacheStatus(subtitleId: string, itemElement: HTMLElement): Promise<void> {
    try {
        const isCached = await checkSubtitleInCache(subtitleId);
        const statusContainer = itemElement.querySelector(`.subtitle-cache-status[data-subtitle-id="${subtitleId}"]`);
        if (statusContainer) {
            const indicator = statusContainer.querySelector('.cache-indicator') as HTMLElement;
            const text = statusContainer.querySelector('.cache-text') as HTMLElement;
            const newColor = isCached ? GREEN : GREY;
            const newText = isCached ? 'Cached' : 'Not cached';
            if (indicator) indicator.style.backgroundColor = newColor;
            if (text) {
                text.textContent = newText;
                text.style.color = newColor;
            }
        }
    } catch (error) {
        console.error(`Error checking cache for subtitle ${subtitleId}:`, error);
    }
}


function attachResultButtonListeners(container: HTMLElement): void {
    container.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;

        const viewBtn = target.closest('.os-view-btn');
        const downloadBtn = target.closest('.os-download-btn');
        const saveBtn = target.closest('.os-save-file-btn');
        const resultItem = target.closest('.os-result-item') as HTMLElement | null;

        if (!resultItem) return;

        const subtitleId = (viewBtn || downloadBtn || saveBtn)?.getAttribute('data-subtitle-id');

        if (subtitleId) {
            if (viewBtn) {
                e.preventDefault(); e.stopPropagation();
                showSubtitleViewer(viewBtn.getAttribute('data-subtitle-id') || '');
            } else if (downloadBtn) {
                e.preventDefault(); e.stopPropagation();
                handleSubtitleDownload(resultItem);
            } else if (saveBtn) {
                e.preventDefault(); e.stopPropagation();
                handleSubtitleSaveToFile(resultItem);
            }
        }
    });
}


async function handleSubtitleDownload(resultElement: HTMLElement): Promise<void> {
    if ((window as any).subtitleApplicationInProgress) return;
    (window as any).subtitleApplicationInProgress = true;

    const button = resultElement.querySelector('.os-download-btn') as HTMLElement;
    const subtitleId = button?.dataset.subtitleId;

    if (!subtitleId) {
        console.error("Subtitle ID missing on download button.");
        (window as any).subtitleApplicationInProgress = false;
        return;
    }

    const result = currentSearchResults.find(r =>
        r.attributes?.files?.some((file: any) => file.file_id.toString() === subtitleId)
    );

    if (!result) {
        console.error(`Result data not found for file ID ${subtitleId}.`);
        (window as any).subtitleApplicationInProgress = false;
        return;
    }

    if (button) setDownloadButtonLoading(button);

    try {
        const videoPlayer = document.querySelector('video');
        if (videoPlayer) {
            clearExistingSubtitles(videoPlayer);
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const tokenData = await getToken();
        if (!tokenData) {
            alert("Authentication required.");
            throw new Error("Auth token missing");
        }

        const subtitleData = await fetchSubtitleData(tokenData, subtitleId);
        if (!subtitleData) {
            throw new Error("Failed to fetch subtitle data.");
        }

        const success = await applySubtitleToVideo(subtitleData.content);
        if (success) {
            if (button) setDownloadButtonSuccess(button);
            updateCacheStatusDisplay(subtitleId);
            hideResultsModal();
        } else {
            throw new Error("Failed to apply subtitles to video.");
        }
    } catch (error) {
        console.error("Error during subtitle download/application:", error);
        if (button) setDownloadButtonError(button);
    } finally {
        (window as any).subtitleApplicationInProgress = false;
    }
}


function setDownloadButtonLoading(button: Element): void {
    if (button instanceof HTMLButtonElement) {
        button.disabled = true;
        const originalText = button.textContent || "";
        button.setAttribute("data-original-text", originalText);
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite; margin: auto;">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10"></path>
            </svg>
        `;
        if (!document.getElementById("spin-animation-style")) {
            const style = document.createElement("style"); style.id = "spin-animation-style";
            style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`; document.head.appendChild(style);
        }
    }
}

function setDownloadButtonSuccess(button: Element): void {
    if (button instanceof HTMLButtonElement) {
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke=${GREEN} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin: auto;">
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
        button.style.backgroundColor = RED;
        setTimeout(() => {
            resetDownloadButton(button);
            button.style.backgroundColor = originalBg;
        }, 3000);
    }
}

function resetDownloadButton(button: Element): void {
    if (button instanceof HTMLButtonElement) {
        button.disabled = false;
        const originalText = button.getAttribute("data-original-text");
        button.innerHTML = "";
        button.textContent = originalText || (button.classList.contains('os-download-btn') ? 'Apply' : 'Save File');
    }
}

export function updateCacheStatusDisplay(subtitleId: string): void {
    if (resultsContainer) {
         const itemElement = resultsContainer.querySelector(`.os-result-item .subtitle-cache-status[data-subtitle-id="${subtitleId}"]`)?.closest('.os-result-item');
         if(itemElement) {
            checkCacheStatus(subtitleId, itemElement as HTMLElement);
         }
    }
}

async function handleSubtitleSaveToFile(resultElement: HTMLElement): Promise<void> {
    const button = resultElement.querySelector('.os-save-file-btn') as HTMLElement;
    const subtitleId = button?.dataset.subtitleId;

    if (!subtitleId) {
        console.error("Subtitle ID missing on save button.");
        return;
    }

    const result = currentSearchResults.find(r =>
        r.attributes?.files?.some((file: any) => file.file_id.toString() === subtitleId)
    );
    if (!result) {
        console.error(`Result data not found for file ID ${subtitleId}.`);
        return;
    }

    if (button) setDownloadButtonLoading(button);

    try {
        const tokenData = await getToken();
        if (!tokenData) {
            alert("Authentication required.");
            throw new Error("Auth token missing");
        }

        const subtitleData = await fetchSubtitleData(tokenData, subtitleId);
        if (!subtitleData) {
             throw new Error("Failed to fetch subtitle data.");
        }

        downloadSubtitleFile(subtitleData.content, subtitleData.fileName);
        updateCacheStatusDisplay(subtitleId);

        if (button) setDownloadButtonSuccess(button);

    } catch (error) {
        console.error("Error saving subtitle file:", error);
        alert(`Failed to download subtitle: ${error instanceof Error ? error.message : "Unknown error"}`);
        if (button) setDownloadButtonError(button);
    }
}


function downloadSubtitleFile(content: string, fileName: string): void {
    try {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '-').replace(/\.\.+/g, '.');
        downloadLink.download = safeFileName.endsWith('.srt') ? safeFileName : `${safeFileName}.srt`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
        console.error("Error creating download link:", error);
        alert("Could not create download link.");
    }
}

function updatePaginationControls(): void {
    const prevBtn = prevPageBtn;
    const nextBtn = nextPageBtn;

    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.style.opacity = currentPage <= 1 ? "0.5" : "1";
        prevBtn.style.cursor = currentPage <= 1 ? "not-allowed" : "pointer";
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.style.opacity = currentPage >= totalPages ? "0.5" : "1";
        nextBtn.style.cursor = currentPage >= totalPages ? "not-allowed" : "pointer";
    }
}


export function updateResults(data: any[]): void {
    currentSearchResults = data || [];

    if (totalCount === 0) totalCount = currentSearchResults.length;
    if (totalPages === 0) totalPages = Math.ceil(totalCount / (perPage || 50)) || 1;
    if (currentPage === 0) currentPage = 1;

    if (resultsOverlay && resultsOverlay.style.display === 'flex') {
        displayCurrentPage();
        updateResultsSummary();
        updatePaginationControls();
    }
}

export function setSearchParams(query: string, params: string): void {
    currentSearchQuery = query;
    currentSearchParams = params;
}

export function getCurrentSearchResults(): any[] {
    return currentSearchResults;
}
