import { IssueParams } from "../helpers/github";
import { Context } from "../types";

export async function getAllTimelineEvents({ octokit }: Context, issueParams: IssueParams) {
  return octokit.paginate(octokit.rest.issues.listEventsForTimeline, issueParams);
}
