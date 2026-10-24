interface MutableBooleanRef {
  current: boolean;
}

export function acquireSearchSubmission(pending: MutableBooleanRef): boolean {
  if (pending.current) {
    return false;
  }

  pending.current = true;
  return true;
}

export function releaseSearchSubmission(pending: MutableBooleanRef): void {
  pending.current = false;
}
