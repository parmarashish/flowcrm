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
  Building2,
} from "lucide-react";
import { toast } from "sonner";
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
import { useGetContactsQuery, useDeleteContactMutation, type Contact } from "@/features/contacts/contactsApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/features/auth/authSlice";
import { ContactFormDialog } from "@/components/ContactFormDialog";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);

  const currentUser = useAppSelector(selectCurrentUser);
  const router = useRouter();

  const { data, isLoading, isFetching, isError, refetch } = useGetContactsQuery({
    search: search || undefined,
    page,
    limit,
  });

  const [deleteContact] = useDeleteContactMutation();

  const total = data?.total ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(total / limit)) : 1;
  const startCount = total === 0 ? 0 : (page - 1) * limit + 1;
  const endCount = Math.min(page * limit, total);

  function openAddDialog() {
    setEditingContact(undefined);
    setFormOpen(true);
  }

  function openEditDialog(contact: Contact) {
    setEditingContact(contact);
    setFormOpen(true);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete contact "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteContact(id).unwrap();
      toast.success("Contact deleted successfully");
    } catch {
      toast.error("Failed to delete contact");
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
          <h1 className="text-base font-semibold text-[#0f1923]">Contacts</h1>
          <span className="text-xs font-normal text-[#545b64]">({total})</span>
          {isFetching && <RefreshCw className="size-3 animate-spin text-[#0066cc]" />}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#545b64]" />
            <Input
              placeholder="Filter by name or email..."
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
            Add Contact
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
            Failed to load contacts from server.
          </div>
        ) : (
          <table className="w-full text-left text-[13px] border-collapse">
            <thead className="bg-[#f1f3f4] border-b border-[#d5d9d9] select-none">
              <tr>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Name
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Company
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Email
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Phone
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Leads
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
              {data?.items.map((contact) => (
                <tr key={contact.id} className="h-10 transition-colors hover:bg-[#f8f9fa]">
                  <td className="px-3 py-2 font-medium">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="text-[#0066cc] hover:underline"
                    >
                      {contact.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-[#545b64]">
                    {contact.company?.name ? (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="size-3 text-[#879596]" />
                        {contact.company.name}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-[#545b64]">{contact.email}</td>
                  <td className="px-3 py-2 text-[#545b64]">{contact.phone || "—"}</td>
                  <td className="px-3 py-2 text-[#545b64]">{contact.leadsCount}</td>
                  <td className="px-3 py-2 text-[12px] text-[#879596]">
                    {formatCreationDate(contact.createdAt)}
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
                          onClick={() => router.push(`/contacts/${contact.id}`)}
                          className="cursor-pointer"
                        >
                          <Search className="size-3.5 mr-2" />
                          <span>View Contact</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openEditDialog(contact)}
                          className="cursor-pointer"
                        >
                          <Edit2 className="size-3.5 mr-2" />
                          <span>Edit Contact</span>
                        </DropdownMenuItem>
                        {currentUser?.role === "admin" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(contact.id, contact.name)}
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
                  <td colSpan={7} className="py-12 text-center text-[#879596]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="size-8 text-[#d5d9d9]" />
                      <p className="text-sm font-semibold text-[#0f1923]">No contacts found</p>
                      <p className="text-xs text-[#545b64]">
                        Try adjusting your search query, or add your first contact.
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
              <span className="font-semibold text-[#0f1923]">{total}</span> contacts
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

      <ContactFormDialog open={formOpen} onOpenChange={setFormOpen} contact={editingContact} />
    </div>
  );
}
