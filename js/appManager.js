// appManager.js
import { categoryTags, blockTypeConfig } from './tagConfig.js';
import { blockTemplate } from './blockTemplate.js';
import { tagHandler } from './tagHandler.js';
import { overlayHandler, initUsesField } from './overlayHandler.js';
import { applyInlineDiceRolls } from './diceRoller.js';

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
  return document.querySelector(".tab-button.active")?.dataset.tab || "tab4";
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

    // Confirm Clear Data
    if (elements.confirmClearButton && elements.clearDataOverlay) {
      elements.confirmClearButton.onclick = () => {
        console.log("✅ Confirm Clear Data button clicked");
        localStorage.clear();
        alert("All data has been cleared.");
        location.reload();
      };
    } else {
      console.error("❌ Error: Confirm Clear button not found.");
    }

    // Cancel Clear Data
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
    const selectedTags = tagHandler.getSelectedTags();

    container.innerHTML = [...predefinedTags, ...userGeneratedTags]
        .map(tag => {
            const category = Object.entries(categoryTags).find(([_, data]) => data.tags.includes(tag));
            const tagClass = category ? category[1].className : "tag-user";
            const isSelected = selectedTags.includes(tag) ? "selected" : "";
            return `<button class="tag-button ${tagClass} ${isSelected}" data-tag="${tag}">${tag}</button>`;
        })
        .join("");

    console.log("✅ Final Rendered Tags");
  };
    
  const updateTags = () => {
    const activeTab = getActiveTab();
    const tabSuffix = activeTab.replace("tab", "");
  
    const usedTags = getTags(activeTab);
    const selectedTags = tagHandler.getSelectedTags(activeTab);
  
    const allPredefined = Object.entries(categoryTags)
        .filter(([_, data]) => data.tabs.includes(activeTab))
        .flatMap(([_, data]) => data.tags);

    const usedUserTags = usedTags
      .filter(tag => !allPredefined.includes(tag))
      .sort((a, b) => a.localeCompare(b));

    const currentlyOpen = new Set(
        [...(document.getElementById(`dynamic_tags_section_${tabSuffix}`)
            ?.querySelectorAll('.tag-accordion-header.open') || [])]
            .map(h => h.dataset.category)
    );

    let html = "";

    Object.keys(categoryTags).forEach(category => {
        if (!categoryTags[category].tabs.includes(activeTab)) return;
        const usedPredefined = categoryTags[category].tags.filter(tag => usedTags.includes(tag));
        if (usedPredefined.length === 0) return;

        const label      = categoryTags[category].label || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const hasSelected = usedPredefined.some(tag => selectedTags.includes(tag));
        const openClass = (hasSelected || currentlyOpen.has(category)) ? ' open' : '';

        html += `<div class="tag-accordion-group">`;
        html += `<button class="tag-accordion-header${openClass}" data-category="${category}">`;
        html += `<span>${label}</span><span class="accordion-chevron"></span>`;
        html += `</button>`;
        html += `<div class="tag-accordion-body${openClass}" id="${category}_tags_list_${tabSuffix}">`;
        html += usedPredefined.map(tag => {
            const isSelected = selectedTags.includes(tag) ? "selected" : "";
            return `<button class="tag-button ${categoryTags[category].className} ${isSelected}" data-tag="${tag}">${tag}</button>`;
        }).join("");
        html += `</div></div>`;
    });

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
  
    const unifiedContainer = document.getElementById(`dynamic_tags_section_${tabSuffix}`);
    if (unifiedContainer) {
      unifiedContainer.innerHTML = html;
    }
  
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
      const tabContent = button.closest(".tab-content");
      const tabId = tabContent ? tabContent.id : null;
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
      const isHidden = filterSection.classList.contains("hidden");

      if (isHidden) {
        button.innerHTML = '<img src="./images/Filter_Open_Icon.svg" alt="Filter icon">';
      } else {
        button.innerHTML = '<img src="./images/Filter_Hide_Icon.svg" alt="Arrow left icon">';
      }

      if (tabId) localStorage.setItem(`filterVisible_${tabId}`, (!isHidden).toString());
    });
  });

let renderAbortController = null;

/* ==================================================================*/
/* ============================= BLOCKS =============================*/
/* ==================================================================*/

