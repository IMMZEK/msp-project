export interface ContentLinkToUrlMap {
    [link: string]: string;
}
/**
 * Maps /tirex/content routes that were indexed by Google in the past (but shouldn't have been) to the
 * /tirex/explore/node in the latest package group. If the node public id doesn't exist anymore it will
 * result in a 404 which is intentional. We could have mapped it to the older version where it still
 * exists but users should not be able to access out-of-date- resources through Google. Also, Google
 * somehow managed to index links under tirex/content that don't belong to any resources. These links are
 * mapped to the welcome page tirex/explore.
 *
 * NOTE: This is a one-time generation of the map file to re-route content links that were
 * mistakenly allowed to be crawled by Google in the past. Further crawling has been blocked now in robots.txt.
 * So ideally this script will never need to be run again... As the map file is static and will never
 * change it is stored in ti-rex-core/config instead of ccs-cloud-storage.
 */
export declare function createContentMap(args: any): Promise<void>;
