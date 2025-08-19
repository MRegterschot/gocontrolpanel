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
          <div className="grid gap-2">
            {pricing.volume?.map((volume, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 text-sm bg-gray-50 p-2 rounded">
                <div>
                  <span className="font-semibold">Type:</span> {volume.type}
                </div>
                <div>
                  <span className="font-semibold">Location:</span> {volume.location}
                </div>
                <div>
                  <span className="font-semibold">Monthly per GB:</span> €{parseFloat(volume.price_monthly.gross).toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Floating IPs */}
      <Card>
        <CardHeader>
          <CardTitle>Floating IP Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {pricing.floating_ip?.map((ip, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 text-sm bg-gray-50 p-2 rounded">
                <div>
                  <span className="font-semibold">Type:</span> {ip.type}
                </div>
                <div>
                  <span className="font-semibold">Location:</span> {ip.location}
                </div>
                <div>
                  <span className="font-semibold">Monthly:</span> €{parseFloat(ip.price_monthly.gross).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Snapshots */}
      <Card>
        <CardHeader>
          <CardTitle>Snapshot Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {pricing.snapshot?.map((snapshot, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 text-sm bg-gray-50 p-2 rounded">
                <div>
                  <span className="font-semibold">Type:</span> {snapshot.type}
                </div>
                <div>
                  <span className="font-semibold">Location:</span> {snapshot.location}
                </div>
                <div>
                  <span className="font-semibold">Monthly per GB:</span> €{parseFloat(snapshot.price_monthly.gross).toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle>Image Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {pricing.image?.map((image, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 text-sm bg-gray-50 p-2 rounded">
                <div>
                  <span className="font-semibold">Type:</span> {image.type}
                </div>
                <div>
                  <span className="font-semibold">Location:</span> {image.location}
                </div>
                <div>
                  <span className="font-semibold">Monthly per GB:</span> €{parseFloat(image.price_monthly.gross).toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Traffic */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {pricing.traffic?.map((traffic, index) => (
              <div key={index} className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-2 rounded">
                <div>
                  <span className="font-semibold">Location:</span> {traffic.location}
                </div>
                <div>
                  <span className="font-semibold">Price per TB:</span> €{parseFloat(traffic.price_per_tb.gross).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Server Backup */}
      <Card>
        <CardHeader>
          <CardTitle>Server Backup Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {pricing.server_backup?.map((backup, index) => (
              <div key={index} className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-2 rounded">
                <div>
                  <span className="font-semibold">Location:</span> {backup.location}
                </div>
                <div>
                  <span className="font-semibold">Percentage of server cost:</span> {backup.percentage}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}