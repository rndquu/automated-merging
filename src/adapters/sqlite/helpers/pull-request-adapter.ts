import { DataSource } from "typeorm";
import { Context } from "../../../types";
import { PullRequest } from "../entities/pull-request";
import { Super } from "./sqlite";

export class PullRequestAdapter extends Super {
  constructor(sqlite: DataSource, context: Context) {
    super(sqlite, context);
  }

  public async create(url: string) {
    const pullRequest = new PullRequest();

    pullRequest.url = url;
    try {
      return await pullRequest.save();
    } catch (e) {
      this.context.logger.error(`Failed to save the url ${url} to the DB: ${e}`);
      return null;
    }
  }

  public async delete(url: string) {
    try {
      const repository = this.sqlite.getRepository(PullRequest);
      const itemToDelete = await repository.findOneBy({
        url,
      });
      if (itemToDelete) {
        await repository.remove(itemToDelete);
      } else {
        this.context.logger.error(`Could not find item for deletion ${url}`);
      }
    } catch (e) {
      this.context.logger.error(`Failed to delete the item ${url}: ${e}`);
    }
  }

  public async getAll() {
    try {
      const repository = this.sqlite.getRepository(PullRequest);
      return await repository.find();
    } catch (e) {
      this.context.logger.error(`Failed to get all items: ${e}`);
    }
  }
}
