// appManager.js
import { categoryTags } from './tagConfig.js';
import { blockTemplate } from './blockTemplate.js';
import { tagHandler } from './tagHandler.js';

export const appManager = (() => {
    let userBlocks = JSON.parse(localStorage.getItem("userBlocks")) || [];
    let title = localStorage.getItem("pageTitle") || "Information Blocks";
    
    const resultsSection = document.getElementById("results_section");
    // ========================
    // BLOCKS
    // ========================

    // Render blocks in the results section
    const renderBlocks = (blocks) => {
        // ✅ Render only the HTML structure; do NOT set results_title text
        resultsSection.innerHTML = `
            <div id="results_header" class="results-header">
                <h2 id="results_title" class="section-header" contenteditable="true"></h2>
                <div id="sort_controls" class="sort-controls">
                    <span>Sort by:</span>
                    <button id="sort_newest" class="sort-button">
                        <i class="fas fa-sort-numeric-down"></i> Newest
                    </button>
                    <button id="sort_oldest" class="sort-button">
                        <i class="fas fa-sort-numeric-up"></i> Oldest
                    </button>
                    <button id="sort_alpha" class="sort-button">
                        <i class="fas fa-sort-alpha-down"></i> A-Z
                    </button>
                </div>
            </div>
        `;
    
        // ✅ Restore the active sort button
        const activeSort = document.querySelector(".sort-button.selected")?.id || "sort_newest";
        document.getElementById(activeSort)?.classList.add("selected");
    
        // ✅ Render the blocks
        blocks.forEach(block => {
            resultsSection.insertAdjacentHTML("beforeend", blockTemplate(block));
        });
    
        console.log("✅ UI updated: Blocks fully re-rendered.");
        
        // ✅ Attach sorting event listeners
        document.getElementById("sort_newest").addEventListener("click", () => sortBlocks("newest"));
        document.getElementById("sort_oldest").addEventListener("click", () => sortBlocks("oldest"));
        document.getElementById("sort_alpha").addEventListener("click", () => sortBlocks("alpha"));
    
        appManager.updateTags(); // ✅ Ensure tags update
    
        // ✅ After rendering, initialize the title handling in page-title.js
        initializeTitles();
    };

    // ✅ Sorting function
    const sortBlocks = (mode) => {
        currentSortMode = mode; // ✅ Update global sorting mode
    
        // ✅ Remove "selected" class from all buttons
        document.querySelectorAll(".sort-button").forEach(btn => btn.classList.remove("selected"));
    
        // ✅ Highlight the newly selected sort button
        document.getElementById(`sort_${mode}`).classList.add("selected");
    
        // ✅ Get and sort blocks
        let sortedBlocks = getBlocks(); // This retrieves all blocks and applies sorting
    
        // ✅ Apply currently selected tag filters
        const selectedTags = tagHandler.getSelectedTags();
        if (selectedTags.length > 0) {
            sortedBlocks = sortedBlocks.filter(block =>
                selectedTags.every(tag => block.tags.includes(tag))
            );
        }
    
        // ✅ Re-render blocks with sorting + filtering applied
        renderBlocks(sortedBlocks);
    };
            
    // Load blocks from localStorage (if they exist)
    const loadBlocks = () => {
        const savedBlocks = JSON.parse(localStorage.getItem("userBlocks"));
        if (Array.isArray(savedBlocks)) {
            userBlocks = savedBlocks; // Update userBlocks
            console.log("Blocks loaded from localStorage:", userBlocks);
        } else {
            console.warn("No valid blocks found in localStorage");
        }
    };

    let currentSortMode = "newest"; // ✅ Default sorting mode

    const getBlocks = () => {
        const storedBlocks = localStorage.getItem("userBlocks");
        const parsedBlocks = storedBlocks ? JSON.parse(storedBlocks) : [];
    
        // ✅ Apply sorting based on the currently selected mode
        if (currentSortMode === "newest") {
            parsedBlocks.sort((a, b) => b.timestamp - a.timestamp);
        } else if (currentSortMode === "oldest") {
            parsedBlocks.sort((a, b) => a.timestamp - b.timestamp);
        } else if (currentSortMode === "alpha") {
            parsedBlocks.sort((a, b) => a.title.localeCompare(b.title));
        }
    
        return parsedBlocks;
    };
                    
    // ========================
    // TAGS
    // ========================

    // Render tags in the tags list
    const renderTags = (tags, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID "${containerId}" not found`);
            return;
        }
    
        const predefinedTagsSet = new Set(Object.values(categoryTags).flatMap(data => data.tags));
        const userGeneratedTags = tags
            .filter(tag => !predefinedTagsSet.has(tag))
            .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());
    
        const predefinedTags = tags.filter(tag => predefinedTagsSet.has(tag));
        const selectedTags = tagHandler.getSelectedTags(); // ✅ Fetch from tagHandler
    
        container.innerHTML = [...predefinedTags, ...userGeneratedTags]
            .map(tag => {
                const category = Object.entries(categoryTags).find(([_, data]) => data.tags.includes(tag));
                const tagClass = category ? category[1].className : "tag-user";
                const isSelected = selectedTags.includes(tag) ? "selected" : ""; // ✅ Fix applied
                return `<button class="tag-button ${tagClass} ${isSelected}" data-tag="${tag}">${tag}</button>`;
            })
            .join("");
    
        console.log("✅ Final Rendered Tags");
    };
    
    // Update tags (predefined & user-generated)
    const updateTags = () => {
        const usedTags = getTags(); // ✅ Get all tags actually used in blocks
        const selectedTags = tagHandler.getSelectedTags(); // ✅ Get currently selected tags
    
        const predefinedTags = Object.values(categoryTags).flatMap(cat => cat.tags);
        const userTags = usedTags.filter(tag => !predefinedTags.includes(tag)); // ✅ Extract user-defined tags
    
        // ✅ Ensure predefined category tags only include used ones
        Object.keys(categoryTags).forEach(category => {
            const categoryTagList = categoryTags[category]?.tags || [];
            const validTags = categoryTagList.filter(tag => usedTags.includes(tag)); // ✅ Only show used predefined tags
            renderTags(validTags, `${category}_tags_list`);
        });
    
        // ✅ Render user-defined tags separately
        if (userTags.length > 0) {
            renderTags(userTags, "user_tags_list");
        } else {
            document.getElementById("user_tags_list").innerHTML = "<p>No user-defined tags</p>"; // ✅ Handle empty state
        }
    
        // ✅ Ensure selected tags remain visually selected
        setTimeout(() => {
            document.querySelectorAll(".tag-button").forEach(tagElement => {
                if (selectedTags.includes(tagElement.dataset.tag)) {
                    tagElement.classList.add("selected"); // ✅ Keep selected tags highlighted
                } else {
                    tagElement.classList.remove("selected");
                }
            });
        }, 50);
    
        console.log("✅ Updated tag filtering: Displaying only used predefined and user-defined tags.");
    };    
        
    const getTags = () => {
        const predefinedTags = new Set(Object.values(categoryTags).flatMap(cat => cat.tags));
        const usedTags = new Set();

        userBlocks.forEach(block => {
            block.tags.forEach(tag => {
                if (predefinedTags.has(tag)) {
                    usedTags.add(tag);
                } else {
                    usedTags.add(tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());
                }
            });
        });

        return Array.from(usedTags);
    };

    // Get filtered tags based on category
    const getFilteredTags = (category) => {
        const blocks = getBlocks();
        const predefinedTags = categoryTags[category]?.tags || [];
        const filteredTags = blocks
            .flatMap(block => block.tags)
            .filter(tag => predefinedTags.includes(tag));
        return [...new Set(filteredTags)]; // Remove duplicates
    };

    // Get predefined tags by category
    const getPredefinedTags = (tagCategory) => {
        return categoryTags[tagCategory]?.tags || [];
    };

    // Get only user-entered tags (excluding predefined ones)
    const getUserDefinedTags = () => {
        const blocks = getBlocks();
        const predefinedTags = Object.values(categoryTags).flatMap(category => category.tags);
        const userDefinedTags = blocks
            .flatMap(block => block.tags)
            .filter(tag => !predefinedTags.includes(tag));
        return [...new Set(userDefinedTags)];
    };


    // ========================
    // DATA MANAGEMENT FUNCTIONS
    // ========================

    const saveBlock = (blockTitle, text, tags, blockId = null, timestamp = null) => {
        console.log("📥 Before Saving - Incoming Block Data:", { blockTitle, text, tags, blockId, timestamp });
    
        if (!blockTitle || !text) {
            console.error("❌ Block title and text are required");
            return false;
        }
    
        const normalizeTag = (tag) => {
            const predefinedTagsSet = new Set(Object.values(categoryTags).flatMap(data => data.tags));
            return predefinedTagsSet.has(tag) ? tag : tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
        };
    
        const allTags = [...new Set(tags.map(normalizeTag))];
    
        if (blockId) {
            const blockIndex = userBlocks.findIndex(block => block.id === blockId);
            if (blockIndex !== -1) {
                userBlocks[blockIndex] = {
                    ...userBlocks[blockIndex],
                    title: blockTitle,
                    text,
                    tags: allTags,
                    timestamp: userBlocks[blockIndex].timestamp || Date.now() // ✅ Ensure timestamp is preserved
                };
                console.log("🛠 Updated Block Data:", userBlocks[blockIndex]);
            } else {
                console.error(`❌ Block with ID "${blockId}" not found.`);
                return false;
            }
        } else {
            const newBlock = {
                id: crypto.randomUUID(),
                title: blockTitle,
                text,
                tags: allTags,
                timestamp: timestamp || Date.now() // ✅ Use provided timestamp, else generate new one
            };
            userBlocks.unshift(newBlock);
            console.log("✅ New Block Saved:", newBlock);
        }
    
        localStorage.setItem("userBlocks", JSON.stringify(userBlocks));
        renderBlocks(userBlocks);
        updateTags();
    
        return true;
    };
        
    const removeBlock = (blockId) => {
        if (!blockId) {
            console.error("Error: Block ID is undefined.");
            return;
        }

        const updatedBlocks = userBlocks.filter(block => block.id !== blockId);
        userBlocks = updatedBlocks;
        localStorage.setItem("userBlocks", JSON.stringify(updatedBlocks));
        renderBlocks(updatedBlocks);
    };

    // ========================
    // HELPER FUNCTIONS
    // ========================

    // Clear all filters
    const clearFilters = () => {
        console.log("Clearing all selected filters...");

        document.querySelectorAll(".tag-button.selected").forEach(tag => tag.classList.remove("selected"));
        document.getElementById("search_input").value = "";
        renderBlocks(getBlocks());

        console.log("✅ Filters cleared.");
    };

    // Clear all data (blocks and title)
    const clearData = () => {
        console.log("Clearing all data...");

        userBlocks = [];
        title = "Information Blocks";
        localStorage.removeItem("userBlocks");
        localStorage.removeItem("pageTitle");

        document.querySelectorAll(".circle").forEach(circle => circle.classList.remove("filled"));
        document.querySelector("header.title-section h1").textContent = "INFORMATION BLOCKS";

        renderBlocks([]);
        updateTags();

        console.log("✅ All data cleared.");
    };

    // Get all data for JSON export
    const getPageData = () => ({
        title,
        blocks: userBlocks
    });

    return {
        // BLOCKS
        renderBlocks,
        loadBlocks,
        getBlocks,

        // TAGS
        renderTags,
        updateTags,
        getTags,
        getFilteredTags,
        getPredefinedTags,
        getUserDefinedTags,

        // Data management
        saveBlock,
        removeBlock,

        // Helper functions
        clearFilters,
        clearData,
        getPageData
    };
})();
