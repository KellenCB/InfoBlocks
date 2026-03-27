// splitView.js
import { appManager } from './appManager.js';
import { tagHandler } from './tagHandler.js';
import { categoryTags, blockTypeConfig } from './tagConfig.js';
import { stripHTML } from './appManager.js';
import { applyInlineDiceRolls } from './diceRoller.js';

let splitActive = false;

const TABS = [
    { id: 'tab3', label: 'Quests & Notes' },
    { id: 'tab4', label: 'Hazard' },
    { id: 'tab6', label: 'Inventory' },
    { id: 'tab7', label: 'Session Logs' },
    { id: 'tab8', label: 'Crank' },
    { id: 'tab9', label: 'Feats & Magic' },
];

export const SINGLETON_TABS = new Set();

const panelAbortControllers = { left: null, right: null };

export const panelState = {
    left:  { activeTab: null, selectedTags: {}, searchQuery: {} },
    right: { activeTab: null, selectedTags: {}, searchQuery: {} },
};

// ── Main toggle ───────────────────────────────────────────────────────────────

export function initSplitView() {
    const btn = document.getElementById('split-view-button');
    if (!btn) return;
    btn.addEventListener('click', toggleSplitView);

    let wasActiveBeforePortrait = localStorage.getItem('splitViewActive') === 'true'
        && window.innerHeight > window.innerWidth;
    let ready = false;

    // Short delay before the resize listener becomes active, so it
    // doesn't fire during page initialisation and tear down the layout
    setTimeout(() => { ready = true; }, 500);

    const handleOrientationChange = () => {
        if (!ready) return;
        const isPortrait = window.innerHeight > window.innerWidth;

        if (isPortrait && splitActive) {
            wasActiveBeforePortrait = true;
            splitActive = false;
            exitSplitView();
            btn.classList.remove('active');
        } else if (!isPortrait && wasActiveBeforePortrait && !splitActive) {
            wasActiveBeforePortrait = false;
            splitActive = true;
            enterSplitView();
            btn.classList.add('active');
        }
    };

    window.addEventListener('resize', handleOrientationChange);
}

function toggleSplitView() {
    splitActive = !splitActive;
    localStorage.setItem('splitViewActive', splitActive);
    const btn = document.getElementById('split-view-button');
    if (splitActive) {
        enterSplitView();
        btn.classList.add('active');
    } else {
        exitSplitView();
        btn.classList.remove('active');
    }
}

export function isSplitActive() { return splitActive; }

// ── Enter ─────────────────────────────────────────────────────────────────────

function enterSplitView() {
    const tabsContent = document.querySelector('.tabs-content');
    const tabNav      = document.querySelector('.tab-nav');
    if (tabsContent) tabsContent.style.display = 'none';
    if (tabNav)      tabNav.style.display      = 'none';

    const wrapper = document.createElement('div');
    wrapper.id = 'split-view-wrapper';
    wrapper.innerHTML = `
        <div class="split-panel" data-panel="left">
            <nav class="tab-nav split-tab-nav" data-panel-nav="left">
                ${buildNavHTML('left')}
            </nav>
            <div class="split-content-area" data-panel-content="left">
                <p class="split-placeholder">Select a tab above</p>
            </div>
        </div>
        <div class="split-divider"></div>
        <div class="split-panel" data-panel="right">
            <nav class="tab-nav split-tab-nav" data-panel-nav="right">
                ${buildNavHTML('right')}
            </nav>
            <div class="split-content-area" data-panel-content="right">
                <p class="split-placeholder">Select a tab above</p>
            </div>
        </div>
    `;

    if (tabsContent) {
        tabsContent.insertAdjacentElement('afterend', wrapper);
    } else {
        document.body.appendChild(wrapper);
    }

    wireNavButtons();
    wireSplitNavDragSync();

    // Auto-mount left panel
    const savedLeftTab = localStorage.getItem('splitLeftTab');
    const currentTab   = savedLeftTab || localStorage.getItem('activeTab') || 'tab4';
    const leftNavBtn   = document.querySelector(`.split-tab-nav[data-panel-nav="left"] .split-tab-button[data-tab="${currentTab}"]`);
    if (leftNavBtn) leftNavBtn.click();
    
    // Auto-mount right panel
    const savedRightTab = localStorage.getItem('splitRightTab');
    const fallbackRightTab = TABS.find(t => t.id !== currentTab)?.id || 'tab3';
    const rightTabToLoad = savedRightTab || fallbackRightTab;
    const rightNavBtn = document.querySelector(`.split-tab-nav[data-panel-nav="right"] .split-tab-button[data-tab="${rightTabToLoad}"]`);
    if (rightNavBtn) rightNavBtn.click();

    console.log('✅ Split view entered');
}

// ── Exit ──────────────────────────────────────────────────────────────────────

function exitSplitView() {
    const wrapper     = document.getElementById('split-view-wrapper');
    const tabsContent = document.querySelector('.tabs-content');
    const tabNav      = document.querySelector('.tab-nav');

    if (tabsContent) tabsContent.style.display = '';
    if (tabNav)      tabNav.style.display      = '';
    if (wrapper)     wrapper.remove();

    // Ensure any fade-in elements that were hidden during load get made visible
    document.querySelectorAll('.fade-in:not(.visible)').forEach(el => {
        el.classList.add('visible');
    });

    const leftTab = panelState.left.activeTab
        || localStorage.getItem('activeTab')
        || localStorage.getItem('splitLeftTab')
        || 'tab4';

    panelState.left.activeTab  = null;
    panelState.right.activeTab = null;

    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
    });
    const targetContent = document.getElementById(leftTab);
    if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'flex';
    } else {
        // Fallback: show whichever tab-content is first if target not found
        const firstTab = document.querySelector('.tab-content');
        if (firstTab) {
            firstTab.classList.add('active');
            firstTab.style.display = 'flex';
        }
    }
    document.querySelectorAll('.tab-nav .tab-button').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === leftTab);
    });
    appManager.renderBlocks(leftTab);
    appManager.updateTags();
    localStorage.setItem('activeTab', leftTab);
    console.log('✅ Split view exited');
}

