type Errorish = { message: string } | string | null;

function getMessage(err: Errorish): string | null {
  if (!err) return null;
  if (typeof err === "string") return err;
  return err.message;
}

interface QueryErrorProps {
  error: Errorish;
}

export function QueryError({ error }: QueryErrorProps) {
  const message = getMessage(error);
  if (!message) return null;

  const isConnectionError =
    message.includes("Unable to connect") ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError");

  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <p className="text-sm text-destructive">
        {isConnectionError
          ? "Cannot connect to server. Is the backend running?"
          : message}
      </p>
    </div>
  );
}
