// CharacterSheetCalulations.js

// D&D Ability Score & Modifier Logic + Saving Throw & Skill Calculations

// Determine if a save or skill toggle is proficient
function isProficient(toggleKey) {
    const toggle = document.querySelector(`[data-storage-key="${toggleKey}"]`);
    return toggle && toggle.classList.contains("filled");
  }
  
  // Compute and display a saving throw: stat bonus + proficiency (if active)
  function calculateSavingThrow(statBonusKey, toggleKey, profKey, saveKey) {
    const statBonus = parseInt(localStorage.getItem(statBonusKey) || "0", 10);
    const profBonus = parseInt(localStorage.getItem(profKey) || "0", 10);
    const total = statBonus + (isProficient(toggleKey) ? profBonus : 0);
    const el = document.querySelector(`[data-storage-key="${saveKey}"]`);
    if (el) el.textContent = (total >= 0 ? "+" : "") + total;
  }
  
  // Compute and display a skill total: ability bonus + proficiency (if active)
  function calculateSkill(skillKey, abilityBonusKey, toggleKey, profKey) {
    const abilityBonus = parseInt(localStorage.getItem(abilityBonusKey) || "0", 10);
    const profBonus    = parseInt(localStorage.getItem(profKey) || "0", 10);
    const total = abilityBonus + (isProficient(toggleKey) ? profBonus : 0);
    const el = document.querySelector(`[data-storage-key="${skillKey}"]`);
    if (el) el.textContent = (total >= 0 ? "+" : "") + total;
  }
  
  // Calculate D&D ability modifier from score; blank or "00" yields "00"
  function calculateAbilityBonus(scoreKey, bonusKey) {
    const raw = localStorage.getItem(scoreKey);
    const el = document.querySelector(`[data-storage-key="${bonusKey}"]`);
    if (!raw || raw.trim() === "" || raw.trim() === "00") {
      localStorage.setItem(bonusKey, "0");
      if (el) el.textContent = "00";
      return;
    }
    const score = parseInt(raw, 10);
    const mod = Math.floor((score - 10) / 2);
    localStorage.setItem(bonusKey, mod);
    if (el) el.textContent = (mod >= 0 ? "+" : "") + mod;
  }
  
  // Update ability modifiers for Tab 4
  function updateTab4AbilityBonuses() {
    ["str","dex","con","int","wis","cha"].forEach(ab =>
      calculateAbilityBonus(`tab4_${ab}_score`, `tab4_${ab}_bonus`)
    );
  }
  
  // Update ability modifiers for Tab 8
  function updateTab8AbilityBonuses() {
    ["str","dex","con","int","wis","cha"].forEach(ab =>
      calculateAbilityBonus(`tab8_${ab}_score`, `tab8_${ab}_bonus`)
    );
  }
  
  // Update all saving throws for Tab 4
  function updateTab4Saves() {
    ["str","dex","con","int","wis","cha"].forEach(ab =>
      calculateSavingThrow(`tab4_${ab}_bonus`, `tab4_save_${ab}_toggle`, `tab4_prof`, `tab4_save_${ab}`)
    );
  }
  
  // Update all saving throws for Tab 8
  function updateTab8Saves() {
    ["str","dex","con","int","wis","cha"].forEach(ab =>
      calculateSavingThrow(`tab8_${ab}_bonus`, `tab8_save_${ab}_toggle`, `tab8_prof`, `tab8_save_${ab}`)
    );
  }
  
  // Update all skills for Tab 4
  function updateTab4Skills() {
    const skills = [
      ["acrobatics","dex"],
      ["animal_handling","wis"],
      ["arcana","int"],
      ["athletics","str"],
      ["deception","cha"],
      ["history","int"],
      ["insight","wis"],
      ["intimidation","cha"],
      ["investigation","int"],
      ["medicine","wis"],
      ["nature","int"],
      ["perception","wis"],
      ["performance","cha"],
      ["persuasion","cha"],
      ["religion","int"],
      ["sleight_of_hand","dex"],
      ["stealth","dex"],
      ["survival","wis"]
    ];
    skills.forEach(([skill, ab]) =>
      calculateSkill(`tab4_skill_${skill}`, `tab4_${ab}_bonus`, `tab4_skill_${skill}_toggle`, `tab4_prof`)
    );
  }
  
  // Update all skills for Tab 8
  function updateTab8Skills() {
    const skills = [
      ["acrobatics","dex"],
      ["animal_handling","wis"],
      ["arcana","int"],
      ["athletics","str"],
      ["deception","cha"],
      ["history","int"],
      ["insight","wis"],
      ["intimidation","cha"],
      ["investigation","int"],
      ["medicine","wis"],
      ["nature","int"],
      ["perception","wis"],
      ["performance","cha"],
      ["persuasion","cha"],
      ["religion","int"],
      ["sleight_of_hand","dex"],
      ["stealth","dex"],
      ["survival","wis"]
    ];
    skills.forEach(([skill, ab]) =>
      calculateSkill(`tab8_skill_${skill}`, `tab8_${ab}_bonus`, `tab8_skill_${skill}_toggle`, `tab8_prof`)
    );
  }
  
  // Initial calculation after all load handlers
  window.addEventListener("load", () => {
    setTimeout(() => {
      updateTab4AbilityBonuses();
      updateTab8AbilityBonuses();
      updateTab4Saves();
      updateTab8Saves();
      updateTab4Skills();
      updateTab8Skills();
    }, 0);
  });
  
  // Recalc on editable input
  document.addEventListener("input", (e) => {
    if (!e.target.matches("[contenteditable=true]")) return;
    const key = e.target.getAttribute("data-storage-key");
    if (!key) return;
    localStorage.setItem(key, e.target.textContent);
    if (key.endsWith("_score")) {
      if (key.startsWith("tab4_")) updateTab4AbilityBonuses();
      else if (key.startsWith("tab8_")) updateTab8AbilityBonuses();
    }
    updateTab4Saves();
    updateTab8Saves();
    updateTab4Skills();
    updateTab8Skills();
  });
  
  export {
    updateTab4AbilityBonuses,
    updateTab8AbilityBonuses,
    updateTab4Saves,
    updateTab8Saves,
    updateTab4Skills,
    updateTab8Skills
  };
  