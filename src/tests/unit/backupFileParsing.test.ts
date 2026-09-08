import { describe, expect, it } from "vitest";

import { parseBackupJsonFiles } from "@/features/settings/backupFileParsing";

describe("backup file parsing", () => {
  it("parses multipart files in selection order with a non-worker fallback", async () => {
    const files = [
      new File(['{"part":1}'], "part-1.json", { type: "application/json" }),
      new File(['{"part":2}'], "part-2.json", { type: "application/json" })
    ];

    await expect(parseBackupJsonFiles(files)).resolves.toEqual([{ part: 1 }, { part: 2 }]);
  });

  it("stops between files when the selection is superseded", async () => {
    let current = true;
    const files = [new File(["{}"], "part-1.json"), new File(["{}"], "part-2.json")];

    await expect(parseBackupJsonFiles(files, () => {
      current = false;
      return current;
    })).resolves.toEqual([]);
  });
});
