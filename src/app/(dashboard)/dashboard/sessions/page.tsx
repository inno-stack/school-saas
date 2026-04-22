"use client";
import { Header } from "@/components/layout/Header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import api from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TERM_LABELS: Record<string, string> = {
  FIRST: "1st Term",
  SECOND: "2nd Term",
  THIRD: "3rd Term",
};

export default function SessionsPage() {
  useRequireAuth(["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  const qc = useQueryClient();

  const [openSession, setOpenSession] = useState(false);
  const [openTerm, setOpenTerm] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [termName, setTermName] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<{
    type: "session" | "term";
    id: string;
    sessionId?: string;
  } | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data } = await api.get("/sessions");
      return data.data as any[];
    },
  });

  // Create session
  const createSession = useMutation({
    mutationFn: () => api.post("/sessions", { name: sessionName }),
    onSuccess: () => {
      toast.success("Session created!");
      qc.invalidateQueries({ queryKey: ["sessions"] });
      setOpenSession(false);
      setSessionName("");
    },

    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  // Activate session
  const activateSession = useMutation({
    mutationFn: (id: string) => api.post(`/sessions/${id}/activate`),
    onSuccess: () => {
      toast.success("Session activated!");
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  // Create term
  const createTerm = useMutation({
    mutationFn: () =>
      api.post(`/sessions/${activeSessionId}/terms`, { name: termName }),
    onSuccess: () => {
      toast.success("Term created!");
      qc.invalidateQueries({ queryKey: ["sessions"] });
      setOpenTerm(false);
      setTermName("");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  // Activate term
  const activateTerm = useMutation({
    mutationFn: ({
      sessionId,
      termId,
    }: {
      sessionId: string;
      termId: string;
    }) => api.post(`/sessions/${sessionId}/terms/${termId}/activate`),
    onSuccess: (_, vars) => {
      toast.success("Term activated!");
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  // Delete session
  const deleteSession = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}`),
    onSuccess: () => {
      toast.success("Session deleted");
      qc.invalidateQueries({ queryKey: ["sessions"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  // Delete term
  const deleteTerm = useMutation({
    mutationFn: ({
      sessionId,
      termId,
    }: {
      sessionId: string;
      termId: string;
    }) => api.delete(`/sessions/${sessionId}/terms/${termId}`),
    onSuccess: () => {
      toast.success("Term deleted");
      qc.invalidateQueries({ queryKey: ["sessions"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  return (
    <div>
      <Header
        title="Sessions & Terms"
        subtitle="Manage academic years and terms"
      />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-500">
            {sessions?.length ?? 0} session(s) created
          </p>
          <Button
            onClick={() => setOpenSession(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" /> New Session
          </Button>
        </div>

        {/* Sessions List */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 bg-slate-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        )}

        {!isLoading && sessions?.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-600">No sessions yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Create your first academic session (e.g. 2025/2026)
              </p>
            </CardContent>
          </Card>
        )}

        {sessions?.map((session: any) => (
          <Card
            key={session.id}
            className={cn(
              "overflow-hidden transition-all",
              session.isActive && "border-blue-400 shadow-md shadow-blue-100",
            )}
          >
            {/* Session Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setExpandedId(expandedId === session.id ? null : session.id)
                  }
                  className="text-slate-400 hover:text-slate-600"
                >
                  {expandedId === session.id ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
                <CalendarDays
                  className={cn(
                    "w-5 h-5",
                    session.isActive ? "text-blue-600" : "text-slate-400",
                  )}
                />
                <div>
                  <p className="font-bold text-slate-800">
                    {session.name} Academic Session
                  </p>
                  <p className="text-xs text-slate-400">
                    {session.totalTerms} term(s) created
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {session.isActive ? (
                  <Badge className="bg-green-100 text-green-700 border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => activateSession.mutate(session.id)}
                    disabled={activateSession.isPending}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Activate
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-red-500"
                  onClick={() =>
                    setDeleteId({ type: "session", id: session.id })
                  }
                  disabled={session.isActive}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Terms (expanded) */}
            {expandedId === session.id && (
              <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-600">Terms</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setOpenTerm(true);
                    }}
                  >
                    <Plus className="w-3 h-3" /> Add Term
                  </Button>
                </div>

                {session.terms.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-3">
                    No terms yet. Add the 1st term to get started.
                  </p>
                )}

                {session.terms.map((term: any) => (
                  <div
                    key={term.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg bg-white border",
                      term.isActive
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          term.isActive ? "bg-blue-500" : "bg-slate-300",
                        )}
                      />
                      <span className="text-sm font-medium text-slate-700">
                        {TERM_LABELS[term.name]}
                      </span>
                      {term.isActive && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                          Current Term
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!term.isActive && session.isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-blue-600 hover:bg-blue-50 h-7"
                          onClick={() =>
                            activateTerm.mutate({
                              sessionId: session.id,
                              termId: term.id,
                            })
                          }
                          disabled={activateTerm.isPending}
                        >
                          <Zap className="w-3 h-3 mr-1" /> Activate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-300 hover:text-red-400 h-7 w-7 p-0"
                        onClick={() =>
                          setDeleteId({
                            type: "term",
                            id: term.id,
                            sessionId: session.id,
                          })
                        }
                        disabled={term.isActive}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Create Session Dialog */}
      <Dialog open={openSession} onOpenChange={setOpenSession}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Academic Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Session Name</Label>
            <Input
              placeholder="e.g. 2025/2026"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              Format: YYYY/YYYY (e.g. 2025/2026)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSession(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createSession.mutate()}
              disabled={!sessionName || createSession.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createSession.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Session"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Term Dialog */}
      <Dialog open={openTerm} onOpenChange={setOpenTerm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Term</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Term</Label>
            <Select onValueChange={setTermName}>
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIRST">1st Term</SelectItem>
                <SelectItem value="SECOND">2nd Term</SelectItem>
                <SelectItem value="THIRD">3rd Term</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTerm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTerm.mutate()}
              disabled={!termName || createTerm.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createTerm.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Term"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteId?.type === "session" ? "Session" : "Term"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All related data will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (!deleteId) return;
                if (deleteId.type === "session") {
                  deleteSession.mutate(deleteId.id);
                } else {
                  deleteTerm.mutate({
                    sessionId: deleteId.sessionId!,
                    termId: deleteId.id,
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