const renderBlocks = (tab = getActiveTab(), filteredBlocks = null) => {
    console.log("🔍 Checking tab value:", tab, typeof tab);
    
    if (renderAbortController) renderAbortController.abort();
    renderAbortController = new AbortController();
    const signal = renderAbortController.signal;
    
    if (typeof tab !== "string") {
      console.error("❌ Error: 'tab' should be a string but got:", tab);
      tab = "tab4";
    }
    
    const tabSuffix = tab.replace("tab", "");
    const sectionId = `results_section_${tabSuffix}`;
    const resultsSection = document.getElementById(sectionId);
    if (!resultsSection) return;

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
            overlayHandler.initializeOverlayTagHandlers("add_block_overlay_tags");
            document.querySelector('.add-block-overlay').classList.add('show');
        };
    }

    const settingsBtn  = document.getElementById(`results-settings_${tabSuffix}`);
    const viewDropdown = document.getElementById(`view-toggle-dropdown_${tabSuffix}`);
    const activeTab    = tab;
    const savedView    = localStorage.getItem(`activeViewState_${activeTab}`) || "condensed";

    const closeDropdowns = () => {
      viewDropdown.classList.add("hidden");
      sortDropdown.classList.add("hidden");
    };

    settingsBtn.addEventListener("click", e => {
      e.stopPropagation();
      const wasOpen = !viewDropdown.classList.contains("hidden");
      closeDropdowns();
      if (!wasOpen) viewDropdown.classList.remove("hidden");
    });

    document.addEventListener("click", () => viewDropdown.classList.add("hidden"), { signal });
    document.addEventListener("click", closeDropdowns, { signal });

    viewDropdown.querySelectorAll(".view-toggle-item").forEach(item => {
      const state = item.dataset.state;
      item.classList.toggle("selected", state === savedView);

      item.addEventListener("click", e => {
        e.stopPropagation();
        closeDropdowns();
        updateBlocksViewState(state);
        viewDropdown.querySelectorAll(".view-toggle-item")
          .forEach(i => i.classList.toggle("selected", i === item));
        viewDropdown.classList.add("hidden");
      });
    });  
      
    const sortBtn      = document.getElementById(`results-sort-btn_${tabSuffix}`);
    const sortDropdown = document.getElementById(`sort-dropdown_${tabSuffix}`);
    const savedSortMode = localStorage.getItem(`activeSortOrder_${tab}`) || "newest";
    
    sortBtn.addEventListener("click", e => {
      e.stopPropagation();
      const wasOpen = !sortDropdown.classList.contains("hidden");
      closeDropdowns();
      if (!wasOpen) sortDropdown.classList.remove("hidden");
    });
    
    document.addEventListener("click", () => sortDropdown.classList.add("hidden"), { signal });

    sortDropdown.querySelectorAll(".sort-item").forEach(item => {
      const mode = item.dataset.sort;
      item.classList.toggle("selected", mode === savedSortMode);

      item.addEventListener("click", e => {
        e.stopPropagation();
        localStorage.setItem(`activeSortOrder_${tab}`, mode);
        sortDropdown.querySelectorAll(".sort-item")
          .forEach(i => i.classList.toggle("selected", i === item));
        sortDropdown.classList.add("hidden");
        const sorted = getBlocks(tab); 
        renderBlocks(tab, sorted);
        updateTags();
        updateViewToggleDropdown(tabSuffix);
      });
    });
    
      
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
        resultsSection.insertAdjacentHTML("beforeend", `
          <div class="permanent-items-container">
            ${permanentHTML}
          </div>
        `);
      }
              
    const allBlocks     = getBlocks(tab);
    const pinnedBlocks  = allBlocks.filter(b => b.pinned);
    const displayBlocks = (filteredBlocks || allBlocks).filter(b => !b.pinned);

    console.log(`📦 Blocks to render for ${tab}:`, displayBlocks);

    // ── Pinned zone ──────────────────────────────────────────────────────────
    if (pinnedBlocks.length > 0) {
        const pinnedHTML = pinnedBlocks.map(b => blockTemplate(b, tab)).join('');
        resultsSection.insertAdjacentHTML('beforeend', `
            <div class="pinned-blocks-zone">
                ${pinnedHTML}
            </div>
        `);
    }

    // ── Normal blocks ────────────────────────────────────────────────────────
    if (displayBlocks.length === 0 && pinnedBlocks.length === 0) {
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
            p.style.opacity   = '0.25';
            resultsSection.appendChild(p);
        }
    }

    displayBlocks.forEach(block => {
        resultsSection.insertAdjacentHTML('beforeend', blockTemplate(block, tab));
        applyInlineDiceRolls(resultsSection);
    });

    console.log(`✅ UI updated: Blocks re-rendered for ${tab}`);
      
    if (tab === "tab6") {
      resultsSection.querySelectorAll(".permanent-title").forEach(titleEl => {
        titleEl.addEventListener("blur", () => {
          const blockId = titleEl.parentElement.getAttribute("data-id");
          localStorage.setItem(`permanentItem_${blockId}`, titleEl.textContent.trim());
        });
      });
    }
    
    // Click-to-toggle view for non-permanent blocks
    document.querySelectorAll(`#${sectionId} .block:not(.permanent-block)`)
      .forEach(blockEl => {
        blockEl.addEventListener("click", function (e) {
          if (e.target.closest(".action-button") ||
              e.target.closest(".tag-button") ||
              e.target.closest(".block-title") ||
              e.target.closest(".block-body") ||
              e.target.closest(".circle")) return;

          const blockId = blockEl.getAttribute("data-id");
          const blocksArr = getBlocks(tab);
          const targetBlock = blocksArr.find(b => b.id === blockId);
          if (!targetBlock) return;
          
          if (targetBlock.viewState === "expanded") {
            const activeState = localStorage.getItem(`activeViewState_${tab}`) || "condensed";
            targetBlock.viewState = activeState;
          } else {
            targetBlock.viewState = "expanded";
          }
          
          localStorage.setItem(`userBlocks_${tab}`, JSON.stringify(blocksArr));
          
          let filteredBlocks = blocksArr;
          const searchInput = document.getElementById(`search_input_${tab.replace("tab", "")}`);
          if (searchInput && searchInput.value.trim() !== "") {
            const query = searchInput.value.trim().toLowerCase();
            filteredBlocks = filteredBlocks.filter(block =>
              block.title.toLowerCase().includes(query) ||
              stripHTML(block.text).toLowerCase().includes(query)
            );
          }
          
          const selectedTags = tagHandler.getSelectedTags(tab);

          // Use blockTypeConfig to correctly split type filters from tag filters
          const tabBTConfig = blockTypeConfig[tab];
          const tabBlockTypes = tabBTConfig ? new Set(tabBTConfig.types) : new Set();

          const typeFilters = selectedTags.filter(t => tabBlockTypes.has(t));
          const tagFilters  = selectedTags.filter(t => !tabBlockTypes.has(t));

          if (typeFilters.length > 0) {
              filteredBlocks = filteredBlocks.filter(block => {
                  const types = Array.isArray(block.blockType) ? block.blockType : (block.blockType ? [block.blockType] : []);
                  return typeFilters.every(t => types.includes(t));
              });
          }

          if (tagFilters.length > 0) {
              filteredBlocks = filteredBlocks.filter(block =>
                  tagFilters.every(selectedTag =>
                      block.tags.some(blockTag => normalizeTag(blockTag) === normalizeTag(selectedTag))
                  )
              );
          }
          
          renderBlocks(tab, filteredBlocks);
        });
      });
    
    updateTags();
    attachDynamicTooltips();
  };

  const sortBlocks = (mode) => {
      currentSortMode = mode;
      const activeTab = getActiveTab();
      const tabSuffix = activeTab.replace("tab", "");
      
      document.querySelectorAll(`#sort_controls_${tabSuffix} .sort-button`)
        .forEach(btn => btn.classList.remove("selected"));
      
      const sortBtn = document.getElementById(`sort_${mode}_${tabSuffix}`);
      if (sortBtn) sortBtn.classList.add("selected");
      
      let sortedBlocks = getBlocks(activeTab);
      const selectedTags = tagHandler.getSelectedTags();
      if (selectedTags.length > 0) {
        sortedBlocks = sortedBlocks.filter(block =>
          selectedTags.every(tag => block.tags.includes(tag))
        );
      }
      
      renderBlocks(activeTab, sortedBlocks);
  };
                                  
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
  
  let currentSortMode = "newest";

  const getBlocks = (tab = getActiveTab()) => {
      const storedBlocks = localStorage.getItem(`userBlocks_${tab}`);
      const parsedBlocks = storedBlocks ? JSON.parse(storedBlocks) : [];

      const sortMode = localStorage.getItem(`activeSortOrder_${tab}`) || "newest";
      if (sortMode === "newest") {
          parsedBlocks.sort((a, b) => b.timestamp - a.timestamp);
      } else if (sortMode === "oldest") {
          parsedBlocks.sort((a, b) => a.timestamp - b.timestamp);
      } else if (sortMode === "alpha") {
          parsedBlocks.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortMode === "unalpha") {
          parsedBlocks.sort((a, b) => b.title.localeCompare(a.title));
      }

      return parsedBlocks;
  };

