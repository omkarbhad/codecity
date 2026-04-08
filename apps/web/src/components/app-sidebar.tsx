"use client";

import { cn } from "@codecity/ui/lib/utils";
import { LogoIcon } from "@/components/logo";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@codecity/ui/components/sidebar";
import { LatestChange } from "@/components/latest-change";
import { LayoutGridIcon, BarChart3Icon, BriefcaseIcon, UsersIcon, PlugIcon, KeyRoundIcon, SettingsIcon, CreditCardIcon, HelpCircleIcon, BookOpenIcon } from "lucide-react";

export type SidebarNavItem = {
	title: string;
	url: string;
	icon: React.ReactNode;
	isActive?: boolean;
};

type SidebarSection = {
	label: string;
	items: SidebarNavItem[];
};

const navSections: SidebarSection[] = [
	{
		label: "Product",
		items: [
			{
				title: "Dashboard",
				url: "#",
				icon: (
					<LayoutGridIcon
					/>
				),
				isActive: true,
			},
			{
				title: "Analytics",
				url: "#",
				icon: (
					<BarChart3Icon
					/>
				),
			},
			{
				title: "Projects",
				url: "#",
				icon: (
					<BriefcaseIcon
					/>
				),
			},
		],
	},
	{
		label: "Workspace",
		items: [
			{
				title: "Team",
				url: "#",
				icon: (
					<UsersIcon
					/>
				),
			},
			{
				title: "Integrations",
				url: "#",
				icon: (
					<PlugIcon
					/>
				),
			},
			{
				title: "API Keys",
				url: "#",
				icon: (
					<KeyRoundIcon
					/>
				),
			},
		],
	},
	{
		label: "Administration",
		items: [
			{
				title: "Settings",
				url: "#",
				icon: (
					<SettingsIcon
					/>
				),
			},
			{
				title: "Billing",
				url: "#",
				icon: (
					<CreditCardIcon
					/>
				),
			},
		],
	},
];

const footerNavLinks: SidebarNavItem[] = [
	{
		title: "Help Center",
		url: "#",
		icon: (
			<HelpCircleIcon
			/>
		),
	},
	{
		title: "Documentation",
		url: "#",
		icon: (
			<BookOpenIcon
			/>
		),
	},
];

export function AppSidebar() {
	return (
		<Sidebar
			className={cn(
				"*:data-[slot=sidebar-inner]:bg-background",
				"*:data-[slot=sidebar-inner]:dark:bg-[radial-gradient(60%_18%_at_10%_0%,--theme(--color-foreground/.08),transparent)]",
				"**:data-[slot=sidebar-menu-button]:[&>span]:text-foreground/75"
			)}
			collapsible="icon"
			variant="sidebar"
		>
			<SidebarHeader className="h-14 justify-center border-b px-2">
				<SidebarMenuButton asChild>
					<a href="#link">
						<LogoIcon />
						<span className="font-medium text-foreground!">Efferd</span>
					</a>
				</SidebarMenuButton>
			</SidebarHeader>
			<SidebarContent>
				{navSections.map((section) => (
					<SidebarGroup key={section.label}>
						<SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
							{section.label}
						</SidebarGroupLabel>
						<SidebarMenu>
							{section.items.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										asChild
										isActive={item.isActive}
										tooltip={item.title}
									>
										<a href={item.url}>
											{item.icon}
											<span>{item.title}</span>
										</a>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroup>
				))}
			</SidebarContent>
			<SidebarFooter className="gap-0 p-0">
				<LatestChange />
				<SidebarMenu className="border-t p-2">
					{footerNavLinks.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								className="text-muted-foreground"
								isActive={item.isActive ?? false}
								size="sm"
							>
								<a href={item.url}>
									{item.icon}
									<span>{item.title}</span>
								</a>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
				<div className="px-4 pt-4 pb-2 transition-opacity group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0">
					<p className="text-nowrap text-[9px] text-muted-foreground">
						© {new Date().getFullYear()} Efferd LLC
					</p>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
