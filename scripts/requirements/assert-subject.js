/**
 * @param {Subject} subject
 * @returns {asserts subject is CitySubject}
 */
export function assertSubjectCity(subject) {
    if (subject.type !== 'City') {
        throw new Error(`Expected City subject, got ${subject.type}`);
    }
}

/**
 * @param {Subject} subject
 * @returns {asserts subject is PlotSubject | CitySubject | UnitSubject}
 */
export function assertSubjectPlot(subject) {
    if (subject.type !== 'Plot' && subject.type !== 'City' && subject.type !== 'Unit') {
        throw new Error(`Expected Plot subject, got ${subject.type}`);
    }
}

/**
 * @param {Subject} subject
 * @returns {asserts subject is UnitSubject}
 */
export function assertSubjectUnit(subject) {
    if (subject.type !== 'Unit') {
        throw new Error(`Expected Unit subject, got ${subject.type}`);
    }
}

/**
 * @param {Subject} subject
 * @returns {asserts subject is PlayerSubject}
 */
export function assertSubjectPlayer(subject) {
    if (subject.type !== 'Player') {
        throw new Error(`Expected Player subject, got ${subject.type}`);
    }
}