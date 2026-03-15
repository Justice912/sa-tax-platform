import { createClient, updateClient } from "@/modules/clients/client-service";
import { listAuditLogsForEntities } from "@/modules/audit/audit-service";
import { demoAuditLogs, demoClients } from "@/server/demo-data";

describe("client audit log integration", () => {
  it("writes audit entries when creating and updating a client", async () => {
    const auditSnapshot = [...demoAuditLogs];

    const created = await createClient({
      firmId: "firm_ubuntu",
      displayName: "Audit Client",
      clientType: "INDIVIDUAL",
      status: "ONBOARDING",
      taxReferenceNumber: "2222/333/44/5",
      email: "audit.client@example.co.za",
      phone: "+27 82 111 9999",
      notes: "audit test create",
    });

    await updateClient(created.id, {
      displayName: "Audit Client Updated",
      clientType: "INDIVIDUAL",
      status: "ACTIVE",
      taxReferenceNumber: "2222/333/44/5",
      registrationNumber: "",
      email: "audit.client.updated@example.co.za",
      phone: "+27 82 111 0000",
      notes: "audit test update",
    });

    const logs = await listAuditLogsForEntities(
      [{ entityType: "Client", entityId: created.id }],
      10,
    );

    expect(logs.some((entry) => entry.action === "CLIENT_CREATED")).toBe(true);
    expect(logs.some((entry) => entry.action === "CLIENT_UPDATED")).toBe(true);

    const clientIndex = demoClients.findIndex((entry) => entry.id === created.id);
    if (clientIndex >= 0) {
      demoClients.splice(clientIndex, 1);
    }
    demoAuditLogs.length = 0;
    demoAuditLogs.push(...auditSnapshot);
  });
});

