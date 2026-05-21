import { useParams } from "react-router-dom";

export function EndpointDetailPage() {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-2xl font-bold">Endpoint</h1>
      <p className="mt-2 text-muted-foreground">Endpoint ID: {id}</p>
    </div>
  );
}
