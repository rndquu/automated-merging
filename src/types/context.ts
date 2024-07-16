import { Octokit } from "@octokit/rest";
import { EmitterWebhookEvent as WebhookEvent, EmitterWebhookEventName as WebhookEventName } from "@octokit/webhooks";
import { Logs } from "@ubiquity-dao/ubiquibot-logger";
import { createAdapters } from "../adapters";
import { Env } from "./env";
import { PluginSettings } from "./plugin-inputs";

export type SupportedEventsU = "pull_request.opened" | "pull_request.reopened";

export type SupportedEvents = {
  [K in SupportedEventsU]: K extends WebhookEventName ? WebhookEvent<K> : never;
};

export interface Context<T extends SupportedEventsU = SupportedEventsU, TU extends SupportedEvents[T] = SupportedEvents[T]> {
  eventName: T;
  payload: TU["payload"];
  octokit: InstanceType<typeof Octokit>;
  adapters: ReturnType<typeof createAdapters>;
  config: PluginSettings;
  env: Env;
  logger: Logs;
}
