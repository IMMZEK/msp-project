import { BrowserUrlQuery } from '../../frontend/apis/filter-types';
import { AppProps, Page } from '../../frontend/component-helpers/util';
interface CreateAppPropsParams {
    page: Page;
    urlQuery: BrowserUrlQuery.Params;
}
export declare function createAppProps({ page, urlQuery }: CreateAppPropsParams): Promise<AppProps>;
export {};
