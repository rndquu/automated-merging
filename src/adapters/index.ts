import { DataSource } from "typeorm";
import { Context } from "../types";
import { PullRequestAdapter } from "./sqlite/helpers/pull-request-adapter";

export function createAdapters(sqlClient: DataSource, context: Context) {
  return {
    sqlite: {
      pullRequest: new PullRequestAdapter(sqlClient, context),
    },
  };
}
