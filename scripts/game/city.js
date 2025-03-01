

/**
 * Check if the city has a certain building.
 * Supported arguments:
 * - BuildingType: BuildingType
 * - Tag: Tag (checks if the city has any building with the tag)
 * 
 * @param {City} city
 * @param {ResolvedArguments} args
 */
export function hasCityBuilding(city, args) {
    if (args.BuildingType) {
        return city.Constructibles?.hasConstructible(args.BuildingType.Value, false);
    }
    else if (args.Tag) {
        const constructibleTypes = GameInfo.TypeTags
            .filter(tag => tag.Tag === args.Tag.Value)
            .map(tag => tag.Type);

        return constructibleTypes.some(type => city.Constructibles?.hasConstructible(type, false));
    }

    console.warn(`Unhandled ModifierArgument: ${args}`);
    return false;
}

/**
 * Check if the city has a certain terrain type.
 * Supported arguments:
 * - TerrainType: TerrainType
 * - Amount: minimum number of tiles with the terrain type
 */
export function hasCityTerrain(city, args) {
    if (args.TerrainType) {
        const amount = args.Amount?.Value || 1; // TODO Not sure about this
        return city.getPurchasedPlots().filter(plot => {
            const location = GameplayMap.getLocationFromIndex(plot);
            const terrainType = GameplayMap.getTerrainType(location.x, location.y);
		    const terrain = GameInfo.Terrains.lookup(terrainType);
            return terrain.TerrainType === args.TerrainType.Value;
        }).length >= amount;
    }

    console.warn(`Unhandled ModifierArgument: ${args}`);
    return false;
}

/**
 * Get the number of specialists in a city.
 * @param {City} city
 */
export function getCitySpecialistsCount(city) {
    const specialists = city.population - city.urbanPopulation - city.ruralPopulation;
    return specialists;
}

