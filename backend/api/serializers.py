from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from .models import User, DeviceType, Location, Device, BorrowRecord, MaintenanceRecord, ExceptionRecord, Reservation


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['role'] = user.role
        token['real_name'] = user.real_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'role': self.user.role,
            'real_name': self.user.real_name,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'real_name']
        read_only_fields = ['id']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'role', 'real_name']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            role=validated_data.get('role', 'employee'),
            real_name=validated_data['real_name']
        )
        return user


class DeviceTypeSerializer(serializers.ModelSerializer):
    available_count = serializers.SerializerMethodField()
    total_count = serializers.SerializerMethodField()

    class Meta:
        model = DeviceType
        fields = ['id', 'name', 'description', 'warning_threshold', 'available_count', 'total_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_available_count(self, obj):
        return obj.devices.filter(status='available').count()

    def get_total_count(self, obj):
        return obj.devices.count()


class LocationSerializer(serializers.ModelSerializer):
    device_count = serializers.SerializerMethodField()

    class Meta:
        model = Location
        fields = ['id', 'name', 'description', 'device_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_device_count(self, obj):
        return obj.devices.count()


class DeviceListSerializer(serializers.ModelSerializer):
    device_type_name = serializers.CharField(source='device_type.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    turnover_count = serializers.IntegerField(read_only=True)
    current_borrower = serializers.SerializerMethodField()

    class Meta:
        model = Device
        fields = [
            'id', 'asset_number', 'name', 'device_type_id', 'device_type_name',
            'location_id', 'location_name', 'status', 'status_display',
            'specification', 'purchase_date', 'is_overdue', 'turnover_count',
            'current_borrower', 'created_at'
        ]

    def get_current_borrower(self, obj):
        borrow = obj.get_current_borrow()
        if borrow:
            return {
                'id': borrow.borrower.id,
                'real_name': borrow.borrower.real_name,
                'borrow_date': borrow.borrow_date,
                'expected_return_date': borrow.expected_return_date
            }
        return None


class DeviceDetailSerializer(serializers.ModelSerializer):
    device_type_name = serializers.CharField(source='device_type.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    turnover_count = serializers.IntegerField(read_only=True)
    borrow_records = serializers.SerializerMethodField()
    maintenance_records = serializers.SerializerMethodField()
    exception_records = serializers.SerializerMethodField()

    reservation_records = serializers.SerializerMethodField()

    class Meta:
        model = Device
        fields = [
            'id', 'asset_number', 'name', 'device_type_id', 'device_type_name',
            'location_id', 'location_name', 'status', 'status_display',
            'specification', 'purchase_date', 'last_maintenance_date',
            'is_overdue', 'turnover_count', 'borrow_records',
            'maintenance_records', 'exception_records', 'reservation_records', 'created_at'
        ]

    def get_borrow_records(self, obj):
        records = obj.borrow_records.all().order_by('-borrow_date')
        return BorrowRecordSerializer(records, many=True).data

    def get_maintenance_records(self, obj):
        records = obj.maintenance_records.all().order_by('-maintenance_date')
        return MaintenanceRecordSerializer(records, many=True).data

    def get_exception_records(self, obj):
        records = obj.exception_records.all().order_by('-reported_date')
        return ExceptionRecordSerializer(records, many=True).data

    def get_reservation_records(self, obj):
        records = obj.reservations.all().order_by('-created_at')
        return ReservationSerializer(records, many=True).data


class DeviceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ['id', 'asset_number', 'name', 'device_type', 'location', 'specification', 'purchase_date']

    def validate_asset_number(self, value):
        if Device.objects.filter(asset_number=value).exists():
            raise serializers.ValidationError('资产编号已存在')
        return value


class DeviceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ['asset_number', 'name', 'device_type', 'location', 'status', 'specification', 'purchase_date']

    def validate_asset_number(self, value):
        instance = self.instance
        if instance and Device.objects.filter(asset_number=value).exclude(pk=instance.pk).exists():
            raise serializers.ValidationError('资产编号已存在')
        return value


class BorrowRecordSerializer(serializers.ModelSerializer):
    borrower_name = serializers.CharField(source='borrower.real_name', read_only=True)
    device_name = serializers.CharField(source='device.name', read_only=True)
    asset_number = serializers.CharField(source='device.asset_number', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = BorrowRecord
        fields = [
            'id', 'device', 'device_name', 'asset_number', 'borrower', 'borrower_name',
            'borrow_date', 'expected_return_date', 'actual_return_date',
            'returned', 'borrow_purpose', 'return_notes', 'damage_notes', 'is_overdue'
        ]
        read_only_fields = ['id', 'borrow_date', 'actual_return_date', 'returned', 'borrower']


class BorrowCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BorrowRecord
        fields = ['device', 'expected_return_date', 'borrow_purpose']

    def validate_device(self, value):
        if value.status != 'available':
            raise serializers.ValidationError('该设备当前不可借用')
        if value.borrow_records.filter(returned=False).exists():
            raise serializers.ValidationError('该设备已被借用')
        user = self.context['request'].user
        if value.borrow_records.filter(borrower=user, returned=True).count() >= 1:
            recent_borrow = value.borrow_records.filter(borrower=user).order_by('-actual_return_date').first()
            if recent_borrow and (timezone.now() - recent_borrow.actual_return_date).days < 1:
                raise serializers.ValidationError('同一设备24小时内不可重复借用')
        return value

    def validate_expected_return_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError('预计归还日期不能早于今天')
        if (value - timezone.now().date()).days > 30:
            raise serializers.ValidationError('借用时长不能超过30天')
        return value


class ReturnDeviceSerializer(serializers.Serializer):
    return_notes = serializers.CharField(required=False, allow_blank=True)
    damage_notes = serializers.CharField(required=False, allow_blank=True)
    needs_maintenance = serializers.BooleanField(default=False)


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(source='operator.real_name', read_only=True)
    device_name = serializers.CharField(source='device.name', read_only=True)
    asset_number = serializers.CharField(source='device.asset_number', read_only=True)

    class Meta:
        model = MaintenanceRecord
        fields = [
            'id', 'device', 'device_name', 'asset_number', 'operator', 'operator_name',
            'maintenance_date', 'maintenance_type', 'description', 'result',
            'completed', 'completed_date'
        ]
        read_only_fields = ['id', 'maintenance_date', 'operator', 'completed_date']


class MaintenanceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecord
        fields = ['device', 'maintenance_type', 'description', 'result']

    def validate_device(self, value):
        if value.status not in ['pending_maintenance', 'available']:
            raise serializers.ValidationError('该设备状态不允许维护')
        return value


class ExceptionRecordSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source='reporter.real_name', read_only=True)
    reviewer_name = serializers.CharField(source='reviewer.real_name', read_only=True, allow_null=True)
    device_name = serializers.CharField(source='device.name', read_only=True)
    asset_number = serializers.CharField(source='device.asset_number', read_only=True)
    exception_type_display = serializers.CharField(source='get_exception_type_display', read_only=True)
    review_status_display = serializers.CharField(source='get_review_status_display', read_only=True)

    class Meta:
        model = ExceptionRecord
        fields = [
            'id', 'device', 'device_name', 'asset_number', 'reporter', 'reporter_name',
            'exception_type', 'exception_type_display', 'description', 'reported_date',
            'review_status', 'review_status_display', 'reviewer', 'reviewer_name',
            'review_date', 'review_result'
        ]
        read_only_fields = ['id', 'reported_date', 'reporter', 'review_status', 'reviewer', 'review_date']


class ExceptionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExceptionRecord
        fields = ['device', 'exception_type', 'description']


class ExceptionReviewSerializer(serializers.Serializer):
    review_result = serializers.CharField(required=True)
    action = serializers.ChoiceField(choices=[('approve', '通过'), ('reject', '驳回')])


class StatisticsSerializer(serializers.Serializer):
    total_turnover = serializers.IntegerField()
    pending_maintenance = serializers.IntegerField()
    exception_distribution = serializers.DictField()
    low_stock_types = serializers.ListField()
    pending_reservations = serializers.IntegerField()


class ReservationSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.real_name', read_only=True)
    device_name = serializers.CharField(source='device.name', read_only=True)
    asset_number = serializers.CharField(source='device.asset_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'device', 'device_name', 'asset_number', 'user', 'user_name',
            'expected_borrow_date', 'expected_return_date', 'purpose',
            'status', 'status_display', 'created_at', 'notified_at', 'fulfilled_at'
        ]
        read_only_fields = ['id', 'created_at', 'notified_at', 'fulfilled_at', 'status']


class ReservationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = ['device', 'expected_borrow_date', 'expected_return_date', 'purpose']

    def validate_device(self, value):
        if value.status == 'decommissioned':
            raise serializers.ValidationError('该设备已停用，无法预约')
        return value

    def validate_expected_borrow_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError('预计借用日期不能早于今天')
        return value

    def validate_expected_return_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError('预计归还日期不能早于今天')
        return value

    def validate(self, data):
        if data['expected_return_date'] < data['expected_borrow_date']:
            raise serializers.ValidationError('预计归还日期不能早于预计借用日期')
        if (data['expected_return_date'] - data['expected_borrow_date']).days > 30:
            raise serializers.ValidationError('借用时长不能超过30天')
        return data
