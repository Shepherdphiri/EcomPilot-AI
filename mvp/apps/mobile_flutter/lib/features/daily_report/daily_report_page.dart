import 'package:flutter/material.dart';

class DailyReportPage extends StatelessWidget {
  const DailyReportPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: const [
        Text('Daily AI Morning Report (06:00 SAST)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        SizedBox(height: 16),
        Card(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Revenue Yesterday: R82,300 · Orders: 54', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                SizedBox(height: 8),
                Text('Low Stock Products: 7 · Suppressed Listings: 4 · Delayed Deliveries: 3'),
                SizedBox(height: 8),
                Text('Potential Revenue Loss: R14,200 · Top Recommended Actions: 5'),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
