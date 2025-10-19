import * as SDK from "azure-devops-extension-sdk";

let _client: any = null;
export async function getDataClient() {
  if (_client)
    return _client;

  const token = await SDK.getAccessToken();

  // @ts-ignore
  const dataService = await SDK.getService(SDK.ServiceIds.ExtensionData);

  // @ts-ignore
  _client = await dataService.getExtensionDataManager(SDK.getExtensionContext().id, token);

  return _client;
}
export async function getIdentity(): Promise<string> {
  try {
    // @ts-ignore
    const user = SDK.getUser ? await SDK.getUser() : null;

    if (user?.id)
      return user.id;
  }
  catch { }

  const k = "retro-v4-client-id";
  let id = localStorage.getItem(k);

  if (!id) {
    id = crypto.randomUUID(); localStorage.setItem(k, id);
  }

  return id;
}
