import 'package:flutter/material.dart';
import '../../core/models/ecom_models.dart';

class MarketplaceHealthPage extends StatelessWidget {
  const MarketplaceHealthPage({super.key});

  static const _channels = [
    MarketplaceHealth(name: 'Amazon Seller Central', totalListings: 184, activeListings: 176, suppressedListings: 2, healthScore: 92),
    MarketplaceHealth(name: 'Takealot Marketplace', totalListings: 210, activeListings: 194, suppressedListings: 1, healthScore: 78),
    MarketplaceHealth(name: 'Shopify D2C Store', totalListings: 224, activeListings: 222, suppressedListings: 0, healthScore: 96),
    MarketplaceHealth(name: 'Makro Marketplace', totalListings: 142, activeListings: 134, suppressedListings: 1, healthScore: 81),
    MarketplaceHealth(name: 'Amazon Vendor Central', totalListings: 68, activeListings: 66, suppressedListings: 0, healthScore: 90),
    MarketplaceHealth(name: 'Leroy Merlin Marketplace', totalListings: 95, activeListings: 91, suppressedListings: 0, healthScore: 86),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _channels.length,
      itemBuilder: (context, idx) {
        final ch = _channels[idx];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(ch.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text('Active ${ch.activeListings}/${ch.totalListings} · Suppressed ${ch.suppressedListings}'),
                  ],
                ),
                Text(
                  '${ch.healthScore}/100',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
