import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/workspace_provider.dart';

class AiAssistantPage extends ConsumerStatefulWidget {
  const AiAssistantPage({super.key});

  @override
  ConsumerState<AiAssistantPage> createState() => _AiAssistantPageState();
}

class _AiAssistantPageState extends ConsumerState<AiAssistantPage> {
  final _ctrl = TextEditingController();
  final List<(String, String)> _messages = [];
  bool _sending = false;

  Future<void> _send(String prompt) async {
    if (prompt.trim().isEmpty) return;
    setState(() {
      _messages.add(('user', prompt));
      _sending = true;
    });
    _ctrl.clear();
    try {
      final reply = await ref.read(apiClientProvider).askAssistant(prompt, {});
      setState(() => _messages.add(('assistant', reply)));
    } finally {
      setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final m in _messages)
                Align(
                  alignment: m.$1 == 'user' ? Alignment.centerRight : Alignment.centerLeft,
                  child: Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(padding: const EdgeInsets.all(12), child: Text(m.$2)),
                  ),
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _ctrl,
                  decoration: const InputDecoration(
                    hintText: 'Ask: What needs attention today?',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _sending ? null : () => _send(_ctrl.text),
                child: const Text('Send'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