// ── Nav HTML ──────────────────────────────────────────────────────────────────

function buildNavHTML(panelSide) {
    const savedOrder = JSON.parse(localStorage.getItem('tabOrder')) || TABS.map(t => t.id);
    const ordered = savedOrder
        .map(id => TABS.find(t => t.id === id))
        .filter(Boolean);
    TABS.forEach(t => { if (!ordered.find(o => o.id === t.id)) ordered.push(t); });

    return ordered.map(({ id, label }) =>
        `<button class="tab-button split-tab-button" data-tab="${id}" data-panel="${panelSide}" draggable="true">${label}</button>`
    ).join('');
}

// ── Wire nav button clicks ────────────────────────────────────────────────────

function wireNavButtons() {
    document.querySelectorAll('.split-tab-button').forEach(btn => {
        btn.addEventListener('click', onNavButtonClick);
    });
}

// ── Sync drag order between split navs ────────────────────────────────────────

function wireSplitNavDragSync() {
    const getDragAfterElement = (nav, x) => {
        const els = [...nav.querySelectorAll('.split-tab-button:not(.dragging)')];
        return els.reduce((closest, child) => {
            const box    = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            return offset < 0 && offset > closest.offset
                ? { offset, element: child }
                : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    document.querySelectorAll('.split-tab-nav').forEach(nav => {
        nav.addEventListener('dragover', e => {
            e.preventDefault();
            const dragging = document.querySelector('.split-tab-button.dragging');
            if (!dragging) return;
            const after = getDragAfterElement(nav, e.clientX);
            if (after == null) {
                nav.appendChild(dragging);
            } else {
                nav.insertBefore(dragging, after);
            }
        });
    });

    document.querySelectorAll('.split-tab-nav .split-tab-button').forEach(btn => {
        btn.addEventListener('dragstart', () => btn.classList.add('dragging'));
        btn.addEventListener('dragend', () => {
            btn.classList.remove('dragging');

            const sourceNav = btn.closest('.split-tab-nav');
            const otherSide = sourceNav.dataset.panelNav === 'left' ? 'right' : 'left';
            const otherNav  = document.querySelector(`.split-tab-nav[data-panel-nav="${otherSide}"]`);
            const mainNav   = document.querySelector('.tab-nav:not(.split-tab-nav)');

            const newOrder = Array.from(sourceNav.querySelectorAll('.split-tab-button'))
                .map(b => b.dataset.tab);

            if (otherNav) {
                newOrder.forEach(tabId => {
                    const otherBtn = otherNav.querySelector(`.split-tab-button[data-tab="${tabId}"]`);
                    if (otherBtn) otherNav.appendChild(otherBtn);
                });
            }

            if (mainNav) {
                newOrder.forEach(tabId => {
                    const mainBtn = mainNav.querySelector(`.tab-button[data-tab="${tabId}"]`);
                    if (mainBtn) mainNav.appendChild(mainBtn);
                });
            }

            localStorage.setItem('tabOrder', JSON.stringify(newOrder));
            console.log('Tab order synced:', newOrder);
        });
    });
}

function onNavButtonClick(e) {
    const btn       = e.currentTarget;
    const tabId     = btn.dataset.tab;
    const panelSide = btn.dataset.panel;
    if (btn.disabled) return;

    document
        .querySelectorAll(`.split-tab-nav[data-panel-nav="${panelSide}"] .split-tab-button`)
        .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    panelState[panelSide].activeTab = tabId;

    if (panelSide === 'right') localStorage.setItem('splitRightTab', tabId);
    if (panelSide === 'left') localStorage.setItem('splitLeftTab', tabId);

    mountTabInPanel(tabId, panelSide);
    updateSingletonStates();
}

// ── Mount tab content into a panel ───────────────────────────────────────────

function mountTabInPanel(tabId, panelSide) {
    const contentArea = document.querySelector(`.split-content-area[data-panel-content="${panelSide}"]`);
    if (!contentArea) return;
    mountFreeTab(tabId, panelSide, contentArea);
}

function mountFreeTab(tabId, panelSide, contentArea) {
    if (panelAbortControllers[panelSide]) {
        panelAbortControllers[panelSide].abort();
    }
    panelAbortControllers[panelSide] = new AbortController();

    const tabNum = tabId.replace('tab', '');
    const ids    = getScopedIds(panelSide, tabNum);

    contentArea.innerHTML = buildFreeTabHTML(tabId, tabNum, panelSide, ids);

    if (tabId === 'tab9') initTab9PanelCircles(contentArea, panelSide);

    if (tabId === 'tab4' || tabId === 'tab8') {
        initCharacterSheetPanel(contentArea, tabId);
    } else {
        initPanelSearch(tabId, panelSide, tabNum, ids);
        initPanelFilters(tabId, panelSide, tabNum, ids);
        initPanelToggleFilter(tabId, panelSide, ids);
    }
    wirePanelBlockActions(tabId, panelSide, ids, contentArea);

    renderPanelBlocks(tabId, panelSide, ids, null, panelAbortControllers[panelSide].signal);
    renderPanelTags(tabId, panelSide, ids);

    console.log(`✅ Free tab ${tabId} mounted in ${panelSide} panel`);
}

// ── Scoped ID helpers ─────────────────────────────────────────────────────────

function getScopedIds(panelSide, tabNum) {
    const p = panelSide;
    return {
        filterWrapper:    `split-filter-wrapper-${p}-${tabNum}`,
        filterSection:    `split-filter-${p}-${tabNum}`,
        filterOverlayTop: `split-filter-overlay-top-${p}-${tabNum}`,
        filterOverlayBot: `split-filter-overlay-bot-${p}-${tabNum}`,
        searchInput:      `split-search-${p}-${tabNum}`,
        clearSearch:      `split-clear-search-${p}-${tabNum}`,
        clearFilters:     `split-clear-filters-${p}-${tabNum}`,
        toggleFilter:     `split-toggle-filter-${p}-${tabNum}`,
        resultsSection:   `split-results-${p}-${tabNum}`,
        tagsSection:      `split-tags-${p}-${tabNum}`,
        typeTagsSection:  `split-type-tags-${p}-${tabNum}`,
    };
}

// ── Build HTML for a free tab inside a panel ─────────────────────────────────

function buildFreeTabHTML(tabId, tabNum, panelSide, ids) {
    if (tabId === 'tab4' || tabId === 'tab8') {
        return buildCharSheetTabHTML(tabId, ids);
    }
    const hasTypeFilter = !!blockTypeConfig[tabId];
    const tab9Extras    = tabId === 'tab9' ? buildTab9Extras(panelSide) : '';

    return `
        <div class="split-tab-inner" data-panel="${panelSide}" data-tab="${tabId}"
             style="display:flex;flex-direction:column;height:100%;gap:20px;overflow:hidden;">
            ${tab9Extras}
            <div class="filter-and-results" style="flex:1;min-height:0;">
                <button id="${ids.toggleFilter}" class="toggle-filter-button">
                    <img src="./images/Filter_Hide_Icon.svg" alt="Filter icon">
                </button>
                <div class="filter-section-wrapper" id="${ids.filterWrapper}">
                    <div class="filter-section-overlay-top" id="${ids.filterOverlayTop}"></div>
                    <div class="filter-section-overlay-bottom" id="${ids.filterOverlayBot}"></div>
                    <div id="${ids.filterSection}" class="filter-section">
                        <div class="filter-sticky-top">
                            <button id="${ids.clearFilters}" class="clear_filters_button">Clear Filters</button>
                            <div class="search-container">
                                <input id="${ids.searchInput}" class="search_input" type="text" placeholder="Search by text" />
                                <button id="${ids.clearSearch}" class="clear-search">✖</button>
                            </div>
                        </div>
                        ${hasTypeFilter ? `<div class="block-type-tags" id="${ids.typeTagsSection}"></div>` : ''}
                        <div id="${ids.tagsSection}" class="tag-section"></div>
                    </div>
                </div>
                <div id="${ids.resultsSection}" class="results-section"></div>
            </div>
        </div>
    `;
}

// ── Tab9 circle interactivity ─────────────────────────────────────────────────

function initTab9PanelCircles(contentArea, panelSide) {
    const circleStates = JSON.parse(localStorage.getItem('circleStates')) || {};
    contentArea.querySelectorAll('.circle-section .circle').forEach((circle, i) => {
        circle.addEventListener('click', () => {
            circle.classList.toggle('unfilled');
            circleStates[i] = circle.classList.contains('unfilled');
            localStorage.setItem('circleStates', JSON.stringify(circleStates));
            syncTab9CirclesInOtherPanel(panelSide, 'suit', i, circleStates[i]);
        });
    });

    contentArea.querySelectorAll('.spell-slot-group').forEach((group, groupIdx) => {
        const lvl      = groupIdx + 1;
        const stateKey = `spellSlotStates_group_${lvl}`;
        const states   = JSON.parse(localStorage.getItem(stateKey)) || {};
        group.querySelectorAll('.circle').forEach((circle, i) => {
            circle.addEventListener('click', () => {
                circle.classList.toggle('unfilled');
                states[i] = circle.classList.contains('unfilled');
                localStorage.setItem(stateKey, JSON.stringify(states));
                syncTab9CirclesInOtherPanel(panelSide, 'slot', i, states[i], lvl);
            });
        });
    });
}

function syncTab9CirclesInOtherPanel(sourcePanelSide, type, index, state, lvl = null) {
    const otherSide = sourcePanelSide === 'left' ? 'right' : 'left';
    if (panelState[otherSide].activeTab !== 'tab9') return;

    const otherContent = document.querySelector(`.split-content-area[data-panel-content="${otherSide}"]`);
    if (!otherContent) return;

    if (type === 'suit') {
        const target = otherContent.querySelectorAll('.circle-section .circle')[index];
        if (target) target.classList.toggle('unfilled', state);
    } else if (type === 'slot') {
        const group  = otherContent.querySelectorAll('.spell-slot-group')[lvl - 1];
        if (!group) return;
        const target = group.querySelectorAll('.circle')[index];
        if (target) target.classList.toggle('unfilled', state);
    }
}

// ── Tab9 extras HTML ──────────────────────────────────────────────────────────

function buildTab9Extras(panelSide) {
    const circleStates = JSON.parse(localStorage.getItem('circleStates')) || {};
    const totalCircles = parseInt(localStorage.getItem('totalCircles') || '3', 10);

    const circlesHTML = Array.from({ length: totalCircles }, (_, i) =>
        `<span class="circle ${circleStates[i] ?? true ? 'unfilled' : ''}"></span>`
    ).join('');

    const slotsHTML = [1,2,3,4,5,6,7,8,9].map(lvl => {
        const states = JSON.parse(localStorage.getItem(`spellSlotStates_group_${lvl}`)) || {};
        const total  = parseInt(localStorage.getItem(`spellSlotTotalCircles_group_${lvl}`) || '0', 10);
        if (total === 0) return '';
        const circles = Array.from({ length: total }, (_, i) =>
            `<span class="circle ${states[i] ?? true ? 'unfilled' : ''}"></span>`
        ).join('');
        return `<div class="spell-slot-group" style="display:flex;align-items:center;gap:7.5px;">
                    <span class="spell-slot-title">${lvl}${lvl===1?'st':lvl===2?'nd':lvl===3?'rd':'th'} Lvl</span>
                    ${circles}
                </div>`;
    }).join('');

    return `
        <div class="circle-section" style="flex-shrink:0;">
            <span class="spell-slot-title">Suit Uses</span>
            <div style="display:flex;gap:7.5px;">${circlesHTML}</div>
        </div>
        ${slotsHTML ? `<div class="spell-slot-section" style="flex-shrink:0;">${slotsHTML}</div>` : ''}
    `;
}

// ── Character sheet tab HTML builder ─────────────────────────────────────────

function buildCharSheetTabHTML(tabId, ids) {
    const t = tabId; // e.g. 'tab4' or 'tab8'

    const abilityRows = ['str','dex','con','int','wis','cha'].map(ab => `
        <div class="main-stat-box">
            <span class="stat-label">${ab.toUpperCase()}</span>
            <span class="stat-value calculated" data-storage-key="${t}_${ab}_bonus"></span>
            <span class="stat-subvalue editable" contenteditable="true" data-storage-key="${t}_${ab}_score"></span>
        </div>`).join('');

    const saveRows = [
        ['str','Strength'],['dex','Dexterity'],['con','Constitution'],
        ['int','Intelligence'],['wis','Wisdom'],['cha','Charisma']
    ].map(([ab, label]) => `
        <div class="save-row">
            <span class="circle toggle-circle" data-storage-key="${t}_save_${ab}_toggle"></span>
            <span class="save-label">${label}</span>
            <span class="skill-plus calculated" data-storage-key="${t}_save_${ab}"></span>
        </div>`).join('');

    const skillRows = [
        ['acrobatics','dex','Acrobatics'],['animal_handling','wis','Animal Handling'],
        ['arcana','int','Arcana'],['athletics','str','Athletics'],
        ['deception','cha','Deception'],['history','int','History'],
        ['insight','wis','Insight'],['intimidation','cha','Intimidation'],
        ['investigation','int','Investigation'],['medicine','wis','Medicine'],
        ['nature','int','Nature'],['perception','wis','Perception'],
        ['performance','cha','Performance'],['persuasion','cha','Persuasion'],
        ['religion','int','Religion'],['sleight_of_hand','dex','Sleight of Hand'],
        ['stealth','dex','Stealth'],['survival','wis','Survival']
    ].map(([key, ab, label]) => `
        <div class="skill-row">
            <span class="circle toggle-circle" data-storage-key="${t}_skill_${key}_toggle"></span>
            <span class="skill-label">${label} (${ab})</span>
            <span class="skill-plus calculated" data-storage-key="${t}_skill_${key}"></span>
        </div>`).join('');

    return `
        <div style="display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;">
            <div class="character-sheet-stats">
                <div class="descriptor-grid">
                    ${['level','class','alignment','background','species'].map(f => `
                    <div class="descriptor-box">
                        <span class="descriptor-label">${f.charAt(0).toUpperCase() + f.slice(1)}</span>
                        <span class="descriptor-value editable" contenteditable="true" data-storage-key="${t}_${f}"></span>
                    </div>`).join('')}
                </div>
                <div class="stats-container-row">
                    <div class="hp-container-row">
                        <div class="main-hp-stat-box">
                            <span class="stat-label">HP</span>
                            <div class="current-hp-stat-box" style="display:flex;gap:10px;">
                                <span class="large-value editable" contenteditable="true" data-storage-key="${t}_hp"></span>
                                <span class="large-value" style="font-weight:100;">/</span>
                                <span class="large-value editable" contenteditable="true" data-storage-key="${t}_maxhp"></span>
                            </div>
                        </div>
                        <div class="vertical-break"></div>
                        <div class="hp-stat-box">
                            <span class="stat-label">Temp HP</span>
                            <span class="large-value editable" contenteditable="true" data-storage-key="${t}_temp_hp"></span>
                        </div>
                        <div class="vertical-break"></div>
                        <div class="hp-stat-box">
                            <span class="stat-label">Hit Die</span>
                            <span class="stat-value editable" contenteditable="true" data-storage-key="${t}_hit_die"></span>
                            <span class="stat-value editable" contenteditable="true" data-storage-key="${t}_hit_die_ratio"></span>
                        </div>
                    </div>
                    ${[['ac','AC'],['initiative','Initiative'],['prof','Prof'],['speed','Speed']].map(([k,l]) => `
                    <div class="stat-box">
                        <span class="stat-label">${l}</span>
                        <span class="large-value editable" contenteditable="true" data-storage-key="${t}_${k}"></span>
                    </div>`).join('')}
                </div>
                <div class="stats-container-row">
                    <div class="main-stats-container-row">${abilityRows}</div>
                    <div class="stat-box">
                        <span class="stat-label">Spell Save</span>
                        <span class="stat-value editable" contenteditable="true" data-storage-key="${t}_spell_save"></span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Spell attack</span>
                        <span class="stat-value editable" contenteditable="true" data-storage-key="${t}_spell_attack"></span>
                    </div>
                    <div class="death-saves-box">
                        <span class="stat-label">Death Saves</span>
                        <div class="death-saves-row">
                            <span class="circle deathSaveGreen toggle-circle" data-storage-key="${t}_deathSave_1"></span>
                            <span class="circle deathSaveGreen toggle-circle" data-storage-key="${t}_deathSave_2"></span>
                            <span class="circle deathSaveGreen toggle-circle" data-storage-key="${t}_deathSave_3"></span>
                        </div>
                        <div class="death-saves-row">
                            <span class="circle deathSaveRed toggle-circle" data-storage-key="${t}_deathSave_4"></span>
                            <span class="circle deathSaveRed toggle-circle" data-storage-key="${t}_deathSave_5"></span>
                            <span class="circle deathSaveRed toggle-circle" data-storage-key="${t}_deathSave_6"></span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="character-sheet-row" style="flex:1;min-height:0;">
                <div class="saving-throws-and-skills-column">
                    <div class="saving-throws">
                        <h3>Saving Throws</h3>
                        ${saveRows}
                    </div>
                    <div class="horizontal-break"></div>
                    <div class="skills">
                        <h3>Skills</h3>
                        ${skillRows}
                    </div>
                </div>
                <div id="${ids.resultsSection}" class="results-section character-sheet-results"></div>
            </div>
        </div>
    `;
}


// ── Character sheet panel initialiser ────────────────────────────────────────

function initCharacterSheetPanel(container, tabId) {
    // Populate all fields (editable and calculated) from localStorage
    container.querySelectorAll('[data-storage-key]').forEach(el => {
        if (el.classList.contains('toggle-circle')) return;
        const key   = el.getAttribute('data-storage-key');
        const saved = localStorage.getItem(key);
        if (saved !== null && saved !== '') el.textContent = saved;
    });
    // Wire editable fields
    container.querySelectorAll('.editable').forEach(field => {
        const key = field.getAttribute('data-storage-key');
        if (!key) return;

        field.addEventListener('focus', function () {
            const range = document.createRange();
            range.selectNodeContents(this);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            this.style.opacity = '1';
            this.dataset.initialValue = this.textContent;
        });

        field.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
                window.getSelection().removeAllRanges();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                if (this.dataset.initialValue !== undefined) {
                    this.textContent = this.dataset.initialValue;
                }
                this.blur();
            }
        });

        field.addEventListener('blur', function () {
            const val = this.textContent.trim();
            if (val) localStorage.setItem(key, val);
        });
    });

    // Wire toggle circles
    container.querySelectorAll('.toggle-circle').forEach(circle => {
        const key = circle.getAttribute('data-storage-key');
        if (!key) return;

        const isFilled = localStorage.getItem(key) === 'true';
        circle.classList.toggle('filled',   isFilled);
        circle.classList.toggle('unfilled', !isFilled);

        circle.addEventListener('click', function () {
            const nowFilled = this.classList.contains('unfilled');
            this.classList.toggle('filled',   nowFilled);
            this.classList.toggle('unfilled', !nowFilled);
            localStorage.setItem(key, nowFilled.toString());
        });
    });
}

