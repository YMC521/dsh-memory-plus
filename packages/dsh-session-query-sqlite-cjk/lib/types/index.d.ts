import SessionQueryEngine, {
  type SessionObservation,
  type SessionObservationOptions,
} from "@deepseek-ai/dsh-session-query";
import type { SessionId } from "@deepseek-ai/dsh-session";
export declare const CJK_QUERY_SQLITE_APPLICATION_ID: number;
export declare const CJK_QUERY_SQLITE_DEFAULT_LIMIT: number;
export declare const CJK_QUERY_SQLITE_MAX_LIMIT: number;
export declare const CJK_QUERY_SQLITE_PATH_KEY: string;
export declare const CJK_QUERY_SQLITE_SCHEMA_VERSION: number;
export declare const CJK_QUERY_SQLITE_SNIPPET_CHARS: number;
/** CJK-aware SQLite FTS5 `ctx.sessionQuery` backend (dual-tokenizer: unicode61 + trigram). */
export declare class CjkSessionQueryEngine extends SessionQueryEngine {
  /**
   * Observe one exact live or prepared Session without a persistence listing
   * preflight. Defined explicitly so the service contract is satisfied even
   * when inheriting from an older `@deepseek-ai/dsh-session-query` base that
   * predates `observeSession` (Desktop 2.0.4 session-controller, issue #1).
   * Delegates to the inherited `SessionObservationReader` when present,
   * otherwise synthesizes a live-prepared observation lease.
   */
  observeSession(
    sessionId: SessionId,
    options?: SessionObservationOptions,
  ): Promise<SessionObservation>;
}
export default CjkSessionQueryEngine;
