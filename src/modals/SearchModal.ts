import { createDiv } from '../ui/components';
import { showSettingsModal } from './SettingsModal';
import { getLanguages, searchSubtitles } from '../api/openSubtitles';
import searchModalTemplate from '../templates/searchModal.html?raw';
import { updatePaginationState, updateResults, showResultsModal, setSearchParams } from './ResultsModal';
import { getToken } from '../db/indexedDB';
import { setActiveModal, ActiveModal } from './ModalManager.ts';
import {
    BLUE, WHITE,
    GREY
} from '../utils/constants';

export let searchOverlay: HTMLDivElement | null = null;
export let searchModal: HTMLDivElement | null = null;
let searchForm: HTMLFormElement | null = null;
let cancelBtn: HTMLButtonElement | null = null;
let settingsBtn: HTMLButtonElement | null = null;
let submitBtn: HTMLButtonElement | null = null;
let languagesSearchInput: HTMLInputElement | null = null;
let languagesDropdownContainer: HTMLElement | null = null;
let selectedLanguagesContainer: HTMLElement | null = null;
let hiddenLanguagesInput: HTMLInputElement | null = null;
let searchStatusElement: HTMLElement | null = null;


export function createSearchModal(): void {
    const overlayDiv = createDiv("opensubtitles-search-overlay", "", `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5); z-index: 10000; display: none;
        justify-content: center; align-items: center;
    `);

    const modalDiv = createDiv("opensubtitles-search-modal", "", `
        background-color: white; padding: 0; border-radius: 6px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); width: 500px; max-width: 90%;
        max-height: 80vh; display: flex; flex-direction: column; overflow: hidden;
    `);

    modalDiv.innerHTML = searchModalTemplate;
    overlayDiv.appendChild(modalDiv);
    document.body.appendChild(overlayDiv);

    searchOverlay = overlayDiv;
    searchModal = modalDiv;
    searchForm = searchModal.querySelector("#opensubtitles-search-form") as HTMLFormElement;
    cancelBtn = searchModal.querySelector("#os-search-cancel-btn") as HTMLButtonElement;
    settingsBtn = searchModal.querySelector("#os-settings-btn") as HTMLButtonElement;
    submitBtn = searchModal.querySelector("#os-search-submit-btn") as HTMLButtonElement;
    languagesSearchInput = searchModal.querySelector("#os-languages-search") as HTMLInputElement;
    languagesDropdownContainer = searchModal.querySelector("#os-languages-dropdown") as HTMLElement;
    selectedLanguagesContainer = searchModal.querySelector("#os-selected-languages") as HTMLElement;
    hiddenLanguagesInput = searchModal.querySelector("#os-languages") as HTMLInputElement;
    searchStatusElement = searchModal.querySelector("#os-search-status") as HTMLElement;

    setupEventListeners();
}