// ── Render blocks ─────────────────────────────────────────────────────────────

export function renderPanelBlocks(tabId, panelSide, ids, filteredBlocks = null, signal = null) {
    if (!ids) {
        ids = getScopedIds(panelSide, tabId.replace('tab', ''));
    }

    const resultsSection = document.getElementById(ids.resultsSection);
    if (!resultsSection) return;

    const blocks = filteredBlocks || getFilteredBlocks(tabId, panelSide, ids);

    import('./blockTemplate.js').then(({ blockTemplate }) => {
        resultsSection.innerHTML = buildResultsHeader(tabId, panelSide, ids);

        // Permanent items always rendered first, before blocks
        if (tabId === 'tab6') {
            const permanentItems = [
                { id: 'perm1', defaultValue: '00', colorClass: 'gold-bg' },
                { id: 'perm2', defaultValue: '00', colorClass: 'silver-bg' },
                { id: 'perm3', defaultValue: '00', colorClass: 'copper-bg' },
            ];

            const permanentHTML = permanentItems.map(({ id, defaultValue, colorClass }) => {
                const savedValue = localStorage.getItem(`permanentItem_${id}`) || defaultValue;
                return `<div class="block minimized permanent-block ${colorClass}" data-id="${id}">
                            <h4 class="permanent-title" contenteditable="true">${savedValue}</h4>
                        </div>`;
            }).join('');

            resultsSection.insertAdjacentHTML('beforeend', `
                <div class="permanent-items-container">${permanentHTML}</div>
            `);

            resultsSection.querySelectorAll('.permanent-title').forEach(titleEl => {
                titleEl.addEventListener('blur', () => {
                    const blockId = titleEl.parentElement.getAttribute('data-id');
                    localStorage.setItem(`permanentItem_${blockId}`, titleEl.textContent.trim());
                });
            });
        }

        // Blocks rendered after permanent items
        const allBlocks     = appManager.getBlocks(tabId);
        const pinnedBlocks  = allBlocks.filter(b => b.pinned);
        const displayBlocks = blocks.filter(b => !b.pinned);

        if (pinnedBlocks.length > 0) {
            const pinnedHTML = pinnedBlocks.map(b => blockTemplate(b, tabId)).join('');
            resultsSection.insertAdjacentHTML('beforeend', `
                <div class="pinned-blocks-zone">
                    ${pinnedHTML}
                </div>
            `);
        }

        if (displayBlocks.length === 0 && pinnedBlocks.length === 0) {
            const p = document.createElement('p');
            p.className  = 'results-placeholder';
            p.textContent = 'Use the + button to add items here…';
            p.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;opacity:0.25;';
            resultsSection.appendChild(p);
        } else {
            displayBlocks.forEach(block => {
                resultsSection.insertAdjacentHTML('beforeend', blockTemplate(block, tabId));
                applyInlineDiceRolls(resultsSection);
            });
        }

        wirePanelHeaderButtons(tabId, panelSide, ids, signal);
    });
}

