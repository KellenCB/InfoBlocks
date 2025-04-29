// appManager.js
import { categoryTags } from './tagConfig.js';
import { blockTemplate } from './blockTemplate.js';
import { tagHandler } from './tagHandler.js';
import { overlayHandler, initUsesField } from './overlayHandler.js';
import { attachDynamicTooltips } from './tooltips.js';

const normalizeTag = tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();

export function stripHTML(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
}

export let selectedFilterTagsBeforeAdd = [];

/* ==================================================================*/
/* ============================== TABS ==============================*/
/* ==================================================================*/

const getActiveTab = () => {
  return document.querySelector(".tab-button.active")?.dataset.tab || "tab1";
};


/* ==================================================================*/
/* ======================== ACTION BUTTONS ==========================*/
/* ==================================================================*/


export const actionButtonHandlers = (() => {
  const attachActionButtonListeners = () => {

    const activeTab = getActiveTab();  
    const tabSuffix = activeTab.replace("tab", "");  

    const elements = {
      binButtons: document.querySelectorAll(".bin-button"),
      addBlockOverlay: document.querySelector(".add-block-overlay"),
      clearDataOverlay: document.querySelector(".cleardata-overlay"),
      confirmClearButton: document.getElementById("confirm_clear_button"),
      cancelClearButton: document.getElementById("cancel_clear_button"),
    };

    // Add Block Button
    const headerEl = document.getElementById(`results_header_${tabSuffix}`);
    elements.addBlockButton = headerEl
      ? headerEl.querySelector("#add_block_button")
      : null;
    
    if (elements.addBlockButton && elements.addBlockOverlay) {
      elements.addBlockButton.addEventListener("click", () => {
        console.log("➕ Add Block Button Clicked - Resetting Overlay");

        // Store selected filter tags before opening the overlay
        selectedFilterTagsBeforeAdd = tagHandler.getSelectedTags();
        console.log("✅ Stored search & filter tags BEFORE adding a block:", selectedFilterTagsBeforeAdd);

        // Deselect all overlay tags
        document.querySelectorAll(".add-block-overlay .tag-button.selected").forEach(tag => {
          tag.classList.remove("selected");
        });

        // Clear input fields
        const titleInput = document.getElementById("title_input_overlay");
        const textInput = document.getElementById("block_text_overlay");
        const tagInputField = document.getElementById("tags_input_overlay");
        if (titleInput) titleInput.value = "";
        if (textInput) textInput.value = "";
        if (tagInputField) tagInputField.value = "";

        // Clear saved uses state
        localStorage.removeItem("uses_field_overlay_state");

        // Reset the DOM container and re-init the empty field
        const usesFieldContainer = document.getElementById("uses_field_overlay");
        if (usesFieldContainer) {
            initUsesField(usesFieldContainer, "uses_field_overlay_state");
        }

        // Clear stored overlay tags if defined
        if (window.selectedOverlayTags && typeof selectedOverlayTags === "object") {
          Object.keys(selectedOverlayTags).forEach(category => {
            selectedOverlayTags[category] = [];
          });
          console.log("✅ Cleared stored selectedOverlayTags.");
        }

        // Initialize overlay predefined tags
        overlayHandler.initializeOverlayTagHandlers("dynamic_overlay_tags");

        // Open overlay and focus the title input after a short delay
        elements.addBlockOverlay.classList.add("show");
        if (titleInput) setTimeout(() => titleInput.focus(), 50);
      });
    } else {
      console.error("❌ Error: Add Block button or overlay not found.");
    }

    // Bin Buttons (Clear Local Storage)
    if (elements.binButtons.length > 0 && elements.clearDataOverlay) {
      elements.binButtons.forEach(binButton => {
        binButton.addEventListener("click", () => {
          console.log("🗑 Bin button clicked");
          elements.clearDataOverlay.classList.add("show");
        });
      });
    } else {
      console.error("❌ Error: Bin button(s) or clear data overlay not found.");
    }

    // Confirm Clear Data - Purge entire localStorage and reload
    if (elements.confirmClearButton && elements.clearDataOverlay) {
      elements.confirmClearButton.addEventListener("click", () => {
        console.log("✅ Confirm Clear Data button clicked");
        localStorage.clear();
        alert("All data has been cleared.");
        location.reload();
      });
    } else {
      console.error("❌ Error: Confirm Clear button not found.");
    }

    // Cancel Clear Data - Simply close the overlay
    if (elements.cancelClearButton && elements.clearDataOverlay) {
      elements.cancelClearButton.addEventListener("click", () => {
        console.log("❌ Cancel Clear Data button clicked");
        elements.clearDataOverlay.classList.remove("show");
      });
    } else {
      console.error("❌ Error: Cancel Clear button not found.");
    }

    console.log("✅ Action button event listeners attached");
  };

  return { attachActionButtonListeners };
})();


