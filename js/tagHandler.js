import { appManager, stripHTML } from './appManager.js';
import { categoryTags } from './tagConfig.js';

export const tagHandler = (() => {

    let selectedTagsByTab = {};

    const getSelectedTags = (activeTab = "tab4") => {
        return selectedTagsByTab[activeTab] ? [...selectedTagsByTab[activeTab]] : [];
    };
       
    // Sets the selected tags for the given tab
    const setSelectedTags = (activeTab, newTags) => {
        if (!Array.isArray(newTags)) return;
        selectedTagsByTab[activeTab] = [...newTags];
    };
                    
    // Reapply the "selected" class on tag buttons based on the active tab’s selection
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
            // Ignore clicks if the element is not a tag button or is within an overlay
            if (
                !target.classList.contains("tag-button") ||
                target.closest(".add-block-overlay") ||
                target.closest(".edit-block-overlay")
            ) {
                return;
            }
        
            // Get the active tab (default to "tab4") and its numeric suffix
            const activeTab = document.querySelector(".tab-button.active")?.dataset.tab || "tab4";
            const tabNumber = activeTab.replace("tab", "");
        
            // Retrieve and update the selected tags for this active tab
            let updatedTags = [...tagHandler.getSelectedTags(activeTab)];
            const tag = target.dataset.tag.trim();
            if (updatedTags.includes(tag)) {
                updatedTags = updatedTags.filter(t => t !== tag);
            } else {
                updatedTags.push(tag);
            }
            tagHandler.setSelectedTags(activeTab, updatedTags);
        
            // Get the search input specific to this tab and its current query
            const searchInput = document.getElementById(`search_input_${tabNumber}`);
            if (!searchInput) {
                console.error(`❌ Error: search_input_${tabNumber} not found!`);
                return;
            }
            const searchQuery = searchInput.value.trim().toLowerCase();
        
            // Retrieve all blocks for the active tab
            let filteredBlocks = appManager.getBlocks(activeTab);
        
            // Separate character type filters from regular tag filters
            const characterTypes = ["Hazard", "Crank", "Spell", "Magic Item"];
            const typeFilters = updatedTags.filter(t => characterTypes.includes(t));
            const tagFilters = updatedTags.filter(t => !characterTypes.includes(t));

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
        
            // Apply search filtering if a query is present
            if (searchQuery.length > 0) {
                filteredBlocks = filteredBlocks.filter(block =>
                    block.title.toLowerCase().includes(searchQuery) ||
                    stripHTML(block.text).toLowerCase().includes(searchQuery)
                );
            }
                      
            // Re-render blocks for the active tab using the filtered list,
            // then update the tag UI so that the selected tags remain highlighted.
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
        let selectedTags = getSelectedTags(); // Fetch currently selected tags
        if (selectedTags.length === 0) return blocks; // If no tags selected, return all
    
        // ✅ Filter blocks based on selected tags
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
