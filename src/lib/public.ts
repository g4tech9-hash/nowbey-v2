/** Report fields that must never leave the server. The account id would link "anonymous" reports to a handle. */
export function publicIncident<T extends { userId?: string | null }>(row: T): Omit<T, "userId"> {
  const copy = { ...row };
  delete copy.userId;
  return copy;
}
