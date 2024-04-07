import { FilterData } from '../../shared/routes/response-data';
import { LoadStatistics } from './loadStatistics';
export declare class SimulatedUser {
    private readonly index;
    private readonly rootNode;
    private readonly filterOptions;
    private readonly loadStatistics;
    private readonly filterPercentage;
    private readonly searchPercentage;
    private static apiFactory;
    private static exceptionsLogged;
    private readonly rand;
    private readonly apis;
    private urlQuery;
    private running;
    private restart;
    constructor(index: number, rootNode: string, filterOptions: FilterData.Options, loadStatistics: LoadStatistics, filterPercentage: number, searchPercentage: number);
    go(): Promise<Error[]>;
    stop(): void;
    private traverseTree;
    private viewLink;
    private continueTraversing;
    private log;
    private setupFiltersAndSearch;
    private setupFilters;
    private setupSearch;
}
