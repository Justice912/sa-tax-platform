import { createClient, getClientById, listClients } from "@/modules/clients/client-service";
import { demoClients } from "@/server/demo-data";

describe("client creation flow", () => {
  it("includes the golden demo verification clients", async () => {
    const clients = await listClients();

    expect(clients.some((client) => client.id === "golden_client_individual_001")).toBe(true);
    expect(clients.some((client) => client.id === "golden_client_estate_001")).toBe(true);
  });

  it("creates a client record and can fetch it by id", async () => {
    const created = await createClient({
      firmId: "firm_ubuntu",
      displayName: "Interactive Test Client",
      clientType: "INDIVIDUAL",
      status: "ACTIVE",
      taxReferenceNumber: "9999/111/22/3",
      email: "interactive.client@example.co.za",
      phone: "+27 82 999 0000",
      notes: "Created from test",
    });

    const loaded = await getClientById(created.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.displayName).toBe("Interactive Test Client");
    expect(loaded?.clientType).toBe("INDIVIDUAL");
    expect(loaded?.status).toBe("ACTIVE");

    const index = demoClients.findIndex((client) => client.id === created.id);
    if (index >= 0) {
      demoClients.splice(index, 1);
    }
  });
});
