import {createDiv} from '../ui/components';
import {
    getTokenDataFromDB,
    getUserInfoFromDB,
    loadSettingsFromIndexedDB,
    saveSettingsToIndexedDB,
    saveUserInfoToDB
} from '../db/indexedDB';
import {getUserInfo} from '../api/openSubtitles';
import {ActiveModal, setActiveModal} from './ModalManager'
import {showSearchModal} from './SearchModal'
import settingsModalTemplate from '../templates/settingsModal.html?raw';

export let settingsOverlay: HTMLDivElement | null = null;
export let settingsModal: HTMLDivElement | null = null;
let notificationPopup: HTMLElement | null = null;

let closeBtn: HTMLButtonElement | null = null;
let backBtn: HTMLButtonElement | null = null;

let userInfoContainer: HTMLElement | null = null;
let refreshUserInfoBtn: HTMLButtonElement | null = null;

let fontSizeDecreaseBtn: HTMLButtonElement | null = null;
let fontSizeIncreaseBtn: HTMLButtonElement | null = null;
let fontSizeValue: HTMLElement | null = null;
let fontColorBtns: NodeListOf<HTMLElement> | null = null;
let customFontColorPicker: HTMLInputElement | null = null;
let hexFontColorInput: HTMLInputElement | null = null;
let customFontColorContainer: HTMLElement | null = null;

let bgToggle: HTMLInputElement | null = null;
let bgToggleSpan: HTMLElement | null = null;
let bgOptionsContainer: HTMLElement | null = null;
let bgColorBtns: NodeListOf<HTMLElement> | null = null;
let customBgColorPicker: HTMLInputElement | null = null;
let customBgColorContainer: HTMLElement | null = null;
let hexBgColorInput: HTMLInputElement | null = null;
let bgOpacitySlider: HTMLInputElement | null = null;
let bgOpacityValue: HTMLElement | null = null;

let outlineToggle: HTMLInputElement | null = null;
let outlineToggleSpan: HTMLElement | null = null;
let outlineOptionsContainer: HTMLElement | null = null;
let outlineColorBtns: NodeListOf<HTMLElement> | null = null;
let customOutlineColorPicker: HTMLInputElement | null = null;
let customOutlineColorContainer: HTMLElement | null = null;
let hexOutlineColorInput: HTMLInputElement | null = null;

let syncSlider: HTMLInputElement | null = null;
let syncValueInput: HTMLInputElement | null = null;
let syncResetBtn: HTMLButtonElement | null = null;

let animationToggle: HTMLInputElement | null = null;
let animationToggleSpan: HTMLElement | null = null;
let animationOptionsContainer: HTMLElement | null = null;
let animationTypeSelect: HTMLSelectElement | null = null;
let animationDurationSlider: HTMLInputElement | null = null;
let animationDurationValue: HTMLElement | null = null;

let saveBtn: HTMLButtonElement | null = null;


let currentFontColor = "#FFFFFF";
let currentOutlineColor = "#000000";
let currentBgColor = "#000000";


