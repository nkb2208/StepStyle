import { test } from "bun:test";
import "./helpers/env";
import { stopTestMongo } from "./helpers/harness";

test("teardown: stop the in-memory MongoDB", async () => {
  await stopTestMongo();
}, 30000);
