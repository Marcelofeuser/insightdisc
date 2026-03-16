export { GLOBAL_DISC_BENCHMARK, FACTOR_LABELS, FACTORS } from './constants.js';
export {
  buildBehaviorAnalytics,
  buildBenchmarkComparison,
  buildBehaviorHistory,
  buildOrganizationalDimensions,
} from './behaviorAnalyticsEngine.js';
export { readBehaviorHistory, recordBehaviorHistoryEntry } from './historyStorage.js';
export {
  BehaviorAnalyticsExecutivePanel,
  BenchmarkPanel,
  BehaviorHistoryPanel,
} from './components/index.js';
