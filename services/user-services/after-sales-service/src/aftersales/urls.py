from rest_framework.routers import DefaultRouter

from .views import DanhGiaViewSet, YeuCauHauMaiViewSet

router = DefaultRouter(trailing_slash=False)
router.register("reviews", DanhGiaViewSet, basename="reviews")
router.register("requests", YeuCauHauMaiViewSet, basename="requests")

urlpatterns = router.urls