/* ==================================================================*/
/* ========================== VIEWSTATES ============================*/
/* ==================================================================*/

  const updateBlocksViewState = (newState) => {
    const activeTab = getActiveTab();
    let blocks      = getBlocks(activeTab);

    blocks.forEach(b => b.viewState = newState);
    localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(blocks));
    if (newState !== "expanded") {
      localStorage.setItem(`activeViewState_${activeTab}`, newState);
    }

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
  document
    .querySelectorAll(`#view-toggle-dropdown_${tab.replace("tab","")} .view-toggle-item`)
    .forEach(item => {
      item.classList.toggle(item.dataset.state === savedViewState);
  });

/* =================================================================*/
/* ======================== DATA MANAGEMENT ========================*/
/* =================================================================*/

  const saveBlock = (tab, blockTitle, text, tags, uses, blockType = null, blockId = null, timestamp = null) => {
    console.log(`📥 Attempting to save block in ${tab}:`, { blockTitle, text, tags, uses, blockId, timestamp });
    
    if (
      !blockTitle ||
      (tab !== "tab6" && !text)
    ) {
      console.error(
        tab === "tab6"
          ? "❌ Block title is required for Tab 6"
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
              uses,
              blockType,
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
          uses,
          blockType: blockType || null,
          timestamp: timestamp || Date.now(),
          viewState: "expanded"
        };

        userBlocks.unshift(newBlock);
        console.log("✅ New Block Saved:", newBlock);
    }
    
    localStorage.setItem(`userBlocks_${tab}`, JSON.stringify(userBlocks));
    return true;
  };
                    
  const removeBlock = (blockId, tabOverride = null) => {
    if (!blockId) return null;
    const activeTab = tabOverride || getActiveTab();
    const userBlocks = getBlocks(activeTab);
    const idx = userBlocks.findIndex(b => b.id === blockId);
    if (idx === -1) return null;
    const [removed] = userBlocks.splice(idx, 1);
    localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(userBlocks));
    return removed;
  };
  
  const restoreBlock = (block) => {
    if (!block) return false;
    const activeTab = getActiveTab();
    const userBlocks = getBlocks(activeTab);
    userBlocks.unshift(block);
    localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(userBlocks));
    return true;
  };

