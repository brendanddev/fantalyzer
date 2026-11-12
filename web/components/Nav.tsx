import Link from "next/link";

export default function Nav() {
    return (
        <nav>
            <Link href="/">Dashboard</Link>
            <Link href="/league">League</Link>
            <Link href="/rosters">Rosters</Link>
            <Link href="/waiver">Waiver Wire</Link>
        </nav>
    );
}
