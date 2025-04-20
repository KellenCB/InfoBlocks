import { tagHandler } from './tagHandler.js';
import { categoryTags } from './tagConfig.js';
import { toggleBlockUse } from './circleToggle.js';

export const blockTemplate = (block) => {
    // Ensure a default view state
    const viewState = block.viewState || 'expanded';
    const selectedTags = tagHandler.getSelectedTags();

    // Build tags HTML (same as before)
    const predefinedTagsByCategory = Object.fromEntries(
        Object.entries(categoryTags).map(([category, data]) => [
            category,
            Array.isArray(data.tags) ? data.tags.filter(tag => block.tags.includes(tag)) : []
        ])
    );

    const predefinedTagsHTML = Object.entries(predefinedTagsByCategory)
        .map(([category, tags]) =>
            tags.map(tag => {
                const tagClass = categoryTags[category]?.className || "tag-default";
                const isSelected = selectedTags.includes(tag) ? "selected" : "";
                return `<span class="tag-button ${tagClass} ${isSelected}" data-tag="${tag}">${tag}</span>`;
            }).join("")
        )
        .join("");

    const predefinedTagList = Object.values(categoryTags).flatMap(data => data.tags);
    const userTags = block.tags
        .filter(tag => !predefinedTagList.includes(tag))
        .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());
    const userTagsHTML = userTags.map(tag => {
        const isSelected = selectedTags.includes(tag) ? "selected" : "";
        return `<span class="tag-button tag-user ${isSelected}" data-tag="${tag}">${tag}</span>`;
    }).join("");

    // Process block text formatting as before
    let processedText;
    if (block.highlighted) {
        processedText = block.text.replace(/\n/g, '<br>');
    } else {
        processedText = block.text
            .replace(/\n/g, '<br>')
            .replace(/\*(.*?)\*/g, '<span style="font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase;">$1</span>');
    }

    // Render content based on view state
    let content = "";
    if (viewState === 'expanded') {
        const usesHTML = block.uses   ? block.uses.map((state, idx) => `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`).join("") : "";
        content = `
            <div class="block-header">
                <div class="block-header-left">
                    <div class="block-title"><h4>${block.title}</h4></div>
                    ${ usesHTML ? `<div class="block-uses">${usesHTML}</div>` : "" }
                </div>
                <div class="block-actions">
                    <button class="action-button duplicate-button green-button" data-id="${block.id}" title="Copy">❐</button>
                    <button class="action-button edit-button orange-button" data-id="${block.id}" title="Edit">✎</button>
                    <button class="action-button remove-button red-button" data-id="${block.id}" title="Remove">×</button>
                </div>
            </div>
            <div class="tag-sections">
                ${predefinedTagsHTML}
                ${userTagsHTML}
            </div>
            <div class="block-body">
                <p>${processedText}</p>
            </div>
        `;

    } else if (viewState === 'condensed') {
        const usesHTML = block.uses   ? block.uses.map((state, idx) => `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`).join("") : "";      
        // Condensed View:
        content = `
            <div class="block-header">
                <div class="block-title"><h4>${block.title}</h4></div>
                ${ usesHTML ? `<div class="block-uses">${usesHTML}</div>` : "" }
                <div class="block-actions">
                    <button class="action-button duplicate-button green-button" data-id="${block.id}" title="Copy">❐</button>
                    <button class="action-button edit-button orange-button" data-id="${block.id}" title="Edit">✎</button>
                    <button class="action-button remove-button red-button" data-id="${block.id}" title="Remove">×</button>
                </div>
            </div>
        `;
    } else if (viewState === 'minimized') {
        const usesHTML = block.uses
            ? block.uses.map((state, idx) => `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`).join("")
            : "";
    
        content = `
            <div class="block-header">
                <div class="block-title"><h4>${block.title}</h4></div>
                ${usesHTML ? `<div class="block-uses">${usesHTML}</div>` : ""}
            </div>
        `;
    }

    // Add the viewState as a class to the container for targeted styling
    return `
        <div class="block ${viewState}" data-id="${block.id}">
            ${content}
        </div>
    `;
};
