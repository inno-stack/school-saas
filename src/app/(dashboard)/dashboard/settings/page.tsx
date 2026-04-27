/**
 * @file src/app/(dashboard)/dashboard/settings/page.tsx
 * @description School settings page — fully mobile responsive.
 * Three tabs: School Profile | Preferences | Signatures & Seal
 *
 * Mobile fixes:
 * - Tabs scroll horizontally on small screens
 * - Toggle switches properly sized and labeled
 * - Signature upload slots stack vertically on mobile
 * - Preview boxes scale correctly on all screen sizes
 */

"use client";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import api from "@/lib/api-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Loader2,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// ── Validation schemas ─────────────────────────────
const profileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  motto: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
});

const settingsSchema = z.object({
  termName: z.enum(["Term", "Semester"]),
  resultPin: z.boolean(),
  showPosition: z.boolean(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type SettingsForm = z.infer<typeof settingsSchema>;

// ── Signature slot config ──────────────────────────
const SIG_SLOTS = [
  {
    key: "teacherSignature" as const,
    label: "Class Teacher's Signature",
    desc: "Teacher's handwritten signature image",
  },
  {
    key: "schoolSeal" as const,
    label: "School Seal / Stamp",
    desc: "Official circular school stamp or seal",
  },
  {
    key: "principalSignature" as const,
    label: "Principal's Signature",
    desc: "Principal's handwritten signature image",
  },
] as const;

export default function SettingsPage() {
  useRequireAuth(["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  const qc = useQueryClient();

  // ── Signature state ────────────────────────────
  const [sigPreviews, setSigPreviews] = useState<{
    teacherSignature?: string | null;
    schoolSeal?: string | null;
    principalSignature?: string | null;
  }>({});
  /**
   * Add with other useState declarations
   */

  // ── Fetch school profile ───────────────────────
  const { data: profile } = useQuery({
    queryKey: ["school-profile"],
    queryFn: async () => {
      const { data } = await api.get("/school/profile");
      return data.data;
    },
  });

  // ── Fetch school settings ──────────────────────
  const { data: settings } = useQuery({
    queryKey: ["school-settings"],
    queryFn: async () => {
      const { data } = await api.get("/school/settings");
      return data.data;
    },
  });

  // ── Fetch signatures ───────────────────────────
  const { data: sigData, refetch: refetchSigs } = useQuery({
    queryKey: ["school-signatures"],
    queryFn: async () => {
      const { data } = await api.get("/school/signatures");
      return data.data as {
        teacherSignature: string | null;
        schoolSeal: string | null;
        principalSignature: string | null;
      };
    },
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
  });

  // ── Populate forms when data loads ────────────
  useEffect(() => {
    if (profile) profileForm.reset(profile);
  }, [profile]);

  useEffect(() => {
    if (settings) settingsForm.reset(settings);
  }, [settings]);

  // ── Mutations ──────────────────────────────────
  const updateProfile = useMutation({
    mutationFn: (v: ProfileForm) => api.put("/school/profile", v),
    onSuccess: () => {
      toast.success("Profile updated successfully");
      qc.invalidateQueries({ queryKey: ["school-profile"] });
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const updateSettings = useMutation({
    mutationFn: (v: SettingsForm) => api.put("/school/settings", v),
    onSuccess: () => {
      toast.success("Settings saved successfully");
      qc.invalidateQueries({ queryKey: ["school-settings"] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const saveSigs = useMutation({
    mutationFn: (data: typeof sigPreviews) =>
      api.put("/school/signatures", data),
    onSuccess: () => {
      toast.success("Signatures saved! They will appear on all result PDFs.");
      refetchSigs();
      setSigPreviews({});
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Failed to save"),
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // ── File → base64 converter ────────────────────
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return (
    <div>
      <Header
        title="School Settings"
        subtitle="Manage your school configuration"
      />

      <div className="p-4 lg:p-6 max-w-2xl">
        {/* ── Tabs — horizontally scrollable on mobile ── */}
        <Tabs defaultValue="profile">
          <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 mb-5">
            <TabsList className="w-max min-w-full flex">
              <TabsTrigger
                value="profile"
                className="gap-1.5 flex-1 text-xs lg:text-sm"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>School Profile</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="gap-1.5 flex-1 text-xs lg:text-sm"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Preferences</span>
              </TabsTrigger>
              <TabsTrigger
                value="signatures"
                className="gap-1.5 flex-1 text-xs lg:text-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Signatures</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ════════════════════════════════════════
              TAB 1: School Profile
          ════════════════════════════════════════ */}

          <TabsContent value="profile">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">School Profile</CardTitle>
                <CardDescription>
                  Update your school&apos;s public information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={profileForm.handleSubmit((v) =>
                    updateProfile.mutate(v),
                  )}
                  className="space-y-4"
                >
                  {/* ── School Logo Upload ────────────────── */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">School Logo</Label>
                    <p className="text-xs text-slate-400">
                      Appears on result PDFs. PNG or JPEG, max 500KB.
                    </p>

                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {/* Preview box */}
                      <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
                        {/* Show logo from form value (newly selected or existing) */}
                        {profileForm.watch("logo") ? (
                          <img
                            src={profileForm.watch("logo")!}
                            alt="School logo"
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="text-center">
                            <Building2 className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                            <p className="text-xs text-slate-400">No logo</p>
                          </div>
                        )}
                      </div>

                      {/* Buttons */}
                      <div className="flex flex-row sm:flex-col gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              // ── 500KB client-side guard ─────
                              if (file.size > 500 * 1024) {
                                toast.error(
                                  "Logo too large. Please use an image under 500KB.",
                                );
                                return;
                              }

                              try {
                                // ── Convert to base64 ──────────
                                const b64 = await new Promise<string>(
                                  (res, rej) => {
                                    const reader = new FileReader();
                                    reader.onload = () =>
                                      res(reader.result as string);
                                    reader.onerror = rej;
                                    reader.readAsDataURL(file);
                                  },
                                );

                                // ── Store in react-hook-form ───
                                // This ensures it's included when form submits
                                profileForm.setValue("logo", b64, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });

                                toast.info(
                                  "Logo selected — click Save Profile to apply.",
                                );
                              } catch {
                                toast.error("Failed to read logo file.");
                              }

                              // ── Reset input ────────────────
                              e.target.value = "";
                            }}
                          />
                          <span className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium border border-slate-300 rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            {profileForm.watch("logo")
                              ? "Replace Logo"
                              : "Upload Logo"}
                          </span>
                        </label>

                        {/* Remove button — only when logo is set */}
                        {profileForm.watch("logo") && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 h-9"
                            onClick={() =>
                              profileForm.setValue("logo", null, {
                                shouldDirty: true,
                              })
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── School Name ───────────────────────── */}
                  <div className="space-y-1.5">
                    <Label>School Name</Label>
                    <Input {...profileForm.register("name")} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Phone Number</Label>
                      <Input
                        placeholder="08012345678"
                        {...profileForm.register("phone")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Website</Label>
                      <Input
                        placeholder="https://school.edu.ng"
                        {...profileForm.register("website")}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Address</Label>
                    <Input
                      placeholder="School address"
                      {...profileForm.register("address")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>School Motto</Label>
                    <Input
                      placeholder="Excellence in Education"
                      {...profileForm.register("motto")}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={updateProfile.isPending}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                  >
                    {updateProfile.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Profile"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════
              TAB 2: Preferences
              Mobile fix: toggles use full-width rows
              with proper label/description layout
          ════════════════════════════════════════ */}
          <TabsContent value="settings">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Preferences</CardTitle>
                <CardDescription>
                  Control how your school system behaves
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={settingsForm.handleSubmit((v) =>
                    updateSettings.mutate(v),
                  )}
                  className="space-y-4"
                >
                  {/* Toggle 1 — Scratch Card */}
                  <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-slate-800 text-sm leading-tight">
                        Require Scratch Card for Results
                      </p>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">
                        Students must enter a PIN to access their results
                      </p>
                    </div>
                    {/* Switch — fixed size, won't shrink on mobile */}
                    <div className="flex-shrink-0 mt-0.5">
                      <Switch
                        checked={settingsForm.watch("resultPin")}
                        onCheckedChange={(v) =>
                          settingsForm.setValue("resultPin", v)
                        }
                      />
                    </div>
                  </div>

                  {/* Toggle 2 — Show Position */}
                  <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-slate-800 text-sm leading-tight">
                        Show Class Position on Result
                      </p>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">
                        Display student ranking on result sheets and PDFs
                      </p>
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      <Switch
                        checked={settingsForm.watch("showPosition")}
                        onCheckedChange={(v) =>
                          settingsForm.setValue("showPosition", v)
                        }
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={updateSettings.isPending}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                  >
                    {updateSettings.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════
              TAB 3: Signatures & Seal
              Mobile fix: stacks vertically,
              preview + buttons in column layout
          ════════════════════════════════════════ */}
          <TabsContent value="signatures">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Result Sheet Signatures
                </CardTitle>
                <CardDescription>
                  Upload images that automatically appear on all result PDFs.
                  PNG or JPEG, max 500KB each.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {SIG_SLOTS.map((slot) => {
                  const currentImage =
                    sigPreviews[slot.key] ?? sigData?.[slot.key] ?? null;

                  return (
                    <div
                      key={slot.key}
                      className="pb-5 border-b border-slate-200 last:border-0 last:pb-0"
                    >
                      {/* Label + description */}
                      <Label className="text-sm font-semibold">
                        {slot.label}
                      </Label>
                      <p className="text-xs text-slate-400 mt-0.5 mb-3">
                        {slot.desc}
                      </p>

                      {/* Preview + buttons — stacks on mobile */}
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* Preview box */}
                        <div className="w-full sm:w-36 h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
                          {currentImage ? (
                            <img
                              src={currentImage}
                              alt={slot.label}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <div className="text-center">
                              <Upload className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                              <p className="text-xs text-slate-400">No image</p>
                            </div>
                          )}
                        </div>

                        {/* Upload / Remove buttons */}
                        <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                          <label className="flex-1 sm:flex-none cursor-pointer">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                // ── 500KB client-side guard ────
                                if (file.size > 500 * 1024) {
                                  toast.error("Image too large. Max 500KB.");
                                  return;
                                }

                                try {
                                  const b64 = await fileToBase64(file);
                                  setSigPreviews((prev) => ({
                                    ...prev,
                                    [slot.key]: b64,
                                  }));
                                  toast.info(
                                    "Image ready — click Save to apply.",
                                  );
                                } catch {
                                  toast.error("Failed to read image.");
                                }
                                e.target.value = "";
                              }}
                            />
                            <span className="flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-medium border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors cursor-pointer w-full">
                              <Upload className="w-3.5 h-3.5" />
                              {currentImage ? "Replace" : "Upload"}
                            </span>
                          </label>

                          {currentImage && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="flex-1 sm:flex-none gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 h-9"
                              onClick={() =>
                                setSigPreviews((prev) => ({
                                  ...prev,
                                  [slot.key]: null,
                                }))
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Save button */}
                <div className="pt-2">
                  <Button
                    onClick={() => saveSigs.mutate(sigPreviews)}
                    disabled={
                      saveSigs.isPending ||
                      Object.keys(sigPreviews).length === 0
                    }
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    {saveSigs.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Save Signatures
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-slate-400 mt-2">
                    Signatures appear automatically on all result PDFs once
                    saved.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
