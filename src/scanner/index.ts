/** Public surface of the announcement scanner module. */
export {
  runScanner,
  type Agreement,
  type NearMiss,
  type Sighting,
  type ScannerOptions,
  type ScannerOutcome,
} from "./scanner.js";
export { buildCandidates, isPollingWindow, type CandidatePair, type MonthCandidate } from "./candidates.js";
export {
  COMMITTEE_SOURCES,
  DEFAULT_SOURCES,
  DIRECT_SOURCES,
  buildMonthSources,
  buildSources,
  createParser,
  fetchArticles,
  type Article,
  type FetchLike,
  type SourceConfig,
  type SourceError,
} from "./sources.js";
export { extractAnnouncedStart, isRelevantAnnouncement, type Extraction } from "./extract.js";
export {
  applyProposal,
  buildProposal,
  canonicalPublisher,
  countPublishers,
  renderPullRequestBody,
  type BuildProposalOptions,
  type Evidence,
  type Proposal,
} from "./proposal.js";
