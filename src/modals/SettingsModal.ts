import { createDiv } from '../ui/components';
import { saveSettingsToIndexedDB, loadSettingsFromIndexedDB, getUserInfoFromDB, getTokenDataFromDB, saveUserInfoToDB} from '../db/indexedDB';
import { getUserInfo } from '../api/openSubtitles';
import { setActiveModal, ActiveModal } from './ModalManager'
import settingsModalTemplate from '../templates/settingsModal.html?raw';

// These are moved from global scope in main.user.js to this module
let currentFontColor = "#FFFFFF";
let currentOutlineColor = "#000000";
let currentBgColor = "#000000";
let currentAnimationType = "fade";
let currentAnimationDuration = 0.3;

export function createSettingsModal(): void {
    const settingsOverlay = createDiv("opensubtitles-settings-overlay", "", `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5); z-index: 10001; display: none;
        justify-content: center; align-items: center;
    `);

    const settingsModal = createDiv("opensubtitles-settings-modal", "", `
        background-color: white; padding: 0; border-radius: 6px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); width: 500px; max-width: 90%;
        max-height: 80vh; display: flex; flex-direction: column; overflow: hidden;
    `);

    const notificationPopup = createDiv("os-settings-notification", "Settings saved successfully!", `
        position: fixed; top: 20px; right: 20px; background-color: #2ecc71;
        color: white; padding: 12px 20px; border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2); font-family: Arial, sans-serif;
        font-size: 14px; z-index: 10002; opacity: 0; transform: translateY(-20px);
        transition: all 0.3s ease; pointer-events: none;
    `);
    document.body.appendChild(notificationPopup);

    settingsModal.innerHTML = settingsModalTemplate;
    settingsOverlay.appendChild(settingsModal);
    document.body.appendChild(settingsOverlay);

    // Set up event listeners
    setupSettingsEventListeners();
}

function setupSettingsEventListeners(): void {
    // Close button
    document.getElementById("os-settings-close-btn")?.addEventListener("click", hideSettingsModal);

    // Font size controls
    document.getElementById("os-font-size-decrease")?.addEventListener("click", () => updateFontSize(-1));
    document.getElementById("os-font-size-increase")?.addEventListener("click", () => updateFontSize(1));

    // Font color controls
    document.querySelectorAll(".os-font-color-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const target = e.target as HTMLElement;
            if (target.dataset.color) {
                setFontColor(target.dataset.color);
                highlightSelectedFontColor(target.dataset.color);
            }
        });
    });
    
    document.getElementById("os-custom-font-color")?.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        setFontColor(target.value);
        clearFontColorSelection();
        (document.getElementById("os-hex-color-input") as HTMLInputElement).value = target.value.replace('#', '');
        document.getElementById("os-custom-color-container")!.style.border = "2px solid #00a1d6";
    });
    
    document.getElementById("os-hex-color-input")?.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        let color = target.value;
        if (!color.startsWith('#')) color = '#' + color;
        
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
            setFontColor(color);
            clearFontColorSelection();
            (document.getElementById("os-custom-font-color") as HTMLInputElement).value = color;
            document.getElementById("os-custom-color-container")!.style.border = "2px solid #00a1d6";
        }
    });

    // Background toggle
    document.getElementById("os-bg-toggle")?.addEventListener("change", handleBgToggleChange);
    
    // Background color controls
    document.querySelectorAll(".os-bg-color-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const target = e.target as HTMLElement;
            if (target.dataset.color) {
                setBgColor(target.dataset.color);
                highlightSelectedBgColor(target.dataset.color);
                (document.getElementById("os-bg-hex-color-input") as HTMLInputElement).value = target.dataset.color.replace('#', '');
            }
        });
    });
    
    document.getElementById("os-custom-bg-color")?.addEventListener("input", handleBgColorPickerInput);
    document.getElementById("os-bg-hex-color-input")?.addEventListener("input", handleBgHexColorInput);
    
    // Background opacity
    document.getElementById("os-bg-opacity")?.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        const valueElement = document.getElementById("os-bg-opacity-value");
        if (valueElement) valueElement.textContent = value;
        saveSettingsDebounced();
    });

    // Outline toggle
    document.getElementById("os-outline-toggle")?.addEventListener("change", handleOutlineToggleChange);
    
    // Outline color controls
    document.querySelectorAll(".os-outline-color-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const target = e.target as HTMLElement;
            if (target.dataset.color) {
                setOutlineColor(target.dataset.color);
                highlightSelectedOutlineColor(target.dataset.color);
                (document.getElementById("os-outline-hex-color-input") as HTMLInputElement).value = target.dataset.color.replace('#', '');
            }
        });
    });
    
    document.getElementById("os-custom-outline-color")?.addEventListener("input", handleOutlineColorPickerInput);
    document.getElementById("os-outline-hex-color-input")?.addEventListener("input", handleOutlineHexColorInput);

    // Sync controls
    document.getElementById("os-sync-slider")?.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        (document.getElementById("os-sync-value") as HTMLInputElement).value = target.value;
        saveSettingsDebounced();
    });
    
    document.getElementById("os-sync-value")?.addEventListener("input", handleSyncValueInput);
    document.getElementById("os-sync-reset")?.addEventListener("click", resetSyncSettings);

    // Animation controls
    document.getElementById("os-animation-toggle")?.addEventListener("change", handleAnimationToggleChange);
    document.getElementById("os-animation-type")?.addEventListener("change", saveSettingsDebounced);
    document.getElementById("os-animation-duration")?.addEventListener("input", e => {
        const target = e.target as HTMLInputElement;
        const valueElement = document.getElementById("os-animation-duration-value");
        if (valueElement) valueElement.textContent = `${target.value}s`;
        saveSettingsDebounced();
    });

    // Refresh user info button
    document.getElementById("os-refresh-user-info")?.addEventListener("click", () => refreshUserInfo(true));

    // Save button
    document.getElementById("os-settings-save-btn")?.addEventListener("click", saveAllSettings);
}

