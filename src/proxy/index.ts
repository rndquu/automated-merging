import { handlePullRequestOpened } from "../handlers/pull-request-opened";
import { Context, Env, SupportedEventsU } from "../types";

export interface Result {
  status: "ok" | "failed" | "skipped";
  content?: string;
  reason?: string;
}

const callbacks: { [k in SupportedEventsU]: (context: Context, env: Env) => Result | Promise<Result> } = {
  "pull_request.opened": handlePullRequestOpened,
  "pull_request.reopened": handlePullRequestOpened,
};

export const proxyCallbacks = new Proxy(callbacks, {
  get(target, prop: SupportedEventsU) {
    if (!(prop in target)) {
      console.warn(`${prop} is not supported, skipping.`);
      return async () => ({ status: "skipped", reason: "unsupported_event" });
    }
    return target[prop].bind(target);
  },
});
