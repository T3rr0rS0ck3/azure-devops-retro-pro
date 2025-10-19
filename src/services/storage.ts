const SDK = (window as any).VSS || (window as any).SDK;

let _client: any = null;

export async function getDataClient() {
  if (_client) return _client;

  const inDevOps = window.self !== window.top && !!SDK;
  if (!inDevOps) {
    console.warn("⚠️ Not running inside Azure DevOps frame – using mock data client.");
    return mockDataClient();
  }

  try {
    SDK.init({ loaded: false });
  } catch { }

  try {
    await SDK.ready();
  } catch (e) {
    console.error("SDK.ready() failed", e);
    return mockDataClient();
  }

  let dataService: any;
  try {
    dataService = await SDK.getService("ms.vss-extension-data-service");
    if (!dataService) throw new Error("Service not found");
  } catch (e) {
    console.error("❌ Could not get ms.vss-extension-data-service", e);
    return mockDataClient();
  }

  try {
    const token = await SDK.getAccessToken();
    const ctx = SDK.getExtensionContext();
    _client = await dataService.getExtensionDataManager(ctx.id, token);
    console.log("✅ Extension data manager ready");
    return _client;
  } catch (e) {
    console.error("❌ Failed to initialize data manager", e);
    return mockDataClient();
  }
}

function mockDataClient() {
  return {
    async getValue(_key: string, _userScoped?: boolean) {
      console.warn("Mock getValue called:", _key);
      return null;
    },
    async setValue(_key: string, value: any, _userScoped?: boolean) {
      console.warn("Mock setValue called:", _key, value);
      return value;
    }
  };
}

export async function getIdentity() {
  const SDK = (window as any).VSS || (window as any).SDK;
  try {
    await SDK.ready();
    const user = SDK.getUser();
    return {
      id: user.id,
      name: user.displayName,
      email: user.uniqueName
    };
  } catch (e) {
    console.warn("⚠️ Could not get user identity, using fallback", e);
    return { id: "local", name: "Local User", email: "local@localhost" };
  }
}

