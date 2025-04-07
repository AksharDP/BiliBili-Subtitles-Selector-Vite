export function createButton(id: string, text: string, onClick?: () => void, style: string = ""): HTMLButtonElement {
    const button = document.createElement("button");
    button.id = id;
    button.textContent = text;
    button.type = "button";
    button.style.cssText = `
        padding: 8px 15px; background-color: #f0f0f0; color: #333;
        border: none; border-radius: 4px; cursor: pointer;
        ${style}
    `;
    if (onClick) button.addEventListener("click", onClick);
    return button;
}

export function createDiv(id: string, innerHTML: string = "", style: string = ""): HTMLDivElement {
    const div = document.createElement("div");
    div.id = id;
    div.innerHTML = innerHTML;
    div.style.cssText = style;
    return div;
}