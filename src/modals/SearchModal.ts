import { createDiv } from '../ui/components';
import { showSettingsModal } from './SettingsModal';
import { getLanguages, searchSubtitles } from '../api/openSubtitles';
import searchModalTemplate from '../templates/searchModal.html?raw';
import { updatePaginationState, updateResults, showResultsModal, setSearchParams } from './ResultsModal';
import { getToken } from '../db/indexedDB';
import { setActiveModal, ActiveModal } from './ModalManager.ts';


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
    // Form submission - attach listener to the search form
    const searchForm = document.getElementById("opensubtitles-search-form");
    if (searchForm) {
        searchForm.addEventListener("submit", (e: Event) => {
            e.preventDefault();
            handleSearchSubmit(e);
        });
    }
    
    // Cancel button
    document.getElementById("os-search-cancel-btn")?.addEventListener("click", hideSearchModal);
    
    // Settings button - dynamically import / call showSettingsModal to avoid circular dependencies
    document.getElementById("os-settings-btn")?.addEventListener("click", () => {
        showSettingsModal();
    });
    
    // Search button - dispatch submit event on form when clicked
    document.getElementById("os-search-submit-btn")?.addEventListener("click", () => {
        const form = document.getElementById("opensubtitles-search-form") as HTMLFormElement;
        if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    });

    // Now add a keydown listener to every input in the search modal
    const searchModal = document.getElementById("opensubtitles-search-modal");
    if (searchModal) {
        const inputs = searchModal.querySelectorAll("input");
        inputs.forEach(input => {
            input.addEventListener("keydown", (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    // Simulate clicking the search button
                    document.getElementById("os-search-submit-btn")?.click();
                }
            });
        });
    }

    // Set up language selector event listeners
    setupLanguageSelector();
}

async function fetchLanguages(): Promise<Array<{ code: string; name: string }>> {
    const result = await getLanguages();
    if (result && result.data && Array.isArray(result.data)) {
        return result.data.map((item: any) => ({
            code: item.language_code,
            name: item.language_name,
        }));
    }
    // Fallback to English if API call fails
    return [{ code: 'en', name: 'English' }];
}

function setupLanguageSelector(): void {
    const languagesSearch = document.getElementById("os-languages-search");
    const languagesDropdown = document.getElementById("os-languages-dropdown");
    const selectedLanguages = document.getElementById("os-selected-languages");
    const languagesInput = document.getElementById("os-languages") as HTMLInputElement;
    
    if (languagesSearch && languagesDropdown && selectedLanguages && languagesInput) {
        // Set default selected language (English)
        addLanguageTag('en', 'English', selectedLanguages, languagesInput);
        
        // When focused, load the languages dynamically
        languagesSearch.addEventListener("focus", async () => {
            const langs = await fetchLanguages();
            populateLanguagesDropdown(languagesDropdown, selectedLanguages, languagesInput, "", langs);
            languagesDropdown.style.display = "block";
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (e.target !== languagesSearch && e.target !== languagesDropdown) {
                languagesDropdown.style.display = "none";
            }
        });
        
        // Filter languages when typing in search
        languagesSearch.addEventListener("input", async () => {
            const searchText = (languagesSearch as HTMLInputElement).value.toLowerCase();
            const langs = await fetchLanguages();
            populateLanguagesDropdown(languagesDropdown, selectedLanguages, languagesInput, searchText, langs);
        });
    }
}

function populateLanguagesDropdown(
    dropdown: HTMLElement, 
    selectedContainer: HTMLElement, 
    input: HTMLInputElement, 
    searchText: string = "",
    languages: Array<{ code: string; name: string }> = []
): void {
    console.log("[Subtitles Selector] Populating languages dropdown");
    // Clear previous options
    dropdown.innerHTML = "";
    
    // Get currently selected language codes
    const selectedCodes = input.value.split(',').filter(code => code.trim() !== '');
    
    // Filter languages based on search text and exclude already selected languages
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
    
    // Update the active modal state
    setActiveModal(ActiveModal.SEARCH);
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

export async function handleSearchSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const formData = getSearchFormData();
    
    try {
        updateSearchStatus("Searching for subtitles...", true);
        
        // Get the authentication token
        const tokenData = await getToken();
        if (!tokenData || !tokenData.token) {
            updateSearchStatus("Authentication required. Please log in.", false);
            return;
        }
        
        // Build search parameters
        const params = new URLSearchParams();
        
        // Process form data according to API optimization guidelines
        for (const [key, value] of Object.entries(formData)) {
            // Skip empty values
            if (!value || value.trim() === '') continue;
            
            // Skip default values
            if (isDefaultValue(key, value)) continue;
            
            let processedValue = value.trim();
            
            // Process specific fields according to API guidelines
            if (key === 'imdb_id' && processedValue.startsWith('tt')) {
                // Remove 'tt' prefix from IMDB IDs
                processedValue = processedValue.substring(2);
            } else if (key.includes('_id') && /^0+\d+$/.test(processedValue)) {
                // Remove leading zeros from IDs
                processedValue = processedValue.replace(/^0+/, '');
            }
            
            // Convert value to lowercase (except for languages which are case-sensitive codes)
            if (key !== 'languages') {
                processedValue = processedValue.toLowerCase();
            }
            
            // Add to parameters
            params.append(key, processedValue);
        }
        
        // Debugging output
        console.log("Search parameters:", Object.fromEntries(params.entries()));
        
        // Use the centralized API function
        try {
            const data = await searchSubtitles(tokenData, params);
            
            // First set search parameters
            setSearchParams(formData.query || 'All', params.toString());
            
            // Then update pagination state from API response
            updatePaginationState(data, 1);
            
            // Finally update results array (this now preserves pagination)
            updateResults(data.data || []);
            
            // Show the results modal
            showResultsModal();
            updateSearchStatus("", false);
        } catch (error: any) {
            updateSearchStatus(`Error: ${error.message || 'Failed to search subtitles'}`, false);
        }
    } catch (error) {
        console.error("Search error:", error);
        updateSearchStatus("Error connecting to OpenSubtitles API. Please try again.", false);
    }
}

// Helper function to check if a value is a default that should be omitted
function isDefaultValue(key: string, value: string): boolean {
    const defaultValues: Record<string, string> = {
        'ai_translated': 'include',
        'foreign_parts_only': 'include',
        'hearing_impaired': 'include',
        'machine_translated': 'exclude',
        'moviehash_match': 'include',
        'trusted_sources': 'include',
        'type': 'all',
        'order_direction': 'desc'
    };
    
    return defaultValues[key] === value;
}