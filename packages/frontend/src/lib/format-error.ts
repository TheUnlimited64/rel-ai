// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatMutationError(error: any): string {
  if (error.data?.code === "CONFLICT") {
    return "An item with this identifier already exists.";
  }
  if (error.data?.code === "BAD_REQUEST") {
    return error.message;
  }
  return error.message;
}