// ── Results header HTML ───────────────────────────────────────────────────────

function buildResultsHeader(tabId, panelSide, ids) {
    const tabNum = tabId.replace('tab', '');
    return `
        <div class="results-header" id="split-results-header-${panelSide}-${tabNum}">
            <div class="header-controls">
                <button class="results-settings split-sort-btn" data-panel="${panelSide}" data-tab="${tabId}" title="Sort">
                    <img src="./images/Sort_Icon.svg" alt="Sort icon">
                </button>
                <div class="sort-dropdown hidden split-sort-dropdown">
                    <button class="sort-item" data-sort="newest">Newest</button>
                    <button class="sort-item" data-sort="oldest">Oldest</button>
                    <button class="sort-item" data-sort="alpha">A‑Z</button>
                    <button class="sort-item" data-sort="unalpha">Z-A</button>
                </div>
                <button class="results-settings split-view-btn" data-panel="${panelSide}" data-tab="${tabId}" title="View">
                    <img src="./images/View_Icon.svg" alt="View icon">
                </button>
                <div class="view-toggle-dropdown hidden split-view-dropdown">
                    <button class="view-toggle-item" data-state="expanded">Expand</button>
                    <button class="view-toggle-item" data-state="condensed">Condense</button>
                    <button class="view-toggle-item" data-state="minimized">Minimize</button>
                </div>
                <button class="add-block-button green-button split-add-btn" data-panel="${panelSide}" data-tab="${tabId}">+</button>
            </div>
        </div>
    `;
}

