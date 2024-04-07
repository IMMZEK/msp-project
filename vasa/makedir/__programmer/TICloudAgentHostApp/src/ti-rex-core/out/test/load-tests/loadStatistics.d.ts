import { BrowserUrlQuery } from '../../frontend/apis/filter-types';
export declare class LoadStatistics {
    private readonly userParams;
    addUser(urlParams: BrowserUrlQuery.Params): void;
    log(): void;
    private asPercentage;
}
