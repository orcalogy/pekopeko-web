import 'package:test/test.dart';
import 'package:pekopeko_api/pekopeko_api.dart';


/// tests for SystemApi
void main() {
  final instance = PekopekoApi().getSystemApi();

  group(SystemApi, () {
    // Runtime capabilities and search contract
    //
    //Future<CapabilitiesResponse> getCapabilities() async
    test('test getCapabilities', () async {
      // TODO
    });

    // Health check
    //
    //Future<HealthResponse> getHealth() async
    test('test getHealth', () async {
      // TODO
    });

  });
}
