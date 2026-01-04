"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import apiCall from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface LogisticsData {
  id: string;
  order_id: string | null;
  company_id: string;
  dispatcher_id: string;
  delivery_person_id: string | null;
  logistics_provider: string;
  delivery_method: string;
  vehicle_type: string;
  vehicle_id: string | null;
  tracking_number: string;
  delivery_status: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  city: string;
  state: string;
  country: string;
  dispatch_time: string | null;
  estimated_delivery_time: string | null;
  actual_delivery_time: string | null;
  notes: string | null;
  status: string;
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "delivered":
      return "bg-green-100 text-green-800";
    case "in_transit":
      return "bg-blue-100 text-blue-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function LogisticsDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [logistics, setLogistics] = useState<LogisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchLogistics = async () => {
      try {
        setLoading(true);
        const response = await apiCall<{ logistics: LogisticsData }>(`/logistics/${id}`);
        setLogistics(response.logistics);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load logistics");
      } finally {
        setLoading(false);
      }
    };

    fetchLogistics();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !logistics) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center text-red-500">
            {error || "Logistics record not found"}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shipment Details</h1>
        <Badge className={getStatusColor(logistics.delivery_status)}>
          {logistics.delivery_status?.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tracking Info */}
        <Card>
          <CardHeader>
            <CardTitle>Tracking Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tracking #</span>
              <span className="font-mono">{logistics.tracking_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span>{logistics.logistics_provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span>{logistics.delivery_method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle Type</span>
              <span>{logistics.vehicle_type}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recipient Info */}
        <Card>
          <CardHeader>
            <CardTitle>Recipient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{logistics.recipient_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{logistics.recipient_phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="text-right">{logistics.delivery_address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span>{[logistics.city, logistics.state, logistics.country].filter(Boolean).join(", ")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Delivery Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Dispatched</p>
                <p className="font-medium">
                  {logistics.dispatch_time
                    ? format(new Date(logistics.dispatch_time), "PPp")
                    : "Not yet dispatched"}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                <p className="font-medium">
                  {logistics.estimated_delivery_time
                    ? format(new Date(logistics.estimated_delivery_time), "PPp")
                    : "Not set"}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Actual Delivery</p>
                <p className="font-medium">
                  {logistics.actual_delivery_time
                    ? format(new Date(logistics.actual_delivery_time), "PPp")
                    : "Not delivered"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {logistics.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{logistics.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
