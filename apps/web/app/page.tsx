import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>Car Import MVP</h1>
      <p>Search VIN history and estimate a safe max bid.</p>
      <Link href="/search" className="button">
        Open VIN Search
      </Link>
    </main>
  );
}
