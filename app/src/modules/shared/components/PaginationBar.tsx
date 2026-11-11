import { Button } from "@/components/ui/button"

export function PaginationBar({ page, pageSize, total, onPageChange, loading, label = "Paginação" }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void; loading?: boolean; label?: string }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label={label}>
      <p className="text-muted">{total === 0 ? "Nenhum resultado" : `Mostrando ${start}–${end} de ${total}`}</p>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1 || loading}>Anterior</Button>
        <span className="text-ink">Página {page} de {totalPages}</span>
        <Button type="button" size="sm" variant="outline" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages || loading}>Próxima</Button>
      </div>
    </div>
  )
}
