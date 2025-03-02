import { PolicyYieldsCache } from "../cache.js";
import { isConstructibleValidForQuarter } from "./helpers.js";
import { parseArgumentsArray } from "./helpers.js";

export function getPlotDistrict(plot) {
    const location = GameplayMap.getLocationFromIndex(plot);
    const districtId = MapCities.getDistrict(location.x, location.y);
    const district = districtId ? Districts.get(districtId) : null;
    if (!district) {
        return {
            district: null,
            districtType: null,
        }
    }

    const districtType = GameInfo.Districts.lookup(district.type);

    return {
        district,
        districtType,
    };
}

/**
 * @param {number} plot
 * @param {ResolvedRequirement} requirement
 * @returns {boolean}
 */
export function hasPlotDistrictOfClass(plot, requirement) {
    const { districtType } = getPlotDistrict(plot);

    const requiredClasses = parseArgumentsArray(requirement.Arguments, 'DistrictClass');
    return requiredClasses.includes(districtType?.DistrictClass);
}

/**
 * @param {number} x
 * @param {number} y
 */
export function getPlotConstructiblesByLocation(x, y) {
    const constructibleIDs = MapConstructibles.getHiddenFilteredConstructibles(x, y);
    const constructibles = constructibleIDs.map(id => Constructibles.getByComponentID(id));
    return constructibles.map(constructible => ({
        constructible,
        constructibleType: GameInfo.Constructibles.lookup(constructible.type),
    }));
}

/**
 * @param {number} plot 
 */
export function isPlotQuarter(plot) {
    const location = GameplayMap.getLocationFromIndex(plot);
    const constructibles = getPlotConstructiblesByLocation(location.x, location.y)
        .filter(c => isConstructibleValidForQuarter(c.constructibleType));

    return constructibles.length >= 2;
}

/**
 * Get the adjacent plots to a location
 * @param {number} plotIndex
 * @param {number} radius
 */

export function getAdjacentPlots(plotIndex, radius = 1) {
    const location = GameplayMap.getLocationFromIndex(plotIndex);
    return GameplayMap
        .getPlotIndicesInRadius(location.x, location.y, radius)
        .filter(plot => plot !== plotIndex);
}

/**
 * @param {Location} location
 * @param {ResolvedArguments} args
 */

export function hasPlotConstructibleByArguments(location, args) {
    const constructibles = getPlotConstructiblesByLocation(location.x, location.y);
    return constructibles.some(c => {
        if (args.ConstructibleType?.Value) {
            return c.constructibleType.ConstructibleType === args.ConstructibleType.Value;
        }
        if (args.Tag?.Value) {
            const tags = PolicyYieldsCache.getTypeTags(c.constructibleType.ConstructibleType);
            return tags.has(args.Tag.Value);
        }
    });
}

