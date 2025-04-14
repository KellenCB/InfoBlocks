// appManager.js
import { categoryTags } from './tagConfig.js';
import { blockTemplate } from './blockTemplate.js';
import { tagHandler } from './tagHandler.js';

const normalizeTag = tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();

/* ===================================================================*/
/* ======================== ... TOOLTIP ==============================*/
/* ===================================================================*/

// Attach tooltip behavior to a list of elements.
function attachTooltipHandlers(elements) {
  elements.forEach(el => {
    // Remove any existing listeners to avoid duplicate bindings.
    el.removeEventListener("mouseenter", tooltipMouseEnter);
    el.removeEventListener("mouseleave", tooltipMouseLeave);
    
    el.addEventListener("mouseenter", tooltipMouseEnter);
    el.addEventListener("mouseleave", tooltipMouseLeave);
  });
}

function tooltipMouseEnter(e) {
  const el = e.currentTarget;

  el._tooltipTimer = setTimeout(() => {
      const tooltip = document.createElement("div");
      tooltip.classList.add("text-tooltip");
      tooltip.textContent = el.textContent;
      document.body.appendChild(tooltip);
      const rect = el.getBoundingClientRect();
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.bottom + 5}px`;
      el._tooltip = tooltip;
  }, 750);
}

function tooltipMouseLeave(e) {
  const el = e.currentTarget;
  clearTimeout(el._tooltipTimer);
  if (el._tooltip) {
    el._tooltip.remove();
    el._tooltip = null;
  }
}

// Convenience function to attach tooltips to dynamic block and attack elements.
function attachDynamicTooltips() {
  // Adjust these selectors as needed to target the elements you want (e.g. the block title and attack row)
  const targets = document.querySelectorAll(".block-title h4, .attack-name, .attack-description");
  attachTooltipHandlers(targets);
}    

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
        tab = "tab1";
      }
      
      const tabSuffix = tab.replace("tab", ""); // e.g., "1" or "2"
      const sectionId = `results_section_${tabSuffix}`;
      const resultsSection = document.getElementById(sectionId);
      if (!resultsSection) return;
      const selectedNew = currentSortMode === "newest" ? "selected" : "";
      const selectedOld = currentSortMode === "oldest" ? "selected" : "";
      const selectedAlpha = currentSortMode === "alpha" ? "selected" : "";
      
      // Clear old content and render header with unique IDs for sort buttons.
      resultsSection.innerHTML = `
        <div id="results_header_${tabSuffix}" class="results-header">
          <h2 id="results_title_${tabSuffix}" class="section-header" contenteditable="true"></h2>
          <div id="sort_controls_${tabSuffix}" class="sort-controls">
            <span>Sort by:</span>
            <button id="sort_newest_${tabSuffix}" class="sort-button ${selectedNew}">
              <i class="fas fa-sort-numeric-down"></i> Newest
            </button>
            <button id="sort_oldest_${tabSuffix}" class="sort-button ${selectedOld}">
              <i class="fas fa-sort-numeric-up"></i> Oldest
            </button>
            <button id="sort_alpha_${tabSuffix}" class="sort-button ${selectedAlpha}">
              <i class="fas fa-sort-alpha-down"></i> A-Z
            </button>
          </div>
        </div>
      `;
    
    
        // In tab6, insert the three permanent editable elements at the top.
        if (tab === "tab6") {
            const permanentItems = [
              { id: "perm1", defaultValue: "00" },
              { id: "perm2", defaultValue: "00" },
              { id: "perm3", defaultValue: "00" }
            ];
            const colorClasses = {
              perm1: "gold-bg",
              perm2: "silver-bg",
              perm3: "copper-bg"
            };
          
            let permanentHTML = "";
            permanentItems.forEach(({ id, defaultValue }) => {
              const savedValue = localStorage.getItem(`permanentItem_${id}`) || defaultValue;
              permanentHTML += `
                <div class="block minimized permanent-block ${colorClasses[id]}" data-id="${id}">
                  <h4 class="permanent-title" contenteditable="true">${savedValue}</h4>
                </div>
              `;
            });
            // Insert a container wrapping the permanent items.
            resultsSection.insertAdjacentHTML("beforeend", `
              <div class="permanent-items-container">
                ${permanentHTML}
              </div>
            `);
        }
                
        // Render user blocks
        const blocks = filteredBlocks || getBlocks(tab);
        console.log(`📦 Blocks to render for ${tab}:`, blocks);
        if (blocks.length === 0) {
          console.warn(`⚠️ No blocks found for ${tab}`);
        }
        blocks.forEach(block => {
          resultsSection.insertAdjacentHTML("beforeend", blockTemplate(block));
        });
        console.log(`✅ UI updated: Blocks re-rendered for ${tab}`);
      
        // Reattach sort event listeners for this tab
        document.getElementById(`sort_newest_${tabSuffix}`).addEventListener("click", () => sortBlocks("newest"));
        document.getElementById(`sort_oldest_${tabSuffix}`).addEventListener("click", () => sortBlocks("oldest"));
        document.getElementById(`sort_alpha_${tabSuffix}`).addEventListener("click", () => sortBlocks("alpha"));
      
        // Attach event listeners to the permanent titles (only for tab6)
        if (tab === "tab6") {
          resultsSection.querySelectorAll(".permanent-title").forEach(titleEl => {
            titleEl.addEventListener("blur", () => {
              const blockId = titleEl.parentElement.getAttribute("data-id");
              localStorage.setItem(`permanentItem_${blockId}`, titleEl.textContent.trim());
            });
          });
        }
      
        // Attach click-to-toggle view behavior for non-permanent blocks.
        document.querySelectorAll(`#${sectionId} .block:not(.permanent-block)`).forEach(blockEl => {
          blockEl.addEventListener("click", function (e) {
            // Ignore clicks on action buttons and tag buttons
            if (e.target.closest(".action-button") || e.target.closest(".tag-button") || e.target.closest(".circle")) return;
        
            const blockId = blockEl.getAttribute("data-id");
            const blocksArr = appManager.getBlocks(tab);
            const targetBlock = blocksArr.find(b => b.id === blockId);
            if (!targetBlock) return;
            
            // Toggle view state
            if (targetBlock.viewState === "expanded") {
              const activeState = localStorage.getItem(`activeViewState_${tab}`) || "condensed";
              targetBlock.viewState = activeState;
            } else {
              targetBlock.viewState = "expanded";
            }
            
            localStorage.setItem(`userBlocks_${tab}`, JSON.stringify(blocksArr));
            
            // Retrieve the current search query
            let filteredBlocks = blocksArr;
            const searchInput = document.getElementById(`search_input_${tab.replace("tab", "")}`);
            if (searchInput && searchInput.value.trim() !== "") {
              const query = searchInput.value.trim().toLowerCase();
              filteredBlocks = filteredBlocks.filter(block =>
                block.title.toLowerCase().includes(query) ||
                block.text.toLowerCase().includes(query)
              );
            }
            
            // Apply tag filters if any are selected
            const selectedTags = tagHandler.getSelectedTags(tab);
            if (selectedTags.length > 0) {
              filteredBlocks = filteredBlocks.filter(block =>
                selectedTags.every(selectedTag =>
                  block.tags.some(blockTag => normalizeTag(blockTag) === normalizeTag(selectedTag))
                )
              );
          }
            
            // Re-render blocks using the filtered list
            appManager.renderBlocks(tab, filteredBlocks);
          });
        });
      
        appManager.updateTags();
        initializeTitles();
        attachDynamicTooltips();
      };
      
      const sortBlocks = (mode) => {
        currentSortMode = mode;
        const activeTab = getActiveTab();
        const tabSuffix = activeTab.replace("tab", "");
        
        // Remove "selected" class from all sort buttons in the current tab's sort controls.
        document.querySelectorAll(`#sort_controls_${tabSuffix} .sort-button`)
          .forEach(btn => btn.classList.remove("selected"));
        
        // Add the selected style to the button for the chosen sort mode.
        const sortBtn = document.getElementById(`sort_${mode}_${tabSuffix}`);
        if (sortBtn) {
          sortBtn.classList.add("selected");
        }
        
        // Get the blocks, filter by any tags if necessary, and sort them.
        let sortedBlocks = getBlocks(activeTab);
        const selectedTags = tagHandler.getSelectedTags();
        if (selectedTags.length > 0) {
          sortedBlocks = sortedBlocks.filter(block =>
            selectedTags.every(tag => block.tags.includes(tag))
          );
        }
        
        // Re-render the blocks in the active tab.
        renderBlocks(activeTab, sortedBlocks);
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
            .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase())
            .sort((a, b) => a.localeCompare(b));
               
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
      // Get the active tab (e.g., "tab1") and its numeric suffix
      const activeTab = getActiveTab();
      const tabSuffix = activeTab.replace("tab", "");
    
      // Get all tags used in blocks for this tab
      const usedTags = getTags(activeTab);
    
      // Fetch the selected tags for this active tab (the per‑tab filter)
      const selectedTags = tagHandler.getSelectedTags(activeTab);
    
      // Get all predefined tags from tagConfig.js
      const allPredefined = Object.values(categoryTags).flatMap(cat => cat.tags);
      // Determine user-defined tags (those not in the predefined list)
      const usedUserTags = usedTags
        .filter(tag => !allPredefined.includes(tag))
        .sort((a, b) => a.localeCompare(b));
        
      let html = "";
    
      // Render user-defined tags first
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
    
      // Then render predefined tags grouped by category that apply to the active tab
      Object.keys(categoryTags).forEach(category => {
        if (!categoryTags[category].tabs.includes(activeTab)) return;
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
    
      // Reapply the "selected" class on all tag buttons in the active tab
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

    const saveBlock = (tab, blockTitle, text, tags, uses, blockId = null, timestamp = null) => {
      console.log(`📥 Attempting to save block in ${tab}:`, { blockTitle, text, tags, uses, blockId, timestamp });
      
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
                  uses, // update the uses property here
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
              uses, // include the uses state here
              timestamp: timestamp || Date.now(),
              viewState: "expanded"
          };
                  
          userBlocks.unshift(newBlock);
          console.log("✅ New Block Saved:", newBlock);
      }
      
      localStorage.setItem(`userBlocks_${tab}`, JSON.stringify(userBlocks));
      return true;
      };
                      
    const removeBlock = (blockId) => {
        if (!blockId) return;
    
        const activeTab = getActiveTab();
        let userBlocks = getBlocks(activeTab);
    
        const updatedBlocks = userBlocks.filter(block => block.id !== blockId);
        localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(updatedBlocks));;
    };
        

    // ========================
    // HELPER FUNCTIONS
    // ========================

    // Clear all filters
    const clearFilters = () => {
      console.log("Clearing all selected filters...");
      
      // Determine active tab and its number
      const activeTab = appManager.getActiveTab();
      const tabNumber = activeTab.replace("tab", "");
      
      // Clear the search input for the current tab
      const searchInput = document.getElementById(`search_input_${tabNumber}`);
      if (searchInput) {
          searchInput.value = "";
      }
      
      // Unselect all tag buttons only in the current tab
      document.querySelectorAll(`#tab${tabNumber} .tag-button.selected`).forEach(tag => {
          tag.classList.remove("selected");
      });
      
      // Clear the selected tags state for this tab in tagHandler
      tagHandler.clearSelectedTags(activeTab);
      
      // Re-render blocks for the current tab without filters
      appManager.renderBlocks(activeTab, appManager.getBlocks(activeTab));
      
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
