"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { getStores, Store } from "@/lib/stores";
import { getRequisitionsByRequester, downloadReportAsCsv, ReportFilters } from "@/lib/reports-api";
import { ReportLayout, ReportErrorState, ReportEmptyState } from "../../components/report-layout";
import { ReportFiltersBar } from "../../components/report-filters";
import { ReportTable, formatNumber, formatCurrency } from "../../components/report-table";
import { SummaryCard, SummaryGrid } from "../../components/report-summary-cards";
import { BarChartCard, PieChartCard } from "../../components/report-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, FileText, DollarSign, CheckCircle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequesterItem { requester: { id: number; name: string; email: string; department?: string }; requisition_count: number; total_items: number; total_value: number; approved_count: number; approval_rate: number; }

const CHART_COLORS = ["#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#10b981"];

const columns: ColumnDef<RequesterItem>[] = [
  { accessorKey: "requester", header: "Requester", cell: ({ row }) => {
    const r = row.original.requester;
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8"><AvatarFallback className="bg-purple-100 text-purple-700 text-xs">{r?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
        <div><p className="font-medium">{r?.name}</p><p className="text-sm text-muted-foreground">{r?.department || r?.email}</p></div>
      </div>
    );
  }},
  { accessorKey: "requisition_count", header: "Requisitions", cell: ({ row }) => <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{formatNumber(row.original.requisition_count)}</Badge> },
  { accessorKey: "total_items", header: "Items", cell: ({ row }) => <span className="font-mono">{formatNumber(row.original.total_items)}</span> },
  { accessorKey: "total_value", header: "Total Value", cell: ({ row }) => <span className="font-mono font-medium">{formatCurrency(row.original.total_value)}</span> },
  { accessorKey: "approved_count", header: "Approved", cell: ({ row }) => <span className="text-green-600 font-medium">{formatNumber(row.original.approved_count)}</span> },
  { accessorKey: "approval_rate", header: "Approval Rate", cell: ({ row }) => {
    const rate = row.original.approval_rate || 0;
    return (
      <div className="flex items-center gap-2 w-24">
        <Progress value={rate} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground">{rate.toFixed(0)}%</span>
      </div>
    );
  }},
];

export default function RequisitionByRequesterReport() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [filters, setFilters] = React.useState<ReportFilters>({ period: "this_month" });
  const [data, setData] = React.useState<RequesterItem[]>([]);
  const [meta, setMeta] = React.useState<any>(null);

  React.useEffect(() => { getStores().then(setStores).catch(console.error); }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await getRequisitionsByRequester(filters);
      if (response.success) { setData(response.data || []); setMeta(response.meta); }
    } catch (err: any) { setError(err.message || "Failed to load report"); toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [filters, toast]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExportLoading(true);
    try { await downloadReportAsCsv("/requisitions/by-requester", filters, "requisitions_by_requester.csv"); toast({ title: "Export successful" }); }
    catch (err: any) { toast({ title: "Export failed", description: err.message, variant: "destructive" }); }
    finally { setExportLoading(false); }
  };

  const totalRequisitions = data.reduce((a, r) => a + r.requisition_count, 0);
  const totalValue = data.reduce((a, r) => a + r.total_value, 0);
  const totalApproved = data.reduce((a, r) => a + r.approved_count, 0);
  const topRequester = data.length > 0 ? data.reduce((prev, curr) => prev.total_value > curr.total_value ? prev : curr) : null;
  const avgApprovalRate = data.length > 0 ? data.reduce((a, r) => a + r.approval_rate, 0) / data.length : 0;

  const pieData = data.slice(0, 8).map((r, idx) => ({
    name: r.requester?.name || "Unknown",
    value: r.total_value,
    fill: CHART_COLORS[idx % CHART_COLORS.length]
  }));

  const barData = data.slice(0, 6).map(r => ({
    name: r.requester?.name?.split(" ")[0] || "Unknown",
    requisitions: r.requisition_count,
    value: r.total_value,
    approved: r.approved_count
  }));

  if (error && !data.length) {
    return <ReportLayout title="Requisitions by Requester" description="Requester breakdown" category="requisitions" categoryLabel="Requisitions"><ReportErrorState message={error} onRetry={fetchReport} /></ReportLayout>;
  }

  return (
    <ReportLayout title="Requisitions by Requester" description="Track requisition activity by team member" category="requisitions" categoryLabel="Requisitions" loading={loading} generatedAt={meta?.generated_at} period={meta?.period} onExport={handleExport} onRefresh={fetchReport} exportLoading={exportLoading}>
      <div className="space-y-6">
        <ReportFiltersBar filters={filters} onFiltersChange={setFilters} showStoreFilter stores={stores} loading={loading} />

        <SummaryGrid>
          <SummaryCard title="Active Requesters" value={data.length} icon="Users" loading={loading} />
          <SummaryCard title="Total Requisitions" value={formatNumber(totalRequisitions)} icon="FileText" loading={loading} />
          <SummaryCard title="Total Value" value={formatCurrency(totalValue)} icon="DollarSign" loading={loading} />
          <SummaryCard title="Avg Approval Rate" value={`${avgApprovalRate.toFixed(1)}%`} icon="CheckCircle" variant="success" loading={loading} />
        </SummaryGrid>

        {topRequester && (
          <Card className="border-2 border-purple-200 bg-purple-50/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-14 w-14"><AvatarFallback className="bg-purple-200 text-purple-700 text-lg">{topRequester.requester?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center"><Trophy className="h-3 w-3 text-white" /></div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Top Requester</p>
                    <h3 className="text-xl font-bold">{topRequester.requester?.name}</h3>
                    <p className="text-sm text-muted-foreground">{topRequester.requester?.department || topRequester.requester?.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-purple-600">{formatCurrency(topRequester.total_value)}</p>
                  <p className="text-sm text-muted-foreground">{formatNumber(topRequester.requisition_count)} requisitions • {topRequester.approval_rate.toFixed(0)}% approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard title="Value by Requester" description="Share of requisition value" data={pieData} loading={loading} height={300} showLegend />
          <BarChartCard title="Top Requesters" description="Compare activity and approvals" data={barData} dataKeys={[{ key: "requisitions", name: "Requisitions", color: "#8b5cf6" }, { key: "approved", name: "Approved", color: "#22c55e" }]} xAxisKey="name" loading={loading} height={300} />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Requester Leaderboard</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.slice(0, 5).map((requester, idx) => {
              const percentage = totalValue > 0 ? (requester.total_value / totalValue) * 100 : 0;
              return (
                <div key={requester.requester?.id} className="flex items-center gap-4">
                  <span className={cn("w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center", idx === 0 ? "bg-amber-400" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-amber-600" : "bg-purple-200 text-purple-700")}>{idx + 1}</span>
                  <Avatar className="h-8 w-8"><AvatarFallback className="bg-purple-100 text-purple-700 text-xs">{requester.requester?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1"><span className="font-medium truncate">{requester.requester?.name}</span><span className="text-purple-600 font-medium">{formatCurrency(requester.total_value)}</span></div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <span className="text-sm text-muted-foreground w-16 text-right">{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {data.length === 0 && !loading ? <ReportEmptyState /> : (
          <ReportTable columns={columns} data={data} loading={loading} searchColumn="requester" searchPlaceholder="Search requesters..." />
        )}
      </div>
    </ReportLayout>
  );
}
