"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import {
  createTaskAction,
  updateTaskAction,
  toggleTaskAction,
  deleteTaskAction,
} from "@/actions/checklist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ChecklistTask = {
  id: string;
  title: string;
  category: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

function todayLocalIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDueDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

export function ChecklistClient({ tasks }: { tasks: ChecklistTask[] }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ChecklistTask | null>(null);

  const total = tasks.length;
  const done = tasks.filter((t) => t.completed_at).length;
  const categories = [...new Set(tasks.map((t) => t.category))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const today = todayLocalIso();

  const run = (
    action: () => Promise<{ ok: boolean; message?: string; error?: string }>,
  ) => {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        if (res.message) toast.success(res.message);
      } else {
        toast.error(res.error ?? "Error");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-2xl">Checklist</h1>
          {total > 0 && (
            <span className="text-muted-foreground text-sm">
              {done}/{total} completadas
            </span>
          )}
        </div>
        {total > 0 && (
          <div className="bg-muted mt-3 h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
        )}
      </div>

      <AddTaskForm categories={categories} pending={pending} onSubmit={run} />

      {total === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todavia no hay tareas. Agrega el primer pendiente para el gran dia.
        </p>
      ) : (
        categories.map((category) => {
          const categoryTasks = tasks.filter((t) => t.category === category);
          const categoryDone = categoryTasks.filter(
            (t) => t.completed_at,
          ).length;
          return (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-baseline justify-between text-base">
                  <span>{category}</span>
                  <span className="text-muted-foreground text-sm font-normal">
                    {categoryDone}/{categoryTasks.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {categoryTasks.map((task) => {
                  const completed = Boolean(task.completed_at);
                  const overdue =
                    !completed &&
                    task.due_date !== null &&
                    task.due_date < today;
                  return (
                    <div
                      key={task.id}
                      className="hover:bg-muted/50 flex items-center gap-3 rounded-md px-2 py-1.5"
                    >
                      <Checkbox
                        aria-label={
                          completed
                            ? `Marcar "${task.title}" como pendiente`
                            : `Completar "${task.title}"`
                        }
                        checked={completed}
                        disabled={pending}
                        onCheckedChange={(checked) =>
                          run(() =>
                            toggleTaskAction({
                              task_id: task.id,
                              completed: checked === true,
                            }),
                          )
                        }
                      />
                      <span
                        className={
                          completed
                            ? "text-muted-foreground flex-1 text-sm line-through"
                            : "flex-1 text-sm"
                        }
                      >
                        {task.title}
                      </span>
                      {task.due_date && (
                        <span
                          className={`flex items-center gap-1 text-xs ${
                            overdue
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          <CalendarDays className="size-3.5" />
                          {formatDueDate(task.due_date)}
                        </span>
                      )}
                      <Button
                        aria-label={`Editar "${task.title}"`}
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={pending}
                        onClick={() => setEditing(task)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        aria-label={`Eliminar "${task.title}"`}
                        variant="ghost"
                        size="icon"
                        className="text-destructive size-7"
                        disabled={pending}
                        onClick={() => {
                          if (confirm(`¿Eliminar "${task.title}"?`)) {
                            run(() => deleteTaskAction({ task_id: task.id }));
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })
      )}

      <EditTaskDialog
        task={editing}
        pending={pending}
        onClose={() => setEditing(null)}
        onSubmit={run}
      />
    </div>
  );
}

function AddTaskForm({
  categories,
  pending,
  onSubmit,
}: {
  categories: string[];
  pending: boolean;
  onSubmit: (
    action: () => Promise<{ ok: boolean; message?: string; error?: string }>,
  ) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState("");

  const submit = () => {
    if (!title.trim()) {
      toast.error("Ingresa un titulo");
      return;
    }
    onSubmit(() => createTaskAction({ title, category, due_date: dueDate }));
    setTitle("");
    setDueDate("");
  };

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="min-w-48 flex-1">
        <Label htmlFor="new-title" className="text-xs">
          Tarea
        </Label>
        <Input
          id="new-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Contratar DJ"
          maxLength={200}
        />
      </div>
      <div className="w-40">
        <Label htmlFor="new-category" className="text-xs">
          Categoria
        </Label>
        <Input
          id="new-category"
          list="checklist-categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="General"
          maxLength={60}
        />
        <datalist id="checklist-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="w-40">
        <Label htmlFor="new-due" className="text-xs">
          Fecha limite
        </Label>
        <Input
          id="new-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        Agregar
      </Button>
    </form>
  );
}

function EditTaskDialog({
  task,
  pending,
  onClose,
  onSubmit,
}: {
  task: ChecklistTask | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (
    action: () => Promise<{ ok: boolean; message?: string; error?: string }>,
  ) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lastTaskId, setLastTaskId] = useState<string | null>(null);

  // Sincronizar inputs cuando se abre con otra tarea
  if (task && task.id !== lastTaskId) {
    setLastTaskId(task.id);
    setTitle(task.title);
    setCategory(task.category);
    setDueDate(task.due_date ?? "");
  }

  const submit = () => {
    if (!task) return;
    if (!title.trim()) {
      toast.error("Ingresa un titulo");
      return;
    }
    onSubmit(() =>
      updateTaskAction({
        task_id: task.id,
        title,
        category,
        due_date: dueDate,
      }),
    );
    onClose();
  };

  return (
    <Dialog open={task !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar tarea</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="edit-title" className="text-xs">
              Tarea
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div>
            <Label htmlFor="edit-category" className="text-xs">
              Categoria
            </Label>
            <Input
              id="edit-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={60}
            />
          </div>
          <div>
            <Label htmlFor="edit-due" className="text-xs">
              Fecha limite
            </Label>
            <Input
              id="edit-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
