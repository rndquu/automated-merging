import { Octokit } from "@octokit/rest";
import { Logs } from "@ubiquity-dao/ubiquibot-logger";
import { createAdapters } from "./adapters";
import { initializeDataSource } from "./adapters/sqlite/data-source";
import { updatePullRequests } from "./helpers/update-pull-requests";
import { proxyCallbacks } from "./proxy";
import { Context, Env, PluginInputs } from "./types";

/**
 * How a worker executes the plugin.
 */
export async function plugin(inputs: PluginInputs, env: Env) {
  const octokit = new Octokit({ auth: inputs.authToken });
  const dataSource = await initializeDataSource(inputs.settings.databaseUrl);

  const context: Context = {
    eventName: inputs.eventName,
    payload: inputs.eventPayload,
    config: inputs.settings,
    octokit,
    env,
    logger: new Logs("debug"),
    adapters: {} as ReturnType<typeof createAdapters>,
  };

  context.adapters = createAdapters(dataSource, context);
  await updatePullRequests(context);
  return proxyCallbacks[inputs.eventName](context, env);
}
