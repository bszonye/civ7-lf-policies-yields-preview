declare var engine: any;
declare var Controls: any;
declare var Players: {
    get: (playerId: number) => Player;
    getAlive: () => Player[];
    Religion?: {
        get: (playerId: number) => any;
    }
};
declare var GameContext: any;
declare var MapCities: any;
declare var Districts: any;
declare var Loading: any;
declare var Locale: any;
declare var RevealedStates: any;

declare interface Constructibles {
    getByComponentID: (componentId: ID) => ConstructibleInstance;
}
declare var Constructibles: Constructibles;

interface City {
    turn: number;
    maxTurns: number;
    age: number;
    isJustConqueredFrom: boolean;
    getTurnsUntilRazed: number;
    isBeingRazed: boolean;
    isInfected: boolean;
    isDistantLands: boolean;
    isTown: boolean;
    isCapital: boolean;
    ruralPopulation: number;
    urbanPopulation: number;
    pendingPopulation: number;
    population: number;
    location: Location;
    name: string;
    owner: number;
    originalOwner: number;
    localId: number;
    id: CityID;
    getConnectedCities: () => ID[]; // ??
    getPurchasedPlots: () => number[];
    Resources: {
        getTotalCountAssignedResources: () => number;
        getAssignedResourcesCap(): number;
    };
    Constructibles: {
        getIds: () => ID[];
        getMaintenance: (type: string) => number[];
        getIdsOfType: (type: string) => ID[];
        hasConstructible: (type: string, unknownArg: boolean) => boolean;
    };
}
  

interface PlayerCities {
    numCities: number;
    getCities: () => City[];
    getCityIds: () => ID[];
    getCapital: () => any;
    // findClosest: (x: number, y: number) => any; // Returns the closest city to given coordinates
    destroy: (cityId: ID) => void;     
}

interface PlayerUnits {
    getUnitIds: () => ID[];
}

interface PlayerCulture {
    getNumWorksInArchive: () => number;
    getArchivedGreatWork: (numInArchive: number) => number;
    getGreatWorkType: (index: number) => number;
}

declare interface Player {
    Units: PlayerUnits;
    Cities: PlayerCities;
    Culture: PlayerCulture;
    Identity: any;
    Diplomacy: {
        getIdeology: () => number; // -1 if no ideology
        getRelationshipEnum: (otherPlayer: Player) => number;
        hasAllied: (otherPlayerId: number) => boolean;
        isAtWarWith: (otherPlayerId: number) => boolean;
    };
    Stats: any;
    Trade: any;
    Influence: any;
    Resources: any;
    isMinor: boolean;
    isMajor: boolean;
    id: number;
    isDistantLands(coord: Location): boolean;
}

declare var Player: Player;

declare interface Units {
    get(id: ID): UnitInstance;
    hasTag: (unitId: ID, tag: string) => boolean;
}

declare var Units: Units;

declare interface UnitExperience {
    getStoredCommendations: number;
    getStoredPromotionPoints: number;
    spentExperience: number;
    experienceToNextLevel: number;
    experiencePoints: number;
    canEarnExperience: boolean;
    getTotalPromotionsEarned: number;
    getLevel: number;
    getNumCommendations: number;
    getNumPromotions: number;
    canPromote: boolean;
}

declare interface UnitInstance {
    Experience: UnitExperience;
    activityType: number;
    operationQueueSize: number;
    hasPendingOperations: boolean;
    sightRange: number;
    canSeeThroughTerrain: boolean;
    canSeeThroughFeatures: boolean;
    isCombat: boolean;
    age: number;
    formationID: number;
    formationUnitCount: number;
    hasHiddenVisibility: boolean;
    noDefensiveBonusCount: number;
    noDefensiveBonus: boolean;
    isFortified: boolean;
    isReadyToAutomate: boolean;
    isAutomated: boolean;
    hasAdjacentMove: boolean;
    canCyclePast: boolean;
    isReadyToMove: boolean;
    isReadyToSelect: boolean;
    buildCharges: number;
    sightModifiers: any;
    hasMoved: boolean;
    movementDisabledThisTurn: boolean;
    canMove: boolean;
    needsMovementCompletion: boolean;
    embarkationType: number;
    isEmbarked: boolean;
    needsAttention: boolean;
    isOnMap: boolean;
    isBusy: boolean;
    isDead: boolean;
    operationTimer: number;
    isBarbarian: boolean;
    isGreatPerson: boolean;
    isCommanderUnit: boolean;
    isAerodromeCommander: boolean;
    isSquadronCommander: boolean;
    isFleetCommander: boolean;
    isArmyCommander: boolean;
    originCityId: number;
    location: Location;
    armyId: ID;
    name: string;
    owner: number;
    type: number;
    originalOwner: number;
    localId: number;
    id: ID;
}

