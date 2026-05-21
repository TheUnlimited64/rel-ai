import { Button } from "@/components/ui/button";

export function Pagination({
  offset,
  total,
  pageSize,
  onOffsetChange,
}: {
  offset: number;
  total: number;
  pageSize: number;
  onOffsetChange: (offset: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  const currentPage = Math.floor(offset / pageSize) + 1;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {offset + 1}–{Math.min(offset + pageSize, total)} of {total}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => onOffsetChange(0)}>First</Button>
        <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => onOffsetChange(Math.max(0, offset - pageSize))}>Prev</Button>
        <span className="flex items-center px-2 text-sm">Page {currentPage}/{totalPages}</span>
        <Button variant="outline" size="sm" disabled={offset + pageSize >= total} onClick={() => onOffsetChange(offset + pageSize)}>Next</Button>
        <Button variant="outline" size="sm" disabled={offset + pageSize >= total} onClick={() => onOffsetChange((totalPages - 1) * pageSize)}>Last</Button>
      </div>
    </div>
  );
}
