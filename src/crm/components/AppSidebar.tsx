import {
  LayoutDashboard,
  Megaphone,
  Users,
  FileText,
  Mail,
  Settings,
  LogOut,
  PhoneCall,
  BarChart3,
} from "lucide-react";
import { NavLink } from "@/crm/components/NavLink";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/crm/integrations/supabase/client";
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
  useSidebar,
} from "@/crm/components/ui/sidebar";
import { Button } from "@/crm/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/crm", icon: LayoutDashboard },
  { title: "File d'appels", url: "/crm/call-queue", icon: PhoneCall },
  { title: "Campagnes", url: "/crm/campaigns", icon: Megaphone },
  { title: "Prospects", url: "/crm/prospects", icon: Users },
  { title: "Scripts", url: "/crm/scripts", icon: FileText },
  { title: "Emails", url: "/crm/emails", icon: Mail },
  { title: "Analytics", url: "/crm/analytics", icon: BarChart3 },
  { title: "Paramètres", url: "/crm/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/crm/login");
  };

  const handleNavClick = () => {
    // Close mobile sidebar on navigation
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-primary font-bold text-lg tracking-tight mb-2">
            {!collapsed && "Bulbiz Sales"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      onClick={handleNavClick}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Déconnexion"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
