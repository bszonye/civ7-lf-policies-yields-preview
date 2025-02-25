declare type ResolvedArguments = {
    [key: string]: {
        Value: string;
        Extra?: string;
        SecondExtra?: string;
        Type?: string;
    }
};

declare interface ResolvedRequirement {
    Requirement: Requirement;
    Arguments: ResolvedArguments;
}

declare interface ResolvedModifier {
    Modifier: Modifier;
    Arguments: ResolvedArguments;
    CollectionType: string;
    EffectType: string;
    SubjectRequirements: ResolvedRequirement[];
    OwnerRequirements: ResolvedRequirement[];
}