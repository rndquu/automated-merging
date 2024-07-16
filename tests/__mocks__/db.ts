// cSpell:disable
import { factory, primaryKey } from "@mswjs/data";

/**
 * Creates an object that can be used as a db to persist data within tests
 */
export const db = factory({
  users: {
    id: primaryKey(Number),
    name: String,
  },
  pullRequests: {
    id: primaryKey(Number),
    head: {
      sha: String,
    },
    author_association: String,
  },
  ci: {
    id: primaryKey(Number),
    conclusion: String,
    status: String,
  },
  reviews: {
    id: primaryKey(Number),
    state: String,
  },
});
