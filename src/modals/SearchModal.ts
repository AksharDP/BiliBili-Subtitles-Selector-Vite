import { createDiv } from '../ui/components';
import { handleSearchSubmit } from '../ui/handlers';
import searchModalTemplate from '../templates/searchModal.html?raw';

// Language codes and names for the language selector
const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ko', name: 'Korean' },
    // Add more languages as needed
];

export function createSearchModal(): void {
    const searchOverlay = createDiv("opensubtitles-search-overlay", "", `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5); z-index: 10000; display: none;
        justify-content: center; align-items: center;
    `);

    const searchModal = createDiv("opensubtitles-search-modal", "", `
        background-color: white; padding: 0; border-radius: 6px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); width: 500px; max-width: 90%;
        max-height: 80vh; display: flex; flex-direction: column; overflow: hidden;
    `);

    searchModal.innerHTML = searchModalTemplate;
    searchOverlay.appendChild(searchModal);
    document.body.appendChild(searchOverlay);

    // Set up event listeners
    setupEventListeners();
}

function setupEventListeners(): void {
    // Form submission
    document.getElementById("opensubtitles-search-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        handleSearchSubmit(e);
    });
    
    // Cancel button
    document.getElementById("os-search-cancel-btn")?.addEventListener("click", hideSearchModal);
    
    // Settings button
    document.getElementById("os-settings-btn")?.addEventListener("click", () => {
        // Import dynamically to avoid circular dependencies
        import('./SettingsModal').then(({ showSettingsModal }) => {
            showSettingsModal();
        });
    });
    
    // Search button
    document.getElementById("os-search-submit-btn")?.addEventListener("click", () => {
        const form = document.getElementById("opensubtitles-search-form") as HTMLFormElement;
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    
    // Set up language selector
    setupLanguageSelector();
}

function setupLanguageSelector(): void {
    const languagesSearch = document.getElementById("os-languages-search");
    const languagesDropdown = document.getElementById("os-languages-dropdown");
    const selectedLanguages = document.getElementById("os-selected-languages");
    const languagesInput = document.getElementById("os-languages") as HTMLInputElement;
    
    if (languagesSearch && languagesDropdown && selectedLanguages && languagesInput) {
        // Set default selected language (English)
        addLanguageTag('en', 'English', selectedLanguages, languagesInput);
        
        // Show dropdown when clicking on the search input
        languagesSearch.addEventListener("focus", () => {
            populateLanguagesDropdown(languagesDropdown, selectedLanguages, languagesInput);
            languagesDropdown.style.display = "block";
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (e.target !== languagesSearch && e.target !== languagesDropdown) {
                languagesDropdown.style.display = "none";
            }
        });
        
        // Filter languages when typing in search
        languagesSearch.addEventListener("input", () => {
            const searchText = (languagesSearch as HTMLInputElement).value.toLowerCase();
            populateLanguagesDropdown(languagesDropdown, selectedLanguages, languagesInput, searchText);
        });
    }
}

function populateLanguagesDropdown(
    dropdown: HTMLElement, 
    selectedContainer: HTMLElement, 
    input: HTMLInputElement, 
    searchText: string = ""
): void {
    // Clear previous options
    dropdown.innerHTML = "";
    
    // Get currently selected language codes
    const selectedCodes = input.value.split(',').filter(code => code.trim() !== '');
    
    // Filter languages based on search text
    const filteredLanguages = languages.filter(lang => 
        lang.name.toLowerCase().includes(searchText) && !selectedCodes.includes(lang.code)
    );
    
    // Create dropdown items
    filteredLanguages.forEach(lang => {
        const item = document.createElement("div");
        item.style.cssText = "padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 14px;";
        item.textContent = lang.name;
        
        item.addEventListener("click", () => {
            addLanguageTag(lang.code, lang.name, selectedContainer, input);
            dropdown.style.display = "none";
            (document.getElementById("os-languages-search") as HTMLInputElement).value = "";
        });
        
        // Highlight on hover
        item.addEventListener("mouseenter", () => {
            item.style.backgroundColor = "#f5f5f5";
        });
        
        item.addEventListener("mouseleave", () => {
            item.style.backgroundColor = "transparent";
        });
        
        dropdown.appendChild(item);
    });
    
    if (filteredLanguages.length === 0) {
        const noResults = document.createElement("div");
        noResults.style.cssText = "padding: 8px 12px; color: #999; font-size: 14px;";
        noResults.textContent = "No matching languages found";
        dropdown.appendChild(noResults);
    }
}

function addLanguageTag(
    code: string, 
    name: string, 
    container: HTMLElement, 
    input: HTMLInputElement
): void {
    // Create language tag
    const tag = document.createElement("div");
    tag.style.cssText = "background-color: #e0f7fa; color: #00838f; padding: 4px 8px; border-radius: 4px; font-size: 12px; display: flex; align-items: center;";
    
    tag.innerHTML = `
        <span>${name}</span>
        <span style="margin-left: 6px; cursor: pointer; font-weight: bold;" data-code="${code}">×</span>
    `;
    
    // Handle removal
    tag.querySelector('span[data-code]')?.addEventListener("click", () => {
        removeLanguageTag(code, container, input);
    });
    
    container.appendChild(tag);
    
    // Update hidden input
    const currentCodes = input.value.split(',').filter(c => c.trim() !== '');
    if (!currentCodes.includes(code)) {
        currentCodes.push(code);
        input.value = currentCodes.join(',');
    }
}

function removeLanguageTag(
    code: string, 
    container: HTMLElement, 
    input: HTMLInputElement
): void {
    // Remove tag from UI
    const tags = container.querySelectorAll('span[data-code]');
    tags.forEach(tag => {
        if (tag.getAttribute('data-code') === code) {
            tag.parentElement?.remove();
        }
    });
    
    // Update hidden input
    const currentCodes = input.value.split(',').filter(c => c.trim() !== '');
    input.value = currentCodes.filter(c => c !== code).join(',');
    
    // If no languages are selected, default to English
    if (input.value === '') {
        addLanguageTag('en', 'English', container, input);
    }
}

export function showSearchModal(): void {
    const overlay = document.getElementById("opensubtitles-search-overlay");
    if (overlay) overlay.style.display = "flex";
    
    // Focus on the search input
    setTimeout(() => {
        const searchInput = document.getElementById("os-query") as HTMLInputElement;
        if (searchInput) searchInput.focus();
    }, 100);
}

export function hideSearchModal(): void {
    const overlay = document.getElementById("opensubtitles-search-overlay");
    if (overlay) overlay.style.display = "none";
}

// Helper function to collect all search form data
export function getSearchFormData(): Record<string, string> {
    const form = document.getElementById("opensubtitles-search-form") as HTMLFormElement;
    if (!form) return {};
    
    const formData = new FormData(form);
    const data: Record<string, string> = {};
    
    formData.forEach((value, key) => {
        data[key] = value.toString();
    });
    
    return data;
}

// Function to update the search status message
export function updateSearchStatus(message: string, isLoading: boolean = true): void {
    const statusElement = document.getElementById("os-search-status");
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.display = message ? "block" : "none";
        
        // Add loading indicator if needed
        if (isLoading && message) {
            statusElement.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center;">
                    <div style="width: 16px; height: 16px; border: 2px solid #3498db; border-radius: 50%; border-top-color: transparent; margin-right: 10px; animation: os-spin 1s linear infinite;"></div>
                    <span>${message}</span>
                </div>
                <style>
                    @keyframes os-spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
    }
}

// Function to reset the search form
export function resetSearchForm(): void {
    const form = document.getElementById("opensubtitles-search-form") as HTMLFormElement;
    if (form) form.reset();
    
    // Reset selected languages to English
    const selectedLanguages = document.getElementById("os-selected-languages");
    const languagesInput = document.getElementById("os-languages") as HTMLInputElement;
    
    if (selectedLanguages && languagesInput) {
        selectedLanguages.innerHTML = "";
        languagesInput.value = "en";
        addLanguageTag('en', 'English', selectedLanguages, languagesInput);
    }
}