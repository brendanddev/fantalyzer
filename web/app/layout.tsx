import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Fantalyzer",
	description: "Fantasy football analysis",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
