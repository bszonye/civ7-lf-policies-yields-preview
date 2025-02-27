/**
 * 
 * @param {*} player 
 * @param {ResolvedModifier} modifier 
 */
export function getPlayerBuildingsCountForModifier(player, modifier) {
    if (modifier.Arguments.Tag?.Value) {
        return getPlayerBuildingsByTag(player, modifier.Arguments.Tag.Value).length;
    }
    else if (modifier.Arguments.ConstructibleType?.Value) {
        return getPlayerBuildingsCountByType(player, modifier.Arguments.ConstructibleType.Value);
    }
    
    console.warn(`Unhandled ModifierArgument: ${JSON.stringify(modifier.Arguments)}`);
    return 0;
}


/**
 * 
 * @param {*} player 
 * @param {string} tag 
 * @returns any[]
 */
export function getPlayerBuildingsByTag(player, tag) {
    const tagsCache = {};

    const cities = player.Cities?.getCities() || [];
    return cities.flatMap(city => {
        const cityConstructibles = city.Constructibles.getIds();
        for (let i = 0; i < cityConstructibles.length; i++) {
            const constructibleId = cityConstructibles[i];
            const constructible = Constructibles.getByComponentID(constructibleId);
            const constructibleType = GameInfo.Constructibles.lookup(constructible.type);
            
            if (!tagsCache[constructibleType.ConstructibleType]) {
                tagsCache[constructibleType.ConstructibleType] = GameInfo.TypeTags
                    .filter(tag => tag.Type === constructibleType.ConstructibleType)
                    .map(tag => tag.Tag);
            }
            const tags = tagsCache[constructibleType.ConstructibleType];

            if (tags?.includes(tag)) {
                return [constructible];
            }
        }
    });
}

export function getPlayerBuildingsCountByType(player, type) {
    const cities = player.Cities?.getCities() || [];
    let count = 0;
    for (let i = 0; i < cities.length; i++) {
        const city = cities[i];
        count += city.Constructibles.getIdsOfType(type).length;
    }
    return count;
}