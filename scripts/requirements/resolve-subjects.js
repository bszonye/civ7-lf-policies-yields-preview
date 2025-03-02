import { isRequirementSatisfied } from "./requirement.js";

/**
 * @param {ResolvedModifier} modifier 
 * @param {any} parentSubject May be a city, a plot, a player, etc. Usually a city for nested modifiers (EFFECT_ATTACH_MODIFIER_TO_CITY)
 * @returns 
 */
export function resolveSubjectsWithRequirements(player, modifier, parentSubject = null) {
    const baseSubjects = resolveBaseSubjects(modifier, parentSubject);

    const operator = getRequirementSetOperator(modifier.SubjectRequirementSet);

    return baseSubjects.filter(subject => {
        return modifier.SubjectRequirementSet.Requirements[operator](requirement => {
            const isSatisfied = isRequirementSatisfied(player, subject, requirement);
            return requirement.Requirement.Inverse ? !isSatisfied : isSatisfied;
        });
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
 * @param {ResolvedModifier} modifier
 */
function resolveBaseSubjects(modifier, parentSubject = null) {
    const player = Players.get(GameContext.localPlayerID);
    switch (modifier.CollectionType) {
        case "COLLECTION_PLAYER_CAPITAL_CITY":
            return [player.Cities.getCapital()];
        
        case "COLLECTION_PLAYER_CITIES":
            return player.Cities.getCities();
        
            // We don't care about other players cities, since we need anyway the effect
        // applied to _our_ cities.
        case "COLLECTION_ALL_CITIES":
            return player.Cities.getCities();

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