// ── Block actions (on contentArea — persists across re-renders) ───────────────

function wirePanelBlockActions(tabId, panelSide, ids, contentArea) {
    contentArea.addEventListener('click', (e) => {
        if (panelState[panelSide].activeTab !== tabId) return;

        const blockEl = e.target.closest('.block:not(.permanent-block)');
        const validTargets = ['.block', '.block-header', '.block-header-left'];
        const isEmptySpace = validTargets.some(sel => {
            const el = blockEl.querySelector(sel);
            return e.target === el || e.target === blockEl;
        });
        if (blockEl && isEmptySpace) {

            const bId       = blockEl.getAttribute('data-id');
            const blocksArr = appManager.getBlocks(tabId);
            const tBlock    = blocksArr.find(b => b.id === bId);
            if (tBlock) {
                tBlock.viewState = tBlock.viewState === 'expanded'
                    ? (localStorage.getItem(`activeViewState_${tabId}`) || 'condensed')
                    : 'expanded';
                localStorage.setItem(`userBlocks_${tabId}`, JSON.stringify(blocksArr));
                renderPanelBlocks(tabId, panelSide, ids);
            }
            return;
        }

        const target  = e.target;
        const blockId = target.getAttribute('data-id');
        if (!blockId) return;

        const blocks = appManager.getBlocks(tabId);
        const block  = blocks.find(b => b.id === blockId);
        if (!block) return;

        if (target.classList.contains('pin-button')) {
            const allBlocks = appManager.getBlocks(tabId);
            const idx       = allBlocks.findIndex(b => b.id === blockId);
            if (idx !== -1) {
                allBlocks[idx].pinned = !allBlocks[idx].pinned;
                localStorage.setItem(`userBlocks_${tabId}`, JSON.stringify(allBlocks));
                refreshPanelsShowingTab(tabId);
            }
            return;
        }

        if (target.classList.contains('duplicate-button')) {
            appManager.saveBlock(tabId, `${block.title} (Copy)`, block.text,
                [...block.tags], block.uses || [], block.blockType || null);
            refreshPanelsShowingTab(tabId);
        } else if (target.classList.contains('edit-button')) {
            openEditOverlay(block, tabId, panelSide);
        } else if (target.classList.contains('remove-button')) {
            openRemoveOverlay(blockId, tabId, panelSide, ids);
        }
    });
}

