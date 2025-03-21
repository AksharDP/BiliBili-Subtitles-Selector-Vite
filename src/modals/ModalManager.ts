// Modal manager for modal state and click-outside behavior

import { showSearchModal } from './SearchModal';
import { showResultsModal, showSubtitleViewer } from './ResultsModal';
import { showLoginModal } from './LoginModal';
import { showSettingsModal } from './SettingsModal';

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
let lastActiveModal: ActiveModal = ActiveModal.NONE;
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
        container && (container === target || container.contains(target)));
    
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
        case ActiveModal.SUBTITLE_VIEWER:
            if (lastViewedSubtitleId) {
                showSubtitleViewer(lastViewedSubtitleId);
            } else {
                // Fallback to results if we don't know which subtitle
                showResultsModal(lastSearchPage);
            }
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