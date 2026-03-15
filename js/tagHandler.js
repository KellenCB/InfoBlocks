import { appManager, stripHTML } from './appManager.js';
import { categoryTags, blockTypeConfig } from './tagConfig.js';

// Returns a flat set of ALL block type labels across all tabs
const getAllBlockTypes = () => {
    return new Set(
        Object.values(blockTypeConfig).flatMap(cfg => cfg.types)
    );
};

export const tagHandler = (() => {

    let selectedTagsByTab = {};

    const getSelectedTags = (activeTab = "tab4") => {
        return selectedTagsByTab[activeTab] ? [...selectedTagsByTab[activeTab]] : [];
    };
       
    const setSelectedTags = (activeTab, newTags) => {
        if (!Array.isArray(newTags)) return;
        selectedTagsByTab[activeTab] = [...newTags];
    };
                    
    const applyFiltersAfterSave = () => {
        const activeTab = document.querySelector(".tab-button.active")?.dataset.tab || "tab4";
        const selectedTags = getSelectedTags(activeTab);
        document.querySelectorAll(".tag-button").forEach(tagElement => {
            tagElement.classList.toggle("selected", selectedTags.includes(tagElement.dataset.tag));
        });
    };
    
    const clearSelectedTags = (activeTab) => {
        selectedTagsByTab[activeTab] = [];
        Object.keys(categoryTags).forEach(category => {
            const list = document.getElementById(`${category}_tags_list`);
            if (list) {
                list.querySelectorAll(".tag-button").forEach(button => button.classList.remove("selected"));
            }
        });
        appManager.renderBlocks(appManager.getBlocks());
        console.log("All selected tags cleared.");
    };

    const handleTagClick = () => {
        document.addEventListener("click", (event) => {
            const target = event.target;
            if (
                !target.classList.contains("tag-button") ||
                target.closest(".add-block-overlay") ||
                target.closest(".edit-block-overlay")
            ) {
                return;
            }
        
            const activeTab = document.querySelector(".tab-button.active")?.dataset.tab || "tab4";
            const tabNumber = activeTab.replace("tab", "");
        
            let updatedTags = [...tagHandler.getSelectedTags(activeTab)];
            const tag = target.dataset.tag.trim();
            if (updatedTags.includes(tag)) {
                updatedTags = updatedTags.filter(t => t !== tag);
            } else {
                updatedTags.push(tag);
            }
            tagHandler.setSelectedTags(activeTab, updatedTags);
        
            const searchInput = document.getElementById(`search_input_${tabNumber}`);
            if (!searchInput) {
                console.error(`❌ Error: search_input_${tabNumber} not found!`);
                return;
            }
            const searchQuery = searchInput.value.trim().toLowerCase();
        
            let filteredBlocks = appManager.getBlocks(activeTab);
        
            // Use blockTypeConfig to determine which tags are block types for this tab
            const tabBTConfig = blockTypeConfig[activeTab];
            const tabBlockTypes = tabBTConfig ? new Set(tabBTConfig.types) : new Set();

            const typeFilters = updatedTags.filter(t => tabBlockTypes.has(t));
            const tagFilters  = updatedTags.filter(t => !tabBlockTypes.has(t));

            if (typeFilters.length > 0) {
                filteredBlocks = filteredBlocks.filter(block => {
                    const types = Array.isArray(block.blockType) ? block.blockType : (block.blockType ? [block.blockType] : []);
                    return typeFilters.every(t => types.includes(t));
                });
            }
            if (tagFilters.length > 0) {
                filteredBlocks = filteredBlocks.filter(block =>
                    tagFilters.every(t => block.tags.includes(t))
                );
            }
        
            if (searchQuery.length > 0) {
                filteredBlocks = filteredBlocks.filter(block =>
                    block.title.toLowerCase().includes(searchQuery) ||
                    stripHTML(block.text).toLowerCase().includes(searchQuery)
                );
            }
                      
            appManager.renderBlocks(activeTab, filteredBlocks);
            appManager.updateTags();
        
            console.log(`Active tab ${activeTab} selected tags:`, updatedTags);
            console.log("🔍 Active search query:", searchQuery);
        });
    };      
                    
    const handleOverlayTagClick = () => {
        document.addEventListener("click", (event) => {
            const target = event.target;
            if (target.classList.contains("tag-button") && (target.closest(".add-block-overlay") || target.closest(".edit-block-overlay"))) {
                event.stopPropagation();
                target.classList.toggle("selected");
            }
        }, true);
    };

    const filterBlocksBySelectedTags = (blocks) => {
        let selectedTags = getSelectedTags();
        if (selectedTags.length === 0) return blocks;
        return blocks.filter(block => block.tags.some(tag => selectedTags.includes(tag)));
    };
        

    return {
        getSelectedTags,
        setSelectedTags,
        applyFiltersAfterSave,
        clearSelectedTags,
        handleTagClick,
        handleOverlayTagClick,
        filterBlocksBySelectedTags
    };

})();

document.addEventListener("DOMContentLoaded", () => {
    tagHandler.applyFiltersAfterSave();
    tagHandler.handleTagClick();  
    tagHandler.handleOverlayTagClick();
});