// ── Header buttons (re-wired each render since header rebuilds) ───────────────

function wirePanelHeaderButtons(tabId, panelSide, ids, signal = null) {
    const tabNum = tabId.replace('tab', '');
    const header = document.getElementById(`split-results-header-${panelSide}-${tabNum}`);
    if (!header) return;

    const sortBtn = header.querySelector('.split-sort-btn');
    const sortDd  = header.querySelector('.split-sort-dropdown');
    const viewBtn = header.querySelector('.split-view-btn');
    const viewDd  = header.querySelector('.split-view-dropdown');
    const addBtn  = header.querySelector('.split-add-btn');

    const closeAll = () => {
        sortDd?.classList.add('hidden');
        viewDd?.classList.add('hidden');
    };

    const listenerOpts = signal ? { signal } : {};
    document.addEventListener('click', closeAll, listenerOpts);

    addBtn?.addEventListener('click', () => {
        const overlay = document.querySelector('.add-block-overlay');
        if (!overlay) return;
        overlay.dataset.activePanel = panelSide;
        overlay.dataset.activeTab   = tabId;

        const titleEl = document.getElementById('title_input_overlay');
        const textEl  = document.getElementById('block_text_overlay');
        const tagsEl  = document.getElementById('tags_input_overlay');
        if (titleEl) titleEl.value = '';
        if (textEl)  textEl.innerHTML = '';
        if (tagsEl)  tagsEl.value = '';
        document.querySelectorAll('.add-block-overlay .tag-button.selected')
            .forEach(t => t.classList.remove('selected'));

        import('./overlayHandler.js').then(({ overlayHandler, initUsesField }) => {
            overlayHandler.initializeOverlayTagHandlers('add_block_overlay_tags', [], tabId);
            overlayHandler.populateBlockTypeOverlay('character_type_tags_add', [], tabId);
            localStorage.removeItem('uses_field_overlay_state');
            const usesContainer = document.getElementById('uses_field_overlay');
            if (usesContainer) initUsesField(usesContainer, 'uses_field_overlay_state');
        });

        overlay.classList.add('show');
    });

    sortBtn?.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = !sortDd.classList.contains('hidden');
        closeAll();
        if (!wasOpen) sortDd.classList.remove('hidden');
    });
    sortDd?.querySelectorAll('.sort-item').forEach(item => {
        item.addEventListener('click', e => {
            e.stopPropagation();
            localStorage.setItem(`activeSortOrder_${tabId}`, item.dataset.sort);
            sortDd.querySelectorAll('.sort-item').forEach(i => i.classList.toggle('selected', i === item));
            sortDd.classList.add('hidden');
            renderPanelBlocks(tabId, panelSide, ids);
        });
    });

    viewBtn?.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = !viewDd.classList.contains('hidden');
        closeAll();
        if (!wasOpen) viewDd.classList.remove('hidden');
    });
    viewDd?.querySelectorAll('.view-toggle-item').forEach(item => {
        item.addEventListener('click', e => {
            e.stopPropagation();
            const state  = item.dataset.state;
            const blocks = appManager.getBlocks(tabId);
            blocks.forEach(b => b.viewState = state);
            localStorage.setItem(`userBlocks_${tabId}`, JSON.stringify(blocks));
            if (state !== 'expanded') localStorage.setItem(`activeViewState_${tabId}`, state);
            viewDd.classList.add('hidden');
            renderPanelBlocks(tabId, panelSide, ids);
        });
    });
}

