"use client";
import { getHetznerPricing } from "@/actions/hetzner/pricing";
import { HetznerPricingResponse } from "@/types/api/hetzner/pricing";
import { useEffect, useState } from "react";
import PricingDisplay from "./pricing-display";

interface PricingContainerProps {
  projectId: string;
}

export default function PricingContainer({ projectId }: PricingContainerProps) {
  const [pricing, setPricing] = useState<HetznerPricingResponse["pricing"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPricing() {
      try {
        setLoading(true);
        const response = await getHetznerPricing(projectId);
        if (response.error) {
          setError(response.error);
        } else {
          setPricing(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch pricing");
      } finally {
        setLoading(false);
      }
    }

    fetchPricing();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading pricing information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Error loading pricing: {error}</div>
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No pricing information available</div>
      </div>
    );
  }

  return <PricingDisplay pricing={pricing} />;
}