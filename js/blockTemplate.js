import { filterManager } from './filterManager.js';
import { categoryTags, blockTypeConfig, BOOK_ACCENT_COLORS, DEFAULT_BOOK_ACCENT } from './tagConfig.js';
import { toggleBlockUse } from './uiHandlers.js';

export function sanitizeBlockHTML(html) {
    return (html || '')
        .replace(/<div[^>]*>/gi, '')
        .replace(/^(&nbsp;|\s)+/gi, '')
        .replace(/<\/div>/gi, '<br>')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/p>/gi, '<br>')
        .trim();
}

// Chain SVG — tab6 attunement marker
const ATTUNEMENT_CHAIN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.5-1.5"/></svg>`;

// Hand SVG — tab6 equipped marker
const EQUIPPED_HAND_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5c-.83 0-1.5.67-1.5 1.5v6H10V4c0-.83-.67-1.5-1.5-1.5S7 3.17 7 4v8.5l-1.8-1.9c-.6-.6-1.55-.6-2.15 0-.6.6-.6 1.55 0 2.15l4.2 4.3c1.3 1.35 3.1 2.2 5.1 2.2h1.4c3.87 0 7-3.13 7-7V7c0-.83-.67-1.5-1.5-1.5S18 6.17 18 7v3.5h-.5V5c0-.83-.67-1.5-1.5-1.5S14.5 4.17 14.5 5v4.5h-.5V3c0-.83-.67-1.5-1.5-1.5z"/></svg>`;

// ── Tab3 quest helpers ───────────────────────────────────────────
export const QUEST_STATUSES = ["active", "on hold", "not started", "completed", "failed"];
export const QUEST_STATUS_LABELS = {
    "active":      "Active",
    "on hold":     "On hold",
    "not started": "Not started",
    "completed":   "Completed",
    "failed":      "Failed"
};

const buildQuestProgressHTML = (done, total, mini = false) => {
    const pct = total > 0 ? (done / total) * 100 : 0;
    return `
        <div class="quest-progress${mini ? ' mini' : ''}">
            <div class="quest-progress-track"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
            <span class="quest-progress-count">${done} / ${total}</span>
        </div>
    `;
};

const buildQuestStatusPillHTML = (status, blockId) => {
    const s     = status || "active";
    const label = QUEST_STATUS_LABELS[s] || "Active";
    return `<button class="quest-status-pill status-${s.replace(/\s+/g, '-')}" data-id="${blockId}" data-status="${s}"><span class="quest-status-dot"></span>${label}</button>`;
};

const buildQuestLocationPillHTML = (location) => {
    if (!location || location === "N/A") return "";
    return `<span class="quest-location-pill">${location}</span>`;
};

const buildQuestObjectivesHTML = (blockId, objectives) => {
    if (!Array.isArray(objectives) || objectives.length === 0) {
        return `<div class="quest-objectives-empty">No objectives yet</div>`;
    }
    return `
        <div class="quest-objectives">
            ${objectives.map((o, idx) => `
                <div class="quest-objective${o.done ? ' done' : ''}" onclick="toggleObjective('${blockId}', ${idx}, event, this)">
                    <span class="quest-objective-checkbox">
                        <svg class="quest-objective-tick" viewBox="0 0 9 9" aria-hidden="true"><path d="M1 4.5 L4 7 L8 1.5" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <span class="quest-objective-text">${o.text || ""}</span>
                </div>
            `).join('')}
        </div>
    `;
};

