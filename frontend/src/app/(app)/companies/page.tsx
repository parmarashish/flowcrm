"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetCompaniesQuery, useDeleteCompanyMutation, type Company } from "@/features/companies/companiesApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/features/auth/authSlice";
import { CompanyFormDialog } from "@/components/CompanyFormDialog";

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const currentUser = useAppSelector(selectCurrentUser);
  const router = useRouter();

  const { data, isLoading, isFetching, isError, refetch } = useGetCompaniesQuery({
    search: search || undefined,
    page,
    limit,
  });

  const [deleteCompany] = useDeleteCompanyMutation();

  const total = data?.total ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(total / limit)) : 1;
  const startCount = total === 0 ? 0 : (page - 1) * limit + 1;
  const endCount = Math.min(page * limit, total);

  function openAddDialog() {
    setEditingCompany(undefined);
    setFormOpen(true);
  }

  function openEditDialog(company: Company) {
    setEditingCompany(company);
    setFormOpen(true);
  }

  function handleDelete(id: string, name: string) {
    setDeleteTarget({ id, name });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCompany(deleteTarget.id).unwrap();
      toast.success("Company deleted successfully");
    } catch {
      toast.error("Failed to delete company");
    } finally {
      setDeleteTarget(null);
    }
  }

  const formatCreationDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Resource Table Action Bar (AWS EC2 Style) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-[#0f1923]">Companies</h1>
          <span className="text-xs font-normal text-[#545b64]">({total})</span>
          {isFetching && <RefreshCw className="size-3 animate-spin text-[#0066cc]" />}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#545b64]" />
            <Input
              placeholder="Filter by name or industry..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 pl-8 text-xs border-[#aab7b8]"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#879596] hover:text-[#0f1923]"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} title="Refresh list">
            <RefreshCw className="size-3.5" />
          </Button>

          <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
            <Plus className="size-3.5" />
            Add Company
          </Button>
        </div>
      </div>

      {/* DATA TABLE (AWS Console Grid) */}
      <div className="relative w-full overflow-x-auto rounded-[2px] border border-[#d5d9d9] bg-white">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-[#d13212]">
            Failed to load companies from server.
          </div>
        ) : (
          <table className="w-full text-left text-[13px] border-collapse">
            <thead className="bg-[#f1f3f4] border-b border-[#d5d9d9] select-none">
              <tr>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Company Name
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Industry
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Contacts
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Website
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Created
                </th>
                <th className="w-12 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5d9d9]">
              {data?.items.map((company) => (
                <tr key={company.id} className="h-10 transition-colors hover:bg-[#f8f9fa]">
                  <td className="px-3 py-2 font-medium">
                    <Link
                      href={`/companies/${company.id}`}
                      className="text-[#0066cc] hover:underline"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-[#545b64]">{company.industry || "—"}</td>
                  <td className="px-3 py-2 text-[#545b64]">{company.contactsCount}</td>
                  <td className="px-3 py-2 text-[#545b64]">
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#0066cc] hover:underline"
                      >
                        {company.website.replace(/^https?:\/\//, "")}
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-[#879596]">
                    {formatCreationDate(company.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex size-7 items-center justify-center rounded-[2px] text-[#545b64] hover:bg-[#eaeded] hover:text-[#0f1923] transition-colors ml-auto cursor-pointer">
                          <MoreVertical className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          onClick={() => router.push(`/companies/${company.id}`)}
                          className="cursor-pointer"
                        >
                          <Search className="size-3.5 mr-2" />
                          <span>View Company</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openEditDialog(company)}
                          className="cursor-pointer"
                        >
                          <Edit2 className="size-3.5 mr-2" />
                          <span>Edit Company</span>
                        </DropdownMenuItem>
                        {currentUser?.role === "admin" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(company.id, company.name)}
                              className="text-[#d13212] focus:text-[#d13212] cursor-pointer"
                            >
                              <Trash2 className="size-3.5 mr-2" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}

              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#879596]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="size-8 text-[#d5d9d9]" />
                      <p className="text-sm font-semibold text-[#0f1923]">No companies found</p>
                      <p className="text-xs text-[#545b64]">
                        Try adjusting your search query, or add your first company.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* AWS Table Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between border-t border-[#d5d9d9] bg-[#f8f9fa] px-3 py-2 text-xs text-[#545b64]">
          <div className="flex items-center gap-3">
            <span>
              Showing <span className="font-semibold text-[#0f1923]">{startCount}</span> to{" "}
              <span className="font-semibold text-[#0f1923]">{endCount}</span> of{" "}
              <span className="font-semibold text-[#0f1923]">{total}</span> companies
            </span>

            <div className="hidden sm:flex items-center gap-1.5 border-l border-[#d5d9d9] pl-3">
              <span className="text-[11px] text-[#879596]">Rows per page:</span>
              <Select
                value={String(limit)}
                onValueChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#879596]">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CompanyFormDialog open={formOpen} onOpenChange={setFormOpen} company={editingCompany} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Company"
        description={`Delete company "${deleteTarget?.name}"? Its contacts will be kept but unlinked from this company. This action cannot be undone.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
