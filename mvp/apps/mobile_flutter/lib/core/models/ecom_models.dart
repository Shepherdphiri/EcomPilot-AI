enum UserRole {
  ecommerceManager('Ecommerce Manager'),
  contentManager('Content Manager'),
  inventoryManager('Inventory Manager'),
  executive('Executive');

  final String label;
  const UserRole(this.label);
}

enum TaskSeverity { critical, high, medium, low }

class PriorityTask {
  final String id;
  final TaskSeverity severity;
  final String title;
  final String summary;
  final String marketplace;
  final int revenueImpactZar;
  final bool resolved;

  const PriorityTask({
    required this.id,
    required this.severity,
    required this.title,
    required this.summary,
    required this.marketplace,
    required this.revenueImpactZar,
    this.resolved = false,
  });

  PriorityTask copyWith({bool? resolved}) => PriorityTask(
        id: id,
        severity: severity,
        title: title,
        summary: summary,
        marketplace: marketplace,
        revenueImpactZar: revenueImpactZar,
        resolved: resolved ?? this.resolved,
      );
}

class MarketplaceHealth {
  final String name;
  final int totalListings;
  final int activeListings;
  final int suppressedListings;
  final int healthScore;

  const MarketplaceHealth({
    required this.name,
    required this.totalListings,
    required this.activeListings,
    required this.suppressedListings,
    required this.healthScore,
  });
}
