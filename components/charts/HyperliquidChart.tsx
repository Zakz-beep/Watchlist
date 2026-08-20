"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartNoAxesCombined, Eraser, Loader2, Minus, MousePointer2, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IChartApi, MouseEventParams, Time } from "lightweight-charts";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface HorizontalDrawing {
  id: string;
  type: "horizontal";
  price: number;
}

interface TrendDrawing {
  id: string;
  type: "trend";
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
}

type ChartDrawing = HorizontalDrawing | TrendDrawing;
type DrawingTool = "cursor" | "horizontal" | "trend";

function drawingId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function fetchCandles(symbol: string, interval: string): Promise<Candle[]> {
  const response = await fetch(`/api/prices/hyperliquid/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}`);
  if (!response.ok) throw new Error("Could not load Hyperliquid candles");
  return response.json() as Promise<Candle[]>;
}

export function HyperliquidChart({ symbol, interval }: { symbol: string; interval: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<DrawingTool>("cursor");
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const pendingTrendPoint = useRef<{ time: number; price: number } | null>(null);
  const { data: candles = [], isLoading, error } = useQuery({
    queryKey: ["hyperliquid-candles", symbol, interval],
    queryFn: () => fetchCandles(symbol, interval),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    setDrawings([]);
    pendingTrendPoint.current = null;
  }, [symbol]);

  useEffect(() => {
    if (!containerRef.current || !candles.length) return;

    let disposed = false;
    let chart: IChartApi | undefined;
    let resizeObserver: ResizeObserver | undefined;

    void import("lightweight-charts").then(({ CandlestickSeries, ColorType, LineSeries, LineStyle, createChart }) => {
      if (disposed || !containerRef.current) return;
      const container = containerRef.current;
      chart = createChart(container, {
        autoSize: true,
        height: Math.max(container.clientHeight, 380),
        layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#94a3b8" },
        grid: { vertLines: { color: "rgba(148, 163, 184, 0.10)" }, horzLines: { color: "rgba(148, 163, 184, 0.10)" } },
        crosshair: { vertLine: { color: "rgba(59, 130, 246, 0.45)" }, horzLine: { color: "rgba(59, 130, 246, 0.45)" } },
        rightPriceScale: { borderColor: "rgba(148, 163, 184, 0.20)" },
        timeScale: { borderColor: "rgba(148, 163, 184, 0.20)", timeVisible: true, secondsVisible: false },
      });

      const activeChart = chart;
      const series = activeChart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      series.setData(candles.map((candle) => ({ ...candle, time: candle.time as Time })));

      drawings.forEach((drawing) => {
        if (drawing.type === "horizontal") {
          series.createPriceLine({
            price: drawing.price,
            color: "#60a5fa",
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: "Line",
          });
          return;
        }

        const trendSeries = activeChart.addSeries(LineSeries, {
          color: "#f59e0b",
          lineWidth: 2,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        trendSeries.setData([
          { time: drawing.startTime as Time, value: drawing.startPrice },
          { time: drawing.endTime as Time, value: drawing.endPrice },
        ].sort((a, b) => Number(a.time) - Number(b.time)));
      });

      activeChart.subscribeClick((param: MouseEventParams<Time>) => {
        const time = param.time;
        if (tool === "cursor" || !param.point || typeof time !== "number") return;
        const price = series.coordinateToPrice(param.point.y);
        if (price === null) return;

        if (tool === "horizontal") {
          setDrawings((current) => [...current, { id: drawingId(), type: "horizontal", price }]);
          return;
        }

        if (!pendingTrendPoint.current) {
          pendingTrendPoint.current = { time, price };
          return;
        }

        const start = pendingTrendPoint.current;
        pendingTrendPoint.current = null;
        setDrawings((current) => [...current, {
          id: drawingId(),
          type: "trend",
          startTime: start.time,
          startPrice: start.price,
          endTime: time,
          endPrice: price,
        }]);
      });

      activeChart.timeScale().fitContent();
      resizeObserver = new ResizeObserver(([entry]) => {
        if (entry) activeChart.applyOptions({ width: entry.contentRect.width, height: Math.max(entry.contentRect.height, 380) });
      });
      resizeObserver.observe(container);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chart?.remove();
    };
  }, [candles, drawings, tool]);

  const controls: Array<{ value: DrawingTool; label: string; icon: typeof MousePointer2 }> = [
    { value: "cursor", label: "Move", icon: MousePointer2 },
    { value: "horizontal", label: "Horizontal", icon: Minus },
    { value: "trend", label: "Trend", icon: PencilLine },
  ];

  return (
    <section className="ios-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-1 rounded-xl bg-muted/45 p-1">
          {controls.map((control) => {
            const Icon = control.icon;
            return (
              <button key={control.value} onClick={() => setTool(control.value)} className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors", tool === control.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background/80 hover:text-foreground")}>
                <Icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{control.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {tool === "trend" && <span className="text-[11px] text-amber-500">Tap two points</span>}
          <button onClick={() => setDrawings([])} disabled={!drawings.length} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40">
            <Eraser className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </div>
      <div className="relative h-[430px] touch-none sm:h-[560px]" ref={containerRef}>
        {(isLoading || error) && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/75 text-sm text-muted-foreground backdrop-blur-sm">{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChartNoAxesCombined className="h-5 w-5" />} {isLoading ? "Loading Hyperliquid candles…" : "Chart data is unavailable"}</div>}
      </div>
    </section>
  );
}
