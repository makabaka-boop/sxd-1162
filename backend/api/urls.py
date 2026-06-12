from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomTokenObtainPairView, UserViewSet, UserProfileView,
    DeviceTypeViewSet, LocationViewSet, DeviceViewSet,
    BorrowRecordViewSet, MaintenanceRecordViewSet, ExceptionRecordViewSet,
    StatisticsView, CheckOverdueView, ReservationViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'device-types', DeviceTypeViewSet)
router.register(r'locations', LocationViewSet)
router.register(r'devices', DeviceViewSet)
router.register(r'borrow-records', BorrowRecordViewSet)
router.register(r'maintenance-records', MaintenanceRecordViewSet)
router.register(r'exception-records', ExceptionRecordViewSet)
router.register(r'reservations', ReservationViewSet)

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='custom_login'),
    path('auth/profile/', UserProfileView.as_view(), name='user_profile'),
    path('statistics/', StatisticsView.as_view(), name='statistics'),
    path('check-overdue/', CheckOverdueView.as_view(), name='check_overdue'),
    path('', include(router.urls)),
]
