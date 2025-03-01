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
    const constructibleIDs = MapConstructibles.getConstructibles(x, y);
    const constructibles = constructibleIDs.map(id => Constructibles.getByComponentID(id));
    return constructibles.map(constructible => ({
        constructible,
        constructibleType: GameInfo.Constructibles.lookup(constructible.type),
    }));
}
