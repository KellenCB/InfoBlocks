// appManager.js
import { categoryTags, blockTypeConfig } from './tagConfig.js';
import { blockTemplate } from './blockTemplate.js';
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

    if (elements.binButtons.length > 0 && elements.clearDataOverlay) {
      elements.binButtons.forEach(binButton => {
        binButton.addEventListener("click", () => {
          elements.clearDataOverlay.classList.add("show");
        });
      });
    }

    if (elements.confirmClearButton && elements.clearDataOverlay) {
      elements.confirmClearButton.onclick = () => {
        localStorage.clear();
        alert("All data has been cleared.");
        location.reload();
      };
    }

    if (elements.cancelClearButton && elements.clearDataOverlay) {
      elements.cancelClearButton.addEventListener("click", () => {
        elements.clearDataOverlay.classList.remove("show");
      });
    }

    console.log("✅ Action button event listeners attached");
  };

  return { attachActionButtonListeners };
})();


export const appManager = (() => {
  let userBlocks = JSON.parse(localStorage.getItem("userBlocks")) || [];
  let title = localStorage.getItem("pageTitle") || "Information Blocks";

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

    container.innerHTML = [...predefinedTags, ...userGeneratedTags]
      .map(tag => {
        const category = Object.entries(categoryTags).find(([_, data]) => data.tags.includes(tag));
        const tagClass = category ? category[1].className : "tag-user";
        return `<button class="tag-button ${tagClass}" data-tag="${tag}">${tag}</button>`;
      })
      .join("");

    console.log("✅ Final Rendered Tags");
  };

  // updateTags renders tag HTML without any selected-state classes.
  // filterManager._applySelectionClasses() applies those after every render.
  const updateTags = () => {
    const activeTab = getActiveTab();
    const tabSuffix = activeTab.replace("tab", "");

    function injectChipsForCollapsedGroups(container) {
      // Chips for collapsed accordion groups — selected state re-applied by filterManager
      container.querySelectorAll('.tag-accordion-group:not(.open)').forEach(group => {
        group.querySelector('.tag-accordion-pill')
          ?.querySelectorAll('.tag-accordion-chip').forEach(c => c.remove());
      });
    }

    const usedTags = getTags(activeTab);

    const allPredefined = Object.entries(categoryTags)
      .filter(([_, data]) => data.tabs.includes(activeTab))
      .flatMap(([_, data]) => data.tags);

    const userGeneratedTags = usedTags
      .filter(tag => !allPredefined.includes(tag))
      .sort((a, b) => a.localeCompare(b));

    const fromDOM = [...(document.getElementById(`dynamic_tags_section_${tabSuffix}`)
      ?.querySelectorAll('.tag-accordion-group.open') || [])]
      .map(g => g.dataset.category);
    const fromStorage = JSON.parse(localStorage.getItem(`accordionOpen_${activeTab}`) || '[]');
    const currentlyOpen = new Set(fromDOM.length ? fromDOM : fromStorage);

    let html = "";

    Object.keys(categoryTags).forEach(category => {
      if (!categoryTags[category].tabs.includes(activeTab)) return;
      const usedPredefined = categoryTags[category].tags.filter(tag => usedTags.includes(tag));
      if (usedPredefined.length === 0) return;

      const label     = categoryTags[category].label || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const className = categoryTags[category].className;
      const isOpen    = currentlyOpen.has(category);
      const openClass = isOpen ? ' open' : '';

      html += `<div class="tag-accordion-group ${className}${openClass}" data-category="${category}">`;
      html += `<button class="tag-accordion-pill" data-category="${category}">${label}</button>`;
      html += `<div class="tag-accordion-body" id="${category}_tags_list_${tabSuffix}">`;
      html += `<span class="tag-accordion-label">${label}</span>`;
      html += usedPredefined.map(tag =>
        `<button class="tag-button ${className}" data-tag="${tag}">${tag}</button>`
      ).join("");
      html += `</div></div>`;
    });

    if (userGeneratedTags.length > 0) {
      html += `<div class="tag-category user-tags" id="user_tags_${tabSuffix}">`;
      html += userGeneratedTags.map(tag =>
        `<button class="tag-button tag-user" data-tag="${tag}">${tag}</button>`
      ).join("");
      html += `</div>`;
    } else {
      html += `<div class="tag-category user-tags" id="user_tags_${tabSuffix}"></div>`;
    }

    const unifiedContainer = document.getElementById(`dynamic_tags_section_${tabSuffix}`);
    if (unifiedContainer) {
      unifiedContainer.innerHTML = html;
      injectChipsForCollapsedGroups(unifiedContainer);
      localStorage.setItem(`accordionOpen_${activeTab}`, JSON.stringify([...currentlyOpen]));
    }

    console.log(`✅ Tags updated for ${activeTab}`);
    document.dispatchEvent(new CustomEvent('tagsUpdated', { detail: { tab: activeTab } }));
  };

  const getTags = (tab = getActiveTab()) => {
    const predefinedTags = new Set(Object.values(categoryTags).flatMap(cat => cat.tags));
    const usedTags = new Set();
    const blocks = getBlocks(tab);
    blocks.forEach(block => {
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
      const container  = button.closest(".filter-and-results");
      const tabContent = button.closest(".tab-content");
      const tabId      = tabContent ? tabContent.id : null;
      const selectors  = [
        ".filter-section",
        ".filter-section-wrapper",
        ".filter-section-overlay-top",
        ".filter-section-overlay-bottom"
      ].join(", ");

      container.querySelectorAll(selectors).forEach(el => el.classList.toggle("hidden"));

      const filterSection = container.querySelector(".filter-section");
      const isHidden = filterSection.classList.contains("hidden");

      button.innerHTML = isHidden
        ? '<img src="./images/Filter_Open_Icon.svg" alt="Filter icon">'
        : '<img src="./images/Filter_Hide_Icon.svg" alt="Arrow left icon">';

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

    const tabSuffix  = tab.replace("tab", "");
    const sectionId  = `results_section_${tabSuffix}`;
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

    const sortBtn       = document.getElementById(`results-sort-btn_${tabSuffix}`);
    const sortDropdown  = document.getElementById(`sort-dropdown_${tabSuffix}`);
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
        renderBlocks(tab, getBlocks(tab));
        updateTags();
        updateViewToggleDropdown(tabSuffix);
      });
    });

    if (tab === "tab6") {
      const permanentItems  = [
        { id: "perm1", defaultValue: "00" },
        { id: "perm2", defaultValue: "00" },
        { id: "perm3", defaultValue: "00" }
      ];
      const colorClasses = { perm1: "gold-bg", perm2: "silver-bg", perm3: "copper-bg" };

      let permanentHTML = "";
      permanentItems.forEach(({ id, defaultValue }) => {
        const savedValue = localStorage.getItem(`permanentItem_${id}`) || defaultValue;
        permanentHTML += `
          <div class="block minimized permanent-block ${colorClasses[id]}" data-id="${id}">
            <h4 class="permanent-title" contenteditable="true">${savedValue}</h4>
          </div>
        `;
      });
      resultsSection.insertAdjacentHTML("beforeend", `<div class="permanent-items-container">${permanentHTML}</div>`);
    }

    const allBlocks     = getBlocks(tab);
    const pinnedBlocks  = allBlocks.filter(b => b.pinned);
    const displayBlocks = (filteredBlocks || allBlocks).filter(b => !b.pinned);

    console.log(`📦 Blocks to render for ${tab}:`, displayBlocks);

    if (pinnedBlocks.length > 0) {
      const pinnedHTML = pinnedBlocks.map(b => blockTemplate(b, tab)).join('');
      resultsSection.insertAdjacentHTML('beforeend', `<div class="pinned-blocks-zone">${pinnedHTML}</div>`);
    }

    if (displayBlocks.length === 0 && pinnedBlocks.length === 0) {
      const p = document.createElement('p');
      p.classList.add('results-placeholder');
      p.textContent = 'Use the + button to add items here…';
      p.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;opacity:0.25;';
      resultsSection.appendChild(p);
    }

    displayBlocks.forEach(block => {
      resultsSection.insertAdjacentHTML('beforeend', blockTemplate(block, tab));
    });

    applyInlineDiceRolls(resultsSection, tab);
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
        blockEl.addEventListener("click", function(e) {
          const validTargets = ['.block', '.block-header', '.block-header-left'];
          const isEmptySpace = validTargets.some(sel =>
            e.target === blockEl.querySelector(sel) || e.target === blockEl
          );
          if (!isEmptySpace) return;

          const blockId    = blockEl.getAttribute("data-id");
          const blocksArr  = getBlocks(tab);
          const targetBlock = blocksArr.find(b => b.id === blockId);
          if (!targetBlock) return;

          if (targetBlock.viewState === "expanded") {
            const activeState = localStorage.getItem(`activeViewState_${tab}`) || "condensed";
            targetBlock.viewState = activeState;
          } else {
            targetBlock.viewState = "expanded";
          }

          localStorage.setItem(`userBlocks_${tab}`, JSON.stringify(blocksArr));

          // Re-run filters through filterManager so OR/AND state and search are preserved
          import('./filterManager.js').then(({ filterManager }) => {
            filterManager.applyFilters(tabSuffix);
          });
        });
      });

    updateTags();
    attachDynamicTooltips();
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
    const storedBlocks  = localStorage.getItem(`userBlocks_${tab}`);
    const parsedBlocks  = storedBlocks ? JSON.parse(storedBlocks) : [];
    const sortMode      = localStorage.getItem(`activeSortOrder_${tab}`) || "newest";

    if (sortMode === "newest")  parsedBlocks.sort((a, b) => b.timestamp - a.timestamp);
    else if (sortMode === "oldest")  parsedBlocks.sort((a, b) => a.timestamp - b.timestamp);
    else if (sortMode === "alpha")   parsedBlocks.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortMode === "unalpha") parsedBlocks.sort((a, b) => b.title.localeCompare(a.title));

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

    import('./filterManager.js').then(({ filterManager }) => {
        filterManager.applyFilters(activeTab.replace('tab', ''));
    });
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

  const saveBlock = (tab, blockTitle, text, tags, uses, properties = [], blockType = null, blockId = null, timestamp = null) => {
    if (!blockTitle || (tab !== "tab6" && !text)) {
      console.error(tab === "tab6" ? "❌ Block title is required for Tab 6" : "❌ Block title and text are required");
      return false;
    }

    let userBlocks = getBlocks(tab);

    if (blockId) {
      const blockIndex = userBlocks.findIndex(block => block.id === blockId);
      if (blockIndex !== -1) {
        userBlocks[blockIndex] = {
          ...userBlocks[blockIndex],
          title: blockTitle, text, tags, uses, properties, blockType,
          timestamp: userBlocks[blockIndex].timestamp || Date.now()
        };
      } else {
        console.error(`❌ Block with ID "${blockId}" not found in tab ${tab}.`);
        return false;
      }
    } else {
      const predefinedTagsMap = new Map(
        Object.values(categoryTags).flatMap(cat => cat.tags).map(tag => [tag.toLowerCase(), tag])
      );
      const formattedTags = tags.map(tag => {
        const predefined = predefinedTagsMap.get(tag.toLowerCase());
        return predefined || (tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());
      });

      userBlocks.unshift({
        id: crypto.randomUUID(),
        title: blockTitle, text,
        tags: formattedTags,
        uses, properties,
        blockType: blockType || null,
        timestamp: timestamp || Date.now(),
        viewState: "expanded"
      });
    }

    localStorage.setItem(`userBlocks_${tab}`, JSON.stringify(userBlocks));
    return true;
  };

  const removeBlock = (blockId, tabOverride = null) => {
    if (!blockId) return null;
    const activeTab  = tabOverride || getActiveTab();
    const userBlocks = getBlocks(activeTab);
    const idx        = userBlocks.findIndex(b => b.id === blockId);
    if (idx === -1) return null;
    const [removed]  = userBlocks.splice(idx, 1);
    localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(userBlocks));
    return removed;
  };

  const restoreBlock = (block) => {
    if (!block) return false;
    const activeTab  = getActiveTab();
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
    if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
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
    if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
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
      if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
    })
  );

  function attachDynamicTooltips() {
    attachTooltipHandlers(document.querySelectorAll('.block-title h4, .action-name, .action-description'));
  }

/* ==================================================================*/
/* ======================== HELPER FUNCTIONS ========================*/
/* ==================================================================*/

  const clearFilters = () => {
    const activeTab   = getActiveTab();
    const tabNumber   = activeTab.replace("tab", "");
    const searchInput = document.getElementById(`search_input_${tabNumber}`);
    if (searchInput) searchInput.value = "";
    // Use dynamic import to avoid circular dependency
    import('./filterManager.js').then(({ filterManager }) => {
      filterManager.clearSelectedTags(activeTab);
      filterManager.applyFilters(tabNumber);
    });
  };

  const clearData = () => {
    userBlocks = [];
    title      = "Information Blocks";
    localStorage.removeItem("userBlocks");
    localStorage.removeItem("pageTitle");
    document.querySelectorAll(".circle").forEach(circle => circle.classList.remove("filled"));
    document.querySelector("header.title-section h1").textContent = "INFORMATION BLOCKS";
    renderBlocks([]);
    updateTags();
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