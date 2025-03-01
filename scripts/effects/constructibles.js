import { getPlotDistrict } from "../requirements/plot-requirements.js";

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

export const AdjancenciesCache = new class {
    /** @type {Record<string, AdjacencyYieldChange>} */
    _adjacencies = {};

    /**
     * @param {string} adjacencyId
     * @returns {AdjacencyYieldChange}
     */
    get(adjacencyId) {
        if (!this._adjacencies[adjacencyId]) {
            this._adjacencies[adjacencyId] = GameInfo.Adjacency_YieldChanges.find(ayc => ayc.ID === adjacencyId);
        }
        return this._adjacencies[adjacencyId];
    }
}



const ConstructibleAdjacencies = new class {
    /**
     * @type {Record<string, AdjacencyYieldChange[]>}
     */
    _adjacencies = {};
    
    /**
     * @param {Constructible} constructibleType
     */
    getAdjacencies(constructibleType) {
        const type = constructibleType.ConstructibleType;

        if (!this._adjacencies[type]) {
            const currentAge = GameInfo.Ages.lookup(Game.age)?.AgeType;

            const adjacencies = GameInfo.Constructible_Adjacencies
                .filter(ca => ca.ConstructibleType === type)
                .map(ca => ca.YieldChangeId);

            const tags = GameInfo.TypeTags
                .filter(tag => tag.Type === type)
                .map(tag => tag.Tag);

            const wildcardAdjacencies = GameInfo.Constructible_WildcardAdjacencies
                .filter(ca => {
                    if (ca.ConstructibleClass && constructibleType.ConstructibleClass !== ca.ConstructibleClass) {
                        return false;
                    }
                    if (ca.ConstructibleTag && !tags.includes(ca.ConstructibleTag)) {
                        return false;
                    }
                    if (ca.CurrentAgeConstructiblesOnly && constructibleType.Age !== currentAge) {
                        return false;
                    }                    
                    return true;

                    // Not used, we'd need to understand better what they represent anyway
                    // if (ca.HasNavigableRiver && ...) {
                })
                .map(ca => ca.YieldChangeId);

            const availableAdjacenciesIds = new Set(adjacencies.concat(wildcardAdjacencies));
            
            this._adjacencies[type] = GameInfo.Adjacency_YieldChanges
                .filter(ayc => availableAdjacenciesIds.has(ayc.ID));
        }

        return this._adjacencies[type];
    }
}

/**
 * @param {City} city
 * @param {string} adjacency
 */
export function findCityConstructiblesRespectingAdjacency(city, adjacency) {
    const constructibles = city.Constructibles.getIds();
    return constructibles
        .map(constructibleId => Constructibles.getByComponentID(constructibleId))
        .filter(constructible => {
            const constructibleType = GameInfo.Constructibles.lookup(constructible.type);
            return isConstructibleAdjacencyValid(city, constructible, constructibleType, adjacency);
        });
}

/**
 * @param {City} city
 * @param {ConstructibleInstance} constructible
 * @param {Constructible} constructibleType
 * @param {string} adjacency
 */
function isConstructibleAdjacencyValid(city, constructible, constructibleType, adjacency) {
    const validAdjacencies = ConstructibleAdjacencies.getAdjacencies(constructibleType);
    return validAdjacencies.some(ayc => ayc.ID === adjacency);
}

/**
 * @param {ConstructibleInstance} constructible
 * @param {AdjacencyYieldChange} adjacency
 */
export function getYieldsForConstructibleAdjacency(constructible, adjacency) {
    const adjacentPlots = GameplayMap.getPlotIndicesInRadius(constructible.location.x, constructible.location.y, 1);
    let amount = 0;
    let tilesCount = 0;
    for (let i = 0; i < adjacentPlots.length; i++) {
        
        const plot = adjacentPlots[i];
        const loc = GameplayMap.getLocationFromIndex(plot);
        if (loc.x === constructible.location.x && loc.y === constructible.location.y) continue;
        if (!isPlotGrantingAdjacency(adjacency, plot)) continue;
        
        amount += adjacency.YieldChange;
        tilesCount++;
    }

    if (tilesCount < adjacency.TilesRequired) return 0;
    // TODO adjacency.ProjectMaxYield ?
    return amount;
}

/**
 * @param {AdjacencyYieldChange} adjacency 
 * @param {number} plot
 */
export function isPlotGrantingAdjacency(adjacency, plot) {
    const loc = GameplayMap.getLocationFromIndex(plot);

    if (adjacency.AdjacentLake && !GameplayMap.isLake(loc.x, loc.y)) return false;
    if (adjacency.AdjacentNaturalWonder && !GameplayMap.isNaturalWonder(loc.x, loc.y)) return false;
    if (adjacency.AdjacentRiver && !GameplayMap.isRiver(loc.x, loc.y)) return false;
    if (adjacency.AdjacentNavigableRiver && !GameplayMap.isNavigableRiver(loc.x, loc.y)) return false;
    
    if (adjacency.AdjacentTerrain) {
        const terrain = GameplayMap.getTerrainType(loc.x, loc.y);
        const terrainType = GameInfo.Terrains.lookup(terrain);
        if (terrainType.TerrainType !== adjacency.AdjacentTerrain) return false;
    }

    if (adjacency.AdjacentConstructible) {
        const constructibles = getPlotConstructiblesByLocation(loc.x, loc.y);
        if (!constructibles.some(c => c.constructibleType.ConstructibleType === adjacency.AdjacentConstructible)) return false;
    }
    if (adjacency.AdjacentDistrict) {
        const district = getPlotDistrict(plot);
        if (district.districtType.DistrictType !== adjacency.AdjacentDistrict) return false;
    }

    if (adjacency.Age) {
        // TODO What do we need to check? Constructible age? Or game age?
    }

    // TODO Implement missing checks
    return true;
}

/**
 * @param {number} x
 * @param {number} y
 */
function getPlotConstructiblesByLocation(x, y) {
    const constructibleIDs = MapConstructibles.getConstructibles(x, y);
    const constructibles = constructibleIDs.map(id => Constructibles.getByComponentID(id));
    return constructibles.map(constructible => ({
        constructible,
        constructibleType: GameInfo.Constructibles.lookup(constructible.type),
    }));
}