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

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  motto: z.string().optional().nullable(),
});

const settingsSchema = z.object({
  termName: z.enum(["Term", "Semester"]),
  resultPin: z.boolean(),
  showPosition: z.boolean(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  useRequireAuth(["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["school-profile"],
    queryFn: async () => {
      const { data } = await api.get("/school/profile");
      return data.data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["school-settings"],
    queryFn: async () => {
      const { data } = await api.get("/school/settings");
      return data.data;
    },
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    if (profile) profileForm.reset(profile);
  }, [profile]);

  useEffect(() => {
    if (settings) settingsForm.reset(settings);
  }, [settings]);

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

  /**
   * Add this query inside the component to fetch existing signatures
   */
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

  /**
   * Add signature state
   */
  const [sigPreviews, setSigPreviews] = useState<{
    teacherSignature?: string | null;
    schoolSeal?: string | null;
    principalSignature?: string | null;
  }>({});

  const saveSigs = useMutation({
    mutationFn: (data: typeof sigPreviews) =>
      api.put("/school/signatures", data),
    onSuccess: () => {
      toast.success(
        "Signature images saved! They will now appear on all result PDFs.",
      );
      refetchSigs();
      setSigPreviews({});
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Failed to save signatures"),
  });

  /**
   * Converts a File to base64 data URL
   */
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Add "Signatures" as a third tab in the Tabs component:
   */

  return (
    <div>
      <Header
        title="School Settings"
        subtitle="Manage your school configuration"
      />

      <div className="p-6 max-w-2xl">
        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="gap-2">
              <Building2 className="w-4 h-4" /> School Profile
            </TabsTrigger>

            <TabsTrigger value="settings" className="gap-2">
              <Settings2 className="w-4 h-4" /> Preferences
            </TabsTrigger>

            <TabsTrigger value="signatures" className="gap-2">
              <Upload className="w-4 h-4" /> Signatures & Seal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signatures">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Result Sheet Signatures
                </CardTitle>
                <CardDescription>
                  Upload images that will automatically appear on all result
                  PDFs. Accepted formats: PNG, JPEG. Max size: 500KB each.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ── Three upload slots ──────────────────── */}
                {[
                  {
                    key: "teacherSignature" as const,
                    label: "Class Teacher's Signature",
                    desc: "Teacher's handwritten signature",
                  },
                  {
                    key: "schoolSeal" as const,
                    label: "School Seal / Stamp",
                    desc: "Official circular school stamp",
                  },
                  {
                    key: "principalSignature" as const,
                    label: "Principal's Signature",
                    desc: "Principal's handwritten signature",
                  },
                ].map((slot) => {
                  // ── Current preview: newly uploaded or saved ─
                  const currentImage =
                    sigPreviews[slot.key] ?? sigData?.[slot.key] ?? null;

                  return (
                    <div key={slot.key} className="space-y-2">
                      <Label>{slot.label}</Label>
                      <p className="text-xs text-slate-400">{slot.desc}</p>

                      <div className="flex items-start gap-4">
                        {/* ── Preview box ──────────────────── */}
                        <div className="w-32 h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
                          {currentImage ? (
                            <img
                              src={currentImage}
                              alt={slot.label}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <p className="text-xs text-slate-400 text-center px-2">
                              No image uploaded
                            </p>
                          )}
                        </div>

                        {/* ── Upload & Clear buttons ────────── */}
                        <div className="space-y-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                // ── Client-side size check ─────
                                if (file.size > 500 * 1024) {
                                  toast.error(
                                    "Image too large. Please use an image under 500KB.",
                                  );
                                  return;
                                }

                                try {
                                  const base64 = await fileToBase64(file);
                                  setSigPreviews((prev) => ({
                                    ...prev,
                                    [slot.key]: base64,
                                  }));
                                  toast.info(
                                    `${slot.label} ready. Click Save to apply.`,
                                  );
                                } catch {
                                  toast.error("Failed to read image file.");
                                }

                                // ── Reset input so same file can be re-selected ─
                                e.target.value = "";
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2 pointer-events-none"
                              asChild
                            >
                              <span>
                                <Upload className="w-3.5 h-3.5" />
                                {currentImage ? "Replace" : "Upload"}
                              </span>
                            </Button>
                          </label>

                          {/* ── Clear button — only if image exists ─ */}
                          {currentImage && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-red-500 hover:text-red-700 hover:bg-red-50"
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

                {/* ── Save button ─────────────────────────── */}
                <div className="pt-2 border-t border-slate-200">
                  <Button
                    onClick={() => saveSigs.mutate(sigPreviews)}
                    disabled={
                      saveSigs.isPending ||
                      Object.keys(sigPreviews).length === 0
                    }
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
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
                    Once saved, signatures will automatically appear on all
                    result PDFs generated for your school.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
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
                  <div className="space-y-1.5">
                    <Label>School Name</Label>
                    <Input {...profileForm.register("name")} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                        placeholder="https://yourschool.edu.ng"
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
                    className="bg-blue-600 hover:bg-blue-700"
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

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
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
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">
                        Require Scratch Card for Results
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Students must use a PIN to access their results
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.watch("resultPin")}
                      onCheckedChange={(v) =>
                        settingsForm.setValue("resultPin", v)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">
                        Show Class Position on Result
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Display student ranking on result sheets
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.watch("showPosition")}
                      onCheckedChange={(v) =>
                        settingsForm.setValue("showPosition", v)
                      }
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={updateSettings.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
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
        </Tabs>
      </div>
    </div>
  );
}
