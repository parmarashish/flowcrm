"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  type Task,
  type TaskType,
  type TaskPriority,
  type TaskStatus,
} from "@/features/tasks/tasksApi";
import { useGetLeadsQuery } from "@/features/leads/leadsApi";
import { useGetContactsQuery } from "@/features/contacts/contactsApi";
import { useGetUsersQuery } from "@/features/users/usersApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/features/auth/authSlice";

const TYPES: TaskType[] = ["Call", "Email", "Meeting", "Follow-up"];
const PRIORITIES: TaskPriority[] = ["High", "Medium", "Low"];
const STATUSES: TaskStatus[] = ["Todo", "In Progress", "Done"];

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
}

export function TaskFormDialog({ open, onOpenChange, task }: TaskFormDialogProps) {
  const isEdit = Boolean(task);
  const currentUser = useAppSelector(selectCurrentUser);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [type, setType] = useState<TaskType>(task?.type ?? "Call");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "Medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "Todo");
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const [leadId, setLeadId] = useState<string | null>(task?.relatedLead?.id ?? null);
  const [contactId, setContactId] = useState<string | null>(task?.relatedContact?.id ?? null);
  const [assignedTo, setAssignedTo] = useState<string>(
    task?.assignedTo?.id ?? currentUser?.id ?? ""
  );

  // Only admins can list all users (GET /users is admin-only); team_leaders and
  // agents get a locked "self" assignee until a team-scoped users endpoint exists.
  const canPickAssignee = currentUser?.role === "admin";

  const { data: leadsData } = useGetLeadsQuery({ limit: 100 });
  const { data: contactsData } = useGetContactsQuery({ limit: 100 });
  const { data: usersData } = useGetUsersQuery(undefined, { skip: !canPickAssignee });

  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const isSubmitting = isCreating || isUpdating;

  const assigneeOptions = canPickAssignee
    ? (usersData?.users ?? []).map((u) => ({ value: u.id, label: u.name, sublabel: u.role }))
    : currentUser
      ? [{ value: currentUser.id, label: `${currentUser.name} (you)` }]
      : [];

  // Radix's onOpenChange only fires for its own internally-initiated close/open
  // events (Escape, overlay click) — not when the parent flips `open` externally,
  // which is how "Add Task"/"Edit Task" actually open this dialog. Sync the form
  // fields via effect instead, keyed on `open` and the target task's id.
  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setType(task?.type ?? "Call");
      setPriority(task?.priority ?? "Medium");
      setStatus(task?.status ?? "Todo");
      setDueDate(task?.dueDate?.slice(0, 10) ?? "");
      setLeadId(task?.relatedLead?.id ?? null);
      setContactId(task?.relatedContact?.id ?? null);
      setAssignedTo(task?.assignedTo?.id ?? currentUser?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id, currentUser?.id]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = {
      title,
      description: description || undefined,
      type,
      priority,
      status,
      dueDate,
      relatedLead: leadId,
      relatedContact: contactId,
      assignedTo: assignedTo || undefined,
    };
    try {
      if (isEdit && task) {
        await updateTask({ id: task.id, body }).unwrap();
        toast.success("Task updated");
      } else {
        await createTask(body).unwrap();
        toast.success("Task created");
      }
      onOpenChange(false);
    } catch {
      toast.error(isEdit ? "Failed to update task" : "Failed to create task");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Task" : "Add Task"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update task details." : "Create a new task or follow-up."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 p-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="task-title" className="text-xs font-semibold text-[#545b64]">
                  Task Title <span className="text-[#d13212]">*</span>
                </Label>
                <Input
                  id="task-title"
                  required
                  placeholder="e.g. Follow up on proposal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="task-description" className="text-xs font-semibold text-[#545b64]">
                  Description
                </Label>
                <textarea
                  id="task-description"
                  rows={2}
                  placeholder="Add context or notes for this task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-[2px] border border-[#aab7b8] bg-white p-2 text-xs text-[#0f1923] placeholder:text-[#879596] outline-none transition-colors focus-visible:border-[#0066cc] focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-[#545b64]">
                  Type <span className="text-[#d13212]">*</span>
                </Label>
                <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-[#545b64]">
                  Priority <span className="text-[#d13212]">*</span>
                </Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-[#545b64]">
                  Status <span className="text-[#d13212]">*</span>
                </Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-due-date" className="text-xs font-semibold text-[#545b64]">
                  Due Date <span className="text-[#d13212]">*</span>
                </Label>
                <Input
                  id="task-due-date"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-[#545b64]">Related Lead</Label>
                <SearchableSelect
                  options={(leadsData?.items ?? []).map((l) => ({
                    value: l.id,
                    label: l.name,
                    sublabel: l.status,
                  }))}
                  value={leadId}
                  onChange={setLeadId}
                  placeholder="No lead"
                  clearLabel="No lead"
                  emptyText="No leads found."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-[#545b64]">Related Contact</Label>
                <SearchableSelect
                  options={(contactsData?.items ?? []).map((c) => ({
                    value: c.id,
                    label: c.name,
                    sublabel: c.company?.name ?? undefined,
                  }))}
                  value={contactId}
                  onChange={setContactId}
                  placeholder="No contact"
                  clearLabel="No contact"
                  emptyText="No contacts found."
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-[#545b64]">Assigned To</Label>
                {canPickAssignee ? (
                  <SearchableSelect
                    options={assigneeOptions}
                    value={assignedTo || null}
                    onChange={(v) => setAssignedTo(v ?? "")}
                    placeholder="Select assignee"
                    clearLabel="Unassigned"
                    emptyText="No users found."
                  />
                ) : (
                  <Select value={assignedTo} onValueChange={setAssignedTo} disabled>
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue placeholder="Assigned to you" />
                    </SelectTrigger>
                    <SelectContent>
                      {assigneeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
