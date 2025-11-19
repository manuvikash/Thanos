import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Table, ChevronRight, FileCode, LogOut, Home } from 'lucide-react'
import { signOut } from 'aws-amplify/auth'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ROUTES, isDashboardRoute } from '@/routes'

interface NavigationItem {
  title: string
  url: string
  icon?: React.ComponentType<{ className?: string }>
  items?: NavigationItem[]
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Home',
    url: ROUTES.ROOT,
    icon: Home,
  },
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    items: [
      {
        title: 'Overview Metrics',
        url: ROUTES.DASHBOARD.OVERVIEW_METRICS,
      },
      {
        title: 'Severity Distribution',
        url: ROUTES.DASHBOARD.SEVERITY_DISTRIBUTION,
      },
      {
        title: 'Top Failing Rules',
        url: ROUTES.DASHBOARD.TOP_FAILING_RULES,
      },
      {
        title: 'Findings Timeline',
        url: ROUTES.DASHBOARD.FINDINGS_TIMELINE,
      },
    ],
  },
  {
    title: 'Findings Table',
    url: ROUTES.FINDINGS,
    icon: Table,
  },
  {
    title: 'Rules',
    url: ROUTES.RULES,
    icon: FileCode,
  },
]

export const AppSidebar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  // Manage expanded state for collapsible items
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('sidebar-expanded-items')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse sidebar expansion state:', e)
        return {}
      }
    }
    return {}
  })

  // Auto-expand Dashboard parent if navigating to a dashboard child route
  React.useEffect(() => {
    if (isDashboardRoute(location.pathname)) {
      setExpandedItems((prev) => {
        const newState = { ...prev, dashboard: true }
        localStorage.setItem('sidebar-expanded-items', JSON.stringify(newState))
        return newState
      })
    }
  }, [location.pathname])

  // Persist expansion state to localStorage
  const handleToggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const newState = { ...prev, [itemId]: !prev[itemId] }
      localStorage.setItem('sidebar-expanded-items', JSON.stringify(newState))
      return newState
    })
  }

  const isItemActive = (item: NavigationItem): boolean => {
    if (item.items) {
      // Parent is active if any child is active
      return item.items.some((child) => location.pathname === child.url)
    }
    return location.pathname === item.url
  }

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar backdrop-blur-sm">
      <SidebarContent className="pt-20">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon
                const itemId = item.title.toLowerCase().replace(/\s+/g, '-')
                const isActive = isItemActive(item)
                const isExpanded = expandedItems[itemId] ?? false

                if (item.items) {
                  // Collapsible parent item with children
                  return (
                    <Collapsible
                      key={item.title}
                      open={isExpanded}
                      onOpenChange={() => handleToggleExpand(itemId)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={isActive}
                            className="w-full"
                          >
                            {Icon && <Icon className="h-4 w-4" />}
                            <span>{item.title}</span>
                            <ChevronRight
                              className={`ml-auto h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''
                                }`}
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={location.pathname === subItem.url}
                                >
                                  <a
                                    href={subItem.url}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      navigate(subItem.url)
                                    }}
                                  >
                                    <span>{subItem.title}</span>
                                  </a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                }

                // Regular menu item without children
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                    >
                      <a
                        href={item.url}
                        onClick={(e) => {
                          e.preventDefault()
                          navigate(item.url)
                        }}
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                try {
                  await signOut()
                  navigate(ROUTES.ROOT)
                } catch (error) {
                  console.error('Error signing out: ', error)
                }
              }}
              tooltip="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