export const appManager = (() => {
  let userBlocks = JSON.parse(localStorage.getItem("userBlocks")) || [];
  let title = localStorage.getItem("pageTitle") || "Information Blocks";
  
  const resultsSection = document.getElementById("results_section");
  
/* ==================================================================*/
/* ============================== TAGS ==============================*/
/* ==================================================================*/

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
      html += `<div class="tag-category user-tags" id="user_tags_${tabSuffix}"></div>`;
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
      let userBlocks = getBlocks(tab);
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

  const ToggleFilters = document.querySelectorAll(".toggle-filter-button");

  ToggleFilters.forEach(button => {
    button.addEventListener("click", () => {
      const container = button.closest(".filter-and-results");
      const selectors = [
        ".filter-section",
        ".filter-section-wrapper",
        ".filter-section-overlay-top",
        ".filter-section-overlay-bottom"
      ].join(", ");
  
      container
        .querySelectorAll(selectors)
        .forEach(el => el.classList.toggle("hidden"));

      const filterSection = container.querySelector(".filter-section");
      if (filterSection.classList.contains("hidden")) {
        button.innerHTML = '<img src="./images/Filter_Open_Icon.svg" alt="Filter icon">';
      } else {
        button.innerHTML = '<img src="./images/Filter_Hide_Icon.svg" alt="Arrow left icon">';
      }  
    });
  });

/* ==================================================================*/
/* ============================= BLOCKS =============================*/
/* ==================================================================*/

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

    // Clear old content and render header with unique IDs for sort buttons.
    resultsSection.innerHTML = `
      <div id="results_header_${tabSuffix}" class="results-header">
        <div id="header-controls_${tabSuffix}" class="header-controls">

        <button id="results-sort-btn_${tabSuffix}" class="results-settings">
          <img src="./images/Sort_Icon.svg" alt="Sort icon">
        </button>

        <div id="sort-dropdown_${tabSuffix}" class="sort-dropdown hidden">
          <button class="sort-item" data-sort="newest">Newest</button>
          <button class="sort-item" data-sort="oldest">Oldest</button>
          <button class="sort-item" data-sort="alpha">A‑Z</button>
          <button class="sort-item" data-sort="unalpha">Z-A</button>
        </div>

        <button id="results-settings_${tabSuffix}" class="results-settings">
          <img src="./images/View_Icon.svg" alt="View‑state icon">
        </button>

        <div id="view-toggle-dropdown_${tabSuffix}" class="view-toggle-dropdown hidden">
          <button class="view-toggle-item" data-state="expanded">Expand</button>
          <button class="view-toggle-item" data-state="condensed">Condense</button>
          <button class="view-toggle-item" data-state="minimized">Minimize</button>
        </div>
          
        <button id="add_block_button" class="add-block-button green-button add-block-float">+</button>
      </div>
    `;  

    const addBtn = document.getElementById(`results_header_${tabSuffix}`)
      .querySelector('#add_block_button');
    if (addBtn) {
      addBtn.onclick = () => {
        document.querySelector('.add-block-overlay').classList.add('show');
      };
    }

    // 2) wire up the view‑state dropdown
    const settingsBtn  = document.getElementById(`results-settings_${tabSuffix}`);
    const viewDropdown = document.getElementById(`view-toggle-dropdown_${tabSuffix}`);
    const activeTab    = tab;  // current tab, e.g. "tab3"
    const savedView    = localStorage.getItem(`activeViewState_${activeTab}`) || "condensed";

    const closeDropdowns = () => {
      viewDropdown.classList.add("hidden");
      sortDropdown.classList.add("hidden");
    };

    // a) Toggle open/close
    settingsBtn.addEventListener("click", e => {
      e.stopPropagation();
      const wasOpen = !viewDropdown.classList.contains("hidden");
      closeDropdowns();
      if (!wasOpen) {
        viewDropdown.classList.remove("hidden");
      }
    });

    // b) Close on outside click
    document.addEventListener("click", () => {
      viewDropdown.classList.add("hidden");
    });
    document.addEventListener("click", closeDropdowns);

    // c) Handle E/C/M items directly + highlight active
    viewDropdown.querySelectorAll(".view-toggle-item").forEach(item => {
      const state = item.dataset.state; // "expanded" | "condensed" | "minimized"

      // initial highlight based on stored state
      item.classList.toggle("selected", state === savedView);

      // on click:
      item.addEventListener("click", e => {
        e.stopPropagation();
        closeDropdowns();
      
        // 1) update all blocks’ viewState
        updateBlocksViewState(state);
      
        // 2) highlight this item
        viewDropdown.querySelectorAll(".view-toggle-item")
          .forEach(i => i.classList.toggle("selected", i === item));
      
        // 3) close the dropdown
        viewDropdown.classList.add("hidden");
      });
    });  
      
    // ── 3) SORT DROPDOWN ──
    const sortBtn      = document.getElementById(`results-sort-btn_${tabSuffix}`);
    const sortDropdown = document.getElementById(`sort-dropdown_${tabSuffix}`);
    
    // a) Toggle the sort menu open/closed
    sortBtn.addEventListener("click", e => {
      e.stopPropagation();
      const wasOpen = !sortDropdown.classList.contains("hidden");
      closeDropdowns();
      if (!wasOpen) {
        sortDropdown.classList.remove("hidden");
      }
    });
    
    // b) Close on outside click
    document.addEventListener("click", () => {
      sortDropdown.classList.add("hidden");
    });
    
    // c) Wire each sort‑item to sortBlocks() + highlight current
    sortDropdown.querySelectorAll(".sort-item").forEach(item => {
      const mode = item.dataset.sort;  // "newest" | "oldest" | "alpha" | "unalpha"
    
      // initial highlight
      item.classList.toggle("selected", mode === currentSortMode);
    
      // on click
      item.addEventListener("click", () => {
        sortBlocks(mode);
        sortDropdown.querySelectorAll(".sort-item").forEach(i => i.classList.remove("selected"));
        item.classList.add("selected");
        sortDropdown.classList.add("hidden");
      });
    });
    
      
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
        const placeholderClass = 'results-placeholder';
          if (!resultsSection.querySelector(`.${placeholderClass}`)) {
          const p = document.createElement('p');
          p.classList.add(placeholderClass);
          p.textContent = 'Use the + button to add items here…';
          p.style.position  = 'absolute';
          p.style.top       = '50%';
          p.style.left      = '50%';
          p.style.transform = 'translate(-50%, -50%)';
          p.style.textAlign = 'center';
          p.style.opacity = '0.25';
          resultsSection.appendChild(p);
        }
      }
      blocks.forEach(block => {
        resultsSection.insertAdjacentHTML("beforeend", blockTemplate(block));
      });
      console.log(`✅ UI updated: Blocks re-rendered for ${tab}`);
        
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
      document.querySelectorAll(`#${sectionId} .block:not(.permanent-block)`)
        .forEach(blockEl => {
          blockEl.addEventListener("click", function (e) {
            // Ignore clicks on action buttons and tag buttons
            if (e.target.closest(".action-button") ||
                e.target.closest(".tag-button") ||
                e.target.closest(".block-title") ||
                e.target.closest(".block-body") ||
                e.target.closest(".block-body") ||
                e.target.closest(".circle")) return;

          const blockId = blockEl.getAttribute("data-id");
          const blocksArr = getBlocks(tab);
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
                stripHTML(block.text).toLowerCase().includes(query)
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
          renderBlocks(tab, filteredBlocks);
        });
      });
    
    updateTags();
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
      } else if (currentSortMode === "unalpha") {
        parsedBlocks.sort((a, b) => b.title.localeCompare(a.title));
      }

      return parsedBlocks;
  };

