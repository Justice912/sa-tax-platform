import { listAuditLogsForEntities } from "@/modules/audit/audit-service";
import { writeAuditLog } from "@/modules/audit/audit-writer";
import { demoAuditLogs } from "@/server/demo-data";

describe("audit service filters", () => {
  it("lists logs for specific entity filters", async () => {
    const snapshot = [...demoAuditLogs];

    await writeAuditLog({
      action: "CLIENT_UPDATED",
      entityType: "Client",
      entityId: "client_001",
      summary: "Updated client details from test.",
    });

    const filtered = await listAuditLogsForEntities(
      [{ entityType: "Client", entityId: "client_001" }],
      10,
    );

    expect(filtered.some((entry) => entry.action === "CLIENT_UPDATED")).toBe(true);
    expect(
      filtered.every(
        (entry) => entry.entityType === "Client" && entry.entityId === "client_001",
      ),
    ).toBe(true);

    demoAuditLogs.length = 0;
    demoAuditLogs.push(...snapshot);
  });
});

