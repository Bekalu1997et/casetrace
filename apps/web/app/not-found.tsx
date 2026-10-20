import Link from "next/link";
export default function NotFound() {
  return <section className="space-y-4"><h1>Page not found</h1><Link href="/" className="text-primary underline">Return to overview</Link></section>;
}
