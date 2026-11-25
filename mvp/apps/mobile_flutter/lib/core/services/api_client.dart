import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ApiClient {
  final Dio _dio;

  ApiClient({required String baseUrl})
      : _dio = Dio(BaseOptions(baseUrl: baseUrl, connectTimeout: const Duration(seconds: 15))) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final session = Supabase.instance.client.auth.currentSession;
          if (session != null) {
            options.headers['Authorization'] = 'Bearer ${session.accessToken}';
          }
          handler.next(options);
        },
      ),
    );
  }

  Future<Map<String, dynamic>> generateListingCopy(Map<String, dynamic> payload) async {
    final res = await _dio.post('/api/v1/ai/content-generate', data: payload);
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<String> askAssistant(String message, Map<String, dynamic> context) async {
    final res = await _dio.post('/api/v1/ai/chat', data: {
      'message': message,
      'storeContext': context,
    });
    return (res.data as Map)['reply'] as String;
  }
}
