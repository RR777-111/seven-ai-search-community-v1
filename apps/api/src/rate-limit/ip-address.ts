import type { Request } from 'express';

export function getClientIp(request: Request): string {
  const requestIp = normalizeIp(request.ip);
  if (requestIp) {
    return requestIp;
  }

  const trustedIps = Array.isArray(request.ips) ? request.ips : [];
  const trustedForwardedIp = normalizeIp(trustedIps[0]);
  if (trustedForwardedIp) {
    return trustedForwardedIp;
  }

  return normalizeIp(request.socket.remoteAddress) ?? 'unknown';
}

function normalizeIp(value: string | undefined): string | undefined {
  const ip = value?.trim();
  if (!ip) {
    return undefined;
  }
  if (ip.startsWith('::ffff:')) {
    return ip.slice('::ffff:'.length);
  }
  return ip;
}
