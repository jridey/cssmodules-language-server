#!/usr/bin/env node

import { createConnection } from "./connection";
import {version} from "../package.json";

const args = process.argv;

if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write(version);
  process.exit(0);
}

createConnection().listen();