export function createSettingsModal(): void {
    const settingsOverlayDiv = createDiv("opensubtitles-settings-overlay", "", `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5); z-index: 10001; display: none;
        justify-content: center; align-items: center;
    `);

    const settingsModalDiv = createDiv("opensubtitles-settings-modal", "", `
        background-color: white; padding: 0; border-radius: 6px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); width: 500px; max-width: 90%;
        max-height: 80vh; display: flex; flex-direction: column; overflow: hidden;
    `);

    settingsModalDiv.innerHTML = settingsModalTemplate;

    const notificationPopupDiv = createDiv("os-settings-notification", "Settings saved successfully!", `
        position: fixed; top: 20px; right: 20px; background-color: #2ecc71;
        color: white; padding: 12px 20px; border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2); font-family: Arial, sans-serif;
        font-size: 14px; z-index: 10002; opacity: 0; transform: translateY(-20px);
        transition: all 0.3s ease; pointer-events: none;
    `);
    document.body.appendChild(notificationPopupDiv);

    settingsOverlayDiv.appendChild(settingsModalDiv);
    document.body.appendChild(settingsOverlayDiv);

    settingsOverlay = settingsOverlayDiv;
    settingsModal = settingsModalDiv;
    notificationPopup = notificationPopupDiv;

    closeBtn = settingsModal.querySelector("#os-settings-close-btn") as HTMLButtonElement;
    backBtn = settingsModal.querySelector("#os-settings-back-btn") as HTMLButtonElement;

    userInfoContainer = settingsModal.querySelector("#os-user-info") as HTMLElement;
    refreshUserInfoBtn = settingsModal.querySelector("#os-refresh-user-info") as HTMLButtonElement;

    fontSizeDecreaseBtn = settingsModal.querySelector("#os-font-size-decrease") as HTMLButtonElement;
    fontSizeIncreaseBtn = settingsModal.querySelector("#os-font-size-increase") as HTMLButtonElement;
    fontSizeValue = settingsModal.querySelector("#os-font-size-value") as HTMLElement;
    fontColorBtns = settingsModal.querySelectorAll(".os-font-color-btn") as NodeListOf<HTMLElement>;
    customFontColorPicker = settingsModal.querySelector("#os-custom-font-color") as HTMLInputElement;
    hexFontColorInput = settingsModal.querySelector("#os-hex-color-input") as HTMLInputElement;
    customFontColorContainer = settingsModal.querySelector("#os-custom-color-container") as HTMLElement;

    bgToggle = settingsModal.querySelector("#os-bg-toggle") as HTMLInputElement;
    bgToggleSpan = bgToggle?.nextElementSibling as HTMLElement | null;
    bgOptionsContainer = settingsModal.querySelector("#os-bg-options") as HTMLElement;
    bgColorBtns = settingsModal.querySelectorAll(".os-bg-color-btn") as NodeListOf<HTMLElement>;
    customBgColorPicker = settingsModal.querySelector("#os-custom-bg-color") as HTMLInputElement;
    customBgColorContainer = settingsModal.querySelector("#os-bg-color-container") as HTMLElement;
    hexBgColorInput = settingsModal.querySelector("#os-bg-hex-color-input") as HTMLInputElement;
    bgOpacitySlider = settingsModal.querySelector("#os-bg-opacity") as HTMLInputElement;
    bgOpacityValue = settingsModal.querySelector("#os-bg-opacity-value") as HTMLElement;

    outlineToggle = settingsModal.querySelector("#os-outline-toggle") as HTMLInputElement;
    outlineToggleSpan = outlineToggle?.nextElementSibling as HTMLElement | null;
    outlineOptionsContainer = settingsModal.querySelector("#os-outline-options") as HTMLElement;
    outlineColorBtns = settingsModal.querySelectorAll(".os-outline-color-btn") as NodeListOf<HTMLElement>;
    customOutlineColorPicker = settingsModal.querySelector("#os-custom-outline-color") as HTMLInputElement;
    customOutlineColorContainer = settingsModal.querySelector("#os-outline-color-container") as HTMLElement;
    hexOutlineColorInput = settingsModal.querySelector("#os-outline-hex-color-input") as HTMLInputElement;

    syncSlider = settingsModal.querySelector("#os-sync-slider") as HTMLInputElement;
    syncValueInput = settingsModal.querySelector("#os-sync-value") as HTMLInputElement;
    syncResetBtn = settingsModal.querySelector("#os-sync-reset") as HTMLButtonElement;

    animationToggle = settingsModal.querySelector("#os-animation-toggle") as HTMLInputElement;
    animationToggleSpan = animationToggle?.nextElementSibling as HTMLElement | null;
    animationOptionsContainer = settingsModal.querySelector("#os-animation-options") as HTMLElement;
    animationTypeSelect = settingsModal.querySelector("#os-animation-type") as HTMLSelectElement;
    animationDurationSlider = settingsModal.querySelector("#os-animation-duration") as HTMLInputElement;
    animationDurationValue = settingsModal.querySelector("#os-animation-duration-value") as HTMLElement;

    saveBtn = settingsModal.querySelector("#os-settings-save-btn") as HTMLButtonElement;

    setupSettingsEventListeners();
}


