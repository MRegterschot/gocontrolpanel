import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconDeviceGamepad2, IconKey } from "@tabler/icons-react";

interface LoginFormProps {
  className?: string;
  handleLogin: () => void;
}

export function LoginForm({
  className,
  handleLogin,
  ...props
}: LoginFormProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md">
            <IconDeviceGamepad2 className="size-6" />
          </div>
          <h1 className="text-xl font-bold">Welcome to GoControlPanel</h1>
        </div>

        <Button className="w-full" onClick={handleLogin}>
          <IconKey />
          Login with Nadeo
        </Button>
      </div>
    </div>
  );
}
