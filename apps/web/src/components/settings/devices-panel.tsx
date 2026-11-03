import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@Biz4kit/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DeviceList } from "@/components/auth/device-list";
import type { DeviceRow } from "@/components/auth/device-list";
import { authClient } from "@/lib/auth-client";
import { deviceLabel } from "@/lib/device-label";

const SESSIONS_KEY = ["auth", "sessions"] as const;

// Signed-in devices: the user's Better Auth sessions, each revocable except this one.
export function DevicesPanel() {
  const queryClient = useQueryClient();
  const current = authClient.useSession();

  const sessions = useQuery({
    queryFn: async () => {
      const { data, error } = await authClient.listSessions();
      if (error) {
        throw new Error(error.message ?? "Could not load devices.");
      }
      return data;
    },
    queryKey: SESSIONS_KEY,
  });

  const revoke = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await authClient.revokeSession({ token });
      if (error) {
        throw new Error(error.message ?? "Could not sign out that device.");
      }
    },
    onError: (error) => toast.error(error.message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });

  const currentToken = current.data?.session.token;
  const devices: DeviceRow[] = (sessions.data ?? []).map((s) => ({
    current: s.token === currentToken,
    id: s.token,
    lastActive: new Date(s.updatedAt).toISOString(),
    ...deviceLabel(s.userAgent),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signed-in devices</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.error ? (
          <p className="text-destructive" role="alert">
            {sessions.error.message}
          </p>
        ) : (
          <DeviceList
            devices={devices}
            onRevoke={(token) => revoke.mutate(token)}
            revokingId={revoke.variables}
          />
        )}
      </CardContent>
    </Card>
  );
}
