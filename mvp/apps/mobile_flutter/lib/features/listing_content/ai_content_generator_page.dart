import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/providers/workspace_provider.dart';

class AiContentGeneratorPage extends ConsumerStatefulWidget {
  const AiContentGeneratorPage({super.key});

  @override
  ConsumerState<AiContentGeneratorPage> createState() => _AiContentGeneratorPageState();
}

class _AiContentGeneratorPageState extends ConsumerState<AiContentGeneratorPage> {
  final _nameCtrl = TextEditingController(text: 'Apex 6L Digital Air Fryer');
  final _dimCtrl = TextEditingController(text: '34 x 29 x 32 cm · 5.2 kg');
  final _specCtrl = TextEditingController(text: '1700W rapid convection, 6L non-stick basket, 8 digital presets');
  String? _imageBase64;
  Map<String, dynamic>? _result;
  bool _loading = false;

  Future<void> _pickImage() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    setState(() => _imageBase64 = base64Encode(bytes));
  }

  Future<void> _generate() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final data = await api.generateListingCopy({
        'productName': _nameCtrl.text,
        'brand': 'Apex Home',
        'dimensions': _dimCtrl.text,
        'specifications': _specCtrl.text,
        if (_imageBase64 != null) 'imageBase64': _imageBase64,
        if (_imageBase64 != null) 'imageMimeType': 'image/jpeg',
      });
      setState(() => _result = data);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text('AI Content Generator (English)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Product Name', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        TextField(controller: _dimCtrl, decoration: const InputDecoration(labelText: 'Dimensions & Weight', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        TextField(controller: _specCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Specifications', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        Row(
          children: [
            OutlinedButton.icon(onPressed: _pickImage, icon: const Icon(Icons.image_outlined), label: const Text('Upload Image')),
            const SizedBox(width: 12),
            FilledButton(
              onPressed: _loading ? null : _generate,
              child: Text(_loading ? 'Generating...' : 'Generate Channel Copy'),
            ),
          ],
        ),
        if (_result != null) ...[
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Amazon: ${_result!['amazonTitle']}'),
                  const SizedBox(height: 8),
                  Text('Takealot: ${_result!['takealotTitle']}'),
                  const SizedBox(height: 8),
                  Text('Shopify: ${_result!['shopifyTitle']}'),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}
