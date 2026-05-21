import { useParams } from "react-router-dom";

export function ProviderDetailPage() {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-2xl font-bold">Provider</h1>
      <p className="mt-2 text-muted-foreground">Provider ID: {id}</p>
    </div>
  );
}