declare interface Game {
    VictoryManager: Record<string, unknown>;
    Unlocks: Record<string, unknown>;
    UnitOperations: Record<string, unknown>;
    UnitCommands: Record<string, unknown>;
    Trade: Record<string, unknown>;
    Summary: Record<string, unknown>;
    Resources: Record<string, unknown>;
    Religion: Record<string, unknown>;
    RandomEvents: {
        stormPercentChance: number;
        eruptionPercentChance: number;
        floodPercentChance: number;
    };
    ProgressionTrees: Record<string, unknown>;
    PlayerOperations: Record<string, unknown>;
    Notifications: Record<string, unknown>;
    PlacementRules: Record<string, unknown>;
    IndependentPowers: Record<string, unknown>;
    EconomicRules: Record<string, unknown>;
    DiplomacyDeals: Record<string, unknown>;
    DiplomacySessions: Record<string, unknown>;
    Diplomacy: Record<string, unknown>;
    Culture: Record<string, unknown>;
    CrisisManager: Record<string, unknown>;
    Combat: Record<string, unknown>;
    CityStates: Record<string, unknown>;
    CityOperations: Record<string, unknown>;
    CityCommands: Record<string, unknown>;
    AgeProgressManager: {
        isAgeOver: number;
        isFinalAge: boolean;
        isSingleAge: boolean;
    };
    turn: number;
    maxTurns: number;
    age: number;
}
      
declare var Game: Game;

declare interface GameplayMap {
    getIndexFromLocation: (location: Location) => number;
    getLocationFromIndex: (index: number) => Location;
    getPlotIndicesInRadius: (x: number, y: number, radius: number) => number[];
    
    getAdjacentPlotLocation: (x: number, y: number, direction: string) => { x: number; y: number };
    getProperty: (x: number, y: number, propertyName: string) => any;
    findSecondContinent: () => number;
    getBiomeType: (x: number, y: number) => number;
    getAreaId: (x: number, y: number) => number;
    getLandmassId: (x: number, y: number) => number;
    getRegionId: (x: number, y: number) => number;
    getAreaIsWater: (x: number, y: number) => boolean;
    getContinentType: (x: number, y: number) => string;
    getDirectionToPlot: (x1: number, y1: number, x2: number, y2: number) => string;
    getElevation: (x: number, y: number) => number;
    getRouteType: (x: number, y: number) => number;
    getRouteAgeType: (x: number, y: number) => string;
    getFeatureType: (x: number, y: number) => number;
    getFeatureClassType: (x: number, y: number) => number;
    getFertilityType: (x: number, y: number) => string;
    getGridWidth: () => number;
    getGridHeight: () => number;
    getPlotCount: () => number;
    getMapSize: () => number;
    getRandomSeed: () => number;
    getIndexFromXY: (x: number, y: number) => number;
    isValidLocation: (loc: Location) => boolean;
    isValidXY: (x: number, y: number) => boolean;
    getOwner: (x: number, y: number) => number;
    getOwnerName: (x: number, y: number) => string;
    getOwnerHostility: (x: number, y: number) => number;
    getOwningCityFromXY: (x: number, y: number) => number;
    getHemisphere: (x: number, y: number) => string;
    getPrimaryHemisphere: (x: number, y: number) => string;
    getPlotDistance: (x1: number, y1: number, x2: number, y2: number) => number;
    getPlotLatitude: (x: number, y: number) => number;
    getRainfall: (x: number, y: number) => number;
    getResourceType: (x: number, y: number) => number;
    getRevealedState: (playerId: number, x: number, y: number) => string;
    getRevealedStates: (playerId: number) => number[];
    getRiverType: (x: number, y: number) => string;
    getTerrainType: (x: number, y: number) => number;
    getYield: (x: number, y: number, yieldType: string) => number;
    getYields: (x: number, y: number) => Record<string, number>;
    getYieldWithCity: (x: number, y: number, cityId: number, yieldType: string) => number;
    getYieldsWithCity: (x: number, y: number, cityId: number) => Record<string, number>;
    isCoastalLand: (x: number, y: number) => boolean;
    isAdjacentToLand: (x: number, y: number) => boolean;
    isCityWithinMinimumDistance: (x: number, y: number) => boolean;
    isFreshWater: (x: number, y: number) => boolean;
    isNaturalWonder: (x: number, y: number) => boolean;
    isNavigableRiver: (x: number, y: number) => boolean;
    isFerry: (x: number, y: number) => boolean;
    isAdjacentToRivers: (x: number, y: number) => boolean;
    isAdjacentToAnotherBiome: (x: number, y: number) => boolean;
    isAdjacentToFeature: (x: number, y: number, featureType: string) => boolean;
    isAdjacentToShallowWater: (x: number, y: number) => boolean;
    isVolcano: (x: number, y: number) => boolean;
    isVolcanoActive: (x: number, y: number) => boolean;
    getVolcanoName: (x: number, y: number) => string;
    isImpassable: (x: number, y: number) => boolean;
    isLake: (x: number, y: number) => boolean;
    isMountain: (x: number, y: number) => boolean;
    isCliffCrossing: (x: number, y: number) => boolean;
    isRiver: (x: number, y: number) => boolean;
    getRiverName: (x: number, y: number) => string;
    isWater: (x: number, y: number) => boolean;
    getPlotTag: (x: number, y: number, tag: string) => string;
    hasPlotTag: (x: number, y: number, tag: string) => boolean;
    isPlotInAdvancedStartRegion: (x: number, y: number) => boolean;      
}

declare var GameplayMap: GameplayMap;

declare interface MapConstructibles {
    getConstructibles(x: number, y: number): ID[];
    getHiddenFilteredConstructibles(x: number, y: number): ID[];
}

declare var MapConstructibles: MapConstructibles;

declare var MapUnits: {
    getUnits: (x: number, y: number) => UnitInstance[];
}

declare var ResourceTypes = {
    NO_RESOURCE: -1,
}

declare var DiplomacyManager: {
    getRelationshipTypeString(type: number): string;
}