import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">
        That page doesn&apos;t exist.
      </p>
      <Link href="/home">
        <Button className="mt-4">Back to home</Button>
      </Link>
    </div>
  );
}
