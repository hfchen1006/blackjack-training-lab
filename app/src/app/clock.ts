export type Clock = { readonly now: () => number }
export const monotonicClock: Clock = { now: () => performance.now() }
