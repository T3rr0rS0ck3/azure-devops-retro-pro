import * as SDK from "azure-devops-extension-sdk";

let _client: any = null;

export async function getDataClient() {
  if (_client) return _client;

  try {
    // SDK initialisieren, falls noch nicht
    if (!(SDK as any)._initialized) {
      SDK.init();
    }
    await SDK.ready();

    const token = await SDK.getAccessToken();
    const dataService = (await (SDK as any).getService(
      (SDK as any).ServiceIds.ExtensionData
    )) as any; // <-- hier casten

    const context = SDK.getExtensionContext();
    _client = await dataService.getExtensionDataManager(context.id, token);
    return _client;
  } catch (err) {
    console.warn("⚠️ Azure DevOps SDK not available, running locally:", err);

    // Fallback für lokale Entwicklung
    const localStore: Record<string, any> = {};
    return {
      async getValue(key: string) {
        return localStore[key] ?? null;
      },
      async setValue(key: string, value: any) {
        localStore[key] = value;
      },
    };
  }
}

export async function getIdentity(): Promise<string> {
  try {
    if (!(SDK as any)._initialized) {
      SDK.init();
    }
    await SDK.ready();
    const user = (SDK as any).getUser ? (SDK as any).getUser() : null;
    if (user?.id) return user.id;
  } catch { }

  // Fallback-ID für lokale Nutzung
  const key = "retro-v4-client-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