/* ==================================================================*/
/* ========================== VIEWSTATES ============================*/
/* ==================================================================*/

  const updateBlocksViewState = (newState) => {
    const activeTab   = getActiveTab();
    let blocks        = getBlocks(activeTab);

    // … apply search & tag filtering …

    blocks.forEach(b => b.viewState = newState);
    localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(blocks));
    if (newState !== "expanded") {
      localStorage.setItem(`activeViewState_${activeTab}`, newState);
    }

    // redraw
    renderBlocks(activeTab, blocks);
    updateTags();
  };

  function updateViewToggleDropdown(tabSuffix) {
    const dropdown = document.getElementById(`view-toggle-dropdown_${tabSuffix}`);
    if (!dropdown) return;

    const activeTab = `tab${tabSuffix}`;
    const saved     = localStorage.getItem(`activeViewState_${activeTab}`) || "condensed";

    dropdown.querySelectorAll(".view-toggle-item").forEach(item => {
      item.classList.toggle("selected", item.dataset.state === saved);
    });
  }
      
  const clearToggleClasses = () => {
      document.getElementById("view_condensed_button")?.classList.remove("active");
      document.getElementById("view_minimized_button")?.classList.remove("active");
  };

  document.getElementById("view_expanded_button")?.addEventListener("click", () => {
      updateBlocksViewState("expanded");
  });

  document.getElementById("view_condensed_button")?.addEventListener("click", () => {
      updateBlocksViewState("condensed");
      clearToggleClasses();
      document.getElementById("view_condensed_button")?.classList.add("active");
  });

  document.getElementById("view_minimized_button")?.addEventListener("click", () => {
      updateBlocksViewState("minimized");
      clearToggleClasses();
      document.getElementById("view_minimized_button")?.classList.add("active");
  });

  const tab = getActiveTab(); 
  const savedViewState = localStorage.getItem(`activeViewState_${tab}`) || "condensed";
  // Highlight the correct button, but do NOT overwrite every block on load
  document
    .querySelectorAll(`#view-toggle-dropdown_${tab.replace("tab","")} .view-toggle-item`)
    .forEach(item => {
      item.classList.toggle(item.dataset.state === savedViewState);
  });

