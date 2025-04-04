import { openUiBtn } from '../main';
import { showSearchModal, searchOverlay, searchModal } from './SearchModal';
import { showResultsModal, resultsOverlay, resultsModal } from './ResultsModal';
import { showLoginModal, loginOverlay, loginModal } from './LoginModal';
import { showSettingsModal, settingsOverlay, settingsModal } from './SettingsModal';
import { showSubtitleViewer, subtitleViewerOverlay, subtitleViewerModal } from './SubtitleViewerModal';

export enum ActiveModal {
    NONE = 'none',
    LOGIN = 'login',
    SEARCH = 'search',
    RESULTS = 'results',
    SUBTITLE_VIEWER = 'subtitle_viewer',
    SETTINGS = 'settings'
}

let lastActiveModal: ActiveModal = ActiveModal.LOGIN;
let isModalOpen: boolean = false;
let lastViewedSubtitleId: string | null = null;
let lastSearchQuery: string | null = null;
let lastSearchPage: number = 1;

export function initModalManager(): void {
    document.querySelectorAll('.os-modal-container').forEach(el => {
        el.classList.add('os-modal');
    });
    
    document.addEventListener('click', handleDocumentClick);
}

function handleDocumentClick(event: MouseEvent): void {
    if (!isModalOpen) return;
    
    if (window.isNavigatingBackToSearch) return;
    
    if (window.localStorage.getItem('preventSearchHiding') === 'true') {
        window.localStorage.removeItem('preventSearchHiding');
        return;
    }
    
    const target = event.target as HTMLElement;
    
    const modalContainers = [
        loginModal,
        searchModal,
        resultsModal,
        settingsModal,
        subtitleViewerModal
    ];
    
    const isClickInsideModal = modalContainers.some(container =>
        container && (container === target || container.contains(target))
    );
    
    const isClickOnButton = openUiBtn.contains(target);
    
    if (!isClickInsideModal && !isClickOnButton) {
        hideAllModals();
    }
}

function getOverlayMap() {
    return {
        [ActiveModal.LOGIN]: loginOverlay,
        [ActiveModal.SEARCH]: searchOverlay,
        [ActiveModal.RESULTS]: resultsOverlay,
        [ActiveModal.SETTINGS]: settingsOverlay,
        [ActiveModal.SUBTITLE_VIEWER]: subtitleViewerOverlay
    };
}

function hideOtherModals(exceptModal: ActiveModal): void {
    Object.entries(getOverlayMap()).forEach(([modal, overlayElement]) => {
        if (modal !== exceptModal.toString()) {
            const element = typeof overlayElement === 'string' ? document.getElementById(overlayElement) : overlayElement;
            if (element) element.style.display = 'none';
        }
    });
}

export function hideAllModals(): void {
    Object.values(getOverlayMap()).forEach(overlay => {
        if (overlay) overlay.style.display = 'none';
    });
    
    isModalOpen = false;
}

export function setActiveModal(modal: ActiveModal, data?: any): void {
    console.log(`Modal state changing from ${lastActiveModal} to ${modal}`, data);

    if (modal === ActiveModal.SEARCH && data?.fromResults) {
        lastSearchPage = 1;
        lastActiveModal = ActiveModal.SEARCH;
        isModalOpen = true;
        
        if (data?.preventHiding) {
            window.localStorage.setItem('preventSearchHiding', 'true');
        }
        
        if (data?.clearResults) {
            window.localStorage.setItem('forceSearchModal', 'true');
        }
        
        return;
    }
    
    if (modal === ActiveModal.SUBTITLE_VIEWER && data?.resultsVisible) {
        lastActiveModal = modal;
        isModalOpen = true;
        
        if (data?.subtitleId) {
            lastViewedSubtitleId = data.subtitleId;
        }
        
        return;
    }
    
    lastActiveModal = modal;
    isModalOpen = modal !== ActiveModal.NONE;
    
    if (modal === ActiveModal.SUBTITLE_VIEWER && data?.subtitleId) {
        lastViewedSubtitleId = data.subtitleId;
    } else if (modal === ActiveModal.SEARCH && data?.query) {
        lastSearchQuery = data.query;
    } else if (modal === ActiveModal.RESULTS && data?.page) {
        lastSearchPage = data.page;
    }
    
    hideOtherModals(modal);
}

export function restoreLastActiveModal(): void {
    isModalOpen = true;
    
    const forceSearch = window.localStorage.getItem('forceSearchModal') === 'true';
    if (forceSearch) {
        window.localStorage.removeItem('forceSearchModal');
        showSearchModal();
        return;
    }
    
    switch (lastActiveModal) {
        case ActiveModal.LOGIN:
            showLoginModal();
            break;
        case ActiveModal.SEARCH:
            showSearchModal();
            break;
        case ActiveModal.SUBTITLE_VIEWER:
            showResultsModal(lastSearchPage, false);
            if (lastViewedSubtitleId) {
                showSubtitleViewer(lastViewedSubtitleId);
            }
            break;
        case ActiveModal.RESULTS:
            showResultsModal(lastSearchPage);
            break;
        case ActiveModal.SETTINGS:
            showSettingsModal();
            break;
        default:
            showSearchModal();
            break;
    }
}

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
