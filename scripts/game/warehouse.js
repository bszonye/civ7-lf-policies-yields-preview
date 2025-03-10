import { PolicyYieldsCache } from "../cache.js";
import { isConstructibleAgeless, isConstructibleValidForQuarter } from "./helpers.js";
import { getPlotConstructiblesByLocation } from "./plot.js";

/**
 * Get the warehouse yield change yields
 * @param {City} city
 * @param {WarehouseYieldChange} yieldChange 
 */
export function getYieldsForWarehouseChange(city, yieldChange) {
    // console.warn("getYieldsForWarehouseChange", city.name, yieldChange.ID);
    const plots = city.getPurchasedPlots()
        .map(plot => {
            const location = GameplayMap.getLocationFromIndex(plot);
            const constructibles = getPlotConstructiblesByLocation(location.x, location.y);
            return {
                plot,
                location,
                constructibles
            }
        })
        .filter(({ plot, location, constructibles }) => {
            // Warehouse can only affect plots with constructibles (only Improvements! not buildings or wonders)
            // Tested with "Hale o Kawe" wonder + Ho'okupu tradition, it doesn't give any yield
            if (
                constructibles.length <= 0 || 
                constructibles.some(c => {
                    return c.constructibleType.ConstructibleClass !== 'IMPROVEMENT';
                })
            ) {
                return false;
            }

            const resourceType = GameplayMap.getResourceType(location.x, location.y);
            const terrainType = GameplayMap.getTerrainType(location.x, location.y);
            const biomeType = GameplayMap.getBiomeType(location.x, location.y);
            const featureType = GameplayMap.getFeatureType(location.x, location.y);
            const feature = GameInfo.Features.lookup(featureType);

            // Unprioritized checks. They are checked first, but not sure it's correct.
            // It could be irrilevant if they're always exclusive with the prioritized checks
            if (yieldChange.ResourceInCity) {
                const resourceType = GameplayMap.getResourceType(location.x, location.y);
                return resourceType != ResourceTypes.NO_RESOURCE;
            }

            if (yieldChange.BiomeInCity) {
                const biome = GameInfo.Biomes.lookup(biomeType);
                return biome?.BiomeType === yieldChange.BiomeInCity;
            }

            if (yieldChange.MinorRiverInCity) {
                return GameplayMap.isRiver(location.x, location.y) && !GameplayMap.isNavigableRiver(location.x, location.y);
            }

            // TODO probably should stay after in the prioritized checks
            if (yieldChange.NavigableRiverInCity) {
                return GameplayMap.isNavigableRiver(location.x, location.y);
            }

            if (yieldChange.LakeInCity) {
                return GameplayMap.isLake(location.x, location.y);
            }

            // TODO Not really sure about this one. Need to check in antiquity and exploration db
            if (yieldChange.RouteInCity) {
                return GameplayMap.getRouteType(location.x, location.y) != -1;
            }

            if (yieldChange.NaturalWonderInCity) {
                return GameplayMap.isNaturalWonder(location.x, location.y);
            }

            // TODO never seen this one in the db. Need to check
            if (yieldChange.TerrainTagInCity) {
                const terrain = GameInfo.Terrains.lookup(terrainType);
                if (!terrain) return false;
                return PolicyYieldsCache.hasTypeTag(terrain.TerrainType, yieldChange.TerrainTagInCity);
            }

            // TODO to be implemented / checked. Not sure about the implementation
            if (yieldChange.Overbuilt) {
                
            }
            if (yieldChange.DistrictInCity) {
                
            }

            // ========================================
            // Priority based checks
            // ========================================

            // 1. Constructible (and Resources)
            if (yieldChange.ConstructibleInCity) {
                const constructibleType = yieldChange.ConstructibleInCity;
                return constructibles.some(c => {
                    return c.constructibleType.ConstructibleType === constructibleType;
                });
            }
            if (resourceType != ResourceTypes.NO_RESOURCE) return false; // Skip if no ConstructibleInCity but a resource is present
            

            if (yieldChange.FeatureClassInCity) {
                return feature?.FeatureClassType === yieldChange.FeatureClassInCity;
            }

            if (yieldChange.FeatureInCity) {
                return feature?.FeatureType === yieldChange.FeatureInCity;
            }

            if (featureType != FeatureTypes.NO_FEATURE) return false; // Skip if no FeatureInCity but a feature is present

            if (yieldChange.TerrainInCity) {
                const terrainType = GameplayMap.getTerrainType(location.x, location.y);
                const terrain = GameInfo.Terrains.lookup(terrainType);
                if (!terrain) return false;
                return terrain.TerrainType === yieldChange.TerrainInCity;
            }

            throw new Error("WarehouseYieldChange not implemented: " + yieldChange.ID + ": " + JSON.stringify(yieldChange));
        });
    
    // yieldChange.Age ?
    return plots.length * yieldChange.YieldChange;    
}

/**
 * @param {City | null} city
 * @param {WarehouseYieldChange} yieldChange 
 */
export function findCityConstructiblesMatchingWarehouse(city, yieldChange) {
    if (!city) return [];

    const validConstructiblesTypes = new Set(
        GameInfo.Constructible_WarehouseYields
            .filter(cwy => cwy.YieldChangeId === yieldChange.ID)
            .map(cwy => cwy.ConstructibleType)
    );

    return city.Constructibles.getIds()
        .map(constructibleId => Constructibles.getByComponentID(constructibleId))
        .filter(constructible => {
            const constructibleType = GameInfo.Constructibles.lookup(constructible.type);
            return validConstructiblesTypes.has(constructibleType?.ConstructibleType || 'NA');
        });
}


/**
 * @param {Constructible} constructibleType 
 */
export function doesConstructibleGrantsWarehouseYields(constructibleType) {
    const isAgeless = isConstructibleAgeless(constructibleType.ConstructibleType);
    const currentAge = GameInfo.Ages.lookup(Game.age)?.AgeType;
    if (!isAgeless && currentAge != constructibleType.Age) return false;
    return true;
}