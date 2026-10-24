export function buildApiUrl(path: `/${string}`, apiBaseUrl = ''): string { return `${apiBaseUrl.trim().replace(/\/+$/, '')}${path}`; }
