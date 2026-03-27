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

    
    //.spell_type: {
    //    label: "Spell Type",
    //    tags: ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation", "Concerntration", "Ritual"], 
    //    className: "tag-spellType",
    //    tabs: ["tab9"]
    //},

    action_type: {
        label: "Action Type",
        tags: ["Action", "Reaction", "Bonus action", "Free action", "Check", "Save"], 
        className: "tag-actionType",
        tabs: ["tab9"]
    },

    ability_type: {
        label: "Ability Type",
        tags: ["Buff", "Debuff", "Heal", "Movement", "Ranged", "Melee", "Spell", "Utility", "AC"],
        className: "tag-abilityType",
        tabs: ["tab9"]
    },

    damage_type: {
        label: "Damage Type",
        tags: ["Arcane", "Acid", "Bludgeoning", "Cold", "Fire", "Force", "Frost", "Lightning", "Necrotic", "Piercing", "Poison", "Psychic", "Radiant", "Slashing", "Thunder"], 
        className: "tag-damageType",
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

    item_type: {
        label: "Item Type",
        tags: ["Weapon", "Armor", "Shield", "Potion", "Scroll", "Ring", "Rod", "Wand", "Staff"], 
        className: "tag-itemType",
        tabs: ["tab6"]
    },

    magicItem_type: {
        label: "Rarity",
        tags: ["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact", "Cursed", "Sentient"], 
        className: "tag-magicItemType",
        tabs: ["tab6"]
    },

    magicItem_bonus: {
        label: "Bonus",
        tags: ["+1", "+2", "+3", "Attunement"], 
        className: "tag-magicItemBonus",
        tabs: ["tab6"]
    },

    equipped_check: {
        label: "Status",
        tags: ["Equipped", "Attuned"], 
        className: "tag-equippedCheck",
        tabs: ["tab6"] 
    },
};

export const blockTypeConfig = {
    tab3: {
        types: ["Book", "Map", "Quest", "Other"],
        className: "tag-characterType"
    },
    tab9: {
        types: ["Hazard", "Crank", "Spell", "Magic Item"],
        className: "tag-characterType"
    }
};