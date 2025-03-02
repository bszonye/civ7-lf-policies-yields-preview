import { resolveRequirementSet } from "../modifiers.js";
import { isRequirementSatisfied } from "./requirement.js";

/**
 * @param {ResolvedModifier} modifier 
 * @param {any} parentSubject May be a city, a plot, a player, etc. Usually a city for nested modifiers (EFFECT_ATTACH_MODIFIER_TO_CITY)
 * @returns 
 */
export function resolveSubjectsWithRequirements(player, modifier, parentSubject = null) {
    const baseSubjects = resolveBaseSubjects(modifier, parentSubject);

    return baseSubjects.filter(subject => {
        return filterSubjectByRequirementSet(player, subject, modifier.SubjectRequirementSet);
    });
}

/**
 * @param {Player} player
 * @param {any} subject
 * @param {ResolvedRequirementSet} requirementSet
 */
function filterSubjectByRequirementSet(player, subject, requirementSet) {
    const operator = getRequirementSetOperator(requirementSet);

    return requirementSet.Requirements[operator](requirement => {
        let isSatisfied = false;
        if (requirement.Requirement.RequirementType === 'REQUIREMENT_REQUIREMENTSET_IS_MET') {
            // Nested requirement set
            const nestedRequirementSet = resolveRequirementSet(requirement.Arguments.RequirementSetId.Value);
            isSatisfied = filterSubjectByRequirementSet(player, subject, nestedRequirementSet);
        }
        else {
            isSatisfied = isRequirementSatisfied(player, subject, requirement);
        }

        return requirement.Requirement.Inverse ? !isSatisfied : isSatisfied;
    });
}

/**
 * @param {ResolvedRequirementSet} requirementSet
 */
function getRequirementSetOperator(requirementSet) {
    switch (requirementSet.RequirementSetType) {
        case "REQUIREMENTSET_TEST_ALL":
            return "every";
        case "REQUIREMENTSET_TEST_ANY":
            return "some";
        default:
            console.warn(`Unhandled RequirementSetType: ${requirementSet.RequirementSetType}`);
            return "every";
    }
}

/**
 * @param {City[]} cities 
 */
function wrapCitySubjects(cities) {
    return cities.map(city => ({
        ...city,
        // Some requirements operate both on the city and the plot; in order
        // to make the subject usable in those cases, we need to provide the plot index.
        // TODO Technically in the plot we have the city too, so the good thing to do
        // would be to refactor subject to always be { city, plot }, but it requires a
        // lot of changes.
        plot: GameplayMap.getIndexFromLocation(city.location),
    }));
}

/**
 * @param {ResolvedModifier} modifier
 */
function resolveBaseSubjects(modifier, parentSubject = null) {
    const player = Players.get(GameContext.localPlayerID);
    switch (modifier.CollectionType) {
        case "COLLECTION_PLAYER_CAPITAL_CITY":
            return wrapCitySubjects([player.Cities.getCapital()]);
        
        case "COLLECTION_PLAYER_CITIES":
            return wrapCitySubjects(player.Cities.getCities());
        
        // We don't care about other players cities, since we need anyway the effect
        // applied to _our_ cities.
        case "COLLECTION_ALL_CITIES":
            return wrapCitySubjects(player.Cities.getCities());

        case "COLLECTION_PLAYER_PLOT_YIELDS": {
            let plots = [];
            player.Cities.getCities().forEach(city => {
                plots.push(...city.getPurchasedPlots().map(plot => {
                    return {
                        city,
                        plot,
                    };
                }));
            });
            return plots;
        }

        case "COLLECTION_OWNER":
            return [player];

        // Nested (City)
        case "COLLECTION_CITY_PLOT_YIELDS": {
            if (!parentSubject) {
                console.error("COLLECTION_CITY_PLOT_YIELDS requires a parentSubject (City)");
                return [];
            }

            return parentSubject.getPurchasedPlots().map(plot => {
                return {
                    city: parentSubject,
                    plot,
                };
            });
        }
            
        case "COLLECTION_ALL_UNITS":
            console.warn("COLLECTION_ALL_UNITS not implemented");
            return [];

        case "COLLECTION_PLAYER_UNITS":
            console.warn("COLLECTION_PLAYER_UNITS not implemented");
            return [];

        case "COLLECTION_CITIES_FOLLOWING_OWNER_RELIGION": // Technically easy to grab, but no interesting effects applied
        // Recognized, but we can't provide simple yields for these:
        case "COLLECTION_PLAYER_COMBAT":
        case "COLLECTION_UNIT_COMBAT":
            return [];

        default:
            console.warn(`Unhandled CollectionType: ${modifier.CollectionType}`);
            return [];
    }
}
