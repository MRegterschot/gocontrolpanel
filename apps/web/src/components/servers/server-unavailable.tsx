import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconServerOff } from "@tabler/icons-react";

// Shown instead of a server page when the dedicated server or the GBX service can't be reached
export default function ServerUnavailable({ error }: { error: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconServerOff className="size-5" />
          Server unavailable
        </CardTitle>
        <CardDescription className="flex flex-col gap-1">
          <span>{error}</span>
          <span>This page needs a connection to the server. Try again once it is back online.</span>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
