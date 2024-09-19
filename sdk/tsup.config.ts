import { copyFile } from "fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  publicDir: "/Users/aarena/dev/mini/ui/dist",
  // publicDir: true,
  dts: true,
  onSuccess: async () => {
    console.log("Copying package.json to dist");
    await copyFile("./package.json", "./dist/package.json");
  },
});
