export const sortingLogic = (() => {
    // Sort blocks alphabetically by title
    const sortBlocksByTitle = (blocks) => {
        return blocks.sort((a, b) => a.title.localeCompare(b.title));
    };

    return { sortBlocksByTitle };
})();
