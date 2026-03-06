import { useToast } from "@/components/ui/use-toast";
import { Toast } from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex max-h-screen w-full flex-col gap-2 sm:bottom-4 sm:top-auto md:max-w-[420px]">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast
            key={id}
            title={title}
            description={description}
            variant={props.variant}
            onClose={() => dismiss(id)}
          />
        );
      })}
    </div>
  );
}
