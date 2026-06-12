from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import User, DeviceType, Location, Device, BorrowRecord, MaintenanceRecord, ExceptionRecord
from .serializers import (
    UserSerializer, UserCreateSerializer,
    DeviceTypeSerializer, LocationSerializer,
    DeviceListSerializer, DeviceDetailSerializer, DeviceCreateSerializer,
    BorrowRecordSerializer, BorrowCreateSerializer, ReturnDeviceSerializer,
    MaintenanceRecordSerializer, MaintenanceCreateSerializer,
    ExceptionRecordSerializer, ExceptionCreateSerializer, ExceptionReviewSerializer,
    StatisticsSerializer, CustomTokenObtainPairSerializer
)
from .permissions import IsAdmin, IsEmployee, IsSupervisor, IsAdminOrSupervisor, IsAdminOrEmployee, IsOwnerOrAdmin
from rest_framework_simplejwt.views import TokenObtainPairView


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class DeviceTypeViewSet(viewsets.ModelViewSet):
    queryset = DeviceType.objects.all()
    serializer_class = DeviceTypeSerializer
    permission_classes = [IsAdminOrSupervisor]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAdminOrSupervisor]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]


class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return DeviceListSerializer
        elif self.action == 'create':
            return DeviceCreateSerializer
        return DeviceDetailSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        queryset = Device.objects.annotate(
            turnover_count=Count('borrow_records', filter=Q(borrow_records__returned=True))
        )
        device_type = self.request.query_params.get('device_type')
        location = self.request.query_params.get('location')
        status = self.request.query_params.get('status')
        borrower = self.request.query_params.get('borrower')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if device_type:
            queryset = queryset.filter(device_type_id=device_type)
        if location:
            queryset = queryset.filter(location_id=location)
        if status:
            queryset = queryset.filter(status=status)
        if borrower:
            queryset = queryset.filter(borrow_records__borrower_id=borrower, borrow_records__returned=False)
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        return queryset.order_by('-created_at')

    def get_is_overdue_annotation(self, queryset):
        from django.db.models import BooleanField, Case, When, Value
        return queryset.annotate(
            is_overdue=Case(
                When(
                    Q(borrow_records__returned=False) &
                    Q(borrow_records__expected_return_date__lt=timezone.now().date()),
                    then=Value(True)
                ),
                default=Value(False),
                output_field=BooleanField()
            )
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        queryset = self.get_is_overdue_annotation(queryset)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        from django.db.models import BooleanField, Case, When, Value
        instance = Device.objects.annotate(
            turnover_count=Count('borrow_records', filter=Q(borrow_records__returned=True)),
            is_overdue=Case(
                When(
                    Q(borrow_records__returned=False) &
                    Q(borrow_records__expected_return_date__lt=timezone.now().date()),
                    then=Value(True)
                ),
                default=Value(False),
                output_field=BooleanField()
            )
        ).get(pk=instance.pk)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class BorrowRecordViewSet(viewsets.ModelViewSet):
    queryset = BorrowRecord.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return BorrowCreateSerializer
        return BorrowRecordSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsEmployee()]
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        queryset = BorrowRecord.objects.all()
        user = self.request.user
        if user.role == 'employee':
            queryset = queryset.filter(borrower=user)
        return queryset.order_by('-borrow_date')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        device = serializer.validated_data['device']
        borrow_record = BorrowRecord.objects.create(
            device=device,
            borrower=request.user,
            expected_return_date=serializer.validated_data['expected_return_date'],
            borrow_purpose=serializer.validated_data['borrow_purpose']
        )
        device.status = 'borrowed'
        device.save()
        headers = self.get_success_headers(serializer.data)
        return Response(BorrowRecordSerializer(borrow_record).data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], permission_classes=[IsEmployee])
    def return_device(self, request, pk=None):
        borrow_record = self.get_object()
        if borrow_record.borrower != request.user and request.user.role != 'admin':
            return Response({'error': '无权归还此设备'}, status=status.HTTP_403_FORBIDDEN)
        if borrow_record.returned:
            return Response({'error': '该设备已归还'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ReturnDeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        borrow_record.returned = True
        borrow_record.actual_return_date = timezone.now()
        borrow_record.return_notes = serializer.validated_data.get('return_notes', '')
        borrow_record.damage_notes = serializer.validated_data.get('damage_notes', '')
        borrow_record.save()

        device = borrow_record.device
        if serializer.validated_data.get('needs_maintenance') or borrow_record.damage_notes:
            device.status = 'pending_maintenance'
        else:
            device.status = 'available'
        device.save()

        if borrow_record.is_overdue():
            ExceptionRecord.objects.create(
                device=device,
                reporter=request.user,
                exception_type='overdue',
                description=f'设备逾期归还，逾期天数: {(timezone.now().date() - borrow_record.expected_return_date).days}天'
            )

        if borrow_record.damage_notes:
            ExceptionRecord.objects.create(
                device=device,
                reporter=request.user,
                exception_type='damage',
                description=borrow_record.damage_notes
            )

        return Response(BorrowRecordSerializer(borrow_record).data)


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return MaintenanceCreateSerializer
        return MaintenanceRecordSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsEmployee()]
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        return MaintenanceRecord.objects.all().order_by('-maintenance_date')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        device = serializer.validated_data['device']
        maintenance = MaintenanceRecord.objects.create(
            device=device,
            operator=request.user,
            maintenance_type=serializer.validated_data['maintenance_type'],
            description=serializer.validated_data['description'],
            result=serializer.validated_data['result'],
            completed=True,
            completed_date=timezone.now()
        )
        device.status = 'recovered'
        device.last_maintenance_date = timezone.now()
        device.save()
        headers = self.get_success_headers(serializer.data)
        return Response(MaintenanceRecordSerializer(maintenance).data, status=status.HTTP_201_CREATED, headers=headers)


class ExceptionRecordViewSet(viewsets.ModelViewSet):
    queryset = ExceptionRecord.objects.all()
    serializer_class = ExceptionRecordSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return ExceptionCreateSerializer
        return ExceptionRecordSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsEmployee()]
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsSupervisor()]

    def get_queryset(self):
        queryset = ExceptionRecord.objects.all()
        review_status = self.request.query_params.get('review_status')
        exception_type = self.request.query_params.get('exception_type')
        if review_status:
            queryset = queryset.filter(review_status=review_status)
        if exception_type:
            queryset = queryset.filter(exception_type=exception_type)
        return queryset.order_by('-reported_date')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        exception = ExceptionRecord.objects.create(
            device=serializer.validated_data['device'],
            reporter=request.user,
            exception_type=serializer.validated_data['exception_type'],
            description=serializer.validated_data['description']
        )
        exception.device.status = 'exception_pending'
        exception.device.save()
        headers = self.get_success_headers(serializer.data)
        return Response(ExceptionRecordSerializer(exception).data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def review(self, request, pk=None):
        exception = self.get_object()
        if exception.review_status != 'pending':
            return Response({'error': '该异常已复核'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ExceptionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        exception.review_status = 'approved' if serializer.validated_data['action'] == 'approve' else 'rejected'
        exception.reviewer = request.user
        exception.review_date = timezone.now()
        exception.review_result = serializer.validated_data['review_result']
        exception.save()

        if exception.review_status == 'approved':
            device = exception.device
            if exception.exception_type in ['damage', 'missing_maintenance']:
                device.status = 'pending_maintenance'
            elif exception.exception_type == 'loss':
                device.status = 'decommissioned'
            elif exception.exception_type == 'overdue':
                if device.status == 'borrowed':
                    device.status = 'borrowed'
            device.save()
        else:
            device = exception.device
            if device.status == 'exception_pending':
                current_borrow = device.get_current_borrow()
                device.status = 'borrowed' if current_borrow else 'available'
            device.save()

        return Response(ExceptionRecordSerializer(exception).data)


class StatisticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_turnover = BorrowRecord.objects.filter(returned=True).count()
        pending_maintenance = Device.objects.filter(status='pending_maintenance').count()

        exception_distribution = dict(
            ExceptionRecord.objects.values('exception_type')
            .annotate(count=Count('id'))
            .values_list('exception_type', 'count')
        )

        low_stock_types = []
        for dt in DeviceType.objects.all():
            available = dt.devices.filter(status='available').count()
            if available < dt.warning_threshold:
                low_stock_types.append({
                    'id': dt.id,
                    'name': dt.name,
                    'available': available,
                    'total': dt.devices.count(),
                    'threshold': dt.warning_threshold
                })

        data = {
            'total_turnover': total_turnover,
            'pending_maintenance': pending_maintenance,
            'exception_distribution': exception_distribution,
            'low_stock_types': low_stock_types
        }
        serializer = StatisticsSerializer(data)
        return Response(serializer.data)


class CheckOverdueView(APIView):
    permission_classes = [IsAdminOrSupervisor]

    def get(self, request):
        today = timezone.now().date()
        overdue_records = BorrowRecord.objects.filter(
            returned=False,
            expected_return_date__lt=today
        ).select_related('device', 'borrower')

        auto_created = []
        for record in overdue_records:
            if not ExceptionRecord.objects.filter(
                device=record.device,
                exception_type='overdue',
                review_status='pending'
            ).exists():
                ExceptionRecord.objects.create(
                    device=record.device,
                    reporter=request.user,
                    exception_type='overdue',
                    description=f'系统自动检测：设备逾期未还，逾期天数: {(today - record.expected_return_date).days}天'
                )
                record.device.status = 'exception_pending'
                record.device.save()
                auto_created.append(record.device.asset_number)

        return Response({
            'overdue_count': overdue_records.count(),
            'auto_created_exceptions': auto_created
        })
