export const categoryTags = {
    Charges: {
        label: "Charges",
        tags: ["0", "1", "2", "3", "1pC", "1pD", "1pLR", "1pSR"],
        className: "tag-Charges",
        tabs: ["tab9"]
    },

    part_type: {
        label: "Part Type",
        tags: ["Helm", "Torso", "Left arm", "Right arm", "Legs", "Boots", "Other"], 
        className: "tag-partType",
        tabs: ["tab9"]
    },

    spell_level: {
        label: "Spell Level",
        tags: ["Infusion", "Cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"], 
        className: "tag-spellLevel",
        tabs: ["tab9"]
    },

    action_type: {
        label: "Action Type",
        tags: ["Action", "Reaction", "Bonus action", "Free action", "Check", "Save"], 
        className: "tag-actionType",
        tabs: ["tab9"]
    },

    effect_type: {
        label: "Effect",
        tags: ["Buff", "Debuff", "Heal", "Damage", "Utility", "Control", "Movement", "AC"],
        className: "tag-abilityType",
        tabs: ["tab9"]
    },

    range_type: {
        label: "Range",
        tags: ["Melee", "Ranged", "Area", "Self", "Touch"],
        className: "tag-rangeType",
        tabs: ["tab9"]
    },

    condition_type: {
        label: "Condition",
        tags: ["Blinded", "Charmed", "Deafened", "Frightened", "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious", "Push", "Pull", "Banish"],
        className: "tag-conditionType",
        tabs: ["tab9"]
    },

    attribute_type: {
        label: "Attribute",
        tags: ["STR", "DEX", "CON", "INT", "WIS", "CHA"],
        className: "tag-attributeType",
        tabs: ["tab9"]
    },
};

export const blockTypeConfig = {
    tab3: {
        types: ["Book", "Map", "Quest", "Notes"],
        className: "tag-characterType",
        singleSelect: true,
        required: true
    },
    tab6: {
        types: ["Consumables", "Weapons", "Armor & clothing", "Magic & curiosities", "Tools", "Scrap & parts", "Keys", "Documents"],
        className: "tag-itemCategory",
        singleSelect: true,
        required: true
    },
    tab9: {
        types: ["Hazard", "Crank", "Feat", "Suit", "Spell", "Magic Item"],
        className: "tag-characterType"
    }
};

// Preset palette for Book accent colours (tab3 only)
// id is stored on the block; hex is used for rendering.
export const BOOK_ACCENT_COLORS = [
    { id: "orange", label: "Orange", hex: "#f4a261" },
    { id: "cyan",   label: "Cyan",   hex: "#06ade4" },
    { id: "green",  label: "Green",  hex: "#4CAF50" },
    { id: "red",    label: "Red",    hex: "#ff6b6b" },
    { id: "purple", label: "Purple", hex: "#a855f7" },
    { id: "gold",   label: "Gold",   hex: "#e5c100" },
    { id: "gray",   label: "Gray",   hex: "#888" }
];
export const DEFAULT_BOOK_ACCENT = "orange";
