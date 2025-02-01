import { dataManager } from './dataManager.js';

console.log("uiManager.js loaded");

export const uiManager = (() => {
    const resultsSection = document.getElementById("results_section");

    // Render the blocks in the results section
    const renderBlocks = (blocks) => {
        resultsSection.innerHTML = blocks.length
            ? blocks.map(blockTemplate).join("")
            : "<h3>No Results Found</h3>";
    };

    const blockTemplate = (block) => {
        console.log("Rendering block:", block);
    
        // Filter tags by type
        const partTypeTags = block.tags.filter(tag => 
            dataManager.getPredefinedTags("partType").includes(tag)
        );
        const actionTypeTags = block.tags.filter(tag => 
            dataManager.getPredefinedTags("actionType").includes(tag)
        );
        const abilityTypeTags = block.tags.filter(tag => 
            dataManager.getPredefinedTags("abilityType").includes(tag)
        );
        const userGeneratedTags = block.tags.filter(tag =>
            ![...partTypeTags, ...actionTypeTags, ...abilityTypeTags].includes(tag)
        );
    
        return `
            <div class="block">
                <div class="block-actions">
                    <button class="action-button duplicate_button green-button" data-id="${block.id}" title="Duplicate">
                        <span class="duplicate-action-icon">❐</span>
                    </button>
                    <button class="action-button edit_button orange-button" data-id="${block.id}" title="Edit">
                        <span class="edit-action-icon">✎</span>
                    </button>
                    <button class="action-button remove_button red-button" data-id="${block.id}" title="Remove">
                        <span class="remove-action-icon">×</span>
                    </button>
                </div>
                <h4>${block.title}</h4>
                <div class="tags-sections">
                    <div id="user_tags_block" class="tags-button">
                        ${userGeneratedTags.map(tag => `<span class="tag-button">${tag}</span>`).join("")}
                    </div>
                    <div id="part_type_tags_block" class="tags-button">
                        ${partTypeTags.map(tag => `<span class="tag-button">${tag}</span>`).join("")}
                    </div>
                    <div id="action_type_tags_block" class="tags-button">
                        ${actionTypeTags.map(tag => `<span class="tag-button">${tag}</span>`).join("")}
                    </div>
                    <div id="ability_type_tags_block" class="tags-button">
                        ${abilityTypeTags.map(tag => `<span class="tag-button">${tag}</span>`).join("")}
                    </div>
                </div>
                <p>${block.text}</p>
            </div>
        `;
    };
    

    // Render tags in the tags list🖉
    const renderTags = (tags, containerId, selectedTags = []) => {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID "${containerId}" not found`);
            return;
        }

        // Filter tags into predefined and user-generated categories
        const predefinedTags = tags.filter(tag =>
            dataManager.getPredefinedTags("partType").includes(tag) ||
            dataManager.getPredefinedTags("actionType").includes(tag) ||
            dataManager.getPredefinedTags("abilityType").includes(tag)
        );

        const userGeneratedTags = tags.filter(tag =>
            !predefinedTags.includes(tag)
        );

        console.log("Rendering Tags for Container:", containerId);
        console.log("Predefined Tags:", predefinedTags);
        console.log("User-Generated Tags:", userGeneratedTags);

        // Render tags in the container
        container.innerHTML = [...userGeneratedTags, ...predefinedTags]
            .map(tag => `
                <button 
                    class="tag-button ${selectedTags.includes(tag) ? "selected" : ""}" 
                    data-tag="${tag}">
                    ${tag}
                </button>
            `)
            .join("");
    };

    const updateTags = () => {
        // Get all tags from blocks
        const allTags = dataManager.getTags();
        const partTypeTags = dataManager.getPredefinedTags("partType");
        const actionTypeTags = dataManager.getPredefinedTags("actionType");
        const abilityTypeTags = dataManager.getPredefinedTags("abilityType");

        // Filter user-defined tags (exclude predefined tags)
        const userDefinedTags = allTags.filter(tag =>
            !dataManager.getPredefinedTags("partType").includes(tag) &&
            !dataManager.getPredefinedTags("actionType").includes(tag) &&
            !dataManager.getPredefinedTags("abilityType").includes(tag)
        );

        console.log("Updating Tags...");
        console.log("All Tags:", allTags);
        console.log("Part Type Tags:", partTypeTags);
        console.log("Action Type Tags:", actionTypeTags);
        console.log("Ability Type Tags:", abilityTypeTags);

        // Update each tag list
        renderTags(userDefinedTags, "tags_list"); // User-defined tags
        renderTags(partTypeTags, "part_type_tags_overlay"); // Part type tags
        renderTags(actionTypeTags, "action_type_tags_overlay"); // Action type tags
        renderTags(abilityTypeTags, "ability_type_tags_overlay"); // Ability type tags
    };

    return { renderBlocks, renderTags, updateTags };
})();
