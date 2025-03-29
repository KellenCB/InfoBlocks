import { appManager } from './appManager.js';
import { categoryTags } from './tagConfig.js';

export const tagHandler = (() => {

    let selectedTags = []; // ✅ Single source of truth

    const getSelectedTags = () => [...selectedTags]; // Read-only getter
   
    const setSelectedTags = (newTags) => {
        if (!Array.isArray(newTags)) return;
        
        selectedTags.length = 0;
        selectedTags.push(...newTags);
    };
                    
    const applyFiltersAfterSave = () => {
        console.log("🔍 Reapplying selected tags:", selectedTags);
        document.querySelectorAll(".tag-button").forEach(tagElement => {
            tagElement.classList.toggle("selected", selectedTags.includes(tagElement.dataset.tag));
        });
    };
    
    const clearSelectedTags = () => {
        setSelectedTags([]);
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
            if (!target.classList.contains("tag-button")) return;
    
            const tag = target.dataset.tag.trim();
            let updatedTags = [...tagHandler.getSelectedTags()];
    
            updatedTags.includes(tag)
                ? updatedTags = updatedTags.filter(t => t !== tag)
                : updatedTags.push(tag);
    
            tagHandler.setSelectedTags(updatedTags);
    
            const activeTab = document.querySelector(".tab-button.active")?.dataset.tab;
            const searchInput = document.getElementById(`search_input_${activeTab.replace("tab", "")}`);
    
            if (!searchInput) {
                console.error(`❌ Error: search_input_${activeTab} not found!`);
                return;
            }
    
            const searchQuery = searchInput.value.trim().toLowerCase();
            
            // ✅ Get blocks for the active tab
            let filteredBlocks = appManager.getBlocks(activeTab);
    
            // ✅ Apply tag filtering
            if (updatedTags.length > 0) {
                filteredBlocks = filteredBlocks.filter(block =>
                    updatedTags.every(t => block.tags.includes(t))
                );
            }
    
            // ✅ Apply search filtering
            if (searchQuery.length > 0) {
                filteredBlocks = filteredBlocks.filter(block =>
                    block.title.toLowerCase().includes(searchQuery) ||
                    block.text.toLowerCase().includes(searchQuery)
                );
            }
    
            // ✅ Fix: Pass filteredBlocks to renderBlocks
            appManager.renderBlocks(activeTab, filteredBlocks);
    
            console.log("🔵 Currently selected tags:", updatedTags);
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
