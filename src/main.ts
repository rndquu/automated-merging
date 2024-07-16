import "reflect-metadata";
import * as core from "@actions/core";
import { run } from "./action";

run()
  .then((result) => {
    core.setOutput("result", result);
  })
  .catch((error) => {
    console.error(error);
    core.setFailed(error);
  });
