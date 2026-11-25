import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/priority_center/priority_center_page.dart';
import '../features/marketplace_health/marketplace_health_page.dart';
import '../features/listing_content/ai_content_generator_page.dart';
import '../features/inventory_pricing/inventory_pricing_page.dart';
import '../features/reviews_shipping/reviews_shipping_page.dart';
import '../features/daily_report/daily_report_page.dart';
import '../features/ai_assistant/ai_assistant_page.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/priority',
    routes: [
      ShellRoute(
        builder: (context, state, child) => AppShell(
          location: state.uri.path,
          child: child,
        ),
        routes: [
          GoRoute(path: '/priority', builder: (_, __) => const PriorityCenterPage()),
          GoRoute(path: '/marketplaces', builder: (_, __) => const MarketplaceHealthPage()),
          GoRoute(path: '/content', builder: (_, __) => const AiContentGeneratorPage()),
          GoRoute(path: '/inventory', builder: (_, __) => const InventoryPricingPage()),
          GoRoute(path: '/reviews-shipping', builder: (_, __) => const ReviewsShippingPage()),
          GoRoute(path: '/report', builder: (_, __) => const DailyReportPage()),
          GoRoute(path: '/assistant', builder: (_, __) => const AiAssistantPage()),
        ],
      ),
    ],
  );
});

class AppShell extends StatelessWidget {
  final String location;
  final Widget child;
  const AppShell({super.key, required this.location, required this.child});

  static const _destinations = [
    ('/priority', 'Today', Icons.warning_amber_rounded),
    ('/marketplaces', 'Channels', Icons.storefront_outlined),
    ('/content', 'Content AI', Icons.auto_awesome_outlined),
    ('/inventory', 'Stock & Price', Icons.inventory_2_outlined),
    ('/reviews-shipping', 'Orders', Icons.local_shipping_outlined),
    ('/report', 'Report', Icons.summarize_outlined),
    ('/assistant', 'Assistant', Icons.chat_bubble_outline),
  ];

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= 960;
    final currentIndex = _destinations.indexWhere((d) => d.$1 == location).clamp(0, 6);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: const Text('EcomPilot AI', style: TextStyle(fontWeight: FontWeight.w700)),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1),
        ),
      ),
      body: Row(
        children: [
          if (isWide)
            NavigationRail(
              selectedIndex: currentIndex,
              extended: true,
              backgroundColor: Colors.white,
              onDestinationSelected: (idx) => context.go(_destinations[idx].$1),
              destinations: _destinations
                  .map((d) => NavigationRailDestination(
                        icon: Icon(d.$3),
                        label: Text(d.$2),
                      ))
                  .toList(),
            ),
          Expanded(child: child),
        ],
      ),
      bottomNavigationBar: isWide
          ? null
          : NavigationBar(
              selectedIndex: currentIndex > 3 ? 0 : currentIndex,
              onDestinationSelected: (idx) => context.go(_destinations[idx].$1),
              destinations: _destinations
                  .take(4)
                  .map((d) => NavigationDestination(icon: Icon(d.$3), label: d.$2))
                  .toList(),
            ),
    );
  }
}