function setupEventListeners(): void {
    searchForm?.addEventListener("submit", (e: Event) => {
        e.preventDefault();
        handleSearchSubmit(e);
    });

    cancelBtn?.addEventListener("click", hideSearchModal);

    settingsBtn?.addEventListener("click", () => {
        showSettingsModal();
    });

    submitBtn?.addEventListener("click", () => {
        searchForm?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    if (searchModal) {
        const inputs = searchModal.querySelectorAll("input");
        inputs.forEach(input => {
            input.addEventListener("keydown", (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    submitBtn?.click();
                }
            });
        });
    }

    setupLanguageSelector();
}

async function fetchLanguages(): Promise<Array<{ code: string; name: string }>> {
    try {
        const result = await getLanguages();
        if (result && result.data && Array.isArray(result.data)) {
            return result.data.map((item: any) => ({
                code: item.language_code,
                name: item.language_name,
            }));
        }
    } catch (error) {
        console.error("Failed to fetch languages:", error);
    }
    return [{ code: 'en', name: 'English' }];
}

function setupLanguageSelector(): void {
    const searchInput = languagesSearchInput;
    const dropdown = languagesDropdownContainer;
    const selectedContainer = selectedLanguagesContainer;
    const hiddenInput = hiddenLanguagesInput;

    if (searchInput && dropdown && selectedContainer && hiddenInput) {
        addLanguageTag('en', 'English', selectedContainer, hiddenInput);

        searchInput.addEventListener("focus", async () => {
            if (dropdown.innerHTML === "") {
                 const langs = await fetchLanguages();
                 populateLanguagesDropdown(langs);
            }
            dropdown.style.display = "block";
        });

        document.addEventListener("click", (e) => {
            if (!searchInput.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
                dropdown.style.display = "none";
            }
        });

        searchInput.addEventListener("input", async () => {
            const searchText = searchInput.value.toLowerCase();
            const langs = await fetchLanguages();
            populateLanguagesDropdown(langs, searchText);
            dropdown.style.display = "block";
        });
    }
}

function populateLanguagesDropdown(
    languages: Array<{ code: string; name: string }>,
    searchText: string = ""
): void {
    const dropdown = languagesDropdownContainer;
    const selectedContainer = selectedLanguagesContainer;
    const input = hiddenLanguagesInput;

    if (!dropdown || !selectedContainer || !input) return;

    console.log("[Subtitles Selector] Populating languages dropdown");
    dropdown.innerHTML = "";

    const selectedCodes = input.value.split(',').filter(code => code.trim() !== '');

    const filteredLanguages = languages.filter(lang =>
        lang.name.toLowerCase().includes(searchText) && !selectedCodes.includes(lang.code)
    );

    filteredLanguages.forEach(lang => {
        const item = document.createElement("div");
        item.style.cssText = `padding: 8px 12px; cursor: pointer; border-bottom: 1px solid ${WHITE}; font-size: 14px;`;
        item.textContent = lang.name;

        item.addEventListener("click", () => {
            addLanguageTag(lang.code, lang.name, selectedContainer, input);
            dropdown.style.display = "none";
            if (languagesSearchInput) languagesSearchInput.value = "";
            populateLanguagesDropdown(languages);
        });

        item.addEventListener("mouseenter", () => { item.style.backgroundColor = WHITE; });
        item.addEventListener("mouseleave", () => { item.style.backgroundColor = "transparent"; });

        dropdown.appendChild(item);
    });

    if (filteredLanguages.length === 0) {
        const noResults = document.createElement("div");
        noResults.style.cssText = `padding: 8px 12px; color: ${GREY}; font-size: 14px;`;
        noResults.textContent = searchText ? "No matching languages found" : "All languages selected";
        dropdown.appendChild(noResults);
    }
}

function addLanguageTag(
    code: string,
    name: string,
    container: HTMLElement,
    input: HTMLInputElement
): void {
    const currentCodes = input.value.split(',').filter(c => c.trim() !== '');
    if (currentCodes.includes(code)) return;

    const tag = document.createElement("div");
    tag.style.cssText = `background-color: ${BLUE}; color: ${BLUE}; padding: 4px 8px; border-radius: 4px; font-size: 12px; display: flex; align-items: center; margin: 2px;`;
    tag.dataset.code = code;

    tag.innerHTML = `
        <span>${name}</span>
        <span style="margin-left: 6px; cursor: pointer; font-weight: bold;" class="remove-lang">×</span>
    `;

    tag.innerHTML = `
        <span>${name}</span>
        <span style="margin-left: 6px; cursor: pointer; font-weight: bold;" class="remove-lang">×</span>
    `;

    tag.querySelector('.remove-lang')?.addEventListener("click", () => {
        removeLanguageTag(code, container, input);
    });

    container.appendChild(tag);

    currentCodes.push(code);
    input.value = currentCodes.join(',');
}

function removeLanguageTag(
    code: string,
    container: HTMLElement,
    input: HTMLInputElement
): void {
    const tagToRemove = container.querySelector(`div[data-code="${code}"]`);
    tagToRemove?.remove();

    const currentCodes = input.value.split(',').filter(c => c.trim() !== '');
    input.value = currentCodes.filter(c => c !== code).join(',');

    if (input.value === '') {
        addLanguageTag('en', 'English', container, input);
    }

    fetchLanguages().then(langs => populateLanguagesDropdown(langs, languagesSearchInput?.value.toLowerCase() || ''));
}

export function showSearchModal(): void {
    if (searchOverlay) searchOverlay.style.display = "flex";
    setActiveModal(ActiveModal.SEARCH);
}

export function hideSearchModal(): void {
    if (searchOverlay) searchOverlay.style.display = "none";
    if (languagesDropdownContainer) languagesDropdownContainer.style.display = 'none';
    // setActiveModal(ActiveModal.SEARCH);
}

export function getSearchFormData(): Record<string, string> {
    if (!searchForm) return {};
    const formData = new FormData(searchForm);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
        data[key] = value.toString();
    });
    return data;
}

