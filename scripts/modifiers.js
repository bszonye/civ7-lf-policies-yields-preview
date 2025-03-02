/**
 * @param {string} modifierId
 * @returns {ResolvedModifier}
 */
export function resolveModifierById(modifierId) {
    const modifier = GameInfo.Modifiers.find(m => m.ModifierId === modifierId);
    return resolveModifier(modifier);
}

/**
 * Resolve a modifier
 * @param {Modifier} modifier
 * @returns {ResolvedModifier}
 */
export function resolveModifier(modifier) {
    const m = modifier;
    const SubjectRequirementSet = getModifierRequirements(m.SubjectRequirementSetId);
    const OwnerRequirementSet = getModifierRequirements(m.OwnerRequirementSetId);
    const DynamicModifier = GameInfo.DynamicModifiers.find(dm => dm.ModifierType === m.ModifierType);
    return {
        Modifier: m,
        Arguments: GameInfo.ModifierArguments
            .filter(ma => ma.ModifierId === m.ModifierId)
            .reduce((acc, ma) => {
                const {
                    Name,
                    ModifierId,
                    ...argument
                } = ma;
                acc[Name] = argument;
                return acc;
            }, {}),
        CollectionType: DynamicModifier.CollectionType,
        EffectType: DynamicModifier.EffectType,                
        SubjectRequirementSet,
        OwnerRequirementSet,
    };
}

/**
 * @param {string} requirementSetId 
 * @returns {ResolvedRequirementSet}
 */
function getModifierRequirements(requirementSetId) {
    const Requirements = GameInfo.RequirementSetRequirements
        .filter(rs => rs.RequirementSetId === requirementSetId)
        .map(rs => {
            const requirement = GameInfo.Requirements.find(r => r.RequirementId === rs.RequirementId);
            return {
                Requirement: requirement,
                Arguments: GameInfo.RequirementArguments
                    .filter(ra => ra.RequirementId === requirement.RequirementId)
                    .reduce((acc, ra) => {
                        const {
                            Name,
                            RequirementId,
                            ...argument
                        } = ra;
                        acc[Name] = argument;
                        return acc;
                    }, {}),
            }
        });

    const RequirementSet = GameInfo.RequirementSets.find(rs => rs.RequirementSetId === requirementSetId);

    return {
        ...RequirementSet,
        Requirements
    }
}