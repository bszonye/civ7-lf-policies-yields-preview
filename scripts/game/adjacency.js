import { PolicyYieldsCache } from "../cache.js";
import { getGlobalParamNumber } from "../core/global.js";
import { isConstructibleValidForCurrentAge } from "./helpers.js";
import { getPlotConstructiblesByLocation, getPlotDistrict, isPlotQuarter } from "./plot.js";

// ====================================================================================================
// ==== CACHE ==========================================================================================
// ====================================================================================================

export const AdjancenciesCache = new class {
    /** @type {Record<string, AdjacencyYieldChange | undefined>} */
    _adjacencies = {};

    /**
     * @param {string} adjacencyId
     * @returns {AdjacencyYieldChange | undefined}
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
            // If the constructible is not valid for the current age (obsolete: previous age and
            // not AGELESS), all the adjacencies are invalid. The same rule is applied to the
            // WildcardAdjacencies below, regardless of their CurrentAgeConstructiblesOnly flag.
            const adjacencies = isConstructibleValidForCurrentAge(constructibleType)
                ? GameInfo.Constructible_Adjacencies
                    .filter(ca => ca.ConstructibleType === type)
                    .map(ca => ca.YieldChangeId)
                : [];

            const tags = PolicyYieldsCache.getTypeTags(constructibleType.ConstructibleType);

            const wildcardAdjacencies = GameInfo.Constructible_WildcardAdjacencies
                .filter(ca => {
                    // Targeting pattern across ALL shipped wildcard rows (base + DLC), confirmed by
                    // the description text of each source. ConstructibleClass is only ever "BUILDING".
                    //   - tag-only row    -> any constructible carrying that tag, Wonders included
                    //                        (pre-1.5.0 MONOGATARI was tag-only and its description
                    //                        said "...Buildings and Wonders...").
                    //   - class-only row  -> Buildings only, whether the row is bare or explicitly
                    //                        ConstructibleClass="BUILDING" (City of Peace / JO_BO
                    //                        descriptions literally say "All Buildings").
                    //   - class + tag row -> both must match (AND). Introduced by game patch 1.5.0
                    //                        for MONOGATARI (ConstructibleClass="BUILDING" plus
                    //                        ConstructibleTag="GREATWORK"); its description changed
                    //                        to "Great Work Buildings", so Wonders are now excluded.
                    //                        The class and tag checks below apply exactly that.
                    //                        Note: this filter runs over every wildcard row for every
                    //                        constructible, so a throw here would kill ALL adjacency
                    //                        previews, not just the offending tradition.
                    // Plus two cross-cutting rules: Improvements never receive wildcard adjacencies
                    // (verified in-game with City of Peace), and Walls are excluded.
                    if (constructibleType.ConstructibleClass === "IMPROVEMENT") {
                        return false;
                    }

                    // Heuristic: no tag = only BUILDING class, tag = any class HAVING that tag.
                    if (!ca.ConstructibleTag && constructibleType.ConstructibleClass !== "BUILDING") {
                        return false;
                    }

                    // Walls are not affected by wildcard adjacencies
                    if (tags.has("IGNORE_DISTRICT_PLACEMENT_CAP")) {
                        return false;
                    }

                    if (ca.ConstructibleClass && constructibleType.ConstructibleClass !== ca.ConstructibleClass) {
                        return false;
                    }
                    if (ca.ConstructibleTag && !tags.has(ca.ConstructibleTag)) {
                        return false;
                    }
                    // Obsolete constructibles (previous age, not AGELESS) never receive adjacency
                    // bonuses, wildcard rows included and regardless of CurrentAgeConstructiblesOnly.
                    // Civilopedia (Buildings concept): "Buildings lose their adjacency bonus when
                    // not in their original Age unless they are Ageless".
                    // Reported with Classical Revival (ExAttributeCultural01WonderHappiness, a
                    // ConstructibleClass="BUILDING" row WITHOUT the flag) at Modern turn 1: preview
                    // +107 vs +52 in game, the gap being the Exploration buildings just turned
                    // obsolete, which the old code still counted because the flag was unset.
                    // This check subsumes CurrentAgeConstructiblesOnly as it was implemented so far
                    // (AGELESS buildings from earlier ages still included). Whether that flag ALSO
                    // excludes AGELESS buildings from earlier ages is unverified in-game.
                    if (!isConstructibleValidForCurrentAge(constructibleType)) {
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
           
            // console.warn("ConstructibleAdjacencies", constructibleType.ConstructibleType, JSON.stringify(this._adjacencies[type].map(a => a.ID)));
        }

        return this._adjacencies[type];
    }
};

/**
 * Given an AdjacencyYieldChange, return the plots indexes activating the adjacency
 * @param {Location} location Plot holding the constructible that receives the adjacency
 * @param {AdjacencyYieldChange} adjacency
 * @returns {number[]} Indexes of the neighbouring plots that satisfy the adjacency
 */
export function getPlotsGrantingAdjacency(location, adjacency) {
    const adjacentPlots = GameplayMap.getPlotIndicesInRadius(location.x, location.y, 1);
    const ownerId = GameplayMap.getOwner(location.x, location.y);
    let plots = [];
    for (const plot of adjacentPlots) {
        const loc = GameplayMap.getLocationFromIndex(plot);
        if (loc.x === location.x && loc.y === location.y) continue;
        if (!isPlotGrantingAdjacency(adjacency, plot, ownerId)) continue;

        plots.push(plot);
    }

    return plots;
}

/**
 * Check if a plot meets the adjacency requirements
 *
 * @param {AdjacencyYieldChange} adjacency
 * @param {number} plot Index of the neighbouring plot being tested
 * @param {number} ownerId Owner (`GameplayMap.getOwner`) of the plot holding the constructible; needed by AdjacentOtherOwner
 * @returns {boolean}
 */
export function isPlotGrantingAdjacency(adjacency, plot, ownerId) {
    const loc = GameplayMap.getLocationFromIndex(plot);

    if (adjacency.AdjacentLake && !GameplayMap.isLake(loc.x, loc.y)) return false;
    if (adjacency.AdjacentNaturalWonder && !GameplayMap.isNaturalWonder(loc.x, loc.y)) return false;
    if (adjacency.AdjacentRiver && !GameplayMap.isRiver(loc.x, loc.y)) return false;
    if (adjacency.AdjacentNavigableRiver && !GameplayMap.isNavigableRiver(loc.x, loc.y)) return false;

    if (adjacency.AdjacentTerrain) {
        const terrain = GameplayMap.getTerrainType(loc.x, loc.y);
        const terrainType = GameInfo.Terrains.lookup(terrain);
        if (terrainType?.TerrainType !== adjacency.AdjacentTerrain) return false;
    }

    if (adjacency.AdjacentConstructible) {
        const constructibles = getPlotConstructiblesByLocation(loc.x, loc.y);
        if (!constructibles.some(c => c.constructibleType?.ConstructibleType === adjacency.AdjacentConstructible)) return false;
    }

    if (adjacency.AdjacentConstructibleTag) {
        const neededTag = adjacency.AdjacentConstructibleTag;
        const constructibles = getPlotConstructiblesByLocation(loc.x, loc.y);
        const hasSomeTag = constructibles.some(c => {
            const tags = PolicyYieldsCache.getTypeTags(c.constructibleType?.ConstructibleType);
            return tags.has(neededTag);
        });
        if (!hasSomeTag) return false;
    }

    if (adjacency.AdjacentConstructibleClass) {
        // Shipped rows (1.5.0 Base): the three Ashoka wildcards, all IMPROVEMENT.
        const constructibles = getPlotConstructiblesByLocation(loc.x, loc.y);
        if (!constructibles.some(c => c.constructibleType.ConstructibleClass === adjacency.AdjacentConstructibleClass)) return false;
    }

    if (adjacency.AdjacentOtherOwner) {
        // Shipped row (Gaul DLC): Goben, "+2 Production adjacency with tiles of other
        // Civilizations". Unowned tiles belong to nobody and do not count; any other owner
        // does, independent powers included (the text does not exclude them).
        const neighbourOwner = GameplayMap.getOwner(loc.x, loc.y);
        if (neighbourOwner === PlayerIds.NO_PLAYER || neighbourOwner === ownerId) return false;
    }

    if (adjacency.AdjacentDistrict) {
        const district = getPlotDistrict(plot);
        if (district.districtType?.DistrictType !== adjacency.AdjacentDistrict) return false;
    }

    if (adjacency.AdjacentQuarter) {
        if (!isPlotQuarter(plot)) return false;
    }

    if (adjacency.AdjacentResource) {
        const resourceType = GameplayMap.getResourceType(loc.x, loc.y);
        if (resourceType == ResourceTypes.NO_RESOURCE) return false;
    }

    if (adjacency.AdjacentResourceClass && adjacency.AdjacentResourceClass !== "NO_RESOURCECLASS") {
        // TODO Are we sure about "NO_RESOURCECLASS" being treated as "allow any resource class"?
        // Or should we filter by _no_ resource class?
        const resourceType = GameplayMap.getResourceType(loc.x, loc.y);
        const resource = GameInfo.Resources.lookup(resourceType);
        if (resource?.ResourceClassType !== adjacency.AdjacentResourceClass) return false;
    }

    if (adjacency.AdjacentSpecificResource) {
        // Shipped rows (since 1.4.0, Base only): Armorer (Horses, Iron), Shipyard (Hardwood,
        // Niter), Cannery (Fish), Laboratory (Quinine). Always a single ResourceType.
        const resourceType = GameplayMap.getResourceType(loc.x, loc.y);
        const resource = GameInfo.Resources.lookup(resourceType);
        if (resource?.ResourceType !== adjacency.AdjacentSpecificResource) return false;
    }

    if (adjacency.AdjacentFeature) {
        const featureType = GameplayMap.getFeatureType(loc.x, loc.y);
        const feature = GameInfo.Features.lookup(featureType);
        if (feature?.FeatureType !== adjacency.AdjacentFeature) return false;
    }

    if (adjacency.AdjacentFeatureClass) {
        const featureType = GameplayMap.getFeatureType(loc.x, loc.y);
        const feature = GameInfo.Features.lookup(featureType);
        if (feature?.FeatureClassType !== adjacency.AdjacentFeatureClass) return false;
    }

    if (adjacency.AdjacentBiome) {
        const biomeType = GameplayMap.getBiomeType(loc.x, loc.y);
        const biome = GameInfo.Biomes.lookup(biomeType);
        if (biome?.BiomeType !== adjacency.AdjacentBiome) return false;
    }

    if (adjacency.AdjacentSeaResource) {
        const resourceType = GameplayMap.getResourceType(loc.x, loc.y);
        if (resourceType == ResourceTypes.NO_RESOURCE) return false;
        // const resource = GameInfo.Resources.lookup(resourceType);
        if (!GameplayMap.isWater(loc.x, loc.y)) return false;
    }

    // Appeal-tier adjacencies (Heian JO_BO_SYSTEM / MONOGATARI). The base game classifies
    // a plot's appeal into EXCLUSIVE tiers via an else-if chain (general-appeal-layer.js):
    // Breathtaking if appeal >= APPEAL_FOR_DOUBLE_HAPPINESS_TILE_YIELD, otherwise Charming
    // if appeal >= APPEAL_FOR_HAPPINESS_TILE_YIELD, otherwise Average. A Breathtaking tile
    // is NOT also Charming, so the Charming check must reject the Breathtaking band too.
    // In-game proof: a Temple touching 3 Charming + 3 Breathtaking tiles gets +3 Happiness
    // (Charming) and +6 Food (Breathtaking); Breathtaking tiles grant no Happiness.
    if (adjacency.AdjacentBreathtakingAppeal) {
        const breathtaking = getGlobalParamNumber("APPEAL_FOR_DOUBLE_HAPPINESS_TILE_YIELD");
        if (GameplayMap.getAppeal(loc.x, loc.y) < breathtaking) return false;
    }
    if (adjacency.AdjacentCharmingAppeal) {
        const charming = getGlobalParamNumber("APPEAL_FOR_HAPPINESS_TILE_YIELD");
        const breathtaking = getGlobalParamNumber("APPEAL_FOR_DOUBLE_HAPPINESS_TILE_YIELD");
        const appeal = GameplayMap.getAppeal(loc.x, loc.y);
        if (appeal < charming || appeal >= breathtaking) return false;
    }

    if (adjacency.AdjacentUniqueQuarter) {
        throw new Error(`AdjacencyYieldChange.AdjacentUniqueQuarter not implemented (plot ${plot}, adjacency ${adjacency.ID})`);
    }
    if (adjacency.AdjacentUniqueQuarterType) {
        throw new Error(`AdjacencyYieldChange.AdjacentUniqueQuarterType not implemented (plot ${plot}, adjacency ${adjacency.ID})`);
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
    const tilesRequired = adjacency.TilesRequired || 1;
    if (adjacentGrantingPlots.length < tilesRequired) return 0;
    // Every `TilesRequired` qualifying tiles grant `YieldChange`. E.g. Heian
    // JoboSystemBreathtakingAdjacencyCulture (YieldChange=1, TilesRequired=2) is
    // +1 culture per 2 breathtaking tiles, not +1 per tile.
    // Note: adjacency.ProjectMaxYield is a UI projection hint only; it does not change
    // this numeric formula, so it is intentionally not consulted here.
    return Math.floor(adjacentGrantingPlots.length / tilesRequired) * adjacency.YieldChange;
}

