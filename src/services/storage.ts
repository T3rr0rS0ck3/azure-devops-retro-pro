import * as SDK from "azure-devops-extension-sdk";

let _client: any = null;

// Robust Extension Data client with SDK init and local fallback
export async function getDataClient() {
  if (_client) return _client;

  try {
    // Ensure SDK is initialized and ready
    if (!(SDK as any)._initialized) {
      SDK.init();
    }
    await SDK.ready();

    const token = await SDK.getAccessToken();
    const dataService = (await (SDK as any).getService((SDK as any).ServiceIds.ExtensionData)) as any;
    const context = SDK.getExtensionContext();

    _client = await dataService.getExtensionDataManager(context.id, token);
    return _client;
  } catch (err) {
    console.warn("⚠️ Azure DevOps SDK not available, running in local mode:", err);

    // Local in-memory fallback so the app keeps working during local dev
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

// User identity (fallback to local GUID when outside DevOps iframe)
export async function getIdentity(): Promise<string> {
  try {
    if (!(SDK as any)._initialized) {
      SDK.init();
    }
    await SDK.ready();
    const user = (SDK as any).getUser ? (SDK as any).getUser() : null;
    if (user?.id) return user.id;
  } catch {}

  const key = "retro-client-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

/**
 * Team-wide storage (Project scope)
 * Use these helpers instead of calling client.getValue/setValue directly.
 */
export async function saveTeamValue(key: string, value: any) {
  const client = await getDataClient();
  try {
    // @ts-ignore options object is accepted by Extension Data service
    await client.setValue(key, value, { scopeType: "Project" });
  } catch (e) {
    console.error("❌ Fehler beim Speichern (Project Scope):", e);
  }
}

export async function loadTeamValue<T = any>(key: string): Promise<T | null> {
  const client = await getDataClient();
  try {
    // @ts-ignore
    const val = await client.getValue(key, { scopeType: "Project" });
    return (val as T) ?? null;
  } catch (e) {
    console.warn("⚠️ Konnte Wert nicht laden (Project Scope):", e);
    return null;
  }
}

// Per-user, per-board local storage for private notes
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
