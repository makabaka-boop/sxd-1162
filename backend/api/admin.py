from django.contrib import admin
from .models import User, DeviceType, Location, Device, BorrowRecord, MaintenanceRecord, ExceptionRecord

admin.site.register(User)
admin.site.register(DeviceType)
admin.site.register(Location)
admin.site.register(Device)
admin.site.register(BorrowRecord)
admin.site.register(MaintenanceRecord)
admin.site.register(ExceptionRecord)
