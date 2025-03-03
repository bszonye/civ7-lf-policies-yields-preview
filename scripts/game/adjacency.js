import { getPlotConstructiblesByLocation, getPlotDistrict } from "./plot.js";

// ====================================================================================================
// ==== CACHE ==========================================================================================
// ====================================================================================================

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
};

export const ConstructibleAdjacencies = new class {
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

                    // TODO Not used in modern, we'd need to understand better what they represent anyway
                    // if (ca.HasNavigableRiver && ...) {
                })
                .map(ca => ca.YieldChangeId);

            const availableAdjacenciesIds = new Set(adjacencies.concat(wildcardAdjacencies));

            this._adjacencies[type] = GameInfo.Adjacency_YieldChanges
                .filter(ayc => availableAdjacenciesIds.has(ayc.ID));
        }

        return this._adjacencies[type];
    }
};

/**
 * Given an AdjacencyYieldChange, return the plots indexes activating the adjacency
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
        if (district.districtType?.DistrictType !== adjacency.AdjacentDistrict) return false;
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