// Format UTC date to local time with AM/PM
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
    const refreshBtn = document.getElementById("os-refresh-user-info") as HTMLButtonElement;
    if (refreshBtn && showRefreshedIndicator) {
        // Set button to loading state
        refreshBtn.textContent = "Refreshing...";
        refreshBtn.disabled = true;
        refreshBtn.style.backgroundColor = "#f0f0f0";
        refreshBtn.style.color = "#999";
    }

    try {
        const tokenData = await getTokenDataFromDB();
        if (!tokenData?.token) {
            console.error("No token found in database");
            return;
        }
        const userData = await getUserInfo(tokenData);
        if (userData) {
            // Store user data with timestamp
            await saveUserInfoToDB(userData);
            // Update UI with new data
            updateUserInfoUI(userData);
            
            // Show success state
            if (refreshBtn && showRefreshedIndicator) {
                refreshBtn.textContent = "Updated!";
                refreshBtn.style.backgroundColor = "#e8f5e9";
                refreshBtn.style.color = "#2e7d32";
                refreshBtn.style.borderColor = "#c8e6c9";
                refreshBtn.disabled = false;
            }
        } else {
            // Show error state
            if (refreshBtn) {
                refreshBtn.textContent = "Failed to Update";
                refreshBtn.style.backgroundColor = "#ffebee";
                refreshBtn.style.color = "#c62828";
                refreshBtn.style.borderColor = "#ef9a9a";
                refreshBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error("Error refreshing user info:", error);
        
        // Show error state
        if (refreshBtn) {
            refreshBtn.textContent = "Error";
            refreshBtn.style.backgroundColor = "#ffebee";
            refreshBtn.style.color = "#c62828";
            refreshBtn.style.borderColor = "#ef9a9a";
            refreshBtn.disabled = false;
        }
    } finally {
        // Reset button after delay
        setTimeout(() => {
            if (refreshBtn) {
                refreshBtn.textContent = "Refresh Information";
                refreshBtn.style.backgroundColor = "#f0f0f0";
                refreshBtn.style.color = "#666";
                refreshBtn.style.borderColor = "#ddd";
                refreshBtn.disabled = false;
            }
        }, 2000);
    }
}

async function loadUserInfo(): Promise<void> {
    try {
        // Get user account info
        let userData = await getUserInfoFromDB();

        // Update UI with combined data
        updateUserInfoUI(userData);
    } catch (error) {
        console.error("Error loading user info into UI:", error);
        updateUserInfoUIForError("Error loading user information.<br>Please try refreshing.");
    }
}

function updateUserInfoUI(userData: any): void {
    const userInfoElement = document.getElementById("os-user-info");
    if (!userData || !userData.data) return updateUserInfoUIForError("No user information found.<br>Please try refreshing.");
    console.log(userData);
    if (userInfoElement) {
        userInfoElement.innerHTML = `
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

function updateUserInfoUIForError(message: string): void {
    const userInfoElement = document.getElementById("os-user-info");
    if (userInfoElement) {
        userInfoElement.innerHTML = `<div style="color: #e74c3c; font-family: Arial, sans-serif; font-size: 14px; text-align: center;">${message}</div>`;
    }
}

// Helper for handling bg toggle changes
function handleBgToggleChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const isChecked = target.checked;
    updateBgOptionsVisibility(isChecked);

    // Update the visual appearance of the toggle
    const toggleSpan = target.nextElementSibling as HTMLElement;
    if (toggleSpan) {
        toggleSpan.style.backgroundColor = isChecked ? "#00a1d6" : "#ccc";
        const toggleDot = toggleSpan.querySelector("span") as HTMLElement;
        if (toggleDot) {
            toggleDot.style.transform = isChecked ? "translateX(26px)" : "";
        }
    }
    
    saveSettingsDebounced();
}

// Helper for handling outline toggle changes
function handleOutlineToggleChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const isChecked = target.checked;
    updateOutlineOptionsVisibility(isChecked);

    // Update the visual appearance of the toggle
    const toggleSpan = target.nextElementSibling as HTMLElement;
    if (toggleSpan) {
        toggleSpan.style.backgroundColor = isChecked ? "#00a1d6" : "#ccc";
        const toggleDot = toggleSpan.querySelector("span") as HTMLElement;
        if (toggleDot) {
            toggleDot.style.transform = isChecked ? "translateX(26px)" : "";
        }
    }
    
    saveSettingsDebounced();
}

// Helper for handling animation toggle changes
function handleAnimationToggleChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const isChecked = target.checked;
    updateAnimationOptionsVisibility(isChecked);

    // Update the visual appearance of the toggle
    const toggleSpan = target.nextElementSibling as HTMLElement;
    if (toggleSpan) {
        toggleSpan.style.backgroundColor = isChecked ? "#00a1d6" : "#ccc";
        const toggleDot = toggleSpan.querySelector("span") as HTMLElement;
        if (toggleDot) {
            toggleDot.style.transform = isChecked ? "translateX(26px)" : "";
        }
    }
    
    saveSettingsDebounced();
}

// Handle background color picker input
function handleBgColorPickerInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    setBgColor(target.value);
    clearBgColorSelection();
    (document.getElementById("os-bg-hex-color-input") as HTMLInputElement).value = target.value.replace('#', '');
    document.getElementById("os-bg-color-container")!.style.border = "2px solid #00a1d6";
    saveSettingsDebounced();
}

// Handle background hex color input
function handleBgHexColorInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    let color = target.value;
    if (!color.startsWith('#')) color = '#' + color;
    
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
        setBgColor(color);
        clearBgColorSelection();
        (document.getElementById("os-custom-bg-color") as HTMLInputElement).value = color;
        document.getElementById("os-bg-color-container")!.style.border = "2px solid #00a1d6";
        saveSettingsDebounced();
    }
}

// Handle outline hex color input
function handleOutlineHexColorInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    let color = target.value;
    if (!color.startsWith('#')) color = '#' + color;
    
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
        setOutlineColor(color);
        clearOutlineColorSelection();
        (document.getElementById("os-custom-outline-color") as HTMLInputElement).value = color;
        document.getElementById("os-outline-color-container")!.style.border = "2px solid #00a1d6";
        saveSettingsDebounced();
    }
}

// Handle outline color picker input
function handleOutlineColorPickerInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    setOutlineColor(target.value);
    clearOutlineColorSelection();
    (document.getElementById("os-outline-hex-color-input") as HTMLInputElement).value = target.value.replace('#', '');
    document.getElementById("os-outline-color-container")!.style.border = "2px solid #00a1d6";
    saveSettingsDebounced();
}

// Handle sync value input
function handleSyncValueInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    // const value = parseFloat(target.value);
    // if (value >= -30 && value <= 30) {
    //     (document.getElementById("os-sync-slider") as HTMLInputElement).value = target.value;
    // } else if (value < -30) {
    //     target.value = "-30";
    //     (document.getElementById("os-sync-slider") as HTMLInputElement).value = "-30";
    // } else if (value > 30) {
    //     target.value = "30";
    //     (document.getElementById("os-sync-slider") as HTMLInputElement).value = "30";
    // }
    (document.getElementById("os-sync-slider") as HTMLInputElement).value = target.value;
    saveSettingsDebounced();
}

// Reset sync settings
function resetSyncSettings(): void {
    (document.getElementById("os-sync-slider") as HTMLInputElement).value = "0";
    (document.getElementById("os-sync-value") as HTMLInputElement).value = "0";
    saveSettingsDebounced();
}

// Set font color and highlight
function setFontColor(color: string): void {
    currentFontColor = color;
    saveSettingsDebounced();
}

// Highlight selected font color
function highlightSelectedFontColor(selectedColor: string): void {
    clearFontColorSelection();
    const colorBtns = document.querySelectorAll(".os-font-color-btn");
    
    colorBtns.forEach(btn => {
        const btnElement = btn as HTMLElement;
        if (btnElement.dataset.color?.toUpperCase() === selectedColor.toUpperCase()) {
            btnElement.style.border = "2px solid #00a1d6";
        }
    });
    
    if (!Array.from(colorBtns).some(btn => {
        const btnElement = btn as HTMLElement;
        return btnElement.dataset.color?.toUpperCase() === selectedColor.toUpperCase();
    })) {
        document.getElementById("os-custom-color-container")!.style.border = "2px solid #00a1d6";
    }
}

// Clear font color selection
function clearFontColorSelection(): void {
    document.querySelectorAll(".os-font-color-btn").forEach(btn => {
        (btn as HTMLElement).style.border = "1px solid #ddd";
    });
    document.getElementById("os-custom-color-container")!.style.border = "1px solid #ddd";
}

// Set background color
function setBgColor(color: string): void {
    currentBgColor = color;
    saveSettingsDebounced();
}

// Highlight selected bg color
function highlightSelectedBgColor(selectedColor: string): void {
    clearBgColorSelection();
    const colorBtns = document.querySelectorAll(".os-bg-color-btn");
    
    colorBtns.forEach(btn => {
        const btnElement = btn as HTMLElement;
        if (btnElement.dataset.color?.toUpperCase() === selectedColor.toUpperCase()) {
            btnElement.style.border = "2px solid #00a1d6";
        }
    });
    
    if (!Array.from(colorBtns).some(btn => {
        const btnElement = btn as HTMLElement;
        return btnElement.dataset.color?.toUpperCase() === selectedColor.toUpperCase();
    })) {
        document.getElementById("os-bg-color-container")!.style.border = "2px solid #00a1d6";
    }
}

// Clear bg color selection
function clearBgColorSelection(): void {
    document.querySelectorAll(".os-bg-color-btn").forEach(btn => {
        (btn as HTMLElement).style.border = "1px solid #ddd";
    });
    document.getElementById("os-bg-color-container")!.style.border = "1px solid #ddd";
}

// Set outline color
function setOutlineColor(color: string): void {
    currentOutlineColor = color;
    saveSettingsDebounced();
}

// Highlight selected outline color
function highlightSelectedOutlineColor(selectedColor: string): void {
    clearOutlineColorSelection();
    const colorBtns = document.querySelectorAll(".os-outline-color-btn");
    
    colorBtns.forEach(btn => {
        const btnElement = btn as HTMLElement;
        if (btnElement.dataset.color?.toUpperCase() === selectedColor.toUpperCase()) {
            btnElement.style.border = "2px solid #00a1d6";
        }
    });
    
    if (!Array.from(colorBtns).some(btn => {
        const btnElement = btn as HTMLElement;
        return btnElement.dataset.color?.toUpperCase() === selectedColor.toUpperCase();
    })) {
        document.getElementById("os-outline-color-container")!.style.border = "2px solid #00a1d6";
    }
}

// Clear outline color selection
function clearOutlineColorSelection(): void {
    document.querySelectorAll(".os-outline-color-btn").forEach(btn => {
        (btn as HTMLElement).style.border = "1px solid #ddd";
    });
    document.getElementById("os-outline-color-container")!.style.border = "1px solid #ddd";
}

// Update visibility of background options
function updateBgOptionsVisibility(isVisible: boolean): void {
    const bgOptions = document.getElementById("os-bg-options");
    if (bgOptions) {
        bgOptions.style.display = isVisible ? "block" : "none";
    }
}

// Update visibility of outline options
function updateOutlineOptionsVisibility(isVisible: boolean): void {
    const outlineOptions = document.getElementById("os-outline-options");
    if (outlineOptions) {
        outlineOptions.style.display = isVisible ? "block" : "none";
    }
}

// Update visibility of animation options
function updateAnimationOptionsVisibility(isVisible: boolean): void {
    const animationOptions = document.getElementById("os-animation-options");
    if (animationOptions) {
        animationOptions.style.display = isVisible ? "block" : "none";
    }
}

// Debounce helper to prevent too many saves
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
    // Get settings from the UI
    const settings = getSettingsFromUI();
    
    // Update global variables with the new settings
    currentFontColor = settings.fontColor;
    currentOutlineColor = settings.outlineColor;
    currentBgColor = settings.bgColor;
    (window as any).subtitleSyncOffset = settings.syncOffset;
    
    // Update global animation properties
    currentAnimationType = settings.animationType;
    currentAnimationDuration = settings.animationDuration;
    
    try {
        // Save settings to IndexedDB
        await saveSettingsToIndexedDB(settings);
        
        // Apply changes to active subtitles (e.g. update a CSS variable)
        document.documentElement.style.setProperty('--subtitle-font-size', `${settings.fontSize}px`);
        // Also update global CSS variables for animation type and duration if used in your styles
        document.documentElement.style.setProperty('--subtitle-animation-type', settings.animationType);
        document.documentElement.style.setProperty('--subtitle-animation-duration', `${settings.animationDuration}s`);
        
        // (Optional) Call a function to update any active subtitle overlays immediately
        // applySettingsToActiveSubtitles(settings);
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

async function saveAllSettings(): Promise<void> {
    await saveAllSettingsInternal();
    showNotification();
    hideSettingsModal();
}

function showNotification(): void {
    const notification = document.getElementById("os-settings-notification");
    if (notification) {
        notification.style.opacity = "1";
        notification.style.transform = "translateY(0)";
        
        setTimeout(() => {
            notification.style.opacity = "0";
            notification.style.transform = "translateY(-20px)";
        }, 2000);
    }
}

// Get settings from UI
function getSettingsFromUI(): any {
    return {
        fontSize: parseInt((document.getElementById("os-font-size-value")?.textContent || "16").replace("px", "")),
        fontColor: currentFontColor || "#FFFFFF",
        bgEnabled: (document.getElementById("os-bg-toggle") as HTMLInputElement)?.checked || false,
        bgColor: currentBgColor || "#000000",
        bgOpacity: parseFloat((document.getElementById("os-bg-opacity") as HTMLInputElement)?.value || "0.5"),
        outlineEnabled: (document.getElementById("os-outline-toggle") as HTMLInputElement)?.checked || false,
        outlineColor: currentOutlineColor || "#000000",
        syncOffset: parseFloat((document.getElementById("os-sync-value") as HTMLInputElement)?.value || "0"),
        animationEnabled: (document.getElementById("os-animation-toggle") as HTMLInputElement).checked,
        animationType: (document.getElementById("os-animation-type") as HTMLSelectElement)?.value || "fade",
        animationDuration: parseFloat((document.getElementById("os-animation-duration") as HTMLInputElement)?.value || "0.3")
    };
}

export async function showSettingsModal(): Promise<void> {
    updateSettingsUI(await loadSettingsFromIndexedDB());
    
    const userInfoElement = document.getElementById("os-user-info");
    // Check if "Last Update:" displays "Never"
    if (userInfoElement && !/Last Update:\s*Never/i.test(userInfoElement.textContent || "")) {
        console.log("[Subtitles Selector] User info already loaded. Skipping update.");
    } else {
        console.log("[Subtitles Selector] Loading user info from db");
        
        let userData = await getUserInfoFromDB();
        // If no user info is found, force a refresh from the API
        if (!userData || !userData.data) {
            console.log("[Subtitles Selector] No user info found, refreshing...");
            await refreshUserInfo(false);
            userData = await getUserInfoFromDB();
        }
        updateUserInfoUI(userData);
        console.log("[Subtitles Selector] Updated user info");
    }
    
    const overlay = document.getElementById("opensubtitles-settings-overlay");
    if (overlay) overlay.style.display = "flex";
    setActiveModal(ActiveModal.SETTINGS);
}

// Update UI based on loaded settings
function updateSettingsUI(settings: any): void {
    // Update variables first
    currentFontColor = settings?.fontColor || "#FFFFFF";
    currentOutlineColor = settings?.outlineColor || "#000000";
    currentBgColor = settings?.bgColor || "#000000";
    
    // Font size
    const fontSizeValue = document.getElementById("os-font-size-value");
    if (fontSizeValue) {
        fontSizeValue.textContent = `${settings?.fontSize || 16}px`;
    }
    
    // Font color
    (document.getElementById("os-custom-font-color") as HTMLInputElement).value = settings?.fontColor || "#FFFFFF";
    (document.getElementById("os-hex-color-input") as HTMLInputElement).value = (settings?.fontColor || "#FFFFFF").replace('#', '');
    highlightSelectedFontColor(settings?.fontColor || "#FFFFFF");
    
    // Background
    const bgEnabled = settings?.bgEnabled === true;
    (document.getElementById("os-bg-toggle") as HTMLInputElement).checked = bgEnabled;
    updateBgOptionsVisibility(bgEnabled);
    
    // Update toggle appearance
    const bgToggleSpan = document.getElementById("os-bg-toggle")?.nextElementSibling as HTMLElement;
    if (bgToggleSpan) {
        bgToggleSpan.style.backgroundColor = bgEnabled ? "#00a1d6" : "#ccc";
        const toggleDot = bgToggleSpan.querySelector("span") as HTMLElement;
        if (toggleDot) {
            toggleDot.style.transform = bgEnabled ? "translateX(26px)" : "";
        }
    }
    
    // Background color and opacity
    (document.getElementById("os-custom-bg-color") as HTMLInputElement).value = settings?.bgColor || "#000000";
    (document.getElementById("os-bg-hex-color-input") as HTMLInputElement).value = (settings?.bgColor || "#000000").replace('#', '');
    highlightSelectedBgColor(settings?.bgColor || "#000000");
    
    (document.getElementById("os-bg-opacity") as HTMLInputElement).value = `${settings?.bgOpacity || 0.5}`;
    const bgOpacityValue = document.getElementById("os-bg-opacity-value");
    if (bgOpacityValue) {
        bgOpacityValue.textContent = `${settings?.bgOpacity || 0.5}`;
    }
    
    // Outline
    const outlineEnabled = settings?.outlineEnabled === true;
    (document.getElementById("os-outline-toggle") as HTMLInputElement).checked = outlineEnabled;
    updateOutlineOptionsVisibility(outlineEnabled);
    
    // Update toggle appearance
    const outlineToggleSpan = document.getElementById("os-outline-toggle")?.nextElementSibling as HTMLElement;
    if (outlineToggleSpan) {
        outlineToggleSpan.style.backgroundColor = outlineEnabled ? "#00a1d6" : "#ccc";
        const toggleDot = outlineToggleSpan.querySelector("span") as HTMLElement;
        if (toggleDot) {
            toggleDot.style.transform = outlineEnabled ? "translateX(26px)" : "";
        }
    }
    
    // Outline color
    (document.getElementById("os-custom-outline-color") as HTMLInputElement).value = settings?.outlineColor || "#000000";
    (document.getElementById("os-outline-hex-color-input") as HTMLInputElement).value = (settings?.outlineColor || "#000000").replace('#', '');
    if (outlineEnabled) {
        highlightSelectedOutlineColor(settings?.outlineColor || "#000000");
    }
    
    // Sync offset
    (document.getElementById("os-sync-slider") as HTMLInputElement).value = `${settings?.syncOffset || 0}`;
    (document.getElementById("os-sync-value") as HTMLInputElement).value = `${settings?.syncOffset || 0}`;
    
    // Animation
    const animationEnabled = settings?.animationEnabled !== false;
    (document.getElementById("os-animation-toggle") as HTMLInputElement).checked = animationEnabled;
    updateAnimationOptionsVisibility(animationEnabled);
    
    // Update toggle appearance
    const animationToggleSpan = document.getElementById("os-animation-toggle")?.nextElementSibling as HTMLElement;
    if (animationToggleSpan) {
        animationToggleSpan.style.backgroundColor = animationEnabled ? "#00a1d6" : "#ccc";
        const toggleDot = animationToggleSpan.querySelector("span") as HTMLElement;
        if (toggleDot) {
            toggleDot.style.transform = animationEnabled ? "translateX(26px)" : "";
        }
    }
    
    // Animation type and duration
    (document.getElementById("os-animation-type") as HTMLSelectElement).value = settings?.animationType || "fade";
    (document.getElementById("os-animation-duration") as HTMLInputElement).value = `${settings?.animationDuration || 0.3}`;
    const animationDurationValue = document.getElementById("os-animation-duration-value");
    if (animationDurationValue) {
        animationDurationValue.textContent = `${settings?.animationDuration || 0.3}s`;
    }
}

async function updateFontSize(change: number): Promise<void> {
    const settings = await loadSettingsFromIndexedDB();
    const currentSize = settings?.fontSize || 16;
    const newSize = Math.max(8, Math.min(32, currentSize + change)); // Limit font size between 8-32px

    // Update the font size display in the settings modal for feedback
    const fontSizeValue = document.getElementById("os-font-size-value");
    if (fontSizeValue) {
        fontSizeValue.textContent = `${newSize}px`;
    }

    // Update stored settings immediately
    await saveSettingsToIndexedDB({
        ...settings,
        fontSize: newSize
    });

    // Apply the change to the subtitle elements (instead of the modal styles)
    document.querySelectorAll(".subtitle").forEach(subtitle => {
        (subtitle as HTMLElement).style.fontSize = `${newSize}px`;
    });
}

export function hideSettingsModal(): void {
    const overlay = document.getElementById("opensubtitles-settings-overlay");
    if (overlay) overlay.style.display = "none";
    setActiveModal(ActiveModal.SEARCH);
}