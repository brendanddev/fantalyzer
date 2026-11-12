import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import NflStateBanner from "@/components/NflStateBanner";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
	title: "Fantalyzer",
	description: "Fantasy football analysis",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en">
			<body>
				<Nav />
				<NflStateBanner />
				{children}
				<Footer />
			</body>
		</html>
	);
}
