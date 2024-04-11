/// <reference types="node" />
export declare const readJsonWithCommentsCb: (arg1: string, callback: (err: NodeJS.ErrnoException, result: any) => void) => void;
export declare function readJsonWithComments(file: string): Promise<any>;
