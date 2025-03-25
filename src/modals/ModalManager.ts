// Modal manager for modal state and click-outside behavior

import { showSearchModal } from './SearchModal';
import { showResultsModal } from './ResultsModal';
import { showLoginModal } from './LoginModal';
import { showSettingsModal } from './SettingsModal';
import { showSubtitleViewer } from './SubtitleViewerModal';

// Track which modal was last active
export enum ActiveModal {
    NONE = 'none',
    LOGIN = 'login',
    SEARCH = 'search',
    RESULTS = 'results',
    SUBTITLE_VIEWER = 'subtitle_viewer',
    SETTINGS = 'settings'
}

// State tracking variables
let lastActiveModal: ActiveModal = ActiveModal.LOGIN;
let isModalOpen: boolean = false;
let lastViewedSubtitleId: string | null = null;
let lastSearchQuery: string | null = null;
let lastSearchPage: number = 1;

/**
 * Initialize the modal manager
 */
export function initModalManager(): void {
    // Add class to modal containers for animation
    document.querySelectorAll('.os-modal-container').forEach(el => {
        el.classList.add('os-modal');
    });
    
    // Setup click-outside detection
    document.addEventListener('click', handleDocumentClick);
}

/**
 * Handle document clicks to detect clicks outside modals
 */
function handleDocumentClick(event: MouseEvent): void {
    // Skip if no modal is open
    if (!isModalOpen) return;
    
    // Skip if we're currently handling back-to-search navigation
    if (window.isNavigatingBackToSearch) return;
    
    // Skip if we have the prevent hiding flag set
    if (window.localStorage.getItem('preventSearchHiding') === 'true') {
        // Only clear the flag, don't process the click
        window.localStorage.removeItem('preventSearchHiding');
        return;
    }
    
    const target = event.target as HTMLElement;
    
    // Get all modal containers
    const modalContainers = [
        document.getElementById('opensubtitles-login-modal'),
        document.getElementById('opensubtitles-search-modal'),
        document.getElementById('opensubtitles-results-modal'),
        document.getElementById('opensubtitles-settings-modal'),
        document.getElementById('subtitle-viewer-container')
    ];
    
    // Check if click is inside any modal
    const isClickInsideModal = modalContainers.some(container =>
        container && (container === target || container.contains(target))
    );
    
    // Check if click is on a control button
    const isClickOnButton = target.closest('#opensubtitles-login-btn') !== null;
    
    // If click is outside modals and not on the button, hide all modals
    if (!isClickInsideModal && !isClickOnButton) {
        hideAllModals();
    }
}

/**
 * Hide all modals
 */
export function hideAllModals(): void {
    const overlays = [
        document.getElementById('opensubtitles-login-overlay'),
        document.getElementById('opensubtitles-search-overlay'),
        document.getElementById('opensubtitles-results-overlay'),
        document.getElementById('opensubtitles-settings-overlay'),
        document.getElementById('subtitle-viewer-overlay')
    ];
    
    overlays.forEach(overlay => {
        if (overlay) overlay.style.display = 'none';
    });
    
    isModalOpen = false;
    
    // We don't reset lastActiveModal so we remember where to return
}

/**
 * Set the active modal
 */
