
import { sortingLogic } from './sortingLogic.js';

console.log("dataManager.js loaded");

export const dataManager = (() => {
    // Initialize blocks and title from localStorage
    let userBlocks = JSON.parse(localStorage.getItem("userBlocks")) || [];
    let title = localStorage.getItem("pageTitle") || "Information Blocks";

    const predefinedTags = [
        "helm", "torso", "left arm", "right arm", "legs", "boots",
        "action", "reaction", "bonus action",
        "Damage", "buff", "heal", "move speed",
    ];

    const saveBlock = (blockTitle, text, tags, blockId = null) => {
        console.log("Before saving:", JSON.parse(localStorage.getItem("userBlocks")));
        console.log("Incoming data:", { blockTitle, text, tags, blockId });
    
        if (!blockTitle || !text) {
            console.error("Block title and text are required");
            return false;
        }
    
        // Ensure tags is an array and remove duplicates
        const validatedTags = Array.isArray(tags) ? [...new Set(tags)] : [];
    
        // Fetch existing blocks
        let blocks = getBlocks();
    
        if (blockId) {
            // Update an existing block
            const blockIndex = blocks.findIndex(block => block.id === blockId);
            if (blockIndex !== -1) {
                blocks[blockIndex] = { id: blockId, title: blockTitle, text, tags: validatedTags };
                console.log("Block updated:", blocks[blockIndex]);
            } else {
                console.error(`Block with ID "${blockId}" not found.`);
                return false;
            }
        } else {
            // Create a new block with a unique ID
            const newBlock = {
                id: crypto.randomUUID(),
                title: blockTitle,
                text,
                tags: validatedTags,
            };
            blocks.push(newBlock);
            console.log("New block saved:", newBlock);
        }
    
        // Update userBlocks to match localStorage
        userBlocks = blocks;
    
        // Persist updated blocks
        localStorage.setItem("userBlocks", JSON.stringify(blocks));
        console.log("After saving:", JSON.parse(localStorage.getItem("userBlocks")));
    
        return true;
    };
        
    
    

    // Remove a specific block
    const removeBlock = (blockId) => {
        if (!blockId) {
            console.error("Error: Block ID is undefined.");
            return;
        }
    
        const blocks = getBlocks(); // Get the latest blocks
        console.log("Blocks before removal:", blocks);
    
        const updatedBlocks = userBlocks.filter(block => block.id !== blockId);
        userBlocks = updatedBlocks; // Update the in-memory array
        localStorage.setItem("userBlocks", JSON.stringify(updatedBlocks));
        console.log("Updated blocks:", updatedBlocks);
        
        if (updatedBlocks.length < blocks.length) {
            console.log(`Block with ID "${blockId}" successfully removed.`);
        } else {
            console.warn(`Block with ID "${blockId}" not found.`);
        }
    };    
    
    
    // Get all blocks (sorted)
    const getBlocks = () => {
        const storedBlocks = localStorage.getItem("userBlocks");
        return storedBlocks ? JSON.parse(storedBlocks) : [];
    };
    

    // Get all unique tags (both user-entered and predefined)
    const getFilteredTags = (category) => {
        const blocks = getBlocks(); // Fetch all blocks
        const predefinedTags = getPredefinedTags(category); // Get predefined tags for the category
    
        // Filter tags from blocks that match predefined tags
        const filteredTags = blocks
            .flatMap(block => block.tags)
            .filter(tag => predefinedTags.includes(tag));
    
        return [...new Set(filteredTags)]; // Remove duplicates
    };
    

    // Get only user-entered tags (exclude predefined tags)
    const getUserDefinedTags = () => {
        const blocks = getBlocks(); // Fetch all blocks
        const predefinedTags = [
            ...getPredefinedTags("partType"),
            ...getPredefinedTags("actionType"),
            ...getPredefinedTags("abilityType"),
        ];
    
        // Filter tags that are not predefined
        const userDefinedTags = blocks
            .flatMap(block => block.tags)
            .filter(tag => !predefinedTags.includes(tag));
    
        return [...new Set(userDefinedTags)]; // Remove duplicates
    };
    
    // Get only predefined tags (exclude user-entered tags)
    const getPredefinedTags = (tagCategory) => {
        const categoryTags = {
            partType: ["Helm", "Torso", "Left arm", "Right arm", "Legs", "Boots", "Other"],
            actionType: ["Action", "Reaction", "Bonus action", "Free action",],
            abilityType: ["Damage", "Buff", "Heal", "Movement", "Ranged", "Melee", "Spell",]
        };
    
        return categoryTags[tagCategory] || [];
    };

     // Clear any tags selected in the filter and search section)
     const clearFilters = () => {
        console.log("Clearing all selected filters...");
    
        // Unselect all selected tags
        const selectedTags = document.querySelectorAll(".tag-button.selected");
        selectedTags.forEach(tag => tag.classList.remove("selected"));
    
        // Clear the search box
        const searchInput = document.getElementById("search_input");
        if (searchInput) searchInput.value = "";
    
        // Reset results by rendering all blocks
        uiManager.renderBlocks(dataManager.getBlocks());
    
        console.log("Filters cleared: Tags unselected and search input reset.");
    };
        

    // Clear all data (blocks and title)
    const clearData = () => {
        console.log("Clearing all data...");
    
        // Reset all stored data
        userBlocks = [];
        title = "Information Blocks"; 
        localStorage.removeItem("userBlocks");
        localStorage.removeItem("pageTitle");
        localStorage.removeItem("circleStates");
    
        // Reset Circles (unfill all)
        const circles = document.querySelectorAll(".circle");
        circles.forEach(circle => circle.classList.remove("filled"));
    
        // Reset Page Title in UI
        const titleElement = document.querySelector("header.title-section h1");
        if (titleElement) {
            titleElement.textContent = "INFORMATION BLOCKS";
        }
    
        // Reset Search & Filters
        const searchInput = document.getElementById("search_input");
        if (searchInput) searchInput.value = "";
    
        // Reset tags & filter sections
        document.getElementById("tags_list").innerHTML = "";
        document.getElementById("part_type_tags_list").innerHTML = "";
        document.getElementById("action_type_tags_list").innerHTML = "";
        document.getElementById("ability_type_tags_list").innerHTML = "";
    
        console.log("All data cleared. Reloading UI...");
    
        // Force a full UI refresh
        window.location.reload();
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
    
    // Get all data for JSON export
    const getPageData = () => ({
        title,
        blocks: userBlocks
    });
    
    const getTags = () => {
        const uniqueTags = new Set();
    
        userBlocks.forEach(block => {
            if (Array.isArray(block.tags)) {
                block.tags.forEach(tag => uniqueTags.add(tag));
            }
        });
    
        return Array.from(uniqueTags);
    };    

    return {
        saveBlock,
        removeBlock,
        getBlocks,
        getFilteredTags,
        getPredefinedTags,
        getUserDefinedTags,
        clearData,
        loadBlocks,
        getPageData,
        getTags,
        clearFilters
    };
})();
