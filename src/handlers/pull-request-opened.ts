import { Result } from "../proxy";
import { Context } from "../types";

/**
 * On pull request opening, we want to add the entry to start watching it.
 */
export async function handlePullRequestOpened(context: Context): Promise<Result> {
  const {
    adapters: {
      sqlite: { pullRequest },
    },
  } = context;
  await pullRequest.create(context.payload.pull_request.html_url);
  return { status: "ok" };
}