function setupSettingsEventListeners(): void {
    closeBtn?.addEventListener("click", hideSettingsModal);
    backBtn?.addEventListener("click", backSettingsModal);

    fontSizeDecreaseBtn?.addEventListener("click", () => updateFontSize(-1));
    fontSizeIncreaseBtn?.addEventListener("click", () => updateFontSize(1));

    fontColorBtns?.forEach(btn => {
        btn.addEventListener("click", e => {
            const target = e.target as HTMLElement;
            if (target.dataset.color) {
                setFontColor(target.dataset.color);
                highlightSelectedFontColor(target.dataset.color);
            }
        });
    });

    customFontColorPicker?.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        setFontColor(target.value);
        clearFontColorSelection();
        if (hexFontColorInput) hexFontColorInput.value = target.value.replace('#', '');
        if (customFontColorContainer) customFontColorContainer.style.border = "2px solid #00a1d6";
    });

    hexFontColorInput?.addEventListener("input", e => handleHexColorInput(e, 'font'));

    bgToggle?.addEventListener("change", handleBgToggle);

    bgColorBtns?.forEach(btn => {
        btn.addEventListener("click", e => {
            const target = e.target as HTMLElement;
            if (target.dataset.color) {
                setBgColor(target.dataset.color);
                highlightSelectedBgColor(target.dataset.color);
                if (hexBgColorInput) hexBgColorInput.value = target.dataset.color.replace('#', '');
            }
        });
    });

    customBgColorPicker?.addEventListener("input", handleBgColorPicker);
    hexBgColorInput?.addEventListener("input", e => handleHexColorInput(e, 'bg'));

    bgOpacitySlider?.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        if (bgOpacityValue) bgOpacityValue.textContent = value;
        saveSettingsDebounced();
    });

    outlineToggle?.addEventListener("change", handleOutlineToggle);

    outlineColorBtns?.forEach(btn => {
        btn.addEventListener("click", e => {
            const target = e.target as HTMLElement;
            if (target.dataset.color) {
                setOutlineColor(target.dataset.color);
                highlightSelectedOutlineColor(target.dataset.color);
                if (hexOutlineColorInput) hexOutlineColorInput.value = target.dataset.color.replace('#', '');
            }
        });
    });

    customOutlineColorPicker?.addEventListener("input", handleOutlineColorPickerInput);
    hexOutlineColorInput?.addEventListener("input", e => handleHexColorInput(e, 'outline'));

    syncSlider?.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        if (syncValueInput) syncValueInput.value = target.value;
        saveSettingsDebounced();
    });

    syncValueInput?.addEventListener("input", handleSyncValueInput);
    syncResetBtn?.addEventListener("click", resetSyncSettings);

    animationToggle?.addEventListener("change", handleAnimationToggle);
    animationTypeSelect?.addEventListener("change", saveSettingsDebounced);
    animationDurationSlider?.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        if (animationDurationValue) animationDurationValue.textContent = `${target.value}s`;
        saveSettingsDebounced();
    });

    refreshUserInfoBtn?.addEventListener("click", () => refreshUserInfo(true));

    saveBtn?.addEventListener("click", saveAllSettings);
}


function formatUTCtoLocalTime(utcTimeString: string): string {
    if (!utcTimeString) return "Unknown";

    try {
        const date = new Date(utcTimeString);
        if (isNaN(date.getTime())) return "Invalid date";

        return date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return "Error formatting date";
    }
}

async function refreshUserInfo(showRefreshedIndicator: boolean): Promise<void> {
    const btn = refreshUserInfoBtn;
    if (btn && showRefreshedIndicator) {
        btn.textContent = "Refreshing...";
        btn.disabled = true;
        btn.style.backgroundColor = "#f0f0f0";
        btn.style.color = "#999";
    }

    try {
        const tokenData = await getTokenDataFromDB();
        if (!tokenData?.token) {
            console.error("No token found in database");
            return;
        }
        const userData = await getUserInfo(tokenData);
        if (userData) {
            await saveUserInfoToDB(userData);
            updateUserInfoUI(userData);

            if (btn && showRefreshedIndicator) {
                btn.textContent = "Updated!";
                btn.style.backgroundColor = "#e8f5e9";
                btn.style.color = "#2e7d32";
                btn.style.borderColor = "#c8e6c9";
                btn.disabled = false;
            }
        } else {
            if (btn) {
                btn.textContent = "Failed to Update";
                btn.style.backgroundColor = "#ffebee";
                btn.style.color = "#c62828";
                btn.style.borderColor = "#ef9a9a";
                btn.disabled = false;
            }
        }
    } catch (error) {
        console.error("Error refreshing user info:", error);

        if (btn) {
            btn.textContent = "Error";
            btn.style.backgroundColor = "#ffebee";
            btn.style.color = "#c62828";
            btn.style.borderColor = "#ef9a9a";
            btn.disabled = false;
        }
    } finally {
        setTimeout(() => {
            if (btn) {
                btn.textContent = "Refresh Information";
                btn.style.backgroundColor = "#f0f0f0";
                btn.style.color = "#666";
                btn.style.borderColor = "#ddd";
                btn.disabled = false;
            }
        }, 2000);
    }
}

