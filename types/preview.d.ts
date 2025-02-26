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

declare interface YieldsDelta {
    Amount: {
        [YieldType: string]: number;
    };
    Percent: {
        [YieldType: string]: number;
    };
    AmountNoMultiplier: {
        [YieldType: string]: number;
    };
}

declare interface UnwrappedPlayerYields {
    [YieldType: string]: {
        /** Amount generated (no negative, e.g. only cities) before percent */
        BaseAmount: number;
        /** Percent applied to base amount */
        Percent: number;
    }
}