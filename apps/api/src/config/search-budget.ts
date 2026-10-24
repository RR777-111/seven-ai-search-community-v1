export const DEFAULT_SEARCH_FETCH_TIME_BUDGET_MS = 6000;
export const DEFAULT_SEARCH_IN_FLIGHT_TTL_SECONDS = 30;

const SEARCH_NON_PROVIDER_BUDGET_MS = 10000;
const SEARCH_IN_FLIGHT_RELEASE_MARGIN_SECONDS = 5;

export function getMinimumSearchInFlightTtlSeconds(
  searchFetchTimeBudgetMs: number,
): number {
  const requestBudgetMs =
    searchFetchTimeBudgetMs + SEARCH_NON_PROVIDER_BUDGET_MS;

  return Math.ceil(requestBudgetMs / 1000) + SEARCH_IN_FLIGHT_RELEASE_MARGIN_SECONDS;
}
