"use client";
{
  /* @/app/(dashboard)/dashboard/scratch-cards/page.tsx */
}
// This page allows school admins to generate and manage scratch cards used for result access. It includes a table of scratch cards with search and pagination, as well as actions to add, edit, and delete scratch cards.

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import api from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  CreditCard,
  Loader2,
  Plus,
  RefreshCw,
  ShieldOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Define styles for different card statuses
const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  EXHAUSTED: "bg-red-100 text-red-700",
  DISABLED: "bg-slate-100 text-slate-500",
};

// Main component for the Scratch Cards page
export default function ScratchCardsPage() {
  useRequireAuth(["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  const qc = useQueryClient();

  const [genDialog, setGenDialog] = useState(false);
  const [quantity, setQuantity] = useState("10");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [copiedPin, setCopiedPin] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["scratch-cards", page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const { data } = await api.get(`/scratch-cards?${params}`);
      return data.data;
    },
  });

  // Mutation to generate new scratch cards
  const generate = useMutation({
    mutationFn: () =>
      api.post("/scratch-cards", { quantity: parseInt(quantity) }),
    onSuccess: (res) => {
      toast.success(`${res.data.data.generated} cards generated!`);
      qc.invalidateQueries({ queryKey: ["scratch-cards"] });
      setGenDialog(false);
      setQuantity("10");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  const disableCards = useMutation({
    mutationFn: () =>
      api.post("/scratch-cards/disable", { cardIds: selectedIds }),
    onSuccess: (res) => {
      toast.success(`${res.data.data.disabledCount} card(s) disabled`);
      qc.invalidateQueries({ queryKey: ["scratch-cards"] });
      setSelectedIds([]);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  // Function to copy the PIN to clipboard and show a success message
  function copyPin(pin: string) {
    navigator.clipboard.writeText(pin);
    setCopiedPin(pin);
    toast.success("PIN copied!");
    setTimeout(() => setCopiedPin(null), 2000);
  }

  // Function to toggle selection of a card for bulk actions
  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  // Render the Scratch Cards management page
  return (
    <div>
      <Header
        title="Scratch Cards"
        subtitle="Generate and manage result access PINs"
      />

      <div className="p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            title="Active Cards"
            value={data?.summary?.active ?? 0}
            icon={CreditCard}
            color="green"
            sub="Ready to use"
          />
          <StatCard
            title="Exhausted"
            value={data?.summary?.exhausted ?? 0}
            icon={RefreshCw}
            color="orange"
            sub="All 4 uses consumed"
          />
          <StatCard
            title="Disabled"
            value={data?.summary?.disabled ?? 0}
            icon={ShieldOff}
            color="red"
            sub="Manually disabled"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cards</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="EXHAUSTED">Exhausted</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
            </SelectContent>
          </Select>

          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => disableCards.mutate()}
              disabled={disableCards.isPending}
            >
              <ShieldOff className="w-4 h-4" />
              Disable {selectedIds.length} Selected
            </Button>
          )}

          <div className="ml-auto">
            <Button
              onClick={() => setGenDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <Plus className="w-4 h-4" /> Generate Cards
            </Button>
          </div>
        </div>

        {/* Cards Table */}
        <ResponsiveTable>
          <div className="bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-10">
                    <Input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer"
                      checked={
                        data?.cards?.length > 0 &&
                        selectedIds.length === data?.cards?.length
                      }
                      onChange={(e) =>
                        setSelectedIds(
                          e.target.checked
                            ? (data?.cards?.map((c: any) => c.id) ?? [])
                            : [],
                        )
                      }
                    />
                  </TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>PIN</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array(8)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        {Array(7)
                          .fill(0)
                          .map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}

                {!isLoading && data?.cards?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 font-medium">
                        No cards found
                      </p>
                      <p className="text-slate-400 text-sm">
                        Generate cards to get started
                      </p>
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  data?.cards?.map((card: any) => (
                    <TableRow
                      key={card.id}
                      className={cn(
                        "hover:bg-slate-50",
                        selectedIds.includes(card.id) && "bg-blue-50",
                      )}
                    >
                      <TableCell>
                        <Input
                          type="checkbox"
                          className="w-4 h-4 cursor-pointer"
                          checked={selectedIds.includes(card.id)}
                          onChange={() => toggleSelect(card.id)}
                          disabled={card.status !== "ACTIVE"}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {card.serial}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold tracking-widest text-slate-800">
                            {card.pin.replace(/(.{4})/g, "$1 ").trim()}
                          </span>
                          <button
                            onClick={() => copyPin(card.pin)}
                            className="text-slate-400 hover:text-blue-500 transition-colors"
                          >
                            {copiedPin === card.pin ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {card.session?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {Array(4)
                            .fill(0)
                            .map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-2.5 h-2.5 rounded-full",
                                  i < card.usageCount
                                    ? "bg-blue-500"
                                    : "bg-slate-200",
                                )}
                              />
                            ))}
                          <span className="text-xs text-slate-400 ml-1">
                            {card.usageCount}/{card.maxUses}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-xs font-semibold px-2 py-1 rounded-full",
                            STATUS_STYLES[card.status],
                          )}
                        >
                          {card.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {new Date(card.createdAt).toLocaleDateString("en-GB")}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </ResponsiveTable>
        {/* Table Footer */}

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Dialog */}
      <Dialog open={genDialog} onOpenChange={setGenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Scratch Cards</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Number of Cards</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <p className="text-xs text-slate-400">
                Max 500 per batch. Each card has 4 uses and is locked to the
                current session.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-blue-700">
                How Scratch Cards Work:
              </p>
              <ul className="text-xs text-blue-600 space-y-0.5 list-disc list-inside">
                <li>Each card has 4 uses across all 3 terms</li>
                <li>After 4 uses, card becomes exhausted</li>
                <li>Cards are locked to the current academic session</li>
                <li>Old session cards cannot check new session results</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => generate.mutate()}
              disabled={
                !quantity || parseInt(quantity) < 1 || generate.isPending
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generate.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                `Generate ${quantity} Cards`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