/* =================================================================*/
/* ======================== DATA MANAGEMENT ========================*/
/* =================================================================*/

  const saveBlock = (tab, blockTitle, text, tags, uses, blockId = null, timestamp = null) => {
    console.log(`📥 Attempting to save block in ${tab}:`, { blockTitle, text, tags, uses, blockId, timestamp });
    
    if (
      !blockTitle ||
      (tab !== "tab6" && !text)
    ) {
      console.error(
        tab === "tab6"
          ? "❌ Block title is required for Tab 6"
          : "❌ Block title and text are required"
      );
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
        
/* ==================================================================*/
/* ======================== HELPER FUNCTIONS ========================*/
/* ==================================================================*/

  const clearFilters = () => {
      console.log("Clearing all selected filters...");
      
      // Determine active tab and its number
      const activeTab = getActiveTab();
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
      renderBlocks(activeTab, getBlocks(activeTab));
      
      console.log("✅ Filters cleared.");
  };
  
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

    return {
        // TABS
        getActiveTab,

        // BLOCKS
        renderBlocks,
        loadBlocks,
        getBlocks,

        // VIEWSTATES
        updateBlocksViewState,
        updateViewToggleDropdown,
      
        // TAGS
        renderTags,
        updateTags,
        getTags,

        // Data management
        saveBlock,
        removeBlock,

        // Helper functions
        clearFilters,
        clearData,
    };
})();
