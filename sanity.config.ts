import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { apiVersion, dataset, projectId, studioUrl } from "@/lib/sanity/env";
import { schemaTypes } from "@/sanity/schemas";
import { structure } from "@/sanity/structure";

export default defineConfig({
  name: "tpclife",
  title: "TPC Life Studio",

  projectId,
  dataset,
  basePath: studioUrl,

  schema: {
    types: schemaTypes,
  },

  plugins: [
    structureTool({ structure }),
    // Vision lets an editor run a raw GROQ query against the current
    // dataset. It is a developer and power-editor tool, not something a
    // student ever sees.
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
