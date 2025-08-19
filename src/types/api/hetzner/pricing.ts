export interface HetznerPriceItem {
  location: string;
  price_hourly: {
    net: string;
    gross: string;
  };
  price_monthly: {
    net: string;
    gross: string;
  };
  included_traffic?: number;
  price_per_tb_traffic?: {
    net: string;
    gross: string;
  };
}

export interface HetznerServerTypePricing {
  id: number;
  name: string;
  description: string;
  cores: number;
  memory: number;
  disk: number;
  deprecated: boolean;
  prices: HetznerPriceItem[];
  storage_type: string;
  cpu_type: string;
  architecture: string;
}

export interface HetznerVolumePricing {
  type: string;
  location: string;
  price_monthly: {
    net: string;
    gross: string;
  };
}

export interface HetznerLoadBalancerTypePricing {
  id: number;
  name: string;
  description: string;
  max_connections: number;
  max_services: number;
  max_targets: number;
  max_assigned_certificates: number;
  deprecated: boolean;
  prices: HetznerPriceItem[];
}

export interface HetznerFloatingIpPricing {
  type: string;
  location: string;
  price_monthly: {
    net: string;
    gross: string;
  };
}

export interface HetznerImagePricing {
  type: string;
  location: string;
  price_monthly: {
    net: string;
    gross: string;
  };
}

export interface HetznerSnapshotPricing {
  type: string;
  location: string;
  price_monthly: {
    net: string;
    gross: string;
  };
}

export interface HetznerBackupPricing {
  location: string;
  percentage: string;
}

export interface HetznerTrafficPricing {
  location: string;
  price_per_tb: {
    net: string;
    gross: string;
  };
}

export interface HetznerPricingResponse {
  pricing: {
    currency: string;
    vat_rate: string;
    image: HetznerImagePricing[];
    floating_ip: HetznerFloatingIpPricing[];
    traffic: HetznerTrafficPricing[];
    server_backup: HetznerBackupPricing[];
    server_types: HetznerServerTypePricing[];
    load_balancer_types: HetznerLoadBalancerTypePricing[];
    volume: HetznerVolumePricing[];
    snapshot: HetznerSnapshotPricing[];
  };
}