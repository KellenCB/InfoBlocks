import { tagHandler } from './tagHandler.js';
import { categoryTags } from './tagConfig.js';

export const blockTemplate = (block) => {
    const selectedTags = tagHandler.getSelectedTags(); // ✅ Fetch latest selected tags

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
                const isSelected = selectedTags.includes(tag) ? "selected" : ""; // ✅ Keep selection
                return `<span class="tag-button ${tagClass} ${isSelected}" data-tag="${tag}">${tag}</span>`;
            }).join("")
        )
        .join("");

    const predefinedTagList = Object.values(categoryTags).flatMap(data => data.tags);
    const userTags = block.tags
    .filter(tag => !predefinedTagList.includes(tag))
    .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase()); // ✅ Fix applied

    const userTagsHTML = userTags.map(tag => {
        const isSelected = selectedTags.includes(tag) ? "selected" : "";
        return `<span class="tag-button tag-user ${isSelected}" data-tag="${tag}">${tag}</span>`;
    }).join("");

    // Process the block text.
    // If block.highlighted is true (set by the search handler), only replace newlines.
    // Otherwise, also apply the asterisk formatting.
    let processedText;
    if (block.highlighted) {
        processedText = block.text.replace(/\n/g, '<br>');
    } else {
        processedText = block.text
            .replace(/\n/g, '<br>')
            .replace(/\*(.*?)\*/g, '<span style="font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase;">$1</span>');
    }

    return `
        <div class="block" data-id="${block.id}">
            <div class="block-actions">
                <button class="action-button duplicate_button green-button" data-id="${block.id}" title="Copy">❐</button>
                <button class="action-button edit_button orange-button" data-id="${block.id}" title="Edit">✎</button>
                <button class="action-button remove_button red-button" data-id="${block.id}" title="Remove">×</button>
            </div>
            <h4>${block.title}</h4>
            <div class="tag-sections">
                ${predefinedTagsHTML}
                ${userTagsHTML}
            </div>
            <p>${processedText}</p>
        </div>
    `;
};
