declare interface Location {
    x: number;
    y: number;
}
  
declare interface ID {
    owner: number;
    id: number;
    type: number;
}

declare interface GreatWorkSlot {
    greatWorkIndex: number;
    slotType: number;
  }
  
declare interface GreatWorkBuilding {
    constructibleID: ConstructibleID;
    slots: GreatWorkSlot[];
}
  
declare interface ConstructibleInstance {
    damaged: boolean;
    complete: boolean;
    location: Location;
    cityId: ID;
    owner: number;
    originalOwner: number;
    type: number;
    localId: number;
    id: ID;
}
  
declare interface TradeRouteInstance {
    id: ID;
    name: string;
    leftCityID: ID;
    rightCityID: ID;
    leftPayload: {
        resourceValues: ID[];
    };
    rightPayload: {
        resourceValues: ID[];
    };
}