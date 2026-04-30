import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/lib/queries.js";

export function NotificationsBell() {
  const { data: notifs = [] } = useNotifications(true);
  const count = notifs.length;

  return (
    <Link
      to="/notifications"
      className="relative p-2 hover:bg-bg rounded-[4px]"
      title="Notifications"
    >
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
