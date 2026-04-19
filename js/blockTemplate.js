import { filterManager } from './filterManager.js';
import { categoryTags, blockTypeConfig } from './tagConfig.js';
import { toggleBlockUse } from './uiHandlers.js';

// Chain SVG — tab6 attunement marker
const ATTUNEMENT_CHAIN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.5-1.5"/></svg>`;

// Hand SVG — tab6 equipped marker
const EQUIPPED_HAND_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5c-.83 0-1.5.67-1.5 1.5v6H10V4c0-.83-.67-1.5-1.5-1.5S7 3.17 7 4v8.5l-1.8-1.9c-.6-.6-1.55-.6-2.15 0-.6.6-.6 1.55 0 2.15l4.2 4.3c1.3 1.35 3.1 2.2 5.1 2.2h1.4c3.87 0 7-3.13 7-7V7c0-.83-.67-1.5-1.5-1.5S18 6.17 18 7v3.5h-.5V5c0-.83-.67-1.5-1.5-1.5S14.5 4.17 14.5 5v4.5h-.5V3c0-.83-.67-1.5-1.5-1.5z"/></svg>`;
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

    // Hide all tags on tab6 blocks (clean minimized look)
    const hasAnyTags = isTab6
        ? false
        : (blockTypeHTML !== "" || predefinedTagsHTML.trim() !== "" || userTagsHTML.trim() !== "");
    const tagSectionsHTML = hasAnyTags ? `
        <div class="block-tags">
            ${blockTypeHTML}
            ${predefinedTagsHTML}
            ${userTagsHTML}
        </div>
    ` : "";

    let bodyHTML = block.text || "";
    bodyHTML = bodyHTML
        .replace(/<div[^>]*>/gi, '')
        .replace(/^(&nbsp;|\s)+/gi, '')
        .replace(/<\/div>/gi, '<br>')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/p>/gi, '<br>')
        .trim();

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

    // Pin button — omit on tab6 (replaced by the equipped hand)
    const pinButtonHTML = (viewState !== 'session-log' && !isTab6)
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

    let content = "";
    if (viewState === 'expanded') {
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
    } else if (viewState === 'condensed') {
        const usesHTML = block.uses
            ? block.uses.map((state, idx) =>
                `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`
              ).join("")
            : "";
        const condensedTagsHTML = hasAnyTags ? `
            <div class="block-tags block-tags-condensed">
                ${blockTypeHTML}
                ${predefinedTagsHTML}
                ${userTagsHTML}
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

    return `
        <div class="block ${viewState}${block.pinned ? ' pinned' : ''}" data-id="${block.id}">
            ${content}
        </div>
    `;
};