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
import { Building2, Loader2, Settings2 } from "lucide-react";
import { useEffect } from "react";
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
          </TabsList>

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