function updateUserInfoUI(userData: any) {
    const container = userInfoContainer;
    if (!userData || !userData.data) {
        if (container) {
            container.innerHTML = `
                <div style="color: #e74c3c; font-size: 14px; text-align: center;">
                    No user information found.<br>
                    Please try refreshing.
                </div>
            `;
        }
        return;
    }

    if (container) {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px; font-family: Arial, sans-serif; font-size: 14px;">
                <div><strong>Status:</strong></div>
                <div>
                    ${userData.data.level || "Unknown"}
                    ${
            userData.data.vip
                ? '<span id="os-user-vip-badge" style="background-color: #ffc107; color: #000; font-size: 11px; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">VIP</span>'
                : ""
        }
                </div>

                <div><strong>Downloads:</strong></div>
                <div>${userData.data.downloads_count || "0"} / ${
            userData.data.allowed_downloads || "0"
        } (${userData.data.remaining_downloads || "0"} remaining)</div>

                <div><strong>Reset Time:</strong></div>
                <div>${
            userData.data && userData.data.reset_time_utc
                ? formatUTCtoLocalTime(userData.data.reset_time_utc)
                : "Unknown. Download to show."
        }</div>

                <div><strong>Last Update:</strong></div>
                <div>${userData.timestamp ? new Date(userData.timestamp).toLocaleString() : "Never"}</div>
            </div>
        `;
    }
}

function handleBgToggle(e: Event): void {
    const target = e.target as HTMLInputElement;
    const isChecked = target.checked;
    updateBgOptionsVisibility(isChecked);

    const toggleSpan = bgToggleSpan;
    if (toggleSpan) {
        toggleSpan.style.backgroundColor = isChecked ? "#00a1d6" : "#ccc";
        const toggleDot = toggleSpan.querySelector("span") as HTMLElement;
        if (toggleDot) {
            toggleDot.style.transform = isChecked ? "translateX(26px)" : "";
        }
    }

    saveSettingsDebounced();
}

function handleBgColorPicker(e: Event): void {
    const target = e.target as HTMLInputElement;
    setBgColor(target.value);
    clearBgColorSelection();
    if (hexBgColorInput) hexBgColorInput.value = target.value.replace('#', '');
    if (customBgColorContainer) customBgColorContainer.style.border = "2px solid #00a1d6";
    saveSettingsDebounced();
}

function handleOutlineToggle(e: Event): void {
    const target = e.target as HTMLInputElement;
    const isChecked = target.checked;
    updateOutlineOptionsVisibility(isChecked);

    const toggleSpan = outlineToggleSpan;
    if (toggleSpan) {
        toggleSpan.style.backgroundColor = isChecked ? "#00a1d6" : "#ccc";
        const toggleDot = toggleSpan.querySelector("span") as HTMLElement;
        if (toggleDot) {
            toggleDot.style.transform = isChecked ? "translateX(26px)" : "";
        }
    }

    saveSettingsDebounced();
}

function handleAnimationToggle(e: Event): void {
    const target = e.target as HTMLInputElement;
    const isChecked = target.checked;
    updateAnimationOptionsVisibility(isChecked);

    const toggleSpan = animationToggleSpan;
    if (toggleSpan) {
        toggleSpan.style.backgroundColor = isChecked ? "#00a1d6" : "#ccc";
        const toggleDot = toggleSpan.querySelector("span") as HTMLElement;
        if (toggleDot) {
            toggleDot.style.transform = isChecked ? "translateX(26px)" : "";
        }
    }

    saveSettingsDebounced();
}

function handleHexColorInput(e: Event, colorType: 'font' | 'bg' | 'outline'): void {
    const target = e.target as HTMLInputElement;
    let color = target.value;
    if (!color.startsWith('#')) color = '#' + color;

    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
        switch (colorType) {
            case 'font':
                setFontColor(color);
                clearFontColorSelection();
                if (customFontColorPicker) customFontColorPicker.value = color;
                if (hexFontColorInput) hexFontColorInput.value = color.replace('#', '');
                if (customFontColorContainer) customFontColorContainer.style.border = "2px solid #00a1d6";
                break;
            case 'bg':
                setBgColor(color);
                clearBgColorSelection();
                if (customBgColorPicker) customBgColorPicker.value = color;
                if (hexBgColorInput) hexBgColorInput.value = color.replace('#', '');
                if (customBgColorContainer) customBgColorContainer.style.border = "2px solid #00a1d6";
                break;
            case 'outline':
                setOutlineColor(color);
                clearOutlineColorSelection();
                 if (customOutlineColorPicker) customOutlineColorPicker.value = color;
                if (hexOutlineColorInput) hexOutlineColorInput.value = color.replace('#', '');
                if (customOutlineColorContainer) customOutlineColorContainer.style.border = "2px solid #00a1d6";
                break;
        }
        saveSettingsDebounced();
    }
}

function handleOutlineColorPickerInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    setOutlineColor(target.value);
    clearOutlineColorSelection();
    if (hexOutlineColorInput) hexOutlineColorInput.value = target.value.replace('#', '');
    if (customOutlineColorContainer) customOutlineColorContainer.style.border = "2px solid #00a1d6";
    saveSettingsDebounced();
}

function handleSyncValueInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (syncSlider) syncSlider.value = target.value;
    saveSettingsDebounced();
}

function resetSyncSettings(): void {
    if (syncSlider) syncSlider.value = "0";
    if (syncValueInput) syncValueInput.value = "0";
    saveSettingsDebounced();
}

function setFontColor(color: string): void {
    currentFontColor = color;
    saveSettingsDebounced();
}

function highlightSelectedFontColor(selectedColor: string): void {
    clearFontColorSelection();
    const colorBtns = fontColorBtns;

    let presetSelected = false;
    colorBtns?.forEach(btn => {
        const btnElement = btn as HTMLElement;
        if (btnElement.dataset.color?.toUpperCase() === selectedColor.toUpperCase()) {
            btnElement.style.border = "2px solid #00a1d6";
            presetSelected = true;
        }
    });

    if (!presetSelected && customFontColorContainer) {
        customFontColorContainer.style.border = "2px solid #00a1d6";
    }
}

function clearFontColorSelection(): void {
    fontColorBtns?.forEach(btn => {
        (btn as HTMLElement).style.border = "1px solid #ddd";
    });
    if (customFontColorContainer) {
        customFontColorContainer.style.border = "1px solid #ddd";
    }
}

function setBgColor(color: string): void {
    currentBgColor = color;
    saveSettingsDebounced();
}

function highlightSelectedBgColor(selectedColor: string): void {
    clearBgColorSelection();
    const colorBtns = bgColorBtns;

    let presetSelected = false;
    colorBtns?.forEach(btn => {
        const btnElement = btn as HTMLElement;
        if (btnElement.dataset.color?.toUpperCase() === selectedColor.toUpperCase()) {
            btnElement.style.border = "2px solid #00a1d6";
            presetSelected = true;
        }
    });

    if (!presetSelected && customBgColorContainer) {
        customBgColorContainer.style.border = "2px solid #00a1d6";
    }
}

function clearBgColorSelection(): void {
    bgColorBtns?.forEach(btn => {
        (btn as HTMLElement).style.border = "1px solid #ddd";
    });
    if (customBgColorContainer) {
        customBgColorContainer.style.border = "1px solid #ddd";
    }
}

function setOutlineColor(color: string): void {
    currentOutlineColor = color;
    saveSettingsDebounced();
}

function highlightSelectedOutlineColor(selectedColor: string): void {
    clearOutlineColorSelection();
    const colorBtns = outlineColorBtns;

    let presetSelected = false;
    colorBtns?.forEach(btn => {
        const btnElement = btn as HTMLElement;
        if (btnElement.dataset.color?.toUpperCase() === selectedColor.toUpperCase()) {
            btnElement.style.border = "2px solid #00a1d6";
            presetSelected = true;
        }
    });

    if (!presetSelected && customOutlineColorContainer) {
        customOutlineColorContainer.style.border = "2px solid #00a1d6";
    }
}

function clearOutlineColorSelection(): void {
    outlineColorBtns?.forEach(btn => {
        (btn as HTMLElement).style.border = "1px solid #ddd";
    });
    if (customOutlineColorContainer) {
        customOutlineColorContainer.style.border = "1px solid #ddd";
    }
}

function updateBgOptionsVisibility(isVisible: boolean): void {
    if (bgOptionsContainer) {
        bgOptionsContainer.style.display = isVisible ? "block" : "none";
    }
}

function updateOutlineOptionsVisibility(isVisible: boolean): void {
    if (outlineOptionsContainer) {
        outlineOptionsContainer.style.display = isVisible ? "block" : "none";
    }
}

function updateAnimationOptionsVisibility(isVisible: boolean): void {
    if (animationOptionsContainer) {
        animationOptionsContainer.style.display = isVisible ? "block" : "none";
    }
}

let saveTimeout: number | null = null;

function saveSettingsDebounced(): void {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    saveTimeout = window.setTimeout(() => {
        saveAllSettingsInternal();
    }, 300);
}

async function saveAllSettingsInternal(): Promise<void> {
    const settings = getSettingsFromUI();

    currentFontColor = settings.fontColor;
    currentOutlineColor = settings.outlineColor;
    currentBgColor = settings.bgColor;
    (window as any).subtitleSyncOffset = settings.syncOffset;

    try {
        await saveSettingsToIndexedDB(settings);
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

async function saveAllSettings(): Promise<void> {
    await saveAllSettingsInternal();

    const notification = notificationPopup;
    if (notification) {
        notification.style.opacity = "1";
        notification.style.transform = "translateY(0)";

        setTimeout(() => {
            notification.style.opacity = "0";
            notification.style.transform = "translateY(-20px)";
        }, 2000);
    }

    hideSettingsModal();
}

function getSettingsFromUI(): any {
    return {
        fontSize: parseInt(fontSizeValue?.textContent || "16"),
        fontColor: currentFontColor,
        bgEnabled: bgToggle?.checked || false,
        bgColor: currentBgColor,
        bgOpacity: parseFloat(bgOpacitySlider?.value || "0.5"),
        outlineEnabled: outlineToggle?.checked || false,
        outlineColor: currentOutlineColor,
        syncOffset: parseFloat(syncValueInput?.value || "0"),
        animationEnabled: animationToggle?.checked ?? true,
        animationType: animationTypeSelect?.value || "fade",
        animationDuration: parseFloat(animationDurationSlider?.value || "0.3")
    };
}

export async function showSettingsModal() {
    if (!settingsOverlay) {
        console.error("Settings modal not created yet!");
        return;
    }

    updateSettingsUI(await loadSettingsFromIndexedDB());

    const container = userInfoContainer;
    if (container && !/Last Update:\s*Never/i.test(container.textContent || "")) {
        console.log("[Subtitles Selector] User info already loaded. Skipping update.");
    } else {
        console.log("[Subtitles Selector] Loading user info from db");

        let userData = await getUserInfoFromDB();
        if (!userData || !userData.data) {
            console.log("[Subtitles Selector] No user info found, refreshing...");
            await refreshUserInfo(false);
        } else {
             updateUserInfoUI(userData);
        }
        console.log("[Subtitles Selector] Updated user info (or initiated refresh)");
    }

    settingsOverlay.style.display = "flex";
    setActiveModal(ActiveModal.SETTINGS);
}

export function hideSettingsModal(): void {
    if (settingsOverlay) settingsOverlay.style.display = "none";
    setActiveModal(ActiveModal.NONE);
}

export async function backSettingsModal() {
    hideSettingsModal();
    showSearchModal();
}

function updateSettingsUI(settings: any): void {
    currentFontColor = settings?.fontColor || "#FFFFFF";
    currentOutlineColor = settings?.outlineColor || "#000000";
    currentBgColor = settings?.bgColor || "#000000";

    if (fontSizeValue) {
        fontSizeValue.textContent = `${settings?.fontSize || 16}px`;
    }

    if (customFontColorPicker) customFontColorPicker.value = currentFontColor;
    if (hexFontColorInput) hexFontColorInput.value = currentFontColor.replace('#', '');
    highlightSelectedFontColor(currentFontColor);

    const bgEnabled = settings?.bgEnabled === true;
    if (bgToggle) bgToggle.checked = bgEnabled;
    updateBgOptionsVisibility(bgEnabled);

    if (bgToggleSpan) {
        bgToggleSpan.style.backgroundColor = bgEnabled ? "#00a1d6" : "#ccc";
        const toggleDot = bgToggleSpan.querySelector("span") as HTMLElement;
        if (toggleDot) {
            toggleDot.style.transform = bgEnabled ? "translateX(26px)" : "";
        }
    }

    if (customBgColorPicker) customBgColorPicker.value = currentBgColor;
    if (hexBgColorInput) hexBgColorInput.value = currentBgColor.replace('#', '');
    highlightSelectedBgColor(currentBgColor);

    const bgOpacity = settings?.bgOpacity ?? 0.5;
    if (bgOpacitySlider) bgOpacitySlider.value = `${bgOpacity}`;
    if (bgOpacityValue) bgOpacityValue.textContent = `${bgOpacity}`;


    const outlineEnabled = settings?.outlineEnabled === true;
    if (outlineToggle) outlineToggle.checked = outlineEnabled;
    updateOutlineOptionsVisibility(outlineEnabled);

    if (outlineToggleSpan) {
        outlineToggleSpan.style.backgroundColor = outlineEnabled ? "#00a1d6" : "#ccc";
        const toggleDot = outlineToggleSpan.querySelector("span") as HTMLElement;
        if (toggleDot) {
            toggleDot.style.transform = outlineEnabled ? "translateX(26px)" : "";
        }
    }

    if (customOutlineColorPicker) customOutlineColorPicker.value = currentOutlineColor;
    if (hexOutlineColorInput) hexOutlineColorInput.value = currentOutlineColor.replace('#', '');
    if (outlineEnabled) {
        highlightSelectedOutlineColor(currentOutlineColor);
    } else {
        clearOutlineColorSelection();
    }

    const syncOffset = settings?.syncOffset || 0;
    if (syncSlider) syncSlider.value = `${syncOffset}`;
    if (syncValueInput) syncValueInput.value = `${syncOffset}`;

    const animationEnabled = settings?.animationEnabled !== false;
    if (animationToggle) animationToggle.checked = animationEnabled;
    updateAnimationOptionsVisibility(animationEnabled);

    if (animationToggleSpan) {
        animationToggleSpan.style.backgroundColor = animationEnabled ? "#00a1d6" : "#ccc";
        const toggleDot = animationToggleSpan.querySelector("span") as HTMLElement;
        if (toggleDot) {
            toggleDot.style.transform = animationEnabled ? "translateX(26px)" : "";
        }
    }

    const animationType = settings?.animationType || "fade";
    const animationDuration = settings?.animationDuration ?? 0.3;
    if (animationTypeSelect) animationTypeSelect.value = animationType;
    if (animationDurationSlider) animationDurationSlider.value = `${animationDuration}`;
    if (animationDurationValue) animationDurationValue.textContent = `${animationDuration}s`;

}

async function updateFontSize(change: number): Promise<void> {
    const settings = await loadSettingsFromIndexedDB();
    const currentSize = settings?.fontSize || 16;
    const newSize = Math.max(8, Math.min(32, currentSize + change));

    if (fontSizeValue) {
        fontSizeValue.textContent = `${newSize}px`;
    }

    await saveSettingsToIndexedDB({
        ...settings,
        fontSize: newSize
    });

    document.querySelectorAll(".subtitle").forEach(subtitle => {
        (subtitle as HTMLElement).style.fontSize = `${newSize}px`;
    });
}