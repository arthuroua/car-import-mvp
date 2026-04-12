"use client";

import { useState } from "react";

type SearchResponse = {
  vin: string;
  lots_found: number;
  latest_status: string;
};

type VehicleResponse = {
  vin: string;
  make: string;
  model: string;
  year: number;
  title_brand: string;
  lots: Array<{
    source: string;
    lot_number: string;
    sale_date: string;
    hammer_price_usd: number;
    status: string;
    location: string;
  }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function SearchPage() {
  const [vin, setVin] = useState("1HGCM82633A004352");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState<SearchResponse | null>(null);
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSearch(null);
    setVehicle(null);

    try {
      const normalizedVin = vin.trim().toUpperCase();

      const sRes = await fetch(`${API_BASE}/api/v1/search?vin=${normalizedVin}`);
      if (!sRes.ok) throw new Error("VIN not found");
      const sJson = (await sRes.json()) as SearchResponse;
      setSearch(sJson);

      const vRes = await fetch(`${API_BASE}/api/v1/vehicles/${normalizedVin}`);
      if (!vRes.ok) throw new Error("Vehicle card not available");
      const vJson = (await vRes.json()) as VehicleResponse;
      setVehicle(vJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="panel">
        <p className="chip">VIN Intelligence</p>
        <h1>VIN Search</h1>
        <p className="lead">Enter a 17-character VIN to load auction history and sold-price trail.</p>

        <form onSubmit={onSubmit} className="searchForm">
          <label htmlFor="vin">VIN</label>
          <div className="searchRow">
            <input
              id="vin"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="Enter 17-char VIN"
              minLength={17}
              maxLength={17}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Loading" : "Search"}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <section className="panel errorPanel">
          <p>{error}</p>
        </section>
      )}

      {search && (
        <section className="stats">
          <article className="panel statCard">
            <p className="label">VIN</p>
            <h3>{search.vin}</h3>
          </article>
          <article className="panel statCard">
            <p className="label">Lots Found</p>
            <h3>{search.lots_found}</h3>
          </article>
          <article className="panel statCard">
            <p className="label">Latest Status</p>
            <h3>{search.latest_status}</h3>
          </article>
        </section>
      )}

      {vehicle && (
        <section className="panel">
          <p className="label">Vehicle Card</p>
          <h2>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h2>
          <p className="lead">Title brand: {vehicle.title_brand}</p>

          <div className="lotsGrid">
            {vehicle.lots.map((lot) => (
              <article key={`${lot.source}-${lot.lot_number}`} className="lotCard">
                <p className="label">{lot.source}</p>
                <h3>Lot #{lot.lot_number}</h3>
                <p>Date: {lot.sale_date}</p>
                <p>Price: ${lot.hammer_price_usd}</p>
                <p>Status: {lot.status}</p>
                <p>Location: {lot.location}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
