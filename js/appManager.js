// appManager.js
import { categoryTags } from './tagConfig.js';
import { blockTemplate } from './blockTemplate.js';
import { tagHandler } from './tagHandler.js';

export const appManager = (() => {
    let userBlocks = JSON.parse(localStorage.getItem("userBlocks")) || [];
    let title = localStorage.getItem("pageTitle") || "Information Blocks";
    
    const resultsSection = document.getElementById("results_section");
   
    // ========================
    // TABS
    // ========================

    const getActiveTab = () => {
        return document.querySelector(".tab-button.active")?.dataset.tab || "tab1";
    };
   
    // ========================
    // BLOCKS
    // ========================

    // Render blocks in the results section
    const renderBlocks = (tab = getActiveTab(), filteredBlocks = null) => {
        console.log("🔍 Checking tab value:", tab, typeof tab);
    
        if (typeof tab !== "string") {
            console.error("❌ Error: 'tab' should be a string but got:", tab);
            tab = "tab1"; // Fallback to default tab
        }
    
        const resultsSection = document.getElementById(`results_section_${tab.replace("tab", "")}`);
        if (!resultsSection) {
            return;
        }
    
        resultsSection.innerHTML = ""; // ✅ Clear old blocks
    
        // ✅ Get blocks, either from the provided filteredBlocks or fetch all
        const blocks = filteredBlocks || getBlocks(tab);
        console.log(`📦 Blocks to render for ${tab}:`, blocks);
    
        resultsSection.innerHTML = `
            <div id="results_header" class="results-header">
                <h2 id="results_title_${tab.replace("tab", "")}" class="section-header" contenteditable="true"></h2>
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
    
        if (blocks.length === 0) {
            console.warn(`⚠️ No blocks found for ${tab}`);
        }
    
        blocks.forEach(block => {
            resultsSection.insertAdjacentHTML("beforeend", blockTemplate(block));
        });
    
        console.log(`✅ UI updated: Blocks re-rendered for ${tab}`);
    
        document.getElementById("sort_newest").addEventListener("click", () => sortBlocks("newest"));
        document.getElementById("sort_oldest").addEventListener("click", () => sortBlocks("oldest"));
        document.getElementById("sort_alpha").addEventListener("click", () => sortBlocks("alpha"));
    
        appManager.updateTags();
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
        let sortedBlocks = getBlocks(getActiveTab());
    
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
        const savedBlocks = localStorage.getItem("userBlocks");
        if (savedBlocks) {
            const parsedBlocks = JSON.parse(savedBlocks);
            if (Array.isArray(parsedBlocks)) {
                userBlocks = parsedBlocks;
                console.log("Blocks loaded from localStorage:", userBlocks);
                return;
            }
        }
        console.log("No valid 'userBlocks' found in localStorage");
    };
    

    let currentSortMode = "newest"; // ✅ Default sorting mode

    const getBlocks = (tab = getActiveTab()) => {
        const storedBlocks = localStorage.getItem(`userBlocks_${tab}`);
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
        const activeTab = getActiveTab(); // e.g., "tab1" or "tab2"
        const tabSuffix = activeTab.replace("tab", ""); // "1" or "2"
        const usedTags = getTags(activeTab); // all tags used in blocks for the active tab
        const selectedTags = tagHandler.getSelectedTags();
    
        // All predefined tags across categories from tagConfig.js
        const allPredefined = Object.values(categoryTags).flatMap(cat => cat.tags);
        // User-defined tags are those not included in the predefined list
        const usedUserTags = usedTags.filter(tag => !allPredefined.includes(tag));
    
        let html = "";
    
        // Render user-defined tags first in a unified container
        if (usedUserTags.length > 0) {
            html += `<div class="tag-category user-tags" id="user_tags_${tabSuffix}">`;
            html += usedUserTags.map(tag => {
                const isSelected = selectedTags.includes(tag) ? "selected" : "";
                return `<button class="tag-button tag-user ${isSelected}" data-tag="${tag}">${tag}</button>`;
            }).join("");
            html += `</div>`;
        } else {
            html += `<div class="tag-category user-tags" id="user_tags_${tabSuffix}"><p>No user-defined tags</p></div>`;
        }
    
        // Then render predefined tags by category
        Object.keys(categoryTags).forEach(category => {
            // Only render this category if it applies to the active tab.
            if (!categoryTags[category].tabs.includes(activeTab)) {
                return;
            }
            // Get predefined tags for this category that are used
            const usedPredefined = categoryTags[category].tags.filter(tag => usedTags.includes(tag));
            if (usedPredefined.length > 0) {
                html += `<div class="tag-category" id="${category}_tags_list_${tabSuffix}">`;
                html += usedPredefined.map(tag => {
                    const isSelected = selectedTags.includes(tag) ? "selected" : "";
                    return `<button class="tag-button ${categoryTags[category].className} ${isSelected}" data-tag="${tag}">${tag}</button>`;
                }).join("");
                html += `</div>`;
            }
        });
    
        // Update the unified container for tags in the active tab
        const unifiedContainer = document.getElementById(`dynamic_tags_section_${tabSuffix}`);
        if (unifiedContainer) {
            unifiedContainer.innerHTML = html;
        }
    
        // Update selected tag highlighting for all tag buttons in the active tab
        const activeTabElement = document.getElementById(activeTab);
        if (activeTabElement) {
            activeTabElement.querySelectorAll(".tag-button").forEach(tagElement => {
                if (selectedTags.includes(tagElement.dataset.tag)) {
                    tagElement.classList.add("selected");
                } else {
                    tagElement.classList.remove("selected");
                }
            });
        }
    
        console.log(`✅ Tags updated for ${activeTab}`);
    };
                
    const getTags = (tab = getActiveTab()) => {
        const predefinedTags = new Set(Object.values(categoryTags).flatMap(cat => cat.tags));
        const usedTags = new Set();
    
        let userBlocks = getBlocks(tab); // ✅ Get blocks for the correct tab
    
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

    const saveBlock = (tab, blockTitle, text, tags, blockId = null, timestamp = null) => {
        console.log(`📥 Attempting to save block in ${tab}:`, { blockTitle, text, tags, blockId, timestamp });
    
        if (!blockTitle || !text) {
            console.error("❌ Block title and text are required");
            return false;
        }
    
        let userBlocks = getBlocks(tab);
    
        console.log(`📦 Blocks retrieved for ${tab}:`, userBlocks);
    
        let isEdit = Boolean(blockId);
        if (isEdit) {
            const blockIndex = userBlocks.findIndex(block => block.id === blockId);
    
            if (blockIndex !== -1) {
                userBlocks[blockIndex] = {
                    ...userBlocks[blockIndex],
                    title: blockTitle,
                    text,
                    tags,
                    timestamp: userBlocks[blockIndex].timestamp || Date.now()
                };
                console.log("🛠 Updated Block Data:", userBlocks[blockIndex]);
            } else {
                console.error(`❌ Block with ID "${blockId}" not found in tab ${tab}.`);
                console.log("📦 Current Blocks:", userBlocks);
                return false;
            }
        } else {
            const predefinedTagsSet = new Set(Object.values(categoryTags).flatMap(cat => cat.tags));
            const formattedTags = tags.map(tag => 
                predefinedTagsSet.has(tag) ? tag : tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase()
            );        

            const newBlock = {
                id: crypto.randomUUID(),
                title: blockTitle,
                text: text,
                tags: formattedTags,
                timestamp: timestamp || Date.now(),
                viewState: "expanded" // default state; later you can change this based on user actions or tab settings
                };
                
            userBlocks.unshift(newBlock);
            console.log("✅ New Block Saved:", newBlock);
        }
    
        localStorage.setItem(`userBlocks_${tab}`, JSON.stringify(userBlocks));
        renderBlocks();
        updateTags();
    
        return true;
    };
                    
    const removeBlock = (blockId) => {
        if (!blockId) return;
    
        const activeTab = getActiveTab();
        let userBlocks = getBlocks(activeTab);
    
        const updatedBlocks = userBlocks.filter(block => block.id !== blockId);
        localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(updatedBlocks));
    
        renderBlocks(activeTab);
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
        // TABS
        getActiveTab,

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
