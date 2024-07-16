import { DataSource } from "typeorm";
import { PullRequest } from "./entities/pull-request";

export async function initializeDataSource(databaseUrl: string) {
  const dataSource = new DataSource({
    type: "sqlite",
    database: databaseUrl,
    synchronize: true,
    logging: true,
    entities: [PullRequest],
    subscribers: [],
    migrations: [],
  });
  return dataSource.initialize();
}
