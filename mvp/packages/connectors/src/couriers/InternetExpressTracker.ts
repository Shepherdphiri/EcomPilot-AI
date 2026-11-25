export interface CourierTrackingSnapshot {
  waybillNumber: string;
  courierName: string;
  courierStatus: 'Delivered' | 'In Transit' | 'Delivery Failed' | 'Out for Delivery';
  deliveredAt?: string;
}

export async function fetchInternetExpressTracking(
  waybillNumber: string
): Promise<CourierTrackingSnapshot> {
  return {
    waybillNumber,
    courierName: 'Internet Express',
    courierStatus: 'Delivered',
    deliveredAt: new Date().toISOString(),
  };
}
