import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Brain, ClipboardList, BarChart3, Upload, MessageSquare, Building2, LogOut, Settings, History, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const teacherMenuItems = [
  { title: "บันทึกหลังสอน", url: "/log", icon: ClipboardList },
  { title: "ประวัติการสอน", url: "/history", icon: History },
  { title: "สร้างแผนการสอน", url: "/lesson-plan", icon: BookOpen },
  { title: "อัปโหลด CSV", url: "/upload", icon: Upload },
  { title: "AI ที่ปรึกษา", url: "/consultant", icon: MessageSquare },
];

const directorMenuItems = [
  { title: "แดชบอร์ด", url: "/dashboard", icon: BarChart3 },
  { title: "ภาพรวมผู้บริหาร", url: "/executive", icon: Building2 },
  { title: "บันทึกหลังสอน", url: "/log", icon: ClipboardList },
  { title: "ประวัติการสอน", url: "/history", icon: History },
  { title: "สร้างแผนการสอน", url: "/lesson-plan", icon: BookOpen },
  { title: "อัปโหลด CSV", url: "/upload", icon: Upload },
  { title: "AI ที่ปรึกษา", url: "/consultant", icon: MessageSquare },
  { title: "Admin Settings", url: "/admin", icon: Settings },
];

export function AppSidebar() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = role === "director" ? directorMenuItems : teacherMenuItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-sidebar-foreground">ATLAS</h2>
            <p className="text-xs text-muted-foreground">Intelligence Platform</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>เมนูหลัก</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={location.pathname === item.url}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground mb-2 truncate">
          {user?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          ออกจากระบบ
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
