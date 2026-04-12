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
    <main className="container">
      <h1>VIN Search</h1>
      <form onSubmit={onSubmit} className="panel">
        <label htmlFor="vin">VIN</label>
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
          {loading ? "Loading..." : "Search"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {search && (
        <section className="panel">
          <h2>Search Result</h2>
          <p>VIN: {search.vin}</p>
          <p>Lots found: {search.lots_found}</p>
          <p>Latest status: {search.latest_status}</p>
        </section>
      )}

      {vehicle && (
        <section className="panel">
          <h2>Vehicle Card</h2>
          <p>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
          <p>Title brand: {vehicle.title_brand}</p>

          <h3>Lots</h3>
          <ul>
            {vehicle.lots.map((lot) => (
              <li key={`${lot.source}-${lot.lot_number}`}>
                {lot.source} #{lot.lot_number} | {lot.sale_date} | ${lot.hammer_price_usd} | {lot.status}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