export function updateSearchStatus(message: string, isLoading: boolean = false): void {
    const statusEl = searchStatusElement;
    if (statusEl) {
        statusEl.style.display = message ? "block" : "none";
        if (isLoading) {
            statusEl.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center;">
                    <div style="width: 16px; height: 16px; border: 2px solid ${BLUE}; border-radius: 50%; border-top-color: transparent; margin-right: 10px; animation: os-spin 1s linear infinite;"></div>
                    <span>${message}</span>
                </div>
                <style>
                    @keyframes os-spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        } else {
            statusEl.textContent = message;
        }
    }
}

export async function handleSearchSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const formData = getSearchFormData();

    try {
        updateSearchStatus("Searching for subtitles...", true);

        const tokenData = await getToken();
        if (!tokenData || !tokenData.token) {
            updateSearchStatus("Authentication required. Please log in.", false);
            return;
        }

        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(formData)) {
            if (!value || value.trim() === '') continue;
            if (isDefaultValue(key, value)) continue;

            let processedValue = value.trim();
            if (key === 'imdb_id' && processedValue.startsWith('tt')) {
                processedValue = processedValue.substring(2);
            } else if (key.includes('_id') && /^[0-9]+$/.test(processedValue)) {
                processedValue = parseInt(processedValue, 10).toString();
            }
            params.append(key, processedValue);
        }

        console.log("Search parameters:", Object.fromEntries(params.entries()));

        try {
            const data = await searchSubtitles(tokenData, params);

            if (!data || !data.data || data.data.length === 0) {
                updateSearchStatus(`No results found.`, false);
                setSearchParams(formData.query || 'Search', params.toString());
                updatePaginationState({ total_pages: 0, total_count: 0 }, 1);
                updateResults([]);
                showResultsModal();
                return;
            }

            setSearchParams(formData.query || 'Search Results', params.toString());
            updatePaginationState(data, 1);
            updateResults(data.data || []);
            showResultsModal();
            hideSearchModal();
            updateSearchStatus("", false);

        } catch (error: any) {
            console.error("API Search Error:", error);
            updateSearchStatus(`Error: ${error.message || 'Failed to search subtitles'}`, false);
        }
    } catch (error) {
        console.error("Search handling error:", error);
        updateSearchStatus("An unexpected error occurred. Please try again.", false);
    }
}

function isDefaultValue(key: string, value: string): boolean {
    const defaultValues: Record<string, string> = {
        'ai_translated': 'include',
        'foreign_parts_only': 'include',
        'hearing_impaired': 'include',
        'machine_translated': 'exclude',
        'moviehash_match': 'include',
        'trusted_sources': 'include',
        'type': 'all',
        'order_by': 'download_count',
        'order_direction': 'desc'
    };
    const normalizedValue = value.trim().toLowerCase();
    const defaultValue = defaultValues[key];
    return defaultValue !== undefined && defaultValue === normalizedValue;
}