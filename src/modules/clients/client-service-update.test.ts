import { createClient, getClientById, updateClient } from "@/modules/clients/client-service";
import { demoClients } from "@/server/demo-data";

describe("client update flow", () => {
  it("updates an existing client record", async () => {
    const created = await createClient({
      firmId: "firm_ubuntu",
      displayName: "Update Test Client",
      clientType: "INDIVIDUAL",
      status: "ONBOARDING",
      taxReferenceNumber: "9999/222/33/4",
      email: "update.client@example.co.za",
      phone: "+27 82 111 2222",
      notes: "Before update",
    });

    await updateClient(created.id, {
      displayName: "Updated Client Name",
      clientType: "INDIVIDUAL",
      status: "ACTIVE",
      taxReferenceNumber: "1111/222/33/4",
      registrationNumber: "",
      email: "updated.client@example.co.za",
      phone: "+27 82 333 4444",
      notes: "After update",
    });

    const loaded = await getClientById(created.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.displayName).toBe("Updated Client Name");
    expect(loaded?.status).toBe("ACTIVE");
    expect(loaded?.taxReferenceNumber).toBe("1111/222/33/4");
    expect(loaded?.email).toBe("updated.client@example.co.za");

    const index = demoClients.findIndex((client) => client.id === created.id);
    if (index >= 0) {
      demoClients.splice(index, 1);
    }
  });
});

