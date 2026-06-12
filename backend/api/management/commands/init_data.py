from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import DeviceType, Location, Device

User = get_user_model()


class Command(BaseCommand):
    help = '初始化测试数据'

    def handle(self, *args, **options):
        self.stdout.write('开始初始化数据...')

        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                password='admin123',
                real_name='系统管理员'
            )
            self.stdout.write('创建管理员: admin / admin123')

        if not User.objects.filter(username='employee').exists():
            User.objects.create_user(
                username='employee',
                password='employee123',
                role='employee',
                real_name='张员工'
            )
            self.stdout.write('创建员工: employee / employee123')

        if not User.objects.filter(username='supervisor').exists():
            User.objects.create_user(
                username='supervisor',
                password='supervisor123',
                role='supervisor',
                real_name='李主管'
            )
            self.stdout.write('创建主管: supervisor / supervisor123')

        device_types = ['笔记本电脑', '台式机', '显示器', '键盘', '鼠标', '投影仪', '打印机']
        for name in device_types:
            DeviceType.objects.get_or_create(
                name=name,
                defaults={'description': f'{name}设备', 'warning_threshold': 2}
            )
        self.stdout.write('创建设备类型完成')

        locations = ['A区仓库', 'B区仓库', 'C区仓库', '前台', 'IT维护室']
        for name in locations:
            Location.objects.get_or_create(
                name=name,
                defaults={'description': f'{name}存放点'}
            )
        self.stdout.write('创建存放位置完成')

        if Device.objects.count() == 0:
            import random
            types = list(DeviceType.objects.all())
            locs = list(Location.objects.all())
            statuses = ['available', 'available', 'available', 'borrowed', 'pending_maintenance']

            for i in range(1, 21):
                device_type = random.choice(types)
                location = random.choice(locs)
                status = random.choice(statuses)
                Device.objects.create(
                    asset_number=f'IT-{i:04d}',
                    name=f'{device_type.name}-{i}',
                    device_type=device_type,
                    location=location,
                    status=status,
                    specification=f'规格参数{i}',
                )
            self.stdout.write('创建20台测试设备完成')

        self.stdout.write(self.style.SUCCESS('数据初始化完成!'))
