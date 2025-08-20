import { HetznerPricingResponse } from "@/types/api/hetzner/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface PricingDisplayProps {
  pricing: HetznerPricingResponse["pricing"];
}

export default function PricingDisplay({ pricing }: PricingDisplayProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Pricing Information</h3>
          <span className="text-sm text-muted-foreground">
            Currency: {pricing.currency.toUpperCase()}, VAT Rate: {pricing.vat_rate}%
          </span>
        </div>
      </div>

      {/* Server Types */}
      <Card>
        <CardHeader>
          <CardTitle>Server Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {pricing.server_types?.map((serverType) => (
              <div key={serverType.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">{serverType.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {serverType.description}
                    </p>
                  </div>
                  {serverType.deprecated && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Deprecated
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                  <div>
                    <span className="font-semibold">CPU:</span> {serverType.cores} cores
                  </div>
                  <div>
                    <span className="font-semibold">Memory:</span> {serverType.memory} GB
                  </div>
                  <div>
                    <span className="font-semibold">Disk:</span> {serverType.disk} GB
                  </div>
                  <div>
                    <span className="font-semibold">CPU Type:</span> {serverType.cpu_type}
                  </div>
                </div>

                <div className="grid gap-2">
                  {serverType.prices?.map((price, index) => (
                    <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm bg-gray-50 p-2 rounded">
                      <div>
                        <span className="font-semibold">Location:</span> {price.location}
                      </div>
                      <div>
                        <span className="font-semibold">Hourly:</span> €{parseFloat(price.price_hourly.gross).toFixed(4)}
                      </div>
                      <div>
                        <span className="font-semibold">Monthly:</span> €{parseFloat(price.price_monthly.gross).toFixed(2)}
                      </div>
                      {price.included_traffic && (
                        <div>
                          <span className="font-semibold">Traffic:</span> {Math.floor(price.included_traffic / 1000 / 1000 / 1000 / 1000)} TB
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Load Balancer Types */}
      <Card>
        <CardHeader>
          <CardTitle>Load Balancer Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {pricing.load_balancer_types?.map((lbType) => (
              <div key={lbType.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">{lbType.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {lbType.description}
                    </p>
                  </div>
                  {lbType.deprecated && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Deprecated
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                  <div>
                    <span className="font-semibold">Max Connections:</span> {lbType.max_connections}
                  </div>
                  <div>
                    <span className="font-semibold">Max Services:</span> {lbType.max_services}
                  </div>
                  <div>
                    <span className="font-semibold">Max Targets:</span> {lbType.max_targets}
                  </div>
                  <div>
                    <span className="font-semibold">Max Certificates:</span> {lbType.max_assigned_certificates}
                  </div>
                </div>

                <div className="grid gap-2">
                  {lbType.prices?.map((price, index) => (
                    <div key={index} className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm bg-gray-50 p-2 rounded">
                      <div>
                        <span className="font-semibold">Location:</span> {price.location}
                      </div>
                      <div>
                        <span className="font-semibold">Hourly:</span> €{parseFloat(price.price_hourly.gross).toFixed(4)}
                      </div>
                      <div>
                        <span className="font-semibold">Monthly:</span> €{parseFloat(price.price_monthly.gross).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Volumes */}
      <Card>
        <CardHeader>
          <CardTitle>Volume Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm bg-gray-50 p-4 rounded">
            <div>
              <span className="font-semibold">Price per GB/month:</span> €{parseFloat(pricing.volume.price_per_gb_month.gross).toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Net: €{parseFloat(pricing.volume.price_per_gb_month.net).toFixed(4)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating IPs (Plural - Array) */}
      <Card>
        <CardHeader>
          <CardTitle>Floating IPs Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {pricing.floating_ips?.map((floatingIp, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">{floatingIp.type.toUpperCase()}</h4>
                <div className="grid gap-2">
                  {floatingIp.prices?.map((price, priceIndex) => (
                    <div key={priceIndex} className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-2 rounded">
                      <div>
                        <span className="font-semibold">Location:</span> {price.location}
                      </div>
                      <div>
                        <span className="font-semibold">Monthly:</span> €{parseFloat(price.price_monthly.gross).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Primary IPs */}
      <Card>
        <CardHeader>
          <CardTitle>Primary IPs Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {pricing.primary_ips?.map((primaryIp, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">{primaryIp.type.toUpperCase()}</h4>
                <div className="grid gap-2">
                  {primaryIp.prices?.map((price, priceIndex) => (
                    <div key={priceIndex} className="grid grid-cols-3 gap-2 text-sm bg-gray-50 p-2 rounded">
                      <div>
                        <span className="font-semibold">Location:</span> {price.location}
                      </div>
                      <div>
                        <span className="font-semibold">Hourly:</span> €{parseFloat(price.price_hourly.gross).toFixed(4)}
                      </div>
                      <div>
                        <span className="font-semibold">Monthly:</span> €{parseFloat(price.price_monthly.gross).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Floating IP (Singular - Object) */}
      <Card>
        <CardHeader>
          <CardTitle>Floating IP Base Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm bg-gray-50 p-4 rounded">
            <div>
              <span className="font-semibold">Monthly:</span> €{parseFloat(pricing.floating_ip.price_monthly.gross).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Net: €{parseFloat(pricing.floating_ip.price_monthly.net).toFixed(2)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle>Image Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm bg-gray-50 p-4 rounded">
            <div>
              <span className="font-semibold">Price per GB/month:</span> €{parseFloat(pricing.image.price_per_gb_month.gross).toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Net: €{parseFloat(pricing.image.price_per_gb_month.net).toFixed(4)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Backup */}
      <Card>
        <CardHeader>
          <CardTitle>Server Backup Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm bg-gray-50 p-4 rounded">
            <div>
              <span className="font-semibold">Percentage of server cost:</span> {pricing.server_backup.percentage}%
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}