// ── Edit overlay ──────────────────────────────────────────────────────────────

function openEditOverlay(block, tabId, panelSide) {
    const overlay = document.querySelector('.edit-block-overlay');
    if (!overlay) return;

    overlay.dataset.activePanel = panelSide;
    overlay.dataset.activeTab   = tabId;
    overlay.dataset.blockId     = block.id;

    document.getElementById('title_input_edit_overlay').value = block.title;
    const editBody = document.getElementById('block_text_edit_overlay');
    editBody.innerHTML = block.text.replace(/\n/g, '<br>');
    editBody.dispatchEvent(new Event('input'));

    import('./overlayHandler.js').then(({ initUsesField, overlayHandler }) => {
        const usesContainer = document.getElementById('uses_field_edit_overlay');
        if (usesContainer) {
            localStorage.setItem('uses_field_edit_overlay_state', JSON.stringify(block.uses || []));
            initUsesField(usesContainer, 'uses_field_edit_overlay_state');
        }
        overlayHandler.initializeOverlayTagHandlers('predefined_tags_edit', block.tags, tabId);
        overlayHandler.populateBlockTypeOverlay('character_type_tags_edit', [], tabId);

        setTimeout(() => {
            document.querySelectorAll('.edit-block-overlay .tag-button').forEach(tagBtn => {
                const tag = tagBtn.dataset.tag;
                if (tag && !tagBtn.closest('#character_type_tags_edit')) {
                    tagBtn.classList.toggle('selected', block.tags.includes(tag));
                }
            });
            const tabBTConfig = blockTypeConfig[tabId];
            if (tabBTConfig) {
                const blockTypes = Array.isArray(block.blockType)
                    ? block.blockType
                    : (block.blockType ? [block.blockType] : []);
                document.querySelectorAll('#character_type_tags_edit .tag-button').forEach(btn => {
                    btn.classList.toggle('selected', blockTypes.includes(btn.dataset.tag));
                });
            }
        }, 100);
    });

    overlay.classList.add('show');
}

// ── Remove overlay ────────────────────────────────────────────────────────────

function openRemoveOverlay(blockId, tabId, panelSide, ids) {
    const overlay    = document.querySelector('.remove-block-overlay');
    if (!overlay) return;

    const confirmBtn = document.getElementById('confirm_remove_button');
    const cancelBtn  = document.getElementById('cancel_remove_button');

    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);

    newConfirm.addEventListener('click', () => {
        appManager.removeBlock(blockId, tabId);
        overlay.classList.remove('show');
        refreshPanelsShowingTab(tabId);
    });

    cancelBtn.addEventListener('click', () => overlay.classList.remove('show'), { once: true });
    overlay.classList.add('show');
}

// ── Search ────────────────────────────────────────────────────────────────────

function initPanelSearch(tabId, panelSide, tabNum, ids) {
    const searchInput = document.getElementById(ids.searchInput);
    const clearBtn    = document.getElementById(ids.clearSearch);
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        if (!panelState[panelSide].searchQuery) panelState[panelSide].searchQuery = {};
        panelState[panelSide].searchQuery[tabId] = searchInput.value.trim().toLowerCase();
        renderPanelBlocks(tabId, panelSide, ids);
    });

    clearBtn?.addEventListener('click', () => {
        searchInput.value = '';
        if (panelState[panelSide].searchQuery) panelState[panelSide].searchQuery[tabId] = '';
        renderPanelBlocks(tabId, panelSide, ids);
    });
}

// ── Filters ───────────────────────────────────────────────────────────────────

function initPanelFilters(tabId, panelSide, tabNum, ids) {
    const clearBtn = document.getElementById(ids.clearFilters);

    const typeContainer = document.getElementById(ids.typeTagsSection);
    const btConfig = blockTypeConfig[tabId];
    if (typeContainer && btConfig) {
        typeContainer.innerHTML = btConfig.types.map(type =>
            `<button class="tag-button ${btConfig.className} split-type-btn"
                     data-tag="${type}" data-panel="${panelSide}" data-tab="${tabId}">${type}</button>`
        ).join('');
        typeContainer.addEventListener('click', e => {
            const btn = e.target.closest('.split-type-btn');
            if (!btn) return;
            btn.classList.toggle('selected');
            renderPanelBlocks(tabId, panelSide, ids);
        });
    }

    const tagsSection = document.getElementById(ids.tagsSection);
    if (tagsSection) {
        tagsSection.addEventListener('click', e => {
            const btn = e.target.closest('.tag-button');
            if (!btn) return;
            btn.classList.toggle('selected');
            if (!panelState[panelSide].selectedTags) panelState[panelSide].selectedTags = {};
            panelState[panelSide].selectedTags[tabId] = [
                ...tagsSection.querySelectorAll('.tag-button.selected')
            ].map(b => b.dataset.tag);
            renderPanelBlocks(tabId, panelSide, ids);
        });
    }

    clearBtn?.addEventListener('click', () => {
        document.querySelectorAll(`#${ids.typeTagsSection} .tag-button.selected`)
            .forEach(b => b.classList.remove('selected'));
        document.querySelectorAll(`#${ids.tagsSection} .tag-button.selected`)
            .forEach(b => b.classList.remove('selected'));
        if (panelState[panelSide].selectedTags) panelState[panelSide].selectedTags[tabId] = [];
        const searchInput = document.getElementById(ids.searchInput);
        if (searchInput) searchInput.value = '';
        if (panelState[panelSide].searchQuery) panelState[panelSide].searchQuery[tabId] = '';
        renderPanelBlocks(tabId, panelSide, ids);
    });
}

