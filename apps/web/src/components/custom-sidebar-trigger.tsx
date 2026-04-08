import { Kbd, KbdGroup } from "@codecity/ui/components/kbd";
import { SidebarTrigger } from "@codecity/ui/components/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@codecity/ui/components/tooltip";

export function CustomSidebarTrigger() {
	return (
		<Tooltip delayDuration={1000}>
			<TooltipTrigger asChild>
				<SidebarTrigger />
			</TooltipTrigger>
			<TooltipContent className="px-2 py-1" side="right">
				Toggle Sidebar{" "}
				<KbdGroup>
					<Kbd>⌘</Kbd>
					<Kbd>b</Kbd>
				</KbdGroup>
			</TooltipContent>
		</Tooltip>
	);
}
