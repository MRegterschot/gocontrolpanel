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

export interface HetznerFloatingIpsPricing {
  type: string;
  prices: {
    location: string;
    price_monthly: {
      net: string;
      gross: string;
    };
  }[];
}

export interface HetznerPrimaryIpsPricing {
  type: string;
  prices: {
    location: string;
    price_hourly: {
      net: string;
      gross: string;
    };
    price_monthly: {
      net: string;
      gross: string;
    };
  }[];
}

export interface HetznerPricingResponse {
  pricing: {
    currency: string;
    vat_rate: string;
    image: {
      price_per_gb_month: {
        net: string;
        gross: string;
      };
    };
    floating_ip: {
      price_monthly: {
        net: string;
        gross: string;
      };
    };
    floating_ips: HetznerFloatingIpsPricing[];
    primary_ips: HetznerPrimaryIpsPricing[];
    server_backup: {
      percentage: string;
    };
    server_types: HetznerServerTypePricing[];
    load_balancer_types: HetznerLoadBalancerTypePricing[];
    volume: {
      price_per_gb_month: {
        net: string;
        gross: string;
      };
    };
  };
}