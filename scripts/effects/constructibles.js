import { getPlotDistrict } from "../requirements/plot-requirements.js";
import { calculateMaintenanceEfficencyToReduction } from "./units.js";

/**
 * @param {*} player
 * @param {ResolvedModifier} modifier
 */
export function getPlayerBuildingsCountForModifier(player, modifier) {
    return getBuildingsCountForModifier(player.Cities.getCities() || [], modifier);
}


/**
 * 
 * @param {City[]} cities 
 * @param {ResolvedModifier} modifier 
 */
export function getBuildingsCountForModifier(cities, modifier) {
    if (modifier.Arguments.Tag?.Value) {
        return getBuildingsByTag(cities, modifier.Arguments.Tag.Value).length;
    }
    else if (modifier.Arguments.ConstructibleType?.Value) {
        return getBuildingsCountByType(cities, modifier.Arguments.ConstructibleType.Value);
    }
    
    console.warn(`Unhandled ModifierArgument: ${JSON.stringify(modifier.Arguments)}`);
    return 0;
}

/**
 * 
 * @param {City[]} cities 
 * @param {string} tag 
 * @returns any[]
 */
export function getBuildingsByTag(cities, tag) {
    const tagsCache = {};

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

/**
 * @param {City[]} cities
 * @param {string} type
 */
export function getBuildingsCountByType(cities, type) {
    let count = 0;
    for (let i = 0; i < cities.length; i++) {
        const city = cities[i];
        count += city.Constructibles.getIdsOfType(type).length;
    }
    return count;
}


// MAINTENANCE REDUCTION

/**
 * @param {City} city
 * @param {ConstructibleInstance} constructible
 * @param {Constructible} constructibleType
 * @param {ResolvedModifier} modifier}
 */
export function computeConstructibleMaintenanceEfficencyReduction(city, constructible, constructibleType, modifier) {
    const maintenances = city.Constructibles.getMaintenance(constructibleType.ConstructibleType);
    let gold = 0;
    let happiness = 0;
    for (const index in maintenances) {
        const cost = maintenances[index] * -1;
        if (cost == 0) {
            continue;
        }

        const yieldType = GameInfo.Yields[index].YieldType;

        if (yieldType == "YIELD_GOLD" && modifier.Arguments.Gold?.Value === 'true') {
            gold += calculateMaintenanceEfficencyToReduction(modifier, 1, cost);
        }
        if (yieldType == "YIELD_HAPPINESS" && modifier.Arguments.Happiness?.Value === 'true') {
            happiness += calculateMaintenanceEfficencyToReduction(modifier, 1, cost);
        }
    }

    return { gold, happiness };
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
 * Get all the constructibles in the city that _MAY_ receive adjacency bonuses from 
 * the given adjacency type.
 * Once the constructibles are filtered, the caller should check if the adjacency
 * is actually valid for the constructible.
 * 
 * @param {City} city
 * @param {string} adjacency
 */
export function findCityConstructiblesMatchingAdjacency(city, adjacency) {
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
 */
export function findCityConstructibles(city) {
    const constructibles = city.Constructibles.getIds();
    return constructibles
        .map(constructibleId => Constructibles.getByComponentID(constructibleId))
        .map(constructible => {
            const constructibleType = GameInfo.Constructibles.lookup(constructible.type);
            return {
                constructible,
                constructibleType,
            };
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

// ====================================================================================================
// ==== ADJACENCY YIELDS ==============================================================================
// ====================================================================================================

/**
 * Given an AdjacencyYieldChange, return the amount of yields granted by the adjacency
 * This amount is the number of adjacent plots that meet the adjacency requirements,
 * multiplied by the YieldChange of the adjacency.
 * 
 * @param {Location} location
 * @param {AdjacencyYieldChange} adjacency
 */
export function getYieldsForAdjacency(location, adjacency) {
    const adjacentGrantingPlots = getPlotsGrantingAdjacency(location, adjacency);
    if (adjacentGrantingPlots.length < adjacency.TilesRequired) return 0;
    // TODO adjacency.ProjectMaxYield ?
    return adjacentGrantingPlots.length * adjacency.YieldChange;
}
/**
 * Given an AdjacencyYieldChange, return the amount of yields granted by the adjacency
 * @param {Location} location
 * @param {AdjacencyYieldChange} adjacency
 */
export function getPlotsGrantingAdjacency(location, adjacency) {
    const adjacentPlots = GameplayMap.getPlotIndicesInRadius(location.x, location.y, 1);
    let plots = [];
    for (let i = 0; i < adjacentPlots.length; i++) {
        const plot = adjacentPlots[i];
        const loc = GameplayMap.getLocationFromIndex(plot);
        if (loc.x === location.x && loc.y === location.y) continue;
        if (!isPlotGrantingAdjacency(adjacency, plot)) continue;

        plots.push(plot);
    }

    return plots;
}

/**
 * Check if a plot meets the adjacency requirements
 * 
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

    if (adjacency.AdjacentResource) {
        const resourceType = GameplayMap.getResourceType(loc.x, loc.y);
        if (resourceType == ResourceTypes.NO_RESOURCE) return false;
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