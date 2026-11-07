import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rulesPath = resolve("backend/firebase/firestore.rules");

describe("Firestore membership contract", () => {
  it("makes membership server-managed and gates financial data on active membership", async () => {
    const rules = await readFile(rulesPath, "utf8");

    expect(rules).toContain("match /betaMembers/{memberId}");
    expect(rules).toContain("allow create, update, delete: if false;");
    expect(rules).toContain("function isActiveMember()");
    expect(rules).toContain("isOwner(userId) && isActiveMember()");
  });
});
