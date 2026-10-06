export default function Page() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex gap-2 justify-between items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Welcome to GoControlPanel</h1>
          <h4 className="text-muted-foreground">
            This is an admin dashboard where you can manage your servers.
          </h4>
        </div>
      </div>
    </div>
  );
}
