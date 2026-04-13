import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero panel">
        <p className="chip">Bidfax + MaxBid MVP</p>
        <h1>Buy Smarter Before Auction Day</h1>
        <p>
          Check VIN history in seconds and calculate a safe maximum bid before you enter Copart or IAAI
          auctions.
        </p>
        <div className="actions">
          <Link href="/search" className="button">
            Open VIN Search
          </Link>
          <Link href="/ingestion" className="button">
            Open Ingestion Admin
          </Link>
        </div>
      </section>

      <section className="stats">
        <article className="panel statCard">
          <p className="label">Signal</p>
          <h3>VIN Trail</h3>
          <p>Lot history, sold status, and auction timeline in one place.</p>
        </article>
        <article className="panel statCard">
          <p className="label">Decision</p>
          <h3>Safe Max Bid</h3>
          <p>Know your ceiling price before placing the first bid.</p>
        </article>
        <article className="panel statCard">
          <p className="label">Output</p>
          <h3>Broker Report</h3>
          <p>Turn checks into a client-ready summary and move faster.</p>
        </article>
      </section>
    </main>
  );
}
