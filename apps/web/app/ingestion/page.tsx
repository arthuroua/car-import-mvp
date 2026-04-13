"use client";

import Link from "next/link";
import { useState } from "react";

type IngestionForm = {
  source: string;
  vin: string;
  lot_number: string;
  sale_date: string;
  hammer_price_usd: string;
  status: string;
  location: string;
  images_csv: string;
  event_type: string;
  old_value: string;
  new_value: string;
  event_time: string;
};

type IngestionEnqueueResponse = {
  accepted: boolean;
  queue_depth: number;
};

type IngestionQueueDepth = {
  queue_depth: number;
};

type IngestionProcessResult = {
  processed: boolean;
  message: string;
  lot_id?: string | null;
  vin?: string | null;
  source?: string | null;
  lot_number?: string | null;
  images_upserted: number;
  price_events_added: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const DEFAULT_FORM: IngestionForm = {
  source: "Copart",
  vin: "2HGFC2F59JH000001",
  lot_number: "A1002003",
  sale_date: "2026-04-13",
  hammer_price_usd: "7400",
  status: "Sold",
  location: "FL - Miami",
  images_csv: "https://img.example/a.jpg, https://img.example/b.jpg",
  event_type: "sold_price",
  old_value: "7000",
  new_value: "7400",
  event_time: "2026-04-13T09:00:00Z"
};

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default function IngestionPage() {
  const [form, setForm] = useState<IngestionForm>(DEFAULT_FORM);
  const [loadingEnqueue, setLoadingEnqueue] = useState(false);
  const [loadingDepth, setLoadingDepth] = useState(false);
  const [loadingProcess, setLoadingProcess] = useState(false);

  const [error, setError] = useState("");
  const [enqueueResult, setEnqueueResult] = useState<IngestionEnqueueResponse | null>(null);
  const [depthResult, setDepthResult] = useState<IngestionQueueDepth | null>(null);
  const [processResult, setProcessResult] = useState<IngestionProcessResult | null>(null);

  function setField<K extends keyof IngestionForm>(key: K, value: IngestionForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function enqueueJob(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnqueueResult(null);

    const payload: Record<string, unknown> = {
      source: form.source.trim(),
      vin: form.vin.trim().toUpperCase(),
      lot_number: form.lot_number.trim(),
      sale_date: form.sale_date || null,
      hammer_price_usd: form.hammer_price_usd ? Number(form.hammer_price_usd) : null,
      status: form.status || null,
      location: form.location || null,
      images: parseCsv(form.images_csv),
      price_events: []
    };

    if (form.event_type.trim() && form.new_value.trim() && form.event_time.trim()) {
      payload.price_events = [
        {
          event_type: form.event_type.trim(),
          old_value: form.old_value.trim() || null,
          new_value: form.new_value.trim(),
          event_time: form.event_time.trim()
        }
      ];
    }

    setLoadingEnqueue(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ingestion/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to enqueue job");
      const json = (await res.json()) as IngestionEnqueueResponse;
      setEnqueueResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoadingEnqueue(false);
    }
  }

  async function checkQueueDepth() {
    setError("");
    setDepthResult(null);
    setLoadingDepth(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ingestion/queue-depth`);
      if (!res.ok) throw new Error("Failed to fetch queue depth");
      const json = (await res.json()) as IngestionQueueDepth;
      setDepthResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoadingDepth(false);
    }
  }

  async function processOne() {
    setError("");
    setProcessResult(null);
    setLoadingProcess(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ingestion/process-one`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to process queue");
      const json = (await res.json()) as IngestionProcessResult;
      setProcessResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoadingProcess(false);
    }
  }

  return (
    <main className="shell">
      <section className="panel">
        <p className="chip">Ingestion Admin</p>
        <h1>Queue Control</h1>
        <p className="lead">Enqueue lot updates, inspect queue depth, and process ingestion jobs manually.</p>
        <div className="actions">
          <Link href="/search" className="button">
            Back to VIN Search
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>Enqueue Job</h2>
        <form className="ingestionForm" onSubmit={enqueueJob}>
          <label>
            Source
            <input value={form.source} onChange={(e) => setField("source", e.target.value)} required />
          </label>
          <label>
            VIN
            <input
              value={form.vin}
              onChange={(e) => setField("vin", e.target.value)}
              minLength={17}
              maxLength={17}
              required
            />
          </label>
          <label>
            Lot Number
            <input value={form.lot_number} onChange={(e) => setField("lot_number", e.target.value)} required />
          </label>
          <label>
            Sale Date
            <input type="date" value={form.sale_date} onChange={(e) => setField("sale_date", e.target.value)} />
          </label>
          <label>
            Hammer Price USD
            <input
              type="number"
              min={0}
              value={form.hammer_price_usd}
              onChange={(e) => setField("hammer_price_usd", e.target.value)}
            />
          </label>
          <label>
            Status
            <input value={form.status} onChange={(e) => setField("status", e.target.value)} />
          </label>
          <label className="fieldWide">
            Location
            <input value={form.location} onChange={(e) => setField("location", e.target.value)} />
          </label>
          <label className="fieldWide">
            Images CSV
            <input
              value={form.images_csv}
              onChange={(e) => setField("images_csv", e.target.value)}
              placeholder="https://img/a.jpg, https://img/b.jpg"
            />
          </label>

          <label>
            Event Type
            <input value={form.event_type} onChange={(e) => setField("event_type", e.target.value)} />
          </label>
          <label>
            Old Value
            <input value={form.old_value} onChange={(e) => setField("old_value", e.target.value)} />
          </label>
          <label>
            New Value
            <input value={form.new_value} onChange={(e) => setField("new_value", e.target.value)} />
          </label>
          <label>
            Event Time (ISO)
            <input
              value={form.event_time}
              onChange={(e) => setField("event_time", e.target.value)}
              placeholder="2026-04-13T09:00:00Z"
            />
          </label>

          <div className="advisorActions">
            <button type="submit" disabled={loadingEnqueue}>
              {loadingEnqueue ? "Enqueueing" : "Enqueue Job"}
            </button>
          </div>
        </form>

        {enqueueResult && (
          <div className="panel reportSaved">
            <p className="label">Enqueue Result</p>
            <p>Accepted: {String(enqueueResult.accepted)}</p>
            <p>Queue depth: {enqueueResult.queue_depth}</p>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Queue Tools</h2>
        <div className="actions">
          <button type="button" onClick={checkQueueDepth} disabled={loadingDepth}>
            {loadingDepth ? "Checking" : "Check Queue Depth"}
          </button>
          <button type="button" onClick={processOne} disabled={loadingProcess}>
            {loadingProcess ? "Processing" : "Process One"}
          </button>
        </div>

        {depthResult && (
          <div className="panel reportSaved">
            <p className="label">Queue Depth</p>
            <h3>{depthResult.queue_depth}</h3>
          </div>
        )}

        {processResult && (
          <div className="panel reportSaved">
            <p className="label">Process Result</p>
            <p>Processed: {String(processResult.processed)}</p>
            <p>Message: {processResult.message}</p>
            <p>VIN: {processResult.vin || "-"}</p>
            <p>Lot: {processResult.source && processResult.lot_number ? `${processResult.source} #${processResult.lot_number}` : "-"}</p>
            <p>Images upserted: {processResult.images_upserted}</p>
            <p>Price events added: {processResult.price_events_added}</p>
          </div>
        )}

        {error && (
          <div className="errorPanel inlineError">
            <p>{error}</p>
          </div>
        )}
      </section>
    </main>
  );
}
