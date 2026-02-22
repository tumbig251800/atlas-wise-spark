import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatFloatingButtonProps {
  onClick: () => void;
}

export function ChatFloatingButton({ onClick }: ChatFloatingButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg animate-pulse-glow bg-primary hover:bg-primary/90"
    >
      <MessageSquare className="h-6 w-6" />
    </Button>
  );
}
