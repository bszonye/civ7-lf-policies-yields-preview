import { PolicyYieldsCache } from "../cache.js";
import { isConstructibleAgeless } from "./helpers.js";

/**
 * Get the warehouse yield change yields
 * @param {City} city
 * @param {WarehouseYieldChange} yieldChange 
 */
export function getYieldsForWarehouseChange(city, yieldChange) {
    // console.warn("getYieldsForWarehouseChange", city.name, yieldChange.ID);
    const plots = city.getPurchasedPlots()
        .map(plot => ({
            plot,
            location: GameplayMap.getLocationFromIndex(plot)
        }))
        // Warehouse can only affect plots with constructibles (improvements, districts, etc)
        .filter(({ location }) => {
            return MapConstructibles.getHiddenFilteredConstructibles(location.x, location.y).length > 0
        });
    
    // yieldChange.Age ?
 
    if (yieldChange.LakeInCity) {
        const lakePlots = plots.filter(({ plot, location }) => {
            return GameplayMap.isLake(location.x, location.y);
        });

        return lakePlots.length * yieldChange.YieldChange;
    }
    if (yieldChange.MinorRiverInCity) {
        const riverPlots = plots.filter(({ plot, location }) => {
            return GameplayMap.isRiver(location.x, location.y) && !GameplayMap.isNavigableRiver(location.x, location.y);
        });

        return riverPlots.length * yieldChange.YieldChange;
    }
    if (yieldChange.NavigableRiverInCity) {
        const riverPlots = plots.filter(({ plot, location }) => {
            return GameplayMap.isNavigableRiver(location.x, location.y);
        });

        return riverPlots.length * yieldChange.YieldChange
    }
    if (yieldChange.BiomeInCity) {
        const biomePlots = plots.filter(({ plot, location }) => {
            const biomeType = GameplayMap.getBiomeType(location.x, location.y);
            const biome = GameInfo.Biomes.lookup(biomeType);
            return biome?.BiomeType === yieldChange.BiomeInCity;
        });

        return biomePlots.length * yieldChange.YieldChange;
    }
    if (yieldChange.ConstructibleInCity) {
        const count = city.Constructibles.getIdsOfType(yieldChange.ConstructibleInCity).length;
        return count * yieldChange.YieldChange;
    }

    if (yieldChange.FeatureInCity) {
        const featurePlots = plots.filter(({ plot, location }) => {
            const featureType = GameplayMap.getFeatureType(location.x, location.y);
            const feature = GameInfo.Features.lookup(featureType);
            return feature?.FeatureType === yieldChange.FeatureInCity;
        });

        return featurePlots.length * yieldChange.YieldChange;
    }
    if (yieldChange.FeatureClassInCity) {
        const featurePlots = plots.filter(({ plot, location }) => {
            const featureType = GameplayMap.getFeatureType(location.x, location.y);
            const feature = GameInfo.Features.lookup(featureType);
            return feature?.FeatureClassType === yieldChange.FeatureClassInCity;
        });

        return featurePlots.length * yieldChange.YieldChange;
    }
    if (yieldChange.NaturalWonderInCity) {
        const naturalWonderPlots = plots.filter(({ plot, location }) => {
            return GameplayMap.isNaturalWonder(location.x, location.y);
        });

        return naturalWonderPlots.length * yieldChange.YieldChange;
    }
    if (yieldChange.ResourceInCity) {
        const resourcePlots = plots.filter(({ plot, location }) => {
            const resourceType = GameplayMap.getResourceType(location.x, location.y);
            return resourceType != ResourceTypes.NO_RESOURCE;
        });

        return resourcePlots.length * yieldChange.YieldChange;
    }
    // TODO Not really sure about this one. Need to check in antiquity and exploration db
    if (yieldChange.RouteInCity) {
        const routePlots = plots.filter(({ plot, location }) => {
            return GameplayMap.getRouteType(location.x, location.y) != -1;
        });

        return routePlots.length * yieldChange.YieldChange;
    }

    if (yieldChange.TerrainInCity) {
        const terrainPlots = plots.filter(({ plot, location }) => {
            const terrainType = GameplayMap.getTerrainType(location.x, location.y);
            const terrain = GameInfo.Terrains.lookup(terrainType);
            return terrain?.TerrainType === yieldChange.TerrainInCity;
        });
        // console.warn("TerrainInCity", yieldChange.TerrainInCity, terrainPlots.length, yieldChange.YieldChange);

        return terrainPlots.length * yieldChange.YieldChange;
    }

    // TODO Not really sure about this one. Need to check in antiquity and exploration db
    if (yieldChange.TerrainTagInCity) {
        const terrainRequiredTag = yieldChange.TerrainTagInCity;
        const terrainPlots = plots.filter(({ plot, location }) => {
            const terrainType = GameplayMap.getTerrainType(location.x, location.y);
            const terrain = GameInfo.Terrains.lookup(terrainType);
            if (!terrain) return false;
            return PolicyYieldsCache.hasTypeTag(terrain.TerrainType, terrainRequiredTag);
        });

        return terrainPlots.length * yieldChange.YieldChange;
    }

    // TODO to be implemented / checked. Not sure about the implementation
    if (yieldChange.Overbuilt) {
        
    }
    if (yieldChange.DistrictInCity) {
        
    }

    throw new Error("WarehouseYieldChange not implemented: " + yieldChange.ID + ": " + JSON.stringify(yieldChange));
}

/**
 * @param {City} city
 * @param {WarehouseYieldChange} yieldChange 
 */
export function findCityConstructiblesMatchingWarehouse(city, yieldChange) {
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