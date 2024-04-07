export type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
export type Common<A, B> = {
    [P in keyof A & keyof B]: A[P] | B[P];
};
export type ConsistentWith<T, U> = Pick<U, keyof T & keyof U>;
export type Overwrite<T, U> = (U extends ConsistentWith<U, T> ? T : Omit<T, keyof U>) & U;
export type PartialMember<T, K extends keyof any> = Omit<T, Extract<keyof T, K>> & Partial<Omit<T, Exclude<keyof T, K>>>;
export type ValueOf<T> = T[keyof T];
export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
export type PromiseResult<T> = T extends Promise<infer U> ? U : T;
