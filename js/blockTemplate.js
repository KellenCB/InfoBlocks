import { tagHandler } from './tagHandler.js'; // ✅ Import tagHandler
import { categoryTags } from './tagConfig.js'; // Ensure categoryTags is imported

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
    const userTags = block.tags.filter(tag => !predefinedTagList.includes(tag));
    const userTagsHTML = userTags.map(tag => {
        const isSelected = selectedTags.includes(tag) ? "selected" : "";
        return `<span class="tag-button tag-user ${isSelected}" data-tag="${tag}">${tag}</span>`;
    }).join("");

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
            <p>${block.text.replace(/\n/g, '<br>').replace(/\*(.*?)\*/g, '<span style="font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase;">$1</span>')}</p>
        </div>
    `;
};