// ── Toggle filter panel ───────────────────────────────────────────────────────

function initPanelToggleFilter(tabId, panelSide, ids) {
    const toggleBtn = document.getElementById(ids.toggleFilter);
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const wrapper    = document.getElementById(ids.filterWrapper);
        const filterEl   = document.getElementById(ids.filterSection);
        const overlayTop = document.getElementById(ids.filterOverlayTop);
        const overlayBot = document.getElementById(ids.filterOverlayBot);

        [filterEl, wrapper, overlayTop, overlayBot].forEach(el => el?.classList.toggle('hidden'));

        const isHidden = filterEl?.classList.contains('hidden');
        toggleBtn.innerHTML = isHidden
            ? '<img src="./images/Filter_Open_Icon.svg" alt="Filter icon">'
            : '<img src="./images/Filter_Hide_Icon.svg" alt="Arrow left icon">';
    });
}

// ── Render tags ───────────────────────────────────────────────────────────────

function renderPanelTags(tabId, panelSide, ids) {
    const tagsSection = document.getElementById(ids.tagsSection);
    if (!tagsSection) return;

    const blocks        = appManager.getBlocks(tabId);
    const allPredefined = Object.entries(categoryTags)
        .filter(([_, data]) => data.tabs.includes(tabId))
        .flatMap(([_, data]) => data.tags);

    const usedTags     = new Set(blocks.flatMap(b => b.tags));
    const selectedTags = panelState[panelSide].selectedTags?.[tabId] || [];

    const currentlyOpen = new Set(
    [...(tagsSection.querySelectorAll('.tag-accordion-header.open') || [])]
        .map(h => h.dataset.category)
    );

let html = '';
    Object.entries(categoryTags).forEach(([category, data]) => {
        if (!data.tabs.includes(tabId)) return;
        const used = data.tags.filter(t => usedTags.has(t));
        if (!used.length) return;

        const label       = data.label || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const hasSelected = used.some(t => selectedTags.includes(t));
        const openClass = (hasSelected || currentlyOpen.has(category)) ? ' open' : '';

        html += `<div class="tag-accordion-group">`;
        html += `<button class="tag-accordion-header${openClass}" data-category="${category}">`;
        html += `<span>${label}</span><span class="accordion-chevron"></span>`;
        html += `</button>`;
        html += `<div class="tag-accordion-body${openClass}">`;
        html += used.map(tag => {
            const sel = selectedTags.includes(tag) ? 'selected' : '';
            return `<button class="tag-button ${data.className} ${sel}" data-tag="${tag}">${tag}</button>`;
        }).join('');
        html += `</div></div>`;
    });

    const userTags = [...usedTags]
        .filter(t => !allPredefined.includes(t))
        .map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
        .sort();
    if (userTags.length) {
        html += `<div class="tag-category user-tags">`;
        userTags.forEach(tag => {
            const sel = selectedTags.includes(tag) ? 'selected' : '';
            html += `<button class="tag-button tag-user ${sel}" data-tag="${tag}">${tag}</button>`;
        });
        html += `</div>`;
    }

    tagsSection.innerHTML = html;
}

// ── Get filtered blocks ───────────────────────────────────────────────────────

function getFilteredBlocks(tabId, panelSide, ids) {
    let blocks = appManager.getBlocks(tabId);

    if (ids) {
        const typeTagsEl = document.getElementById(ids.typeTagsSection);
        if (typeTagsEl) {
            const selectedTypes = [...typeTagsEl.querySelectorAll('.tag-button.selected')].map(b => b.dataset.tag);
            if (selectedTypes.length) {
                blocks = blocks.filter(block => {
                    const types = Array.isArray(block.blockType)
                        ? block.blockType
                        : (block.blockType ? [block.blockType] : []);
                    return selectedTypes.every(t => types.includes(t));
                });
            }
        }
    }

    const selectedTags = panelState[panelSide].selectedTags?.[tabId] || [];
    if (selectedTags.length) {
        blocks = blocks.filter(b =>
            selectedTags.every(t => b.tags.some(bt =>
                bt.charAt(0).toUpperCase() + bt.slice(1).toLowerCase() ===
                t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
            ))
        );
    }

    const query = panelState[panelSide].searchQuery?.[tabId] || '';
    if (query) {
        blocks = blocks.filter(b =>
            b.title.toLowerCase().includes(query) ||
            stripHTML(b.text).toLowerCase().includes(query)
        );
    }

    return blocks;
}

// ── Singleton disable logic ───────────────────────────────────────────────────

function updateSingletonStates() {
    TABS.forEach(({ id }) => {
        if (!SINGLETON_TABS.has(id)) return;
        const inUseByLeft  = panelState.left.activeTab  === id;
        const inUseByRight = panelState.right.activeTab === id;

        document.querySelectorAll(`.split-tab-button[data-tab="${id}"]`).forEach(btn => {
            const btnPanel   = btn.dataset.panel;
            const otherHasIt =
                (btnPanel === 'left'  && inUseByRight) ||
                (btnPanel === 'right' && inUseByLeft);
            btn.disabled = otherHasIt;
            btn.classList.toggle('disabled', otherHasIt);
        });
    });
}

// ── Public: re-render panels showing a tab ────────────────────────────────────

export function refreshPanelsShowingTab(tabId) {
    ['left', 'right'].forEach(side => {
        if (panelState[side].activeTab !== tabId) return;
        if (SINGLETON_TABS.has(tabId)) return;
        const ids    = getScopedIds(side, tabId.replace('tab', ''));
        const signal = panelAbortControllers[side]?.signal ?? null;
        renderPanelBlocks(tabId, side, ids, null, signal);
        renderPanelTags(tabId, side, ids);
    });
}