export const blockTemplate = (block, tab = "tab4") => {
    const viewState = block.viewState || 'expanded';
    const isTab6 = tab === 'tab6';

    const andTags = filterManager.getAndTags();
    const orTags  = filterManager.getOrTags();
    const notTags = filterManager.getNotTags();
    const selClass = tag =>
        andTags.includes(tag)  ? 'selected'     :
        orTags.includes(tag)   ? 'selected-or'  :
        notTags.includes(tag)  ? 'selected-not' : '';

    const tabPredefinedTags = Object.entries(categoryTags)
        .filter(([_, data]) => data.tabs.includes(tab))
        .flatMap(([_, data]) => data.tags);

    const predefinedTagsByCategory = Object.fromEntries(
        Object.entries(categoryTags)
            .filter(([_, data]) => data.tabs.includes(tab))
            .map(([category, data]) => [
                category,
                Array.isArray(data.tags) ? data.tags.filter(tag => block.tags.includes(tag)) : []
            ])
    );

    const predefinedTagsHTML = Object.entries(predefinedTagsByCategory)
        .map(([category, tags]) =>
            tags.map(tag => {
                const tagClass = categoryTags[category]?.className || "tag-default";
                return `<span class="tag-button ${tagClass} ${selClass(tag)}" data-tag="${tag}">${tag}</span>`;
            }).join("")
        )
        .join("");

    const userTags = block.tags
        .filter(tag => !tabPredefinedTags.includes(tag))
        .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());

    const userTagsHTML = userTags.map(tag =>
        `<span class="tag-button tag-user ${selClass(tag)}" data-tag="${tag}">${tag}</span>`
    ).join("");

    const propertiesHTML = (viewState === 'expanded' && !isTab6 && block.properties && block.properties.length > 0)
        ? `<div class="block-properties">${block.properties.map(p =>
            `<span class="block-property">${p}</span>`
          ).join("")}</div>`
        : "";

    const blockTypes = Array.isArray(block.blockType)
        ? block.blockType
        : (block.blockType ? [block.blockType] : []);

    const blockTypeClass = blockTypeConfig[tab]?.className || "tag-characterType";
    const blockTypeHTML = blockTypes.map(bt =>
        `<span class="tag-button ${blockTypeClass} ${selClass(bt)}" data-tag="${bt}">${bt}</span>`
    ).join("");

    // ── Tab3 state (needed for tag overrides below) ────────────────
    const isTab3      = tab === 'tab3';
    const isTab3Quest = isTab3 && blockTypes.includes('Quest');
    const isTab3Map   = isTab3 && blockTypes.includes('Map');
    const isTab3Book  = isTab3 && blockTypes.includes('Book');
    const isTab3Notes = isTab3 && blockTypes.includes('Notes');

    // ── Tab3 overrides: no block-type tag, no user tags, show location instead
    // Quest blocks carry location in their quest-meta-row already, so skip here.
    let effectiveBlockTypeHTML = blockTypeHTML;
    let effectiveUserTagsHTML  = userTagsHTML;
    let tab3LocationTagHTML    = '';
    if (isTab3) {
        effectiveBlockTypeHTML = '';
        effectiveUserTagsHTML  = '';
        if (!isTab3Quest && block.location && block.location !== 'N/A') {
            tab3LocationTagHTML = `<span class="quest-location-pill">${block.location}</span>`;
        }
    }

    // Hide all tags on tab6 blocks (clean minimized look)
    const hasAnyTags = isTab6
        ? false
        : (effectiveBlockTypeHTML !== "" || predefinedTagsHTML.trim() !== "" || effectiveUserTagsHTML.trim() !== "" || tab3LocationTagHTML !== "");
    const tagSectionsHTML = hasAnyTags ? `
        <div class="block-tags">
            ${effectiveBlockTypeHTML}
            ${predefinedTagsHTML}
            ${effectiveUserTagsHTML}
            ${tab3LocationTagHTML}
        </div>
    ` : "";

    const bodyHTML = sanitizeBlockHTML(block.text);

    const hasBody = bodyHTML.trim() !== "";

    // Chain icon — tab6 only, only when requiresAttunement
    const showChain = isTab6 && block.requiresAttunement === true;
    const chainHTML = showChain
        ? `<span class="block-attune-chain ${block.attuned ? 'attuned' : 'unattuned'}" data-id="${block.id}" title="${block.attuned ? 'Attuned (click to unattune)' : 'Not attuned (click to attune)'}">${ATTUNEMENT_CHAIN_SVG}</span>`
        : "";

    // Hand icon — tab6 only, only when equipable
    const showHand = isTab6 && block.equipable === true;
    const handHTML = showHand
        ? `<span class="block-equip-hand ${block.equipped ? 'equipped' : 'unequipped'}" data-id="${block.id}" title="${block.equipped ? 'Equipped (click to unequip)' : 'Not equipped (click to equip)'}">${EQUIPPED_HAND_SVG}</span>`
        : "";

    // Pin button — only on tab9
    const isTab9 = tab === 'tab9';
    const pinButtonHTML = (viewState !== 'session-log' && isTab9)
        ? `<button class="action-button pin-button${block.pinned ? ' pin-active' : ''}" data-id="${block.id}" title="${block.pinned ? 'Unpin' : 'Pin'}">
                <img src="images/${block.pinned ? 'Pin_Icon_Blue' : 'Pin_Icon'}.svg" alt="Pin" />
           </button>`
        : '';

    const actionMenuHTML = `
        <div class="block-actions">
            ${pinButtonHTML}
            <div class="block-actions-menu">
                <div class="block-actions-reveal">
                    <button class="action-button remove-button red-button" data-id="${block.id}" title="Remove">×</button>
                    <button class="action-button duplicate-button blue-button" data-id="${block.id}" title="Copy">❐</button>
                    <button class="action-button edit-button orange-button" data-id="${block.id}" title="Edit">✎</button>
                </div>
                <button class="actions-trigger" title="Actions">···</button>
            </div>
        </div>
    `;

    // Tab6 blocks never show the action menu on the block — actions live in viewer
    const tab6ActionMenu = isTab6 ? "" : actionMenuHTML;

