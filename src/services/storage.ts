import * as SDK from "azure-devops-extension-sdk";

let _client: any = null;

export async function getDataClient() {
  if (_client) return _client;

  try {
    // SDK muss initialisiert sein
    if (!(SDK as any)._initialized) {
      SDK.init({ loaded: true });
      await SDK.ready();
    }

    const token = await SDK.getAccessToken();

    // 👇 Neu: expliziter Dienstname statt SDK.ServiceIds
    const dataService = await SDK.getService<any>("ms.vss-web.data-service");
    if (!dataService) throw new Error("ExtensionData service unavailable");

    const context = SDK.getExtensionContext();
    _client = await dataService.getExtensionDataManager(context.id, token);
    console.log("✅ Azure DevOps DataClient ready");
    return _client;
  } catch (err) {
    console.warn("⚠️ Azure DevOps SDK not available, running in local mode:", err);

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
      SDK.init({ loaded: true });
      await SDK.ready();
    }
    const user = (SDK as any).getUser ? (SDK as any).getUser() : null;
    if (user?.id) return user.id;
  } catch { }

  const key = "retro-client-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function saveTeamValue(key: string, value: any) {
  const client = await getDataClient();
  try {
    await client.setValue(key, value, { scopeType: "Project" });
    console.log(`💾 Saved [${key}] in Project scope`);
  } catch (e) {
    console.error("❌ Fehler beim Speichern (Project Scope):", e);
  }
}

export async function loadTeamValue<T = any>(key: string): Promise<T | null> {
  const client = await getDataClient();
  try {
    const val = await client.getValue(key, { scopeType: "Project" });
    console.log(`📥 Loaded [${key}] from Project scope`);
    return (val as T) ?? null;
  } catch (e) {
    console.warn("⚠️ Konnte Wert nicht laden (Project Scope):", e);
    return null;
  }
}

export function loadMyLocal<T = any>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveMyLocal<T = any>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("❌ Fehler beim lokalen Speichern:", e);
  }
}
