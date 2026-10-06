interface Price {
  net: string;
  gross: string;
}

export interface HetznerPricing {
  currency: string;
  vat_rate: string;
  primary_ips: {
    type: "ipv4" | "ipv6";
    prices: {
      location: string;
      price_hourly: Price;
      price_monthly: Price;
    }[];
  }[];
  floating_ips: {
    type: "ipv4" | "ipv6";
    prices: {
      location: string;
      price_monthly: Price;
    };
  }[];
  image: {
    price_per_gb_month: Price;
  };
  volume: {
    price_per_gb_month: Price;
  };
  server_backup: {
    percentage: string;
  };
  server_types: {
    id: number;
    name: string;
    prices: {
      location: string;
      price_hourly: Price;
      price_monthly: Price;
      included_traffic: number;
      price_per_tb_traffic: Price;
    }[];
  }[];
  load_balancer_types: {
    id: number;
    name: string;
    prices: {
      location: string;
      price_hourly: Price;
      price_monthly: Price;
      included_traffic: number;
      price_per_tb_traffic: Price;
    }[];
  }[];
}
