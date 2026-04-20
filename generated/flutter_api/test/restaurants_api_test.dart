import 'package:test/test.dart';
import 'package:pekopeko_api/pekopeko_api.dart';


/// tests for RestaurantsApi
void main() {
  final instance = PekopekoApi().getRestaurantsApi();

  group(RestaurantsApi, () {
    // Get restaurant details by stable restaurant key
    //
    //Future<RestaurantDetailsResponse> getRestaurantDetails(String restaurantKey, { AppLocale locale }) async
    test('test getRestaurantDetails', () async {
      // TODO
    });

    // Proxy restaurant photo media
    //
    //Future<Uint8List> getRestaurantPhoto(String restaurantKey, { int maxWidth }) async
    test('test getRestaurantPhoto', () async {
      // TODO
    });

    // Search nearby restaurants
    //
    //Future<RestaurantSearchResponse> searchRestaurants(RestaurantSearchRequest restaurantSearchRequest) async
    test('test searchRestaurants', () async {
      // TODO
    });

  });
}
