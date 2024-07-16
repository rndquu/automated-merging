import { DataSource } from "typeorm";
import { Context } from "../../../types";

export class Super {
  protected sqlite: DataSource;
  protected context: Context;

  constructor(sqlite: DataSource, context: Context) {
    this.sqlite = sqlite;
    this.context = context;
  }
}
