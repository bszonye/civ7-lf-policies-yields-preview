/**
 * @param {string} modifierId
 * @returns {ResolvedModifier}
 */
export function resolveModifierById(modifierId) {
    const modifier = GameInfo.Modifiers.find(m => m.ModifierId === modifierId);
    // @ts-ignore
    return resolveModifier(modifier);
}

/**
 * @param {string} description
 * @param {(ModifierArgument | RequirementArgument)[]} args
 * @returns {ResolvedArguments}
 */
function createResolvedArguments(description, args) {
    /** @type {BaseResolvedArguments} */
    const resolvedArgs = args.reduce((acc, ma) => {
        const {
            Name,
            ...argument
        } = ma;
        acc[Name] = argument;
        return acc;
    }, {});

    // @ts-ignore
    return {
        ...resolvedArgs,
        getAsserted(key) {
            if (!resolvedArgs[key]?.Value) {
                throw new Error(`Missing argument ${key} in ${description}`);
            }
            return resolvedArgs[key].Value;
        }
    }
}

/**
 * Resolve a modifier
 * @param {Modifier} modifier
 * @returns {ResolvedModifier}
 */
export function resolveModifier(modifier) {
    const m = modifier;
    const SubjectRequirementSet = resolveRequirementSet(m.SubjectRequirementSetId);
    const OwnerRequirementSet = resolveRequirementSet(m.OwnerRequirementSetId);
    const DynamicModifier = GameInfo.DynamicModifiers.find(dm => dm.ModifierType === m.ModifierType);
    if (!DynamicModifier) {
        console.error(`DynamicModifier not found for Modifier: ${m.ModifierId}`);
    }
    
    return {
        Modifier: m,
        // @ts-ignore
        Arguments: createResolvedArguments(
            `modifier ${m.ModifierId}`, 
            GameInfo.ModifierArguments.filter(ma => ma.ModifierId === m.ModifierId)
        ),
        CollectionType: DynamicModifier?.CollectionType,
        EffectType: DynamicModifier?.EffectType,                
        SubjectRequirementSet,
        OwnerRequirementSet,
    };
}

/**
 * @param {string | null | undefined} requirementSetId 
 * @returns {ResolvedRequirementSet | null}
 */
export function resolveRequirementSet(requirementSetId) {
    if (!requirementSetId) {
        return null;
    }

    const Requirements = GameInfo.RequirementSetRequirements
        .filter(rs => rs.RequirementSetId === requirementSetId)
        .map(rs => {
            const requirement = GameInfo.Requirements.find(r => r.RequirementId === rs.RequirementId);
            if (!requirement) {
                console.error(`Requirement not found for RequirementSetRequirement: ${rs.RequirementId}`);
                return null;
            }
            
            return {
                Requirement: requirement,
                Arguments: createResolvedArguments(
                    `requirement ${requirement.RequirementId}`, 
                    GameInfo.RequirementArguments.filter(ra => ra.RequirementId === requirement?.RequirementId)
                ),
            }
        })
        .filter(r => r != null);

    const RequirementSet = GameInfo.RequirementSets.find(rs => rs.RequirementSetId == requirementSetId);
    if (!RequirementSet) {
        console.error(`RequirementSet not found: ${requirementSetId}`);
        return null;
    }

    return {
        ...RequirementSet,
        Requirements
    }
}