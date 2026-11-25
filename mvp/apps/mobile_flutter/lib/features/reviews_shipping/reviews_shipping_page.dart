import 'package:flutter/material.dart';

class ReviewsShippingPage extends StatelessWidget {
  const ReviewsShippingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: const [
        Text('Reviews & Shipping Intelligence', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        SizedBox(height: 12),
        Card(
          child: ListTile(
            title: Text('Top Complaint: Packaging damaged (28 mentions)'),
            subtitle: Text('SKU AP-FRY-600 · Recommendation: Improve outer carton packaging quality.'),
          ),
        ),
        SizedBox(height: 10),
        Card(
          child: ListTile(
            title: Text('Waybill Mismatch: Internet Express (IEX-884219)'),
            subtitle: Text('Courier: Delivered · Takealot Marketplace: Still in transit — Sync POD status.'),
          ),
        ),
      ],
    );
  }
}
