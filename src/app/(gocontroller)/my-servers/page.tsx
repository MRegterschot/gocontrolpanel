"use client";
import MyServers from "@/components/tournaments/servers/my-servers";

export default function MyServersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">My Servers</h1>
        <h4 className="text-muted-foreground">
          Verify your servers and see which competitions they are lent to. Lend a server from the competition page.
        </h4>
      </div>
      <MyServers />
    </div>
  );
}
