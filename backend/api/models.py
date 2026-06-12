from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, username, password=None, role='employee', **extra_fields):
        if not username:
            raise ValueError('用户名不能为空')
        user = self.model(username=username, role=role, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, password, **extra_fields)


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', '管理员'),
        ('employee', '员工'),
        ('supervisor', '主管'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    real_name = models.CharField(max_length=50, verbose_name='真实姓名')

    objects = UserManager()

    def __str__(self):
        return f'{self.real_name} ({self.get_role_display()})'


class DeviceType(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='设备类型名称')
    description = models.TextField(blank=True, verbose_name='描述')
    warning_threshold = models.IntegerField(default=5, verbose_name='库存预警阈值')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Location(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='存放位置')
    description = models.TextField(blank=True, verbose_name='位置描述')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Device(models.Model):
    STATUS_CHOICES = (
        ('available', '可借用'),
        ('borrowed', '已借用'),
        ('pending_maintenance', '待维护'),
        ('exception_pending', '异常待核'),
        ('maintaining', '维护中'),
        ('recovered', '恢复可用'),
        ('decommissioned', '停用'),
    )

    asset_number = models.CharField(max_length=50, unique=True, verbose_name='资产编号')
    name = models.CharField(max_length=100, verbose_name='设备名称')
    device_type = models.ForeignKey(DeviceType, on_delete=models.CASCADE, related_name='devices', verbose_name='设备类型')
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='devices', verbose_name='存放位置')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available', verbose_name='状态')
    specification = models.TextField(blank=True, verbose_name='规格参数')
    purchase_date = models.DateField(null=True, blank=True, verbose_name='采购日期')
    last_maintenance_date = models.DateTimeField(null=True, blank=True, verbose_name='最后维护日期')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.asset_number} - {self.name}'

    def get_turnover_count(self):
        return self.borrow_records.filter(returned=True).count()

    def get_current_borrow(self):
        return self.borrow_records.filter(returned=False).first()

    def is_overdue(self):
        borrow = self.get_current_borrow()
        if borrow and borrow.expected_return_date < timezone.now().date():
            return True
        return False


class BorrowRecord(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='borrow_records', verbose_name='设备')
    borrower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='borrow_records', verbose_name='借用人')
    borrow_date = models.DateTimeField(auto_now_add=True, verbose_name='借用时间')
    expected_return_date = models.DateField(verbose_name='预计归还日期')
    actual_return_date = models.DateTimeField(null=True, blank=True, verbose_name='实际归还时间')
    returned = models.BooleanField(default=False, verbose_name='是否归还')
    borrow_purpose = models.TextField(verbose_name='借用用途')
    return_notes = models.TextField(blank=True, verbose_name='归还说明')
    damage_notes = models.TextField(blank=True, verbose_name='损坏说明')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-borrow_date']

    def __str__(self):
        return f'{self.device} - {self.borrower}'

    def is_overdue(self):
        if not self.returned and self.expected_return_date < timezone.now().date():
            return True
        return False


class MaintenanceRecord(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='maintenance_records', verbose_name='设备')
    operator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='maintenance_records', verbose_name='操作人')
    maintenance_date = models.DateTimeField(auto_now_add=True, verbose_name='维护时间')
    maintenance_type = models.CharField(max_length=50, verbose_name='维护类型')
    description = models.TextField(verbose_name='维护说明')
    result = models.TextField(verbose_name='维护结果')
    completed = models.BooleanField(default=False, verbose_name='是否完成')
    completed_date = models.DateTimeField(null=True, blank=True, verbose_name='完成时间')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-maintenance_date']

    def __str__(self):
        return f'{self.device} - {self.maintenance_type}'


class ExceptionRecord(models.Model):
    EXCEPTION_TYPES = (
        ('damage', '损坏'),
        ('loss', '丢失'),
        ('overdue', '逾期未还'),
        ('missing_maintenance', '维护缺失'),
        ('other', '其他'),
    )
    REVIEW_STATUS = (
        ('pending', '待复核'),
        ('approved', '已通过'),
        ('rejected', '已驳回'),
    )

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='exception_records', verbose_name='设备')
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reported_exceptions', verbose_name='上报人')
    exception_type = models.CharField(max_length=30, choices=EXCEPTION_TYPES, verbose_name='异常类型')
    description = models.TextField(verbose_name='异常描述')
    reported_date = models.DateTimeField(auto_now_add=True, verbose_name='上报时间')
    review_status = models.CharField(max_length=20, choices=REVIEW_STATUS, default='pending', verbose_name='复核状态')
    reviewer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_exceptions', verbose_name='复核人')
    review_date = models.DateTimeField(null=True, blank=True, verbose_name='复核时间')
    review_result = models.TextField(blank=True, verbose_name='复核结果')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-reported_date']

    def __str__(self):
        return f'{self.device} - {self.get_exception_type_display()}'