/* ==================================================================*/
/* =========================== TOOLTIPS =============================*/
/* ==================================================================*/

let activeTooltip = null;

function tooltipMouseEnter(e) {
  const el = e.currentTarget;
  if (el.scrollWidth <= el.clientWidth) return;

  clearTimeout(el._tooltipTimer);
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }

  el._tooltipTimer = setTimeout(() => {
    const tip = document.createElement('div');
    tip.classList.add('text-tooltip');
    tip.textContent = el.textContent;
    document.body.appendChild(tip);

    const rect = el.getBoundingClientRect();
    tip.style.left = `${rect.left}px`;
    tip.style.top  = `${rect.bottom + 5}px`;

    activeTooltip = tip;
  }, 750);
}

function tooltipMouseLeave(e) {
  const el = e.currentTarget;
  clearTimeout(el._tooltipTimer);
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

function attachTooltipHandlers(nodes) {
  nodes.forEach(el => {
    el.removeEventListener('mouseenter', tooltipMouseEnter);
    el.removeEventListener('mouseleave', tooltipMouseLeave);
    el.addEventListener('mouseenter', tooltipMouseEnter);
    el.addEventListener('mouseleave', tooltipMouseLeave);
  });
}

['scroll', 'resize', 'blur'].forEach(evt =>
  window.addEventListener(evt, () => {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  })
);

function attachDynamicTooltips() {
  const targets = document.querySelectorAll(
    '.block-title h4, .action-name, .action-description'
  );
  attachTooltipHandlers(targets);
}

/* ==================================================================*/
/* ======================== HELPER FUNCTIONS ========================*/
/* ==================================================================*/

  const clearFilters = () => {
      console.log("Clearing all selected filters...");
      
      const activeTab = getActiveTab();
      const tabNumber = activeTab.replace("tab", "");
      
      const searchInput = document.getElementById(`search_input_${tabNumber}`);
      if (searchInput) searchInput.value = "";
      
      document.querySelectorAll(`#tab${tabNumber} .tag-button.selected`).forEach(tag => {
          tag.classList.remove("selected");
      });
      
      tagHandler.clearSelectedTags(activeTab);
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
        getActiveTab,
        renderBlocks,
        loadBlocks,
        getBlocks,
        updateBlocksViewState,
        updateViewToggleDropdown,
        renderTags,
        updateTags,
        getTags,
        saveBlock,
        removeBlock,
        restoreBlock,
        clearFilters,
        clearData,
    };
})();