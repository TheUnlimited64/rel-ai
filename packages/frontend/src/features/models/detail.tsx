import { useParams } from "react-router-dom";

export function ModelDetailPage() {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-2xl font-bold">Model</h1>
      <p className="mt-2 text-muted-foreground">Model ID: {id}</p>
    </div>
  );
}
