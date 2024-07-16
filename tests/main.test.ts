import { drop } from "@mswjs/data";
import { Octokit } from "@octokit/rest";
import { http, HttpResponse } from "msw";
import * as fs from "node:fs";
import { initializeDataSource } from "../src/adapters/sqlite/data-source";
import { PullRequest } from "../src/adapters/sqlite/entities/pull-request";
import { getMergeTimeoutAndApprovalRequiredCount, isCiGreen } from "../src/helpers/github";
import { db } from "./__mocks__/db";
import { server } from "./__mocks__/node";
import { expect, describe, beforeAll, beforeEach, afterAll, afterEach, it, jest } from "@jest/globals";
import { Context } from "../src/types";
import seed from "./__mocks__/seed.json";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const htmlUrl = "https://github.com/ubiquibot/automated-merging/pull/1";
const actionsGithubPackage = "@actions/github";
const issueParams = { owner: "ubiquibot", repo: "automated-merging", issue_number: 1 };
const workflow = "workflow";

describe("Action tests", () => {
  let dbName = `database/tests/test.db`;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    dbName = `database/tests/${expect.getState().currentTestName}.db`;
    fs.rmSync(dbName, { force: true });
    drop(db);
    for (const table of Object.keys(seed)) {
      const tableName = table as keyof typeof seed;
      for (const row of seed[tableName]) {
        db[tableName].create(row);
      }
    }
  });

  it("Should add a pull request in the DB on PR opened", async () => {
    jest.mock(actionsGithubPackage, () => ({
      context: {
        repo: {
          owner: {
            login: "ubiquibot",
          },
        },
        workflow,
        payload: {
          inputs: {
            eventName: "pull_request.opened",
            settings: JSON.stringify({
              databaseUrl: dbName,
            }),
            eventPayload: JSON.stringify({
              pull_request: {
                html_url: htmlUrl,
              },
            }),
            env: {
              workflowName: workflow,
            },
          },
        },
      },
    }));
    const run = (await import("../src/action")).run;
    await expect(run()).resolves.toMatchObject({ status: 200 });
    const dataSource = await initializeDataSource(dbName);
    const pullRequests = await dataSource.getRepository(PullRequest).find();
    expect(pullRequests).toMatchObject([
      {
        id: 1,
        url: htmlUrl,
      },
    ]);
  });

  it("Should remove a pull request in the DB on PR closed", async () => {
    const dataSource = await initializeDataSource(dbName);
    const pr = new PullRequest();
    pr.url = htmlUrl;
    await pr.save();
    server.use(
      http.get(
        "https://api.github.com/repos/:org/:repo/pulls/:id/reviews",
        () => {
          return HttpResponse.json([{ state: "APPROVED" }, { state: "APPROVED" }]);
        },
        { once: true }
      )
    );
    jest.mock(actionsGithubPackage, () => ({
      context: {
        repo: {
          owner: {
            login: "ubiquibot",
          },
        },
        workflow,
        payload: {
          inputs: {
            eventName: "pull_request.closed",
            settings: JSON.stringify({
              databaseUrl: dbName,
            }),
            eventPayload: JSON.stringify({
              pull_request: {
                html_url: htmlUrl,
              },
            }),
            env: {
              workflowName: workflow,
            },
          },
        },
      },
    }));
    const run = (await import("../src/action")).run;
    await expect(run()).resolves.toMatchObject({ status: 200 });
    const pullRequests = await dataSource.getRepository(PullRequest).find();
    expect(pullRequests).toHaveLength(0);
  });

  it("Should not close a PR that is not past the threshold", async () => {
    const dataSource = await initializeDataSource(dbName);
    const pr = new PullRequest();
    pr.url = htmlUrl;
    await pr.save();
    server.use(
      http.get(
        "https://api.github.com/repos/:org/:repo/pulls/:id/merge",
        () => {
          return HttpResponse.json({}, { status: 404 });
        },
        { once: true }
      ),
      http.get(
        "https://api.github.com/repos/:org/:repo/issues/:id/timeline",
        () => {
          return HttpResponse.json([{ id: 1, created_at: new Date() }]);
        },
        { once: true }
      )
    );
    jest.mock(actionsGithubPackage, () => ({
      context: {
        repo: {
          owner: {
            login: "ubiquibot",
          },
        },
        workflow,
        payload: {
          inputs: {
            eventName: "push",
            settings: JSON.stringify({
              databaseUrl: dbName,
            }),
            eventPayload: JSON.stringify({
              pull_request: {
                html_url: htmlUrl,
              },
            }),
            env: {
              workflowName: workflow,
            },
          },
        },
      },
    }));
    const run = (await import("../src/action")).run;
    await expect(run()).resolves.toMatchObject({ status: 200 });
    const pullRequests = await dataSource.getRepository(PullRequest).find();
    expect(pullRequests).toHaveLength(1);
  });

  it("Should close a PR that is past the threshold", async () => {
    const dataSource = await initializeDataSource(dbName);
    const pr = new PullRequest();
    pr.url = htmlUrl;
    const lastActivityDate = new Date();
    lastActivityDate.setDate(new Date().getDate() - 8);
    await pr.save();
    server.use(
      http.get(
        "https://api.github.com/repos/:org/:repo/pulls/:id/merge",
        () => {
          return HttpResponse.json({}, { status: 404 });
        },
        { once: true }
      )
    );
    jest.mock(actionsGithubPackage, () => ({
      context: {
        repo: {
          owner: {
            login: "ubiquibot",
          },
        },
        workflow,
        payload: {
          inputs: {
            eventName: "push",
            settings: JSON.stringify({
              databaseUrl: dbName,
            }),
            eventPayload: JSON.stringify({
              pull_request: {
                html_url: htmlUrl,
              },
            }),
            env: {
              workflowName: workflow,
            },
          },
        },
      },
    }));
    const run = (await import("../src/action")).run;
    await expect(run()).resolves.toMatchObject({ status: 200 });
    const pullRequests = await dataSource.getRepository(PullRequest).find();
    expect(pullRequests).toHaveLength(0);
  });

  it("Should pick the timeout according to the assignees status", async () => {
    const contributorMergeTimeout = "7 days";
    const collaboratorMergeTimeout = "3.5 days";
    const collaboratorMinimumApprovalsRequired = 2;
    const contributorMinimumApprovalsRequired = 1;
    const context = {
      logger: {
        debug: console.log,
      },
      payload: {
        pull_request: {
          assignees: [{ login: "ubiquibot" }],
        },
      },
      config: {
        mergeTimeout: {
          contributor: contributorMergeTimeout,
          collaborator: collaboratorMergeTimeout,
        },
        approvalsRequired: {
          collaborator: collaboratorMinimumApprovalsRequired,
          contributor: contributorMinimumApprovalsRequired,
        },
      },
      octokit: new Octokit(),
    } as unknown as Context;
    await expect(getMergeTimeoutAndApprovalRequiredCount(context, "COLLABORATOR")).resolves.toEqual({
      mergeTimeout: collaboratorMergeTimeout,
      requiredApprovalCount: collaboratorMinimumApprovalsRequired,
    });
    server.use(
      http.get(
        "https://api.github.com/repos/:org/:repo/collaborators/:login",
        () => {
          return HttpResponse.json("Not a collaborator", { status: 404 });
        },
        { once: true }
      )
    );
    await expect(getMergeTimeoutAndApprovalRequiredCount(context, "CONTRIBUTOR")).resolves.toEqual({
      mergeTimeout: contributorMergeTimeout,
      requiredApprovalCount: contributorMinimumApprovalsRequired,
    });
  });

  it("Should check if the CI tests are all passing", async () => {
    server.use(
      http.get(
        "https://api.github.com/repos/:org/:repo/commits/:id/check-suites",
        () => {
          return HttpResponse.json({ check_suites: [{ id: 1 }] });
        },
        { once: true }
      )
    );
    server.use(
      http.get(
        "https://api.github.com/repos/:org/:repo/check-suites/:id/check-runs",
        () => {
          return HttpResponse.json({ check_runs: [{ id: 1, conclusion: "success", status: "completed" }] });
        },
        { once: true }
      )
    );
    const context = {
      logger: {
        debug: console.log,
      },
      payload: {
        pull_request: {
          assignees: [{ login: "ubiquibot" }],
        },
      },
      workflow: "other workflow",
      config: {},
      octokit: new Octokit(),
      env: {
        workflowName: workflow,
      },
    } as unknown as Context;
    await expect(isCiGreen(context, "1", issueParams)).resolves.toEqual(true);
  });
});
