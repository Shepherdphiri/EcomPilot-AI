import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app/theme.dart';
import '../../core/models/ecom_models.dart';
import '../../core/providers/workspace_provider.dart';

class PriorityCenterPage extends ConsumerWidget {
  const PriorityCenterPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(activeRoleProvider);
    final tasks = ref.watch(tasksProvider).where((t) => !t.resolved).toList();

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'What requires my attention today?',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Prioritized actions ranked by daily revenue impact in ZAR.',
                    style: TextStyle(color: AppTheme.muted),
                  ),
                ],
              ),
            ),
            DropdownButton<UserRole>(
              value: role,
              items: UserRole.values
                  .map((r) => DropdownMenuItem(value: r, child: Text(r.label)))
                  .toList(),
              onChanged: (next) {
                if (next != null) ref.read(activeRoleProvider.notifier).state = next;
              },
            ),
          ],
        ),
        const SizedBox(height: 20),
        for (final task in tasks)
          Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              title: Text(
                '${task.severity.name.toUpperCase()} · ${task.title}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text('${task.marketplace} — ${task.summary}'),
              ),
              trailing: FilledButton(
                onPressed: () => ref.read(tasksProvider.notifier).resolveTask(task.id),
                child: const Text('Resolve'),
              ),
            ),
          ),
      ],
    );
  }
}
