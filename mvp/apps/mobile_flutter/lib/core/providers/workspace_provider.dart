import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/ecom_models.dart';
import '../services/api_client.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  const apiUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'https://api.ecompilot.ai');
  return ApiClient(baseUrl: apiUrl);
});

final activeRoleProvider = StateProvider<UserRole>((ref) => UserRole.ecommerceManager);

class TasksNotifier extends StateNotifier<List<PriorityTask>> {
  TasksNotifier()
      : super(const [
          PriorityTask(
            id: 't1',
            severity: TaskSeverity.critical,
            title: 'Amazon listing suppressed: missing voltage attribute',
            summary: 'SKU ES-PRO-220 blocked on Amazon Seller Central (R4,800/day impact).',
            marketplace: 'Amazon Seller Central',
            revenueImpactZar: 4800,
          ),
          PriorityTask(
            id: 't2',
            severity: TaskSeverity.critical,
            title: 'Product stockout in 3 days (AP-FRY-600)',
            summary: '42 units remaining at 14 units/day velocity; inbound ETA 8 days.',
            marketplace: 'Takealot',
            revenueImpactZar: 5600,
          ),
          PriorityTask(
            id: 't3',
            severity: TaskSeverity.high,
            title: 'Price mismatch: Shopify R499 vs Makro R449 (10%)',
            summary: 'SKU ABC123 undercut by 10% on Makro Marketplace.',
            marketplace: 'Makro Marketplace',
            revenueImpactZar: 1100,
          ),
        ]);

  void resolveTask(String id) {
    state = [
      for (final t in state)
        if (t.id == id) t.copyWith(resolved: true) else t,
    ];
  }
}

final tasksProvider = StateNotifierProvider<TasksNotifier, List<PriorityTask>>(
  (ref) => TasksNotifier(),
);
