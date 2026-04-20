import 'package:test/test.dart';
import 'package:pekopeko_api/pekopeko_api.dart';


/// tests for GeoApi
void main() {
  final instance = PekopekoApi().getGeoApi();

  group(GeoApi, () {
    // Resolve country and provider plan from coordinates
    //
    //Future<GeoResolution> reverseGeo(GeoReverseRequest geoReverseRequest) async
    test('test reverseGeo', () async {
      // TODO
    });

  });
}
