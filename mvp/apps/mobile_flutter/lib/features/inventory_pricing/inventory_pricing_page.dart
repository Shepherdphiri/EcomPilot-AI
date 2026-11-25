import 'package:flutter/material.dart';

class InventoryPricingPage extends StatelessWidget {
  const InventoryPricingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: const [
        Text('Inventory & Pricing Intelligence', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        SizedBox(height: 12),
        Card(
          child: ListTile(
            title: Text('SKU ABC123 · Smart Ceramic Kettle 1.7L'),
            subtitle: Text('Stock: 150 · Velocity: 15/day · Cover: 10 days | Shopify R499 vs Makro R449 (10% mismatch)'),
          ),
        ),
        SizedBox(height: 10),
        Card(
          child: ListTile(
            title: Text('SKU AP-FRY-600 · Apex 6L Digital Air Fryer'),
            subtitle: Text('Stock: 42 · Velocity: 14/day · Stockout predicted in 3 days'),
          ),
        ),
      ],
    );
  }
}
