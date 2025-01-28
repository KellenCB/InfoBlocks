import { dataManager } from '../dataManager.js';
import { uiManager } from '../uiManager.js';

export const tagHandler = (() => {
    let selectedTags = [];

    const handleTagClick = () => {
        const allTagLists = [
            "tags_list",
            "part_type_tags_list",
            "action_type_tags_list",
            "ability_type_tags_list"
        ];
    
        allTagLists.forEach(listId => {
            const tagsList = document.getElementById(listId);
    
            if (tagsList) {
                tagsList.addEventListener("click", (event) => {
                    const target = event.target;
    
                    if (target.classList.contains("tag-button")) {
                        const tag = target.getAttribute("data-tag");
    
                        if (selectedTags.includes(tag)) {
                            selectedTags = selectedTags.filter(t => t !== tag);
                            target.classList.remove("selected");
                        } else {
                            selectedTags.push(tag);
                            target.classList.add("selected");
                        }
    
                        const filteredBlocks = dataManager.getBlocks().filter(block =>
                            selectedTags.every(t => block.tags.includes(t))
                        );
                        uiManager.renderBlocks(filteredBlocks);
                    }
                });
            }
        });
    };

    // Clear selected tags from all lists
    const clearSelectedTags = () => {
        selectedTags = [];

        // Lists to clear selections
        const allTagLists = [
            "tags_list",
            "part_type_tags_list",
            "action_type_tags_list",
            "ability_type_tags_list"
        ];

        // Iterate through all tag lists and remove 'selected' class from buttons
        allTagLists.forEach(listId => {
            const tagsList = document.getElementById(listId);
            if (tagsList) {
                const tagButtons = tagsList.querySelectorAll(".tag-button");
                tagButtons.forEach(button => {
                    button.classList.remove("selected");
                });
            }
        });

        // Re-render all blocks to show the unfiltered list
        uiManager.renderBlocks(dataManager.getBlocks());
        console.log("All selected tags cleared.");
    };

    return { handleTagClick, clearSelectedTags };
})();
