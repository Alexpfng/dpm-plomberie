const LOCAL_PROSPECTS_KEY = "dpm.crm.localProspects";
const LOCAL_ACTIONS_KEY = "dpm.crm.localActions";
const LOCAL_SMS_TEMPLATE_KEY = "dpm.crm.localSmsTemplate";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function isLocalProspectId(id?: string | null) {
  return Boolean(id?.startsWith("local-prospect-"));
}

export function listLocalProspects() {
  const prospects = readJson<any[]>(LOCAL_PROSPECTS_KEY, []);
  return prospects.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

export function getLocalProspect(id: string) {
  return listLocalProspects().find((prospect) => prospect.id === id) || null;
}

export function createLocalProspect(input: Record<string, any>) {
  const now = new Date().toISOString();
  const prospect = {
    id: `local-prospect-${Date.now()}`,
    created_at: now,
    updated_at: now,
    owner_id: "local",
    status: "nouveau",
    product_status: "prospect",
    score: 0,
    interest_level: 0,
    total_calls: 0,
    total_attempts: 0,
    campaign_id: null,
    company_id: null,
    source: "dpm-local",
    ...input,
  };
  const prospects = listLocalProspects();
  prospects.unshift(prospect);
  writeJson(LOCAL_PROSPECTS_KEY, prospects);
  return prospect;
}

export function updateLocalProspect(id: string, updates: Record<string, any>) {
  const prospects = listLocalProspects().map((prospect) =>
    prospect.id === id ? { ...prospect, ...updates, updated_at: new Date().toISOString() } : prospect,
  );
  writeJson(LOCAL_PROSPECTS_KEY, prospects);
  return prospects.find((prospect) => prospect.id === id) || null;
}

export function deleteLocalProspect(id: string) {
  const prospects = listLocalProspects().filter((prospect) => prospect.id !== id);
  writeJson(LOCAL_PROSPECTS_KEY, prospects);
  const actions = listLocalActions(id).filter((action) => action.prospect_id !== id);
  const allActions = readJson<any[]>(LOCAL_ACTIONS_KEY, []).filter((action) => action.prospect_id !== id);
  writeJson(LOCAL_ACTIONS_KEY, allActions);
  return { prospects, actions };
}

export function listLocalActions(prospectId?: string) {
  const actions = readJson<any[]>(LOCAL_ACTIONS_KEY, []);
  if (!prospectId) return actions;
  return actions.filter((action) => action.prospect_id === prospectId);
}

export function appendLocalAction(prospectId: string, action_type: string, details: Record<string, any> = {}) {
  const actions = readJson<any[]>(LOCAL_ACTIONS_KEY, []);
  const action = {
    id: `local-action-${Date.now()}`,
    prospect_id: prospectId,
    action_type,
    details,
    created_at: new Date().toISOString(),
    user_id: "local",
  };
  actions.unshift(action);
  writeJson(LOCAL_ACTIONS_KEY, actions);
  return action;
}

export function getLocalSmsTemplate(defaultValue: string) {
  if (!canUseStorage()) return defaultValue;
  const value = window.localStorage.getItem(LOCAL_SMS_TEMPLATE_KEY);
  return value?.trim() ? value : defaultValue;
}

export function setLocalSmsTemplate(content: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(LOCAL_SMS_TEMPLATE_KEY, content);
}
