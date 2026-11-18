import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema.js";

export const db = drizzle({ schema });
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
