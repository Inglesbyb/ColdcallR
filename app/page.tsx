import { redirect } from "next/navigation";

export default function RootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  void searchParams; // consumed by Next.js but redirect doesn't need it
  redirect("/list");
}