export function setActiveModal(modal: ActiveModal, data?: any): void {
    console.log(`Modal state changing from ${lastActiveModal} to ${modal}`, data); // Debug log

    // Special case: when explicitly navigating back to search from results
    if (modal === ActiveModal.SEARCH && data?.fromResults) {
        // Clear results state to prevent returning to results
        lastSearchPage = 1;
        lastActiveModal = ActiveModal.SEARCH;
        isModalOpen = true;
        
        // Extra protection against modals closing
        if (data?.preventHiding) {
            window.localStorage.setItem('preventSearchHiding', 'true');
        }
        
        // Clear search results if requested
        if (data?.clearResults) {
            window.localStorage.setItem('forceSearchModal', 'true');
        }
        
        return;
    }
    
    // Special case for subtitle viewer - if results should remain visible
    if (modal === ActiveModal.SUBTITLE_VIEWER && data?.resultsVisible) {
        // Set a compound state - both results and viewer active
        lastActiveModal = modal;
        isModalOpen = true;
        
        // Store additional context
        if (data?.subtitleId) {
            lastViewedSubtitleId = data.subtitleId;
        }
        
        return; // Don't hide other modals
    }
    
    // Standard case - single active modal
    lastActiveModal = modal;
    isModalOpen = modal !== ActiveModal.NONE;
    
    // Store additional context based on modal type
    if (modal === ActiveModal.SUBTITLE_VIEWER && data?.subtitleId) {
        lastViewedSubtitleId = data.subtitleId;
    } else if (modal === ActiveModal.SEARCH && data?.query) {
        lastSearchQuery = data.query;
    } else if (modal === ActiveModal.RESULTS && data?.page) {
        lastSearchPage = data.page;
    }
    
    // Hide all other modals when switching
    hideOtherModals(modal);
}

/**
 * Hide all modals except the specified one
 */
function hideOtherModals(exceptModal: ActiveModal): void {
    const modalMap = {
        [ActiveModal.LOGIN]: 'opensubtitles-login-overlay',
        [ActiveModal.SEARCH]: 'opensubtitles-search-overlay',
        [ActiveModal.RESULTS]: 'opensubtitles-results-overlay',
        [ActiveModal.SETTINGS]: 'opensubtitles-settings-overlay',
        [ActiveModal.SUBTITLE_VIEWER]: 'subtitle-viewer-overlay'
    };
    
    Object.entries(modalMap).forEach(([modal, id]) => {
        if (modal !== exceptModal.toString()) {
            const overlay = document.getElementById(id);
            if (overlay) overlay.style.display = 'none';
        }
    });
}

/**
 * Restore the last active modal when button is clicked
 */
export function restoreLastActiveModal(): void {
    isModalOpen = true;
    
    // Check if we should force the search modal regardless of state
    const forceSearch = window.localStorage.getItem('forceSearchModal') === 'true';
    if (forceSearch) {
        // Clear the flag and show search modal
        window.localStorage.removeItem('forceSearchModal');
        showSearchModal();
        return;
    }
    
    // Check if we need to show both results and subtitle viewer
    const showBoth = lastActiveModal === ActiveModal.SUBTITLE_VIEWER && lastViewedSubtitleId !== null;
    if (showBoth) {
        // First show the results modal
        showResultsModal(lastSearchPage);
        
        // Attempt to get the result element associated with the last viewed subtitle
        const resultBtn = document.querySelector(`.os-result-item[data-subtitle-id="${lastViewedSubtitleId}"]`) as HTMLElement | null;
        if (resultBtn) {
            const resultItem = resultBtn.closest('.os-result-item');
            if (resultItem) {
                // After a small delay to ensure the results modal exists, show the subtitle viewer
                setTimeout(() => {
                    showSubtitleViewer(resultItem as HTMLElement);
                }, 50);
                return;
            }
        }
        // If no result element is found, fall back to showing the results modal
        return;
    }
    
    // Normal single-modal case
    switch (lastActiveModal) {
        case ActiveModal.LOGIN:
            showLoginModal();
            break;
        case ActiveModal.SEARCH:
            showSearchModal();
            break;
        case ActiveModal.RESULTS:
            showResultsModal(lastSearchPage);
            break;
        case ActiveModal.SETTINGS:
            showSettingsModal();
            break;
        default:
            // Default to search if no previous state
            showSearchModal();
            break;
    }
}

// Export state for external use
export {
    lastActiveModal,
    isModalOpen,
    lastViewedSubtitleId,
    lastSearchQuery,
    lastSearchPage
};

declare global {
    interface Window {
        isNavigatingBackToSearch: boolean;
        searchFormHideTimeout?: ReturnType<typeof setTimeout>;
    }
}