// Quest-specific derived values (isTab3Quest/isTab3Map defined earlier)
    const questStatus     = isTab3Quest ? (block.status || 'active') : null;
    const questObjectives = isTab3Quest && Array.isArray(block.objectives) ? block.objectives : [];
    const questDone       = questObjectives.filter(o => o.done).length;
    const questClass      = isTab3Quest ? ` quest-block status-${questStatus.replace(/\s+/g, '-')}` : '';
    const mapClass        = isTab3Map ? ' map-block' : '';
    const bookClass       = isTab3Book ? ' book-block' : '';

    // Resolve book accent colour (default if missing/unknown)
    const bookAccentId  = isTab3Book ? (block.bookColor || DEFAULT_BOOK_ACCENT) : null;
    const bookAccentHex = isTab3Book
        ? (BOOK_ACCENT_COLORS.find(c => c.id === bookAccentId)?.hex
           || BOOK_ACCENT_COLORS.find(c => c.id === DEFAULT_BOOK_ACCENT)?.hex
           || '#f4a261')
        : null;
    const bookDescription = isTab3Book ? (block.description || '') : '';

    let content = "";
    if (viewState === 'expanded') {
        if (isTab3Quest) {
            const questIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;
            content = `
                <div class="block-header">
                    <div class="block-header-left">
                        <div class="quest-card-thumb">${questIconSVG}</div>
                        <div class="block-title"><h4>${block.title}</h4></div>
                    </div>
                    ${tab6ActionMenu}
                </div>
                <div class="quest-meta-row">
                    ${buildQuestStatusPillHTML(questStatus, block.id)}
                    ${buildQuestLocationPillHTML(block.location)}
                </div>
                ${tagSectionsHTML}
                ${buildQuestProgressHTML(questDone, questObjectives.length)}
                ${buildQuestObjectivesHTML(block.id, questObjectives)}
                ${ hasBody ? `<div class="block-body"><span>${bodyHTML}</span></div>` : "" }
            `;
        } else if (isTab3Notes) {
            const notesIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
            const notesDescription = block.description || '';
            const usesHTML = block.uses
                ? block.uses.map((state, idx) =>
                    `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`
                  ).join("")
                : "";
            content = `
                <div class="block-header">
                    <div class="block-header-left">
                        <div class="notes-card-thumb">${notesIconSVG}</div>
                        <div class="notes-card-text${notesDescription ? '' : ' notes-card-text-no-desc'}">
                            <div class="block-title"><h4>${block.title}</h4></div>
                            ${notesDescription ? `<div class="notes-card-description">${notesDescription}</div>` : ''}
                        </div>
                        ${ usesHTML ? `<div class="block-uses">${usesHTML}</div>` : "" }
                    </div>
                    ${tab6ActionMenu}
                </div>
                ${tagSectionsHTML}
                ${ hasBody ? `<div class="block-body"><span>${bodyHTML}</span></div>` : "" }
            `;
        } else if (isTab3Book) {
            const bookIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 4.5A2.5 2.5 0 0 0 6.5 7H20"/></svg>`;
            const usesHTML = block.uses
                ? block.uses.map((state, idx) =>
                    `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`
                  ).join("")
                : "";
            content = `
                <div class="block-header">
                    <div class="block-header-left">
                        <div class="book-card-thumb">${bookIconSVG}</div>
                        <div class="book-card-text${bookDescription ? '' : ' book-card-text-no-desc'}">
                            <div class="book-card-title"><h4>${block.title}</h4></div>
                            ${bookDescription ? `<div class="book-card-description">${bookDescription}</div>` : ''}
                        </div>
                        ${ usesHTML ? `<div class="block-uses">${usesHTML}</div>` : "" }
                    </div>
                    ${tab6ActionMenu}
                </div>
                ${tagSectionsHTML}
                ${ hasBody ? `<div class="block-body"><span>${bodyHTML}</span></div>` : "" }
            `;
        } else {
            const usesHTML = block.uses
                ? block.uses.map((state, idx) =>
                    `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`
                  ).join("")
                : "";
            content = `
                <div class="block-header">
                    <div class="block-header-left">
                        ${chainHTML}
                        ${handHTML}
                        <div class="block-title"><h4>${block.title}</h4></div>
                        ${ usesHTML ? `<div class="block-uses">${usesHTML}</div>` : "" }
                    </div>
                    ${tab6ActionMenu}
                </div>
                ${tagSectionsHTML}
                ${propertiesHTML}
                ${ hasBody ? `<div class="block-body"><span>${bodyHTML}</span></div>` : "" }
            `;
        }

    } else if (viewState === 'condensed') {
        if (isTab3Quest) {
            const questIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;
            content = `
                <div class="block-header">
                    <div class="block-header-left">
                        <div class="quest-card-thumb">${questIconSVG}</div>
                        <div class="block-title"><h4>${block.title}</h4></div>
                    </div>
                    ${tab6ActionMenu}
                </div>
                <div class="quest-meta-row">
                    ${buildQuestStatusPillHTML(questStatus, block.id)}
                    ${buildQuestLocationPillHTML(block.location)}
                </div>
                ${buildQuestProgressHTML(questDone, questObjectives.length)}
            `;
        } else if (isTab3Map) {
            const mapIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></svg>`;
            content = `
                <div class="block-header">
                    <div class="block-header-left">
                        <div class="map-card-thumb">${mapIconSVG}</div>
                        <div class="map-card-text">
                            <div class="map-card-title"><h4>${block.title}</h4></div>
                            ${block.url ? `<div class="map-card-url">${block.url}</div>` : ''}
                        </div>
                    </div>
                    ${tab6ActionMenu}
                </div>
            `;
        } else if (isTab3Book) {
            const bookIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 4.5A2.5 2.5 0 0 0 6.5 7H20"/></svg>`;
            content = `
                <div class="block-header">
                    <div class="block-header-left">
                        <div class="book-card-thumb">${bookIconSVG}</div>
                        <div class="book-card-text${bookDescription ? '' : ' book-card-text-no-desc'}">
                            <div class="book-card-title"><h4>${block.title}</h4></div>
                            ${bookDescription ? `<div class="book-card-description">${bookDescription}</div>` : ''}
                        </div>
                    </div>
                    ${tab6ActionMenu}
                </div>
            `;
        } else if (isTab3Notes) {
            const notesIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
            const notesDescription = block.description || '';
            content = `
                <div class="block-header">
                    <div class="block-header-left">
                        <div class="notes-card-thumb">${notesIconSVG}</div>
                        <div class="notes-card-text${notesDescription ? '' : ' notes-card-text-no-desc'}">
                            <div class="block-title"><h4>${block.title}</h4></div>
                            ${notesDescription ? `<div class="notes-card-description">${notesDescription}</div>` : ''}
                        </div>
                    </div>
                    ${tab6ActionMenu}
                </div>
            `;
        } else {
            const usesHTML = block.uses
                ? block.uses.map((state, idx) =>
                    `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`
                  ).join("")
                : "";
            const condensedTagsHTML = hasAnyTags ? `
                <div class="block-tags block-tags-condensed">
                    ${effectiveBlockTypeHTML}
                    ${predefinedTagsHTML}
                    ${effectiveUserTagsHTML}
                    ${tab3LocationTagHTML}
                </div>
            ` : "";
            content = `
                <div class="block-header">
                    ${chainHTML}
                    ${handHTML}
                    <div class="block-title"><h4>${block.title}</h4></div>
                    ${ usesHTML ? `<div class="block-uses">${usesHTML}</div>` : "" }
                    ${condensedTagsHTML}
                    ${tab6ActionMenu}
                </div>
            `;
        }
    } else if (viewState === 'session-log') {
        content = `
            <div class="block-header">
                <div class="block-title"><h4>${block.title}</h4></div>
            </div>
        `;
    } else if (viewState === 'minimized') {
        const usesHTML = block.uses
            ? block.uses.map((state, idx) =>
                `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`
              ).join("")
            : "";
        content = `
            <div class="block-header">
                ${chainHTML}
                ${handHTML}
                <div class="block-title-minimized"><h4>${block.title}</h4></div>
                ${usesHTML ? `<div class="block-uses">${usesHTML}</div>` : ""}
            </div>
        `;
    }

        const bookStyle = isTab3Book ? ` style="--book-accent:${bookAccentHex};"` : '';
        return `
        <div class="block ${viewState}${(block.pinned && !isTab3) ? ' pinned' : ''}${questClass}${mapClass}${bookClass}" data-id="${block.id}"${bookStyle}>
            ${content}
        </div>
    `;
};